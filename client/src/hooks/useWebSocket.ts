
import { useEffect, useRef, useState, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';
import { showSessionTerminationPopup, isCurrentSession } from '@/lib/globalSessionHandler';

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
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const MAX_RECONNECT_ATTEMPTS = 3;
  const isConnectingRef = useRef(false);
  const shouldReconnectRef = useRef(true);
  
  // Evitar múltiplas conexões WebSocket
  const connectionKey = 'primary-websocket-connection';

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
    else if (data.type === 'session_terminated') {
      // Tratar evento de sessão encerrada usando o handler global
      console.log('🔒 CLIENTE: Sessão encerrada pelo servidor:', data);
      console.log(`🔔 CLIENTE: MENSAGEM DE ENCERRAMENTO RECEBIDA - Processando encerramento`);
      
      if (isCurrentSession(data.sessionToken)) {
        console.log('🔒 CLIENTE: Esta é a sessão atual - ativando popup global IMEDIATAMENTE');
        
        // Limpar cache do queryClient imediatamente
        try {
          queryClient.invalidateQueries();
          queryClient.clear();
          console.log('🔒 CLIENTE: Cache limpo com sucesso');
        } catch (error) {
          console.error('Erro ao limpar queryClient:', error);
        }
        
        // Usar o handler global para mostrar o popup
        console.log('🔒 CLIENTE: Chamando showSessionTerminationPopup...');
        showSessionTerminationPopup(data.message || 'Sua sessão foi encerrada por outro usuário');
        console.log('🔒 CLIENTE: Popup de encerramento deveria estar visível agora');
        
        // Disparar eventos para compatibilidade com outros componentes
        const sessionTerminatedEvent = new CustomEvent('session-terminated', { 
          detail: { 
            message: data.message || 'Sua sessão foi encerrada por outro usuário',
            sessionToken: data.sessionToken,
            userId: data.userId,
            type: 'session_terminated'
          } 
        });
        window.dispatchEvent(sessionTerminatedEvent);
        
        const webSocketEvent = new CustomEvent('websocket-message-received', { 
          detail: { 
            type: 'session_terminated',
            message: data.message || 'Sua sessão foi encerrada por outro usuário',
            sessionToken: data.sessionToken,
            userId: data.userId
          } 
        });
        window.dispatchEvent(webSocketEvent);
        
        console.log('🔒 CLIENTE: Eventos de sessão encerrada disparados');
      } else {
        console.log('🔒 CLIENTE: Token de sessão não corresponde à sessão atual - ignorando');
      }
      
      return;
    }

    // Se for uma atualização de dados, invalidar a consulta correspondente
    if (data.type === 'data_update' && data.resource) {
      console.log(`Invalidando cache para ${data.resource} devido a ${data.action}`);

      // Mapear recursos para chaves de consulta
      const resourceToQueryKey: Record<string, string> = {
        'enderecos': '/api/enderecos',
        'contatos': '/api/contatos',
        'usuarios_adicionais': '/api/usuarios-adicionais',
        'sessoes': '/api/conta/sessoes'
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
            else if (data.action === 'delete' && data.data) {
              // Para exclusão, remover o item
              const idToRemove = data.data.sessionId || data.data.id;
              if (idToRemove) {
                updatedData = previousData.filter(item => item.id !== idToRemove);
                console.log(`Item removido do cache para ${resource}:`, idToRemove);
              }
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

  // Função para tentar reconectar
  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS || isConnectingRef.current || !shouldReconnectRef.current) {
      console.log('Reconexão cancelada: limite atingido, já conectando ou desabilitada');
      return;
    }

    const timeout = Math.min(3000 * Math.pow(2, reconnectAttempts), 15000);
    console.log(`Tentando reconexão em ${timeout}ms (tentativa ${reconnectAttempts + 1} de ${MAX_RECONNECT_ATTEMPTS})`);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      if (shouldReconnectRef.current && !isConnectingRef.current) {
        setReconnectAttempts(prev => prev + 1);
        createConnection();
      }
    }, timeout);
  }, [reconnectAttempts]);

  // Função para criar conexão WebSocket
  const createConnection = useCallback(() => {
    if (isConnectingRef.current || !shouldReconnectRef.current) {
      console.log('Criação de conexão cancelada: já conectando ou desabilitada');
      return;
    }

    // Verificar se já existe uma conexão global ativa
    const existingSocket = (window as any)[connectionKey];
    if (existingSocket && existingSocket.readyState === WebSocket.OPEN) {
      console.log('WebSocket já existe e está conectado - usando conexão existente');
      socketRef.current = existingSocket;
      setConnected(true);
      setReconnectAttempts(0);
      return;
    }

    isConnectingRef.current = true;

    try {
      // Definir URL do WebSocket baseado no ambiente
      const getWebSocketUrl = () => {
        if (typeof window === 'undefined') return '';

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        
        // No Replit, sempre usar a porta padrão (sem especificar porta)
        // O proxy já redireciona corretamente para o WebSocket
        let wsUrl;
        if (process.env.NODE_ENV === 'development' && host === 'localhost') {
          wsUrl = `${protocol}//localhost:5001/ws`;
        } else {
          // Para produção no Replit, usar o domínio sem porta específica
          wsUrl = `${protocol}//${host}/ws`;
        }
        
        console.log('🔍 CLIENTE: URL WebSocket calculada:', wsUrl);
        return wsUrl;
      };

      const wsUrl = getWebSocketUrl();
      console.log('🔄 CLIENTE: Tentando conectar WebSocket em:', wsUrl);

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      (window as any)[connectionKey] = socket;

      // Timeout para conexão
      const connectionTimeout = setTimeout(() => {
        if (socket.readyState === WebSocket.CONNECTING) {
          console.log('❌ CLIENTE: Timeout na conexão WebSocket');
          socket.close();
          isConnectingRef.current = false;
        }
      }, 10000);

      socket.addEventListener('open', () => {
        clearTimeout(connectionTimeout);
        console.log('🔗 CLIENTE: WebSocket conectado com sucesso');
        setConnected(true);
        setReconnectAttempts(0);
        isConnectingRef.current = false;
        
        // Enviar ping inicial para confirmar conexão
        try {
          socket.send(JSON.stringify({
            type: 'client_connected',
            timestamp: new Date().toISOString(),
            url: window.location.pathname
          }));
          console.log('📤 CLIENTE: Ping inicial enviado');
        } catch (error) {
          console.error('❌ CLIENTE: Erro ao enviar ping inicial:', error);
        }
      });

      socket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(`🔍 CLIENTE: Mensagem WebSocket recebida:`, data);
          
          if (data.type === 'session_terminated') {
            console.log(`🔔 CLIENTE: MENSAGEM DE ENCERRAMENTO RECEBIDA - Token: ${data.sessionToken?.substring(0, 8)}...`);
          }
          
          handleMessage(data);

          // Disparar evento personalizado para notificar outras partes da aplicação
          const customEvent = new CustomEvent('websocket-message-received', { detail: data });
          window.dispatchEvent(customEvent);
        } catch (error) {
          console.error('❌ CLIENTE: Erro ao processar mensagem do WebSocket:', error);
        }
      });

      socket.addEventListener('error', (error) => {
        console.error('❌ CLIENTE: Erro na conexão WebSocket:', error);
        console.error('❌ CLIENTE: URL que falhou:', wsUrl);
        setConnected(false);
        isConnectingRef.current = false;
      });

      socket.addEventListener('close', (event) => {
        console.log('❌ CLIENTE: WebSocket desconectado:', event.code, event.reason);
        setConnected(false);
        isConnectingRef.current = false;
        
        // Limpar da conexão global
        if ((window as any)[connectionKey] === socket) {
          delete (window as any)[connectionKey];
        }
        
        // Tentar reconectar apenas se não foi fechamento intencional e ainda deve reconectar
        if (event.code !== 1000 && event.code !== 1001 && shouldReconnectRef.current) {
          attemptReconnect();
        }
      });

    } catch (error) {
      console.error('❌ CLIENTE: Erro ao criar conexão WebSocket:', error);
      setConnected(false);
      isConnectingRef.current = false;
      attemptReconnect();
    }
  }, [handleMessage, attemptReconnect]);

  // Estabelecer conexão ao montar o componente
  useEffect(() => {
    createConnection();

    // Limpar ao desmontar
    return () => {
      try {
        shouldReconnectRef.current = false;
        isConnectingRef.current = false;

        // Cancelar qualquer tentativa de reconexão pendente
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // Fechar socket se estiver aberto
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.close(1000, 'Component unmounting');
        }

        // Limpar da conexão global
        if ((window as any)[connectionKey] === socketRef.current) {
          delete (window as any)[connectionKey];
        }
      } catch (closeError) {
        console.error('Erro ao fechar WebSocket:', closeError);
      }
    };
  }, [createConnection]);

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

      // Criar nova conexão
      createConnection();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [createConnection]);

  return { connected, sendMessage };
}
