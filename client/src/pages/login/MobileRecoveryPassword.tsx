import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, ArrowLeft, ChevronRight, Check } from "lucide-react";
import LogoMobile from "@/assets/images/logo/webp/negativoo.webp";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import TermosPrivacidadeButtons from "@/components/TermosPrivacidadeButtons";

// Schema de validação para recuperação de senha
const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um endereço de e-mail válido" }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function MobileRecoveryPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Inicializar formulário
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ""
    }
  });

  // Função para enviar o formulário
  const onSubmit = async (data: ForgotPasswordFormValues) => {
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
        // Marcar como enviado
        setEmailEnviado(true);
        
        toast({
          title: "E-mail enviado",
          description: "Se o e-mail existir em nossa base, instruções para redefinição de senha serão enviadas.",
          variant: "default"
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
        title: "Erro",
        description: "Não foi possível enviar o e-mail de recuperação. Tente novamente mais tarde."
      });
    } finally {
      setIsLoading(false);
    }
  };

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

      {/* Header - Logo no mesmo tamanho e posição do login */}
      <div className="flex-shrink-0 pt-10 px-4 text-center relative z-10">
        <img src={LogoMobile} alt="Logo" className="h-20 mx-auto" />
      </div>

      {/* Conteúdo principal - centralizado entre topo e rodapé */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-0 -mt-6 relative z-10">
        {/* Título e Subtítulo */}
        <div className="text-center mb-4 w-full">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-800">Recuperar Senha</h1>
          <p className="text-sm text-gray-600 mt-1 px-4 max-w-xs mx-auto">
            Digite seu e-mail para enviarmos as instruções de recuperação
          </p>
        </div>
        
        {/* Formulário */}
        <div className="w-full max-w-md bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100 animate-fadeSlideUp">
          {emailEnviado ? (
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
              
              <div className="pt-2 w-full">
                <Button 
                  onClick={() => {
                    setIsNavigating(true);
                    setTimeout(() => {
                      navigate("/acessar");
                    }, 100);
                  }}
                  disabled={isNavigating}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md flex items-center justify-center"
                >
                  {isNavigating ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Redirecionando...
                    </span>
                  ) : (
                    <>
                      Voltar para o login
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 text-sm font-medium">E-mail</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            className="pl-10 h-11 border-gray-300 bg-white/70 focus:border-blue-500 focus:ring-blue-500/20"
                            placeholder="seu@email.com"
                            autoComplete="email"
                            type="email"
                          />
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs font-medium" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-md flex items-center justify-center mt-4"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Enviando...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      Enviar Instruções
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            </Form>
          )}
          
          </div>
          
          {/* Botão de voltar e termos logo abaixo do formulário */}
          <div className="mt-4 text-center relative z-10">
            <Button
              variant="link"
              className="text-gray-600 text-sm hover:text-gray-800 flex items-center justify-center mx-auto"
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

            {/* Termos e Política agora abaixo do formulário */}
            <div className="mt-2 relative z-10">        
              <TermosPrivacidadeButtons />
            </div>
          </div>
      </div>
      
      {/* Espaço vazio para preencher parte inferior da tela */}
      <div className="flex-shrink-0 h-8 relative z-10"></div>
    </div>
  );
}