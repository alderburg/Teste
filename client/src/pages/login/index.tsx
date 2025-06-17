import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { ChevronRight, Eye, EyeOff, Loader2, Check, ShieldCheck, BarChart2, ArrowUp, TrendingUp, Clock, KeySquare } from "lucide-react";
import LogoDesktop from "@/assets/images/logo/webp/Negativo.webp";
import LogoMobile from "@/assets/images/logo/webp/negativoo.webp"; // Agora usando a versão rosa da logo para versão mobile
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
// Importando o novo verificador de redirecionamento
import RedirectChecker from "./redirect-checker";
// Importando o componente de login para mobile
import MobileLogin from "./MobileLogin";
import TermosPrivacidadeButtons from "@/components/TermosPrivacidadeButtons";

// Schema de validação para login
const loginSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um endereço de e-mail válido" }),
  password: z.string().min(1, { message: "Senha é obrigatória" }),
  rememberMe: z.boolean().optional()
});

// Schema de validação para código 2FA
const twoFactorSchema = z.object({
  code: z.string().min(6, { message: "O código deve ter 6 dígitos" }).max(6)
});

type LoginFormValues = z.infer<typeof loginSchema>;
type TwoFactorFormValues = z.infer<typeof twoFactorSchema>;

// Função para detectar se estamos em um dispositivo móvel
function detectMobile() {
  if (typeof window !== 'undefined') {
    return window.innerWidth < 768;
  }
  return false;
}

