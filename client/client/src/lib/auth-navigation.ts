import { useAuth } from "@/hooks/use-auth";

/**
 * Determina o destino correto com base no estado de autenticação
 * Se o usuário estiver autenticado, redireciona para dashboard
 * Caso contrário, vai para o destino original (cadastro ou login)
 */
export function getAuthDestination(destino: 'cadastro' | 'login'): string {
  // Verificar se o usuário está autenticado diretamente pela API
  const userJson = localStorage.getItem('user');
  const isLoggedIn = userJson && userJson !== 'undefined' && userJson !== 'null';
  
  if (isLoggedIn) {
    console.log("Usuário já autenticado, destino será dashboard");
    return "/dashboard";
  } else {
    return destino === 'cadastro' ? "/cadastre-se" : "/acessar";
  }
}

/**
 * Função de navegação direta para destinos de autenticação
 * Evita qualquer redirecionamento desnecessário verificando a autenticação antecipadamente
 */
export function navigateAuth(destino: 'cadastro' | 'login', e?: React.MouseEvent): void {
  if (e) e.preventDefault();
  
  const url = getAuthDestination(destino);
  console.log(`Navegando diretamente para: ${url}`);
  
  // Usar window.location para garantir navegação completa
  window.location.href = url;
}