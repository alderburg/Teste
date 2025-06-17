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

export default function LoginPage() {
  // NÃO USAR o redirecionador automático - queremos controlar isso manualmente
  // const redirectCheck = <RedirectChecker />;
  
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
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
    if (!authLoading && !isAuthenticated) {
      setVerificado(true);
    }
  }, [isAuthenticated, authLoading]);
  
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
        // Em caso de erro na verificação, mostrar mensagem de erro
        setVerifying2FA(false);
        toast({
          variant: "destructive",
          title: "Erro na verificação",
          description: "Não foi possível verificar o status do 2FA. Tente novamente.",
        });
      }

    } catch (error) {
      console.error("Erro de login:", error);

      toast({
        variant: "destructive",
        title: "Falha no login",
        description: error instanceof Error ? error.message : "E-mail ou senha inválidos. Por favor, tente novamente.",
      });
      setIsLoading(false);
    }
  }

  // Função para completar o login após verificação bem-sucedida
  function completeLogin(userData: any) {
    toast({
      title: "Login bem-sucedido",
      description: "Você foi conectado com sucesso.",
    });

    // IMPORTANTE: Remover flag de 2FA pendente e dados temporários
    localStorage.removeItem('pendingTwoFactor');
    localStorage.removeItem('tempUserData');
    
    // Log para verificar limpeza de dados temporários
    console.log("Limpando dados temporários de 2FA após verificação bem-sucedida");

    // Armazenar os dados do usuário localmente
    // Importante: só armazenamos os dados após a verificação 2FA completa ou se não houver 2FA
    localStorage.setItem('userData', JSON.stringify(userData));

    // Adicionar um pequeno delay para garantir que o estado seja atualizado antes do redirecionamento
    setTimeout(() => {
      try {
        // Verificar se há redirecionamento pendente
        if (redirectParams.redirectTo) {
          console.log(`Navegando para a página específica: /${redirectParams.redirectTo}${redirectParams.tab ? `?tab=${redirectParams.tab}` : ''}`);
          window.location.href = `/${redirectParams.redirectTo}${redirectParams.tab ? `?tab=${redirectParams.tab}` : ''}`;
        } else {
          console.log("Navegando para o dashboard...");
          window.location.href = "/dashboard";
        }
      } catch (error) {
        console.error("Erro durante o redirecionamento:", error);
        // Fallback em caso de erro no redirecionamento
        window.location.href = "/dashboard";
      }
    }, 500);
    
    setIsLoading(false);
  }

  // Log de estado para debugging
  useEffect(() => {
    if (showTwoFactorForm) {
      console.log("Estado 2FA: formulário ativado, esperando código");
    }
  }, [showTwoFactorForm]);

  // Função para verificar o código 2FA
  async function verify2FACode(code: string) {
    if (!tempUserData) {
      // Tentar recuperar dados temporários do localStorage como medida de fallback
      const tempDataStr = localStorage.getItem('tempUserData');
      if (tempDataStr) {
        try {
          const recoveredData = JSON.parse(tempDataStr);
          setTempUserData(recoveredData);
          console.log("Recuperados dados temporários do localStorage");
        } catch (e) {
          console.error("Erro ao recuperar dados temporários:", e);
        }
      }
      
      // Se mesmo assim não tiver dados, mostrar erro
      if (!tempUserData) {
        console.error("Erro: Dados temporários de usuário não disponíveis");
        toast({
          title: "Erro de verificação",
          description: "Erro ao processar sua solicitação. Por favor, faça login novamente.",
          variant: "destructive",
        });
        return;
      }
    }

    console.log("Iniciando verificação do código 2FA:", code);
    setVerifying2FA(true);

    try {
      // Usar a nova rota de verificação 2FA
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Código inválido. Por favor, tente novamente.');
      }

      // 2FA verificado com sucesso
      toast({
        title: "Verificação bem-sucedida",
        description: "Código 2FA verificado com sucesso.",
      });

      // MODIFICAÇÃO CRÍTICA: Remover a flag de 2FA pendente
      localStorage.removeItem('pendingTwoFactor');
      localStorage.removeItem('tempUserData');

      // Completar o login com os dados do usuário
      const userData = tempUserData;
      
      // Limpar estados de 2FA antes de completar login para evitar conflitos
      setAwaiting2FACode(false);
      setShowTwoFactorForm(false);
      setTempUserData(null);
      
      // Agora sim completar o login após limpar os estados
      completeLogin(userData);

    } catch (error) {
      console.error("Erro na verificação 2FA:", error);

      toast({
        variant: "destructive",
        title: "Falha na verificação",
        description: error instanceof Error ? error.message : "Código inválido. Por favor, tente novamente.",
      });
    } finally {
      setVerifying2FA(false);
    }
  }
  
  // Se estamos no modo 2FA, mostrar apenas a interface 2FA
  // IMPORTANTE: Verificação mais segura - basta uma das condições estar ativa
  useEffect(() => {
    // Log para debug toda vez que os estados relevantes mudarem
    console.log("Estado atual: showTwoFactorForm =", showTwoFactorForm, "awaiting2FACode =", awaiting2FACode);
    
    // Se só uma das flags estiver ativa, garantimos que a outra também esteja
    if (showTwoFactorForm !== awaiting2FACode) {
      console.log("Detectada inconsistência nos estados 2FA, corrigindo...");
      if (showTwoFactorForm) {
        setAwaiting2FACode(true);
      } else if (awaiting2FACode) {
        setShowTwoFactorForm(true);
      }
    }
  }, [showTwoFactorForm, awaiting2FACode]);
  
  // Para depuração: adiciona logs detalhados dos estados de 2FA a cada render
  useEffect(() => {
    console.log("RENDER - Estados do formulário 2FA:", {
      showTwoFactorForm,
      awaiting2FACode,
      tempUserData: tempUserData ? "presente" : "ausente",
      verifying2FA
    });
  });

  // Debug - mostrar estado atual antes de renderizar
  console.log("Estado atual: awaiting2FACode =", awaiting2FACode, "showTwoFactorForm =", showTwoFactorForm);
  
  // Usando useEffect para mostrar formulário 2FA quando awaiting2FACode muda para true
  useEffect(() => {
    if (awaiting2FACode) {
      console.log("awaiting2FACode mudou para true, atualizando showTwoFactorForm");
      setShowTwoFactorForm(true);
    }
  }, [awaiting2FACode]);

  return (
    <div className="h-screen bg-white flex flex-col md:flex-row overflow-hidden">
      {/* Seção de apresentação - agora à esquerda */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 xl:w-2/3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-purple-600 to-blue-600"></div>
        <div className="absolute inset-0" style={{ 
          backgroundImage: "radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.2) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.15) 0%, transparent 45%)" 
        }}></div>
        <div className="absolute inset-0 opacity-20" style={{ 
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" 
        }}></div>

        <div className="relative w-full h-full z-10 overflow-auto">
          <div className="w-full h-full flex flex-col justify-center items-center p-4 md:p-5 lg:p-6 xl:p-8">
            {/* Logo e marca - versão desktop */}
            <div className="flex flex-col items-center mb-4 lg:mb-5 xl:mb-6">
              <img src={LogoDesktop} alt="Meu Preço Certo" className="h-16 md:h-18 lg:h-20 xl:h-24 mb-3 lg:mb-4 xl:mb-5" />
            </div>

            {/* Conteúdo central destacado */}
            <div className="max-w-xl lg:max-w-2xl xl:max-w-3xl">
              <div className="flex items-center justify-center mb-2 lg:mb-3 xl:mb-4">
                <div className="px-3 py-1 md:px-3.5 lg:px-4 xl:px-5 md:py-1 lg:py-1.5 rounded-full bg-white/20 text-white text-sm md:text-sm lg:text-base xl:text-lg font-medium backdrop-blur-sm">
                  O melhor preço começa com o preço certo
                </div>
              </div>

              <h2 className="text-xl md:text-xl lg:text-2xl xl:text-3xl font-bold text-center text-white mb-4 lg:mb-5 xl:mb-6">
                Maximize seus 
                <span className="bg-gradient-to-r from-yellow-300 to-amber-500 bg-clip-text text-transparent">
                  {" "}lucros com precisão
                </span>
              </h2>

              {/* Dashboard simulado com gráficos - tamanho responsivo */}
              <div className="w-full rounded-xl overflow-hidden shadow-xl bg-white mb-4 lg:mb-5 xl:mb-6 relative lg:transform lg:scale-105 xl:scale-110 transition-transform">
                <div className="p-2 md:p-2.5 lg:p-3 bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm md:text-sm lg:text-base font-bold">Dashboard de desempenho</h3>
                    <div className="flex space-x-2">
                      <div className="text-xs text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">Hoje</div>
                    </div>
                  </div>
                </div>

                {/* Conteúdo do dashboard simulado */}
                <div className="p-2 md:p-2.5 lg:p-3">
                  <div className="flex flex-wrap -mx-1">
                    <div className="w-1/2 px-1 mb-2">
                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Vendas do mês</div>
                        <div className="text-sm font-bold">R$ 52.459,00</div>
                        <div className="text-xs text-green-600 flex items-center">
                          <TrendingUp className="h-3 w-3 mr-0.5" />
                          <span>+12% vs. mês anterior</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-1/2 px-1 mb-2">
                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Ticket médio</div>
                        <div className="text-sm font-bold">R$ 239,00</div>
                        <div className="text-xs text-green-600 flex items-center">
                          <TrendingUp className="h-3 w-3 mr-0.5" />
                          <span>+8% vs. mês anterior</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-1">
                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <div className="flex justify-between mb-1">
                        <div className="text-xs text-gray-500">Precificações recentes</div>
                        <div className="text-xs text-blue-600 flex items-center">
                          <Clock className="h-3 w-3 mr-0.5" />
                          <span>Atualizado agora</span>
                        </div>
                      </div>
                      <div className="space-y-1 md:space-y-2">
                        {precificacoes.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-1 md:pb-2 last:border-0 last:pb-0">
                            <div className="text-xs md:text-sm lg:text-base font-medium">{item.name}</div>
                            <div className="flex items-center">
                              <div className="text-xs md:text-sm lg:text-base mr-2 md:mr-3">{item.value}</div>
                              <div className={`text-xs md:text-sm lg:text-base ${item.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
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
              
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-3 shadow-sm xl:p-4">
                  <div className="h-7 w-7 rounded-lg bg-purple-100 flex items-center justify-center mb-2 xl:h-8 xl:w-8 xl:mb-2">
                    <TrendingUp className="h-3 w-3 text-purple-600 xl:h-4 xl:w-4" />
                  </div>
                  <h3 className="font-semibold text-xs mb-1 xl:text-sm xl:mb-1">Precificação inteligente</h3>
                  <p className="text-xs text-gray-600">Calcule o preço ideal para seus produtos e serviços.</p>
                </div>

                <div className="bg-white rounded-lg p-3 shadow-sm xl:p-4">
                  <div className="h-7 w-7 rounded-lg bg-purple-100 flex items-center justify-center mb-2 xl:h-8 xl:w-8 xl:mb-2">
                    <ShieldCheck className="h-3 w-3 text-purple-600 xl:h-4 xl:w-4" />
                  </div>
                  <h3 className="font-semibold text-xs mb-1 xl:text-sm xl:mb-1">Segurança total</h3>
                  <p className="text-xs text-gray-600">Seus dados protegidos com alta segurança.</p>
                </div>

                <div className="bg-white rounded-lg p-3 shadow-sm xl:p-4">
                  <div className="h-7 w-7 rounded-lg bg-purple-100 flex items-center justify-center mb-2 xl:h-8 xl:w-8 xl:mb-2">
                    <BarChart2 className="h-3 w-3 text-purple-600 xl:h-4 xl:w-4" />
                  </div>
                  <h3 className="font-semibold text-xs mb-1 xl:text-sm xl:mb-1">Análise avançada</h3>
                  <p className="text-xs text-gray-600">Relatórios e insights para decisões.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de login - agora à direita */}
      <div className="w-full md:w-1/2 lg:w-2/5 xl:w-1/3 p-4 md:p-8 lg:p-10 flex flex-col justify-center bg-white overflow-auto">
        <div className="mx-auto w-full max-w-md">
          {/* Logo e cabeçalho (visível apenas em mobile) */}
          <div className="md:hidden text-center mb-4 mt-4">
            <img src={LogoMobile} alt="Meu Preço Certo" className="h-20 mx-auto mb-4" />
          </div>

          {/* Espaço reduzido para botão de voltar */}
          <div className="h-[30px]"></div>

          {/* Título e subtítulo - adaptável ao contexto */}
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold mb-2 text-gray-900">
              {showTwoFactorForm ? "Verificação de segurança" : "Acesse sua conta"}
            </h2>
            <p className="text-gray-600 text-sm">
              {showTwoFactorForm 
                ? "Digite o código de 6 dígitos do seu aplicativo autenticador" 
                : "Gerencie seus negócios com a ferramenta mais completa do mercado."}
            </p>
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

              <div className="flex flex-col space-y-5">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Código de verificação</label>
                  <div className="flex justify-center space-x-2">
                    {Array(6).fill(0).map((_, index) => (
                      <input
                        key={index}
                        type="text"
                        maxLength={1}
                        className="w-12 h-14 text-xl font-semibold text-center border rounded-lg focus:border-purple-500 focus:ring focus:ring-purple-200"
                        onChange={(e) => {
                          // Auto-avançar para o próximo input
                          if (e.target.value && index < 5 && codeInputRefs.current[index + 1]) {
                            codeInputRefs.current[index + 1]?.focus();
                          }

                          // Verificar se todos os campos estão preenchidos e submeter
                          const allValues = codeInputRefs.current.map(input => input?.value || '');
                          if (allValues.every(val => val) && allValues.length === 6) {
                            verify2FACode(allValues.join(''));
                          }
                        }}
                        onKeyDown={(e) => {
                          // Quando pressionar backspace
                          if (e.key === 'Backspace') {
                            // Se o campo atual estiver vazio e não for o primeiro campo, focar no campo anterior
                            if (!e.currentTarget.value && index > 0 && codeInputRefs.current[index - 1]) {
                              codeInputRefs.current[index - 1]?.focus();
                              // Limpar o campo anterior também
                              const prevInput = codeInputRefs.current[index - 1];
                              if (prevInput && prevInput.value !== undefined) {
                                // Atribuir diretamente após verificação
                                prevInput.value = '';
                              }
                              e.preventDefault(); // Prevenir comportamento padrão
                            }
                          }
                        }}
                        ref={el => {
                          if (codeInputRefs.current.length <= index) {
                            codeInputRefs.current.push(el);
                          } else {
                            codeInputRefs.current[index] = el;
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full h-12 text-base font-medium rounded-lg bg-purple-600 hover:bg-purple-700"
                  disabled={verifying2FA}
                  onClick={() => {
                    const code = codeInputRefs.current.map(input => input?.value || '').join('');
                    if (code.length === 6) {
                      verify2FACode(code);
                    } else {
                      toast({
                        variant: "destructive",
                        title: "Código incompleto",
                        description: "Por favor, digite os 6 dígitos do código de verificação.",
                      });
                    }
                  }}
                >
                  {verifying2FA ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      Verificar
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>

                <Button 
                  variant="outline" 
                  className="h-12"
                  onClick={() => {
                    setShowTwoFactorForm(false);
                    setAwaiting2FACode(false);
                    setTempUserData(null);
                  }}
                >
                  Voltar
                </Button>
              </div>
            </div>
          ) : (
            // Formulário de login padrão
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium text-sm">E-mail</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className={`h-9 rounded-md border-gray-300 focus:border-primary focus:ring focus:ring-primary/20 ${
                            form.formState.errors.email ? 'border-red-500 ring ring-red-200' : ''
                          }`}
                          placeholder="seu@email.com"
                          autoComplete="email"
                          onBlur={(e) => {
                            field.onBlur();
                            // Validação adicional pode ser feita aqui se necessário
                          }}
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
                        <FormLabel className="text-gray-700 font-medium">Senha</FormLabel>
                        <Button
                          variant="link"
                          className="h-auto p-0 text-gray-500 text-xs hover:text-gray-800"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate("/recuperar");
                          }}
                        >
                          Esqueceu a senha?
                        </Button>
                      </div>

                      <div className="relative">
                        <FormControl>
                          <div>
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              className={`h-9 rounded-md border-gray-300 focus:border-primary focus:ring focus:ring-primary/20 pr-11 ${
                                form.formState.errors.password ? 'border-red-500 ring ring-red-200' : ''
                              }`}
                              autoComplete="current-password"
                            />
                            <div 
                              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </div>
                          </div>
                        </FormControl>
                      </div>
                      <FormMessage className="text-xs font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <div className="flex items-center space-x-2 pt-1">
                      <Checkbox
                        id="rememberMe"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="rounded-sm border-gray-300 text-primary focus:ring-primary/20"
                      />
                      <label
                        htmlFor="rememberMe"
                        className="text-sm text-gray-700 cursor-pointer"
                      >
                        Lembrar de mim
                      </label>
                    </div>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-9 text-sm font-medium rounded-md bg-purple-600 hover:bg-purple-700"
                  disabled={isLoading || verifying2FA}
                >
                  {isLoading || verifying2FA ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {verifying2FA ? 'Verificando...' : 'Entrando...'}
                    </>
                  ) : (
                    <>
                      Entrar
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          )}

          {/* Footer com links e informações de copyright */}
          <div className="mt-12 text-center text-gray-500 text-xs">
            <p>© 2025 Meu Preço Certo. Todos os direitos reservados.</p>
            <div className="mt-2">
              <a href="#" className="mx-2 hover:text-gray-700 transition-colors">Política de Privacidade</a>
              <a href="#" className="mx-2 hover:text-gray-700 transition-colors">Termos de Serviço</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}