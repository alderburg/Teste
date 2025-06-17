
import { useEffect } from 'react';

export function useSessionGuard(sessionTerminated: boolean) {
  useEffect(() => {
    if (!sessionTerminated) return;

    console.log('🔒 Ativando proteção total contra requisições - sessão encerrada');

    // Interceptar XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(...args) {
      console.log('🚫 Requisição XHR bloqueada devido à sessão encerrada:', args[1]);
      throw new Error('Sessão encerrada - requisição XHR bloqueada');
    };

    XMLHttpRequest.prototype.send = function() {
      console.log('🚫 Envio XHR bloqueado devido à sessão encerrada');
      throw new Error('Sessão encerrada - envio XHR bloqueado');
    };

    // Interceptar fetch 
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      console.log('🚫 Requisição fetch bloqueada devido à sessão encerrada:', args[0]);
      throw new Error('Sessão encerrada - requisição fetch bloqueada');
    };

    // Bloquear submissão de formulários
    const handleFormSubmit = (e: Event) => {
      console.log('🚫 Submissão de formulário bloqueada devido à sessão encerrada');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    // Adicionar listener para todos os formulários
    document.addEventListener('submit', handleFormSubmit, true);

    // Bloquear cliques em botões de ação
    const handleButtonClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        const button = target.tagName === 'BUTTON' ? target : target.closest('button');
        if (button && !button.closest('[data-session-terminated="true"]')) {
          console.log('🚫 Clique em botão bloqueado devido à sessão encerrada');
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }
    };

    // Bloquear cliques em links
    const handleLinkClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' || target.closest('a')) {
        const link = target.tagName === 'A' ? target : target.closest('a');
        if (link && !link.closest('[data-session-terminated="true"]')) {
          console.log('🚫 Clique em link bloqueado devido à sessão encerrada');
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }
    };

    // Bloquear mudanças em inputs
    const handleInputChange = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        if (!target.closest('[data-session-terminated="true"]')) {
          console.log('🚫 Mudança em input bloqueada devido à sessão encerrada');
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }
    };

    document.addEventListener('click', handleButtonClick, true);
    document.addEventListener('click', handleLinkClick, true);
    document.addEventListener('input', handleInputChange, true);
    document.addEventListener('change', handleInputChange, true);

    // Limpar ao desmontar ou quando sessão não estiver mais encerrada
    return () => {
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;
      window.fetch = originalFetch;
      document.removeEventListener('submit', handleFormSubmit, true);
      document.removeEventListener('click', handleButtonClick, true);
      document.removeEventListener('click', handleLinkClick, true);
      document.removeEventListener('input', handleInputChange, true);
      document.removeEventListener('change', handleInputChange, true);
      
      console.log('🔓 Proteção contra requisições removida');
    };
  }, [sessionTerminated]);
}
