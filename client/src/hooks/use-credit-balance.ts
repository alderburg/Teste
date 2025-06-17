
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

interface CreditBalanceResponse {
  success: boolean;
  balance: number;
  formattedBalance: string;
  hasCredits: boolean;
}

export function useCreditBalance() {
  const { user } = useAuth();

  const { 
    data: creditBalance, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<CreditBalanceResponse>({
    queryKey: ["/api/stripe-credit-balance", user?.id],
    enabled: !!user?.id,
    staleTime: 30000, // Cache por 30 segundos
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  return {
    balance: creditBalance?.balance || 0,
    formattedBalance: creditBalance?.formattedBalance || 'R$ 0,00',
    isLoading,
    error,
    refetch,
    hasCredits: creditBalance?.hasCredits || false
  };
}
