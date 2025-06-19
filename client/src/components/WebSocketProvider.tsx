
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
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    console.warn('useWebSocketContext deve ser usado dentro de um WebSocketProvider');
    return {
      connected: false,
      sendMessage: () => false,
      lastUpdated: undefined
    };
  }
  return context;
};

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

  // Ativar proteção IMEDIATAMENTE quando sessão estiver encerrada
  // useSessionGuard(sessionTerminated); // TEMPORARIAMENTE DESABILITADO

  // Função para verificar se a sessão atual foi encerrada
  const checkIfCurrentSession = (terminatedToken: string): boolean => {
    const possibleTokens = [
      localStorage.getItem('sessionToken'),
      localStorage.getItem('token'),
      document.cookie.split(';').find(c => c.trim().startsWith('sessionToken='))?.split('=')[1],
      document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1]
    ].filter(Boolean);

    console.log('🔍 Verificando tokens:', {
      terminatedToken: terminatedToken?.substring(0, 8) + '...',
      possibleTokens: possibleTokens.map(t => t?.substring(0, 8) + '...')
    });

    return possibleTokens.includes(terminatedToken);
  };

  // Função para ativar proteção total
  const activateSessionProtection = (message: string) => {
    console.log('🔒 ATIVANDO PROTEÇÃO TOTAL DA SESSÃO');
    
    // PRIMEIRO: Limpar todos os dados imediatamente
    queryClient.invalidateQueries();
    queryClient.clear();
    
    // SEGUNDO: Ativar estado de sessão encerrada IMEDIATAMENTE
    setSessionTerminated(true);
    
    // TERCEIRO: Definir mensagem
    setTerminationMessage(message);
    
    console.log('🔒 PROTEÇÃO ATIVADA - Interface bloqueada');
  };

  // Verificar periodicamente o status da sessão - TEMPORARIAMENTE DESABILITADO
  /*
  useEffect(() => {
    if (!user) return;

    const checkSessionStatus = async () => {
      try {
        const response = await fetch('/api/conta/check-session', {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          console.log('🔒 Sessão inválida detectada via check periódico');
          activateSessionProtection('Sua sessão foi encerrada ou expirou');
        }
      } catch (error) {
        console.log('🔒 Erro ao verificar sessão - assumindo sessão encerrada');
        activateSessionProtection('Erro de conectividade - sessão encerrada');
      }
    };

    // Verificar a cada 30 segundos
    const interval = setInterval(checkSessionStatus, 30000);

    return () => clearInterval(interval);
  }, [user]);
  */

  // Verificar status da sessão quando WebSocket desconectar
  useEffect(() => {
    if (!connected && user) {
      console.log('🔒 WebSocket desconectado - verificando status da sessão');
      
      // Aguardar um pouco para reconexão, se não reconectar, verificar sessão
      setTimeout(async () => {
        if (!connected) {
          try {
            const response = await fetch('/api/conta/check-session', {
              method: 'GET',
              credentials: 'include'
            });

            if (!response.ok) {
              console.log('🔒 Sessão inválida após desconexão do WebSocket');
              activateSessionProtection('Conexão perdida - sessão encerrada');
            }
          } catch (error) {
            console.log('🔒 Não foi possível verificar sessão após desconexão');
            activateSessionProtection('Conexão perdida - sessão encerrada');
          }
        }
      }, 5000);
    }
  }, [connected, user]);

  // Interceptar todas as respostas HTTP para detectar 401 - TEMPORARIAMENTE DESABILITADO
  /*
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (response.status === 401 && user) {
          console.log('🔒 Status 401 detectado - sessão encerrada');
          activateSessionProtection('Sessão expirada ou inválida');
        }
        
        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [user]);
  */

  // Atualizar o timestamp sempre que recebermos uma mensagem
  useEffect(() => {
    const handleWebSocketMessage = (event: any) => {
      setLastUpdated(new Date());

      if (event.detail && event.detail.type === 'session_terminated') {
        const terminatedSessionToken = event.detail.sessionToken;

        console.log('🔒 Evento de sessão encerrada recebido:', {
          terminatedToken: terminatedSessionToken?.substring(0, 8) + '...',
          currentPage: window.location.pathname,
          eventSource: 'websocket-message-received'
        });

        if (checkIfCurrentSession(terminatedSessionToken)) {
          console.log('🔒 ESTA É A SESSÃO ATUAL - ATIVANDO PROTEÇÃO');
          activateSessionProtection(event.detail.message || "Sua sessão foi encerrada por outro usuário");
        }
      }
    };

    const handleSessionTerminated = (event: any) => {
      console.log('🔒 Evento session-terminated recebido:', {
        detail: event.detail,
        currentPage: window.location.pathname,
        eventSource: 'session-terminated'
      });
      
      if (checkIfCurrentSession(event.detail.sessionToken)) {
        console.log('🔒 SESSÃO ATUAL ENCERRADA VIA EVENTO DIRETO');
        activateSessionProtection(event.detail.message || "Sua sessão foi encerrada por outro usuário");
      }
    };

    // Adicionar listeners imediatamente
    window.addEventListener('websocket-message-received', handleWebSocketMessage);
    window.addEventListener('session-terminated', handleSessionTerminated);

    // Listener adicional para mensagens WebSocket diretas
    const handleDirectWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'session_terminated') {
          console.log('🔒 Mensagem WebSocket direta de sessão encerrada:', {
            data,
            currentPage: window.location.pathname,
            eventSource: 'direct-websocket'
          });
          
          if (checkIfCurrentSession(data.sessionToken)) {
            console.log('🔒 SESSÃO ATUAL ENCERRADA VIA WEBSOCKET DIRETO');
            activateSessionProtection(data.message || "Sua sessão foi encerrada por outro usuário");
          }
        }
      } catch (error) {
        // Não é JSON válido, ignorar
      }
    };

    return () => {
      window.removeEventListener('websocket-message-received', handleWebSocketMessage);
      window.removeEventListener('session-terminated', handleSessionTerminated);
    };
  }, [user]);

  // Enviar informações de autenticação quando o usuário estiver logado
  useEffect(() => {
    if (connected && user) {
      // Extrair sessionToken dos cookies
      const getSessionTokenFromCookie = () => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'connect.sid') {
            return decodeURIComponent(value);
          }
        }
        return null;
      };

      const sessionToken = getSessionTokenFromCookie();

      if (sessionToken) {
        console.log(`🔐 Enviando autenticação WebSocket para usuário ${user.id}`);
        console.log(`🔑 Session ID: ${sessionToken.substring(0, 8)}...`);

        sendMessage({
          type: 'auth',
          userId: user.id,
          sessionToken: sessionToken
        });
      } else {
        console.warn('⚠️ Session token não encontrado nos cookies');
      }
    }
  }, [connected, user, sendMessage]);

  return (
    <WebSocketContext.Provider value={{ connected, sendMessage, lastUpdated }}>
      {children}
      <SessionTerminatedModal
        isOpen={sessionTerminated}
        onClose={() => {
          // Não permitir fechar o modal - forçar logout
          console.log('🔒 Tentativa de fechar modal bloqueada - forçando logout');
        }}
        message={terminationMessage}
      />
    </WebSocketContext.Provider>
  );
}
