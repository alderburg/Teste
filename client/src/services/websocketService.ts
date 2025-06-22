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
    const host = window.location.hostname;
    let port = window.location.port;
    
    // Construir URL do WebSocket de forma mais robusta
    let wsUrl: string;
    
    // Verificar se estamos em ambiente Replit
    const isReplit = window.location.hostname.includes('replit.dev') || 
                     window.location.hostname.includes('replit.co') ||
                     window.location.hostname.includes('repl.co');
    
    if (isReplit) {
      // Em ambiente Replit, usar a mesma URL base da página atual
      wsUrl = `${protocol}//${window.location.host}/ws`;
    } else if (port && port !== '80' && port !== '443') {
      // Se há porta especificada e não é padrão, usar ela
      wsUrl = `${protocol}//${host}:${port}/ws`;
    } else {
      // Se não há porta ou é padrão, não incluir na URL
      wsUrl = `${protocol}//${host}/ws`;
    }
    
    // Validar se a URL está bem formada antes de tentar conectar
    try {
      new URL(wsUrl);
    } catch (urlError) {
      console.error('URL do WebSocket inválida:', wsUrl);
      throw new Error(`URL do WebSocket inválida: ${wsUrl}`);
    }
    
    console.log(`Conectando WebSocket em ${wsUrl}`);
    
    // Tentar criar o WebSocket com tratamento de erro específico
    try {
      socket = new WebSocket(wsUrl);
    } catch (domException) {
      console.error('Erro ao criar WebSocket - DOMException:', domException);
      
      // Se falhar, tentar uma URL alternativa mais simples
      const fallbackUrl = `${protocol}//${window.location.host}/ws`;
      console.log(`Tentando URL alternativa: ${fallbackUrl}`);
      
      try {
        socket = new WebSocket(fallbackUrl);
      } catch (secondError) {
        console.error('Falha também na URL alternativa:', secondError);
        isInitializing = false;
        return;
      }
    }
    
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
    
    // Verificar se é o erro específico de DOMException
    if (error instanceof DOMException || (error && typeof error === 'object' && 'name' in error && error.name === 'DOMException')) {
      console.log("Detectado DOMException - tentando abordagem alternativa");
      
      // Tentar com configuração alternativa após um breve delay
      setTimeout(() => {
        tryAlternativeConnection();
      }, 500);
    }
    
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
  
  // Autenticação automática se houver token de sessão
  const sessionToken = localStorage.getItem('sessionToken') || 
                       localStorage.getItem('token') || 
                       document.cookie.split(';').find(c => c.trim().startsWith('sessionToken='))?.split('=')[1] || 
                       '';
  
  if (sessionToken) {
    // Tentar obter userId do localStorage ou fazer uma requisição para obtê-lo
    const userDataStr = localStorage.getItem('user');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        if (userData.id) {
          sendMessage({
            type: 'auth',
            userId: userData.id,
            sessionToken: sessionToken
          });
          console.log(`🔐 Autenticação WebSocket enviada para usuário ${userData.id}`);
        }
      } catch (error) {
        console.error('Erro ao parsear dados do usuário:', error);
      }
    }
  }
  
  // Iniciar heartbeat
  startHeartbeat();
}

