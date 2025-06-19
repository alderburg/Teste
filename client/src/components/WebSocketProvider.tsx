import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/use-auth';
import { SessionTerminatedModal } from '@/components/auth/SessionTerminatedModal';
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

  // Ativar proteção quando sessão estiver encerrada
  useSessionGuard(sessionTerminated);

  // Função para verificar se a sessão atual foi encerrada
  const checkIfCurrentSession = (terminatedToken: string): boolean => {
    const possibleTokens = [
      localStorage.getItem('sessionToken'),
      localStorage.getItem('token'),
      document.cookie.split(';').find(c => c.trim().startsWith('sessionToken='))?.split('=')[1],
      document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1]
    ].filter(Boolean);

    console.log('🔍 Verificando tokens no Provider:', {
      terminatedToken: terminatedToken?.substring(0, 8) + '...',
      possibleTokens: possibleTokens.map(t => t?.substring(0, 8) + '...')
    });

    return possibleTokens.includes(terminatedToken);
  };

  // Função para ativar proteção total
  const activateSessionProtection = (message: string) => {
    console.log('🔒 ATIVANDO PROTEÇÃO TOTAL DA SESSÃO NO PROVIDER');
    
    // Limpar todos os dados imediatamente
    queryClient.invalidateQueries();
    queryClient.clear();
    
    // Ativar estado de sessão encerrada IMEDIATAMENTE
    setSessionTerminated(true);
    setTerminationMessage(message);
    
    console.log('🔒 PROTEÇÃO ATIVADA - Modal React será exibido');
  };

  // Escutar eventos de sessão encerrada
  useEffect(() => {
    const handleSessionTerminated = (event: any) => {
      console.log('🔒 Evento session-terminated recebido no Provider:', {
        detail: event.detail,
        currentPage: window.location.pathname,
        eventSource: 'session-terminated'
      });
      
      if (checkIfCurrentSession(event.detail.sessionToken)) {
        console.log('🔒 SESSÃO ATUAL ENCERRADA - ATIVANDO PROTEÇÃO NO PROVIDER');
        activateSessionProtection(event.detail.message || "Sua sessão foi encerrada por outro usuário");
      }
    };

    // Adicionar listener apenas para session-terminated (que é disparado pelo useWebSocket)
    window.addEventListener('session-terminated', handleSessionTerminated);

    return () => {
      window.removeEventListener('session-terminated', handleSessionTerminated);
    };
  }, [user]);

  // Enviar informações de autenticação quando o usuário estiver logado
  useEffect(() => {
    if (connected && user) {
      const sessionToken = localStorage.getItem('sessionToken') || 
                           localStorage.getItem('token') || 
                           document.cookie.split(';').find(c => c.trim().startsWith('sessionToken='))?.split('=')[1] || 
                           '';

      console.log(`🔐 Enviando autenticação WebSocket para usuário ${user.id}`);

      sendMessage({
        type: 'auth',
        userId: user.id,
        sessionToken: sessionToken
      });
    }
  }, [connected, user, sendMessage]);

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