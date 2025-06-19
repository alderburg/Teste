/**
 * Global Session Termination Handler
 * 
 * This module provides a unified, global handler for session termination
 * that works consistently across all pages and tabs in the application.
 */

let isSessionTerminated = false;
let terminationModal: HTMLElement | null = null;

/**
 * Shows the session termination popup immediately and globally
 */
export function showSessionTerminationPopup(message: string = 'Sua sessão foi encerrada por outro usuário') {
  console.log('🔒 POPUP: ATIVANDO POPUP GLOBAL DE SESSÃO ENCERRADA');
  console.log('🔒 POPUP: Mensagem:', message);
  
  // Prevent multiple modals
  if (terminationModal && document.body.contains(terminationModal)) {
    console.log('🔒 POPUP: Modal já existe, não duplicar');
    return;
  }
  
  if (isSessionTerminated) {
    console.log('🔒 POPUP: Sessão já foi encerrada, não duplicar');
    return;
  }
  
  isSessionTerminated = true;
  console.log('🔒 POPUP: Flag isSessionTerminated definida como true');
  
  // Clear all local data immediately
  try {
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear all cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
  } catch (error) {
    console.error('Erro ao limpar dados locais:', error);
  }
  
  // Create modal directly in DOM with highest z-index
  terminationModal = document.createElement('div');
  terminationModal.setAttribute('data-global-session-terminated-modal', 'true');
  terminationModal.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background: rgba(0, 0, 0, 0.9) !important;
    z-index: 2147483647 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    backdrop-filter: blur(8px) !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white !important;
    padding: 40px !important;
    border-radius: 16px !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
    max-width: 450px !important;
    width: 90% !important;
    text-align: center !important;
    position: relative !important;
    animation: modalSlideIn 0.3s ease-out !important;
  `;
  
  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes modalSlideIn {
      from { 
        opacity: 0; 
        transform: scale(0.95) translateY(-20px); 
      }
      to { 
        opacity: 1; 
        transform: scale(1) translateY(0); 
      }
    }
  `;
  document.head.appendChild(style);
  
  let countdown = 10;
  modalContent.innerHTML = `
    <div style="color: #dc2626; font-size: 64px; margin-bottom: 20px; line-height: 1;">⚠️</div>
    <h2 style="color: #1f2937; font-size: 28px; font-weight: 700; margin-bottom: 16px; margin-top: 0;">
      Sessão Encerrada
    </h2>
    <p style="color: #6b7280; margin-bottom: 32px; line-height: 1.6; font-size: 16px; margin-top: 0;">
      ${message}
    </p>
    <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin-bottom: 32px;">
      <p style="color: #374151; font-weight: 600; margin-bottom: 16px; font-size: 18px; margin-top: 0;">
        Redirecionando em <span id="global-countdown" style="color: #dc2626; font-weight: 700;">${countdown}</span> segundos
      </p>
      <div style="width: 100%; background: #e5e7eb; border-radius: 12px; height: 8px; overflow: hidden;">
        <div id="global-progress" style="
          background: linear-gradient(90deg, #dc2626 0%, #ef4444 100%);
          height: 100%;
          border-radius: 12px;
          transition: width 1s linear;
          width: 0%;
        "></div>
      </div>
    </div>
    <button id="global-logout-now" style="
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: white;
      border: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-weight: 700;
      cursor: pointer;
      font-size: 16px;
      width: 100%;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(220, 38, 38, 0.5)';" 
       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(220, 38, 38, 0.4)';">
      Sair Agora
    </button>
    <p style="color: #9ca3af; font-size: 12px; margin-top: 16px; margin-bottom: 0;">
      Por segurança, você será redirecionado automaticamente
    </p>
  `;
  
  terminationModal.appendChild(modalContent);
  document.body.appendChild(terminationModal);
  
  console.log('🔒 POPUP: Modal adicionado ao DOM');
  console.log('🔒 POPUP: Modal deveria estar visível agora na tela');
  
  // Prevent any interaction with the background
  terminationModal.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  
  // Countdown and automatic logout
  const countdownElement = document.getElementById('global-countdown');
  const progressElement = document.getElementById('global-progress');
  const logoutButton = document.getElementById('global-logout-now');
  
  const countdownInterval = setInterval(() => {
    countdown--;
    if (countdownElement) {
      countdownElement.textContent = countdown.toString();
    }
    if (progressElement) {
      progressElement.style.width = `${((10 - countdown) / 10) * 100}%`;
    }
    
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      performLogout();
    }
  }, 1000);
  
  const performLogout = () => {
    console.log('🔒 Executando logout forçado global');
    
    // Clear any remaining data
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear all cookies again
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
    } catch (error) {
      console.error('Erro ao limpar dados finais:', error);
    }
    
    // Force redirect
    window.location.href = '/acessar?session_terminated=true';
  };
  
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      clearInterval(countdownInterval);
      performLogout();
    });
  }
  
  // Disable all other interactions
  const disableInteractions = (e: Event) => {
    if (!terminationModal || !terminationModal.contains(e.target as Node)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };
  
  // Add event listeners to prevent interaction
  document.addEventListener('click', disableInteractions, true);
  document.addEventListener('keydown', disableInteractions, true);
  document.addEventListener('keyup', disableInteractions, true);
  document.addEventListener('mousedown', disableInteractions, true);
  document.addEventListener('mouseup', disableInteractions, true);
  document.addEventListener('touchstart', disableInteractions, true);
  document.addEventListener('touchend', disableInteractions, true);
}

