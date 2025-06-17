import React, { useEffect, useState } from 'react';
import { Button, ButtonProps } from "@/components/ui/button";

/**
 * Botão simples que muda seu destino conforme o usuário está logado ou não
 * Se logado, vai para dashboard. Se não, vai para cadastro ou login.
 */
export function BotaoAutenticacao({
  tipo,
  className,
  children,
  onClick,
  ...props
}: {
  tipo: 'cadastro' | 'login' | 'recuperar';
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
} & Omit<ButtonProps, 'onClick'>) {
  const [estaLogado, setEstaLogado] = useState(false);
  
  // Verificar se está logado ao carregar o componente
  useEffect(() => {
    try {
      const userData = localStorage.getItem('userData');
      setEstaLogado(!!userData && userData !== 'undefined' && userData !== 'null');
    } catch (error) {
      console.error("Erro ao verificar login:", error);
      setEstaLogado(false);
    }
  }, []);
  
  // Determinar o destino do botão - muda apenas o destino, mantém o texto original
  let destino = "/dashboard"; // Padrão para usuários logados
  
  if (!estaLogado) {
    // Se não estiver logado, definir destino baseado no tipo
    switch(tipo) {
      case 'cadastro':
        destino = "/cadastre-se";
        break;
      case 'login':
        destino = "/acessar";
        break;
      case 'recuperar':
        destino = "/recuperar";
        break;
      default:
        destino = "/acessar";
    }
  }
  
  // Determinar o texto do botão
  const texto = children || 
    (tipo === 'cadastro' ? "Cadastre-se" : 
     tipo === 'recuperar' ? "Recuperar senha" : "Entrar");
  
  // Função para navegação direta
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Executar o onClick do caller primeiro se fornecido
    if (onClick) onClick();
    
    // Definir splash screen customizado com base no destino
    if (destino === "/cadastre-se") {
      // Conjunto de mensagens para tela de cadastro
      localStorage.setItem('splashRedirectType', 'cadastro');
    } else if (destino === "/acessar") {
      // Conjunto de mensagens para tela de login
      localStorage.setItem('splashRedirectType', 'login');
    } else if (destino === "/dashboard") {
      // Conjunto de mensagens para dashboard
      localStorage.setItem('splashRedirectType', 'dashboard');
    }
    
    // Redirecionar diretamente para o destino
    window.location.href = destino;
  };
  
  return (
    <Button
      className={className}
      onClick={handleClick}
      {...props}
    >
      {texto}
    </Button>
  );
}