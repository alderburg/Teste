
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
  lastUpdated?: Date; // Nova propriedade para rastrear a última atualização
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
  // Usar o hook de WebSocket que criamos
  const { connected, sendMessage } = useWebSocket();
  const { user } = useAuth();
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);
  const [connectionLost, setConnectionLost] = useState(false);
  const [sessionTerminated, setSessionTerminated] = useState(false);
  const [terminationMessage, setTerminationMessage] = useState<string>("");

  // Ativar proteção quando sessão estiver encerrada
  useSessionGuard(sessionTerminated);

  // Atualizar o timestamp sempre que recebermos uma mensagem
  useEffect(() => {
    // Criar uma função para ouvir as mensagens do WebSocket
    const handleWebSocketMessage = (event: any) => {
      setLastUpdated(new Date());

      // Verificar se é uma mensagem de sessão encerrada
      if (event.detail && event.detail.type === 'session_terminated') {
        const currentSessionToken = localStorage.getItem('sessionToken') || 
                                   localStorage.getItem('token') || 
                                   document.cookie.split(';').find(c => c.trim().startsWith('sessionToken='))?.split('=')[1] || 
                                   '';
        const terminatedSessionToken = event.detail.sessionToken;

        console.log('🔒 Evento de sessão encerrada recebido:', {
          currentToken: currentSessionToken?.substring(0, 8) + '...',
          terminatedToken: terminatedSessionToken?.substring(0, 8) + '...',
          isCurrentSession: currentSessionToken === terminatedSessionToken
        });

        // Só mostrar o modal se for a sessão atual que foi encerrada
        if (currentSessionToken === terminatedSessionToken) {
          console.log('🔒 SESSÃO ATUAL ENCERRADA - ATIVANDO PROTEÇÃO TOTAL');
          
          // PRIMEIRO: Limpar todos os dados imediatamente
          queryClient.invalidateQueries();
          queryClient.clear();
          
          // SEGUNDO: Ativar estado de sessão encerrada ANTES do modal
          setSessionTerminated(true);
          
          // TERCEIRO: Mostrar modal após proteção ativada
          setTimeout(() => {
            setTerminationMessage(event.detail.message || "Sua sessão foi encerrada por outro usuário");
            console.log('🔒 Modal de sessão encerrada exibido');
          }, 100);
          
        } else {
          console.log('🔒 Outra sessão foi encerrada:', terminatedSessionToken?.substring(0, 8) + '...');
        }
      }
    };

    // Função para ouvir eventos específicos de sessão encerrada
    const handleSessionTerminated = (event: any) => {
      console.log('🔒 Evento session-terminated recebido:', event.detail);
      
      // Verificar se é a sessão atual
      const currentSessionToken = localStorage.getItem('sessionToken') || 
                                 localStorage.getItem('token') || 
                                 document.cookie.split(';').find(c => c.trim().startsWith('sessionToken='))?.split('=')[1] || 
                                 '';
      
      if (currentSessionToken === event.detail.sessionToken) {
        console.log('🔒 ESTA É A SESSÃO ATUAL - ATIVANDO PROTEÇÃO TOTAL');
        
        // PRIMEIRO: Limpar todos os dados imediatamente
        queryClient.invalidateQueries();
        queryClient.clear();
        
        // SEGUNDO: Ativar estado de sessão encerrada ANTES do modal
        setSessionTerminated(true);
        
        // TERCEIRO: Mostrar modal após proteção ativada
        setTimeout(() => {
          setTerminationMessage(event.detail.message || "Sua sessão foi encerrada por outro usuário");
          console.log('🔒 Modal de sessão encerrada exibido via evento direto');
        }, 100);
      }
    };

    // Adicionar ambos os eventos de escuta
    window.addEventListener('websocket-message-received', handleWebSocketMessage);
    window.addEventListener('session-terminated', handleSessionTerminated);

    // Limpar ao desmontar
    return () => {
      window.removeEventListener('websocket-message-received', handleWebSocketMessage);
      window.removeEventListener('session-terminated', handleSessionTerminated);
    };
  }, []);

  // Enviar informações de autenticação quando o usuário estiver logado
  useEffect(() => {
    if (connected && user) {
      // Tentar obter o token da sessão de diferentes fontes
      const sessionToken = localStorage.getItem('sessionToken') || 
                           localStorage.getItem('token') || 
                           document.cookie.split(';').find(c => c.trim().startsWith('sessionToken='))?.split('=')[1] || 
                           '';

      console.log(`🔐 Enviando autenticação WebSocket para usuário ${user.id} com token: ${sessionToken.substring(0, 8)}...`);

      sendMessage({
        type: 'auth',
        userId: user.id,
        sessionToken: sessionToken
      });
    }
  }, [connected, user, sendMessage]);

  // Mostrar notificação quando o status de conexão mudar
  useEffect(() => {
    // Se reconectar após perda de conexão, atualizar estado
    if (connected && connectionLost) {
      setConnectionLost(false);
    } 
    // Se perder a conexão, atualizar estado
    else if (!connected && !connectionLost) {
      setConnectionLost(true);
    }
  }, [connected, connectionLost]);

  return (
    <WebSocketContext.Provider value={{ connected, sendMessage, lastUpdated }}>
      {children}
      <SessionTerminatedModal
        isOpen={sessionTerminated}
        onClose={() => setSessionTerminated(false)}
        message={terminationMessage}
      />
    </WebSocketContext.Provider>
  );
}
