import { useEffect } from 'react';

export function useSessionGuard(sessionTerminated: boolean) {
  useEffect(() => {
    if (!sessionTerminated) return;

    console.log('🔒 Ativando proteção total contra acesso - sessão encerrada');

    // Salvar referências originais
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    const originalFetch = window.fetch;

    // Interceptar TODAS as requisições XMLHttpRequest
    XMLHttpRequest.prototype.open = function(...args) {
      console.log('🚫 Requisição XHR BLOQUEADA - sessão encerrada:', args[1]);
      // Não executar a abertura da requisição
      return;
    };

    XMLHttpRequest.prototype.send = function(data) {
      console.log('🚫 Envio XHR BLOQUEADO - sessão encerrada');
      // Disparar erro imediatamente
      if (this.onerror) {
        this.onerror(new ProgressEvent('error'));
      }
      return;
    };

    // Interceptar TODAS as requisições fetch
    window.fetch = async (...args) => {
      console.log('🚫 Requisição fetch BLOQUEADA - sessão encerrada:', args[0]);
      throw new Error('SESSÃO ENCERRADA - Acesso negado');
    };

    // Bloquear navegação entre páginas
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Sua sessão foi encerrada. Você precisa fazer login novamente.';
      return 'Sua sessão foi encerrada. Você precisa fazer login novamente.';
    };

    const handlePopState = (e: PopStateEvent) => {
      console.log('🚫 Navegação BLOQUEADA - sessão encerrada');
      e.preventDefault();
      e.stopImmediatePropagation();
      // Manter na página atual
      window.history.pushState(null, '', window.location.href);
    };

    // Bloquear submissão de formulários
    const handleFormSubmit = (e: Event) => {
      const form = e.target as HTMLElement;
      if (!form.closest('[data-session-terminated="true"]')) {
        console.log('🚫 Submissão de formulário BLOQUEADA - sessão encerrada');
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }
    };

    // Bloquear todos os cliques exceto no modal de sessão encerrada
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const isInModal = target.closest('[data-session-terminated="true"]');

      if (!isInModal) {
        console.log('🚫 Clique BLOQUEADO - sessão encerrada');
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }
    };

    // Bloquear teclas (exceto interações com o modal)
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInModal = target.closest('[data-session-terminated="true"]');

      if (!isInModal) {
        console.log('🚫 Tecla BLOQUEADA - sessão encerrada');
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }
    };

    // Bloquear mudança de foco (exceto no modal)
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const isInModal = target.closest('[data-session-terminated="true"]');

      if (!isInModal && target !== document.body) {
        console.log('🚫 Foco BLOQUEADO - sessão encerrada');
        e.preventDefault();
        // Força o foco de volta para o modal
        const modal = document.querySelector('[data-session-terminated="true"]');
        if (modal) {
          const focusableElement = modal.querySelector('button, input, [tabindex]') as HTMLElement;
          if (focusableElement) {
            focusableElement.focus();
          }
        }
      }
    };

    // Adicionar todos os listeners com captura
    window.addEventListener('beforeunload', handleBeforeUnload, { capture: true });
    window.addEventListener('popstate', handlePopState, { capture: true });
    document.addEventListener('submit', handleFormSubmit, { capture: true });
    document.addEventListener('click', handleClick, { capture: true });
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    document.addEventListener('focus', handleFocus, { capture: true });

    // Bloquear mudanças de URL
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      console.log('🚫 Navegação pushState BLOQUEADA - sessão encerrada');
      return;
    };

    history.replaceState = function(...args) {
      console.log('🚫 Navegação replaceState BLOQUEADA - sessão encerrada');
      return;
    };

    // Esconder todo o conteúdo da página exceto o modal
    const originalBodyStyle = document.body.style.cssText;
    document.body.style.cssText = `
      ${originalBodyStyle}
      pointer-events: none !important;
      user-select: none !important;
      overflow: hidden !important;
    `;

    // Permitir interação apenas com o modal
    const modal = document.querySelector('[data-session-terminated="true"]');
    if (modal) {
      (modal as HTMLElement).style.pointerEvents = 'auto';
      (modal as HTMLElement).style.userSelect = 'auto';
      (modal as HTMLElement).style.zIndex = '9999999';
      (modal as HTMLElement).style.position = 'fixed';
    }

    console.log('🔒 BLOQUEIO TOTAL ATIVADO - Apenas modal de sessão encerrada está acessível');

    // Cleanup
    return () => {
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;
      window.fetch = originalFetch;
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;

      window.removeEventListener('beforeunload', handleBeforeUnload, { capture: true });
      window.removeEventListener('popstate', handlePopState, { capture: true });
      document.removeEventListener('submit', handleFormSubmit, { capture: true });
      document.removeEventListener('click', handleClick, { capture: true });
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('focus', handleFocus, { capture: true });

      document.body.style.cssText = originalBodyStyle;

      console.log('🔓 Proteção total removida - Acesso restaurado');
    };
  }, [sessionTerminated]);
}