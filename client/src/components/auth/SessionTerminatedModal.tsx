import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useSessionGuard } from '@/hooks/use-session-guard';
import { markSessionAsTerminated } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Timer } from "lucide-react";

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

  // Ativar proteção quando modal estiver aberto
  useSessionGuard(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    console.log('🔒 Modal de sessão encerrada aberto');
    markSessionAsTerminated();

    // Iniciar contagem regressiva
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
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

    console.log('🔒 Executando logout após encerramento de sessão');
    setIsLoggingOut(true);

    try {
      // Limpar dados locais
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('token');
      localStorage.removeItem('userId');

      // Executar logout
      await logout();

      // Fechar modal
      onClose();

      // Redirecionar para login
      window.location.href = "/login?logout=true&session_terminated=true";
    } catch (error) {
      console.error('Erro durante logout:', error);
      // Forçar redirecionamento mesmo se houver erro
      window.location.href = "/login?logout=true&session_terminated=true";
    }
  };

  const handleConfirmLogout = () => {
    console.log('🔒 Usuário confirmou logout manual');
    handleLogout();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal={true}>
      <DialogContent className="sm:max-w-md z-[9999999] [&>div]:z-[9999999]" style={{zIndex: 9999999}}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Sessão Encerrada
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {message || "Sua sessão foi encerrada por outro usuário"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          <div className="flex items-center gap-2 text-lg font-medium text-gray-700">
            <Timer className="h-5 w-5 text-amber-500" />
            Redirecionando em {countdown} segundos
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-amber-500 h-2 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${((10 - countdown) / 10) * 100}%` }}
            />
          </div>

          {isLoggingOut && (
            <p className="text-sm text-blue-600 animate-pulse">
              Desconectando...
            </p>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            onClick={handleConfirmLogout}
            disabled={isLoggingOut}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isLoggingOut ? 'Saindo...' : 'Sair Agora'}
          </Button>
        </DialogFooter>

        <div className="text-xs text-gray-500 text-center mt-2">
          Por segurança, você será redirecionado automaticamente para a página de login.
        </div>
      </DialogContent>
    </Dialog>
  );
}