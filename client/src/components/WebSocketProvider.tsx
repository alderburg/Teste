import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/use-auth';

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

  // Atualizar timestamp quando recebermos mensagens (exceto session_terminated que é tratado globalmente)
  useEffect(() => {
    const handleWebSocketMessage = (event: any) => {
      setLastUpdated(new Date());
      
      // Log apenas outras mensagens - session_terminated é gerenciado globalmente pelo useWebSocket.ts
      if (event.detail && event.detail.type !== 'session_terminated') {
        console.log('WebSocket message received in provider:', event.detail.type);
      }
    };

    window.addEventListener('websocket-message-received', handleWebSocketMessage);

    return () => {
      window.removeEventListener('websocket-message-received', handleWebSocketMessage);
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
    </WebSocketContext.Provider>
  );
}