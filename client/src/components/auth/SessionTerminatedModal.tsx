import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";

interface SessionTerminatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function SessionTerminatedModal({ isOpen, onClose, message }: SessionTerminatedModalProps) {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const [countdown, setCountdown] = useState(10);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Garantir bloqueio total quando modal estiver aberto
  useEffect(() => {
    if (!isOpen) return;

    console.log('🔒 Modal de sessão encerrada aberto - BLOQUEIO TOTAL ATIVO');

    // Criar overlay de bloqueio total
    const overlay = document.createElement('div');
    overlay.id = 'session-terminated-overlay';
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.8) !important;
      z-index: 999998 !important;
      pointer-events: auto !important;
      backdrop-filter: blur(5px) !important;
    `;

    // Adicionar overlay ao body
    document.body.appendChild(overlay);

    // Bloquear scroll e interação com a página
    const originalBodyStyle = document.body.style.cssText;
    document.body.style.cssText = `
      ${originalBodyStyle}
      overflow: hidden !important;
      position: fixed !important;
      width: 100% !important;
      height: 100% !important;
      top: 0 !important;
      left: 0 !important;
    `;

    // Interceptar TODAS as requisições
    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;

    window.fetch = async (...args) => {
      console.log('🚫 Fetch BLOQUEADO - modal de sessão encerrada aberto:', args[0]);
      throw new Error('SESSÃO ENCERRADA - Acesso negado');
    };

    XMLHttpRequest.prototype.open = function(...args) {
      console.log('🚫 XHR BLOQUEADO - modal de sessão encerrada aberto:', args[1]);
      return;
    };

    // Bloquear navegação
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Sua sessão foi encerrada. Você será redirecionado para o login.';
    };

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      console.log('🚫 Navegação BLOQUEADA - modal de sessão encerrada aberto');
      // Manter na URL atual
      window.history.pushState(null, '', window.location.href);
    };

    // Bloquear todas as interações exceto com o modal
    const handleGlobalClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-session-terminated="true"]')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        console.log('🚫 Clique BLOQUEADO - fora do modal de sessão encerrada');
      }
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-session-terminated="true"]')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        console.log('🚫 Tecla BLOQUEADA - fora do modal de sessão encerrada');
      }
    };

    // Adicionar listeners
    window.addEventListener('beforeunload', handleBeforeUnload, { capture: true });
    window.addEventListener('popstate', handlePopState, { capture: true });
    document.addEventListener('click', handleGlobalClick, { capture: true });
    document.addEventListener('keydown', handleGlobalKeyDown, { capture: true });

    console.log('🔒 BLOQUEIO TOTAL IMPLEMENTADO - Apenas modal acessível');

    // Limpar ao fechar o modal
    return () => {
      // Remover overlay
      const overlayElement = document.getElementById('session-terminated-overlay');
      if (overlayElement) {
        overlayElement.remove();
      }

      // Restaurar estilos
      document.body.style.cssText = originalBodyStyle;

      // Restaurar funções
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;

      // Remover listeners
      window.removeEventListener('beforeunload', handleBeforeUnload, { capture: true });
      window.removeEventListener('popstate', handlePopState, { capture: true });
      document.removeEventListener('click', handleGlobalClick, { capture: true });
      document.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });

      console.log('🔓 Bloqueio do modal removido');
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      console.log('🔒 Iniciando logout forçado devido à sessão encerrada');

      // Invalidar e limpar todas as queries
      queryClient.invalidateQueries();
      queryClient.clear();

      // Limpar completamente o estado local
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userType');
      sessionStorage.clear();

      // Limpar cookies
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });

      // Executar logout do hook (sem aguardar para evitar travamento)
      logout().catch(() => {
        console.log('Erro no logout, mas continuando com redirecionamento');
      });

      // Fechar modal
      onClose();

      // Aguardar um pouco para garantir que o modal foi fechado
      setTimeout(() => {
        // Forçar redirecionamento
        window.location.href = "/acessar?logout=true&session_terminated=true";
      }, 100);

    } catch (error) {
      console.error('Erro durante logout forçado:', error);
      // Mesmo com erro, forçar redirecionamento
      window.location.href = "/acessar?logout=true&session_terminated=true";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal={true}>
      <DialogContent 
        className="sm:max-w-md fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" 
        hideCloseButton 
        data-session-terminated="true"
        style={{
          zIndex: 9999999,
          position: 'fixed',
          pointerEvents: 'auto',
          userSelect: 'auto'
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            🔒 Sessão Encerrada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-slate-900 mb-2 font-medium">
              {message || "Sua sessão foi encerrada por outro usuário"}
            </p>
            <p className="text-sm text-slate-600 bg-yellow-50 p-2 rounded border">
              ⚠️ Por segurança, o acesso às funcionalidades foi bloqueado
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Redirecionamento automático em {countdown} segundos
            </p>
            {isLoggingOut && (
              <p className="text-sm text-blue-600 mt-2 animate-pulse">
                🔄 Encerrando sessão...
              </p>
            )}
          </div>

          <div className="flex justify-center gap-3">
            <Button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
              variant="default"
              disabled={isLoggingOut}
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? 'Saindo...' : 'Ir para Login Agora'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}