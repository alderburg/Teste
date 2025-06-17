import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";

// Definindo o tipo para o usuário
interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  avatar?: string;
}

// Definindo a interface para o contexto de autenticação
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  logoutMutation: {
    mutate: () => void;
    isPending: boolean;
  };
  isLoading: boolean;
}

// Criando o contexto de autenticação
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook personalizado para acessar o contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}

// Props para o provedor de autenticação
interface AuthProviderProps {
  children: ReactNode;
}

// Provedor de autenticação
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [location, navigate] = useLocation();

  // Efeito para checar o estado de autenticação ao carregar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // HOTFIX: Remover verificação de landing page temporariamente
        // para garantir que o login seja exigido em todas as rotas!
        // Código antigo que permitia acesso sem autenticação:
        //const isLandingPage = window.location.pathname === '/' || window.location.pathname === '';
        //if (isLandingPage) {
        //  setUser(null);
        //  setIsLoading(false);
        //  return;
        //}

        // NUNCA PULAR a verificação de autenticação (segurança crítica)

        // IMPORTANTE: Verificamos SEMPRE com a API para garantir que o usuário está realmente logado
        // no servidor. Isso corrige o problema de redirecionamento após logout, pois
        // não confiamos em dados locais que podem estar desatualizados.

        // Limpamos dados locais antigos para garantir
        localStorage.removeItem('userData');
        localStorage.removeItem('user');
        localStorage.removeItem('token');

        // Verificar se o usuário está autenticado chamando a API
        const response = await fetch('/api/user', {
          credentials: 'include', // Importante para enviar cookies de sessão
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });

        if (response.ok) {
          // API retornou OK, usuário autenticado
          const userData = await response.json();
          // Armazenar dados do usuário no localStorage para uso futuro
          localStorage.setItem('userData', JSON.stringify(userData));
          setUser(userData);
        } else {
          // Se a resposta não for ok, o usuário não está autenticado
          // API retornou não-OK, usuário não autenticado
          // Garantir que todos os dados locais sejam limpos
          localStorage.removeItem('userData');
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [location]);

  // Função de login
  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha na autenticação');
      }

      const userData = await response.json();
      setUser(userData);

      // Redirecionar para a página inicial após login bem-sucedido
      navigate('/dashboard');
      return;
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // SOLUÇÃO MELHORADA: Ao fazer logout, mostrar splash com mensagem de logout antes de ir para login
  const logout = () => {
    console.log("Executando logout do sistema...");
    
    // Definir flags para indicar que estamos no processo de logout
    // Isso será detectado pelo splash screen
    sessionStorage.setItem('isLogoutRedirect', 'true');
    
    // Ordem crucial: primeiro limpar localStorage (controla autenticação)
    localStorage.clear();

    // Segundo: limpar sessionStorage seletivamente (mantendo os flags de logout)
    // Preservar apenas o flag de logout
    const logoutFlag = sessionStorage.getItem('isLogoutRedirect');
    sessionStorage.clear();
    sessionStorage.setItem('isLogoutRedirect', logoutFlag || 'true');

    // Importante: limpar cookies
    document.cookie.split(";").forEach(cookie => {
      const cookieName = cookie.trim().split("=")[0];
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });

    // Definir variável global para indicar logout em andamento
    // Esta é verificada em vários lugares para evitar redirecionamentos incorretos
    (window as any).LOGOUT_IN_PROGRESS = true;
    
    // Executar o logout no servidor de forma assíncrona
    fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    }).catch(() => {
      console.log("Erro ao fazer logout no servidor, mas continuando com logout local");
    });

    // Redirecionar para a página de login com parâmetro de logout
    console.log("Redirecionando para página de login com parâmetro de logout...");
    setTimeout(() => {
      window.location.href = '/acessar?logout=true';
    }, 100);
  };

  // Implementação da logoutMutation para compatibilidade com o Header
  // Usando a mesma implementação da função principal de logout para garantir consistência
  const logoutMutation = {
    mutate: () => logout(),
    isPending: false
  };

  // Valor do contexto
  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    logoutMutation,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Componente para proteger rotas
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [_, navigate] = useLocation();
  const [verificandoServidor, setVerificandoServidor] = useState(true);
  const [autorizadoPeloServidor, setAutorizadoPeloServidor] = useState(false);

  // Verificar a autenticação diretamente com o servidor para garantir segurança
  useEffect(() => {
    const verificarAutenticacaoNoServidor = async () => {
      try {
        // Verificação direta com o servidor (não confia apenas no localStorage)
        // Usamos a nova rota específica para verificar status 2FA
        const response = await fetch('/api/auth/2fa-session-status', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Accept': 'application/json'
          }
        });

        // Se o status for OK (200), verificamos a resposta
        if (response.ok) {
          const data = await response.json();
          console.log("Status da sessão 2FA:", data);

          // Verificamos se o usuário está autenticado e se precisa de verificação 2FA
          if (data.authenticated) {
            if (data.requiresVerification) {
              // Verificar se já estamos na página de verificação 2FA para evitar o loop
              if (window.location.pathname !== '/verificar-2fa') {
                console.log("🔒 2FA requerido mas não verificado. Redirecionando para verificação 2FA...");
                // Salvar a URL atual para redirecionamento após verificação
                const currentPath = window.location.pathname;
                localStorage.setItem('twoFactorRedirect', currentPath);
                navigate('/verificar-2fa', { replace: true });
                return;
              } else {
                // Já estamos na página de verificação 2FA, não fazer nada
                console.log("🔒 Já estamos na página de verificação 2FA, não redirecionando novamente");
                setAutorizadoPeloServidor(false);
                return;
              }
            } else {
              // Usuário está autenticado e não precisa de verificação 2FA (ou já verificou)
              setAutorizadoPeloServidor(true);
              return;
            }
          }
        }

        // Tentativa alternativa usando a verificação genérica
        if (!response.ok) {
          const fallbackResponse = await fetch('/api/user', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              'Accept': 'application/json'
            }
          });

          // Verificamos se há necessidade de 2FA
          if (fallbackResponse.status === 403) {
            try {
              const responseData = await fallbackResponse.json();
              console.log("Resposta de verificação alternativa:", responseData);

              // Se o servidor indicar que é necessário 2FA
              if (responseData.requiresTwoFactor) {
                // Evitar loop de redirecionamento
                if (window.location.pathname !== '/verificar-2fa') {
                  console.log("🔒 2FA requerido mas não verificado (caminho alternativo). Redirecionando...");
                  // Salvar a URL atual para redirecionamento após verificação
                  const currentPath = window.location.pathname;
                  localStorage.setItem('twoFactorRedirect', currentPath);
                  navigate('/verificar-2fa', { replace: true });
                  return;
                } else {
                  console.log("🔒 Já estamos na página de verificação 2FA (caminho alternativo), não redirecionando");
                  setAutorizadoPeloServidor(false);
                  return;
                }
              }
            } catch (parseError) {
              console.error("Erro ao analisar resposta 403:", parseError);
            }
          }

          // Autorizado apenas se a resposta for OK (200)
          setAutorizadoPeloServidor(fallbackResponse.ok);
        } else {
          // Autorizado baseado na primeira resposta
          setAutorizadoPeloServidor(response.ok);
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação no servidor:", error);
        setAutorizadoPeloServidor(false);
      } finally {
        setVerificandoServidor(false);
      }
    };

    // Só fazemos a verificação do servidor se os dados no cliente indicarem que o usuário está logado
    if (!isLoading) {
      if (isAuthenticated) {
        verificarAutenticacaoNoServidor();
      } else {
        // Se isAuthenticated já é falso, não precisamos verificar o servidor
        setVerificandoServidor(false);
        setAutorizadoPeloServidor(false);
      }
    }
  }, [isLoading, isAuthenticated]);

  // Estado para controlar contagem de redirecionamentos e evitar loops
  const [redirectCount, setRedirectCount] = useState(0);

  // Redirecionamento para login quando necessário
  useEffect(() => {
    // Se já redirecionamos muitas vezes, podemos estar em um loop
    if (redirectCount > 5) {
      console.error("🚨 Loop de redirecionamento detectado no RequireAuth. Interrompendo redirecionamentos.");
      localStorage.removeItem('twoFactorRedirect'); // Limpar para facilitar debug
      return; // Parar redirecionamentos
    }

    // Só redirecionamos quando tivermos certeza da autenticação (cliente e servidor)
    if (!isLoading && !verificandoServidor) {
      // Se não está autenticado no cliente
      if (!isAuthenticated) {
        console.log("Usuário não autenticado, redirecionando para login");

        // Limpar localStorage para garantir que dados antigos não causem problemas
        localStorage.removeItem('userData');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setRedirectCount(prev => prev + 1);

        // Usar o router para manter comportamento SPA
        navigate('/acessar', { replace: true });
      }
      // Se está autenticado mas não está autorizado pelo servidor E não estamos na página de verificação 2FA
      else if (!autorizadoPeloServidor && window.location.pathname !== '/verificar-2fa') {
        console.log("Usuário não autorizado pelo servidor, verificando necessidade de 2FA");

        // Se já estamos salvando o caminho atual no localStorage para 2FA, não fazer nada
        const currentRedirectPath = localStorage.getItem('twoFactorRedirect');
        const currentPath = window.location.pathname;

        // Se o caminho atual não é o mesmo que já foi salvo para redirecionamento, atualizar
        if (currentRedirectPath !== currentPath) {
          localStorage.setItem('twoFactorRedirect', currentPath);
        }

        setRedirectCount(prev => prev + 1);
        navigate('/verificar-2fa', { replace: true });
      }
    }
  }, [isLoading, verificandoServidor, isAuthenticated, autorizadoPeloServidor, navigate, redirectCount]);

  // Mostrar loading enquanto verificamos autenticação
  if (isLoading || verificandoServidor) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  // Só renderizamos o conteúdo se o usuário estiver autenticado no cliente E autorizado pelo servidor
  if (!isAuthenticated || !autorizadoPeloServidor) {
    return null; // O useEffect já cuidará do redirecionamento
  }

  return <>{children}</>;
}

