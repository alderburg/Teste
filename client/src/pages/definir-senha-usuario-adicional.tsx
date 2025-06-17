
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, CheckCircle, Loader2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import LogoDesktop from "@/assets/images/logo/webp/Negativo.webp";

// Schema de validação para definir senha
const definePasswordSchema = z.object({
  password: z.string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "Senha deve conter pelo menos um caractere especial"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type DefinePasswordFormValues = z.infer<typeof definePasswordSchema>;

export default function DefinirSenhaUsuarioAdicionalPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [userName, setUserName] = useState<string>("");

  // Obter o token da URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  useEffect(() => {
    if (!token) {
      toast({
        variant: "destructive",
        title: "Token inválido",
        description: "Link de definição de senha inválido ou expirado.",
      });
      navigate("/acessar");
      return;
    }

    // Verificar se o token é válido
    const verifyToken = async () => {
      try {
        const response = await fetch('/api/verify-additional-user-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
          setTokenValid(true);
          setUserName(result.userName || "");
        } else {
          setTokenValid(false);
          toast({
            variant: "destructive",
            title: "Token inválido",
            description: result.message || "Link de definição de senha inválido ou expirado.",
          });
          setTimeout(() => navigate("/acessar"), 3000);
        }
      } catch (error) {
        console.error("Erro ao verificar token:", error);
        setTokenValid(false);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao verificar o link. Tente novamente.",
        });
        setTimeout(() => navigate("/acessar"), 3000);
      }
    };

    verifyToken();
  }, [token, navigate, toast]);

  const form = useForm<DefinePasswordFormValues>({
    resolver: zodResolver(definePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    }
  });

  async function onSubmit(data: DefinePasswordFormValues) {
    if (!token) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Token não encontrado.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/set-additional-user-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token, 
          password: data.password 
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Senha definida com sucesso!",
          description: "Sua senha foi definida. Agora você pode fazer login.",
        });
        
        // Redirecionar para a página de login após 2 segundos
        setTimeout(() => {
          navigate("/acessar");
        }, 2000);
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao definir senha",
          description: result.message || "Não foi possível definir a senha. Tente novamente.",
        });
      }
    } catch (error) {
      console.error("Erro ao definir senha:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao definir senha. Tente novamente mais tarde.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Mostrar loading enquanto verifica o token
  if (tokenValid === null) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Verificando link...</p>
        </div>
      </div>
    );
  }

  // Mostrar erro se o token for inválido
  if (tokenValid === false) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-gray-900">Link Inválido</h2>
          <p className="text-gray-600 mb-4">
            O link para definir senha é inválido ou expirou. Entre em contato com o administrador para receber um novo link.
          </p>
          <Button onClick={() => navigate("/acessar")} className="w-full">
            Ir para Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex flex-col md:flex-row overflow-hidden">
      {/* Seção de apresentação - à esquerda */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 xl:w-2/3 2xl:w-3/4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-purple-600 to-blue-600"></div>
        <div className="absolute inset-0 opacity-20" style={{ 
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" 
        }}></div>

        <div className="relative w-full h-full z-10 flex items-center justify-center">
          <div className="w-full flex flex-col justify-center items-center p-4 md:p-4 lg:p-5">
            {/* Logo e marca */}
            <div className="flex flex-col items-center mb-2 md:mb-3">
              <img src={LogoDesktop} alt="Meu Preço Certo" className="h-10 md:h-14 lg:h-16 xlarge:h-20 2xl:h-24 mb-1" />
            </div>

            {/* Conteúdo central */}
            <div className="max-w-md lg:max-w-lg xl:max-w-xl text-center">
              <div className="flex items-center justify-center mb-2 md:mb-3">
                <div className="px-2 py-1 md:px-3 md:py-1 rounded-full bg-white/20 text-white text-xs md:text-sm font-medium backdrop-blur-sm">
                  Definição de senha
                </div>
              </div>

              <h2 className="text-lg md:text-xl lg:text-2xl xlarge:text-3xl 2xl:text-4xl font-bold text-center text-white mb-2 md:mb-3 lg:mb-4">
                Defina sua senha de
                <span className="bg-gradient-to-r from-yellow-300 to-amber-500 bg-clip-text text-transparent">
                  {" "}acesso
                </span>
              </h2>

              <p className="text-white/80 text-sm md:text-base">
                {userName && `Olá, ${userName}! `}
                Crie uma senha segura para acessar sua conta.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de formulário - à direita */}
      <div className="w-full md:w-1/2 lg:w-2/5 xl:w-1/3 2xl:w-1/4 p-3 md:p-5 lg:p-6 flex flex-col justify-center bg-white">
        <div className="mx-auto w-full max-w-md py-2">
          {/* Logo (visível apenas em mobile) */}
          <div className="md:hidden text-center mb-4 mt-4">
            <img src={LogoDesktop} alt="Meu Preço Certo" className="h-10 mx-auto mb-2" />
          </div>

          <div className="h-[24px]"></div>

          {/* Título */}
          <div className="mb-3">
            <h2 className="text-xl font-bold mb-1 text-gray-900">Definir Senha</h2>
            <div className="text-gray-600 text-xs">
              <span>Crie uma senha segura para sua conta.</span>
            </div>
          </div>

          {/* Formulário */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium text-xs">Nova Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          className={`h-8 rounded-md border-gray-300 focus:border-primary focus:ring focus:ring-primary/20 pr-10 ${
                            form.formState.errors.password ? 'border-red-500 ring ring-red-200' : ''
                          }`}
                          placeholder="Digite sua nova senha"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-[10px] font-medium" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium text-xs">Confirmar Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          className={`h-8 rounded-md border-gray-300 focus:border-primary focus:ring focus:ring-primary/20 pr-10 ${
                            form.formState.errors.confirmPassword ? 'border-red-500 ring ring-red-200' : ''
                          }`}
                          placeholder="Confirme sua nova senha"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-[10px] font-medium" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-9 bg-primary hover:bg-primary/90 text-white font-semibold rounded-md flex items-center justify-center group mt-4 text-sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Definindo senha...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Definir Senha
                  </span>
                )}
              </Button>
            </form>
          </Form>

          {/* Rodapé */}
          <div className="mt-6 text-center text-gray-500 text-[10px]">
            <p>© {new Date().getFullYear()} Meu Preço Certo. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
