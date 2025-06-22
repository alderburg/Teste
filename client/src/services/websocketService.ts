/**
 * WebSocketService - Serviço para comunicação em tempo real
 * 
 * Este serviço gerencia a conexão WebSocket para atualizações em tempo real
 * entre múltiplas sessões do mesmo usuário ou entre usuários diferentes.
 */

type ClientInfo = {
  url: string;
  [key: string]: any;
};

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface DataUpdateMessage extends WebSocketMessage {
  type: 'data_update';
  resource: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  userId?: number;
}

interface SessionUpdateMessage extends WebSocketMessage {
  type: 'session_update';
  sessionId: string;
  status: 'active' | 'inactive' | 'ended';
  deviceInfo?: {
    browser?: string;
    device?: string;
    ip?: string;
    location?: string;
  };
  timestamp: string;
  userId: number;
}

// Configurações do WebSocket
let socket: WebSocket | null = null;
let isInitializing = false; // Flag para prevenir inicializações simultâneas
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let reconnectTimeout: NodeJS.Timeout | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
const reconnectDelay = 3000; // 3 segundos
const heartbeatInterval_ms = 30000; // 30 segundos

// Lista de assinantes para mensagens recebidas
const subscribers: ((message: WebSocketMessage) => void)[] = [];

// Singleton instance tracker
let instanceId: string | null = null;

/**
 * Inicializa a conexão WebSocket
 */
export function initWebSocket() {
  if (typeof window === 'undefined') return; // Não executar no servidor

  // Prevenir múltiplas inicializações simultâneas
  if (isInitializing) {
    console.log('WebSocket já está sendo inicializado, aguardando...');
    return;
  }

  // Verificar se já existe uma conexão ativa
  if (socket && socket.readyState === WebSocket.CONNECTING) {
    console.log('WebSocket já está conectando, aguardando...');
    return;
  }

  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log('WebSocket já está conectado');
    return;
  }

  // Marcar como inicializando
  isInitializing = true;

  // Fechar conexão existente se houver
  if (socket) {
    closeWebSocket();
  }

  // Gerar ID único para esta instância
  instanceId = Math.random().toString(36).substring(2, 15);

  try {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Detectar porta automaticamente baseado na URL atual
    const host = window.location.hostname;
    let port = window.location.port;

    // Se não houver porta na URL (HTTPS padrão), usar a mesma da página atual
    if (!port) {
      port = window.location.protocol === "https:" ? "443" : "80";
    }

    // Para desenvolvimento local, sempre usar a porta atual da página
    const wsUrl = `${protocol}//${host}:${port}/ws`;

    console.log(`Conectando WebSocket em ${wsUrl}`);

    socket = new WebSocket(wsUrl);

    socket.addEventListener('open', handleOpen);
    socket.addEventListener('message', handleMessage);
    socket.addEventListener('close', handleClose);
    socket.addEventListener('error', handleError);

    // Adicionar ao conjunto global para notificações
    if (typeof window !== 'undefined' && socket) {
      if (!window.wsClients) {
        window.wsClients = new Set();
      }
      window.wsClients.add(socket);
    }

    // Iniciar heartbeat quando a conexão for aberta
  } catch (error) {
    console.error("Erro ao inicializar WebSocket:", error);
    isInitializing = false; // Resetar flag em caso de erro
  } finally {
    // Resetar flag após tentativa de conexão
    setTimeout(() => {
      isInitializing = false;
    }, 1000);
  }
}

/**
 * Fecha a conexão WebSocket
 */
export function closeWebSocket() {
  if (socket) {
    try {
      // Limpar intervalos
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }

      // Remover listeners
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('message', handleMessage);
      socket.removeEventListener('close', handleClose);
      socket.removeEventListener('error', handleError);

      // Remover do conjunto global
      if (typeof window !== 'undefined' && window.wsClients) {
        window.wsClients.delete(socket);
      }

      // Fechar a conexão se estiver aberta
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }

      socket = null;
      reconnectAttempts = 0;
    } catch (error) {
      console.error("Erro ao fechar WebSocket:", error);
    }
  }
}

/**
 * Envia uma mensagem para o servidor via WebSocket
 * @param message Mensagem a ser enviada
 * @returns true se a mensagem foi enviada, false caso contrário
 */
export function sendMessage(message: WebSocketMessage): boolean {
  try {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  } catch (error) {
    console.error("Erro ao enviar mensagem WebSocket:", error);
    return false;
  }
}

/**
 * Notifica todos os clientes sobre uma atualização de dados
 * @param resource Nome do recurso (ex: "contatos", "enderecos", "perfil")
 * @param action Ação realizada (create, update, delete)
 * @param data Dados atualizados
 * @param userId ID do usuário relacionado ao recurso (opcional)
 */
