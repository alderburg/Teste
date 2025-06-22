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
  console.log('🎭 🎭 🎭 =============== WEBSOCKET PROVIDER RENDER =============== 🎭 🎭 🎭');
  console.log('🎭 Timestamp:', new Date().toISOString());

  const { connected, sendMessage } = useWebSocket();
  const { user } = useAuth();
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);
  const [sessionTerminated, setSessionTerminated] = useState(false);
  const [terminationMessage, setTerminationMessage] = useState<string>("");

  // LOGS EXTREMAMENTE DETALHADOS
  console.log('🎭 🎭 🎭 =============== ESTADOS DETALHADOS =============== 🎭 🎭 🎭');
  console.log('🎭 connected:', connected, '(tipo:', typeof connected, ')');
  console.log('🎭 user:', user, '(tipo:', typeof user, ')');
  console.log('🎭 user?.id:', user?.id, '(tipo:', typeof user?.id, ')');
  console.log('🎭 sendMessage tipo:', typeof sendMessage, '| existe:', !!sendMessage);
  console.log('🎭 sendMessage função válida:', typeof sendMessage === 'function');
  console.log('🎭 sendMessage é null?', sendMessage === null);
  console.log('🎭 sessionTerminated:', sessionTerminated);
  console.log('🎭 🎭 🎭 =============== FIM ESTADOS DETALHADOS =============== 🎭 🎭 🎭');

  // Ativar proteção IMEDIATAMENTE quando sessão estiver encerrada
  useSessionGuard(sessionTerminated);

  // Monitor de mudanças das dependências
  useEffect(() => {
    console.log('🔍 =============== MUDANÇA DE DEPENDÊNCIA ===============');
    console.log('🔍 connected mudou para:', connected);
  }, [connected]);

  useEffect(() => {
    console.log('🔍 =============== MUDANÇA DE USUÁRIO ===============');
    console.log('🔍 user mudou para:', user ? `ID: ${user.id}` : 'null');
  }, [user]);

  useEffect(() => {
    console.log('🔍 =============== MUDANÇA DE SENDMESSAGE ===============');
    console.log('🔍 sendMessage mudou para:', typeof sendMessage);
  }, [sendMessage]);

  // Função para verificar se a sessão atual foi encerrada
  const checkIfCurrentSession = (terminatedToken: string): boolean => {
    // Buscar token da sessão atual de forma mais robusta
    const getCurrentSessionToken = () => {
      // 1. Primeiro, tentar obter do cookie de sessão padrão do Express
      const cookies = document.cookie.split(';');
      let sessionToken = null;

      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');

        // Verificar cookies de sessão do Express/Passport
        if (name === 'mpc.sid' || name === 'connect.sid') {
          sessionToken = decodeURIComponent(value);
          console.log(`🔍 Token encontrado no cookie ${name}: ${sessionToken.substring(0, 8)}...`);
          break;
        }
      }

      // 2. Se não encontrou nos cookies principais, tentar outras fontes
      if (!sessionToken) {
        const alternatives = [
          localStorage.getItem('sessionToken'),
          localStorage.getItem('token'),
          document.cookie.split(';').find(c => c.trim().startsWith('sessionToken='))?.split('=')[1],
          document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1]
        ].filter(Boolean);

        if (alternatives.length > 0) {
          sessionToken = alternatives[0];
          console.log(`🔍 Token encontrado em fonte alternativa: ${sessionToken.substring(0, 8)}...`);
        }
      }

      return sessionToken;
    };

    const currentToken = getCurrentSessionToken();

    if (!currentToken || !terminatedToken) {
      return false;
    }

    // Comparar tokens considerando diferentes formatos
    const normalizeToken = (token: string) => {
      // Se o token está assinado (formato s:sessionId.signature), extrair apenas o sessionId
      if (token.startsWith('s:')) {
        return token.substring(2).split('.')[0];
      }
      return token;
    };

    const normalizedCurrent = normalizeToken(currentToken);
    const normalizedTerminated = normalizeToken(terminatedToken);

    console.log('🔍 Comparando tokens normalizados:', {
      current: normalizedCurrent.substring(0, 8) + '...',
      terminated: normalizedTerminated.substring(0, 8) + '...',
      match: normalizedCurrent === normalizedTerminated
    });

    return normalizedCurrent === normalizedTerminated || currentToken === terminatedToken;
  };

  // Função para ativar proteção total
  const activateSessionProtection = (message: string) => {
    console.log('🔒 ATIVANDO PROTEÇÃO TOTAL DA SESSÃO');

    // PRIMEIRO: Limpar todos os dados imediatamente
    queryClient.invalidateQueries();
    queryClient.clear();

    // SEGUNDO: Ativar estado de sessão encerrada IMEDIATAMENTE
    setSessionTerminated(true);

    // TERCEIRO: Definir mensagem
    setTerminationMessage(message);

    console.log('🔒 PROTEÇÃO ATIVADA - Interface bloqueada');
  };

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
          console.log('🔒 Sessão inválida detectada via check periódico');
          activateSessionProtection('Sua sessão foi encerrada ou expirou');
        }
      } catch (error) {
        console.log('🔒 Erro ao verificar sessão - assumindo sessão encerrada');
        activateSessionProtection('Erro de conectividade - sessão encerrada');
      }
    };

    // Verificar a cada 30 segundos
    const interval = setInterval(checkSessionStatus, 30000);

    return () => clearInterval(interval);
  }, [user]);

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

  // Atualizar o timestamp sempre que recebermos uma mensagem
  useEffect(() => {
    const handleWebSocketMessage = (event: any) => {
      setLastUpdated(new Date());

      if (event.detail && event.detail.type === 'session_terminated') {
        const terminatedSessionToken = event.detail.sessionToken;

        console.log('🔒 Evento de sessão encerrada recebido:', {
          terminatedToken: terminatedSessionToken?.substring(0, 8) + '...',
          currentPage: window.location.pathname,
          eventSource: 'websocket-message-received'
        });

        if (checkIfCurrentSession(terminatedSessionToken)) {
          console.log('🔒 ESTA É A SESSÃO ATUAL - ATIVANDO PROTEÇÃO');
          activateSessionProtection(event.detail.message || "Sua sessão foi encerrada por outro usuário");
        }
      }

      // Handler para atualizações de dados (incluindo sessões)
      if (event.detail && event.detail.type === 'data_update') {
        const { resource, action, data } = event.detail;

        console.log('🔔 Atualização de dados via WebSocket:', {
          resource,
          action,
          data,
          currentPage: window.location.pathname
        });

        // Disparar evento personalizado para componentes que precisam atualizar
        const customEvent = new CustomEvent('websocket-data-update', {
          detail: { resource, action, data }
        });
        window.dispatchEvent(customEvent);
      }
    };

    const handleSessionTerminated = (event: any) => {
      console.log('🔒 Evento session-terminated recebido:', {
        detail: event.detail,
        currentPage: window.location.pathname,
        eventSource: 'session-terminated'
      });

      if (checkIfCurrentSession(event.detail.sessionToken)) {
        console.log('🔒 SESSÃO ATUAL ENCERRADA VIA EVENTO DIRETO');
        activateSessionProtection(event.detail.message || "Sua sessão foi encerrada por outro usuário");
      }
    };

    // Adicionar listeners imediatamente
    window.addEventListener('websocket-message-received', handleWebSocketMessage);
    window.addEventListener('session-terminated', handleSessionTerminated);

    // Listener adicional para mensagens WebSocket diretas
    const handleDirectWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'session_terminated') {
          console.log('🔒 Mensagem WebSocket direta de sessão encerrada:', {
            data,
            currentPage: window.location.pathname,
            eventSource: 'direct-websocket'
          });

          if (checkIfCurrentSession(data.sessionToken)) {
            console.log('🔒 SESSÃO ATUAL ENCERRADA VIA WEBSOCKET DIRETO');
            activateSessionProtection(data.message || "Sua sessão foi encerrada por outro usuário");
          }
        }
      } catch (error) {
        // Não é JSON válido, ignorar
      }
    };

    return () => {
      window.removeEventListener('websocket-message-received', handleWebSocketMessage);
      window.removeEventListener('session-terminated', handleSessionTerminated);
    };
  }, [user]);

  // Enviar informações de autenticação quando conectado e usuário logado
  useEffect(() => {
    // Só executar se todas as condições forem atendidas
    if (!connected || !user || !sendMessage) {
      console.log('🔄 Condições para auth não atendidas:', { connected, user: !!user, sendMessage: !!sendMessage });
      return;
    }

    console.log('🔐 Iniciando autenticação WebSocket para usuário:', user.id);

    // Buscar token de sessão do Express/Passport
    const getSessionToken = () => {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'mpc.sid' || name === 'connect.sid') {
          return decodeURIComponent(value);
        }
      }
      return null;
    };

    const sessionToken = getSessionToken();

    if (!sessionToken) {
      console.log('❌ Token de sessão não encontrado');
      return;
    }

    // Enviar autenticação
    const authMessage = {
      type: 'auth',
      userId: user.id,
      sessionToken: sessionToken
    };

    console.log(`🔐 Enviando autenticação WebSocket para usuário ${user.id}`);
    const sucesso = sendMessage(authMessage);

    if (sucesso) {
      console.log('✅ Mensagem de autenticação enviada');
    } else {
      console.log('❌ Falha ao enviar autenticação');
    }
  }, [connected, user, sendMessage]);

  // Efeito específico para detectar mudanças do usuário - FORÇAR autenticação
  useEffect(() => {
    console.log('👤 =============== USUÁRIO MUDOU - FORÇAR AUTH ===============');
    console.log('👤 Novo usuário:', user);
    console.log('👤 Connected:', connected);
    console.log('👤 SendMessage:', !!sendMessage);

    if (user && connected && sendMessage) {
      // Delay pequeno para garantir que tudo está estabilizado
      setTimeout(() => {
        console.log('👤 FORÇANDO autenticação devido à mudança do usuário...');
        // Repetir a lógica de autenticação aqui também
        const sessionToken = document.cookie
          .split(';')
          .find(cookie => {
            const [name] = cookie.trim().split('=');
            return name === 'mpc.sid' || name === 'connect.sid';
          })
          ?.split('=')[1];

        if (sessionToken) {
          const decodedToken = decodeURIComponent(sessionToken);
          const authMessage = {
            type: 'auth',
            userId: user.id,
            sessionToken: decodedToken
          };

          console.log('👤 Enviando AUTH forçado:', JSON.stringify(authMessage, null, 2));
          const resultado = sendMessage(authMessage);
          console.log('👤 Resultado do AUTH forçado:', resultado);
        }
      }, 500);
    }
  }, [user, sendMessage]); // Dependência apenas do user

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