import { useState, useEffect } from "react";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Building, ChevronRight, ChevronLeft, ArrowLeft, Loader2, Check, ShieldCheck, Lock, Mail } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import LogoDesktop from "@/assets/images/logo/webp/Negativo.webp";
import LogoMobile from "@/assets/images/logo/webp/negativoo.webp"; // Agora usando a versão rosa da logo para versão mobile
import TermosPrivacidadeButtons from "@/components/TermosPrivacidadeButtons";

// Schema de validação para recuperação de senha
const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um endereço de e-mail válido" }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// Função para detectar se estamos em um dispositivo móvel
function detectMobile() {
  if (typeof window !== 'undefined') {
    return window.innerWidth < 768;
  }
  return false;
}

export default function ForgotPasswordPage() {
  // Verificar se é um dispositivo móvel
  const [isMobile, setIsMobile] = useState(detectMobile);
  
  // Atualizar estado quando o tamanho da janela muda
  useEffect(() => {
    const handleResize = () => setIsMobile(detectMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [verificado, setVerificado] = useState(false);
  
  // Verificar se o usuário está logado e redirecionar para o dashboard
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Se o usuário estiver autenticado, não renderizar nada e redirecionar imediatamente
  if (isAuthenticated && !verificado) {
    console.log("Usuário já está logado, redirecionando para dashboard...");
    window.location.href = "/dashboard";
    return null; // Não renderiza nada enquanto redireciona
  }
  
  // Efeito para marcar como verificado quando sabemos que o usuário não está autenticado
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setVerificado(true);
    }
  }, [isAuthenticated, authLoading]);
  
  // Resetar o scroll para o topo quando a página é carregada
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    }
  });

  async function onSubmit(data: ForgotPasswordFormValues) {
    setIsLoading(true);

    try {
      // Enviar solicitação para a API
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setEmailEnviado(true);
        toast({
          title: "E-mail enviado",
          description: "Se o e-mail existir em nossa base, instruções para redefinição de senha serão enviadas.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao processar solicitação",
          description: result.message || "Não foi possível enviar o e-mail. Por favor, tente novamente.",
        });
      }
    } catch (error) {
      console.error("Erro ao solicitar recuperação de senha:", error);
      toast({
        variant: "destructive",
        title: "Erro ao processar solicitação",
        description: "Não foi possível enviar o e-mail. Por favor, tente novamente mais tarde.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Se for mobile, renderizar o componente MobileRecoveryPassword
  if (isMobile) {
    // Importar dinamicamente sem mostrar indicador de carregamento
    const MobileRecoveryPassword = React.lazy(() => import('./MobileRecoveryPassword'));
    
    return (
      <React.Suspense fallback={<div style={{ display: 'none' }}></div>}>
        <MobileRecoveryPassword />
      </React.Suspense>
    );
  }
  
  // Versão desktop original
  return (
    <div className="h-screen bg-white flex flex-col md:flex-row overflow-hidden">
      {/* Seção de apresentação - à esquerda */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 xl:w-2/3 2xl:w-3/4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-purple-600 to-blue-600"></div>
        <div className="absolute inset-0 opacity-20" style={{ 
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" 
        }}></div>
        <div className="absolute inset-0 opacity-20" style={{ 
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" 
        }}></div>

        <div className="relative w-full h-full z-10 flex items-center justify-center">
          <div className="w-full flex flex-col justify-center items-center p-4 md:p-4 lg:p-5">
            {/* Logo e marca - versão desktop */}
            <div className="flex flex-col items-center mb-2 md:mb-3">
              <img src={LogoDesktop} alt="Meu Preço Certo" className="h-10 md:h-14 lg:h-16 xlarge:h-20 2xl:h-24 mb-1" />
            </div>

            {/* Conteúdo central destacado */}
            <div className="max-w-md lg:max-w-lg xl:max-w-xl">
              <div className="flex items-center justify-center mb-2 md:mb-3">
                <div className="px-2 py-1 md:px-3 md:py-1 rounded-full bg-white/20 text-white text-xs md:text-sm font-medium backdrop-blur-sm">
                  Recuperação segura de acesso
                </div>
              </div>

              <h2 className="text-lg md:text-xl lg:text-2xl xlarge:text-3xl 2xl:text-4xl font-bold text-center text-white mb-2 md:mb-3 lg:mb-4">
                Recupere o acesso a sua
                <span className="bg-gradient-to-r from-yellow-300 to-amber-500 bg-clip-text text-transparent">
                  {" "}conta 
                </span>
              </h2>

              {/* Simulação visual do processo de recuperação - Versão compacta para telas menores */}
              <div className="w-full bg-white rounded-xl shadow-xl p-3 md:p-4 mb-3">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm md:text-base font-bold">Processo de recuperação</h3>
                  <div className="text-[10px] md:text-xs bg-blue-100 text-blue-800 px-1.5 py-1.5 rounded-full font-medium">Seguro</div>
                </div>

                {/* Etapas do processo de recuperação - Simplificado */}
                <div className="space-y-2.5 w-full max-w-full">
                  <div className="flex items-start w-full">
                    <div className="flex-shrink-0 bg-primary text-white h-5 w-5 rounded-full flex items-center justify-center mr-1.5">
                      1
                    </div>
                    <div className="flex-grow">
                      <div className="font-medium text-[15px] text-xs">Solicitação de redefinição</div>
                      <div className="text-[15px] text-gray-600">Informe o e-mail cadastrado</div>
                    </div>
                  </div>

                  <div className="w-px h-1.5 bg-gray-200 ml-2.5"></div>

                  <div className="flex items-start w-full opacity-75">
                    <div className="flex-shrink-0 bg-gray-300 text-white h-5 w-5 rounded-full flex items-center justify-center mr-1.5">
                      2
                    </div>
                    <div className="flex-grow">
                      <div className="font-medium text-[15px]text-xs">Acesso ao link</div>
                      <div className="text-[15px] text-gray-600">Abra o e-mail e siga o link</div>
                    </div>
                  </div>

                  <div className="w-px h-1.5 bg-gray-200 ml-2.5"></div>

                  <div className="flex items-start w-full opacity-50">
                    <div className="flex-shrink-0 bg-gray-300 text-white h-5 w-5 rounded-full flex items-center justify-center mr-1.5">
                      3
                    </div>
                    <div className="flex-grow">
                      <div className="font-medium text-[15px]text-xs">Nova senha</div>
                      <div className="text-[15px] text-gray-600">Defina sua nova senha</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de formulário - à direita */}
      <div className="w-full md:w-1/2 lg:w-2/5 xl:w-1/3 2xl:w-1/4 p-3 md:p-5 lg:p-6 flex flex-col justify-center bg-white">
        <div className="mx-auto w-full max-w-md py-2">
          {/* Logo e cabeçalho (visível apenas em mobile) */}
          <div className="md:hidden text-center mb-4 mt-4">
            <img src={LogoMobile} alt="Meu Preço Certo" className="h-10 mx-auto mb-2" />
          </div>

          {/* Espaço para manter o alinhamento */}
          <div className="h-[24px]"></div>

          {/* Título e subtítulo */}
          <div className="mb-3">
            <h2 className="text-xl font-bold mb-1 text-gray-900">Esqueceu sua senha?</h2>
            <div className="text-gray-600 text-xs">
              <span>Recupere o acesso a sua conta em instantes.</span>
            </div>
          </div>

          {emailEnviado ? (
            <div className="w-full max-w-md bg-white bg-opacity-95 backdrop-blur-sm rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex flex-col items-center space-y-4 text-center py-2">
                <div className="w-16 h-16 flex items-center justify-center rounded-full bg-green-100">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-blue-700">Verifique seu e-mail</h2>
                <p className="text-gray-600">
                  Enviamos um link de recuperação para <span className="font-medium">{form.getValues().email}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Por favor, verifique sua caixa de entrada e clique no link para redefinir sua senha.
                </p>
              </div>
              
              <div className="pt-4 space-y-4">
                <Button 
                  variant="default" 
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md flex items-center justify-center" 
                  onClick={() => navigate("/acessar")}
                >
                  <ChevronLeft className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  Voltar para o Login
                </Button>
              </div>
            </div>
          ) : (
            /* Formulário de recuperação de senha */
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                       <FormLabel className="text-gray-700 font-medium text-xs">E-mail</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className={`h-8 rounded-md border-gray-300 focus:border-primary focus:ring focus:ring-primary/20 ${
                            form.formState.errors.email ? 'border-red-500 ring ring-red-200' : ''
                          }`}
                          placeholder="seu@email.com"
                          autoComplete="email"
                          type="email"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-medium" />
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
                      Processando...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      Enviar instruções
                      <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  )}
                </Button>
              </form>
            </Form>
          )}

          {/* Rodapé */}
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