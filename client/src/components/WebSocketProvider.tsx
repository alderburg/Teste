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
    } else if (!user && connected) {
      console.log('🔌 Fechando WebSocket - usuário deslogado');
      closeWebSocket();
      setConnected(false);
      setAuthAttempted(false);
    }
  }, [user, connected]);

  // Autenticação principal quando usuário e conexão estão disponíveis
  useEffect(() => {
    if (user && connected && !authAttempted) {
      console.log('🔐 Iniciando autenticação WebSocket para usuário:', user.id);
      
      const performAuth = () => {
        const sessionToken = getSessionToken();
        if (sessionToken) {
          const authMessage = {
            type: 'auth',
            userId: user.id,
            sessionToken: sessionToken
          };

          console.log(`🔐 Enviando autenticação WebSocket:`, {
            type: authMessage.type,
            userId: authMessage.userId,
            tokenPreview: authMessage.sessionToken.substring(0, 10) + '...'
          });

          const success = sendMessage(authMessage);
          if (success) {
            setAuthAttempted(true);
            console.log('✅ Autenticação WebSocket enviada com sucesso');
          } else {
            console.log('❌ Falha ao enviar autenticação - tentando novamente em 1s');
            setTimeout(performAuth, 1000);
          }
        } else {
          console.log('⚠️ Token não encontrado - tentando novamente em 1s');
          setTimeout(performAuth, 1000);
        }
      };

      performAuth();
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
    console.log('🔍 Buscando token de sessão...');
    
    // Método 1: Tentar todos os cookies de sessão possíveis
    const cookies = document.cookie.split(';');
    console.log('🍪 Cookies disponíveis:', cookies.map(c => c.trim().split('=')[0]));
    
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
    console.log('💾 Verificando storage...');
    
    for (const key of storageKeys) {
      const localValue = localStorage.getItem(key);
      const sessionValue = sessionStorage.getItem(key);
      const value = localValue || sessionValue;
      
      if (value) {
        console.log(`💾 Valor encontrado em ${localValue ? 'localStorage' : 'sessionStorage'} para ${key}:`, value.substring(0, 20) + '...');
        
        try {
          // Se for JSON, tentar extrair token
          const parsed = JSON.parse(value);
          if (parsed.token || parsed.sessionToken) {
            const token = parsed.token || parsed.sessionToken;
            console.log(`💾 Token extraído do JSON: ${token.substring(0, 10)}...`);
            return token;
          }
        } catch {
          // Se não for JSON, usar como string direta
          if (value.length > 10) { // Assumir que token tem pelo menos 10 caracteres
            console.log(`💾 Token encontrado como string: ${value.substring(0, 10)}...`);
            return value;
          }
        }
      }
    }

    console.log('❌ Nenhum token de sessão encontrado nos cookies ou storage');
    console.log('📋 Debug - Cookies:', document.cookie);
    console.log('📋 Debug - localStorage keys:', Object.keys(localStorage));
    
    return null;
  };

  // Listener para reconexões WebSocket
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToMessages((message) => {
      if (message.type === 'websocket_connected') {
        console.log('🔄 WebSocket reconectado - resetando autenticação');
        setAuthAttempted(false);
      }
    });

    return unsubscribe;
  }, [user]);

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