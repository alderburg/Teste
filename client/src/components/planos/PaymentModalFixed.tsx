import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import CreditCardVisual from "@/components/ui/credit-card-visual";
import StripeCheckoutForm from './CheckoutForm';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planoSelecionado: {
    id: number;
    nome: string;
    descricao: string;
    valorMensal: string;
    valorAnual: string;
  } | null;
  periodoPlanos: string;
  onSuccess: () => void;
  acaoTipo: "ASSINAR" | "UPGRADE" | "DOWNGRADE";
}

// Componente do formulário de cartão visual interativo
const InteractiveCardForm = ({ 
  isProcessing, 
  isFullyLoaded, 
  onSubmit, 
  onCancel 
}: {
  isProcessing: boolean;
  isFullyLoaded: boolean;
  onSubmit: (cardData: any) => Promise<void>;
  onCancel: () => void;
}) => {
  const { toast } = useToast();
  const [cardData, setCardData] = useState({
    cardNumber: "",
    cardName: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    brand: "visa",
    isFlipped: false
  });

  // Função para detectar a bandeira do cartão
  const detectCardBrand = (cardNumber: string) => {
    const cleanNumber = cardNumber.replace(/\s+/g, "");
    
    if (/^4/.test(cleanNumber)) return "visa";
    if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(cleanNumber)) return "mastercard";
    if (/^3[47]/.test(cleanNumber)) return "amex";
    if (/^(4011(78|79)|43(1274|8935)|45(1416|7393|763(1|2))|50(4175|6699|67[0-7][0-9]|9000)|627780|63(6297|6368)|650(03([1-3]|[5-9])|04([0-9])|05([0-9])|06([0-9])|07([0-9])|08([0-9])|4([0-3][0-9]|4[0-9]|5[0-9]|6[0-9]|7[0-9])|9([0-6][0-9]|7[0-9])))/.test(cleanNumber)) return "elo";
    if (/^(606282)/.test(cleanNumber)) return "hipercard";
    
    return "visa";
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === "cardNumber") {
      const val = value.replace(/\D/g, '');
      const formattedValue = val.replace(/(\d{4})(?=\d)/g, '$1 ');
      const brand = detectCardBrand(val);
      
      setCardData(prev => ({
        ...prev,
        [field]: formattedValue,
        brand
      }));
    } else if (field === "expiryMonth") {
      const numericValue = value.replace(/\D/g, "");
      let month = numericValue;
      
      if (numericValue.length === 1 && parseInt(numericValue) > 1) {
        month = "0" + numericValue;
        setTimeout(() => {
          const yearInput = document.getElementById('expiryYear');
          if (yearInput) yearInput.focus();
        }, 10);
      } else if (numericValue.length === 2) {
        const firstDigit = parseInt(numericValue[0]);
        const secondDigit = parseInt(numericValue[1]);
        
        if (firstDigit > 1 || (firstDigit === 1 && secondDigit > 2)) {
          month = "12";
        }
        
        setTimeout(() => {
          const yearInput = document.getElementById('expiryYear');
          if (yearInput) yearInput.focus();
        }, 10);
      }
      
      setCardData(prev => ({ ...prev, [field]: month }));
    } else if (field === "expiryYear") {
      const val = value.replace(/\D/g, '').slice(0, 2);
      setCardData(prev => ({ ...prev, [field]: val }));
    } else if (field === "cvv") {
      const val = value.replace(/\D/g, '');
      const maxLength = cardData.brand === "amex" ? 4 : 3;
      const limitedVal = val.slice(0, maxLength);
      setCardData(prev => ({ ...prev, [field]: limitedVal }));
    } else {
      setCardData(prev => ({ ...prev, [field]: value }));
    }
  };

  const validateCard = () => {
    const errors = [];
    
    if (!cardData.cardNumber || cardData.cardNumber.replace(/\s+/g, "").length < 15) {
      errors.push("Número de cartão inválido");
    }
    
    if (!cardData.cardName || cardData.cardName.length < 3) {
      errors.push("Nome do titular inválido");
    }
    
    if (!cardData.expiryMonth || !cardData.expiryYear) {
      errors.push("Data de expiração inválida");
    }
    
    const expMonth = parseInt(cardData.expiryMonth);
    if (isNaN(expMonth) || expMonth < 1 || expMonth > 12) {
      errors.push("Mês de expiração inválido");
    }
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const expYear = parseInt('20' + cardData.expiryYear);
    
    if (isNaN(expYear) || expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      errors.push("Cartão expirado");
    }
    
    if (!cardData.cvv || cardData.cvv.length < 3) {
      errors.push("Código de segurança inválido");
    }
    
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateCard();
    
    if (errors.length > 0) {
      toast({
        title: "Erro de validação",
        description: errors[0],
        variant: "destructive"
      });
      return;
    }

    await onSubmit(cardData);
  };

  return (
    <div className="space-y-6">
      {/* Cartão Visual Interativo */}
      <div className="relative">
        <CreditCardVisual
          cardNumber={cardData.cardNumber}
          cardName={cardData.cardName}
          expiryMonth={cardData.expiryMonth}
          expiryYear={cardData.expiryYear}
          cvv={cardData.cvv}
          brand={cardData.brand}
          isFlipped={cardData.isFlipped}
          onFlip={() => setCardData(prev => ({ ...prev, isFlipped: !prev.isFlipped }))}
        />
        
        {/* Campos de entrada invisíveis sobrepostos para digitação direta no cartão */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Número do cartão */}
          <input
            type="text"
            value={cardData.cardNumber}
            onChange={(e) => handleInputChange("cardNumber", e.target.value)}
            className="absolute opacity-0 pointer-events-auto focus:opacity-20 focus:bg-white focus:text-black"
            style={{
              top: '60%',
              left: '15%',
              width: '70%',
              height: '15%',
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              color: 'white',
              outline: 'none'
            }}
            placeholder="0000 0000 0000 0000"
            maxLength={19}
          />
          
          {/* Nome do titular */}
          <input
            type="text"
            value={cardData.cardName}
            onChange={(e) => handleInputChange("cardName", e.target.value.toUpperCase())}
            className="absolute opacity-0 pointer-events-auto focus:opacity-20 focus:bg-white focus:text-black"
            style={{
              top: '80%',
              left: '15%',
              width: '50%',
              height: '10%',
              background: 'transparent',
              border: 'none',
              fontSize: '14px',
              color: 'white',
              outline: 'none'
            }}
            placeholder="SEU NOME AQUI"
          />
          
          {/* Mês de expiração */}
          <input
            type="text"
            value={cardData.expiryMonth}
            onChange={(e) => handleInputChange("expiryMonth", e.target.value)}
            className="absolute opacity-0 pointer-events-auto focus:opacity-20 focus:bg-white focus:text-black"
            style={{
              top: '80%',
              left: '75%',
              width: '8%',
              height: '10%',
              background: 'transparent',
              border: 'none',
              fontSize: '14px',
              color: 'white',
              outline: 'none'
            }}
            placeholder="MM"
            maxLength={2}
          />
          
          {/* Ano de expiração */}
          <input
            id="expiryYear"
            type="text"
            value={cardData.expiryYear}
            onChange={(e) => handleInputChange("expiryYear", e.target.value)}
            className="absolute opacity-0 pointer-events-auto focus:opacity-20 focus:bg-white focus:text-black"
            style={{
              top: '80%',
              left: '85%',
              width: '8%',
              height: '10%',
              background: 'transparent',
              border: 'none',
              fontSize: '14px',
              color: 'white',
              outline: 'none'
            }}
            placeholder="AA"
            maxLength={2}
          />
          
          {/* CVV no verso */}
          {cardData.isFlipped && (
            <input
              type="text"
              value={cardData.cvv}
              onChange={(e) => handleInputChange("cvv", e.target.value)}
              className="absolute opacity-0 pointer-events-auto focus:opacity-80 focus:bg-white focus:text-black"
              style={{
                top: '55%',
                left: '70%',
                width: '15%',
                height: '10%',
                background: 'transparent',
                border: 'none',
                fontSize: '14px',
                color: 'black',
                outline: 'none'
              }}
              placeholder="CVV"
              maxLength={cardData.brand === "amex" ? 4 : 3}
            />
          )}
        </div>
      </div>

      {/* Instruções */}
      <div className="text-center space-y-2">
        <p className="text-sm text-gray-600">
          Clique nos campos do cartão para inserir suas informações
        </p>
        <p className="text-xs text-gray-500">
          Vire o cartão para inserir o código de segurança (CVV)
        </p>
      </div>

      {/* Botões */}
      <div className="flex justify-between space-x-4">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancelar
        </Button>
        
        <Button 
          onClick={handleSubmit}
          disabled={isProcessing || !isFullyLoaded}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : !isFullyLoaded ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Confirmar Pagamento
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  planoSelecionado,
  periodoPlanos,
  onSuccess,
  acaoTipo
}: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);
  const { toast } = useToast();
  
  // Controla o carregamento completo do modal com preloader
  useEffect(() => {
    if (isOpen && planoSelecionado) {
      setIsLoading(true);
      setIsFullyLoaded(false);
      
      const initializeModal = async () => {
        try {
          if (!planoSelecionado.id || !planoSelecionado.nome) {
            throw new Error('Dados do plano incompletos');
          }
          
          // Simula carregamento de dados críticos - preloader
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          console.log('Modal de pagamento carregado para plano:', planoSelecionado.nome);
          
        } catch (error: any) {
          console.error('Erro ao preparar modal:', error);
          toast({
            title: 'Erro ao preparar pagamento',
            description: 'Os dados do plano estão incompletos. Por favor, tente novamente.',
            variant: 'destructive'
          });
          return;
        } finally {
          setIsLoading(false);
          setIsFullyLoaded(true);
        }
      };
      
      initializeModal();
    }
  }, [isOpen, planoSelecionado, toast]);

  // Estados para controle de cartões e formulário
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>("");
  const [useExistingCard, setUseExistingCard] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  
  // Buscar cartões salvos do usuário
  useEffect(() => {
    if (isOpen) {
      const fetchCards = async () => {
        try {
          const response = await fetch('/api/payment-methods', {
            method: 'GET',
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
              setSavedCards(data);
              const defaultCard = data.find((card: any) => card.isDefault) || data[0];
              setSelectedCard(defaultCard.stripePaymentMethodId);
              console.log('Cartão selecionado:', defaultCard.stripePaymentMethodId);
            }
          }
        } catch (error) {
          console.error("Erro ao buscar cartões salvos:", error);
        }
      };
      
      fetchCards();
    }
  }, [isOpen]);

  // Função para criar assinatura diretamente
  const handleCreateSubscription = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage("Processando sua assinatura...");
      
      const payload = {
        planoId: planoSelecionado?.id,
        tipoCobranca: periodoPlanos,
        ...(useExistingCard && selectedCard ? { paymentMethodId: selectedCard } : {})
      };
      
      const response = await apiRequest("POST", "/api/assinaturas", payload);
      
      if (response.error) {
        throw new Error(response.error.message || "Falha ao processar assinatura");
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/minha-assinatura'] });
      
      toast({
        title: "Assinatura processada com sucesso",
        description: `Seu plano ${planoSelecionado?.nome} foi ativado.`,
        variant: "default"
      });
      
      onSuccess();
      
    } catch (error: any) {
      console.error("Erro ao processar assinatura:", error);
      setStatusMessage(null);
      
      toast({
        title: "Erro no processamento",
        description: error.message || "Não foi possível processar sua assinatura. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#047857',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#df1b41',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    }
  };
  
  const options = clientSecret ? {
    clientSecret,
    appearance,
  } : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {acaoTipo === "ASSINAR" 
              ? `Assinar Plano ${planoSelecionado?.nome}` 
              : acaoTipo === "UPGRADE" 
                ? `Fazer Upgrade para ${planoSelecionado?.nome}` 
                : `Fazer Downgrade para ${planoSelecionado?.nome}`
            }
          </DialogTitle>
          <DialogDescription>
            Escolha o método de pagamento e finalize seu pedido
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-gray-800">Preparando pagamento...</p>
              <p className="text-sm text-gray-500">Carregando informações do plano e métodos de pagamento</p>
            </div>
          </div>
        ) : clientSecret ? (
          <Elements stripe={stripePromise} options={options}>
            <StripeCheckoutForm
              clientSecret={clientSecret}
              planoId={planoSelecionado?.id}
              tipoCobranca={periodoPlanos}
              onSuccess={onSuccess}
              onCancel={onClose}
            />
          </Elements>
        ) : (
          <div className="space-y-6">
            {/* Resumo do plano */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg mb-4">
              <h3 className="font-medium text-lg mb-2">Resumo do plano</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-600 dark:text-gray-400">Plano:</span>
                <span className="font-medium">{planoSelecionado?.nome}</span>
                
                <span className="text-gray-600 dark:text-gray-400">Período:</span>
                <span className="font-medium capitalize">{periodoPlanos}</span>
                
                <span className="text-gray-600 dark:text-gray-400">Valor:</span>
                <span className="font-medium">
                  {periodoPlanos === 'mensal' 
                    ? `R$ ${planoSelecionado?.valorMensal} / mês`
                    : `R$ ${(parseFloat(planoSelecionado?.valorAnual || '0') * 12).toFixed(2)} / Anual`}
                </span>
              </div>
            </div>
            
            {/* Opções de pagamento */}
            {savedCards.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="useExisting"
                    name="paymentMethod"
                    checked={useExistingCard}
                    onChange={() => setUseExistingCard(true)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="useExisting" className="text-sm font-medium">
                    Usar cartão salvo
                  </label>
                </div>
                
                {useExistingCard && (
                  <div className="ml-6 space-y-2">
                    <Select value={selectedCard} onValueChange={setSelectedCard}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um cartão" />
                      </SelectTrigger>
                      <SelectContent>
                        {savedCards.map((card) => (
                          <SelectItem key={card.id} value={card.stripePaymentMethodId}>
                            {card.brand.toUpperCase()} **** {card.last4} (expira {card.expMonth}/{card.expYear})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="useNew"
                    name="paymentMethod"
                    checked={!useExistingCard}
                    onChange={() => setUseExistingCard(false)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="useNew" className="text-sm font-medium">
                    Usar novo cartão
                  </label>
                </div>
              </div>
            )}
            
            {/* Formulário de novo cartão com cartão visual interativo */}
            {!useExistingCard && (
              <InteractiveCardForm 
                isProcessing={isProcessing}
                isFullyLoaded={isFullyLoaded}
                onSubmit={async (cardData) => {
                  try {
                    setIsProcessing(true);
                    setStatusMessage("Processando pagamento...");
                    
                    let formattedMonth = cardData.expiryMonth;
                    if (formattedMonth.length === 1) {
                      formattedMonth = '0' + formattedMonth;
                    }
                    
                    const cardResponse = await apiRequest("POST", "/api/process-custom-card", {
                      cardNumber: cardData.cardNumber.replace(/\s+/g, ""),
                      cardName: cardData.cardName,
                      expiryMonth: formattedMonth,
                      expiryYear: cardData.expiryYear,
                      cvv: cardData.cvv,
                      planoId: planoSelecionado?.id,
                      tipoCobranca: periodoPlanos
                    });
                    
                    if (cardResponse.error) {
                      throw new Error(cardResponse.error.message || "Falha ao processar o cartão");
                    }
                    
                    const paymentMethodId = cardResponse.paymentMethodId;
                    
                    const response = await apiRequest("POST", "/api/assinaturas", {
                      planoId: planoSelecionado?.id,
                      tipoCobranca: periodoPlanos,
                      paymentMethodId: paymentMethodId
                    });
                    
                    if (response.error) {
                      throw new Error(response.error.message || "Falha ao criar assinatura");
                    }
                    
                    queryClient.invalidateQueries({ queryKey: ['/api/minha-assinatura'] });
                    
                    toast({
                      title: "Assinatura processada com sucesso",
                      description: `Seu plano ${planoSelecionado?.nome} foi ativado.`,
                      variant: "default"
                    });
                    
                    onSuccess();
                    
                  } catch (error: any) {
                    console.error("Erro ao processar cartão:", error);
                    setStatusMessage(null);
                    
                    toast({
                      title: "Erro no pagamento",
                      description: error.message || "Ocorreu um erro durante o pagamento.",
                      variant: "destructive"
                    });
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                onCancel={onClose}
              />
            )}
            
            {/* Mensagem de status */}
            {statusMessage && (
              <div className="p-3 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded-md flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">{statusMessage}</p>
              </div>
            )}
            
            {/* Botões para cartão existente */}
            {useExistingCard && (
              <div className="flex justify-between pt-4">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  disabled={isProcessing}
                >
                  Cancelar
                </Button>
                
                <Button 
                  onClick={handleCreateSubscription}
                  disabled={isProcessing || !isFullyLoaded}
                  className="flex-1 ml-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : !isFullyLoaded ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Confirmar Assinatura
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}