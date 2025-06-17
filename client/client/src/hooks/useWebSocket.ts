import { useEffect, useRef, useState, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';

interface WebSocketMessage {
  type: string;
  resource?: string;
  action?: 'create' | 'update' | 'delete';
  userId?: number;
  data?: any;
  message?: string;
}

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  
  // Função para processar mensagens recebidas
  const handleMessage = useCallback((data: WebSocketMessage) => {
    console.log('WebSocket mensagem recebida:', data);
    
    // Tratar eventos especiais do servidor
    if (data.type === 'server_ping') {
      // Responder ao ping do servidor para manter conexão ativa
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ 
          type: 'pong', 
          timestamp: new Date().toISOString(),
          client_info: { 
            url: window.location.pathname 
          }
        }));
      }
      return; // Não precisamos processar mais nada para pings
    }
    else if (data.type === 'pong') {
      // Apenas registrar que recebemos um pong - indica que a conexão está ativa
      console.log('Pong recebido do servidor:', data.timestamp);
      return;
    }
    
    // Se for uma atualização de dados, invalidar a consulta correspondente
    if (data.type === 'data_update' && data.resource) {
      console.log(`Invalidando cache para ${data.resource} devido a ${data.action}`);
      
      // Mapear recursos para chaves de consulta
      const resourceToQueryKey: Record<string, string> = {
        'enderecos': '/api/enderecos',
        'contatos': '/api/contatos',
        'usuarios_adicionais': '/api/usuarios-adicionais'
      };
      
      // Invalidar a consulta correspondente
      const resource = data.resource as string;
      if (resource && Object.prototype.hasOwnProperty.call(resourceToQueryKey, resource)) {
        try {
          const queryKey = [resourceToQueryKey[resource]];
          const previousData = queryClient.getQueryData<any[]>(queryKey);
          
          // Atualizar imediatamente o cache com os dados recebidos do WebSocket
          if (previousData) {
            let updatedData = [...previousData];
            
            // Diferentes ações exigem diferentes atualizações do cache
            if (data.action === 'update' && data.data) {
              // Para updates, substituir o item existente
              updatedData = previousData.map(item => 
                item.id === data.data.id ? data.data : item
              );
              console.log(`Item atualizado no cache para ${resource}:`, data.data);
            } 
            else if (data.action === 'create' && data.data) {
              // Para criação, adicionar o novo item
              if (!previousData.some(item => item.id === data.data.id)) {
                updatedData = [...previousData, data.data];
                console.log(`Novo item adicionado ao cache para ${resource}:`, data.data);
              }
            } 
            else if (data.action === 'delete' && data.data && data.data.id) {
              // Para exclusão, remover o item
              updatedData = previousData.filter(item => item.id !== data.data.id);
              console.log(`Item removido do cache para ${resource}:`, data.data.id);
            } 
            
            // Atualizar o cache diretamente
            queryClient.setQueryData(queryKey, updatedData);
            console.log(`Cache atualizado para ${resource}`, updatedData);
          }
        } catch (error) {
          console.error('Erro ao atualizar cache:', error);
        }
        
        // Também invalidar a consulta para garantir consistência completa com o servidor
        queryClient.invalidateQueries({ 
          queryKey: [resourceToQueryKey[resource]]
        });
        
        // Exibir uma notificação em console para debug
        console.log(`Atualização em tempo real do recurso: ${data.resource}, ação: ${data.action}`);
      }
    }
  }, []);
  
  // Estabelecer conexão ao montar o componente
  useEffect(() => {
    try {
      // Criar URL do WebSocket baseada na URL atual
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('Tentando conectar ao WebSocket em:', wsUrl);
      
      // Criar conexão WebSocket com tratamento de erro
      let socket: WebSocket;
      
      try {
        socket = new WebSocket(wsUrl);
        socketRef.current = socket;
      } catch (connectionError) {
        console.error('Erro ao criar conexão WebSocket:', connectionError);
        setConnected(false);
        return; // Sair se não conseguir criar o socket
      }
      
      // Configurar listeners
      socket.addEventListener('open', () => {
        console.log('WebSocket conectado');
        setConnected(true);
      });
      
      socket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
          
          // Disparar evento personalizado para notificar outras partes da aplicação
          const customEvent = new CustomEvent('websocket-message-received', { detail: data });
          window.dispatchEvent(customEvent);
        } catch (error) {
          console.error('Erro ao processar mensagem do WebSocket:', error);
        }
      });
      
      // Função para tentar reconectar
      const tryReconnect = () => {
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          // Calculando tempo exponencial de backoff para reconexão
          const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
          
          console.log(`Tentando reconexão em ${timeout}ms (tentativa ${reconnectAttempts + 1} de ${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            
            // Limpar referência do socket atual
            if (socketRef.current) {
              socketRef.current = null;
            }
            
            // Tentar criar uma nova conexão
            try {
              const newSocket = new WebSocket(wsUrl);
              socketRef.current = newSocket;
              
              // Configurar eventos para o novo socket (recursivamente)
              setupSocketEvents(newSocket, wsUrl);
            } catch (reconnectError) {
              console.error('Erro ao reconectar WebSocket:', reconnectError);
              // Continuamos tentando reconectar se ainda tivermos tentativas
              tryReconnect();
            }
          }, timeout);
        } else {
          console.error('Número máximo de tentativas de reconexão atingido');
        }
      };
      
      // Função para configurar eventos do socket
      const setupSocketEvents = (socket: WebSocket, url: string) => {
        socket.addEventListener('open', () => {
          console.log('WebSocket conectado');
          setConnected(true);
          setReconnectAttempts(0); // Resetar contador de tentativas ao conectar com sucesso
        });
        
        socket.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            handleMessage(data);
            
            // Disparar evento personalizado para notificar outras partes da aplicação
            const customEvent = new CustomEvent('websocket-message-received', { detail: data });
            window.dispatchEvent(customEvent);
          } catch (error) {
            console.error('Erro ao processar mensagem do WebSocket:', error);
          }
        });
        
        socket.addEventListener('close', () => {
          console.log('WebSocket desconectado');
          setConnected(false);
          tryReconnect();
        });
        
        socket.addEventListener('error', (error) => {
          console.error('Erro no WebSocket:', error);
          setConnected(false);
        });
      };
      
      // Inicializar configuração de eventos
      setupSocketEvents(socket, wsUrl);
      
      // Limpar ao desmontar
      return () => {
        try {
          // Cancelar qualquer tentativa de reconexão pendente
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          
          // Fechar socket se estiver aberto
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.close();
          }
        } catch (closeError) {
          console.error('Erro ao fechar WebSocket:', closeError);
        }
      };
    } catch (error) {
      console.error('Erro geral no setup do WebSocket:', error);
      setConnected(false);
    }
  }, [handleMessage]);
  
  // Função para enviar mensagens
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    console.log('WebSocket não está pronto para enviar mensagem.');
    return false;
  }, []);
  
  // Estabelecer ping para manter conexão ativa
  useEffect(() => {
    let pingInterval: ReturnType<typeof setInterval> | null = null;
    
    // Se conectado, iniciar ping periódico
    if (connected && socketRef.current) {
      pingInterval = setInterval(() => {
        try {
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            // Enviar um ping simples para manter a conexão ativa
            socketRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        } catch (error) {
          console.error('Erro ao enviar ping:', error);
        }
      }, 30000); // ping a cada 30 segundos
    }
    
    return () => {
      if (pingInterval) {
        clearInterval(pingInterval);
      }
    };
  }, [connected]);
  
  // Reconexão rápida ao detectar mudança na conexão de rede
  useEffect(() => {
    const handleOnline = () => {
      console.log('Conexão de rede restaurada, reconectando WebSocket...');
      // Resetar contador de tentativas para permitir nova tentativa imediata
      setReconnectAttempts(0);
      
      // Fechar conexão atual se existir
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch (e) {
          // Ignorar erros ao fechar
        }
        socketRef.current = null;
      }
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);
  
  return { connected, sendMessage };
}