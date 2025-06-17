import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

interface SubscriptionHandlerProps {
  planoId: number;
  planoNome: string;
  tipoCobranca: 'mensal' | 'anual';
  paymentMethodId?: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function processarAssinatura({
  planoId,
  planoNome,
  tipoCobranca,
  paymentMethodId,
  onSuccess,
  onError
}: SubscriptionHandlerProps) {
  // Criar a carga útil com dados da assinatura
  const payload = {
    planoId,
    tipoCobranca,
    paymentMethodId
  };

  // Enviar solicitação para API de assinatura
  return apiRequest('/api/assinaturas', 'POST', payload)
    .then(response => {
      // Invalidar consultas para atualizar dados do usuário
      queryClient.invalidateQueries({ queryKey: ['/api/minha-assinatura'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
      
      // Executar callback de sucesso
      onSuccess();
      
      return response;
    })
    .catch(error => {
      // Executar callback de erro
      const mensagem = error.message || 'Erro ao processar assinatura';
      onError(mensagem);
      
      throw error;
    });
}

export function useSubscriptionProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const processSubscription = async (props: SubscriptionHandlerProps) => {
    setIsProcessing(true);
    
    try {
      const response = await processarAssinatura({
        ...props,
        onSuccess: () => {
          toast({
            title: 'Assinatura processada com sucesso',
            description: `O plano ${props.planoNome} foi ativado.`,
            variant: 'default'
          });
          
          props.onSuccess();
        },
        onError: (error) => {
          toast({
            title: 'Erro ao processar assinatura',
            description: error,
            variant: 'destructive'
          });
          
          props.onError(error);
        }
      });
      
      return response;
    } catch (error) {
      console.error('Falha no processamento da assinatura:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    processSubscription
  };
}