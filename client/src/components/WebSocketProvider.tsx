import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { initWebSocket, sendMessage as sendWebSocketMessage, subscribeToMessages, closeWebSocket } from '@/services/websocketService';
import { useToast } from '@/hooks/use-toast';
import { SessionTerminatedModal } from '@/components/auth/SessionTerminatedModal';
import { useAuth } from '@/hooks/use-auth';
import { useSessionGuard } from '@/hooks/use-session-guard';
import { queryClient } from '@/lib/queryClient';

// Criar contexto para WebSocket
interface WebSocketContextProps {
  connected: boolean;
  sendMessage: (message: any) => boolean;
  lastUpdated?: Date;
}

const WebSocketContext = createContext<WebSocketContextProps>({
  connected: false,
  sendMessage: () => false,
  lastUpdated: undefined
});

// Hook para usar o contexto
export const useWebSocketContext = () => useContext(WebSocketContext);

// Componente Provider
interface WebSocketProviderProps {
  children: ReactNode;
}

export default function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);
  const [sessionTerminated, setSessionTerminated] = useState(false);
  const [terminationMessage, setTerminationMessage] = useState<string>("");
  const [authAttempted, setAuthAttempted] = useState(false);

  console.log('🔐 WebSocketProvider - Estados:', {
    connected,
    user: user?.id,
    authAttempted
  });

  // Inicializar WebSocket quando há usuário logado
  useEffect(() => {
    if (user && !connected) {
      console.log('🔗 Inicializando WebSocket para usuário logado:', user.id);
      initWebSocket();
      setConnected(true);
    }
    
    return () => {
      if (!user && connected) {
        console.log('🔌 Fechando WebSocket - usuário deslogado');
        closeWebSocket();
        setConnected(false);
      }
    };
  }, [user, connected]);

  // Forçar nova autenticação quando o usuário muda (login/logout)
  useEffect(() => {
    if (user && connected) {
      console.log('👤 Usuário detectado - forçando autenticação WebSocket:', user.id);
      // Reset do flag de autenticação para garantir nova tentativa
      setAuthAttempted(false);
      
      // Autenticação imediata sem delay
      const sessionToken = getSessionToken();
      if (sessionToken) {
        const authMessage = {
          type: 'auth',
          userId: user.id,
          sessionToken: sessionToken
        };

        console.log(`🔐 Enviando autenticação para usuário detectado:`, {
          type: authMessage.type,
          userId: authMessage.userId,
          tokenPreview: authMessage.sessionToken.substring(0, 10) + '...'
        });

        const success = sendMessage(authMessage);
        setAuthAttempted(true);
        
        if (!success) {
          console.log('❌ Falha na primeira tentativa - tentando novamente em 500ms');
          setTimeout(() => {
            sendMessage(authMessage);
          }, 500);
        }
      } else {
        console.log('⚠️ Token não encontrado para usuário:', user.id);
        // Tentar novamente após um delay para dar tempo aos cookies carregarem
        setTimeout(() => {
          const retryToken = getSessionToken();
          if (retryToken) {
            const authMessage = {
              type: 'auth',
              userId: user.id,
              sessionToken: retryToken
            };
            console.log('🔄 Retry: Token encontrado, enviando autenticação');
            sendMessage(authMessage);
            setAuthAttempted(true);
          }
        }, 1000);
      }
    }
  }, [user?.id, connected]); // Reage especificamente à mudança do ID do usuário

  // Autenticação adicional quando usuário aparece pela primeira vez
  useEffect(() => {
    if (user && connected && !authAttempted) {
      console.log('🔄 Primeira autenticação do usuário após login:', user.id);
      const sessionToken = getSessionToken();
      
      if (sessionToken) {
        const authMessage = {
          type: 'auth',
          userId: user.id,
          sessionToken: sessionToken
        };

        console.log('🔐 Enviando primeira autenticação após login');
        const success = sendMessage(authMessage);
        setAuthAttempted(true);
        
        if (!success) {
          console.log('❌ Primeira autenticação falhou - reagendando');
          setTimeout(() => {
            sendMessage(authMessage);
          }, 1000);
        }
      }
    }
  }, [user, connected, authAttempted]);

  // Wrapper para sendMessage
  const sendMessage = (message: any): boolean => {
    try {
      return sendWebSocketMessage(message);
    } catch (error) {
      console.error('Erro ao enviar mensagem WebSocket:', error);
      return false;
    }
  };

  // Ativar proteção IMEDIATAMENTE quando sessão estiver encerrada
  useSessionGuard(sessionTerminated);

  // Função ROBUSTA para obter token de sessão
  const getSessionToken = (): string | null => {
    // Método 1: Tentar todos os cookies de sessão possíveis
    const cookies = document.cookie.split(';');
    const sessionCookieNames = ['connect.sid', 'mpc.sid', 'session_token', 'sessionToken'];
    
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (sessionCookieNames.includes(name) && value) {
        const decodedValue = decodeURIComponent(value);
        console.log(`🍪 Token encontrado no cookie: ${name} = ${decodedValue.substring(0, 10)}...`);
        return decodedValue;
      }
    }

    // Método 2: Tentar localStorage/sessionStorage
    const storageKeys = ['sessionToken', 'token', 'userData'];
    for (const key of storageKeys) {
      const value = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (value) {
        try {
          // Se for JSON, tentar extrair token
          const parsed = JSON.parse(value);
          if (parsed.token || parsed.sessionToken) {
            const token = parsed.token || parsed.sessionToken;
            console.log(`💾 Token encontrado no storage: ${key} = ${token.substring(0, 10)}...`);
            return token;
          }
        } catch {
          // Se não for JSON, usar como string direta
          if (value.length > 10) { // Assumir que token tem pelo menos 10 caracteres
            console.log(`💾 Token encontrado no storage: ${key} = ${value.substring(0, 10)}...`);
            return value;
          }
        }
      }
    }

    console.log('❌ Nenhum token de sessão encontrado nos cookies ou storage');
    return null;
  };

  // Autenticação WebSocket - configurar listener para todas as conexões
  useEffect(() => {
    if (!user) {
      return;
    }

    console.log('🔐 Configurando autenticação WebSocket para usuário:', user.id);

    const handleWebSocketConnection = () => {
      const sessionToken = getSessionToken();

      if (!sessionToken) {
        console.log('❌ Token de sessão não encontrado - não é possível autenticar');
        return;
      }

      const authMessage = {
        type: 'auth',
        userId: user.id,
        sessionToken: sessionToken
      };

      console.log(`🔐 Enviando autenticação:`, {
        type: authMessage.type,
        userId: authMessage.userId,
        tokenPreview: authMessage.sessionToken.substring(0, 10) + '...'
      });

      try {
        const success = sendMessage(authMessage);

        if (success) {
          console.log('✅ Mensagem de autenticação enviada com sucesso');
        } else {
          console.log('❌ Falha ao enviar autenticação - tentando novamente em 1s');
          // Tentar novamente após 1 segundo se falhar
          setTimeout(() => {
            sendMessage(authMessage);
          }, 1000);
        }
      } catch (error) {
        console.error('❌ Erro ao enviar mensagem de autenticação:', error);
      }
    };

    // Tentar autenticar imediatamente se já conectado
    if (connected) {
      handleWebSocketConnection();
    }

    // Configurar listener para futuras conexões
    const unsubscribe = subscribeToMessages((message) => {
      if (message.type === 'websocket_connected') {
        console.log('🔄 WebSocket reconectado - enviando autenticação');
        handleWebSocketConnection();
      }
    });

    return unsubscribe;
  }, [connected, user]);

  // Autenticação adicional quando o WebSocket está conectado mas ainda não autenticado
  useEffect(() => {
    if (user && connected && !authAttempted) {
      console.log('🔄 Tentativa adicional de autenticação para usuário conectado:', user.id);
      const sessionToken = getSessionToken();
      
      if (sessionToken) {
        const authMessage = {
          type: 'auth',
          userId: user.id,
          sessionToken: sessionToken
        };

        console.log('🔐 Enviando autenticação adicional');
        sendMessage(authMessage);
        setAuthAttempted(true);
      }
    }
  }, [user, connected, authAttempted]);

  // Reset authAttempted quando desconectar
  useEffect(() => {
    if (!connected) {
      setAuthAttempted(false);
    }
  }, [connected]);

  // Função para verificar se a sessão atual foi encerrada
  const checkIfCurrentSession = (terminatedToken: string): boolean => {
    const currentToken = getSessionToken();
    if (!currentToken || !terminatedToken) return false;

    // Normalizar tokens
    const normalizeToken = (token: string) => {
      if (token.startsWith('s:')) {
        return token.substring(2).split('.')[0];
      }
      return token;
    };

    const normalizedCurrent = normalizeToken(currentToken);
    const normalizedTerminated = normalizeToken(terminatedToken);

    return normalizedCurrent === normalizedTerminated || currentToken === terminatedToken;
  };

  // Função para ativar proteção total
  const activateSessionProtection = (message: string) => {
    console.log('🔒 ATIVANDO PROTEÇÃO TOTAL DA SESSÃO');
    queryClient.invalidateQueries();
    queryClient.clear();
    setSessionTerminated(true);
    setTerminationMessage(message);
  };

  // Configurar listeners para mensagens WebSocket usando subscribeToMessages
  useEffect(() => {
    const unsubscribe = subscribeToMessages((message) => {
      setLastUpdated(new Date());

      if (message.type === 'session_terminated') {
        const terminatedSessionToken = message.sessionToken;
        if (terminatedSessionToken && checkIfCurrentSession(terminatedSessionToken)) {
          activateSessionProtection(message.message || "Sua sessão foi encerrada por outro usuário");
        }
      }

      if (message.type === 'data_update') {
        const { resource, action, data } = message;
        const customEvent = new CustomEvent('websocket-data-update', {
          detail: { resource, action, data }
        });
        window.dispatchEvent(customEvent);
      }

      if (message.type === 'auth_success') {
        console.log('✅ Autenticação WebSocket confirmada pelo servidor');
      }
    });

    // Cleanup function para remover subscription
    return unsubscribe;
  }, []);

  return (
    <WebSocketContext.Provider value={{ connected, sendMessage, lastUpdated }}>
      {children}
      <SessionTerminatedModal
        isOpen={sessionTerminated}
        onClose={() => {
          console.log('🔒 Tentativa de fechar modal bloqueada - forçando logout');
        }}
        message={terminationMessage}
      />
    </WebSocketContext.Provider>
  );
}