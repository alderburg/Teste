import React, { Suspense, lazy } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { SearchProvider } from "@/components/Header";
import { NotificationProvider } from "@/context/NotificationContext";
import { OnboardingProvider } from "@/context/OnboardingContext";
import { AuthProvider } from "@/hooks/use-auth";
import WebSocketProvider from "@/components/WebSocketProvider";
import { useState, useEffect } from "react";
import { isMobileDevice } from "./lib/utils";
import { initVisibilityProtection } from "./lib/ensureVisibility"; // Importar nossa solução para problemas de visibilidade

// Componente de carregamento para transições mais suaves
// Este componente pode ser personalizado conforme necessário
const LoadingFallback = () => null;

// Layout persistente - carregado imediatamente pois é essencial
import PersistentLayout from "@/components/PersistentLayout";

// Landing Page - mantendo lazy loading apenas na landing page
const LandingPageWrapper = lazy(() => {
  return import("./pages/landing/LandingPage");
});

// Páginas de autenticação - carregadas imediatamente para evitar tela branca
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/login/signup";
import MobileSignupPage from "@/pages/login/MobileSignup";
import ForgotPasswordPage from "@/pages/login/forgot-password";
import VerificarTwoFactorPage from "@/pages/verificar-2fa";
import DefinirSenhaUsuarioAdicional from "@/pages/definir-senha-usuario-adicional";

// Páginas principais - carregamento direto para evitar tela em branco durante navegação
import DashboardPage from "@/pages/dashboard";
import PrecificacaoNovosPage from "@/pages/precificacao/novos";
import PrecificacaoNovosUnitarioPage from "@/pages/precificacao/novos/unitario";
import PrecificacaoNovosImportacaoPage from "@/pages/precificacao/novos/importacao";
import PrecificacaoServicosPage from "@/pages/precificacao/servicos";
import PrecificacaoServicosUnitarioPage from "@/pages/precificacao/servicos/unitario";
import PrecificacaoServicosImportacaoPage from "@/pages/precificacao/servicos/importacao";
import PrecificacaoUsadosPage from "@/pages/precificacao/usados";
import PrecificacaoUsadosUnitarioPage from "@/pages/precificacao/usados/unitario";
import PrecificacaoUsadosImportacaoPage from "@/pages/precificacao/usados/importacao";
import PrecificacaoAlugueisPage from "@/pages/precificacao/alugueis";
import PrecificacaoAlugueisUnitarioPage from "@/pages/precificacao/alugueis/unitario";
import PrecificacaoAlugueisImportacaoPage from "@/pages/precificacao/alugueis/importacao";
import CadastroProdutosPage from "@/pages/cadastros/produtos";
import CadastroFornecedoresPage from "@/pages/cadastros/fornecedores";
import CadastroCategoriasPage from "@/pages/cadastros/categorias";
import CadastroItensAluguelPage from "@/pages/cadastros/alugueis";
import CadastroServicosPage from "@/pages/cadastros/servicos";
import CadastroCustosPage from "@/pages/cadastros/custos";
import CadastroDespesasPage from "@/pages/cadastros/despesas";
import CadastroTaxasPage from "@/pages/cadastros/taxas";
import CadastroTributacoesPage from "@/pages/cadastros/tributacoes";
import CadastroRateiosPage from "@/pages/cadastros/rateios";
import ClientesPage from "@/pages/cadastros/clientes";
import CadastroPromocoesPage from "@/pages/cadastros/promocoes";
import MinhaContaPage from "@/pages/conta";
import MobileContaPage from "@/pages/conta/mobile-conta";
import ProfileSimples from "@/pages/conta/ProfileSimples";
import NotificacoesPage from "@/pages/notificacoes";
import PlanosEUpgradesPage from "@/pages/planos";

// Financeiro e Pagamentos
import CheckoutPage from "@/pages/financeiro/checkout";
import PagamentoSucessoPage from "@/pages/financeiro/pagamento-sucesso";
import HistoricoFinanceiroPage from "@/pages/historico-financeiro";

import TreinamentosPage from "@/pages/treinamentos";
import SuportePage from "@/pages/suporte";
import NotFound from "@/pages/not-found";

// Componentes para proteger rotas baseado na autenticação
import { RequireAuth, RedirectIfAuthenticated } from '@/hooks/use-auth';

