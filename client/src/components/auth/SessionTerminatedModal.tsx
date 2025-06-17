import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface SessionTerminatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function SessionTerminatedModal({ isOpen, onClose, message }: SessionTerminatedModalProps) {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const [countdown, setCountdown] = useState(10);

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
    try {
      // Limpar completamente o estado local
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userType');
      sessionStorage.clear();
      
      // Executar logout do hook
      await logout();
      
      // Fechar modal
      onClose();
      
      // Forçar redirecionamento
      window.location.href = "/acessar?logout=true";
    } catch (error) {
      console.error('Erro durante logout forçado:', error);
      // Mesmo com erro, forçar redirecionamento
      window.location.href = "/acessar?logout=true";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
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
          </div>

          <div className="flex justify-center gap-3">
            <Button
              onClick={handleLogout}
              className="flex items-center gap-2"
              variant="default"
            >
              <LogOut className="h-4 w-4" />
              Ir para Login
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}