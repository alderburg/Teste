// Este arquivo implementa redirecionamento imediato para a verificação 2FA

/**
 * Este módulo é intencionalmente separado para ser importado antes de qualquer
 * outro componente da aplicação. É executado assim que a página /verificar-2fa
 * começa a carregar, para redirecionar o usuário imediatamente para o dashboard
 * se o 2FA já estiver verificado, sem precisar carregar a página completa.
 */

// Função de auto-execução para verificar e redirecionar imediatamente
(function() {
  // Se não estamos na página de verificação 2FA, não fazemos nada
  if (window.location.pathname !== '/verificar-2fa') {
    return;
  }

  console.log('🔄 Redirecionamento 2FA: Verificando necessidade de redirecionamento');

  // MODIFICAÇÃO IMPORTANTE: Primeiro verificar o status de 2FA antes de qualquer redirecionamento
  (async function() {
    try {
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
        console.log("Status 2FA na tela de verificação:", data);
        
        // Se o usuário NÃO precisa de verificação 2FA (já verificou ou não tem 2FA), redirecionar
        if (!data.requiresVerification && data.authenticated) {
          // Então sim, podemos redirecionar para a URL salva ou dashboard
          redirectAfterVerification();
        } else if (data.requiresVerification) {
          // Usuário PRECISA de verificação 2FA, não redirecionar, deixar a página exibir o formulário
          console.log("⚠️ Verificação 2FA é necessária. Mostrando formulário de verificação.");
          // Remover o splash screen para mostrar o formulário
          const splash = document.getElementById('splash-screen');
          if (splash) {
            splash.style.opacity = '0';
            setTimeout(function() {
              splash.style.display = 'none';
            }, 300);
          }
        } else if (!data.authenticated) {
          // Usuário não está autenticado, redirecionar para login
          console.log("⚠️ Usuário não autenticado. Redirecionando para página de login.");
          window.location.replace('/acessar');
        }
      } else {
        // Erro ao verificar status 2FA - por segurança, não redirecionar
        console.error("Erro ao verificar status 2FA:", response.status);
      }
    } catch (error) {
      console.error("Erro ao verificar status 2FA:", error);
    }
  })();
  
  // Função interna para redirecionar após verificação bem-sucedida
  function redirectAfterVerification() {
    // Prioridade 1: Redirecionar para URL salva no localStorage
    const savedRedirect = localStorage.getItem('twoFactorRedirect');
    if (savedRedirect) {
      console.log(`🚀 Redirecionamento 2FA: Redirecionando para ${savedRedirect}`);
      localStorage.removeItem('twoFactorRedirect');
      window.location.replace(savedRedirect);
      return;
    }

    // Prioridade 2: Redirecionar para URL no parâmetro
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get('redirect');
    if (redirectParam) {
      console.log(`🚀 Redirecionamento 2FA: Redirecionando para ${redirectParam}`);
      window.location.replace(decodeURIComponent(redirectParam));
      return;
    }

    // Prioridade 3: Redirecionar para dashboard
    console.log('🚀 Redirecionamento 2FA: Redirecionando para /dashboard');
    window.location.replace('/dashboard');
  }
})();

// Exportar um componente vazio para permitir a importação do módulo
export default function AuthRedirect() {
  return null;
}