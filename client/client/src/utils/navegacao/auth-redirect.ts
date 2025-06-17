/**
 * Funções utilitárias para navegação baseada em autenticação
 * Simplificado para evitar problemas de duplo splash screen
 */

/**
 * Verifica se o usuário está autenticado usando localStorage
 * @returns Verdadeiro se o usuário estiver autenticado
 */
export function verificarAutenticacao(): boolean {
  try {
    const userData = localStorage.getItem('userData');
    return !!userData && userData !== 'undefined' && userData !== 'null';
  } catch (error) {
    console.error("Erro ao verificar autenticação:", error);
    return false;
  }
}

/**
 * Determina o destino de navegação com base no estado de autenticação
 * Se o usuário estiver autenticado, o destino será o dashboard
 * @param tipo Tipo de destino (cadastro ou login)
 * @returns URL apropriada baseada no estado de autenticação
 */
export function obterDestinoAutenticacao(tipo: 'cadastro' | 'login'): string {
  if (verificarAutenticacao()) {
    console.log("Usuário já autenticado, destino será dashboard");
    return "/dashboard";
  } else {
    return tipo === 'cadastro' ? "/cadastre-se" : "/acessar";
  }
}

/**
 * Navega para o destino apropriado com base no estado de autenticação
 * Evita redirecionamentos desnecessários verificando autenticação antecipadamente
 * @param tipo Tipo de destino (cadastro ou login)
 * @param event Evento do React (opcional)
 */
export function navegarParaDestino(tipo: 'cadastro' | 'login', event?: React.MouseEvent): void {
  if (event) {
    event.preventDefault();
  }
  
  const destino = obterDestinoAutenticacao(tipo);
  console.log(`Navegando diretamente para: ${destino}`);
  window.location.href = destino;
}