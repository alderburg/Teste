import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, ShieldCheck, Loader2 } from "lucide-react";

/**
 * Página dedicada para verificação 2FA
 * Usada quando um usuário com 2FA ativado tenta acessar uma página protegida sem ter verificado o código
 */
export default function VerificarTwoFactorPage() {
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  
  // Mensagens de status para o usuário
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Forçar remoção de splash imediatamente antes de qualquer verificação
  useEffect(() => {
    // Ocultar splash screen imediatamente
    const splash = document.getElementById('splash-screen');
    if (splash) {
      console.log("Removendo splash screen imediatamente");
      splash.style.opacity = '0';
      // Remover instantaneamente, sem delay
      splash.style.display = 'none';
    }
  }, []);

  // Verificar se precisamos mostrar a tela de verificação 2FA ou redirecionar 
  // Este useEffect otimizado faz apenas uma verificação eficiente
  useEffect(() => {
    // VERIFICAÇÃO PRELIMINAR - LOCAL STORAGE
    // Verificar se o usuário tem dados básicos de login antes de fazer requisições
    const userData = localStorage.getItem('userData');
    if (!userData) {
      // Se não temos dados no localStorage, usuário não está logado
      setStatusMessage("Você não está logado! Redirecionando para tela de login...");
      
      // Mostrar a mensagem no splash screen em vez de no card
      const authRedirectMessage = document.getElementById('auth-redirect-message');
      if (authRedirectMessage) {
        authRedirectMessage.style.opacity = "1";
        authRedirectMessage.innerHTML = "Você não está logado!";
        
        // Após 2 segundos, mudar para mensagem de redirecionamento
        setTimeout(function() {
          authRedirectMessage.innerHTML = "Redirecionando para tela de login...";
        }, 2000);
      }
      
      localStorage.removeItem('twoFactorRedirect');
      
      // Redirecionar após um breve atraso para permitir que o usuário veja a mensagem
      setTimeout(() => setLocation('/acessar'), 4000);
      return;
    }
    
    // VERIFICAÇÃO NO SERVIDOR - OTIMIZADA
    const verificarStatus = async () => {
      try {
        // Incluir cache-busting para garantir resposta atualizada
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/auth/2fa-session-status?t=${timestamp}`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          },
          // Definir um timeout curto para não atrasar a renderização
          signal: AbortSignal.timeout(2000)
        });
        
        if (!response.ok) {
          throw new Error(`Erro ${response.status}`);
        }
        
        const statusData = await response.json();
        
        // CASO 1: Usuário não autenticado
        if (!statusData.authenticated) {
          setStatusMessage("Sessão expirada! Redirecionando para tela de login...");
          localStorage.removeItem('userData');
          localStorage.removeItem('twoFactorRedirect');
          setTimeout(() => window.location.href = '/acessar', 500);
          return;
        }
        
        // CASO 2: 2FA já verificado ou não necessário
        if (!statusData.requiresVerification) {
          // Mostrar mensagem ao usuário que já está verificado
          setStatusMessage("Usuário já logado e verificado! Redirecionando para sua dashboard...");
          setSucesso(true);
          
          // Mostrar a mensagem no splash screen em vez de no card
          const splash = document.getElementById('splash-screen');
          if (splash) {
            splash.style.opacity = '1'; // Exibir o splash novamente
            splash.style.display = 'flex';
          }
          
          // Mostrar mensagem no splash screen
          const authRedirectMessage = document.getElementById('auth-redirect-message');
          if (authRedirectMessage) {
            authRedirectMessage.style.opacity = "1";
            authRedirectMessage.innerHTML = "Usuário já logado e verificado!";
            
            // Após 2 segundos, mudar para mensagem de redirecionamento
            setTimeout(function() {
              authRedirectMessage.innerHTML = "Redirecionando para sua dashboard...";
            }, 2000);
          }
          
          // Determinar destino do redirecionamento na ordem:
          // 1. localStorage, 2. URL param, 3. dashboard
          const savedRedirect = localStorage.getItem('twoFactorRedirect');
          
          // Definir timeout para dar tempo do usuário ver a mensagem
          setTimeout(() => {
            if (savedRedirect) {
              localStorage.removeItem('twoFactorRedirect');
              setRedirectTo(savedRedirect);
              window.location.href = savedRedirect;
              return;
            }
            
            const urlParams = new URLSearchParams(window.location.search);
            const redirectParam = urlParams.get('redirect');
            if (redirectParam) {
              const decodedUrl = decodeURIComponent(redirectParam);
              setRedirectTo(decodedUrl);
              window.location.href = decodedUrl;
              return;
            }
            
            // Padrão: dashboard
            setRedirectTo('/dashboard');
            window.location.href = '/dashboard';
          }, 4000); // Aumentado para 4 segundos para dar mais tempo para o usuário ler as mensagens
          return;
        }
        
        // CASO 3: 2FA necessário - mostramos o formulário
        // (não fazemos nada, o formulário já é renderizado por padrão)
      } catch (error) {
        // Em caso de erro, continuamos mostrando o formulário
        // Isso evita redirecionamentos desnecessários
        console.error("Erro ao verificar status 2FA:", error);
      }
    };
    
    // Iniciar verificação imediatamente
    verificarStatus();
  }, [setLocation]);

  // Lógica de verificação otimizada
  // O segundo useEffect foi removido, pois estava causando chamadas duplicadas
  // A verificação principal já é feita no useEffect anterior
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    
    try {
      // Adicionar timestamp para evitar cache
      const timestamp = new Date().getTime();
      
      // Enviar código para verificação com timeout para evitar esperas longas
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`/api/auth/verify-2fa?t=${timestamp}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ code: codigo }),
        credentials: 'include',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSucesso(true);
        toast({
          title: "Verificação concluída",
          description: "Autenticação de dois fatores verificada com sucesso.",
          variant: "default",
        });
        
        // Redirecionar para a página salva anteriormente ou dashboard
        // Reduzido o tempo de espera para melhorar a experiência
        setTimeout(() => {
          // Verificar destinos de redirecionamento na ordem: localStorage > URL param > dashboard
          const savedRedirect = localStorage.getItem('twoFactorRedirect');
          if (savedRedirect) {
            console.log("Redirecionando para:", savedRedirect);
            localStorage.removeItem('twoFactorRedirect');
            window.location.href = savedRedirect;
            return;
          }
          
          if (redirectTo) {
            console.log("Redirecionando para URL:", redirectTo);
            window.location.href = decodeURIComponent(redirectTo);
            return;
          }
          
          // Padrão: dashboard
          console.log("Redirecionando para dashboard");
          window.location.href = '/dashboard';
          
        }, 1000); // Reduzido de 1500ms para 1000ms
      } else {
        setErro(data.message || 'Código inválido. Por favor, tente novamente.');
      }
    } catch (error) {
      // Se for um erro de timeout, exibir mensagem específica
      if (error instanceof DOMException && error.name === 'AbortError') {
        setErro('Tempo limite esgotado. Por favor, tente novamente.');
      } else {
        console.error('Erro durante verificação 2FA:', error);
        setErro('Ocorreu um erro durante a verificação. Por favor, tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Renderização imediata do formulário para evitar flash de tela branca
  // Estilo específico para pré-carregar os componentes
  useEffect(() => {
    // Garantir que os elementos do formulário apareçam imediatamente
    if (document.getElementById('splash-screen')) {
      // Se o splash ainda estiver ativo, adicionar estilos para remover rapidamente
      const styleEl = document.createElement('style');
      styleEl.innerHTML = `
        #splash-screen { 
          opacity: 0 !important; 
          transition: opacity 0.03s ease-out !important;
        }
        .min-h-screen { opacity: 1 !important; }
      `;
      document.head.appendChild(styleEl);
    }

    // Tentar esconder o splash diretamente
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => {
        splash.style.display = 'none';
      }, 50);
    }
    
    // Limpar
    return () => {
      // Remover estilos temporários quando o componente for desmontado
      const styleElements = document.querySelectorAll('style');
      styleElements.forEach(el => {
        if (el.innerHTML.includes('#splash-screen')) {
          el.remove();
        }
      });
    };
  }, []);

  return (
    <div className="min-h-screen flex justify-center items-center">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-purple-600 to-blue-600"></div>
      <Card className="w-[92%] mx-auto sm:w-full max-w-sm sm:max-w-md shadow-lg border-gray-200 relative z-10 animate-in fade-in zoom-in duration-300">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-2">
            <ShieldCheck className="h-10 w-10 text-purple-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Verificação de Segurança</CardTitle>
          <CardDescription className="text-center">
            {statusMessage ? (
              <span id="status-message" className="text-orange-600 font-medium">{statusMessage}</span>
            ) : (
              "Digite o código do seu aplicativo autenticador para continuar"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {erro && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}
          
          {sucesso ? (
            <div className="space-y-4">
              <Alert className="mb-4 bg-green-50 border-green-200 text-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Verificação concluída</AlertTitle>
                <AlertDescription>Autenticação de dois fatores verificada com sucesso!</AlertDescription>
              </Alert>
              
              <div className="flex flex-col items-center space-y-2">
                <p className="text-center text-sm text-gray-600">
                  Se não for redirecionado automaticamente, clique no botão abaixo.
                </p>
                <Button 
                  onClick={() => window.location.href = '/dashboard'} 
                  className="w-full"
                >
                  Continuar para o Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código de verificação</Label>
                  <Input
                    id="codigo"
                    type="text"
                    placeholder="Exemplo: 123456"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    className="text-center text-lg tracking-widest"
                    maxLength={6}
                    required
                    autoComplete="off"
                    disabled={loading}
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full mt-4" 
                disabled={loading || codigo.length < 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : "Verificar"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-gray-500">
          <p>
            Esta verificação adicional ajuda a proteger sua conta.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}