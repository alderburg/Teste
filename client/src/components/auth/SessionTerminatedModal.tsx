import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useSessionGuard } from '@/hooks/use-session-guard';
import { markSessionAsTerminated } from '@/lib/api';
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
    <div 
      className={`fixed inset-0 ${isOpen ? 'block' : 'hidden'}`}
      style={{ zIndex: 10000000 }}
    >
      {/* Overlay personalizado */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        style={{ zIndex: 10000001 }}
      />
      
      {/* Modal Content */}
      <div 
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-lg shadow-xl p-6"
        style={{ zIndex: 10000002 }}
      >
        <div className="flex items-center gap-2 text-amber-600 mb-4">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Sessão Encerrada</h2>
        </div>
        
        <p className="text-gray-600 mb-6">
          {message || "Sua sessão foi encerrada por outro usuário"}
        </p>

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

        <div className="flex gap-2 mt-6">
          <Button
            onClick={handleConfirmLogout}
            disabled={isLoggingOut}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isLoggingOut ? 'Saindo...' : 'Sair Agora'}
          </Button>
        </div>

        <div className="text-xs text-gray-500 text-center mt-4">
          Por segurança, você será redirecionado automaticamente para a página de login.
        </div>
      </div>
    </div>
  );
}