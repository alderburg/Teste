
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

  // Interceptar TODAS as ações quando o modal estiver aberto
  useEffect(() => {
    if (!isOpen) return;

    console.log('🔒 Modal de sessão encerrada aberto - bloqueando todas as ações');

    // Interceptar requisições fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      console.log('🚫 Requisição fetch bloqueada devido ao modal de sessão encerrada:', args[0]);
      throw new Error('Sessão encerrada - requisição bloqueada pelo modal');
    };

    // Interceptar XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(...args) {
      console.log('🚫 Requisição XHR bloqueada devido ao modal de sessão encerrada:', args[1]);
      throw new Error('Sessão encerrada - XHR bloqueada pelo modal');
    };

    XMLHttpRequest.prototype.send = function() {
      console.log('🚫 Envio XHR bloqueado devido ao modal de sessão encerrada');
      throw new Error('Sessão encerrada - envio XHR bloqueado pelo modal');
    };

    // Bloquear navegação
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Sua sessão foi encerrada. Por favor, aguarde o redirecionamento.';
      return 'Sua sessão foi encerrada. Por favor, aguarde o redirecionamento.';
    };

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      console.log('🚫 Navegação bloqueada devido ao modal de sessão encerrada');
      // Forçar volta ao estado atual
      window.history.pushState(null, '', window.location.href);
    };

    // Interceptar todos os eventos de interação
    const blockAllInteractions = (e: Event) => {
      const target = e.target as HTMLElement;
      const isModalElement = target.closest('[data-session-terminated="true"]');
      
      if (!isModalElement) {
        console.log('🚫 Interação bloqueada devido ao modal de sessão encerrada:', e.type);
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    // Adicionar todos os listeners
    window.addEventListener('beforeunload', handleBeforeUnload, true);
    window.addEventListener('popstate', handlePopState, true);
    
    // Bloquear interações gerais
    ['click', 'mousedown', 'mouseup', 'keydown', 'keyup', 'submit', 'input', 'change', 'focus', 'blur'].forEach(eventType => {
      document.addEventListener(eventType, blockAllInteractions, true);
    });

    // Limpar ao fechar o modal
    return () => {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;
      
      window.removeEventListener('beforeunload', handleBeforeUnload, true);
      window.removeEventListener('popstate', handlePopState, true);
      
      ['click', 'mousedown', 'mouseup', 'keydown', 'keyup', 'submit', 'input', 'change', 'focus', 'blur'].forEach(eventType => {
        document.removeEventListener(eventType, blockAllInteractions, true);
      });
      
      console.log('🔓 Bloqueios removidos - modal de sessão encerrada fechado');
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
        className="sm:max-w-md" 
        hideCloseButton 
        data-session-terminated="true"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Sessão Encerrada
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4" data-session-terminated="true">
          <div className="text-center">
            <p className="text-slate-700 mb-2">
              {message || "Sua sessão foi encerrada por outro usuário"}
            </p>
            <p className="text-sm text-slate-500">
              Você será redirecionado para a página de login em {countdown} segundos
            </p>
            {isLoggingOut && (
              <p className="text-sm text-blue-600 mt-2">
                Encerrando sessão...
              </p>
            )}
          </div>

          <div className="flex justify-center gap-3">
            <Button
              onClick={handleLogout}
              className="flex items-center gap-2"
              variant="default"
              disabled={isLoggingOut}
              data-session-terminated="true"
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? 'Saindo...' : 'Ir para Login'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