export function notify(
  resource: string,
  action: 'create' | 'update' | 'delete',
  data: any,
  userId?: number
): boolean {
  const message: DataUpdateMessage = {
    type: 'data_update',
    resource,
    action,
    data,
    userId
  };

  return sendMessage(message);
}

/**
 * Inscreve um manipulador para receber eventos WebSocket
 * @param callback Função a ser chamada quando uma mensagem for recebida
 * @returns Função para cancelar a inscrição
 */
export function subscribeToMessages(callback: (message: WebSocketMessage) => void) {
  subscribers.push(callback);

  // Retorna uma função para cancelar a inscrição
  return () => {
    const index = subscribers.indexOf(callback);
    if (index !== -1) {
      subscribers.splice(index, 1);
    }
  };
}

// Handlers de eventos WebSocket
function handleOpen(event: Event) {
  console.log("WebSocket conectado com sucesso");
  reconnectAttempts = 0;

  // Enviar informações do cliente para o servidor
  const clientInfo: ClientInfo = {
    url: window.location.pathname,
    // Adicionar outras informações do cliente aqui (device, browser, etc)
  };

  sendMessage({
    type: 'client_info',
    client_info: clientInfo
  });

  // Notificar componentes sobre a conexão
  subscribers.forEach(callback => {
    try {
      callback({ type: 'websocket_connected' });
    } catch (error) {
      console.error('Erro ao notificar conexão WebSocket:', error);
    }
  });

  // Iniciar heartbeat
  startHeartbeat();
}

function handleMessage(event: MessageEvent) {
  try {
    const message = JSON.parse(event.data) as WebSocketMessage;
    console.log("WebSocket mensagem recebida:", message);

    // Responder pings do servidor com pongs
    if (message.type === 'server_ping') {
      sendMessage({
        type: 'pong',
        timestamp: message.timestamp,
        client_info: { url: window.location.pathname }
      });
    }

    // Registrar pongs recebidos
    if (message.type === 'pong') {
      console.log("Pong recebido do servidor:", message.timestamp);
    }

    // Processar respostas de autenticação
    if (message.type === 'auth_success') {
      console.log("✅ Autenticação WebSocket bem-sucedida:", message);
    }

    if (message.type === 'auth_error') {
      console.error("❌ Erro de autenticação WebSocket:", message);
    }

    // Processar atualizações de dados
    if (message.type === 'data_update') {
      processDataUpdate(message as DataUpdateMessage);
    }

    // Processar atualizações de sessões
    if (message.type === 'session_update') {
      console.log("Atualização de sessão recebida:", message);
      processSessionUpdate(message as SessionUpdateMessage);
    }

    // Processar notificações de sessão encerrada
    if (message.type === 'session_terminated') {
      console.log("🔒 Sessão encerrada recebida:", message);

      // Verificar se é a sessão atual
      const currentSessionToken = localStorage.getItem('sessionToken') || 
                                 localStorage.getItem('token') || 
                                 document.cookie.split(';').find(c => c.trim().startsWith('sessionToken='))?.split('=')[1] || 
                                 '';

      if (currentSessionToken === message.sessionToken) {
        // Disparar evento específico para sessão encerrada
        const sessionTerminatedEvent = new CustomEvent('session-terminated', { 
          detail: { 
            message: message.message,
            sessionToken: message.sessionToken,
            userId: message.userId
          } 
        });
        window.dispatchEvent(sessionTerminatedEvent);
      }
    }

    // Notificar todos os assinantes
    subscribers.forEach(callback => {
      try {
        callback(message);
      } catch (callbackError) {
        console.error("Erro ao executar callback de assinante:", callbackError);
      }
    });
  } catch (error) {
    console.error("Erro ao processar mensagem WebSocket:", error);
  }
}

function handleClose(event: CloseEvent) {
  console.log(`WebSocket desconectado: Código ${event.code}, Razão: ${event.reason}`);

  // Limpar heartbeat
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  // Tentar reconectar
  if (reconnectAttempts < maxReconnectAttempts) {
    reconnectAttempts++;
    console.log(`Tentando reconectar (${reconnectAttempts}/${maxReconnectAttempts}) em ${reconnectDelay}ms...`);

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    reconnectTimeout = setTimeout(() => {
      initWebSocket();
    }, reconnectDelay);
  } else {
    console.log("Número máximo de tentativas de reconexão atingido. WebSocket desconectado permanentemente.");
  }
}

function handleError(event: Event) {
  console.error("Erro na conexão WebSocket:", event);
}

