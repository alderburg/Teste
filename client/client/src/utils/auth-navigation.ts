/**
 * Funções utilitárias para navegação baseada em autenticação
 * Solução independente para verificar se o usuário está autenticado
 * e determinar o destino correto para navegação
 */

/**
 * Verifica se o usuário está autenticado verificando o localStorage
 * Método mais direto e rápido para verificação sem depender de hooks
 * Também verifica se há necessidade de verificação 2FA pendente
 */
export function isUserAuthenticated(): boolean {
  try {
    // Verificar diretamente no localStorage para máxima performance
    const userDataStr = localStorage.getItem('userData');
    
    // Se não há dados do usuário, não está autenticado
    if (!userDataStr || userDataStr === 'undefined' || userDataStr === 'null') {
      return false;
    }
    
    // Se há flag de 2FA pendente, não considerar completamente autenticado ainda
    const pendingTwoFactor = localStorage.getItem('pendingTwoFactor');
    if (pendingTwoFactor === 'true') {
      console.log("Usuário tem autenticação 2FA pendente, considerando como não autenticado");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Erro ao verificar autenticação:", error);
    return false;
  }
}

/**
 * Determina o destino correto baseado no estado de autenticação
 * Se o usuário estiver autenticado, o destino é a dashboard
 * Caso contrário, o destino é o específico (cadastro ou login)
 */
export function getAuthDestination(destino: 'cadastro' | 'login'): string {
  if (isUserAuthenticated()) {
    console.log("Usuário já autenticado, navegando para dashboard");
    return "/dashboard";
  } else {
    console.log(`Usuário não autenticado, navegando para ${destino}`);
    return destino === 'cadastro' ? "/cadastre-se" : "/acessar";
  }
}

/**
 * Navega para o destino correto usando window.location
 * Verifica autenticação e redireciona para o destino apropriado
 */
export function navigateToAuthDestination(destino: 'cadastro' | 'login', event?: React.MouseEvent): void {
  if (event) {
    event.preventDefault();
  }
  
  const url = getAuthDestination(destino);
  console.log(`Navegando diretamente para: ${url}`);
  window.location.href = url;
}