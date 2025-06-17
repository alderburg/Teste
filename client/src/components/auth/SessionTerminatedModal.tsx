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

  // Interceptar tentativas de navegação e requisições quando o modal estiver aberto
  useEffect(() => {
    if (!isOpen) return;

    // Interceptar requisições fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      console.log('🚫 Requisição bloqueada devido à sessão encerrada:', args[0]);
      throw new Error('Sessão encerrada - requisição bloqueada');
    };

    // Interceptar tentativas de navegação
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      console.log('🚫 Navegação bloqueada devido à sessão encerrada');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Limpar ao fechar o modal
    return () => {
      window.fetch = originalFetch;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
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
      <DialogContent className="sm:max-w-md" hideCloseButton data-session-terminated="true">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Sessão Encerrada
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
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