function AuthenticatedRoutes() {
  return (
    <RequireAuth>
      <PersistentLayout>
        <Switch>
          <Route path="/dashboard" component={DashboardPage} />

          {/* Precificação Routes */}
          <Route path="/precificacao/novos" component={PrecificacaoNovosPage} />
          <Route path="/precificacao/novos/unitario" component={PrecificacaoNovosUnitarioPage} />
          <Route path="/precificacao/novos/importacao" component={PrecificacaoNovosImportacaoPage} />
          <Route path="/precificacao/servicos" component={PrecificacaoServicosPage} />
          <Route path="/precificacao/servicos/unitario" component={PrecificacaoServicosUnitarioPage} />
          <Route path="/precificacao/servicos/importacao" component={PrecificacaoServicosImportacaoPage} />
          <Route path="/precificacao/usados" component={PrecificacaoUsadosPage} />
          <Route path="/precificacao/usados/unitario" component={PrecificacaoUsadosUnitarioPage} />
          <Route path="/precificacao/usados/importacao" component={PrecificacaoUsadosImportacaoPage} />
          <Route path="/precificacao/alugueis" component={PrecificacaoAlugueisPage} />
          <Route path="/precificacao/alugueis/unitario" component={PrecificacaoAlugueisUnitarioPage} />
          <Route path="/precificacao/alugueis/importacao" component={PrecificacaoAlugueisImportacaoPage} />

          {/* Cadastros Routes */}
          <Route path="/cadastros/produtos" component={CadastroProdutosPage} />
          <Route path="/cadastros/fornecedores" component={CadastroFornecedoresPage} />
          <Route path="/cadastros/categorias" component={CadastroCategoriasPage} />
          <Route path="/cadastros/alugueis" component={CadastroItensAluguelPage} />
          <Route path="/cadastros/servicos" component={CadastroServicosPage} />
          <Route path="/cadastros/custos" component={CadastroCustosPage} />
          <Route path="/cadastros/clientes" component={ClientesPage} />
          <Route path="/cadastros/despesas" component={CadastroDespesasPage} />
          <Route path="/cadastros/taxas" component={CadastroTaxasPage} />
          <Route path="/cadastros/tributacoes" component={CadastroTributacoesPage} />
          <Route path="/cadastros/rateios" component={CadastroRateiosPage} />
          <Route path="/cadastros/promocoes" component={CadastroPromocoesPage} />

          {/* Notificações */}
          <Route path="/notificacoes" component={NotificacoesPage} />

          {/* Planos e Upgrades - Apenas uma página agora */}
          <Route path="/planos-e-upgrades" component={PlanosEUpgradesPage} />

          {/* Financeiro e Pagamentos */}
          <Route path="/financeiro/checkout" component={CheckoutPage} />
          <Route path="/financeiro/pagamento-sucesso" component={PagamentoSucessoPage} />
          <Route path="/historico-financeiro" component={HistoricoFinanceiroPage} />


          {/* Minha Conta - Versão unificada com detecção de dispositivo */}
          <Route path="/minha-conta">
            {/* O componente MinhaContaPage decide internamente qual versão exibir */}
            <MinhaContaPage />
          </Route>

          {/* Versão simplificada para testes */}
          <Route path="/perfil-simples" component={ProfileSimples} />

          {/* Treinamentos */}
          <Route path="/treinamentos" component={TreinamentosPage} />

          {/* Suporte */}
          <Route path="/suporte" component={SuportePage} />

          <Route component={NotFound} />
        </Switch>
      </PersistentLayout>
    </RequireAuth>
  );
}

