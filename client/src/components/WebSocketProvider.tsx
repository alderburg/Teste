
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
  console.log('🎭 =============== WEBSOCKET PROVIDER RENDER ===============');
  console.log('🎭 Timestamp:', new Date().toISOString());
  
  const { connected, sendMessage } = useWebSocket();
  const { user } = useAuth();
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);
  const [sessionTerminated, setSessionTerminated] = useState(false);
  const [terminationMessage, setTerminationMessage] = useState<string>("");
  
  console.log('🎭 Estado atual do WebSocketProvider:', {
    connected,
    userExists: !!user,
    userId: user?.id,
    sendMessageExists: !!sendMessage,
    sessionTerminated
  });

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

  // Enviar informações de autenticação quando o usuário estiver logado
  useEffect(() => {
    console.log('🔄 =============== USEEFFECT AUTH TRIGGER ===============');
    console.log('🔄 Timestamp:', new Date().toISOString());
    console.log('🔄 connected:', connected);
    console.log('🔄 user exists:', !!user);
    console.log('🔄 user object:', user);
    console.log('🔄 user id:', user?.id);
    console.log('🔄 sendMessage function:', typeof sendMessage);
    console.log('🔄 Dependencies - connected:', connected, 'user:', !!user, 'sendMessage:', !!sendMessage);
    
    // SEMPRE executar este log, mesmo se as condições não forem atendidas
    if (!connected) {
      console.log('❌ WebSocket NÃO CONECTADO - aguardando conexão...');
      return;
    }
    
    if (!user) {
      console.log('❌ USUÁRIO NÃO ENCONTRADO - aguardando autenticação...');
      return;
    }
    
    if (!sendMessage) {
      console.log('❌ SENDMESSAGE NÃO DISPONÍVEL - erro crítico!');
      return;
    }
    
    console.log('✅ TODAS AS CONDIÇÕES ATENDIDAS - prosseguindo com autenticação WebSocket');
    
    if (connected && user) {
      // Extrair sessionToken dos cookies - Priorizar cookies de sessão do Express
      const getSessionTokenFromCookie = () => {
        console.log('🔍 Procurando token de sessão para autenticação WebSocket...');
        
        // MÉTODO PRIORITÁRIO: Buscar cookies de sessão do Express/Passport (onde o sistema HTTP está autenticado)
        const cookies = document.cookie.split(';');
        console.log('🍪 Analisando cookies do navegador...');
        
        let sessionToken = null;
        
        // 1. PRIORIDADE MÁXIMA: Cookies de sessão do Express
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          
          if (name === 'mpc.sid' || name === 'connect.sid') {
            const decodedValue = decodeURIComponent(value);
            console.log(`🔐 Cookie de sessão Express encontrado (${name}): ${decodedValue.substring(0, 20)}...`);
            
            // Este é o token que o Passport.js está usando - usar EXATAMENTE como está
            sessionToken = decodedValue;
            console.log(`✅ Usando token de sessão do Express: ${sessionToken.substring(0, 8)}...`);
            break;
          }
        }
        
        // 2. FALLBACK: Outros tokens personalizados apenas se não encontrou o principal
        if (!sessionToken) {
          console.log('⚠️ Cookie de sessão do Express não encontrado, tentando fontes alternativas...');
          
          // Verificar localStorage
          const localStorageTokens = [
            localStorage.getItem('sessionToken'),
            localStorage.getItem('authToken'),
            localStorage.getItem('userToken')
          ].filter(Boolean);
          
          if (localStorageTokens.length > 0) {
            sessionToken = localStorageTokens[0];
            console.log(`📱 Token encontrado no localStorage: ${sessionToken?.substring(0, 8)}...`);
          } else {
            // Verificar outros cookies personalizados
            for (let cookie of cookies) {
              const [name, value] = cookie.trim().split('=');
              
              if (name === 'sessionToken' || name === 'authToken' || name === 'userToken') {
                sessionToken = decodeURIComponent(value);
                console.log(`🔑 Token personalizado encontrado no cookie ${name}: ${sessionToken?.substring(0, 8)}...`);
                break;
              }
            }
          }
        }
        
        if (!sessionToken) {
          console.log('❌ Nenhum token de sessão encontrado em nenhuma fonte');
          console.log('📝 Cookies disponíveis:', document.cookie);
        }
        
        return sessionToken;
      };

      const sessionToken = getSessionTokenFromCookie();

      if (sessionToken) {
        console.log(`🔐 =============== ENVIANDO AUTENTICAÇÃO WEBSOCKET ===============`);
        console.log(`🔐 Usuário ID: ${user.id}`);
        console.log(`🔑 Session Token COMPLETO: "${sessionToken}"`);
        console.log(`🔑 Session Token LENGTH: ${sessionToken.length}`);
        console.log(`🔑 Session Token primeiro 20 chars: "${sessionToken.substring(0, 20)}"`);
        console.log(`🔑 Token é assinado (s:): ${sessionToken.startsWith('s:')}`);
        if (sessionToken.startsWith('s:')) {
          const sessionId = sessionToken.substring(2).split('.')[0];
          console.log(`🔑 SessionId extraído: "${sessionId}"`);
        }
        console.log(`📝 Todos os cookies completos:`, document.cookie);
        console.log(`🕐 Timestamp: ${new Date().toISOString()}`);

        const authMessage = {
          type: 'auth',
          userId: user.id,
          sessionToken: sessionToken
        };

        console.log(`📤 =============== ENVIANDO AUTENTICAÇÃO ===============`);
        console.log(`📤 Mensagem de autenticação:`, JSON.stringify(authMessage, null, 2));
        console.log(`📤 Tamanho da mensagem: ${JSON.stringify(authMessage).length} bytes`);
        console.log(`📤 WebSocket conectado: ${connected}`);
        console.log(`📤 Função sendMessage disponível: ${typeof sendMessage}`);

        const enviouComSucesso = sendMessage(authMessage);
        console.log(`📤 Resultado do envio: ${enviouComSucesso}`);
        
        if (!enviouComSucesso) {
          console.error(`❌ FALHA AO ENVIAR MENSAGEM DE AUTENTICAÇÃO`);
          
          // Tentar novamente após um pequeno delay
          setTimeout(() => {
            console.log('🔄 Tentando reenviar mensagem de autenticação...');
            const novoEnvio = sendMessage(authMessage);
            console.log(`🔄 Resultado do reenvio: ${novoEnvio}`);
          }, 1000);
        } else {
          console.log(`✅ Mensagem de autenticação enviada com sucesso`);
        }
      } else {
        console.warn('⚠️ =============== SESSION TOKEN NÃO ENCONTRADO ===============');
        console.log('📝 Cookies disponíveis completos:', document.cookie);
        
        // Tentar buscar outros tokens possíveis
        const allCookies = document.cookie.split(';');
        console.log('🔍 Analisando TODOS os cookies em detalhes:');
        allCookies.forEach((cookie, index) => {
          const [name, value] = cookie.trim().split('=');
          console.log(`   ${index + 1}. "${name}": "${value || 'vazio'}"`);
          if (name.includes('sid') || name.includes('session') || name.includes('connect')) {
            console.log(`      ⭐ Cookie de sessão potencial: "${name}" = "${value}"`);
          }
        });
      }
    } else {
      console.log('❌ Condições não atendidas para autenticação WebSocket:', {
        connected,
        userExists: !!user,
        sendMessageExists: !!sendMessage
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
