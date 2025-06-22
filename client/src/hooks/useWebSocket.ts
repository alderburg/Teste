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
    else if (data.type === 'session_terminated') {
      // Tratar evento de sessão encerrada
      console.log('🔒 Sessão encerrada pelo servidor:', data);

      // Verificar se é a sessão atual que foi encerrada
      const currentSessionToken = localStorage.getItem('sessionToken') || 
                                 localStorage.getItem('token') || 
                                 document.cookie.split(';').find(c => c.trim().startsWith('sessionToken='))?.split('=')[1] || 
                                 '';

      console.log('🔒 Verificando tokens:', {
        current: currentSessionToken?.substring(0, 8) + '...',
        terminated: data.sessionToken?.substring(0, 8) + '...',
        match: currentSessionToken === data.sessionToken,
        currentPage: window.location.pathname
      });

      if (currentSessionToken === data.sessionToken) {
        console.log('🔒 Esta é a sessão atual - disparando evento de encerramento');

        // Invalidar imediatamente o queryClient para evitar requisições
        try {
          queryClient.invalidateQueries();
          queryClient.clear();
        } catch (error) {
          console.error('Erro ao limpar queryClient:', error);
        }

        // AÇÃO IMEDIATA: Forçar o popup globalmente
        const forceSessionTerminationPopup = () => {
          console.log('🔒 FORÇANDO POPUP DE SESSÃO ENCERRADA');

          // Verificar se já existe um popup
          if (document.querySelector('[data-session-terminated-modal]')) {
            console.log('🔒 Modal já existe, não duplicar');
            return;
          }

          // Criar modal diretamente no DOM
          const modal = document.createElement('div');
          modal.setAttribute('data-session-terminated-modal', 'true');
          modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.8) !important;
            z-index: 999999 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            backdrop-filter: blur(4px) !important;
          `;

          const modalContent = document.createElement('div');
          modalContent.style.cssText = `
            background: white !important;
            padding: 32px !important;
            border-radius: 12px !important;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1) !important;
            max-width: 400px !important;
            width: 90% !important;
            text-align: center !important;
            font-family: system-ui, -apple-system, sans-serif !important;
          `;

          let countdown = 10;
          modalContent.innerHTML = `
            <div style="color: #dc2626; font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin-bottom: 16px;">
              Sessão Encerrada
            </h2>
            <p style="color: #6b7280; margin-bottom: 24px; line-height: 1.5;">
              ${data.message || 'Sua sessão foi encerrada por outro usuário'}
            </p>
            <p style="color: #374151; font-weight: 500; margin-bottom: 24px;">
              Redirecionando em <span id="countdown">${countdown}</span> segundos...
            </p>
            <button id="logout-now" style="
              background: #dc2626;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              font-size: 16px;
            ">
              Sair Agora
            </button>
          `;

          modal.appendChild(modalContent);
          document.body.appendChild(modal);

          // Countdown e logout automático
          const countdownElement = document.getElementById('countdown');
          const logoutButton = document.getElementById('logout-now');

          const countdownInterval = setInterval(() => {
            countdown--;
            if (countdownElement) {
              countdownElement.textContent = countdown.toString();
            }

            if (countdown <= 0) {
              clearInterval(countdownInterval);
              performLogout();
            }
          }, 1000);

          const performLogout = () => {
            console.log('🔒 Executando logout forçado');

            // Limpar dados locais
            localStorage.clear();
            sessionStorage.clear();

            // Limpar cookies
            document.cookie.split(";").forEach(function(c) { 
              document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
            });

            // Redirecionar
            window.location.href = '/acessar';
          };

          if (logoutButton) {
            logoutButton.addEventListener('click', () => {
              clearInterval(countdownInterval);
              performLogout();
            });
          }
        };

        // Executar imediatamente
        forceSessionTerminationPopup();

        // Disparar eventos para compatibilidade
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

  // Estabelecer conexão ao montar o componente
  useEffect(() => {
    try {
      // Definir URL do WebSocket baseado no ambiente
      const getWebSocketUrl = () => {
        if (typeof window === 'undefined') return '';

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host; // Inclui porta se existir

        return `${protocol}//${host}/ws`;
      };

      const wsUrl = getWebSocketUrl();
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
        console.log('🔗 =============== WEBSOCKET CONECTADO ===============');
        console.log('🔗 Socket readyState:', socket.readyState);
        console.log('🔗 Timestamp:', new Date().toISOString());
        console.log('🔗 URL:', wsUrl);
        console.log('🔗 Definindo connected = true...');
        setConnected(true);
        setReconnectAttempts(0); // Resetar contador de tentativas ao conectar com sucesso
        
        // Aguardar um momento para garantir que a conexão está completamente estabelecida
        setTimeout(() => {
          console.log('🔗 =============== WEBSOCKET TOTALMENTE PRONTO ===============');
          console.log('🔗 Conexão WebSocket estabilizada, pronto para receber mensagens de auth');
          console.log('🔗 Estado atualizado - connected deve estar true agora');
          console.log('🔗 ReadyState final:', socket.readyState);
          console.log('🔗 ⚡ A PARTIR DE AGORA, MENSAGENS DE AUTH PODEM SER ENVIADAS');
          
          // Enviar autenticação automaticamente se houver dados de sessão
          try {
            const sessionToken = localStorage.getItem('sessionToken') || document.cookie
              .split('; ')
              .find(row => row.startsWith('connect.sid='))
              ?.split('=')[1];
            
            const userDataStr = localStorage.getItem('userData');
            const userData = userDataStr ? JSON.parse(userDataStr) : null;
            
            if (sessionToken && userData?.id) {
              console.log('🔐 Enviando autenticação WebSocket automaticamente...');
              console.log('🔐 Session Token:', sessionToken.substring(0, 8) + '...');
              console.log('🔐 User ID:', userData.id);
              
              const authMessage = {
                type: 'auth',
                sessionToken: sessionToken,
                userId: userData.id,
                timestamp: new Date().toISOString()
              };
              
              socket.send(JSON.stringify(authMessage));
              console.log('✅ Mensagem de autenticação enviada');
            } else {
              console.log('⚠️ Não foi possível encontrar dados de sessão para autenticação automática');
              console.log('⚠️ sessionToken:', !!sessionToken);
              console.log('⚠️ userData:', !!userData);
              console.log('⚠️ userData.id:', userData?.id);
            }
          } catch (authError) {
            console.error('❌ Erro ao enviar autenticação:', authError);
          }
          
          console.log('🔗 =============== FIM WEBSOCKET READY ===============');
        }, 100);
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
    console.log(`🔗 =============== ENVIANDO MENSAGEM WEBSOCKET ===============`);
    console.log(`🔗 Timestamp: ${new Date().toISOString()}`);
    console.log(`🔗 WebSocket ref exists: ${!!socketRef.current}`);
    console.log(`🔗 WebSocket readyState: ${socketRef.current?.readyState} (OPEN = 1)`);
    console.log(`🔗 Mensagem COMPLETA a enviar:`, JSON.stringify(message, null, 2));
    console.log(`🔗 Tipo da mensagem: ${message.type}`);
    
    // SE FOR MENSAGEM DE AUTH, LOGS EXTREMOS
    if (message.type === 'auth') {
      console.log(`🔐 =============== MENSAGEM DE AUTENTICAÇÃO DETECTADA ===============`);
      console.log(`🔐 userId: ${message.userId}`);
      console.log(`🔐 sessionToken COMPLETO: "${message.sessionToken}"`);
      console.log(`🔐 sessionToken length: ${message.sessionToken ? message.sessionToken.length : 'null'}`);
      console.log(`🔐 sessionToken first 20 chars: "${message.sessionToken ? message.sessionToken.substring(0, 20) : 'null'}"`);
      console.log(`🔐 Todos os campos da mensagem:`, Object.keys(message));
      console.log(`🔐 WebSocket estado antes do envio: ${socketRef.current?.readyState}`);
      console.log(`🔐 =============== TENTANDO ENVIAR AUTH AGORA ===============`);
    }

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        const messageString = JSON.stringify(message);
        console.log(`🔗 String JSON gerada: ${messageString}`);
        console.log(`🔗 Tamanho da string: ${messageString.length} bytes`);
        console.log(`🔗 Socket ainda aberto antes do send: ${socketRef.current.readyState === WebSocket.OPEN}`);
        
        console.log(`🔗 =============== EXECUTANDO socketRef.current.send() ===============`);
        socketRef.current.send(messageString);
        console.log(`🔗 =============== send() EXECUTADO SEM ERROS ===============`);
        
        // Verificações pós-envio
        console.log(`✅ Mensagem enviada com sucesso via WebSocket`);
        console.log(`✅ Verificação pós-envio - Socket readyState: ${socketRef.current.readyState}`);
        console.log(`✅ Timestamp pós-envio: ${new Date().toISOString()}`);
        
        // SE FOR AUTH, LOGS ADICIONAIS
        if (message.type === 'auth') {
          console.log(`🔐 =============== AUTENTICAÇÃO ENVIADA COM SUCESSO ===============`);
          console.log(`🔐 Se esta mensagem apareceu, a auth foi enviada pelo cliente`);
          console.log(`🔐 Aguarde confirmação do servidor nos próximos segundos`);
          console.log(`🔐 Se não chegou no servidor, há um problema de rede/proxy`);
          console.log(`🔐 =============== FIM DEBUG AUTH ENVIO ===============`);
        }
        
        return true;
      } catch (error) {
        console.error('❌ =============== ERRO AO ENVIAR MENSAGEM ===============');
        console.error('❌ Erro details:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ WebSocket state during error:', socketRef.current?.readyState);
        
        if (message.type === 'auth') {
          console.error('🔐 ❌ ERRO CRÍTICO: FALHA AO ENVIAR AUTENTICAÇÃO');
          console.error('🔐 ❌ Detalhes do erro:', {
            errorMessage: error.message,
            errorType: error.constructor.name,
            messageLength: JSON.stringify(message).length,
            socketState: socketRef.current?.readyState
          });
        }
        
        return false;
      }
    } else {
      console.error(`❌ =============== WEBSOCKET NÃO PRONTO PARA ENVIO ===============`);
      console.error(`❌ WebSocket exists: ${!!socketRef.current}`);
      console.error(`❌ ReadyState: ${socketRef.current?.readyState}`);
      console.error(`❌ Estados possíveis:`, {
        CONNECTING: WebSocket.CONNECTING,
        OPEN: WebSocket.OPEN,
        CLOSING: WebSocket.CLOSING,
        CLOSED: WebSocket.CLOSED
      });
      
      if (message.type === 'auth') {
        console.error('🔐 ❌ FALHA CRÍTICA: Tentativa de enviar AUTH com WebSocket não pronto');
        console.error('🔐 ❌ Estado atual:', socketRef.current?.readyState);
        console.error('🔐 ❌ Esperado: WebSocket.OPEN (1)');
      }
    }
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