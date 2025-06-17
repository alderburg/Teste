import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from '@/components/ui/separator';
import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, BadgeCheck, Calendar, TrendingUp, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Carrega o Stripe fora do componente de renderização
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
      return;
    }

    setIsProcessing(true);

    // Confirma o pagamento com o Stripe.js
    const { error } = await stripe.confirmPayment({
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
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
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
    </form>
  );
}

// Componente de pagamento com Stripe
function StripePayment() {
  const [clientSecret, setClientSecret] = useState('');
  const [_location, navigate] = useLocation();
  const { toast } = useToast();
  const planPrice = 89.90;
  
  useEffect(() => {
    // Sincronizar cartões com o Stripe
    fetch('/api/payment-methods')
      .then(res => {
        console.log('Cartões sincronizados com Stripe');
      })
      .catch(error => {
        console.error('Erro ao sincronizar cartões:', error);
      });
      
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
      });
  }, [toast, planPrice]);

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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
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
  );
}

export default function FinanceiroPage() {
  const [_, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("overview");

  return (
    <Layout title="Financeiro - Meu Preço Certo">
      <div className="container mx-auto py-8">
        <div className="flex flex-col space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Financeiro</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie suas assinaturas, pagamentos e histórico financeiro
            </p>
          </div>

          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="payment">Renovar Assinatura</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="mr-2 h-6 w-6 text-primary" />
                      Assinatura
                    </CardTitle>
                    <CardDescription>Detalhes do seu plano atual</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <BadgeCheck className="mr-2 h-5 w-5 text-green-500" />
                        <span className="font-medium">Plano: Profissional</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-5 w-5 text-blue-500" />
                        <span>Renovação: 10/06/2025</span>
                      </div>
                      <div className="flex items-center">
                        <TrendingUp className="mr-2 h-5 w-5 text-yellow-500" />
                        <span>Status: Ativo</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => setActiveTab("payment")} 
                      className="w-full"
                    >
                      Renovar assinatura
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="payment">
              <StripePayment />
            </TabsContent>
            
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Pagamentos</CardTitle>
                  <CardDescription>Todos os pagamentos realizados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="bg-secondary/20 p-4 rounded-md">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">Plano Profissional</h4>
                          <p className="text-sm text-muted-foreground">10/05/2025</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">R$ 89,90</p>
                          <Badge variant="default">Pago</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">ID Transação: PI_123456789</p>
                    </div>
                    
                    <div className="bg-secondary/20 p-4 rounded-md">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">Plano Profissional</h4>
                          <p className="text-sm text-muted-foreground">10/04/2025</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">R$ 89,90</p>
                          <Badge variant="default">Pago</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">ID Transação: PI_123456788</p>
                    </div>
                    
                    <div className="bg-secondary/20 p-4 rounded-md">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">Plano Profissional</h4>
                          <p className="text-sm text-muted-foreground">10/03/2025</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">R$ 89,90</p>
                          <Badge variant="default">Pago</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">ID Transação: PI_123456787</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}

// Componentes auxiliares
function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "secondary" }) {
  const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
  const variantClasses = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground"
  };
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}