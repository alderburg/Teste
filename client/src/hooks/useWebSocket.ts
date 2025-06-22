import { useEffect, useRef, useState, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';

interface WebSocketMessage {
  type: string;
  resource?: string;
  action?: 'create' | 'update' | 'delete';
  userId?: number;
  data?: any;
  message?: string;
  sessionToken?: string;
  timestamp?: string;
}

export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  const sendMessage = useCallback((message: WebSocketMessage): boolean => {
    try {
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log('📤 Enviando mensagem WebSocket:', message.type, message);
        socket.send(JSON.stringify(message));
        console.log('✅ Mensagem enviada com sucesso');
        return true;
      } else {
        console.log('❌ WebSocket não está aberto:', {
          socketExists: !!socket,
          readyState: socket?.readyState,
          expectedState: WebSocket.OPEN
        });
        return false;
      }
    } catch (error) {
      console.error("❌ Erro ao enviar mensagem WebSocket:", error);
      return false;
    }
  }, [socket]);

  useEffect(() => {
    const connect = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.hostname;
        let port = window.location.port;

        if (!port) {
          port = window.location.protocol === "https:" ? "443" : "80";
        }

        const wsUrl = `${protocol}//${host}:${port}/ws`;
        console.log(`Conectando WebSocket em ${wsUrl}`);

        const newSocket = new WebSocket(wsUrl);

        newSocket.addEventListener('open', () => {
          console.log("WebSocket conectado");
          setConnected(true);
          reconnectAttempts.current = 0;

          // Enviar informações do cliente
          newSocket.send(JSON.stringify({
            type: 'client_info',
            client_info: {
              url: window.location.pathname,
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString()
            }
          }));
        });

        newSocket.addEventListener('close', () => {
          console.log("WebSocket desconectado");
          setConnected(false);

          // Tentar reconectar
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            console.log(`Tentando reconectar em ${reconnectDelay}ms (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            setTimeout(connect, reconnectDelay);
          }
        });

        newSocket.addEventListener('error', (error) => {
          console.error("Erro WebSocket:", error);
        });

        newSocket.addEventListener('message', (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log("Mensagem WebSocket recebida:", message);

            // Responder a pings do servidor
            if (message.type === 'server_ping') {
              newSocket.send(JSON.stringify({
                type: 'pong',
                timestamp: message.timestamp
              }));
            }

            // Processar atualizações de dados
            if (message.type === 'data_update') {
              const customEvent = new CustomEvent('websocket-data-update', {
                detail: message
              });
              window.dispatchEvent(customEvent);
            }

            // Processar resposta de autenticação
            if (message.type === 'auth_success') {
              console.log("✅ Autenticação WebSocket bem-sucedida");
              const customEvent = new CustomEvent('websocket-message-received', {
                detail: message
              });
              window.dispatchEvent(customEvent);
            }

            if (message.type === 'auth_failed') {
              console.log("❌ Falha na autenticação WebSocket:", message.message);
            }

            // Processar sessões encerradas
            if (message.type === 'session_terminated') {
              const customEvent = new CustomEvent('session-terminated', {
                detail: message
              });
              window.dispatchEvent(customEvent);
            }

          } catch (error) {
            console.error("Erro ao processar mensagem WebSocket:", error);
          }
        });

        setSocket(newSocket);

      } catch (error) {
        console.error("Erro ao conectar WebSocket:", error);
      }
    };

    connect();

    return () => {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    };
  }, []); // Dependências vazias para conectar apenas uma vez

  return {
    connected,
    sendMessage
  };
}