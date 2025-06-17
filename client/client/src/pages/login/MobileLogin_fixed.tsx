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
      toast({
        title: "Erro de autenticação",
        description: error.message || "Falha ao fazer login. Verifique suas credenciais.",
        variant: "destructive",
      });
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
      {/* Fundo com gradiente mais vibrante */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-indigo-50 to-white z-0"></div>
      
      {/* Padrão geométrico estilizado */}
      <div className="absolute inset-0 opacity-10 z-0" style={{
        backgroundImage: `linear-gradient(135deg, rgba(79, 70, 229, 0.4) 25%, transparent 25%), 
                          linear-gradient(225deg, rgba(79, 70, 229, 0.4) 25%, transparent 25%), 
                          linear-gradient(45deg, rgba(79, 70, 229, 0.4) 25%, transparent 25%), 
                          linear-gradient(315deg, rgba(79, 70, 229, 0.4) 25%, transparent 25%)`,
        backgroundPosition: '10px 0, 10px 0, 0 0, 0 0',
        backgroundSize: '20px 20px',
        backgroundRepeat: 'repeat'
      }}></div>
      
      {/* Elementos decorativos no fundo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        {/* Efeito de luz superior */}
        <div className="absolute -top-20 right-0 w-80 h-80 rounded-full bg-gradient-to-br from-blue-300 to-indigo-300 opacity-30 blur-3xl"></div>
        
        {/* Efeito de luz inferior */}
        <div className="absolute -bottom-10 -left-10 w-72 h-72 rounded-full bg-gradient-to-tr from-indigo-300 to-purple-300 opacity-30 blur-3xl"></div>
        
        {/* Elementos flutuantes */}
        <div className="absolute top-20 right-8 w-8 h-8 rounded bg-gradient-to-br from-blue-400 to-blue-500 opacity-40 blur-sm animate-float"></div>
        <div className="absolute bottom-40 left-10 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 opacity-40 blur-sm animate-float" style={{animationDelay: '1.5s', animationDuration: '5s'}}></div>
        <div className="absolute top-1/3 left-6 w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 opacity-40 blur-sm animate-float" style={{animationDelay: '0.7s', animationDuration: '7s'}}></div>
        <div className="absolute top-1/2 right-10 w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-indigo-400 opacity-40 blur-sm animate-float" style={{animationDelay: '2.2s', animationDuration: '6s'}}></div>
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
                  <a href="/recuperar-senha" className="text-sm text-blue-600 hover:text-blue-800">
                    Esqueceu a senha?
                  </a>
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
            <a href="/cadastro" className="font-medium text-blue-600 hover:text-blue-800">
              Cadastre-se grátis
            </a>
          </p>
          <div className="flex items-center justify-center space-x-4">
            <a href="/termos" className="text-xs text-gray-500 hover:text-gray-700">
              Termos de Uso
            </a>
            <span className="text-gray-400">|</span>
            <a href="/privacidade" className="text-xs text-gray-500 hover:text-gray-700">
              Política de Privacidade
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}