// Componente para redirecionar imediatamente se o usuário estiver autenticado
// VERSÃO ATUALIZADA E REFORÇADA DO REDIRECIONAMENTO
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [didRedirect, setDidRedirect] = useState(false);
  const [isVerifyingWithServer, setIsVerifyingWithServer] = useState(true);
  const [isAuthenticatedOnServer, setIsAuthenticatedOnServer] = useState(false);

  // Detectar parâmetros especiais na URL
  const urlParams = new URLSearchParams(window.location.search);
  const hasLogoutParam = urlParams.get('logout') === 'true' || urlParams.get('logout') === 'error';

  // Verificação para 2FA pendente no localStorage - abordagem simples e direta
  const hasPending2FA = localStorage.getItem('pendingTwoFactor') === 'true';
  const currentPath = window.location.pathname;
  const isAuthPage = currentPath === '/acessar' || currentPath === '/cadastre-se' || currentPath === '/recuperar';

  // Efeito para verificar autenticação diretamente com o servidor
  useEffect(() => {
    // Se temos parâmetro de logout na URL, significa que o logout foi realizado
    // e não devemos verificar com o servidor para evitar problemas de cache
    if (hasLogoutParam) {
      console.log("Detectado parâmetro de logout na URL, ignorando verificação com o servidor");
      setIsVerifyingWithServer(false);
      setIsAuthenticatedOnServer(false);
      return;
    }

    // Verificar autenticação diretamente com o servidor
    const verifyWithServer = async () => {
      try {
        console.log("Verificando autenticação diretamente com o servidor...");
        const response = await fetch('/api/user', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });

        // Somente considerar autenticado se o servidor retornar OK
        const isAuth = response.ok;
        console.log("Resposta do servidor:", isAuth ? "Autenticado" : "Não autenticado");
        setIsAuthenticatedOnServer(isAuth);
      } catch (error) {
        console.error("Erro ao verificar autenticação com o servidor:", error);
        setIsAuthenticatedOnServer(false);
      } finally {
        setIsVerifyingWithServer(false);
      }
    };

    // Somente verificar com o servidor se estamos em uma página de autenticação
    if (isAuthPage) {
      verifyWithServer();
    } else {
      setIsVerifyingWithServer(false);
    }
  }, [isAuthPage, hasLogoutParam]);

  // Efeito para redirecionamento após verificação com o servidor
  useEffect(() => {
    // Só prosseguir se a verificação com o servidor estiver concluída
    if (isVerifyingWithServer) return;

    // Se estamos em uma página de autenticação, o usuário está autenticado no servidor e não tem 2FA pendente
    if (isAuthPage && isAuthenticatedOnServer && !hasPending2FA && !didRedirect && !hasLogoutParam) {
      console.log("Redirecionamento após verificação com servidor: usuário autenticado acessando página de autenticação");
      setDidRedirect(true);
      // Redirecionamento direto para o dashboard usando window.location para evitar problemas com rotas SPA
      window.location.href = "/dashboard";
    }
  }, [isAuthPage, isAuthenticatedOnServer, hasPending2FA, didRedirect, isVerifyingWithServer, hasLogoutParam]);

  // Se estamos na página de login com 2FA pendente, mantemos na página
  if (isAuthPage && hasPending2FA) {
    console.log("2FA pendente detectado na página de autenticação - mantendo o usuário aqui");
    return <>{children}</>;
  }

  // Se houver um parâmetro de logout na URL, significa que acabamos de fazer logout
  // Neste caso, sempre mostramos a página de login sem verificar autenticação
  if (hasLogoutParam) {
    console.log("Logout recente detectado, exibindo página de autenticação");
    return <>{children}</>;
  }

  // Durante carregamento ou verificação com servidor, mostramos um loading mínimo
  if (isLoading || isVerifyingWithServer) {
    console.log("Carregando status de autenticação...");
    return null;
  }

  // Se estiver autenticado no servidor e não haver redirecionamento em andamento
  if (isAuthPage && isAuthenticatedOnServer && !hasPending2FA && !didRedirect) {
    console.log("Usuário autenticado em página de autenticação - redirecionando");
    return <div className="fixed inset-0 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  // Se não estiver autenticado ou estiver em outra página, mostrar o conteúdo normalmente
  console.log("Usuário não autenticado ou não em página de auth, exibindo conteúdo normalmente");
  return <>{children}</>;
}