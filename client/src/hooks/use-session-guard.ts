
import { useEffect } from 'react';

export function useSessionGuard(sessionTerminated: boolean) {
  useEffect(() => {
    if (!sessionTerminated) return;

    console.log('🔒 ATIVANDO PROTEÇÃO TOTAL - SESSÃO ENCERRADA');

    // Criar overlay de bloqueio total imediatamente
    const createBlockingOverlay = () => {
      // Remover overlay existente se houver
      const existingOverlay = document.getElementById('session-terminated-block');
      if (existingOverlay) {
        existingOverlay.remove();
      }

      const overlay = document.createElement('div');
      overlay.id = 'session-terminated-block';
      overlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.95) !important;
        z-index: 99999999 !important;
        pointer-events: auto !important;
        backdrop-filter: blur(10px) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: white !important;
        font-family: system-ui, sans-serif !important;
        font-size: 18px !important;
        text-align: center !important;
      `;
      
      overlay.innerHTML = `
        <div style="padding: 40px; background: rgba(220, 38, 38, 0.9); border-radius: 12px; border: 2px solid #fff; max-width: 500px;">
          <h2 style="margin: 0 0 20px 0; color: white; font-size: 24px;">🔒 SESSÃO ENCERRADA</h2>
          <p style="margin: 0 0 15px 0; color: white;">Sua sessão foi encerrada por motivos de segurança.</p>
          <p style="margin: 0; color: #fef2f2; font-size: 16px;">Aguarde o redirecionamento automático...</p>
        </div>
      `;

      document.body.appendChild(overlay);
      return overlay;
    };

    // Criar overlay imediatamente
    const overlay = createBlockingOverlay();

    // Bloquear completamente o body
    const originalBodyStyle = document.body.style.cssText;
    document.body.style.cssText = `
      ${originalBodyStyle}
      overflow: hidden !important;
      position: fixed !important;
      width: 100% !important;
      height: 100% !important;
      top: 0 !important;
      left: 0 !important;
      pointer-events: none !important;
      user-select: none !important;
    `;

    // Salvar referências originais
    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    // Bloquear TODAS as requisições fetch
    window.fetch = async (...args) => {
      console.log('🚫 FETCH TOTALMENTE BLOQUEADO - sessão encerrada:', args[0]);
      throw new Error('SESSÃO ENCERRADA - Todas as requisições foram bloqueadas');
    };

    // Bloquear TODAS as requisições XMLHttpRequest
    XMLHttpRequest.prototype.open = function(...args) {
      console.log('🚫 XHR TOTALMENTE BLOQUEADO - sessão encerrada:', args[1]);
      throw new Error('SESSÃO ENCERRADA - Todas as requisições foram bloqueadas');
    };

    XMLHttpRequest.prototype.send = function(data) {
      console.log('🚫 XHR SEND TOTALMENTE BLOQUEADO - sessão encerrada');
      throw new Error('SESSÃO ENCERRADA - Todas as requisições foram bloqueadas');
    };

    // Bloquear mudanças de URL
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      console.log('🚫 NAVEGAÇÃO BLOQUEADA - pushState');
      return;
    };

    history.replaceState = function(...args) {
      console.log('🚫 NAVEGAÇÃO BLOQUEADA - replaceState');
      return;
    };

    // Bloquear eventos de navegação
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Sua sessão foi encerrada. Você será redirecionado.';
    };

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      console.log('🚫 NAVEGAÇÃO BLOQUEADA - popstate');
      window.history.pushState(null, '', window.location.href);
    };

    // Bloquear TODOS os eventos de interação
    const blockAllEvents = (e: Event) => {
      const target = e.target as HTMLElement;
      
      // Permitir apenas o modal de sessão encerrada
      if (!target.closest('[data-session-terminated="true"]') && 
          !target.closest('#session-terminated-block')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        console.log('🚫 EVENTO BLOQUEADO:', e.type);
        return false;
      }
    };

    // Lista de eventos para bloquear
    const eventsToBlock = [
      'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout',
      'keydown', 'keyup', 'keypress', 'focus', 'blur', 'change', 'input', 'submit',
      'touchstart', 'touchend', 'touchmove', 'wheel', 'scroll'
    ];

    // Adicionar listeners para bloquear todos os eventos
    eventsToBlock.forEach(eventType => {
      document.addEventListener(eventType, blockAllEvents, { capture: true, passive: false });
    });

    // Adicionar listeners de navegação
    window.addEventListener('beforeunload', handleBeforeUnload, { capture: true });
    window.addEventListener('popstate', handlePopState, { capture: true });

    // Bloquear submissão de formulários
    const handleFormSubmit = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      console.log('🚫 FORMULÁRIO BLOQUEADO - sessão encerrada');
      return false;
    };

    document.addEventListener('submit', handleFormSubmit, { capture: true });

    // Esconder todo o conteúdo da página
    const hidePageContent = () => {
      const allElements = document.querySelectorAll('body > *:not(#session-terminated-block)');
      allElements.forEach((element) => {
        if (element instanceof HTMLElement) {
          element.style.visibility = 'hidden';
          element.style.pointerEvents = 'none';
          element.style.userSelect = 'none';
        }
      });
    };

    hidePageContent();

    // Garantir que o overlay sempre esteja visível
    const ensureOverlayVisible = () => {
      const currentOverlay = document.getElementById('session-terminated-block');
      if (!currentOverlay) {
        createBlockingOverlay();
      }
    };

    const overlayInterval = setInterval(ensureOverlayVisible, 100);

    console.log('🔒 PROTEÇÃO TOTAL ATIVADA - Sistema completamente bloqueado');

    // Função de limpeza
    return () => {
      // Restaurar funções originais
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;

      // Remover todos os listeners
      eventsToBlock.forEach(eventType => {
        document.removeEventListener(eventType, blockAllEvents, { capture: true });
      });

      window.removeEventListener('beforeunload', handleBeforeUnload, { capture: true });
      window.removeEventListener('popstate', handlePopState, { capture: true });
      document.removeEventListener('submit', handleFormSubmit, { capture: true });

      // Restaurar estilos
      document.body.style.cssText = originalBodyStyle;

      // Remover overlay
      const currentOverlay = document.getElementById('session-terminated-block');
      if (currentOverlay) {
        currentOverlay.remove();
      }

      // Parar intervalo
      clearInterval(overlayInterval);

      // Mostrar conteúdo novamente
      const allElements = document.querySelectorAll('body > *');
      allElements.forEach((element) => {
        if (element instanceof HTMLElement) {
          element.style.visibility = '';
          element.style.pointerEvents = '';
          element.style.userSelect = '';
        }
      });

      console.log('🔓 Proteção total removida');
    };
  }, [sessionTerminated]);
}
