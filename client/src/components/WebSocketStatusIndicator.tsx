import { useWebSocketContext } from "./WebSocketProvider";
import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

interface WebSocketStatusIndicatorProps {
  className?: string;
}

export function WebSocketStatusIndicator({ className }: WebSocketStatusIndicatorProps) {
  const { connected } = useWebSocketContext();
  const [isVisible, setIsVisible] = useState(false);
  
  // Mostrar o indicador após um certo período para evitar que apareça durante o carregamento inicial
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!isVisible) return null;
  
  return (
    <div 
      className={`flex items-center justify-center h-8 w-8 rounded-full transition-all duration-300 ${className || ''}`}
      title={connected ? "Atualizações em tempo real ativas" : "Sem conexão para atualizações em tempo real"}
    >
      {connected ? (
        <Wifi className="h-4 w-4 text-green-600" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-500" />
      )}
    </div>
  );
}