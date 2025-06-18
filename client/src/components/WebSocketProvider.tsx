
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';
import { SessionTerminatedModal } from '@/components/auth/SessionTerminatedModal';
import { useAuth } from '@/hooks/use-auth';
import { useSessionGuard } from '@/hooks/use-session-guard';
import { queryClient } from '@/lib/queryClient';

// Criar contexto para WebSocket
interface WebSocketContextProps {
  connected: boolean;
  sendMessage: (message: any) => boolean;
  lastUpdated?: Date;
}

const WebSocketContext = createContext<WebSocketContextProps>({
  connected: false,
  sendMessage: () => false,
  lastUpdated: undefined
});

// Hook para usar o contexto
export const useWebSocketContext = () => useContext(WebSocketContext);

// Componente Provider
interface WebSocketProviderProps {
  children: ReactNode;
}

export default function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { connected, sendMessage } = useWebSocket();
  const { user } = useAuth();
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);
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

    console.log('🔍 Verificando tokens:', {
      terminatedToken: terminatedToken?.substring(0, 8) + '...',
      possibleTokens: possibleTokens.map(t => t?.substring(0, 8) + '...')
    });

    return possibleTokens.includes(terminatedToken);
  };

  // Função para ativar proteção total
  const activateSessionProtection = (message: string) => {
    console.log('🔒 ATIVANDO PROTEÇÃO TOTAL DA SESSÃO');
    
    // Verificar se já está protegido para evitar duplicação
    if (sessionTerminated) {
      console.log('🔒 Proteção já ativada - ignorando nova ativação');
      return;
    }
    
    // PRIMEIRO: Limpar todos os dados imediatamente
    try {
      queryClient.invalidateQueries();
      queryClient.clear();
    } catch (error) {
      console.error('Erro ao limpar queryClient:', error);
    }
    
    // SEGUNDO: Ativar estado de sessão encerrada IMEDIATAMENTE
    setSessionTerminated(true);
    
    // TERCEIRO: Definir mensagem
    setTerminationMessage(message);
    
    // QUARTO: Marcar globalmente que a sessão foi encerrada
    localStorage.setItem('sessionTerminated', 'true');
    
    // QUINTO: Disparar evento global para outras abas/instâncias
    window.dispatchEvent(new CustomEvent('session-protection-activated', {
      detail: { message, timestamp: Date.now() }
    }));
    
    console.log('🔒 PROTEÇÃO ATIVADA - Interface bloqueada');
  };

  // Verificar periodicamente o status da sessão
  useEffect(() => {
    if (!user) return;

    const checkSessionStatus = async () => {
      // Verificar se já está protegido
      if (sessionTerminated) return;
      
      try {
        const response = await fetch('/api/conta/check-session', {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          console.log('🔒 Sessão inválida detectada via check periódico');
          activateSessionProtection('Sua sessão foi encerrada ou expirou');
        }
      } catch (error) {
        console.log('🔒 Erro ao verificar sessão - assumindo sessão encerrada');
        activateSessionProtection('Erro de conectividade - sessão encerrada');
      }
    };

    // Verificar imediatamente ao montar
    checkSessionStatus();

    // Verificar a cada 15 segundos (mais frequente)
    const interval = setInterval(checkSessionStatus, 15000);

    return () => clearInterval(interval);
  }, [user, sessionTerminated]);

  // Verificar status da sessão quando WebSocket desconectar
  useEffect(() => {
    if (!connected && user) {
      console.log('🔒 WebSocket desconectado - verificando status da sessão');
      
      // Aguardar um pouco para reconexão, se não reconectar, verificar sessão
      setTimeout(async () => {
        if (!connected) {
          try {
            const response = await fetch('/api/conta/check-session', {
              method: 'GET',
              credentials: 'include'
            });

            if (!response.ok) {
              console.log('🔒 Sessão inválida após desconexão do WebSocket');
              activateSessionProtection('Conexão perdida - sessão encerrada');
            }
          } catch (error) {
            console.log('🔒 Não foi possível verificar sessão após desconexão');
            activateSessionProtection('Conexão perdida - sessão encerrada');
          }
        }
      }, 5000);
    }
  }, [connected, user]);

  // Interceptar todas as respostas HTTP para detectar 401
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (response.status === 401 && user) {
          console.log('🔒 Status 401 detectado - sessão encerrada');
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

  // Atualizar o timestamp sempre que recebermos uma mensagem e sincronizar entre abas
  useEffect(() => {
    const handleWebSocketMessage = (event: any) => {
      setLastUpdated(new Date());

      if (event.detail && event.detail.type === 'session_terminated') {
        const terminatedSessionToken = event.detail.sessionToken;

        console.log('🔒 Evento de sessão encerrada recebido:', {
          terminatedToken: terminatedSessionToken?.substring(0, 8) + '...'
        });

        if (checkIfCurrentSession(terminatedSessionToken)) {
          console.log('🔒 ESTA É A SESSÃO ATUAL - ATIVANDO PROTEÇÃO');
          activateSessionProtection(event.detail.message || "Sua sessão foi encerrada por outro usuário");
        }
      }
    };

    const handleSessionTerminated = (event: any) => {
      console.log('🔒 Evento session-terminated recebido:', event.detail);
      
      if (checkIfCurrentSession(event.detail.sessionToken)) {
        console.log('🔒 SESSÃO ATUAL ENCERRADA VIA EVENTO DIRETO');
        activateSessionProtection(event.detail.message || "Sua sessão foi encerrada por outro usuário");
      }
    };

    // Manipular eventos de proteção de sessão de outras abas
    const handleSessionProtectionActivated = (event: any) => {
      console.log('🔒 Proteção de sessão ativada em outra aba/instância');
      if (!sessionTerminated) {
        activateSessionProtection(event.detail.message || "Sua sessão foi encerrada");
      }
    };

    // Verificar localStorage na inicialização para detectar sessões já encerradas
    const checkStorageForTermination = () => {
      const isTerminated = localStorage.getItem('sessionTerminated') === 'true';
      if (isTerminated && !sessionTerminated && user) {
        console.log('🔒 Sessão já marcada como encerrada no localStorage');
        activateSessionProtection("Sua sessão foi encerrada");
      }
    };

    // Listener para mudanças no localStorage (sincronização entre abas)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'sessionTerminated' && event.newValue === 'true' && !sessionTerminated) {
        console.log('🔒 Encerramento de sessão detectado via localStorage');
        activateSessionProtection("Sua sessão foi encerrada por outro usuário");
      }
    };

    // Adicionar todos os listeners
    window.addEventListener('websocket-message-received', handleWebSocketMessage);
    window.addEventListener('session-terminated', handleSessionTerminated);
    window.addEventListener('session-protection-activated', handleSessionProtectionActivated);
    window.addEventListener('storage', handleStorageChange);

    // Verificar estado inicial
    checkStorageForTermination();

    return () => {
      window.removeEventListener('websocket-message-received', handleWebSocketMessage);
      window.removeEventListener('session-terminated', handleSessionTerminated);
      window.removeEventListener('session-protection-activated', handleSessionProtectionActivated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, sessionTerminated]);

  // Enviar informações de autenticação quando o usuário estiver logado
  useEffect(() => {
    if (connected && user) {
      const sessionToken = localStorage.getItem('sessionToken') || 
                           localStorage.getItem('token') || 
                           document.cookie.split(';').find(c => c.trim().startsWith('sessionToken='))?.split('=')[1] || 
                           '';

      console.log(`🔐 Enviando autenticação WebSocket para usuário ${user.id}`);

      sendMessage({
        type: 'auth',
        userId: user.id,
        sessionToken: sessionToken
      });
    }
  }, [connected, user, sendMessage]);

  return (
    <WebSocketContext.Provider value={{ connected, sendMessage, lastUpdated }}>
      {children}
      <SessionTerminatedModal
        isOpen={sessionTerminated}
        onClose={() => {
          // Não permitir fechar o modal - forçar logout
          console.log('🔒 Tentativa de fechar modal bloqueada - forçando logout');
        }}
        message={terminationMessage}
      />
    </WebSocketContext.Provider>
  );
}