/**
 * Checks if the given session token matches the current session
 */
export function isCurrentSession(terminatedToken: string): boolean {
  if (!terminatedToken) return false;
  
  const possibleTokens = [
    localStorage.getItem('sessionToken'),
    localStorage.getItem('token'),
    document.cookie.split(';').find(c => c.trim().startsWith('sessionToken='))?.split('=')[1],
    document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1]
  ].filter(Boolean);
  
  console.log('🔍 Verificando tokens de sessão:', {
    terminatedToken: terminatedToken?.substring(0, 8) + '...',
    possibleTokens: possibleTokens.map(t => t?.substring(0, 8) + '...')
  });
  
  return possibleTokens.includes(terminatedToken);
}

/**
 * Initialize global session monitoring using existing WebSocket connection
 */
export function initializeGlobalSessionHandler() {
  console.log('🔒 Inicializando handler global de sessão');
  
  // Aguardar conexão WebSocket principal estar disponível
  const waitForWebSocket = () => {
    const primaryWebSocket = (window as any)['primary-websocket-connection'];
    
    if (primaryWebSocket) {
      console.log('🔒 Usando WebSocket principal para monitoramento de sessão');
      setupSessionListener(primaryWebSocket);
    } else {
      // Aguardar conexão principal
      setTimeout(waitForWebSocket, 500);
    }
  };
  
  const setupSessionListener = (webSocket: WebSocket) => {
    // Interceptar mensagens de sessão encerrada na conexão principal
    const originalOnMessage = webSocket.onmessage;
    
    webSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Processar mensagens de sessão encerrada com prioridade máxima
        if (data.type === 'session_terminated') {
          console.log('🔒 GLOBAL HANDLER: MENSAGEM DE SESSÃO ENCERRADA INTERCEPTADA:', {
            sessionToken: data.sessionToken?.substring(0, 8) + '...',
            message: data.message,
            currentPage: window.location.pathname,
            timestamp: new Date().toISOString()
          });
          console.log(`🔔 GLOBAL HANDLER: MENSAGEM DE ENCERRAMENTO RECEBIDA no handler global`);
          
          if (isCurrentSession(data.sessionToken)) {
            console.log('🔒 GLOBAL HANDLER: ESTA É A SESSÃO ATUAL - ATIVANDO POPUP IMEDIATAMENTE');
            console.log('🔒 GLOBAL HANDLER: Chamando showSessionTerminationPopup...');
            
            // Mostrar popup instantaneamente
            showSessionTerminationPopup(data.message || 'Sua sessão foi encerrada por outro usuário');
            
            console.log('🔒 GLOBAL HANDLER: Popup deveria estar visível agora');
            
            // Confirmar que o modal foi criado
            setTimeout(() => {
              const modal = document.querySelector('[data-session-termination-modal]');
              if (modal) {
                console.log('🔒 GLOBAL HANDLER: ✅ Modal confirmado no DOM');
              } else {
                console.log('🔒 GLOBAL HANDLER: ❌ Modal NÃO encontrado no DOM');
              }
            }, 100);
          } else {
            console.log('🔒 GLOBAL HANDLER: Token não corresponde à sessão atual - ignorando');
          }
        }
        
        // Chamar handler original para outras mensagens
        if (originalOnMessage) {
          originalOnMessage.call(webSocket, event);
        }
      } catch (error) {
        console.error('🔒 Erro ao processar mensagem de sessão:', error);
        // Chamar handler original mesmo se houver erro
        if (originalOnMessage) {
          originalOnMessage.call(webSocket, event);
        }
      }
    };
  };
  
  // Iniciar monitoramento
  waitForWebSocket();
  
  // Listen for eventos customizados como backup
  const handleGlobalSessionTermination = (event: any) => {
    const data = event.detail;
    
    if (data && data.type === 'session_terminated') {
      console.log('🔒 Evento customizado de sessão encerrada:', {
        sessionToken: data.sessionToken?.substring(0, 8) + '...',
        message: data.message,
        currentPage: window.location.pathname
      });
      
      if (isCurrentSession(data.sessionToken)) {
        console.log('🔒 SESSÃO ATUAL ENCERRADA VIA EVENTO - ATIVANDO POPUP');
        showSessionTerminationPopup(data.message || 'Sua sessão foi encerrada por outro usuário');
      }
    }
  };
  
  window.addEventListener('websocket-message-received', handleGlobalSessionTermination);
  window.addEventListener('session-terminated', handleGlobalSessionTermination);
  
  console.log('🔒 Handler global de sessão inicializado (usando conexão principal)');
}

// Auto-initialize when the module is imported
if (typeof window !== 'undefined') {
  // Initialize immediately if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Aguardar um pouco para garantir que outros sistemas WebSocket estejam carregados
      setTimeout(initializeGlobalSessionHandler, 1000);
    });
  } else {
    // Se DOM já está pronto, aguardar um pouco e inicializar
    setTimeout(initializeGlobalSessionHandler, 1000);
  }
}