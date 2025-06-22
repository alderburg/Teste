import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
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
  const { connected, sendMessage } = useWebSocket();
  const { user } = useAuth();
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);
  const [sessionTerminated, setSessionTerminated] = useState(false);
  const [terminationMessage, setTerminationMessage] = useState<string>("");
  const [authAttempted, setAuthAttempted] = useState(false);
  const [currentRoute, setCurrentRoute] = useState(window.location.pathname);

  console.log('🔐 WebSocketProvider - Estados:', {
    connected,
    user: user?.id,
    authAttempted,
    route: currentRoute
  });

  // Detectar mudanças de rota e resetar estado de autenticação
  useEffect(() => {
    const handleRouteChange = () => {
      const newRoute = window.location.pathname;
      if (currentRoute !== newRoute) {
        console.log(`🔄 WebSocketProvider: Mudança de rota detectada: ${currentRoute} → ${newRoute}`);
        setCurrentRoute(newRoute);
        setAuthAttempted(false); // Reset estado de autenticação para nova rota
      }
    };

    // Listener para mudanças de rota
    window.addEventListener('popstate', handleRouteChange);
    
    // Observer para mudanças programáticas
    const observer = new MutationObserver(() => {
      handleRouteChange();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      observer.disconnect();
    };
  }, [currentRoute]);

  // Ativar proteção IMEDIATAMENTE quando sessão estiver encerrada
  useSessionGuard(sessionTerminated);

  // Função SIMPLES para obter token de sessão
  const getSessionToken = (): string | null => {
    // Método 1: Tentar cookie de sessão do Express/Passport
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'connect.sid' || name === 'mpc.sid') {
        const decodedValue = decodeURIComponent(value);
        console.log(`🍪 Token encontrado: ${name} = ${decodedValue.substring(0, 10)}...`);
        return decodedValue;
      }
    }

    // Método 2: Fazer requisição síncrona para obter token
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/conta/session-token', false); // false = síncrono
      xhr.withCredentials = true;
      xhr.send();

      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        if (response.token) {
          console.log(`🔑 Token obtido via API: ${response.token.substring(0, 10)}...`);
          return response.token;
        }
      }
    } catch (error) {
      console.error('Erro ao obter token via API:', error);
    }

    console.log('❌ Nenhum token de sessão encontrado');
    return null;
  };

  // Autenticação WebSocket SIMPLIFICADA
  useEffect(() => {
    if (!connected || !user || !sendMessage || authAttempted) {
      return;
    }

    console.log('🔐 Iniciando autenticação WebSocket SIMPLIFICADA...');

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
      setAuthAttempted(true);

      if (success) {
        console.log('✅ Mensagem de autenticação enviada com sucesso');
      } else {
        console.log('❌ Falha ao enviar autenticação');
        // Tentar novamente após 2 segundos
        setTimeout(() => {
          setAuthAttempted(false);
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem de autenticação:', error);
      setAuthAttempted(false);
    }
  }, [connected, user, sendMessage, authAttempted]);

  // Reset authAttempted quando desconectar ou mudar de rota
  useEffect(() => {
    if (!connected) {
      console.log('🔌 WebSocket desconectado - resetando estado de autenticação');
      setAuthAttempted(false);
    }
  }, [connected]);

  // Reset authAttempted quando mudar de rota
  useEffect(() => {
    setAuthAttempted(false);
  }, [currentRoute]);

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

  // Atualizar o timestamp sempre que recebermos uma mensagem
  useEffect(() => {
    const handleWebSocketMessage = (event: any) => {
      setLastUpdated(new Date());

      if (event.detail && event.detail.type === 'session_terminated') {
        const terminatedSessionToken = event.detail.sessionToken;
        if (checkIfCurrentSession(terminatedSessionToken)) {
          activateSessionProtection(event.detail.message || "Sua sessão foi encerrada por outro usuário");
        }
      }

      if (event.detail && event.detail.type === 'data_update') {
        const { resource, action, data } = event.detail;
        const customEvent = new CustomEvent('websocket-data-update', {
          detail: { resource, action, data }
        });
        window.dispatchEvent(customEvent);
      }

      if (event.detail && event.detail.type === 'auth_success') {
        console.log('✅ Autenticação WebSocket confirmada pelo servidor');
      }
    };

    window.addEventListener('websocket-message-received', handleWebSocketMessage);
    window.addEventListener('session-terminated', (event: any) => {
      if (checkIfCurrentSession(event.detail.sessionToken)) {
        activateSessionProtection(event.detail.message || "Sua sessão foi encerrada por outro usuário");
      }
    });

    return () => {
      window.removeEventListener('websocket-message-received', handleWebSocketMessage);
      window.removeEventListener('session-terminated', handleWebSocketMessage);
    };
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