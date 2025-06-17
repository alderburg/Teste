import { useEffect } from 'react';

export function useSessionGuard(sessionTerminated: boolean) {
  useEffect(() => {
    if (!sessionTerminated) return;

    console.log('🔒 ATIVANDO PROTEÇÃO - SESSÃO ENCERRADA');

    // Criar overlay de proteção
    const createProtectionOverlay = () => {
      // Remover overlay existente se houver
      const existingOverlay = document.getElementById('session-guard-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }

      const overlay = document.createElement('div');
      overlay.id = 'session-guard-overlay';
      overlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.3) !important;
        z-index: 9999998 !important;
        pointer-events: auto !important;
        backdrop-filter: blur(2px) !important;
      `;

      document.body.appendChild(overlay);
      return overlay;
    };

    // Criar overlay
    const overlay = createProtectionOverlay();

    // Bloquear scroll
    const originalBodyStyle = document.body.style.cssText;
    document.body.style.overflow = 'hidden';

    // Função para bloquear eventos fora do modal
    const blockEvent = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-session-terminated="true"]') && 
          !target.closest('[role="dialog"]')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        console.log('🚫 Evento bloqueado - sessão encerrada');
      }
    };

    // Adicionar listeners de bloqueio
    document.addEventListener('click', blockEvent, { capture: true });
    document.addEventListener('keydown', blockEvent, { capture: true });
    document.addEventListener('focus', blockEvent, { capture: true });

    console.log('🔒 Proteção de sessão ativada');

    // Limpar ao desmontar
    return () => {
      // Remover overlay
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }

      // Restaurar estilos
      document.body.style.cssText = originalBodyStyle;

      // Remover listeners
      document.removeEventListener('click', blockEvent, { capture: true });
      document.removeEventListener('keydown', blockEvent, { capture: true });
      document.removeEventListener('focus', blockEvent, { capture: true });

      console.log('🔓 Proteção de sessão removida');
    };
  }, [sessionTerminated]);
}