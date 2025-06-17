import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Timer } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface SessionTerminatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export default function SessionTerminatedModal({ isOpen, onClose, message = "Sua sessão foi encerrada por outro usuário" }: SessionTerminatedModalProps) {
  const [countdown, setCountdown] = useState(10);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const { logout } = useAuth();

  // Iniciar contagem regressiva quando o modal abrir
  useEffect(() => {
    if (isOpen && !isCountingDown) {
      setIsCountingDown(true);
      setCountdown(10);
    }
  }, [isOpen]);

  // Gerenciar contagem regressiva
  useEffect(() => {
    if (isCountingDown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (isCountingDown && countdown === 0) {
      // Fazer logout automático quando contagem chegar a zero
      handleLogout();
    }
  }, [isCountingDown, countdown]);

  const handleLogout = async () => {
    console.log('🔒 Executando logout após encerramento de sessão');
    setIsCountingDown(false);
    onClose();
    
    try {
      // Limpar dados locais antes do logout
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      
      // Executar logout
      await logout();
      
      // Redirecionar para login
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro durante logout:', error);
      // Forçar redirecionamento mesmo se houver erro
      window.location.href = '/login';
    }
  };

  const handleManualLogout = () => {
    console.log('🔒 Usuário confirmou logout manual');
    handleLogout();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Sessão Encerrada
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {message}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-6">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-700">
            <Timer className="h-5 w-5" />
            Desconectando em {countdown} segundos
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${((10 - countdown) / 10) * 100}%` }}
            />
          </div>
          
          <div className="flex gap-3 w-full">
            <Button
              onClick={handleManualLogout}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              Sair Agora
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 text-center">
          Você será redirecionado automaticamente para a página de login.
        </div>
      </DialogContent>
    </Dialog>
  );
}