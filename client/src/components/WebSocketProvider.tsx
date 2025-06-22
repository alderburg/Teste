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

  

  // Inicializar WebSocket apenas uma vez quando há usuário logado
  useEffect(() => {
    if (user && !connected) {
      initWebSocket();
      setConnected(true);
    }
    
    return () => {
      if (!user && connected) {
        closeWebSocket();
        setConnected(false);
      }
    };
  }, [user, connected]);

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

  // Função SIMPLES para obter token de sessão
  const getSessionToken = (): string | null => {
    // Método 1: Tentar cookie de sessão do Express/Passport
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'connect.sid' || name === 'mpc.sid') {
        const decodedValue = decodeURIComponent(value);
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
          return response.token;
        }
      }
    } catch (error) {
      // Silenciar erro
    }

    return null;
  };

  // Autenticação WebSocket SIMPLIFICADA
  useEffect(() => {
    if (!connected || !user || authAttempted) {
      return;
    }

    const sessionToken = getSessionToken();

    if (!sessionToken) {
      return;
    }

    const authMessage = {
      type: 'auth',
      userId: user.id,
      sessionToken: sessionToken
    };

    try {
      const success = sendMessage(authMessage);
      setAuthAttempted(true);

      if (!success) {
        // Tentar novamente após 2 segundos
        setTimeout(() => {
          setAuthAttempted(false);
        }, 2000);
      }
    } catch (error) {
      setAuthAttempted(false);
    }
  }, [connected, user, authAttempted]);

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

      if (message.type === 'force_disconnect') {
        // A desconexão será tratada pelo servidor, apenas registrar
        activateSessionProtection(message.message || "Conexão encerrada pelo servidor");
      }

      if (message.type === 'data_update') {
        const { resource, action, data } = message;
        const customEvent = new CustomEvent('websocket-data-update', {
          detail: { resource, action, data }
        });
        window.dispatchEvent(customEvent);
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
          // Tentativa de fechar modal bloqueada - forçando logout
        }}
        message={terminationMessage}
      />
    </WebSocketContext.Provider>
  );
}