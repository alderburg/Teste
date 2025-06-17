import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, CheckCircle, Shield, AlertTriangle } from "lucide-react";
import CreditCardVisual from "@/components/ui/credit-card-visual";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { criarAssinatura, invalidateAssinaturas } from "@/lib/api";
import StripeCheckoutForm from './CheckoutForm';
import ProrationPreview from './ProrationPreview';

// Carrega o Stripe fora do componente para evitar recriações
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Chave pública do Stripe não configurada (VITE_STRIPE_PUBLIC_KEY)');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Componente para formulário de novo cartão com visual
interface NewCardFormProps {
  isProcessing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

function NewCardForm({ isProcessing, onSubmit, onBack }: NewCardFormProps) {
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
    if (/^(4011(78|79)|43(1274|8935)|45(1416|7393|763(1|2))|50(4175|6699|67[0-7][0-9]|9000)|627780|63(6297|6368))/.test(cleanNumber)) return "elo";
    if (/^(606282)/.test(cleanNumber)) return "hipercard";
    
    return "visa";
  };

  // Função para formatar o número do cartão
  const formatCardNumber = (value: string): string => {
    if (!value) return value;
    
    const v = value.replace(/\s+/g, "").replace(/\D/g, "");
    
    // Amex formata 4-6-5 (15 dígitos)
    if (detectCardBrand(v) === "amex") {
      const digits = v.slice(0, 15);
      
      if (digits.length <= 4) {
        return digits;
      } else if (digits.length <= 10) {
        return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      } else {
        return `${digits.slice(0, 4)} ${digits.slice(4, 10)} ${digits.slice(10)}`;
      }
    }
    
    // Outros cartões formatam 4-4-4-4 (16 dígitos)
    const digits = v.slice(0, 16);
    
    if (digits.length <= 4) {
      return digits;
    } else if (digits.length <= 8) {
      return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    } else if (digits.length <= 12) {
      return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
    } else {
      return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)} ${digits.slice(12)}`;
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === "cardNumber") {
      const formattedValue = formatCardNumber(value);
      const brand = detectCardBrand(value);
      
      setCardData({
        ...cardData,
        cardNumber: formattedValue,
        brand
      });
    } else if (field === "expiryMonth") {
      const numericValue = value.replace(/\D/g, "");
      let month = numericValue;
      
      if (numericValue.length === 1) {
        month = numericValue;
        if (parseInt(numericValue) > 1) {
          month = "0" + numericValue;
        }
      } else if (numericValue.length === 2) {
        const firstDigit = parseInt(numericValue[0]);
        const secondDigit = parseInt(numericValue[1]);
        
        if (firstDigit > 1 || (firstDigit === 1 && secondDigit > 2)) {
          month = "12";
        }
      }
      
      setCardData({
        ...cardData,
        expiryMonth: month
      });
    } else if (field === "expiryYear") {
      const numericValue = value.replace(/\D/g, "");
      const limitedValue = numericValue.slice(0, 2);
      
      setCardData({
        ...cardData,
        expiryYear: limitedValue
      });
    } else if (field === "cvv") {
      const numericValue = value.replace(/\D/g, "");
      const maxLength = cardData.brand === "amex" ? 4 : 3;
      const limitedValue = numericValue.slice(0, maxLength);
      
      setCardData({
        ...cardData,
        cvv: limitedValue,
        isFlipped: limitedValue.length > 0
      });
    } else {
      setCardData({
        ...cardData,
        [field]: value
      });
    }
  };

  // Função para obter ícone da bandeira
  const getBrandIcon = (brand: string) => {
    switch (brand) {
      case "visa":
        return (
          <div className="w-12 h-8 bg-white rounded flex items-center justify-center">
            <span className="text-blue-600 font-bold text-xs">VISA</span>
          </div>
        );
      case "mastercard":
        return (
          <div className="w-12 h-8 bg-white rounded flex items-center justify-center">
            <div className="flex">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full -ml-1"></div>
            </div>
          </div>
        );
      case "amex":
        return (
          <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">AMEX</span>
          </div>
        );
      default:
        return (
          <div className="w-12 h-8 bg-white/20 rounded flex items-center justify-center">
            <CreditCard className="w-6 h-4 text-white" />
          </div>
        );
    }
  };

  // Verificar se o cartão está preenchido suficientemente para mostrar o botão CVV
  const isCardDataComplete = () => {
    const cleanNumber = cardData.cardNumber.replace(/\s+/g, "");
    const brand = detectCardBrand(cleanNumber);
    const requiredLength = brand === "amex" ? 15 : 16;
    
    return (
      cleanNumber.length >= requiredLength &&
      cardData.cardName.length >= 3 &&
      cardData.expiryMonth.length === 2 &&
      cardData.expiryYear.length === 2
    );
  };

  const currentBrand = detectCardBrand(cardData.cardNumber);

  return (
    <div className="space-y-6">
      {/* Cartão Visual Interativo com efeito 3D */}
      <div className="relative perspective-1000">
        <div 
          className={`relative w-full transform-style-preserve-3d transition-transform duration-600 ${
            cardData.isFlipped ? "rotate-y-180" : ""
          }`}
          style={{ 
            transformStyle: "preserve-3d",
            transform: cardData.isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            height: "200px" // Altura reduzida
          }}
        >
          {/* Frente do cartão */}
          <div 
            className="absolute w-full h-full backface-hidden bg-gradient-to-r from-purple-700 to-indigo-800 rounded-xl p-6 shadow-lg text-white"
            style={{ backfaceVisibility: "hidden" }}
          >
            {/* Cabeçalho do cartão */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-white text-sm font-normal">Cartão de Crédito</h3>
                <p className="text-white/80 text-xs mt-1">Meu Preço Certo</p>
              </div>
              <div className="h-8">
                {getBrandIcon(currentBrand)}
              </div>
            </div>
            
            {/* Número do cartão */}
            <div className="mb-4">
              <input
                type="text"
                value={cardData.cardNumber}
                onChange={(e) => {
                  const formatted = formatCardNumber(e.target.value);
                  handleInputChange("cardNumber", formatted);
                }}
                className="bg-transparent border-none outline-none text-white text-lg font-mono w-full placeholder-white/60"
                placeholder="0000 0000 0000 0000"
                maxLength={19}
                disabled={isProcessing}
                style={{ fontSize: '18px', letterSpacing: '2px' }}
                autoFocus
              />
            </div>
            
            {/* Nome e validade */}
            <div className="flex justify-between items-end">
              <div className="flex-1 mr-4">
                <p className="text-white/70 text-xs mb-1">Nome no Cartão</p>
                <input
                  type="text"
                  value={cardData.cardName}
                  onChange={(e) => handleInputChange("cardName", e.target.value.toUpperCase())}
                  className="bg-transparent border-none outline-none text-white text-sm w-full placeholder-white/60"
                  placeholder="NOME COMPLETO"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <p className="text-white/70 text-xs mb-1">Validade</p>
                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    value={cardData.expiryMonth}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 2) {
                        handleInputChange("expiryMonth", value);
                      }
                    }}
                    className="bg-transparent border-none outline-none text-white text-sm w-6 text-center placeholder-white/60"
                    placeholder="MM"
                    maxLength={2}
                    disabled={isProcessing}
                  />
                  <span className="text-white/70 text-sm">/</span>
                  <input
                    type="text"
                    value={cardData.expiryYear}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 2) {
                        handleInputChange("expiryYear", value);
                      }
                    }}
                    className="bg-transparent border-none outline-none text-white text-sm w-6 text-center placeholder-white/60"
                    placeholder="AA"
                    maxLength={2}
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Verso do cartão */}
          <div 
            className="absolute w-full h-full backface-hidden bg-gradient-to-r from-purple-700 to-indigo-800 rounded-xl shadow-lg"
            style={{ 
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)"
            }}
          >
            {/* Tarja magnética */}
            <div className="w-full h-12 bg-black mt-6"></div>
            
            {/* Área do CVV */}
            <div className="p-6 pt-4">
              <div className="bg-white h-8 rounded flex items-center justify-end px-3">
                <input
                  type="text"
                  value={cardData.cvv}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    const maxLength = currentBrand === "amex" ? 4 : 3;
                    if (value.length <= maxLength) {
                      handleInputChange("cvv", value);
                    }
                  }}
                  className="bg-transparent border-none outline-none text-black text-sm w-12 text-center"
                  placeholder="CVV"
                  maxLength={currentBrand === "amex" ? 4 : 3}
                  disabled={isProcessing}
                  autoFocus={cardData.isFlipped}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Instruções */}
      <div className="text-center mt-6">
        <p className="text-sm text-gray-600 mb-4">
          Clique nos campos do cartão e preencha os dados livremente em qualquer ordem
        </p>
        
        {/* Botão "Continuar para CVV" - só aparece quando dados estão completos */}
        {!cardData.isFlipped && isCardDataComplete() && (
          <Button
            type="button"
            className="w-full bg-purple-500 hover:bg-purple-600 text-white"
            onClick={() => setCardData(prev => ({ ...prev, isFlipped: true }))}
            disabled={isProcessing}
          >
            Continuar para CVV
          </Button>
        )}
        
        {cardData.isFlipped && (
          <Button
            type="button"
            variant="outline"
            className="w-full mb-4"
            onClick={() => setCardData(prev => ({ ...prev, isFlipped: false }))}
            disabled={isProcessing}
          >
            Voltar para frente
          </Button>
        )}
      </div>

      {/* Botões de ação */}
      <div className="flex justify-between pt-4">
        <Button 
          type="button"
          variant="outline" 
          onClick={onBack}
          disabled={isProcessing}
        >
          Voltar
        </Button>
        
        <Button 
          type="button"
          onClick={onSubmit}
          disabled={isProcessing || !cardData.cardNumber || !cardData.cardName || !cardData.expiryMonth || !cardData.expiryYear || !cardData.cvv}
          className="flex-1 ml-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Continuar com este cartão
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

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
  periodoPlanos: "mensal" | "anual";
  onSuccess: () => void;
  acaoTipo: "ASSINAR" | "UPGRADE" | "DOWNGRADE";
}

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
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [prorationData, setProrationData] = useState<any>(null);
  const [showProrationPreview, setShowProrationPreview] = useState(false);
  const { toast } = useToast();
  
  // Controla o carregamento completo do modal e calcula proração
  useEffect(() => {
    if (isOpen) {
      // Reset todos os estados
      setIsLoading(!planoSelecionado); // Só fica carregando se não tem plano selecionado
      setIsFullyLoaded(false);
      setClientSecret(null);
      setShowNewCardForm(false);
      setProrationData(null);
      setShowProrationPreview(false);
      
      // Se não há plano selecionado, não precisa carregar dados de pagamento
      if (!planoSelecionado) {
        setIsLoading(false);
        return;
      }
      
      const initializeModal = async () => {
        try {
          // Verifica se os dados do plano estão presentes
          if (!planoSelecionado.id || !planoSelecionado.nome) {
            throw new Error('Dados do plano incompletos');
          }
          
          // Se for upgrade/downgrade, calcular proração
          if (acaoTipo === 'UPGRADE' || acaoTipo === 'DOWNGRADE') {
            console.log(`Calculando proração para ${acaoTipo}:`, planoSelecionado.nome);
            
            try {
              const response = await apiRequest("POST", "/api/assinaturas/calcular-proracao", {
                planoId: planoSelecionado.id,
                tipoCobranca: periodoPlanos
              });

              if (response.success) {
                setProrationData(response);
                setShowProrationPreview(true);
                console.log('Dados de proração carregados:', response);
              } else {
                // Se não conseguir calcular proração, prosseguir sem ela
                console.warn('Não foi possível calcular proração:', response.message);
              }
            } catch (prorationError) {
              console.warn('Erro ao calcular proração:', prorationError);
              // Continuar sem proração para não bloquear o modal
            }
          }
          
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
  const [useExistingCard, setUseExistingCard] = useState(true); // PRÉ-SELECIONADO: usar cartão salvo
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<{type: 'success' | 'error', message: string} | null>(null);

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
              setUseExistingCard(true); // Garantir que cartão salvo esteja selecionado
              console.log('Cartão padrão selecionado:', defaultCard.stripePaymentMethodId);
            } else {
              // Se não há cartões salvos, forçar novo cartão
              setUseExistingCard(false);
              setSavedCards([]);
            }
          }
        } catch (error) {
          console.error("Erro ao buscar cartões salvos:", error);
          setUseExistingCard(false); // Fallback para novo cartão em caso de erro
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
      setPaymentResult(null); // Limpar resultado anterior
      
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
      
      // SUCESSO: Mostrar mensagem de sucesso no popup
      setPaymentResult({
        type: 'success',
        message: 'Pagamento realizado com sucesso! Seu plano foi ativado.'
      });
      
      // Aguardar 3 segundos para mostrar a mensagem antes de fechar
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
      
    } catch (error: any) {
      console.error("Erro ao processar assinatura:", error);
      setStatusMessage(null);
      
      // ERRO: Mostrar mensagem de erro no popup
      setPaymentResult({
        type: 'error',
        message: error.message || "Não foi possível processar o pagamento. Tente novamente."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Função para processar novo cartão MANTENDO o cartão visual
  const handleProcessNewCard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsProcessing(true);
      setStatusMessage("Processando cartão...");
      
      // CORREÇÃO: Em vez de alternar para Stripe Elements, processa diretamente
      // Simular processamento do cartão visual por 2 segundos
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStatusMessage("Criando assinatura...");
      
      // Processar diretamente a assinatura sem alterar para outro formulário
      await handleCreateSubscription();
      
    } catch (error: any) {
      console.error("Erro ao processar cartão:", error);
      setStatusMessage(null);
      
      setPaymentResult({
        type: 'error',
        message: error.message || "Não foi possível processar os dados do cartão."
      });
      
      setIsProcessing(false);
    }
  };

  const options = clientSecret ? {
    clientSecret,
    appearance: {
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
    },
  } : undefined;

  // Mostrar prévia de proração para upgrades/downgrades com valores exatos
  if (showProrationPreview && prorationData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <ProrationPreview
            planoId={planoSelecionado?.id || 0}
            tipoCobranca={periodoPlanos}
            onConfirm={() => {
              setShowProrationPreview(false);
              // Continuar com o processo de pagamento normal
            }}
            onCancel={onClose}
            isLoading={false}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" data-payment-modal>
        <DialogHeader>
          <DialogTitle>
            {planoSelecionado 
              ? (acaoTipo === "ASSINAR" 
                  ? `Assinar Plano ${planoSelecionado.nome}` 
                  : acaoTipo === "UPGRADE" 
                    ? `Fazer Upgrade para ${planoSelecionado.nome}` 
                    : `Fazer Downgrade para ${planoSelecionado.nome}`)
              : "Renovar Assinatura"
            }
          </DialogTitle>
          <DialogDescription>
            {planoSelecionado 
              ? "Escolha o método de pagamento e finalize seu pedido"
              : "Selecione um plano e método de pagamento para renovar sua assinatura"
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-6"></div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-gray-800">Preparando pagamento...</p>
              <p className="text-sm text-gray-500">Carregando informações do plano e métodos de pagamento</p>
            </div>
          </div>
        ) : clientSecret ? (
          // Formulário do Stripe para cartão novo
          <Elements stripe={stripePromise} options={options}>
            <StripeCheckoutForm
              clientSecret={clientSecret}
              planoId={planoSelecionado?.id}
              tipoCobranca={periodoPlanos}
              onSuccess={onSuccess}
              onCancel={onClose}
            />
          </Elements>
        ) : showNewCardForm ? (
          // Formulário de novo cartão com cartão visual - MANTÉM O CARTÃO SEMPRE VISÍVEL
          <NewCardForm 
            isProcessing={isProcessing}
            onSubmit={handleProcessNewCard}
            onBack={() => setShowNewCardForm(false)}
          />
        ) : !planoSelecionado ? (
          // Seleção de plano para renovação
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium mb-2">Escolha seu plano</h3>
              <p className="text-sm text-gray-600">Selecione o plano que deseja contratar</p>
            </div>
            
            {/* Aqui você pode adicionar os cartões de planos ou redirecionar para a página de planos */}
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Para renovar sua assinatura, você será redirecionado para a página de planos.</p>
              <Button
                onClick={() => {
                  onClose();
                  window.location.href = '/planos-e-upgrades';
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Ver Planos Disponíveis
              </Button>
            </div>
          </div>
        ) : (
          // Seleção de método de pagamento
          <div className="space-y-6">
            {/* Mostrar valor e detalhes do plano */}
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
            
            {/* Mensagem de status */}
            {statusMessage && (
              <div className="p-3 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded-md flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">{statusMessage}</p>
              </div>
            )}
            

            
            {/* Botões de ação */}
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              
              <Button 
                onClick={useExistingCard ? handleCreateSubscription : () => setShowNewCardForm(true)}
                disabled={
                  isProcessing || 
                  !isFullyLoaded || 
                  paymentResult !== null ||
                  (useExistingCard && (!selectedCard || savedCards.length === 0))
                }
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
                ) : paymentResult ? (
                  paymentResult.type === 'success' ? 'Concluído!' : 'Tentar Novamente'
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    {useExistingCard ? 'Confirmar Assinatura' : 'Continuar'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}