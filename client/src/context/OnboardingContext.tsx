import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';

interface OnboardingContextType {
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  onboardingCompleted: boolean;
  completeOnboarding: (answers: Record<string, string | string[]>) => void;
  onboardingAnswers: Record<string, string | string[]>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Hook personalizado para usar o contexto
export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Estado para controlar a exibição do onboarding chat
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Estado para controlar se o onboarding foi completado
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  
  // Estado para armazenar as respostas do onboarding
  const [onboardingAnswers, setOnboardingAnswers] = useState<Record<string, string | string[]>>({});
  
  // Hook de navegação do Wouter
  const [_, navigate] = useLocation();

  // Hook para pegar a localização atual
  const [location] = useLocation();
  
  // Verifica no localStorage se o usuário já completou o onboarding
  useEffect(() => {
    console.log("Verificando se o onboarding foi completado...");
    
    // Verifica se estamos na página dashboard - APENAS na dashboard o onboarding deve aparecer
    const isDashboardPage = location === '/dashboard';
    
    // Verificar se há um usuário logado
    const userData = localStorage.getItem('userData');
    const isLoggedIn = !!userData;
    
    // Verificar tanto se estamos na dashboard quanto se o usuário está logado
    if (!isDashboardPage || !isLoggedIn) {
      // Se não estamos na dashboard ou não estamos logados, não mostramos o onboarding
      console.log("Não estamos na dashboard ou não estamos logados, não mostrando onboarding");
      console.log("isDashboardPage:", isDashboardPage, "isLoggedIn:", isLoggedIn);
      setShowOnboarding(false);
      return;
    }
    
    // Apenas na dashboard E com usuário logado, verificamos e potencialmente mostramos o onboarding
    
    // Verifica se o onboarding já foi completado
    const storedCompletion = localStorage.getItem('onboardingCompleted');
    if (storedCompletion === 'true') {
      setOnboardingCompleted(true);
      setShowOnboarding(false); // Garantindo que não mostramos se já foi completado
      console.log("Onboarding já foi completado, não mostrando");
    } else {
      // Se o onboarding não foi completado E estamos na dashboard E estamos logados, mostra automaticamente
      setOnboardingCompleted(false);
      setShowOnboarding(true);
      console.log("Onboarding não foi completado, mostrando");
    }
    
    // Tenta recuperar as respostas salvas, se existirem
    const storedAnswers = localStorage.getItem('onboardingAnswers');
    if (storedAnswers) {
      try {
        const parsedAnswers = JSON.parse(storedAnswers);
        setOnboardingAnswers(parsedAnswers);
      } catch (error) {
        console.error('Erro ao recuperar respostas do onboarding:', error);
      }
    }
  }, [location]); // Adicionamos location como dependência para reagir a mudanças de rota

  // Função para marcar o onboarding como completo
  const completeOnboarding = (answers: Record<string, string | string[]>) => {
    console.log("completeOnboarding chamado com:", answers);
    
    // Salvar dados no localStorage imediatamente
    localStorage.setItem('onboardingAnswers', JSON.stringify(answers));
    localStorage.setItem('onboardingCompleted', 'true');
    
    // Atualizar estado imediatamente
    setOnboardingAnswers(answers);
    setOnboardingCompleted(true);
    
    // Fechar o popup imediatamente após a conclusão
    console.log("Fechando o popup...");
    
    // Fechar o popup usando React state
    setShowOnboarding(false);
    
    // Navegar para a página de planos e upgrades usando Wouter (mantém o menu aberto sem recarregar a página)
    console.log("Navegando para planos e upgrades com navegação interna (mantendo menu aberto)");
    navigate("/planos-e-upgrades");
  };

  return (
    <OnboardingContext.Provider
      value={{
        showOnboarding,
        setShowOnboarding,
        onboardingCompleted,
        completeOnboarding,
        onboardingAnswers,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};