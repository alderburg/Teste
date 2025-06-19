import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CardTokenizerProps {
  onSuccess?: (result: any) => void;
  onCancel?: () => void;
}

export default function CardTokenizer({ onSuccess, onCancel }: CardTokenizerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  });
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Validações básicas
      const cleanCardNumber = formData.cardNumber.replace(/\s+/g, '');
      
      if (cleanCardNumber.length < 13) {
        throw new Error("Número do cartão inválido");
      }
      
      if (!formData.cardName || formData.cardName.trim().length < 3) {
        throw new Error("Nome do titular inválido");
      }
      
      if (!formData.expiryMonth || !formData.expiryYear) {
        throw new Error("Data de expiração inválida");
      }
      
      if (!formData.cvv || formData.cvv.length < 3) {
        throw new Error("CVV inválido");
      }

      // Para testes, aceitar apenas o cartão de teste do Stripe
      if (cleanCardNumber !== '4242424242424242') {
        throw new Error("Para testes, use o cartão 4242 4242 4242 4242");
      }

      toast({
        title: "Processando cartão",
        description: "Configurando método de pagamento...",
      });

      // 1. Criar SetupIntent
      const setupIntentResult = await apiRequest("POST", "/api/setup-intent");
      
      if (!setupIntentResult?.clientSecret) {
        throw new Error("Erro ao configurar pagamento");
      }

      // 2. Simular confirmação do SetupIntent com token de teste
      // Em produção real, isso seria feito com Stripe Elements
      const mockSetupIntent = {
        id: `seti_test_${Date.now()}`,
        status: 'succeeded',
        payment_method: `pm_test_visa_${Date.now()}`
      };

      // 3. Confirmar no servidor
      const saveResult = await apiRequest("POST", "/api/confirm-card-setup", {
        setupIntentId: mockSetupIntent.id,
        paymentMethodId: mockSetupIntent.payment_method
      });

      toast({
        title: "Cartão adicionado com sucesso!",
        description: "Seu método de pagamento foi configurado.",
      });

      // Atualizar cache
      // WebSocket irá atualizar automaticamente

      if (onSuccess) {
        onSuccess(saveResult);
      }

    } catch (error: any) {
      console.error('Erro ao processar cartão:', error);
      toast({
        title: "Erro ao adicionar cartão",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="cardNumber">Número do Cartão</Label>
          <Input
            id="cardNumber"
            placeholder="4242 4242 4242 4242"
            value={formData.cardNumber}
            onChange={(e) => handleInputChange('cardNumber', e.target.value)}
            maxLength={19}
          />
        </div>

        <div>
          <Label htmlFor="cardName">Nome do Titular</Label>
          <Input
            id="cardName"
            placeholder="SEU NOME AQUI"
            value={formData.cardName}
            onChange={(e) => handleInputChange('cardName', e.target.value.toUpperCase())}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label htmlFor="expiryMonth">Mês</Label>
            <Input
              id="expiryMonth"
              placeholder="12"
              value={formData.expiryMonth}
              onChange={(e) => handleInputChange('expiryMonth', e.target.value)}
              maxLength={2}
            />
          </div>
          
          <div>
            <Label htmlFor="expiryYear">Ano</Label>
            <Input
              id="expiryYear"
              placeholder="28"
              value={formData.expiryYear}
              onChange={(e) => handleInputChange('expiryYear', e.target.value)}
              maxLength={2}
            />
          </div>

          <div>
            <Label htmlFor="cvv">CVV</Label>
            <Input
              id="cvv"
              placeholder="123"
              value={formData.cvv}
              onChange={(e) => handleInputChange('cvv', e.target.value)}
              maxLength={4}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            type="submit" 
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? 'Processando...' : 'Adicionar Cartão'}
          </Button>
          
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
          )}
        </div>
      </form>

      <div className="text-sm text-muted-foreground">
        <p>💳 Para testes, use: <strong>4242 4242 4242 4242</strong></p>
        <p>📅 Use qualquer data futura e CVV</p>
      </div>
    </div>
  );
}