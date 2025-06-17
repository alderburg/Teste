import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

// Componente que redireciona com base no estado de autenticação
export default function NotFound() {
  const [_, navigate] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const [verificandoStatus2FA, setVerificandoStatus2FA] = useState(false);
  const [necessita2FA, setNecessita2FA] = useState(false);

  // Efeito para verificar se o usuário precisa completar 2FA
  useEffect(() => {
    const verificarStatus2FA = async () => {
      // Só verificamos status 2FA se o usuário estiver autenticado
      if (!isLoading && isAuthenticated) {
        setVerificandoStatus2FA(true);
        
        try {
          // Verificar no servidor se o usuário precisa de validação 2FA
          const response = await fetch('/api/auth/2fa-session-status', {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log("Status 2FA verificado na página NotFound:", data);
            
            if (data.requiresVerification) {
              // Se precisa de verificação 2FA, guardar essa info
              console.log("NotFound: Usuário autenticado mas requer 2FA");
              setNecessita2FA(true);
            } else {
              // Se não precisa de 2FA, redirecionar para dashboard
              console.log("NotFound: Usuário autenticado e não requer 2FA");
              setNecessita2FA(false);
            }
          } else {
            // Se não conseguir verificar, assumir que pode precisar de 2FA por segurança
            console.error("Erro ao verificar status 2FA:", response.status);
            setNecessita2FA(true);
          }
        } catch (error) {
          console.error("Erro ao verificar status 2FA:", error);
          setNecessita2FA(true); // Por segurança, assumir que precisa
        } finally {
          setVerificandoStatus2FA(false);
        }
      } else if (!isLoading) {
        // Se não está autenticado, não precisa verificar 2FA
        setVerificandoStatus2FA(false);
      }
    };
    
    verificarStatus2FA();
  }, [isLoading, isAuthenticated]);

  // Efeito para redirecionar após a verificação de autenticação e 2FA
  useEffect(() => {
    // Aguarda todas as verificações serem concluídas
    if (!isLoading && !verificandoStatus2FA) {
      if (isAuthenticated) {
        if (necessita2FA) {
          // Se precisa de 2FA, redirecionar para página de verificação
          console.log("Página não encontrada - Redirecionando para verificação 2FA");
          navigate("/verificar-2fa", { replace: true });
        } else {
          // Se não precisa de 2FA, redirecionar para dashboard
          console.log("Página não encontrada - Redirecionando para dashboard");
          navigate("/dashboard", { replace: true });
        }
      } else {
        // Se não está autenticado, redirecionar para login
        console.log("Página não encontrada - Redirecionando para login");
        navigate("/acessar", { replace: true });
      }
    }
  }, [navigate, isAuthenticated, isLoading, verificandoStatus2FA, necessita2FA]);

  // Exibe um indicador de carregamento enquanto decide para onde redirecionar
  if (isLoading || verificandoStatus2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Retorna null para não renderizar nenhum conteúdo enquanto o redirecionamento acontece
  return null;
}
