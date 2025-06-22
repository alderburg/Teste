
import { useEffect, useRef, useState, useCallback } from 'react';

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
  const currentPath = useRef(window.location.pathname);

  const sendMessage = useCallback((message: WebSocketMessage): boolean => {
    try {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
        console.log('✅ Mensagem WebSocket enviada:', message.type);
        return true;
      } else {
        console.log('❌ WebSocket não está aberto. Estado:', socket?.readyState);
        return false;
      }
    } catch (error) {
      console.error("❌ Erro ao enviar mensagem WebSocket:", error);
      return false;
    }
  }, [socket]);

  // Função para fechar conexão anterior de forma mais agressiva
  const closeExistingConnection = useCallback(() => {
    if (socket) {
      console.log('🔌 Fechando conexão WebSocket anterior devido à mudança de rota');
      try {
        // Fechar de forma mais agressiva
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close(1000, 'Mudança de rota');
        }
        // Forçar terminate se necessário
        setTimeout(() => {
          if (socket && socket.readyState !== WebSocket.CLOSED) {
            try {
              (socket as any).terminate?.();
            } catch (e) {
              // Ignorar erros
            }
          }
        }, 100);
      } catch (error) {
        console.error('Erro ao fechar conexão anterior:', error);
      }
      setSocket(null);
      setConnected(false);
      reconnectAttempts.current = 0;
    }
  }, [socket]);

  useEffect(() => {
    // Detectar mudança de rota
    const handleRouteChange = () => {
      const newPath = window.location.pathname;
      if (currentPath.current !== newPath) {
        console.log(`🔄 Mudança de rota detectada: ${currentPath.current} → ${newPath}`);
        currentPath.current = newPath;
        
        // Fechar conexão anterior e criar nova
        closeExistingConnection();
        
        // Aguardar um pouco antes de reconectar para garantir limpeza
        setTimeout(() => {
          console.log('🔗 Criando nova conexão WebSocket após mudança de rota');
          connect();
        }, 500);
      }
    };

    // Listener para mudanças de rota (funciona com React Router)
    window.addEventListener('popstate', handleRouteChange);
    
    // Observer para mudanças no pathname (funciona com navegação programática)
    const observer = new MutationObserver(() => {
      handleRouteChange();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });

    const connect = () => {
      try {
        // Se já existe uma conexão ativa, não criar outra
        if (socket && socket.readyState === WebSocket.OPEN) {
          console.log('⚠️ Conexão WebSocket já existe e está ativa');
          return;
        }

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.hostname;
        let port = window.location.port;

        if (!port) {
          port = window.location.protocol === "https:" ? "443" : "80";
        }

        const wsUrl = `${protocol}//${host}:${port}/ws`;
        console.log(`🔗 Conectando WebSocket: ${wsUrl} (rota: ${window.location.pathname})`);

        const newSocket = new WebSocket(wsUrl);

        newSocket.addEventListener('open', () => {
          console.log("✅ WebSocket conectado");
          setConnected(true);
          reconnectAttempts.current = 0;

          // Enviar informações básicas do cliente
          newSocket.send(JSON.stringify({
            type: 'client_info',
            url: window.location.pathname,
            timestamp: new Date().toISOString()
          }));
        });

        newSocket.addEventListener('close', () => {
          console.log("🔌 WebSocket desconectado");
          setConnected(false);

          // Tentar reconectar
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            console.log(`🔄 Reconectando... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            setTimeout(connect, reconnectDelay);
          } else {
            console.log('❌ Máximo de tentativas de reconexão atingido');
          }
        });

        newSocket.addEventListener('error', (error) => {
          console.error("❌ Erro WebSocket:", error);
        });

        newSocket.addEventListener('message', (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Responder a pings do servidor
            if (message.type === 'server_ping') {
              newSocket.send(JSON.stringify({
                type: 'pong',
                timestamp: message.timestamp
              }));
            }

            // Processar mensagens de autenticação
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

            if (message.type === 'auth_error') {
              console.log("❌ Erro na autenticação WebSocket:", message.message);
            }

            // Processar atualizações de dados
            if (message.type === 'data_update') {
              const customEvent = new CustomEvent('websocket-data-update', {
                detail: message
              });
              window.dispatchEvent(customEvent);
            }

            // Processar sessões encerradas
            if (message.type === 'session_terminated') {
              const customEvent = new CustomEvent('session-terminated', {
                detail: message
              });
              window.dispatchEvent(customEvent);
            }

          } catch (error) {
            console.error("❌ Erro ao processar mensagem WebSocket:", error);
          }
        });

        setSocket(newSocket);

      } catch (error) {
        console.error("❌ Erro ao conectar WebSocket:", error);
      }
    };

    connect();

    // Conectar inicialmente
    connect();

    return () => {
      console.log('🧹 Limpeza do useWebSocket');
      
      // Remover listeners
      window.removeEventListener('popstate', handleRouteChange);
      observer.disconnect();
      
      // Fechar conexão
      if (socket) {
        try {
          if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
            socket.close(1000, 'Componente desmontado');
          }
        } catch (error) {
          console.error('Erro ao fechar WebSocket na limpeza:', error);
        }
        setSocket(null);
      }
    };
  }, []); // Dependências vazias para conectar apenas uma vez

  return {
    connected,
    sendMessage
  };
}
