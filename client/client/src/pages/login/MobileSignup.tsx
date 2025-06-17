import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Lock, Loader2, ArrowLeft, Eye, EyeOff, Check } from "lucide-react";
import LogoMobile from "@/assets/images/logo/webp/negativoo.webp";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import TermosPrivacidadeButtons from "@/components/TermosPrivacidadeButtons";
import { formatName } from "@/lib/utils";
import "./style-overrides.css";

const signupSchema = z.object({
  name: z.string()
    .min(2, { message: "Nome deve ter pelo menos 2 caracteres" })
    .max(100, { message: "Nome muito longo" }),
  email: z.string()
    .email({ message: "Por favor, insira um endereço de e-mail válido" })
    .max(100, { message: "E-mail muito longo" }),
  password: z.string()
    .min(8, { message: "Mínimo de 8 caracteres" })
    .max(50, { message: "Senha muito longa" })
    .regex(/[a-z]/, { message: "Falta uma letra minúscula" })
    .regex(/[A-Z]/, { message: "Falta uma letra maiúscula" })
    .regex(/[0-9]/, { message: "Falta um número" })
    .regex(/[!@#$%^&*(),.?":{}|<>]/, { message: "Falta um caractere especial" }),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Você precisa aceitar os termos de uso",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"]
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function MobileSignup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [isPageReady, setIsPageReady] = useState(false);
  const isComponentMounted = useRef(true);
  
  // Prevenir qualquer atualização de estado após o componente ser montado
  useEffect(() => {
    // Desativar todas as verificações periódicas da splash screen e outras verificações
    // que possam estar causando piscadas ou recargas na tela
    if (window) {
      // Desativar qualquer verificação periódica global
      const allIntervals = [];
      const originalSetInterval = window.setInterval;
      const originalSetTimeout = window.setTimeout;
      const originalClearInterval = window.clearInterval;
      
      // Capturar todos os intervalos existentes e limpá-los
      const existingIntervalId = window.setInterval(() => {}, 100000);
      for (let i = 1; i < existingIntervalId; i++) {
        window.clearInterval(i);
      }
      
      // Sobrescrever setInterval para controlar os intervalos criados
      window.setInterval = function(fn, delay, ...args) {
        if (delay < 1000) delay = 1000; // Forçar intervalos a serem pelo menos 1 segundo
        const id = originalSetInterval(fn, delay, ...args);
        allIntervals.push(id);
        return id;
      };
      
      // Sobrescrever setTimeout para evitar timeouts muito curtos
      window.setTimeout = function(fn, delay, ...args) {
        if (delay < 100) delay = 100; // Forçar timeouts mínimos
        return originalSetTimeout(fn, delay, ...args);
      };
      
      // Marcar que componente foi montado
      document.documentElement.style.overflowX = 'hidden';
      
      // Configurações específicas para o splash screen
      if (window.sessionStorage) {
        // Desativar verificações do splash
        sessionStorage.setItem('skipSplashCheck', 'true');
        sessionStorage.setItem('skipContentDetection', 'true');
      }
    }
    
    // Pré-carregar a imagem logo para garantir que esteja pronta
    const img = new Image();
    img.src = LogoMobile;
    img.onload = () => {
      // Quando a imagem carregar, mostrar o conteúdo
      if (isComponentMounted.current) {
        setIsPageReady(true);
      }
    };
    
    // Timeout de segurança para garantir que a página seja exibida mesmo se a imagem falhar
    const timer = setTimeout(() => {
      if (isComponentMounted.current) {
        setIsPageReady(true);
      }
    }, 800);
    
    // Limpeza adequada quando componente for desmontado
    return () => {
      isComponentMounted.current = false;
      clearTimeout(timer);
      document.documentElement.style.overflowX = '';
    };
  }, []);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false
    }
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      // Formatar o nome antes de enviar
      const formattedName = formatName(data.name);
      
      // Realizar o cadastro através da API
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formattedName, // Usando o nome formatado como username
          email: data.email,
          password: data.password
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Ocorreu um erro durante o cadastro');
      }
      
      // Armazenar o email registrado para a tela de confirmação
      setRegisteredEmail(data.email);
      
      // Mostrar a tela de confirmação
      setEmailVerificationSent(true);
      
      // Limpar quaisquer dados armazenados localmente que poderiam indicar autenticação
      localStorage.removeItem('userData');
      localStorage.removeItem('user');
      sessionStorage.removeItem('authenticated');
      
      // Limpar cookies de sessão
      document.cookie.split(";").forEach(cookie => {
        const cookieName = cookie.trim().split("=")[0];
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
      
      // Mensagem de sucesso mais clara sobre a necessidade de verificação
      toast({
        title: "Conta criada com sucesso!",
        description: "Enviamos um email de confirmação para você. Por favor, verifique seu email para ativar sua conta antes de fazer login.",
        variant: "default"
      });
    } catch (error) {
      console.error("Erro no cadastro:", error);
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: error instanceof Error ? error.message : "Não foi possível criar sua conta. Tente novamente."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Componente de confirmação de email - integrado ao layout da página
  const EmailVerificationContent = () => {
    return (
      <div className="w-full max-w-md bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100">
        <div className="flex flex-col items-center space-y-4 text-center py-4">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-blue-700">Verifique seu e-mail</h2>
          <p className="text-gray-600">
            Enviamos um link de confirmação para <span className="font-medium">{registeredEmail}</span>
          </p>
          <p className="text-sm text-gray-500">
            Por favor, verifique sua caixa de entrada e clique no link de confirmação para ativar sua conta.
          </p>
        </div>
        
        <div className="pt-4 space-y-4">
          <Button 
            variant="default" 
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md" 
            onClick={() => navigate("/acessar")}
          >
            Ir para página de login
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl" 
            onClick={async () => {
              try {
                setIsLoading(true);
                const response = await fetch('/api/resend-verification', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ email: registeredEmail }),
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                  toast({
                    title: "Email reenviado",
                    description: "Enviamos um novo link de confirmação para seu email.",
                  });
                } else {
                  throw new Error(result.message || "Não foi possível reenviar o email");
                }
              } catch (error) {
                console.error("Erro ao reenviar email:", error);
                toast({
                  variant: "destructive",
                  title: "Falha ao reenviar",
                  description: error instanceof Error ? error.message : "Ocorreu um erro ao reenviar o email de verificação.",
                });
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reenviando...
              </>
            ) : (
              "Reenviar email de confirmação"
            )}
          </Button>
        </div>
      </div>
    );
  };

  // Removendo o estilo inline e utilizando apenas as classes CSS

  return (
    <div className="mobile-form-container">
      {/* Overlay de carregamento com CSS */}
      <div className={`loading-overlay ${isPageReady ? 'hidden' : ''}`}></div>
      
      {/* Estabilizador para evitar recargas periódicas */}
      <div className="stabilizer"></div>
      
      {/* Fundo e elementos decorativos fixos */}
      <div className="fixed-bg-elements">
        {/* Fundo com gradiente */}
        <div className="fixed inset-0 bg-gradient-to-b from-blue-50 to-white z-0 bg-decorative"></div>
        
        {/* Elemento decorativo superior */}
        <div className="fixed top-0 w-full h-1/3 overflow-hidden z-0 bg-decorative">
          <svg className="absolute top-0 left-0 right-0 opacity-20" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path fill="#4f46e5" d="M0,0 C40,33 60,33 100,0 L100,20 C60,53 40,53 0,20 Z"></path>
            <path fill="#4338ca" d="M0,0 C40,33 60,33 100,0 L100,10 C60,43 40,43 0,10 Z" opacity="0.5"></path>
          </svg>
        </div>
        
        {/* Elemento decorativo inferior */}
        <div className="fixed bottom-0 w-full h-1/4 overflow-hidden z-0 bg-decorative">
          <svg className="absolute bottom-0 left-0 right-0 opacity-10" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{transform: 'rotate(180deg)'}}>
            <path fill="#4f46e5" d="M0,0 C40,33 60,33 100,0 L100,20 C60,53 40,53 0,20 Z"></path>
          </svg>
        </div>
        
        {/* Efeito de brilho suave */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 bg-decorative">
          <div className="fixed -top-40 right-0 w-96 h-96 rounded-full bg-gradient-to-br from-blue-200 to-indigo-200 opacity-25 blur-3xl"></div>
          <div className="fixed -bottom-40 -left-20 w-96 h-96 rounded-full bg-gradient-to-tr from-indigo-200 to-purple-200 opacity-20 blur-3xl"></div>
        </div>
      </div>

      {/* Header - Logo */}
      <div className="flex-shrink-0 pt-10 px-4 text-center relative z-10">
        <img src={LogoMobile} alt="Logo" className="h-20 mx-auto" />
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-0 mt-8 relative z-10">
        {/* Título centralizado */}
        <div className="w-full text-center mb-4">
          <h2 className="text-2xl font-bold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-800">
            {emailVerificationSent ? "Verificação de Email" : "Crie sua conta"}
          </h2>
          <p className="text-gray-600 text-sm px-4 max-w-xs mx-auto">
            {emailVerificationSent 
              ? "Verifique seu email para ativar sua conta" 
              : "Cadastre-se para descobrir todas as ferramentas"
            }
          </p>
        </div>

        {/* Card com formulário ou tela de verificação */}
        {emailVerificationSent ? (
          <EmailVerificationContent />
        ) : (
          <div className="w-full max-w-md bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            className="h-14 pl-10 text-base rounded-xl"
                            placeholder="Seu nome completo"
                            autoComplete="name"
                          />
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            className="h-14 pl-10 text-base rounded-xl"
                            placeholder="seu@email.com"
                            type="email"
                            autoComplete="email"
                          />
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        </div>
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
                            {...field}
                            className="h-14 pl-10 pr-10 text-base rounded-xl"
                            type={showPassword ? "text" : "password"}
                            placeholder="Sua senha segura"
                            autoComplete="new-password"
                          />
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            className="h-14 pl-10 pr-10 text-base rounded-xl"
                            type={showPassword ? "text" : "password"}
                            placeholder="Confirme sua senha"
                            autoComplete="new-password"
                          />
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm text-gray-700">
                          Eu li e aceito os{" "}
                          <Button variant="link" className="h-auto p-0 text-blue-600">
                            termos de uso
                          </Button>{" "}
                          e a{" "}
                          <Button variant="link" className="h-auto p-0 text-blue-600">
                            política de privacidade
                          </Button>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full h-14 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Criando conta...
                    </span>
                  ) : (
                    "Criar conta"
                  )}
                </Button>
              </form>
            </Form>
          </div>
        )}

        {/* Footer - só mostra quando não estiver na tela de verificação de email */}
        {!emailVerificationSent && (
          <div className="text-center w-full mb-6 mt-8">
            <Button
              variant="link"
              className="text-gray-600 text-sm hover:text-gray-800 flex items-center justify-center mx-auto mb-2"
              onClick={() => {
                setIsNavigating(true);
                navigate("/acessar");
              }}
              disabled={isNavigating}
            >
              {isNavigating ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Voltando...
                </span>
              ) : (
                <>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para login
                </>
              )}
            </Button>
            <TermosPrivacidadeButtons />
          </div>
        )}
      </div>
    </div>
  );
}