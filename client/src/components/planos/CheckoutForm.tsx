import React, { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertTriangle, CreditCard, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CheckoutFormProps {
  clientSecret: string;
  planoId: number | undefined;
  tipoCobranca: "mensal" | "anual";
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CheckoutForm({ 
  clientSecret, 
  planoId, 
  tipoCobranca, 
  onSuccess, 
  onCancel 
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      // Stripe.js ainda não foi carregado
      setMessage("Aguarde, preparando formulário de pagamento...");
      return;
    }
    
    try {
      setIsProcessing(true);
      setMessage(null);
      
      console.log("Configurando novo método de pagamento...");
      
      // Primeiro, vamos configurar o método de pagamento em vez de um pagamento direto
      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/dashboard',
        },
        redirect: 'if_required',
      });
      
      if (setupError) {
        console.error("Erro na configuração do cartão:", setupError);
        setMessage(setupError.message || "Houve um erro ao processar o cartão. Por favor, tente novamente.");
        toast({
          title: "Erro no processamento do cartão",
          description: setupError.message || "Não foi possível processar o cartão.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      if (!setupIntent || setupIntent.status !== 'succeeded') {
        console.error("SetupIntent não foi concluído com sucesso:", setupIntent);
        setMessage("A configuração do cartão não foi concluída. Por favor, tente novamente.");
        setIsProcessing(false);
        return;
      }
      
      console.log("Cartão configurado com sucesso, criando assinatura...");
      
      // Com o método de pagamento configurado, agora criamos a assinatura
      try {
        const paymentMethodId = setupIntent.payment_method;
        
        // Validação extra para garantir que o paymentMethodId está correto
        if (!paymentMethodId || typeof paymentMethodId !== 'string' || !paymentMethodId.startsWith('pm_')) {
          console.error("ID de método de pagamento inválido:", paymentMethodId);
          throw new Error("Não foi possível obter o ID do método de pagamento");
        }
        
        // Log detalhado para depuração
        console.log("Enviando requisição para criar assinatura com:", {
          planoId,
          tipoCobranca,
          paymentMethodId
        });
        
        const response = await apiRequest("POST", "/api/assinaturas", {
          planoId,
          tipoCobranca,
          paymentMethodId // Usar o método de pagamento que acabamos de configurar
        });
        
        // Log de resposta para depuração
        console.log("Resposta da API de assinatura:", response);
        
        if (response.error) {
          throw new Error(response.error.message || "Erro ao criar assinatura");
        }
        
        // Invalidar consultas para atualizar dados
        queryClient.invalidateQueries({ queryKey: ['/api/minha-assinatura'] });
        
        setIsSuccess(true);
        setMessage("Pagamento processado com sucesso! Sua assinatura foi ativada.");
        toast({
          title: "Assinatura confirmada",
          description: "Sua assinatura foi processada com sucesso!",
          variant: "default"
        });
        
        // Notificar componente pai do sucesso
        onSuccess();
      } catch (err: any) {
        console.error("Erro ao criar assinatura:", err);
        setMessage("Cartão configurado, mas houve um erro ao ativar a assinatura. Por favor, tente novamente.");
        toast({
          title: "Erro na assinatura",
          description: err.message || "Não foi possível ativar a assinatura.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      console.error("Erro inesperado:", err);
      setMessage("Ocorreu um erro inesperado. Por favor, tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="mb-6">
          <PaymentElement 
            options={{
              layout: 'tabs',
              defaultValues: {
                billingDetails: {
                  name: '',
                  email: '',
                }
              }
            }}
          />
        </div>
        
        <div className="flex items-center text-xs text-gray-500 mb-4">
          <Lock className="h-3 w-3 mr-1" />
          <span>Seus dados de pagamento são processados com segurança pelo Stripe</span>
        </div>
      </div>
      
      {message && (
        <div className={`p-3 rounded-md flex items-start gap-2 ${
          isSuccess ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 
          'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
        }`}>
          {isSuccess ? (
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          )}
          <p>{message}</p>
        </div>
      )}
      
      <div className="flex justify-between gap-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isProcessing || isSuccess}
        >
          Cancelar
        </Button>
        
        <Button 
          type="submit" 
          disabled={!stripe || !elements || isProcessing || isSuccess}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirmado
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Confirmar Pagamento
            </>
          )}
        </Button>
      </div>
    </form>
  );
}