// Funções auxiliares
function processDataUpdate(message: DataUpdateMessage) {
  const { resource, action, data, userId } = message;

  // Aqui você pode adicionar lógica específica para cada tipo de recurso
  // Por exemplo, invalidar cache do React Query ou atualizar estados locais

  console.log(`Atualização de dados via WebSocket: ${action} em ${resource}, userId: ${userId || 'n/a'}`);

  // Disparar um evento customizado que componentes podem ouvir
  if (typeof window !== 'undefined') {
    const customEvent = new CustomEvent('websocket-data-update', { 
      detail: { resource, action, data, userId } 
    });
    window.dispatchEvent(customEvent);
  }
}

function processSessionUpdate(message: SessionUpdateMessage) {
  const { sessionId, status, deviceInfo, timestamp, userId } = message;

  console.log(`Atualização de sessão via WebSocket: ${status} para sessão ${sessionId}`);

  // Disparar um evento customizado que componentes podem ouvir
  if (typeof window !== 'undefined') {
    const customEvent = new CustomEvent('websocket-session-update', { 
      detail: { sessionId, status, deviceInfo, timestamp, userId } 
    });
    window.dispatchEvent(customEvent);
  }
}

/**
 * Solicita ao servidor para iniciar o monitoramento de sessões do usuário
 * @param userId ID do usuário para monitorar
 * @returns true se a solicitação foi enviada, false caso contrário
 */
export function startSessionMonitoring(userId: number): boolean {
  return sendMessage({
    type: 'start_session_monitoring',
    userId
  });
}

/**
 * Solicita ao servidor para parar o monitoramento de sessões do usuário
 * @param userId ID do usuário para parar de monitorar
 * @returns true se a solicitação foi enviada, false caso contrário
 */
export function stopSessionMonitoring(userId: number): boolean {
  return sendMessage({
    type: 'stop_session_monitoring',
    userId
  });
}

/**
 * Força uma nova tentativa de autenticação
 * Útil quando o usuário navega para páginas que requerem autenticação
 */
export function forceReauth(): void {
  console.log('Forçando reautenticação WebSocket...');
  tryAutoAuthentication();
}

/**
 * Encerra uma sessão específica
 * @param sessionId ID da sessão a ser encerrada
 * @param userId ID do usuário dono da sessão
 * @returns true se a solicitação foi enviada, false caso contrário
 */
export function terminateSession(sessionId: string, userId: number): boolean {
  return sendMessage({
    type: 'terminate_session',
    sessionId,
    userId
  });
}

function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      sendMessage({
        type: 'ping',
        timestamp: new Date().toISOString()
      });
    }
  }, heartbeatInterval_ms);
}

/**
 * Tenta autenticar automaticamente com dados da sessão
 * @returns true se a autenticação foi enviada, false caso contrário
 */
export async function attemptAutoAuthentication(): Promise<boolean> {
  try {
    // Obter token de sessão
    let sessionToken = getSessionToken();
    let userId: number | null = null;

    // Tentar obter userId do contexto de autenticação primeiro
    if (typeof window !== 'undefined' && (window as any).authContext?.user?.id) {
      userId = (window as any).authContext.user.id;
      console.log('userId obtido do contexto de autenticação:', userId);
    }

    // Se não conseguiu obter do contexto, tentar via API
    if (!userId) {
      try {
        const response = await fetch('/api/conta/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.id) {
            userId = userData.id;
            console.log('userId obtido via API /api/conta/me:', userId);
          } else {
            console.log('userId não encontrado na resposta da API /api/conta/me');
          }
        } else {
          console.log('Falha ao obter userId via API /api/conta/me');
        }
      } catch (apiError) {
        console.warn('Erro ao obter userId via API:', apiError);
      }
    }

    // Enviar autenticação se temos os dados necessários
    if (sessionToken && userId) {
      const authMessage = {
        type: 'auth',
        userId: userId,
        sessionToken: sessionToken
      };

      console.log(`🔐 Enviando autenticação automática para usuário ${userId} com token ${sessionToken.substring(0, 8)}...`);
      const success = sendMessage(authMessage);

      if (success) {
        console.log('✅ Autenticação automática enviada com sucesso');
        return true;
      } else {
        console.log('❌ Falha ao enviar autenticação automática - tentando novamente');
        // Tentar novamente após um breve delay
        setTimeout(() => {
          sendMessage(authMessage);
        }, 1000);
        return false;
      }
    } else {
      console.log('⚠️ Autenticação automática não executada - dados insuficientes:', {
        hasToken: !!sessionToken,
        hasUserId: !!userId,
        tokenPreview: sessionToken ? sessionToken.substring(0, 8) + '...' : 'N/A'
      });
      return false;
    }
  } catch (error) {
    console.error('❌ Erro na autenticação automática:', error);
    return false;
  }
}

// Exportar funções principais
export default {
  init: initWebSocket,
  close: closeWebSocket,
  send: sendMessage,
  notify,
  subscribe: subscribeToMessages
};