import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { SessionTerminatedModal } from '@/components/auth/SessionTerminatedModal';
import { queryClient } from '@/lib/queryClient';
import { useSessionGuard } from '@/hooks/use-session-guard';

interface SessionProtectionWrapperProps {
  children: ReactNode;
}

/**
 * Componente que envolve todas as páginas para garantir proteção uniforme
 * contra desconexões de sessão em tempo real
 */
export function SessionProtectionWrapper({ children }: SessionProtectionWrapperProps) {
  const { user } = useAuth();
  const [sessionTerminated, setSessionTerminated] = useState(false);
  const [terminationMessage, setTerminationMessage] = useState<string>("");

  // Ativar proteção IMEDIATAMENTE quando sessão estiver encerrada
  useSessionGuard(sessionTerminated);

  // Função para verificar se a sessão atual foi encerrada
  const checkIfCurrentSession = (terminatedToken: string): boolean => {
    const possibleTokens = [
      localStorage.getItem('sessionToken'),
      localStorage.getItem('token'),
      document.cookie.split(';').find(c => c.trim().startsWith('sessionToken='))?.split('=')[1],
      document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1]
    ].filter(Boolean);

    console.log('🔍 SessionProtectionWrapper - Verificando tokens:', {
      terminatedToken: terminatedToken?.substring(0, 8) + '...',
      possibleTokens: possibleTokens.map(t => t?.substring(0, 8) + '...'),
      currentPage: window.location.pathname
    });

    return possibleTokens.includes(terminatedToken);
  };

  // Função para ativar proteção total
  const activateSessionProtection = (message: string) => {
    console.log('🔒 SessionProtectionWrapper - ATIVANDO PROTEÇÃO TOTAL DA SESSÃO');
    
    // PRIMEIRO: Limpar todos os dados imediatamente
    queryClient.invalidateQueries();
    queryClient.clear();
    
    // SEGUNDO: Ativar estado de sessão encerrada IMEDIATAMENTE
    setSessionTerminated(true);
    
    // TERCEIRO: Definir mensagem
    setTerminationMessage(message);
    
    console.log('🔒 SessionProtectionWrapper - PROTEÇÃO ATIVADA - Interface bloqueada');
  };

  // Escutar eventos de sessão encerrada
  useEffect(() => {
    if (!user) return;

    const handleWebSocketMessage = (event: any) => {
      if (event.detail && event.detail.type === 'session_terminated') {
        const terminatedSessionToken = event.detail.sessionToken;

        console.log('🔒 SessionProtectionWrapper - Evento de sessão encerrada recebido:', {
          terminatedToken: terminatedSessionToken?.substring(0, 8) + '...',
          currentPage: window.location.pathname,
          eventType: 'websocket-message-received'
        });

        if (checkIfCurrentSession(terminatedSessionToken)) {
          console.log('🔒 SessionProtectionWrapper - ESTA É A SESSÃO ATUAL - ATIVANDO PROTEÇÃO');
          activateSessionProtection(event.detail.message || "Sua sessão foi encerrada por outro usuário");
        }
      }
    };

    const handleSessionTerminated = (event: any) => {
      console.log('🔒 SessionProtectionWrapper - Evento session-terminated recebido:', {
        detail: event.detail,
        currentPage: window.location.pathname,
        eventType: 'session-terminated'
      });
      
      if (event.detail && checkIfCurrentSession(event.detail.sessionToken)) {
        console.log('🔒 SessionProtectionWrapper - SESSÃO ATUAL ENCERRADA VIA EVENTO DIRETO - ATIVANDO PROTEÇÃO');
        activateSessionProtection(event.detail.message || "Sua sessão foi encerrada por outro usuário");
      }
    };

    // Adicionar listeners com capture para garantir que disparem em todas as páginas
    window.addEventListener('websocket-message-received', handleWebSocketMessage, true);
    window.addEventListener('session-terminated', handleSessionTerminated, true);

    console.log('🔍 SessionProtectionWrapper - Event listeners adicionados para página:', window.location.pathname);

    return () => {
      window.removeEventListener('websocket-message-received', handleWebSocketMessage, true);
      window.removeEventListener('session-terminated', handleSessionTerminated, true);
    };
  }, [user]);

  // Verificar periodicamente o status da sessão
  useEffect(() => {
    if (!user) return;

    const checkSessionStatus = async () => {
      try {
        const response = await fetch('/api/conta/check-session', {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          console.log('🔒 SessionProtectionWrapper - Sessão inválida detectada via check periódico');
          activateSessionProtection('Sua sessão foi encerrada ou expirou');
        }
      } catch (error) {
        console.log('🔒 SessionProtectionWrapper - Erro ao verificar sessão - assumindo sessão encerrada');
        activateSessionProtection('Erro de conectividade - sessão encerrada');
      }
    };

    // Verificar a cada 30 segundos
    const interval = setInterval(checkSessionStatus, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // Interceptar todas as respostas HTTP para detectar 401
  useEffect(() => {
    if (!user) return;

    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (response.status === 401 && user) {
          console.log('🔒 SessionProtectionWrapper - Status 401 detectado - sessão encerrada');
          activateSessionProtection('Sessão expirada ou inválida');
        }
        
        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [user]);

  return (
    <>
      {children}
      <SessionTerminatedModal
        isOpen={sessionTerminated}
        onClose={() => {
          // Não permitir fechar o modal - forçar logout
          console.log('🔒 SessionProtectionWrapper - Tentativa de fechar modal bloqueada - forçando logout');
        }}
        message={terminationMessage}
      />
    </>
  );
}