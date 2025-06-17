import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/layout';
import { ArrowLeft, CreditCard, ShieldCheck } from 'lucide-react';

// Carrega o Stripe fora do componente de renderização para evitar
// recriar o objeto Stripe em cada renderização
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Chave pública do Stripe não configurada (VITE_STRIPE_PUBLIC_KEY)');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Formulário de pagamento do Stripe
function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // O Stripe.js ainda não carregou
      // Certifique-se de desabilitar o envio do formulário até que o Stripe.js seja carregado
      return;
    }

    setIsProcessing(true);

    // Confirma o pagamento com o Stripe.js
    const { error } = await stripe.confirmPayment({
      // Elementos usados pelo PaymentElement
      elements,
      confirmParams: {
        // Redirecionar para a página de sucesso após o pagamento
        return_url: `${window.location.origin}/financeiro/pagamento-sucesso`,
      },
    });

    if (error) {
      // Mostra mensagem de erro ao usuário
      toast({
        variant: "destructive",
        title: "Erro no pagamento",
        description: error.message || "Ocorreu um erro ao processar seu pagamento. Tente novamente.",
      });
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      <div className="p-4 bg-secondary/30 rounded-lg">
        <PaymentElement 
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
            }
          }}
        />
      </div>
      
      <div className="flex items-center space-x-2 pt-2">
        <ShieldCheck className="h-5 w-5 text-green-500" />
        <span className="text-sm text-muted-foreground">Seus dados de pagamento estão seguros e criptografados</span>
      </div>
      
      <div className="flex justify-between space-x-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => navigate('/financeiro')}
          disabled={isProcessing}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        
        <Button 
          type="submit" 
          disabled={!stripe || isProcessing} 
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processando...
            </>
          ) : (
            'Confirmar pagamento'
          )}
        </Button>
      </div>
    </form>
  );
}

export default function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState('');
  const [_location, navigate] = useLocation();
  const { toast } = useToast();
  const planPrice = 89.90;
  
  useEffect(() => {
    // Cria o PaymentIntent assim que a página carrega
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        amount: planPrice,
        description: 'Renovação Plano Profissional'
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Falha ao iniciar pagamento');
        }
        return res.json();
      })
      .then((data) => {
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        toast({
          variant: "destructive",
          title: "Erro ao iniciar pagamento",
          description: error.message || "Não foi possível iniciar o processo de pagamento. Tente novamente mais tarde.",
        });
        navigate('/financeiro');
      });
  }, [navigate, toast, planPrice]);

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as 'stripe',
      variables: {
        colorPrimary: '#0f766e',
        colorBackground: '#ffffff',
        colorText: '#1e293b',
        colorDanger: '#ef4444',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Layout title="Pagamento - Meu Preço Certo">
      <div className="container max-w-3xl mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Pagamento</h1>
          <p className="text-muted-foreground mt-1">
            Complete seu pagamento para renovar sua assinatura
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Informações de pagamento
              </h2>
              
              {clientSecret ? (
                <Elements stripe={stripePromise} options={options}>
                  <CheckoutForm />
                </Elements>
              ) : (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              )}
            </Card>
          </div>
          
          <div className="md:col-span-1">
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Resumo do pedido</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Plano Profissional</span>
                  <span>R$ {planPrice.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Período</span>
                  <span>Mensal</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>R$ {planPrice.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="mt-6 bg-secondary/30 rounded-lg p-3 text-sm">
                <p className="font-medium">O que está incluído:</p>
                <ul className="mt-2 space-y-1">
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    Acesso a todas as funcionalidades
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    Até 3 usuários simultâneos
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    Suporte por e-mail
                  </li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}