// Componente para gerenciar autenticação e splash screen
function Router() {
  // Sistema de carregamento progressivo
  const [appLoaded, setAppLoaded] = useState(false);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [location, navigate] = useLocation();

  // Efeito simplificado - apenas configuração básica
  useEffect(() => {
    console.log("App: Inicializando componente principal");

    // Garantir visibilidade do root
    const root = document.getElementById('root');
    if (root) {
      root.style.visibility = 'visible';
      root.style.opacity = '1';
      root.style.display = 'block';
    }

    // Capturar a rota inicial
    const currentPath = window.location.pathname;
    console.log("Router: Rota atual:", currentPath);

    // Redirecionamento simplificado
    console.log("App: Rota atual:", currentPath);

    // Se não estamos em uma rota de autenticação e não é o root, salvamos para redirecionamento após login
    if (!['/acessar', '/cadastre-se', '/recuperar', '/esqueci-senha', '/'].includes(currentPath)) {
      localStorage.setItem('lastPath', currentPath);
    }

    // Removido redirecionamento automático da página inicial para o dashboard
    // Isso permite que o usuário acesse a landing page mesmo quando está logado

    // Preservamos a verificação de autenticação apenas para logs
    if (currentPath === '/' || currentPath === '') {
      const userDataString = localStorage.getItem('userData');
      if (userDataString) {
        try {
          const userData = JSON.parse(userDataString);
          if (userData && userData.id) {
            console.log("Usuário logado acessando a landing page");
            // Não redirecionamos mais para o dashboard automaticamente
          }
        } catch (e) {
          console.error("Erro ao verificar dados do usuário:", e);
        }
      }
    }

    setInitialRoute(currentPath);

    // ABORDAGEM OTIMIZADA: Remover o splash screen imediatamente
    // Isso permite mostrar nossa UI de carregamento personalizada mais cedo
    setAppLoaded(true);

    // VERIFICAR novamente se estamos em processo de logout para eliminar qualquer splash screen
    // Esta é uma verificação duplicada para garantir que realmente não mostraremos
    // nenhum splash interno quando estamos no processo de logout
    if (sessionStorage.getItem('isLogoutRedirect') === 'true') {
      console.log("Flag de logout ativo, REMOVENDO todos os splash screens");

      // Remover qualquer splash screen que possa existir
      const splash = document.getElementById('splash-screen');
      if (splash && splash.parentNode) {
        splash.parentNode.removeChild(splash);
      }

      // Remover também via função se disponível
      if (window.hideSplashScreen) {
        window.hideSplashScreen();
      }
    } 
    // Verificar flags de controle antigos para compatibilidade
    else if (sessionStorage.getItem('noSplashAfterLogout') === 'true') {
      console.log("Flag de pós-logout ainda ativo, mantendo splash screen oculto");
      sessionStorage.removeItem('noSplashAfterLogout'); // Garantir remoção

      // Remover qualquer splash
      const splash = document.getElementById('splash-screen');
      if (splash && splash.parentNode) {
        splash.parentNode.removeChild(splash);
      }
    } else {
      // Comportamento normal para outros casos
      // Remover o splash screen imediatamente
      if (window.hideSplashScreen) {
        console.log("Removendo splash screen imediatamente para otimização");
        window.hideSplashScreen();
      } else {
        // Fallback para o caso da função não estar definida
        const splash = document.getElementById('splash-screen');
        if (splash) {
          splash.style.opacity = '0';
          splash.style.display = 'none';
        }
      }
    }
  }, []);

  // Não mostramos mais o SplashScreen do React, apenas a versão HTML

  // HOTFIX: Para rotas de autenticação, não usamos o layout persistente
  // A landing page '/' deve ser considerada rota pública
  // Isso permite acesso à landing page sem autenticação
  const isAuthRoute = ['/acessar', '/cadastre-se', '/recuperar', '/esqueci-senha', '/verificar-2fa'].includes(location);
  const isLandingPage = location === '/';

  // Verificar se é a rota de definir senha (deve ser pública)
  const isDefinePasswordRoute = location === '/definir-senha-usuario-adicional';

  // PROTEÇÃO CRÍTICA: Todas as rotas agora exigem autenticação, exceto rotas exatas de auth, landing page e definir senha
  if (isLandingPage) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <LandingPageWrapper />
      </Suspense>
    );
  } else if (isDefinePasswordRoute) {
    return <DefinirSenhaUsuarioAdicional />;
  } else if (isAuthRoute) {
    return (
      <Switch>
        <Route path="/acessar">
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        </Route>
        <Route path="/cadastre-se">
          <RedirectIfAuthenticated>
            <SignupPage />
          </RedirectIfAuthenticated>
        </Route>
        <Route path="/cadastre-se">
          <RedirectIfAuthenticated>
            <MobileSignupPage />
          </RedirectIfAuthenticated>
        </Route>

        <Route path="/recuperar">
          <RedirectIfAuthenticated>
            <ForgotPasswordPage />
          </RedirectIfAuthenticated>
        </Route>
        <Route path="/esqueci-senha">
          <RedirectIfAuthenticated>
            <ForgotPasswordPage />
          </RedirectIfAuthenticated>
        </Route>
        {/* Rota específica para verificação 2FA */}
        <Route path="/verificar-2fa">
          <VerificarTwoFactorPage />
        </Route>
        {/* Redirecionar para a página de login se a rota não for encontrada */}
        <Route path="*">
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        </Route>
      </Switch>
    );
  }

  // Para rotas autenticadas, não precisamos mais usar Suspense para lazy loading
  // pois todos os componentes já são carregados diretamente
  return <AuthenticatedRoutes />;
}

// Não incluímos aqui nenhuma lógica relacionada ao onboarding
// Todo o código para o onboarding está dentro do contexto OnboardingContext
// e apenas é renderizado quando a rota for /dashboard

// Componente de erro global para capturar erros não tratados
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Erro capturado pela ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 rounded-lg">
          <h2 className="text-xl font-bold text-red-800 mb-4">Algo deu errado</h2>
          <p className="text-red-700 mb-4">Ocorreu um erro na aplicação. Por favor, recarregue a página.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Recarregar página
          </button>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 p-4 bg-gray-100 rounded">
              <summary className="cursor-pointer font-medium">Detalhes do erro (desenvolvimento)</summary>
              <pre className="mt-2 text-xs overflow-auto max-h-96">
                {this.state.error?.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Erro global capturado:', event.error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Erro na aplicação</h1>
          <p className="mb-4">Algo deu errado. Por favor, recarregue a página.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WebSocketProvider>
            <NotificationProvider>
              <OnboardingProvider>
                <SearchProvider>
                  <Router />
                  <Toaster />
                </SearchProvider>
              </OnboardingProvider>
            </NotificationProvider>
          </WebSocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;