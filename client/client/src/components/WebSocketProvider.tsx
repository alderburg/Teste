import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';

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
  //const { toast } = useToast();
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);
  const [connectionLost, setConnectionLost] = useState(false);
  
  // Atualizar o timestamp sempre que recebermos uma mensagem
  useEffect(() => {
    // Criar uma função para ouvir as mensagens do WebSocket
    const handleWebSocketMessage = () => {
      setLastUpdated(new Date());
    };
    
    // Adicionar evento de escuta global para mensagens do WebSocket
    window.addEventListener('websocket-message-received', handleWebSocketMessage);
    
    // Limpar ao desmontar
    return () => {
      window.removeEventListener('websocket-message-received', handleWebSocketMessage);
    };
  }, []);
  
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
    </WebSocketContext.Provider>
  );
}