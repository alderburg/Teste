import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff, Loader2, KeySquare } from "lucide-react";
import LogoMobile from "@/assets/images/logo/webp/negativoo.webp";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export default function MobileLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoadingResetPassword, setIsLoadingResetPassword] = useState(false);
  
  // Estado para 2FA
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
  const [tempUserData, setTempUserData] = useState<any>(null);
  const [verificado, setVerificado] = useState(false);
  
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
                   sessionStorage.getItem('bypassAllSplashScreens') === 'true' || 
                   (window as any).LOGOUT_IN_PROGRESS === true || 
                   (window as any).HARD_LOGOUT_IN_PROGRESS === true; 
  
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

  // Efeito para verificar o status 2FA após montagem do componente
  useEffect(() => {
    try {
      const hasPending2FA = localStorage.getItem('pendingTwoFactor') === 'true';
      
      if (hasPending2FA) {
        console.log('MOBILE LOGIN: 2FA PENDENTE DETECTADO - Mostrando formulário 2FA');
        
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
        console.log('MOBILE LOGIN: Nenhum 2FA pendente, mostrando formulário normal');
      }
    } catch (e) {
      console.error('MOBILE LOGIN: Erro ao verificar 2FA pendente:', e);
    }
  }, []);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false
    }
  });

  const twoFactorForm = useForm<TwoFactorFormValues>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: {
      code: ""
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
          username: data.email,
          password: data.password
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao fazer login');
      }

      const userData = await response.json();
      
      try {
        setVerifying2FA(true);
        const requires2FA = userData.requires2FA === true;
        
        if (requires2FA) {
          console.log("2FA está habilitado para esta conta. Solicitando código...");
          
          setIsLoading(false);
          setTempUserData(userData);
          localStorage.setItem('pendingTwoFactor', 'true');
          localStorage.setItem('tempUserData', JSON.stringify(userData));
          
          setAwaiting2FACode(true);
          setShowTwoFactorForm(true);
          
          forceUpdate();

          toast({
            title: "Autenticação de dois fatores",
            description: "Por favor, digite o código gerado pelo seu aplicativo autenticador.",
            duration: 6000,
          });
          
          setVerifying2FA(false);
          return;
        }

        // Se não tem 2FA, continuar com o login normal
        setVerifying2FA(false);
        completeLogin(userData);

      } catch (error) {
        console.error("Erro ao verificar status do 2FA:", error);
        setVerifying2FA(false);
        completeLogin(userData);
      }

    } catch (error: any) {
      setIsLoading(false);
      
      // Verifica se o erro está relacionado a verificação de email
      if (error.message && error.message.includes("verifique seu email")) {
        toast({
          title: "Verificação de Email Pendente",
          description: "Um novo email de verificação foi enviado para sua caixa de entrada. Por favor, verifique seu email para ativar sua conta.",
        });
      } else {
        toast({
          title: "Erro de autenticação",
          description: error.message || "Falha ao fazer login. Verifique suas credenciais.",
          variant: "destructive",
        });
      }
    }
  }

  async function onSubmitTwoFactor(data: TwoFactorFormValues) {
    setIsLoading(true);

    try {
      const response = await fetch('/api/verify-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: data.code,
          userId: tempUserData?.id
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Código 2FA inválido');
      }

      const responseData = await response.json();
      
      // Limpar flags 2FA
      localStorage.removeItem('pendingTwoFactor');
      localStorage.removeItem('tempUserData');
      
      setShowTwoFactorForm(false);
      setAwaiting2FACode(false);
      
      // Completar login com os dados originais
      completeLogin(tempUserData);

    } catch (error: any) {
      setIsLoading(false);
      toast({
        title: "Erro na verificação",
        description: error.message || "Código de verificação inválido",
        variant: "destructive",
      });
    }
  }

  function completeLogin(userData: any) {
    // Salvar dados do usuário no localStorage
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('token', userData.token || '');
    setIsLoading(false);

    // Verificar se tem redirecionamento específico
    const redirectParam = urlParams.get('redirect');
    const tabParam = urlParams.get('tab');

    if (redirectParam) {
      navigate(`/${redirectParam}${tabParam ? `?tab=${tabParam}` : ''}`);
    } else {
      // Redirecionar para dashboard
      navigate('/dashboard');
    }

    toast({
      title: "Login realizado com sucesso!",
      description: `Bem-vindo(a), ${userData.nome || userData.username || 'usuário'}!`,
    });
  }

  // Renderizar a interface - layout totalmente adaptativo
  return (
    <div className="h-screen flex flex-col justify-between overflow-hidden relative">
      {/* Fundo com gradiente mais sofisticado */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white z-0"></div>
      
      {/* Elemento decorativo superior */}
      <div className="absolute top-0 w-full h-1/3 overflow-hidden z-0">
        <svg className="absolute top-0 left-0 right-0 opacity-20" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path fill="#4f46e5" d="M0,0 C40,33 60,33 100,0 L100,20 C60,53 40,53 0,20 Z"></path>
          <path fill="#4338ca" d="M0,0 C40,33 60,33 100,0 L100,10 C60,43 40,43 0,10 Z" opacity="0.5"></path>
        </svg>
      </div>
      
      {/* Elemento decorativo inferior */}
      <div className="absolute bottom-0 w-full h-1/4 overflow-hidden z-0">
        <svg className="absolute bottom-0 left-0 right-0 opacity-10" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{transform: 'rotate(180deg)'}}>
          <path fill="#4f46e5" d="M0,0 C40,33 60,33 100,0 L100,20 C60,53 40,53 0,20 Z"></path>
        </svg>
      </div>
      
      {/* Efeito de brilho suave */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 right-0 w-96 h-96 rounded-full bg-gradient-to-br from-blue-200 to-indigo-200 opacity-25 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-20 w-96 h-96 rounded-full bg-gradient-to-tr from-indigo-200 to-purple-200 opacity-20 blur-3xl"></div>
        
        {/* Círculos decorativos com animação */}
        <div className="absolute top-1/4 right-10 w-4 h-4 rounded-full bg-blue-500 opacity-20 animate-float"></div>
        <div className="absolute bottom-1/3 left-10 w-3 h-3 rounded-full bg-indigo-600 opacity-20 animate-float" style={{animationDelay: '1s', animationDuration: '6s'}}></div>
        <div className="absolute top-1/2 right-1/4 w-2 h-2 rounded-full bg-purple-500 opacity-20 animate-float" style={{animationDelay: '2s', animationDuration: '8s'}}></div>
      </div>
      
      {/* Header - Logo mais destacada no topo */}
      <div className="flex-shrink-0 pt-10 px-4 text-center relative z-10">
        <img src={LogoMobile} alt="Logo" className="h-20 mx-auto" />
      </div>
      
      {/* Conteúdo principal - perfeitamente centralizado na tela */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-0 -mt-6 relative z-10 animate-fadeIn">
        {/* Título centralizado com efeito de gradiente */}
        <div className="w-full text-center mb-4">
          <h2 className="text-2xl font-bold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-800">
            {showTwoFactorForm ? "Verificação de Segurança" : "Acesse sua conta"}
          </h2>
          <p className="text-gray-600 text-sm px-4 max-w-xs mx-auto">
            {showTwoFactorForm 
              ? "Digite o código de 6 dígitos do seu aplicativo autenticador" 
              : "Gerencie seus negócios com a ferramenta mais completa do mercado."}
          </p>
        </div>

        {/* Card com formulário - com sombra elegante, borda suave e leve animação */}
        <div className="w-full max-w-md bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100 animate-fadeSlideUp">
          {showTwoFactorForm ? (
            // Formulário 2FA - Design Mobile
            <div className="space-y-5">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-5">
                <div className="flex items-start">
                  <div className="bg-blue-100 p-2 rounded-full mr-3">
                    <KeySquare className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900">Autenticação de dois fatores</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Insira o código de 6 dígitos gerado pelo seu aplicativo autenticador.
                    </p>
                  </div>
                </div>
              </div>

              <Form {...twoFactorForm}>
                <form onSubmit={twoFactorForm.handleSubmit(onSubmitTwoFactor)} className="space-y-5">
                  <FormField
                    control={twoFactorForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="000000"
                              className="h-16 text-2xl text-center tracking-widest font-medium"
                              maxLength={6}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              autoComplete="one-time-code"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full h-14 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      "Verificar código"
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          ) : (
            // Formulário de login - Design Mobile
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          placeholder="Seu e-mail" 
                          className="h-14 px-4 text-base rounded-xl"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="Sua senha" 
                            type={showPassword ? "text" : "password"}
                            className="h-14 px-4 text-base rounded-xl pr-12"
                            {...field} 
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            className="absolute right-0 top-0 h-full px-3 text-gray-400"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex items-center justify-between">
                  <FormField
                    control={form.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="rememberMe" 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                        />
                        <label
                          htmlFor="rememberMe"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700"
                        >
                          Lembrar-me
                        </label>
                      </div>
                    )}
                  />
                  <Button 
                    type="button" // Adicionado type="button" para evitar que o Enter acione este botão
                    variant="link" 
                    className="text-sm text-blue-600 hover:text-blue-800 p-0 h-auto"
                    onClick={() => {
                      setIsLoadingResetPassword(true);
                      // Adiciona um pequeno delay para o preloader ser visível antes da navegação
                      setTimeout(() => {
                        navigate("/esqueci-senha");
                      }, 300);
                    }}
                    disabled={isLoadingResetPassword}
                    tabIndex={2} // Tabindex alto para que o Enter não priorize este botão
                  >
                    {isLoadingResetPassword ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Abrindo...
                      </>
                    ) : (
                      "Esqueceu a senha?"
                    )}
                  </Button>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-14 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md mt-4"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </Form>
          )}
        </div>
        
        {/* Footer mais compacto e que não requer scroll */}
        <div className="text-center w-full mb-6 mt-8">
          <p className="text-gray-600 text-sm mb-2">
            Ainda não tem uma conta?{" "}
            <Button 
              variant="link" 
              className="font-medium text-blue-600 hover:text-blue-800 p-0 h-auto"
              onClick={() => {
                setIsNavigating(true);
                setTimeout(() => {
                  navigate("/cadastre-se");
                }, 100);
              }}
              disabled={isNavigating}
            >
              {isNavigating ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Abrindo...
                </span>
              ) : (
                "Cadastre-se grátis"
              )}
            </Button>
          </p>
          <TermosPrivacidadeButtons />
        </div>
      </div>
    </div>
  );
}