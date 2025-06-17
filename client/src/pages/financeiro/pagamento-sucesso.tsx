import React, { useEffect, useState } from 'react';
import Layout from '@/components/layout';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { Check, Home, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PagamentoSucessoPage() {
  const [_, navigate] = useLocation();
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    // Disparar confetti para celebrar o pagamento bem-sucedido
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    
    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };
    
    const confettiAnimation = () => {
      const timeLeft = animationEnd - Date.now();
      
      if (timeLeft <= 0) {
        return;
      }
      
      const particleCount = 50 * (timeLeft / duration);
      
      // Dispara confetti de ambos os lados
      confetti({
        particleCount: Math.floor(randomInRange(20, 40)),
        angle: randomInRange(55, 125),
        spread: randomInRange(50, 70),
        origin: { x: randomInRange(0.1, 0.9), y: randomInRange(0.1, 0.3) },
        colors: ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'],
      });
      
      requestAnimationFrame(confettiAnimation);
    };
    
    confettiAnimation();
    
    // Extrair ID do pagamento da URL se disponível
    const searchParams = new URLSearchParams(window.location.search);
    const paymentIntentId = searchParams.get('payment_intent');
    setPaymentId(paymentIntentId);
    
    // Opcional: Registrar o pagamento bem-sucedido no backend
    if (paymentIntentId) {
      fetch('/api/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentIntentId }),
      })
        .catch(error => {
          console.error('Erro ao confirmar pagamento:', error);
        });
    }
  }, []);

  return (
    <Layout title="Pagamento Confirmado - Meu Preço Certo">
      <div className="container max-w-2xl mx-auto py-16 px-4">
        <div className="bg-card rounded-lg shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 rounded-full p-4">
              <Check className="h-16 w-16 text-green-600" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-4">Pagamento Confirmado!</h1>
          
          <p className="text-lg text-muted-foreground mb-6">
            Seu pagamento foi processado com sucesso e sua assinatura foi renovada.
          </p>
          
          {paymentId && (
            <div className="bg-muted/30 rounded-md p-4 mb-8">
              <p className="text-sm text-muted-foreground">
                Identificação do pagamento:
              </p>
              <p className="font-mono text-sm">{paymentId}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <Button 
              variant="outline" 
              onClick={() => navigate('/financeiro')}
              className="flex items-center justify-center"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Ir para Financeiro
            </Button>
            
            <Button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center justify-center"
            >
              <Home className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </div>
          
          <div className="mt-8 border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">
              Um recibo foi enviado para seu e-mail cadastrado. Você também pode acessar seus comprovantes a qualquer momento na seção financeira.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}