export default function LoginPage() {
  const { user, isAuthenticated, login, isLoading: authIsLoading } = useAuth();
  const [, navigate] = useLocation();
  const [isLoginProcessing, setIsLoginProcessing] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const isMobile = detectMobile();

  // Limpar estado de sessão encerrada ao acessar página de login
  useEffect(() => {
    const clearSessionState = async () => {
      try {
        // Attempt to import and call the function
        const apiModule = await import('@/lib/api');
        apiModule.clearSessionTerminated();
        console.log('✅ Estado de sessão encerrada limpo ao acessar login');
      } catch (error) {
        console.log('⚠️ Erro ao limpar estado de sessão:', error);
      }
    };

    clearSessionState();
  }, []);

  // Atualizar estado quando o tamanho da janela muda
  useEffect(() => {
    const handleResize = () => setIsMobile(detectMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Defina o estado inicial de 2FA checando o localStorage diretamente
  const [showTwoFactorForm, setShowTwoFactorForm] = useState(() => {
    try {
      return localStorage.getItem('pendingTwoFactor') === 'true';
    } catch (e) {
      return false;
    }
  });

  const [awaiting2FACode, setAwaiting2FACode] = useState(() => {
    try {
      return localStorage.getItem('pendingTwoFactor') === 'true';
    } catch (e) {
      return false;
    }
  });

  const [verifying2FA, setVerifying2FA] = useState(false);

  // Componente de verificação e redirecionamento foi movido para redirect-checker.tsx
  // Este componente é importado e usado no topo do componente atual
  const [tempUserData, setTempUserData] = useState<any>(null);
  const [verificado, setVerificado] = useState(false);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Implementação da função forceUpdate para forçar renderização
  const [, updateState] = useState<{}>();
  const forceUpdate = useCallback(() => updateState({}), []);

  // Verificar parâmetros da URL para identificar se estamos vindo de um logout
  const urlParams = new URLSearchParams(window.location.search);
  const fromLogout = urlParams.get('fromdirectlogout') === 'true' || 
                   urlParams.get('logout') === 'true' || 
                   urlParams.get('noSplash') === 'true' ||
                   sessionStorage.getItem('noSplashAfterLogout') === 'true' ||
                   sessionStorage.getItem('forceDirectLogin') === 'true' ||
                   sessionStorage.getItem('bypassSplashScreen') === 'true' ||
                   sessionStorage.getItem('bypassAllSplashScreens') === 'true' || // Nova flag forte
                   (window as any).LOGOUT_IN_PROGRESS === true || 
                   (window as any).HARD_LOGOUT_IN_PROGRESS === true; 

  // Se estamos vindo de um logout, não fazer redirecionamento automático
  // para evitar o ciclo de redirecionamento
  if (isAuthenticated && !verificado && !fromLogout) {
    console.log("Usuário já está logado, redirecionando para dashboard...");
    window.location.href = "/dashboard";
    return null; // Não renderiza nada enquanto redireciona
  }

  // Se estamos vindo de um logout, limpar as flags de controle após a renderização inicial
  useEffect(() => {
    if (fromLogout) {
      console.log("Detectado acesso pós-logout à página de login - removendo flags para prevenir loops");

      // Limpar TODAS as flags relacionadas a splash screens e logout
      sessionStorage.removeItem('noSplashAfterLogout');
      sessionStorage.removeItem('forceDirectLogin');
      sessionStorage.removeItem('bypassSplashScreen');
      sessionStorage.removeItem('bypassAllSplashScreens');
      sessionStorage.removeItem('isLogoutRedirect');
      sessionStorage.removeItem('forceShowSplash');

      // Também limpar o parâmetro da URL se necessário
      if (urlParams.has('logout') || urlParams.has('noSplash') || urlParams.has('fromdirectlogout')) {
        // Usar location só para construir o URL sem parâmetros
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }

      // Limpar qualquer variável global relacionada
      if ((window as any).LOGOUT_IN_PROGRESS) {
        (window as any).LOGOUT_IN_PROGRESS = false;
      }

      // Limpar qualquer dado antigo de localStorage que poderia causar problemas
      localStorage.removeItem('userData');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  }, [fromLogout]);

  // Efeito para marcar como verificado quando sabemos que o usuário não está autenticado
  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      setVerificado(true);
    }
  }, [isAuthenticated, authIsLoading]);

  /**
   * Versão EXTREMAMENTE SIMPLIFICADA E DIRETA para mostrar o formulário 2FA
   */
  useEffect(() => {
    // Verificar no momento da montagem se devemos mostrar o formulário 2FA
    // Esta verificação é feita 100% dentro deste useEffect para evitar problemas
    try {
      const hasPending2FA = localStorage.getItem('pendingTwoFactor') === 'true';

      if (hasPending2FA) {
        console.log('LOGIN PAGE (useEffect): 2FA PENDENTE DETECTADO - Mostrando formulário 2FA');

        // Definir estados para mostrar formulário 2FA
        setShowTwoFactorForm(true);
        setAwaiting2FACode(true);

        // Tentar recuperar dados temporários 
        const tempUserDataStr = localStorage.getItem('tempUserData');
        if (tempUserDataStr) {
          try {
            const userData = JSON.parse(tempUserDataStr);
            setTempUserData(userData);
          } catch (e) {
            console.error('Erro ao processar dados do usuário:', e);
          }
        }
      } else {
        console.log('LOGIN PAGE (useEffect): Nenhum 2FA pendente, mostrando formulário normal');
      }
    } catch (e) {
      console.error('LOGIN PAGE (useEffect): Erro ao verificar 2FA pendente:', e);
    }
  }, []);

  // Ainda mantemos o useEffect para verificações após montagem
  useEffect(() => {
    // Verificar o estado atual de 2FA para diagnóstico
    const hasPending = localStorage.getItem('pendingTwoFactor') === 'true';
    console.log("Login - Estado de 2FA: pendente =", hasPending, 
                ", mostrandoFormulário =", showTwoFactorForm);

    // Garantir que o splash screen seja removido ao carregar a página
    const splashElement = document.getElementById('splash-screen');
    if (splashElement) {
      splashElement.style.display = 'none';
    }
  }, [showTwoFactorForm]);
  const [precificacoes, setPrecificacoes] = useState([
    { name: "Processador i7", value: "R$ 2.349", change: "+5%" },
    { name: "Reparo Notebook", value: "R$ 159", change: "-2%" },
    { name: "Aluguel Projetor", value: "R$ 89/dia", change: "+8%" },
    { name: "Memória RAM", value: "R$ 345", change: "+12%" },
    { name: "Pizza Margherita", value: "R$ 45", change: "+7%" },
    { name: "Hambúrguer Artesanal", value: "R$ 32", change: "+4%" },
    { name: "Açaí 500ml", value: "R$ 18", change: "+2%" },
    { name: "Combo Sushi", value: "R$ 89", change: "+3%" },
    { name: "Refrigerante 2L", value: "R$ 8", change: "+1%" },
    { name: "Pudim", value: "R$ 15", change: "+6%" },
    { name: "X-Tudo", value: "R$ 27", change: "+5%" }
  ]);

  // O redirecionamento agora é feito antes da renderização com o early-return pattern

  // Verificar se há parâmetros de redirecionamento na URL
  const [redirectParams, setRedirectParams] = useState({
    redirectTo: '',
    tab: ''
  });

  // Verificar se o usuário está logado e redirecionar para o dashboard ou página específica
  useEffect(() => {
    // Primeiro, vamos checar os parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTo = urlParams.get('redirect');
    const tab = urlParams.get('tab');

    if (redirectTo) {
      setRedirectParams({ redirectTo, tab: tab || '' });
      console.log(`Redirecionamento após login será para: ${redirectTo}${tab ? `?tab=${tab}` : ''}`);
    }

    try {
      const userDataString = localStorage.getItem('userData');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        if (userData && userData.id) {
          console.log("Usuário já está logado, redirecionando...");
          // Se tiver um redirecionamento específico, vá para lá
          if (redirectTo) {
            navigate(`/${redirectTo}${tab ? `?tab=${tab}` : ''}`);
          } else {
            // Caso contrário, vá para o dashboard
            navigate('/dashboard');
          }
        }
      }
    } catch (e) {
      console.error("Erro ao verificar dados do usuário:", e);
    }
  }, [navigate]);

  // Resetar o scroll para o topo quando a página é carregada
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Efeito para simular valores atualizando dinamicamente
  useEffect(() => {
    // Atualizar números do dashboard
    const dashboardInterval = setInterval(() => {
      // Simular atualizações do lucro atual
      const lucroEl = document.getElementById('lucro-atual');
      if (lucroEl) {
        const baseValue = 3452;
        const newValue = baseValue + Math.floor(Math.random() * 200) - 100;
        lucroEl.textContent = `R$ ${newValue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      }

      // Atualizar métricas
      const metrics = document.querySelectorAll('.metric-value');
      metrics.forEach(metric => {
        if (Math.random() > 0.7) {
          const el = metric as HTMLElement;
          const value = el.dataset.baseValue || '';
          const newVal = parseFloat(value) + (Math.random() * 2 - 1);
          el.textContent = el.dataset.format?.replace('{value}', newVal.toFixed(1)) || '';
        }
      });
    }, 3000);

    // Simular gráfico tipo bolsa de valores movimentando-se
    const chartInterval = setInterval(() => {
      const stockColumns = document.querySelectorAll('.stock-value');
      stockColumns.forEach((column) => {
        const col = column as HTMLElement;
        const randomHeight = 30 + Math.random() * 70;
        col.style.height = `${randomHeight}%`;
      });
    }, 500);

    // Simular chegada de novos itens na tabela de precificações
    const novosProdutos = [
      { name: "Fonte ATX 600W", value: "R$ 399", change: "+3%" },
      { name: "Manutenção PC", value: "R$ 210", change: "+4%" },
      { name: "Aluguel Impressora", value: "R$ 120/dia", change: "-5%" },
      { name: "Teclado Mecânico", value: "R$ 289", change: "+7%" },
      { name: "Monitor 24\"", value: "R$ 799", change: "+2%" }
    ];

    const precificacoesInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        const novoProduto = novosProdutos[Math.floor(Math.random() * novosProdutos.length)];
        setPrecificacoes(prev => {
          // Add ao início e remover o último para manter o mesmo número de itens
          const updated = [novoProduto, ...prev.slice(0, 3)];
          return updated;
        });
      }
    }, 5000);

    return () => {
      clearInterval(dashboardInterval);
      clearInterval(chartInterval);
      clearInterval(precificacoesInterval);
    };
  }, []);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false
    }
  });

  async function onSubmit(data: LoginFormValues) {
    const [isLoading, setIsLoading] = useState(false);
    setIsLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: data.email, // Usando email como username
          password: data.password
        }),
        credentials: 'include' // Importante para salvar o cookie de sessão
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao fazer login');
      }

      const userData = await response.json();

      // Log da resposta completa para debugging
      console.log("Resposta do login:", userData);

      // Verificar se o usuário tem 2FA habilitado
      try {
        setVerifying2FA(true);
        // Verificar o flag requires2FA na resposta diretamente
        const requires2FA = userData.requires2FA === true;

        console.log("Status 2FA verificado através da resposta inicial:", requires2FA ? "Ativado" : "Desativado");
        console.log("showTwoFactorForm antes:", showTwoFactorForm);

        if (requires2FA) {
          // Usuário tem 2FA habilitado, precisamos verificar o código
          console.log("2FA está habilitado para esta conta. Solicitando código...");

          // Primeiro, desativamos o carregamento para permitir interações
          setIsLoading(false);

          // Definimos os dados temporários do usuário para uso na verificação
          setTempUserData(userData);

          // ATUALIZAÇÃO SIMPLIFICADA: Definir flag para 2FA pendente
          localStorage.setItem('pendingTwoFactor', 'true');

          // IMPORTANTE: armazenar userData no estado e localStorage para uso na verificação 2FA
          setTempUserData(userData);
          localStorage.setItem('tempUserData', JSON.stringify(userData));

          console.log("Dados do usuário salvos temporariamente para verificação 2FA");

          console.log("ATIVANDO MODO 2FA - Definindo estados diretos para troca de formulário");

          // IMPORTANTE: Remover qualquer splash screen residual que possa estar causando preloader duplicado
          const splashElement = document.getElementById('splash-screen');
          if (splashElement) {
              splashElement.style.display = 'none';
          }

          // Ativação direta dos estados para mostrar o formulário 2FA
          setAwaiting2FACode(true);
          setShowTwoFactorForm(true);

          // Limpar referências anteriores para os inputs do código
          codeInputRefs.current = [];

          // Forçar atualização do componente para garantir renderização imediata
          forceUpdate();

          toast({
            title: "Autenticação de dois fatores",
            description: "Por favor, digite o código gerado pelo seu aplicativo autenticador.",
            duration: 6000, // Aumentar duração da notificação
          });

          setVerifying2FA(false);
          return; // Parar aqui e aguardar o código 2FA
        }

        // Se não tem 2FA, continuar com o login normal
        setVerifying2FA(false);
        completeLogin(userData);

      } catch (error) {
        console.error("Erro ao verificar status do 2FA:", error);
        // Em caso de erro na verificação, prosseguir com o login normal
        setVerifying2FA(false);
        // Se não conseguimos verificar o 2FA, seguir para completar o login normalmente
        completeLogin(userData);
      }

    } catch (error) {
      console.error('Erro no login:', error);
      setIsLoading(false);

      // Verifica se o erro está relacionado a verificação de email
      if (error instanceof Error && error.message.includes("verifique seu email")) {
        toast({
          variant: "warning",
          title: "Verificação de Email Pendente",
          description: "Um novo email de verificação foi enviado para sua caixa de entrada. Por favor, verifique seu email para ativar sua conta.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro no login",
          description: error instanceof Error ? error.message : "Verifique suas credenciais e tente novamente.",
        });
      }
    }
  }

  const completeLogin = (userData: any) => {
    const [isLoading, setIsLoading] = useState(false);
    try {
      // Armazenar dados do usuário no localStorage
      localStorage.setItem('userData', JSON.stringify(userData));

      // Se houver um token, armazená-lo também
      if (userData?.token) {
        localStorage.setItem('token', userData.token);
      }

      // Redirecionar com base nos parâmetros da URL ou para o dashboard
      if (redirectParams.redirectTo) {
        navigate(`/${redirectParams.redirectTo}${redirectParams.tab ? `?tab=${tab}` : ''}`);
      } else {
        navigate('/dashboard');
      }

      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo ao sistema!",
      });
    } catch (error) {
      console.error("Erro ao finalizar o processo de login:", error);
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: "Ocorreu um erro ao processar seus dados. Por favor, tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const form2FA = useForm<TwoFactorFormValues>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: {
      code: ""
    }
  });

  async function onSubmit2FA(data: TwoFactorFormValues) {
    const [isLoading, setIsLoading] = useState(false);
    setIsLoading(true);

    try {
      console.log("Dados para verificação 2FA:", { code: data.code, tempUserData });

      // Garantir que temos os dados do usuário
      if (!tempUserData || !tempUserData.id) {
        throw new Error("Dados temporários do usuário não encontrados");
      }

      const response = await fetch('/api/verify-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: tempUserData.id,
          code: data.code
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Código inválido ou expirado");
      }

      // Sucesso! Remover flags de 2FA pendente
      localStorage.removeItem('pendingTwoFactor');
      localStorage.removeItem('tempUserData');

      // Completar login com os dados temporários salvos
      const userData = tempUserData;
      setTempUserData(null);
      setShowTwoFactorForm(false);
      setAwaiting2FACode(false);

      // Atualizar a sessão para indicar que 2FA foi verificado
      fetch('/api/verify-2fa-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      }).catch(err => {
        console.warn("Não foi possível atualizar a sessão de 2FA:", err);
      });

      // Completar o processo de login
      completeLogin(userData);

    } catch (error) {
      console.error("Erro na verificação 2FA:", error);
      setIsLoading(false);

      toast({
        variant: "destructive",
        title: "Verificação falhou",
        description: error instanceof Error ? error.message : "Código inválido. Por favor, tente novamente.",
      });
    }
  }

  // Diagnóstico para estados de 2FA
  useEffect(() => {
    const tempUserDataPresent = tempUserData !== null;
    console.log("Estado atual: awaiting2FACode =", awaiting2FACode, "showTwoFactorForm =", showTwoFactorForm);
    console.log("RENDER - Estados do formulário 2FA:", {
      showTwoFactorForm,
      awaiting2FACode,
      tempUserData: tempUserDataPresent ? "presente" : "ausente",
      verifying2FA
    });
  }, [showTwoFactorForm, awaiting2FACode, tempUserData, verifying2FA]);

  // Se for um dispositivo móvel, renderizar o componente MobileLogin
  if (isMobile) {
    return <MobileLogin />;
  }

  // Caso contrário, renderizar a versão desktop
  return (
    <div className="h-screen bg-white flex flex-col md:flex-row overflow-hidden">
      {/* Seção de apresentação - à esquerda */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 xl:w-2/3 2xl:w-3/4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-purple-600 to-blue-600"></div>
        <div className="absolute inset-0 opacity-20" style={{ 
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" 
        }}></div>

        <div className="relative w-full h-full z-10">
          <div className="w-full h-full flex flex-col justify-center items-center p-2 overflow-auto" style={{ paddingBottom: "1rem" }}>
            {/* Logo e marca - versão desktop */}
            <div className="flex flex-col items-center mb-2 md:mb-3">
              <img src={LogoDesktop} alt="Meu Preço Certo" className="h-10 md:h-14 lg:h-16 xlarge:h-20 2xl:h-24 mb-1" />
            </div>

            {/* Conteúdo central destacado */}
            <div className="w-full" style={{ maxWidth: "70%" }}>
              <div className="flex items-center justify-center mb-2">
                <div className="px-2 py-0.5 rounded-full bg-white/20 text-white text-xs sm:text-sm font-medium backdrop-blur-sm">
                  O melhor preço começa com o preço certo
                </div>
              </div>

              <h2 className="text-lg md:text-xl lg:text-2xl xlarge:text-3xl 2xl:text-4xl font-bold text-center text-white mb-2 md:mb-3 lg:mb-4">
                Maximize seus 
                <span className="bg-gradient-to-r from-yellow-300 to-amber-500 bg-clip-text text-transparent">
                  {" "}lucros com precisão
                </span>
              </h2>

              {/* Dashboard simulado com gráficos - tamanho responsivo */}
              <div className="w-full rounded-xl overflow-hidden shadow-xl bg-white mb-2 md:mb-3 lg:mb-4 relative transform scale-85 md:scale-85 lg:scale-90 xl:scale-95 2xl:scale-100
              [@media(min-width:1370px)]:w-[90%] [@media(min-width:1370px)]:max-w-[70%] [@media(min-width:1370px)]:mx-auto [@media(min-width:1370px)]:h-[350px]" id="dashboard-container">
                <div className="p-2 bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">Dashboard de desempenho</h3>
                    <div className="flex space-x-2">
                      <div className="text-[10px] text-gray-500 border border-gray-200 px-1 py-0.5 rounded-full">Hoje</div>
                    </div>
                  </div>
                </div>

                {/* Simulação de gráficos e métricas */}
                <div className="px-2 py-1">
                  {/* Metrics row */}
                  <div className="grid grid-cols-4 gap-1 mb-2">
                    {[
                      { label: "Margem média", value: "33.6%", baseValue: "33.6", format: "{value}%", color: "bg-blue-500" },
                      { label: "Faturamento", value: "R$ 156K", baseValue: "156", format: "R$ {value}K", color: "bg-green-500" },
                      { label: "Produtos", value: "243.3", baseValue: "243.3", format: "{value}", color: "bg-purple-500" },
                      { label: "Crescimento", value: "+13.2%", baseValue: "13.2", format: "+{value}%", color: "bg-amber-500" }
                    ].map((metric, index) => (
                      <div key={index} className="bg-white p-1.5 rounded-lg border">
                        <div className="text-xs text-gray-500">{metric.label}</div>
                        <div 
                          className="text-xs font-bold metric-value"
                          data-base-value={metric.baseValue}
                          data-format={metric.format}
                        >{metric.value}</div>
                        <div className={`h-1 w-full ${metric.color} rounded-full mt-0.5`}></div>
                      </div>
                    ))}
                  </div>

                  {/* Área dos gráficos em layout mais compacto */}
                  <div className="flex space-x-2 h-[160px] [@media(min-width:1370px)]:h-[260px]">
                    {/* Coluna da esquerda - gráficos */}
                    <div className="w-7/12 flex flex-col h-full">
                      {/* Gráfico de barras */}
                      <div className="border rounded-lg p-1 bg-white mb-1 h-[80px] [@media(min-width:1370px)]:h-[130px]">
                        <div className="flex justify-between items-center mb-0.5">
                          <h4 className="text-xs font-medium">Margem por categoria</h4>
                          <div className="flex space-x-1 text-[10px]">
                            <div className="flex items-center">
                              <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-0.5"></div>
                              <span>Novos</span>
                            </div>
                            <div className="flex items-center ml-1">
                              <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-0.5"></div>
                              <span>Aluguel</span>
                            </div>
                          </div>
                        </div>

                        {/* Lucro atual dinâmico */}
                        <div className="flex justify-between items-center mb-0.5">
                          <div className="flex items-center text-[10px]">
                            <span className="text-gray-600 mr-1">Lucro atual:</span>
                            <span className="font-bold text-green-600 animate-pulse" id="lucro-atual">R$ 3.513,00</span>
                          </div>
                          <div className="text-[10px] text-green-600 flex items-center">
                            <ArrowUp className="h-3 w-3 mr-0.5" />
                            <span className="font-medium">+2.4%</span>
                          </div>
                        </div>

                        {/* Stock Market Chart Simulation - apenas com animação vertical e cores alternadas */}
                        <div className="overflow-hidden w-full h-6 mb-0.5 flex items-end bg-gray-50 rounded-t-sm [@media(min-width:1370px)]:h-10">
                          <div className="stock-chart-container relative w-full h-full flex items-end">
                            {Array.from({ length: 20 }).map((_, index) => (
                              <div key={index} className="stock-column h-full flex-1 flex items-end">
                                <div 
                                  className="stock-value w-full" 
                                  style={{ '--index': index } as React.CSSProperties}
                                ></div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Bar Chart Simulation - com cores alternadas de categorias */}
                        <div className="w-full grid grid-cols-12 gap-1 items-end h-7 [@media(min-width:1370px)]:h-16">
                          {[42, 30, 55, 25, 60, 38, 48, 58, 35, 45, 52, 40].map((height, index) => {
                            // Alternar cores baseadas nos tipos de produtos/serviços
                            const categoryIndex = index % 4;
                            const colors = [
                              { bg: "bg-blue-100", fill: "bg-blue-500" },     // Azul - Novos
                              { bg: "bg-green-100", fill: "bg-green-500" },   // Verde - Serviços
                              { bg: "bg-purple-100", fill: "bg-purple-500" }, // Roxo - Usados
                              { bg: "bg-amber-100", fill: "bg-amber-500" },   // Âmbar - Aluguéis
                            ];

                            return (
                              <div key={index} className="w-full flex flex-col items-center justify-end" style={{ minHeight: '100%' }}>
                                <div className={`w-full ${colors[categoryIndex].bg} rounded-t-sm`} style={{ height: `${height}%` }}>
                                  <div className={`w-full ${colors[categoryIndex].fill} rounded-t-sm`} style={{ height: '75%' }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Gráfico de pizza */}
                      <div className="border rounded-lg p-1 pb-1 bg-white flex-1 h-[65px] mb-1">
                        <h4 className="text-xs font-medium mb-0.5">Distribuição de vendas</h4>
                        <div className="flex items-center h-[32px]">
                          <div className="relative h-8 w-8 flex-shrink-0">
                            {/* Simulate pie chart */}
                            <div className="absolute inset-0 rounded-full overflow-hidden bg-white">
                              <div className="absolute inset-0 rounded-full"
                                  style={{
                                    background: 'conic-gradient(#3b82f6 0% 35%, #22c55e 35% 60%, #a855f7 60% 80%, #f59e0b 80% 100%)'
                                  }}
                              ></div>
                              {/* Centro branco */}
                              <div className="absolute h-2.5 w-2.5 rounded-full bg-white top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                            </div>
                          </div>

                          <div className="ml-1 grid grid-cols-2 gap-x-1 gap-y-0 w-full text-[8px]">
                            <div className="flex items-center">
                              <div className="h-1 w-1 rounded-full bg-blue-500 mr-0.5"></div>
                              <span>Novos (35%)</span>
                            </div>
                            <div className="flex items-center">
                              <div className="h-1 w-1 rounded-full bg-green-500 mr-0.5"></div>
                              <span>Usados (25%)</span>
                            </div>
                            <div className="flex items-center">
                              <div className="h-1 w-1 rounded-full bg-purple-500 mr-0.5"></div>
                              <span>Serviços (20%)</span>
                            </div>
                            <div className="flex items-center">
                              <div className="h-1 w-1 rounded-full bg-amber-500 mr-0.5"></div>
                              <span>Aluguel (20%)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Coluna da direita - tabela de precificações */}
                    <div className="w-5/12 border rounded-lg p-1 bg-white flex flex-col h-full [@media(min-width:1370px)]:p-3">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-xs font-medium">Últimas precificações</h4>
                        <div className="flex items-center text-[10px] text-blue-600 animate-pulse">
                          <Clock className="h-3 w-3 mr-0.5" />
                          <span>Ao vivo</span>
                        </div>
                      </div>
                      <div className="space-y-0.5 flex-1 flex flex-col pr-1 [@media(min-width:1370px)]:space-y-3">
                        {precificacoes.slice(0, 4).map((item, index) => (
                          <div 
                            key={`${item.name}-${index}`} 
                            className={`flex items-center justify-between text-[10px] ${index === 0 ? "bg-blue-50 p-0.5 rounded animate-pulse" : ""}`}
                          >
                            <div className="font-medium truncate mr-1" style={{ maxWidth: "60%" }}>
                              {index === 0 && <TrendingUp className="inline h-2.5 w-2.5 mr-0.5 text-blue-600" />}
                              {item.name}
                            </div>
                            <div className="flex items-center whitespace-nowrap">
                              <div>{item.value}</div>
                              <div className={`ml-0.5 ${item.change.startsWith('+') ? 'text-green-600' : item.change.startsWith('-') ? 'text-red-600' : 'text-gray-500'}`}>
                                {item.change}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cards de benefícios - alinhados com o dashboard */}
              <div className="w-[96%] mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 mb-1 [@media(min-width:1370px)]:w-[70%]" id="benefits-container">
                <div className="bg-white rounded-lg p-1.5 md:p-2 lg:p-3 shadow-sm">
                  <div className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 rounded-lg bg-green-100 flex items-center justify-center mb-0.5 md:mb-1">
                    <Check className="h-2.5 w-2.5 md:h-3 md:w-3 lg:h-4 lg:w-4 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-[10px] md:text-xs lg:text-sm mb-0.5">Fácil de usar</h3>
                  <p className="text-[9px] md:text-[10px] lg:text-xs text-gray-600">Interface intuitiva para todos os usuários.</p>
                </div>

                <div className="bg-white rounded-lg p-1.5 md:p-2 lg:p-3 shadow-sm">
                  <div className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 rounded-lg bg-blue-100 flex items-center justify-center mb-0.5 md:mb-1">
                    <ShieldCheck className="h-2.5 w-2.5 md:h-3 md:w-3 lg:h-4 lg:w-4 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-[10px] md:text-xs lg:text-sm mb-0.5">Seguro e confiável</h3>
                  <p className="text-[9px] md:text-[10px] lg:text-xs text-gray-600">Seus dados protegidos com alta segurança.</p>
                </div>

                <div className="bg-white rounded-lg p-1.5 md:p-2 lg:p-3 shadow-sm">
                  <div className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 rounded-lg bg-purple-100 flex items-center justify-center mb-0.5 md:mb-1">
                    <BarChart2 className="h-2.5 w-2.5 md:h-3 md:w-3 lg:h-4 lg:w-4 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-[10px] md:text-xs lg:text-sm mb-0.5">Análise avançada</h3>
                  <p className="text-[9px] md:text-[10px] lg:text-xs text-gray-600">Relatórios e insights para decisões.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de login - à direita */}
      <div className="w-full md:w-1/2 lg:w-2/5 xl:w-1/3 2xl:w-1/4 p-3 md:p-5 lg:p-6 flex flex-col justify-center bg-white">
        <div className="mx-auto w-full max-w-md py-2">
          {/* Logo e cabeçalho (visível apenas em mobile) */}
          <div className="md:hidden text-center mb-4 mt-4">
            <img src={LogoMobile} alt="Meu Preço Certo" className="h-16 mx-auto mb-2" />
          </div>

          {/* Espaço para manter o alinhamento */}
          <div className="h-[24px]"></div>

          {/* Título e subtítulo */}
          <div className="mb-3">
            <h2 className="text-xl font-bold mb-1 text-gray-900">
              {showTwoFactorForm ? "Verificação de segurança" : "Acesse sua conta"}
            </h2>
            <div className="text-gray-600 text-xs">
              {showTwoFactorForm 
                ? "Digite o código de 6 dígitos do seu aplicativo autenticador" 
                : "Gerencie seus negócios com nossa ferramenta completa."}
            </div>
          </div>

          {/* Exibição condicional - Formulário de login ou 2FA */}
          {showTwoFactorForm ? (
            // Formulário de verificação 2FA
            <div className="space-y-5">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 mb-6">
                <div className="flex items-start">
                  <div className="bg-purple-100 p-2 rounded-full mr-3">
                    <KeySquare className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-purple-800">Autenticação de dois fatores</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Digite o código de 6 dígitos gerado pelo seu aplicativo autenticador.
                    </p>
                  </div>
                </div>
              </div>

              <Form {...form2FA}>
                <form onSubmit={form2FA.handleSubmit(onSubmit2FA)} className="space-y-5">
                  <FormField
                    control={form2FA.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Código de verificação</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-10 text-lg tracking-widest text-center"
                            placeholder="000000"
                            maxLength={6}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoComplete="one-time-code"
                          />
                        </FormControl>
                        <FormMessage className="text-xs font-medium" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-10 bg-primary hover:bg-primary/90 text-white font-semibold rounded-md flex items-center justify-center group mt-2"
                    disabled={authIsLoading}
                  >
                    {authIsLoading ? (
                      <span className="flex items-center">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Verificando...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        Verificar código
                        <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </span>
                    )}
                  </Button>
                </form>
              </Form>
              <div className="text-center mt-6">
                <p className="text-sm">
                  Problemas com a verificação?{" "}
                  <button 
                    type="button"
                    className="text-primary hover:text-primary/90 font-medium"
                    onClick={() => {
                      localStorage.removeItem('pendingTwoFactor');
                      localStorage.removeItem('tempUserData');
                      setShowTwoFactorForm(false);
                      setAwaiting2FACode(false);
                      setTempUserData(null);
                    }}
                  >
                    Voltar ao login
                  </button>
                </p>
              </div>
            </div>
          ) : (
            // Formulário de login
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium text-xs">E-mail</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className={`h-9 rounded-md border-gray-300 focus:border-primary focus:ring focus:ring-primary/20 ${
                            form.formState.errors.email ? 'border-red-500 ring ring-red-200' : ''
                          }`}
                          placeholder="seu@email.com"
                          type="text"
                          inputMode="email"
                          autoComplete="email"
                        />
                      </FormControl>
                      <FormMessage className="text-xs font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-gray-700 font-medium text-xs">Senha</FormLabel>
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto font-medium text-primary hover:text-primary/90 text-xs"
                          onClick={() => navigate("/recuperar")}
                        >
                          Esqueceu a senha?
                        </Button>
                      </div>
                      <div className="relative">
                        <FormControl>
                          <Input
                            {...field}
                            className={`h-9 rounded-md border-gray-300 focus:border-primary focus:ring focus:ring-primary/20 ${
                              form.formState.errors.password ? 'border-red-500 ring ring-red-200' : ''
                            }`}
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="current-password"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <FormMessage className="text-xs font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-2 space-y-0 mt-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-primary rounded-sm"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          Lembrar meu acesso
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-9 bg-primary hover:bg-primary/90 text-white font-semibold rounded-md flex items-center justify-center group mt-2 text-sm"
                  disabled={authIsLoading}
                >
                  {authIsLoading ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Entrando...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      Entrar
                      <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  )}
                </Button>
              </form>
            </Form>
          )}

          <div className="text-center mt-6">
            <p className="text-gray-600 text-xs">
              Não possui uma conta?{" "}
              <Button
                variant="link"
                className="font-medium text-primary hover:text-primary/90 p-0 h-auto text-xs"
                onClick={() => navigate("/cadastre-se")}
              >
                Cadastre-se gratuitamente
              </Button>
            </p>
          </div>

          {/* Rodapé simplificado */}
          <div className="mt-6 text-center text-gray-500 text-[10px]">
            <p>© {new Date().getFullYear()} Meu Preço Certo. Todos os direitos reservados.</p>
            <div className="mt-1">
              <TermosPrivacidadeButtons />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}