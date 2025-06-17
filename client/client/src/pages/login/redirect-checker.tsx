import { useEffect } from 'react';
import { isUserAuthenticated } from '@/utils/auth-navigation';

/**
 * Componente que verifica no início se o usuário já está autenticado
 * e redireciona imediatamente para o dashboard se estiver.
 * 
 * VERSÃO SIMPLIFICADA: Evita redirecionamentos quando há 2FA pendente ou
 * quando já estamos em uma página específica de autenticação.
 */
export default function RedirectIfAuthenticated() {
  useEffect(() => {
    // Impedir redirecionamentos em loop verificando se estamos entrando
    // na página a partir da mesma origem (não de uma navegação externa)
    const isInternalNavigation = performance.navigation && 
      (performance.navigation.type === 1 || performance.navigation.type === 2);
    
    // Verificar se estamos na página de verificação 2FA
    const is2FAVerifyPage = window.location.pathname === '/verificar-2fa';
    const isLoginPage = window.location.pathname === '/acessar';
    
    // Verificar se há flag de redirecionamento em andamento
    const isRedirecting = sessionStorage.getItem('redirecting') === 'true';
    
    // Se já estamos redirecionando, não interferir
    if (isRedirecting) {
      console.log("📍 Redirecionamento já em andamento, não interferindo");
      sessionStorage.removeItem('redirecting');
      return;
    }
    
    // Verificação para 2FA pendente - MAIS SIMPLIFICADA
    let hasPending2FA = false;
    try {
      hasPending2FA = localStorage.getItem('pendingTwoFactor') === 'true';
    } catch (e) {
      console.error("Erro ao verificar 2FA pendente:", e);
    }
    
    // Se temos 2FA pendente e estamos na página de login, 
    // não redirecionamos - queremos mostrar o formulário 2FA inline
    if (hasPending2FA && isLoginPage) {
      console.log("📍 2FA pendente detectado na página de login - não redirecionando");
      return;
    }
    
    // Verificação imediata quando o componente é montado
    const authenticated = isUserAuthenticated();
    
    // NOVA LÓGICA: Se estamos autenticados e na página de verificação 2FA,
    // verificar se o 2FA foi concluído para determinar o redirecionamento
    if (authenticated && is2FAVerifyPage) {
      // Não redirecionamos automaticamente da página de verificação 2FA
      // O componente específico de verificação 2FA cuidará disso
      console.log("📍 Na página de verificação 2FA - não redirecionando automaticamente");
      return;
    }
    
    // Verificar flags de logout antes de qualquer redirecionamento
    const urlParams = new URLSearchParams(window.location.search);
    const fromLogout = urlParams.get('logout') === 'true' || 
                      urlParams.get('noSplash') === 'true' ||
                      sessionStorage.getItem('noSplashAfterLogout') === 'true' ||
                      sessionStorage.getItem('forceDirectLogin') === 'true' ||
                      sessionStorage.getItem('bypassSplashScreen') === 'true' ||
                      (window as any).LOGOUT_IN_PROGRESS === true;
    
    // Se estamos vindo de um logout, não fazer redirecionamento automático
    if (fromLogout) {
      console.log("📍 Detectado flag de pós-logout, mantendo na página atual");
      return;
    }
    
    // Lógica normal para outras páginas
    if (authenticated && !hasPending2FA && !is2FAVerifyPage) {
      console.log("📍 Usuário autenticado (sem 2FA pendente), preparando redirecionamento...");
      
      // Definir flag de redirecionamento para evitar loops
      sessionStorage.setItem('redirecting', 'true');
      
      // Aguardar 100ms para permitir que a página atual seja renderizada completamente
      // antes de redirecionar (reduz o risco de tela branca)
      setTimeout(() => {
        console.log("📍 Redirecionando para dashboard após curta pausa...");
        window.location.href = "/dashboard";
      }, 100);
    } else if (!authenticated) {
      console.log("📍 Usuário não autenticado, permitindo acesso à página atual");
    }
  }, []);
  
  // Este componente não renderiza nada visualmente
  return null;
}