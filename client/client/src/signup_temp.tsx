import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useOnboarding } from "@/context/OnboardingContext";
import OnboardingChat from "@/components/onboarding/OnboardingChat";
import { Building, Eye, EyeOff, Loader2, ArrowLeft, ChevronRight, Check, ShieldCheck, BarChart2, Users, LineChart, Briefcase, ArrowUp, TrendingUp, Clock, X } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import LogoDesktop from "@/assets/images/logo/webp/Negativo.webp";
import LogoMobile from "@/assets/images/logo/webp/negativoo.webp"; // Agora usando a versão rosa da logo para versão mobile

// Schema de validação para cadastro
const signupSchema = z.object({
  username: z.string().min(3, { message: "Nome de usuário deve ter pelo menos 3 caracteres" }),
  email: z.string().email({ message: "Por favor, insira um endereço de e-mail válido" }),
  password: z.string()
    .min(8, "Digite uma senha forte com no mínimo 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter letras minúsculas")
    .regex(/[0-9]/, "A senha deve conter números")
    .regex(/[^A-Za-z0-9]/, "A senha deve conter caracteres especiais (!@#$%^&*)"),
  confirmPassword: z.string(),
  terms: z.boolean().refine(val => val === true, {
    message: "Você precisa aceitar os termos para continuar"
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { showOnboarding, setShowOnboarding, completeOnboarding } = useOnboarding();
  
  // Verificação imediata - redireciona antes de qualquer renderização
  useEffect(() => {
    // Verificar diretamente no localStorage para uma resposta mais rápida
    const userDataString = localStorage.getItem('userData');
    const isLoggedIn = !!userDataString;
    
    if (isLoggedIn) {
      console.log("Usuário já logado detectado em SignupPage - redirecionando imediatamente");
      window.location.href = "/dashboard";
    }
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [verificado, setVerificado] = useState(false);
  
  // Verificar se o usuário está logado e redirecionar para o dashboard
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Verificação imediata ao carregar o componente
  useEffect(() => {
    console.log("Verificando autenticação na página de cadastro...");
    
    // Verificação rápida pelo localStorage para máxima performance
    const userDataStr = localStorage.getItem('userData');
    const isUserLoggedIn = userDataStr && userDataStr !== 'undefined' && userDataStr !== 'null';
    
    if (isUserLoggedIn || isAuthenticated) {
      console.log("Usuário já autenticado, redirecionando para dashboard...");
      // Redirecionamento direto usando window.location para evitar flash
      window.location.href = "/dashboard";
      return;
    }
    
    setVerificado(true);
  }, [isAuthenticated]);
  
  // Se o usuário estiver autenticado, não renderizar nada e redirecionar imediatamente
  if ((isAuthenticated || authLoading) && !verificado) {
    console.log("Usuário já está logado ou ainda verificando, aguardando...");
    return null; // Não renderiza nada enquanto redireciona ou carrega
  }
  
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
  
  // Efeito para simular valores atualizando dinamicamente
  // Resetar o scroll para o topo quando a página é carregada
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
    
    // Animar o gráfico de estoque
    const chartInterval = setInterval(() => {
      const stockValues = document.querySelectorAll('.stock-value');
      stockValues.forEach(value => {
        const randomHeight = Math.floor(20 + Math.random() * 60);
        (value as HTMLElement).style.height = `${randomHeight}%`;
      });
    }, 1000);
    
    // Novos produtos para simulação
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

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false
    }
  });

  async function onSubmit(data: SignupFormValues) {
    setIsLoading(true);

    try {
      // Em uma aplicação real, registraríamos o usuário no backend
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({
        title: "Conta criada",
        description: "Você criou sua conta com sucesso.",
      });
      
      // Redirecionar para o dashboard - não ativamos mais o onboarding na página de cadastro
      // O onboarding será exibido automaticamente apenas quando o usuário acessar o dashboard
      navigate("/dashboard");
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Falha no cadastro",
        description: "Ocorreu um erro durante o cadastro. Por favor, tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-white overflow-hidden">
      {/* Seção de apresentação - à esquerda */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 xl:w-2/3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-purple-600 to-blue-600"></div>
        <div className="absolute inset-0" style={{ 
          backgroundImage: "radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.2) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.15) 0%, transparent 45%)" 
        }}></div>
        <div className="absolute inset-0 opacity-20" style={{ 
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" 
        }}></div>
        
        <div className="relative w-full h-full z-10">
          <div className="w-full h-full flex flex-col justify-center items-center p-2 overflow-auto" style={{ paddingBottom: "1rem" }}>
            {/* Logo e marca - versão desktop */}
            <div className="flex flex-col items-center mb-2 md:mb-3">
              <img src={LogoDesktop} alt="Meu Preço Certo" className="h-10 md:h-14 lg:h-16 mb-1" />
            </div>
            
            {/* Conteúdo central destacado */}
            <div className="w-full" style={{ maxWidth: "70%" }}>
              <div className="flex items-center justify-center mb-2">
                <div className="px-2 py-0.5 rounded-full bg-white/20 text-white text-xs sm:text-sm font-medium backdrop-blur-sm">
                  O melhor preço começa com o preço certo
                </div>
              </div>
              
              <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-center text-white mb-2 md:mb-3 lg:mb-4">
                Maximize seus 
                <span className="bg-gradient-to-r from-yellow-300 to-amber-500 bg-clip-text text-transparent">
                  {" "}lucros com precisão
                </span>
              </h2>

              {/* Dashboard simulado com gráficos - tamanho responsivo */}
              <div className="w-full rounded-xl overflow-hidden shadow-xl bg-white mb-2 md:mb-3 lg:mb-4 relative transform scale-85 md:scale-85 lg:scale-90 xl:scale-95" id="dashboard-container">
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
                  <div className="flex space-x-2 h-[160px]">
                    {/* Coluna da esquerda - gráficos */}
                    <div className="w-7/12 flex flex-col h-full">
                      {/* Gráfico de barras */}
                      <div className="border rounded-lg p-1 bg-white mb-1 h-[80px]">
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
                        <div className="overflow-hidden w-full h-6 mb-0.5 flex items-end bg-gray-50 rounded-t-sm">
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
                        <div className="w-full grid grid-cols-12 gap-1 items-end h-7">
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
                    <div className="w-5/12 border rounded-lg p-1 bg-white flex flex-col h-full">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-xs font-medium">Últimas precificações</h4>
                        <div className="flex items-center text-[10px] text-blue-600 animate-pulse">
                          <Clock className="h-3 w-3 mr-0.5" />
                          <span>Ao vivo</span>
                        </div>
                      </div>
                      <div className="space-y-0.5 flex-1 flex flex-col pr-1">
                        {[
                          { name: "Monitor 24\"", value: "R$ 799", change: "+2%" },
                          { name: "Processador i7", value: "R$ 2.349", change: "+5%" },
                          { name: "Reparo Notebook", value: "R$ 159", change: "-2%" },
                          { name: "Aluguel Projetor", value: "R$ 89/dia", change: "+8%" }
                        ].map((item, index) => (
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
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-1 mb-1 md:transform md:scale-85 lg:scale-90 xl:scale-95" id="benefits-container">
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

      {/* Seção de formulário - à direita */}
      <div className="w-full md:w-1/2 lg:w-2/5 xl:w-1/3 p-3 md:p-5 lg:p-6 flex flex-col justify-center bg-white">
        <div className="mx-auto w-full max-w-md py-2">
          {/* Logo e cabeçalho (visível apenas em mobile) */}
          <div className="md:hidden text-center mb-4 mt-4">
            <img src={LogoMobile} alt="Meu Preço Certo" className="h-16 mx-auto mb-2" />
          </div>

          {/* Espaço para manter o alinhamento */}
          <div className="h-[24px]"></div>

          {/* Título e subtítulo */}
          <div className="mb-3">
            <h2 className="text-xl font-bold mb-1 text-gray-900">Crie sua conta</h2>
            <div className="text-gray-600 text-xs">
              Cadastre-se para acessar todas as ferramentas de precificação.
            </div>
          </div>

          {/* Formulário de cadastro */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium text-xs">Nome de usuário</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className={`h-9 rounded-md border-gray-300 focus:border-primary focus:ring focus:ring-primary/20 ${
                          form.formState.errors.username ? 'border-red-500 ring ring-red-200' : ''
                        }`}
                        placeholder="Seu nome de usuário"
                        autoComplete="username"
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
                    <FormLabel className="text-gray-700 font-medium text-xs">Senha</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          {...field}
                          className={`h-9 rounded-md border-gray-300 focus:border-primary focus:ring focus:ring-primary/20 ${
                            form.formState.errors.password ? 'border-red-500 ring ring-red-200' : ''
                          }`}
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          onBlur={(e) => {
                            field.onBlur();
                            // Validação adicional pode ser feita aqui se necessário
                          }}
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
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={`text-gray-700 font-medium text-xs ${form.formState.errors.confirmPassword ? 'text-red-500' : ''}`}>Confirmar senha</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          {...field}
                          className={`h-9 rounded-md border-gray-300 focus:border-primary focus:ring focus:ring-primary/20 ${
                            form.formState.errors.confirmPassword ? 'border-red-500 ring ring-red-200' : ''
                          }`}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          onBlur={(e) => {
                            field.onBlur();
                            // Validação adicional pode ser feita aqui se necessário
                          }}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <FormMessage className="text-xs font-medium" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0 mt-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-primary"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">
                        Eu concordo com os{" "}
                        <Button 
                          type="button"
                          variant="link" 
                          className="p-0 text-primary font-medium h-auto"
                          onClick={(e) => {
                            e.preventDefault();
                            setTermsModalOpen(true);
                          }}
                        >
                          Termos de Serviço
                        </Button>{" "}
                        e{" "}
                        <Button 
                          type="button"
                          variant="link" 
                          className="p-0 text-primary font-medium h-auto"
                          onClick={(e) => {
                            e.preventDefault();
                            setPrivacyModalOpen(true);
                          }}
                        >
                          Política de Privacidade
                        </Button>
                      </FormLabel>
                      <FormMessage className="text-xs font-medium" />
                    </div>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-9 bg-primary hover:bg-primary/90 text-white font-semibold rounded-md flex items-center justify-center group mt-2 text-sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Criando conta...
                  </span>
                ) : (
                  <span className="flex items-center">
                    Criar conta
                    <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center mt-6">
            <p className="text-gray-600">
              Já possui uma conta?{" "}
              <Button
                variant="link"
                className="font-medium text-primary hover:text-primary/90 p-0 h-auto"
                onClick={() => navigate("/acessar")}
              >
                Entrar
              </Button>
            </p>
          </div>

          {/* Rodapé simplificado */}
          <div className="mt-12 text-center text-gray-500 text-xs">
            <p>© {new Date().getFullYear()} Meu Preço Certo. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>

      {/* Modais removidos */}

      {/* Componente do Chat de Onboarding */}
      <OnboardingChat 
        open={showOnboarding} 
        onComplete={(answers) => {
          completeOnboarding(answers);
          // O redirecionamento já está acontecendo no onSubmit
        }}
      />
    </div>
  );
}