function handleMessage(event: MessageEvent) {
  try {
    const message = JSON.parse(event.data) as WebSocketMessage;
    
    // Responder pings do servidor com pongs
    if (message.type === 'server_ping') {
      sendMessage({
        type: 'pong',
        timestamp: message.timestamp,
        client_info: { url: window.location.pathname }
      });
    }
    
    // Processar atualizações de dados
    if (message.type === 'data_update') {
      processDataUpdate(message as DataUpdateMessage);
    }
    
    // Processar atualizações de sessões
    if (message.type === 'session_update') {
      processSessionUpdate(message as SessionUpdateMessage);
    }
    
    // Processar notificações de sessão encerrada
    if (message.type === 'session_terminated') {
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
    // Silenciar erro
  }
}

function handleClose(event: CloseEvent) {
  
  // Limpar heartbeat
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  
  // Tentar reconectar
  if (reconnectAttempts < maxReconnectAttempts) {
    reconnectAttempts++;
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    
    reconnectTimeout = setTimeout(() => {
      initWebSocket();
    }, reconnectDelay);
  }
}

function handleError(event: Event) {
  console.error("Erro na conexão WebSocket:", event);
  
  // Se for um erro de DOMException durante a conexão, tentar reconectar com URL alternativa
  if (event instanceof ErrorEvent && event.message) {
    console.error("Detalhes do erro WebSocket:", event.message);
  }
  
  // Limpar conexão com erro
  if (socket) {
    socket = null;
  }
  
  // Resetar flag de inicialização
  isInitializing = false;
}

// Funções auxiliares
function processDataUpdate(message: DataUpdateMessage) {
  const { resource, action, data, userId } = message;
  
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
 * Função para tentar conexão alternativa quando há DOMException
 */
function tryAlternativeConnection() {
  if (typeof window === 'undefined' || socket || isInitializing) return;
  
  console.log("Tentando conexão WebSocket alternativa...");
  isInitializing = true;
  
  try {
    // Tentar diferentes variações de URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const isReplit = window.location.hostname.includes('replit.dev') || 
                     window.location.hostname.includes('replit.co') ||
                     window.location.hostname.includes('repl.co');
    
    const alternatives = [];
    
    if (isReplit) {
      // Para Replit, usar apenas a URL base da página atual
      alternatives.push(`${protocol}//${window.location.host}/ws`);
    } else {
      // Para desenvolvimento local, tentar várias opções
      alternatives.push(
        `${protocol}//${window.location.hostname}:${window.location.port || '3000'}/ws`,
        `ws://localhost:3000/ws`,
        `ws://127.0.0.1:3000/ws`,
        `${protocol}//${window.location.host}/ws`
      );
    }
    
    let connected = false;
    let attemptIndex = 0;
    
    const tryNextUrl = () => {
      if (attemptIndex >= alternatives.length || connected) {
        if (!connected) {
          console.log("Todas as URLs alternativas falharam");
          socket = null;
        }
        isInitializing = false;
        return;
      }
      
      const wsUrl = alternatives[attemptIndex];
      attemptIndex++;
      
      try {
        console.log(`Tentando URL alternativa: ${wsUrl}`);
        socket = new WebSocket(wsUrl);
        
        socket.addEventListener('open', () => {
          console.log(`Conexão bem-sucedida com URL alternativa: ${wsUrl}`);
          connected = true;
          isInitializing = false;
          handleOpen(new Event('open'));
        });
        
        socket.addEventListener('message', handleMessage);
        socket.addEventListener('close', handleClose);
        
        socket.addEventListener('error', (error) => {
          console.log(`Falha na URL alternativa ${wsUrl}:`, error);
          if (socket) {
            socket.close();
            socket = null;
          }
          // Tentar próxima URL após um breve delay
          setTimeout(tryNextUrl, 500);
        });
        
        // Timeout para tentar próxima URL se não conectar em 2 segundos
        setTimeout(() => {
          if (socket && socket.readyState !== WebSocket.OPEN && !connected) {
            console.log(`Timeout na URL ${wsUrl}, tentando próxima...`);
            if (socket) {
              socket.close();
              socket = null;
            }
            tryNextUrl();
          }
        }, 2000);
        
      } catch (error) {
        console.log(`Erro na URL alternativa ${wsUrl}:`, error);
        if (socket) {
          socket.close();
          socket = null;
        }
        // Tentar próxima URL
        setTimeout(tryNextUrl, 500);
      }
    };
    
    // Iniciar tentativas
    tryNextUrl();
    
  } catch (error) {
    console.error("Erro na conexão alternativa:", error);
    socket = null;
    isInitializing = false;
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