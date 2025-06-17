import React from 'react';
import { Button } from '@/components/ui/button';
import { isUserAuthenticated } from '@/utils/auth-navigation';

/**
 * Botão inteligente para navegação de autenticação
 * Verifica automaticamente se o usuário está autenticado e define o destino adequado
 */
export function AuthButton({
  type = 'cadastro',
  className,
  children,
  size,
  variant = 'default'
}: {
  type: 'cadastro' | 'login';
  className?: string;
  children?: React.ReactNode;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}) {
  // Determinar o texto do botão quando não fornecido
  const buttonText = children || (type === 'cadastro' ? 'Cadastre-se' : 'Entrar');
  
  // Função para determinar o destino correto
  const handleNavigation = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Verificar autenticação diretamente pelo localStorage para máxima performance
    const isAuthenticated = isUserAuthenticated();
    
    // Definir destino baseado na autenticação
    const destination = isAuthenticated 
      ? '/dashboard' 
      : (type === 'cadastro' ? '/cadastre-se' : '/acessar');
    
    console.log(`Navegando diretamente para: ${destination}`);
    window.location.href = destination;
  };
  
  return (
    <Button 
      className={className}
      size={size}
      variant={variant}
      onClick={handleNavigation}
    >
      {isUserAuthenticated() ? 'Dashboard' : buttonText}
    </Button>
  );
}