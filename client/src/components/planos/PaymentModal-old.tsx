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

// Componente para formulário de novo cartão com visual
interface NewCardFormProps {
  isProcessing: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

function NewCardForm({ isProcessing, onSubmit }: NewCardFormProps) {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === "cardNumber") {
      const val = value.replace(/\D/g, '');
      const formattedValue = val.replace(/(\d{4})(?=\d)/g, '$1 ');
      const brand = detectCardBrand(val);
      
      setCardData({
        ...cardData,
        [name]: formattedValue,
        brand
      });
    } 
    else if (name === "expiryMonth") {
      const numericValue = value.replace(/\D/g, "");
      let month = numericValue;
      
      if (numericValue.length === 1) {
        month = numericValue;
        if (parseInt(numericValue) > 1) {
          setTimeout(() => {
            setCardData(prev => ({
              ...prev,
              expiryMonth: "0" + prev.expiryMonth
            }));
            const yearInput = document.getElementById('expiryYear');
            if (yearInput) yearInput.focus();
          }, 10);
        }
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
      
      setCardData({
        ...cardData,
        [name]: month
      });
    }
    else if (name === "expiryYear") {
      const val = value.replace(/\D/g, '');
      const limitedVal = val.slice(0, 2);
      
      setCardData({
        ...cardData,
        [name]: limitedVal
      });
    }
    else if (name === "cvv") {
      const val = value.replace(/\D/g, '');
      const maxLength = cardData.brand === "amex" ? 4 : 3;
      const limitedVal = val.slice(0, maxLength);
      
      // Virar o cartão automaticamente quando focar no CVV
      if (limitedVal.length > 0 && !cardData.isFlipped) {
        setCardData({
          ...cardData,
          [name]: limitedVal,
          isFlipped: true
        });
      } else {
        setCardData({
          ...cardData,
          [name]: limitedVal
        });
      }
    }
    else {
      setCardData({
        ...cardData,
        [name]: value
      });
    }
  };

  const flipCard = () => {
    setCardData({
      ...cardData,
      isFlipped: !cardData.isFlipped
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cartão Visual */}
        <div className="order-2 lg:order-1">
          <CreditCardVisual
            cardNumber={cardData.cardNumber}
            cardName={cardData.cardName}
            expiryMonth={cardData.expiryMonth}
            expiryYear={cardData.expiryYear}
            cvv={cardData.cvv}
            brand={cardData.brand}
            isFlipped={cardData.isFlipped}
            onFlip={flipCard}
          />
        </div>

        {/* Formulário */}
        <div className="order-1 lg:order-2 space-y-4">
          <h3 className="text-lg font-semibold mb-4">Dados do Cartão</h3>
          
          {/* Número do cartão */}
          <div>
            <Label htmlFor="cardNumber">Número do cartão</Label>
            <Input
              id="cardNumber"
              name="cardNumber"
              placeholder="1234 5678 9012 3456"
              value={cardData.cardNumber}
              onChange={handleInputChange}
              maxLength={19}
              disabled={isProcessing}
              onFocus={() => setCardData({...cardData, isFlipped: false})}
            />
          </div>

          {/* Nome do titular */}
          <div>
            <Label htmlFor="cardName">Nome do titular</Label>
            <Input
              id="cardName"
              name="cardName"
              placeholder="NOME COMO NO CARTÃO"
              value={cardData.cardName}
              onChange={handleInputChange}
              disabled={isProcessing}
              onFocus={() => setCardData({...cardData, isFlipped: false})}
            />
          </div>

          {/* Data de expiração e CVV */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="expiryMonth">Mês</Label>
              <Input
                id="expiryMonth"
                name="expiryMonth"
                placeholder="MM"
                value={cardData.expiryMonth}
                onChange={handleInputChange}
                maxLength={2}
                disabled={isProcessing}
                onFocus={() => setCardData({...cardData, isFlipped: false})}
              />
            </div>
            <div>
              <Label htmlFor="expiryYear">Ano</Label>
              <Input
                id="expiryYear"
                name="expiryYear"
                placeholder="AA"
                value={cardData.expiryYear}
                onChange={handleInputChange}
                maxLength={2}
                disabled={isProcessing}
                onFocus={() => setCardData({...cardData, isFlipped: false})}
              />
            </div>
            <div>
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                name="cvv"
                placeholder="123"
                value={cardData.cvv}
                onChange={handleInputChange}
                maxLength={cardData.brand === "amex" ? 4 : 3}
                disabled={isProcessing}
                onFocus={() => setCardData({...cardData, isFlipped: true})}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="flex justify-between pt-4">
        <Button 
          type="button"
          variant="outline" 
          onClick={() => {
            // Voltar para seleção de método de pagamento
            const modal = document.querySelector('[data-payment-modal]');
            if (modal) {
              modal.dispatchEvent(new CustomEvent('back-to-selection'));
            }
          }}
          disabled={isProcessing}
        >
          Voltar
        </Button>
        
        <Button 
          type="submit"
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
    </form>
  );
}

// Carrega o Stripe fora do componente para evitar recriações
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Chave pública do Stripe não configurada (VITE_STRIPE_PUBLIC_KEY)');
}

// Correção: Usar a chave publicável do ambiente corretamente
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Componente para formulário de novo cartão com cartão visual
interface NewCardFormProps {
  isProcessing: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

function NewCardForm({ isProcessing, onSubmit }: NewCardFormProps) {
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

  // Controlador de mudança nos campos de entrada
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === "cardNumber") {
      const val = value.replace(/\D/g, '');
      const formattedValue = val.replace(/(\d{4})(?=\d)/g, '$1 ');
      const brand = detectCardBrand(val);
      
      setCardData({
        ...cardData,
        [name]: formattedValue,
        brand
      });
    } 
    else if (name === "expiryMonth") {
      const numericValue = value.replace(/\D/g, "");
      let month = numericValue;
      
      if (numericValue.length === 1) {
        month = numericValue;
        if (parseInt(numericValue) > 1) {
          setTimeout(() => {
            setCardData(prev => ({
              ...prev,
              expiryMonth: "0" + prev.expiryMonth
            }));
            
            const yearInput = document.getElementById('expiryYear');
            if (yearInput) {
              yearInput.focus();
            }
          }, 10);
        }
      } else if (numericValue.length === 2) {
        const firstDigit = parseInt(numericValue[0]);
        const secondDigit = parseInt(numericValue[1]);
        
        if (firstDigit > 1 || (firstDigit === 1 && secondDigit > 2)) {
          month = "12";
        }
        
        setTimeout(() => {
          const yearInput = document.getElementById('expiryYear');
          if (yearInput) {
            yearInput.focus();
          }
        }, 10);
      }
      
      setCardData({
        ...cardData,
        [name]: month
      });
    }
    else if (name === "expiryYear") {
      const val = value.replace(/\D/g, '');
      const limitedVal = val.slice(0, 2);
      
      setCardData({
        ...cardData,
        [name]: limitedVal
      });
    }
    else if (name === "cvv") {
      const val = value.replace(/\D/g, '');
      const maxLength = cardData.brand === "amex" ? 4 : 3;
      const limitedVal = val.slice(0, maxLength);
      
      setCardData({
        ...cardData,
        [name]: limitedVal
      });
    }
    else {
      setCardData({
        ...cardData,
        [name]: value
      });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cartão Visual */}
        <div className="order-2 lg:order-1">
          <CreditCardVisual
            cardNumber={cardData.cardNumber}
            cardName={cardData.cardName}
            expiryMonth={cardData.expiryMonth}
            expiryYear={cardData.expiryYear}
            cvv={cardData.cvv}
            brand={cardData.brand}
            isFlipped={cardData.isFlipped}
            onFlip={() => setCardData({ ...cardData, isFlipped: !cardData.isFlipped })}
          />
        </div>
        
        {/* Formulário */}
        <div className="order-1 lg:order-2 space-y-4">
          <div>
            <Label htmlFor="cardNumber">Número do cartão</Label>
            <Input
              id="cardNumber"
              name="cardNumber"
              type="text"
              placeholder="1234 5678 9012 3456"
              value={cardData.cardNumber}
              onChange={handleInputChange}
              maxLength={19}
              className="font-mono"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="cardName">Nome no cartão</Label>
            <Input
              id="cardName"
              name="cardName"
              type="text"
              placeholder="Seu nome como está no cartão"
              value={cardData.cardName}
              onChange={handleInputChange}
              className="uppercase"
              required
            />
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="expiryMonth">Mês</Label>
              <Input
                id="expiryMonth"
                name="expiryMonth"
                type="text"
                placeholder="MM"
                value={cardData.expiryMonth}
                onChange={handleInputChange}
                maxLength={2}
                className="font-mono text-center"
                required
              />
            </div>
            <div>
              <Label htmlFor="expiryYear">Ano</Label>
              <Input
                id="expiryYear"
                name="expiryYear"
                type="text"
                placeholder="AA"
                value={cardData.expiryYear}
                onChange={handleInputChange}
                maxLength={2}
                className="font-mono text-center"
                required
              />
            </div>
            <div>
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                name="cvv"
                type="text"
                placeholder="123"
                value={cardData.cvv}
                onChange={handleInputChange}
                maxLength={cardData.brand === "amex" ? 4 : 3}
                className="font-mono text-center"
                onFocus={() => setCardData({ ...cardData, isFlipped: true })}
                onBlur={() => setCardData({ ...cardData, isFlipped: false })}
                required
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Informação de segurança */}
      <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
        <Shield className="h-5 w-5 text-green-600" />
        <span className="text-sm text-green-700">
          Seus dados estão protegidos com criptografia SSL
        </span>
      </div>
      
      {/* Botões */}
      <div className="flex justify-between space-x-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => window.history.back()}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancelar
        </Button>
        
        <Button 
          type="submit" 
          disabled={isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Continuar
            </>
          )}
        </Button>
      </div>
    </form>
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

// Componente interno para formulário de pagamento legado
const PaymentForm = ({ 
  planoSelecionado, 
  periodoPlanos, 
  onClose, 
  onSuccess,
  acaoTipo 
}: Omit<PaymentModalProps, 'isOpen'>) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [useExistingCard, setUseExistingCard] = useState<boolean>(false);
  const [selectedCard, setSelectedCard] = useState<string>("");
  const [loadingCards, setLoadingCards] = useState(true);

  // Estado para os campos do formulário de cartão
  const [cardData, setCardData] = useState({
    cardNumber: "",
    cardName: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    brand: "visa", // Padrão inicial
    isFlipped: false // Controla se o cartão está virado
  });

  // Buscar cartões salvos assim que o componente é montado
  useEffect(() => {
    // Inicialmente, configure para usar o formulário de novo cartão
    setUseExistingCard(false);
    
    const fetchCards = async () => {
      try {
        setLoadingCards(true);
        
        // Usar fetch diretamente para obter dados de cartão
        const response = await fetch('/api/payment-methods', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.log("Erro ao buscar cartões:", response.status);
          setSavedCards([]); // Definir como array vazio para evitar problemas de renderização
          return; // Mantém o formulário de novo cartão ativo
        }
        
        const data = await response.json();
        
        if (data && Array.isArray(data) && data.length > 0) {
          console.log("Cartões salvos encontrados:", data.length);
          setSavedCards(data);
          
          // Selecionar o cartão padrão ou o primeiro da lista
          const defaultCard = data.find((card: any) => card.isDefault) || data[0];
          
          // Usar stripePaymentMethodId em vez do id do banco de dados
          // Isso garante que seja uma string no formato "pm_..." que o Stripe espera
          setSelectedCard(defaultCard.stripePaymentMethodId);
          
          console.log('Cartão selecionado:', defaultCard.stripePaymentMethodId);
          
          // Renderiza a opção de escolher mas mantém o formulário de novo cartão como ativo por padrão
        } else {
          console.log("Nenhum cartão salvo encontrado. Mostrando apenas formulário para novo cartão.");
          setSavedCards([]); // Definir como array vazio explicitamente
        }
      } catch (error) {
        console.error("Erro ao buscar cartões:", error);
        setSavedCards([]); // Em caso de erro, define como array vazio
      } finally {
        setLoadingCards(false);
      }
    };

    // Executa a busca dos cartões imediatamente
    fetchCards();
  }, []);

  // Função para detectar a bandeira do cartão
  const detectCardBrand = (cardNumber: string) => {
    const cleanNumber = cardNumber.replace(/\s+/g, "");
    
    // Visa: começa com 4
    if (/^4/.test(cleanNumber)) return "visa";
    
    // Mastercard: começa com 51-55 ou 2221-2720
    if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(cleanNumber)) return "mastercard";
    
    // American Express: começa com 34 ou 37
    if (/^3[47]/.test(cleanNumber)) return "amex";
    
    // Elo: começa com 4011, 401178, 401179, 431274, 438935, 451416, 457393, 4576, 457631, 457632,
    // 504175, 627780, 636297, 636368, 636369, 650031-650033, 650035-650051, 650405-650439,
    // 650485-650538, 650541-650598, 650700-650718, 650720-650727, 650901-650978, 651652-651679,
    // 655000-655019, 655021-655058
    if (/^(4011(78|79)|43(1274|8935)|45(1416|7393|763(1|2))|50(4175|6699|67[0-7][0-9]|9000)|627780|63(6297|6368)|650(03([1-3]|[5-9])|04([0-9])|05([0-9])|06([0-9])|07([0-9])|08([0-9])|4([0-3][0-9]|4[0-9]|5[0-9]|6[0-9]|7[0-9])|9([0-6][0-9]|7[0-9])))/.test(cleanNumber)) return "elo";
    
    // Hipercard: começa com 606282
    if (/^(606282)/.test(cleanNumber)) return "hipercard";
    
    // Padrão se nenhuma bandeira for detectada
    return "visa";
  };
  
  // Função para virar o cartão manualmente
  const flipCard = () => {
    setCardData({
      ...cardData,
      isFlipped: !cardData.isFlipped
    });
  };

  // Controlador de mudança nos campos de entrada
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === "cardNumber") {
      // Formatar número do cartão (adicionar espaços a cada 4 dígitos)
      const val = value.replace(/\D/g, '');
      const formattedValue = val.replace(/(\d{4})(?=\d)/g, '$1 ');
      
      // Atualizar a bandeira do cartão
      const brand = detectCardBrand(val);
      
      setCardData({
        ...cardData,
        [name]: formattedValue,
        brand
      });
    } 
    else if (name === "expiryMonth") {
      // Limitar mês entre 1-12
      const numericValue = value.replace(/\D/g, "");
      
      // Não permitir valores maiores que 12
      let month = numericValue;
      
      // Controle de valores válidos para o mês
      if (numericValue.length === 1) {
        // Se for apenas um dígito, aceitar normalmente (sem zero à esquerda)
        month = numericValue;
        
        // Se o primeiro dígito for maior que 1, pula para o ano automaticamente
        if (parseInt(numericValue) > 1) {
          setTimeout(() => {
            // Adicionar zero à esquerda automaticamente se o valor for 2-9
            setCardData(prev => ({
              ...prev,
              expiryMonth: "0" + prev.expiryMonth
            }));
            
            const yearInput = document.getElementById('expiryYear');
            if (yearInput) {
              yearInput.focus();
            }
          }, 10);
        }
      } else if (numericValue.length === 2) {
        const firstDigit = parseInt(numericValue[0]);
        const secondDigit = parseInt(numericValue[1]);
        
        // Se tentar digitar um valor maior que 12, limita a 12
        if (firstDigit > 1 || (firstDigit === 1 && secondDigit > 2)) {
          month = "12";
        }
        
        // Muda automaticamente para o campo do ano
        setTimeout(() => {
          const yearInput = document.getElementById('expiryYear');
          if (yearInput) {
            yearInput.focus();
          }
        }, 10);
      }
      
      setCardData({
        ...cardData,
        [name]: month
      });
    }
    else if (name === "expiryYear") {
      // Permitir apenas números para o ano
      const val = value.replace(/\D/g, '');
      
      // Limitar a 2 dígitos
      const limitedVal = val.slice(0, 2);
      
      setCardData({
        ...cardData,
        [name]: limitedVal
      });
    }
    else if (name === "cvv") {
      // Permitir apenas números para o CVV
      const val = value.replace(/\D/g, '');
      
      // Limitar a 3 ou 4 dígitos dependendo da bandeira (Amex = 4, outros = 3)
      const maxLength = cardData.brand === "amex" ? 4 : 3;
      const limitedVal = val.slice(0, maxLength);
      
      setCardData({
        ...cardData,
        [name]: limitedVal
      });
    }
    else {
      // Para outros campos (como nome)
      setCardData({
        ...cardData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsProcessing(true);
    setMessage(null);

    console.log("Processando pagamento...");

    try {
      // Se o usuário está usando um cartão existente
      if (useExistingCard && selectedCard) {
        console.log("Processando com cartão existente:", selectedCard);
        
        try {
          const response = await apiRequest("POST", "/api/process-payment", {
            paymentMethodId: selectedCard,
            planoId: planoSelecionado?.id,
            tipoCobranca: periodoPlanos
          });
          
          if (response.error) {
            throw new Error(response.error.message || "Falha ao processar o pagamento");
          }
          
          handleSuccess();
        } catch (error: any) {
          console.error("Erro ao processar cartão salvo:", error);
          setMessage(error.message || "Ocorreu um erro durante o pagamento.");
          toast({
            title: "Erro no pagamento",
            description: error.message || "Falha ao processar o cartão salvo. Tente novamente.",
            variant: "destructive"
          });
        }
      } else {
        console.log("Processando com novo cartão");
        
        // Validar os dados do cartão
        if (!cardData.cardNumber || cardData.cardNumber.replace(/\s+/g, "").length < 15) {
          setMessage("Número de cartão inválido");
          toast({
            title: "Erro de validação",
            description: "Por favor, informe um número de cartão válido",
            variant: "destructive"
          });
          setIsProcessing(false);
          return;
        }
        
        if (!cardData.cardName || cardData.cardName.length < 3) {
          setMessage("Nome do titular inválido");
          toast({
            title: "Erro de validação",
            description: "Por favor, informe o nome do titular do cartão",
            variant: "destructive"
          });
          setIsProcessing(false);
          return;
        }
        
        if (!cardData.expiryMonth || !cardData.expiryYear) {
          setMessage("Data de expiração inválida");
          toast({
            title: "Erro de validação",
            description: "Por favor, informe uma data de expiração válida",
            variant: "destructive"
          });
          setIsProcessing(false);
          return;
        }
        
        // Validação da data de expiração
        const expMonth = parseInt(cardData.expiryMonth);
        if (isNaN(expMonth) || expMonth < 1 || expMonth > 12) {
          setMessage("Mês de expiração inválido");
          toast({
            title: "Erro de validação",
            description: "O mês de expiração deve ser entre 1 e 12",
            variant: "destructive"
          });
          setIsProcessing(false);
          return;
        }
        
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        const expYear = parseInt('20' + cardData.expiryYear);
        if (isNaN(expYear) || expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
          setMessage("Cartão expirado");
          toast({
            title: "Erro de validação",
            description: "O cartão informado está expirado",
            variant: "destructive"
          });
          setIsProcessing(false);
          return;
        }
        
        if (!cardData.cvv || cardData.cvv.length < 3) {
          setMessage("Código de segurança inválido");
          toast({
            title: "Erro de validação",
            description: "Por favor, informe um código de segurança válido",
            variant: "destructive"
          });
          setIsProcessing(false);
          return;
        }
        
        try {
          // Formatar mês de expiração para sempre ter 2 dígitos
          let formattedMonth = cardData.expiryMonth;
          if (formattedMonth.length === 1) {
            formattedMonth = '0' + formattedMonth;
          }
          
          // Enviar dados do cartão para processamento
          console.log("Enviando dados para processamento do cartão...");
          
          let paymentMethodId;
          
          try {
            const cardResponse = await apiRequest("POST", "/api/process-custom-card", {
              cardNumber: cardData.cardNumber.replace(/\s+/g, ""),
              cardName: cardData.cardName,
              expiryMonth: formattedMonth,
              expiryYear: cardData.expiryYear,
              cvv: cardData.cvv,
              planoId: planoSelecionado?.id,
              tipoCobranca: periodoPlanos
            });
            
            console.log("Resposta do processamento:", cardResponse);
            
            // Se o cartão foi processado com sucesso, teremos um paymentMethodId
            if (cardResponse.error) {
              throw new Error(cardResponse.error.message || "Falha ao processar o cartão");
            }
            
            // Guardar o ID do método de pagamento para enviar ao criar assinatura
            paymentMethodId = cardResponse.paymentMethodId;
          } catch (cardError: any) {
            console.error("Erro ao processar cartão:", cardError);
            throw new Error(cardError.message || "Falha ao processar o cartão");
          }
          
          console.log("Cartão processado com sucesso, payment method ID:", paymentMethodId);
          
          // Criar a assinatura com o método de pagamento processado
          try {
            console.log("Antes de chamar handleSuccess com paymentMethodId:", paymentMethodId);
            await handleSuccess(paymentMethodId);
            console.log("Assinatura criada com sucesso!");
          } catch (assinaturaError) {
            console.error("Erro ao criar assinatura:", assinaturaError);
            throw new Error("Cartão processado com sucesso, mas houve um erro ao criar a assinatura.");
          }
        } catch (error: any) {
          console.error("Erro ao processar cartão:", error);
          setMessage(error.message || "Ocorreu um erro durante o pagamento.");
          toast({
            title: "Erro no pagamento",
            description: error.message || "Ocorreu um erro durante o pagamento.",
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      console.error("Erro ao processar pagamento:", error);
      setMessage(error.message || "Ocorreu um erro durante o processamento.");
      toast({
        title: "Erro ao processar pagamento",
        description: error.message || "Ocorreu um erro ao processar seu pagamento.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuccess = async (newPaymentMethodId?: string) => {
    try {
      // Se estamos usando um cartão existente, use o selectedCard, caso contrário use o novo paymentMethodId
      const paymentMethodToUse = useExistingCard ? selectedCard : newPaymentMethodId;
      
      console.log("Criando assinatura com método de pagamento:", paymentMethodToUse);
      
      if (!paymentMethodToUse && !useExistingCard) {
        throw new Error("Não foi possível processar o pagamento: método de pagamento não identificado");
      }
        
      // Enviar solicitação ao servidor para criar/atualizar a assinatura
      console.log("Enviando requisição para /api/assinaturas", {
        planoId: planoSelecionado?.id,
        tipoCobranca: periodoPlanos,
        paymentMethodId: paymentMethodToUse
      });
      
      const resultado = await criarAssinatura({
        planoId: planoSelecionado?.id,
        tipoCobranca: periodoPlanos,
        paymentMethodId: paymentMethodToUse
      });
      
      console.log("Resultado da criação da assinatura:", resultado);

      // Notificar sucesso
      toast({
        title: `${acaoTipo === "ASSINAR" ? "Assinatura" : acaoTipo === "UPGRADE" ? "Upgrade" : "Downgrade"} realizado com sucesso!`,
        description: `Seu plano ${planoSelecionado?.nome} foi ${acaoTipo === "ASSINAR" ? "ativado" : "atualizado"} com sucesso.`,
        variant: "default"
      });

      // Invalidar cache para buscar novos dados e garantir que a UI atualize
      invalidateAssinaturas(); // Esta função já faz recarregamento duplo e com timeout
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
      
      // Registrar que houve alteração de plano para que as barras de progresso sejam corretamente atualizadas
      console.log(`Plano ${acaoTipo === "UPGRADE" ? "atualizado" : "assinado"} com sucesso: ${planoSelecionado?.nome}`);
      
      // Voltar para a tela de planos com status atualizado
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Erro ao processar assinatura:", error);
      toast({
        title: "Erro ao processar assinatura",
        description: error.message || "Não foi possível completar sua assinatura. Por favor, tente novamente.",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  const valorPlano = periodoPlanos === "mensal" 
    ? planoSelecionado?.valorMensal 
    : planoSelecionado?.valorAnual;

  return (
    <div className="checkout-form">
      <div className="mb-6 p-4 rounded-lg bg-purple-50">
        <h3 className="text-lg font-medium text-purple-800 mb-2">Resumo do Pedido</h3>
        <div className="flex justify-between mb-1">
          <span className="text-gray-700">Plano</span>
          <span className="font-medium">{planoSelecionado?.nome}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-gray-700">Período</span>
          <span className="font-medium">{periodoPlanos === "mensal" ? "Mensal" : "Anual"}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-gray-700">Valor</span>
          <span className="font-medium text-lg text-purple-800">{valorPlano}</span>
        </div>
        {periodoPlanos === "anual" && (
          <div className="text-sm text-green-600 flex items-center justify-end mt-1">
            <CheckCircle className="w-4 h-4 mr-1" /> Economia de aproximadamente 16% em relação ao plano mensal
          </div>
        )}
      </div>

      {/* Sempre mostra os botões, mas desabilitados durante carregamento */}
      {!loadingCards && savedCards.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center mb-2">
            <h3 className="text-base font-medium">Selecione o método de pagamento</h3>
          </div>
            
          <div className="flex space-x-2 mb-4">
            <Button
              type="button"
              variant={useExistingCard ? "default" : "outline"}
              onClick={() => setUseExistingCard(true)}
              className="flex-1"
              disabled={isProcessing}
            >
              Cartão salvo
            </Button>
            <Button
              type="button"
              variant={!useExistingCard ? "default" : "outline"}
              onClick={() => setUseExistingCard(false)}
              className="flex-1"
              disabled={isProcessing}
            >
              Novo cartão
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {useExistingCard && savedCards.length > 0 ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cartão de crédito</label>
              <Select
                value={selectedCard}
                onValueChange={setSelectedCard}
                disabled={isProcessing || loadingCards}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cartão" />
                </SelectTrigger>
                <SelectContent>
                  {savedCards.map((card) => (
                    <SelectItem key={card.id} value={card.stripePaymentMethodId}>
                      {card.brand.toUpperCase()} **** {card.last4} 
                      {card.isDefault && " (Padrão)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center mb-4">
                <div>
                  <h3 className="text-xl font-semibold">Informações de Pagamento</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Clique nos campos do cartão e preencha os dados livremente em qualquer ordem
                  </p>
                </div>
              </div>

              {/* Container do cartão com animação 3D */}
              <div 
                className="w-full max-w-md mx-auto perspective-1000 my-6"
                style={{ perspective: "1000px" }}
              >
                <div 
                  className={`relative transform-style-3d transition-transform duration-500 h-56 w-full`}
                  style={{ 
                    transformStyle: "preserve-3d", 
                    transform: cardData.isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    transition: "transform 0.6s"
                  }}
                >
                  {/* Frente do cartão */}
                  <div 
                    className="absolute w-full h-full backface-hidden rounded-xl p-6 shadow-lg bg-gradient-to-r from-purple-700 to-indigo-800 text-white"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-sm opacity-80">Cartão de Crédito</span>
                        <span className="text-xs opacity-70 mt-1">Meu Preço Certo</span>
                      </div>
                      <div>
                        <CreditCard className="h-5 w-5 text-white/80" />
                      </div>
                    </div>
                    
                    <div className="mt-6 font-mono text-xl tracking-wider">
                      <input
                        id="cardNumber"
                        name="cardNumber"
                        className="bg-transparent border-none w-full font-medium text-white placeholder-white/60 focus:outline-none focus:ring-0 py-0"
                        placeholder="•••• •••• •••• ••••"
                        maxLength={19}
                        value={cardData.cardNumber}
                        onChange={handleInputChange}
                        autoComplete="cc-number"
                      />
                    </div>
                    
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs opacity-70">Nome no Cartão</div>
                        <input
                          id="cardName"
                          name="cardName"
                          className="bg-transparent border-none w-full font-medium text-white placeholder-white/60 focus:outline-none focus:ring-0 py-0"
                          placeholder="NOME DO TITULAR"
                          value={cardData.cardName}
                          onChange={handleInputChange}
                          maxLength={24}
                          style={{ textTransform: "uppercase" }}
                          autoComplete="cc-name"
                          onFocus={() => {
                            if (cardData.isFlipped) {
                              setCardData({...cardData, isFlipped: false});
                            }
                          }}
                        />
                      </div>
                      
                      <div>
                        <div className="text-xs opacity-70">Validade</div>
                        <div className="flex space-x-1 items-center">
                          <input
                            id="expiryMonth"
                            name="expiryMonth"
                            className="bg-transparent border-none font-medium w-8 text-white placeholder-white/60 focus:outline-none focus:ring-0 text-center"
                            placeholder="MM"
                            value={cardData.expiryMonth}
                            onChange={handleInputChange}
                            maxLength={2}
                            autoComplete="cc-exp-month"
                            onFocus={() => {
                              if (cardData.isFlipped) {
                                setCardData({...cardData, isFlipped: false});
                              }
                            }}
                          />
                          <span>/</span>
                          <input
                            id="expiryYear"
                            name="expiryYear"
                            className="bg-transparent border-none font-medium w-8 text-white placeholder-white/60 focus:outline-none focus:ring-0 text-center"
                            placeholder="AA"
                            value={cardData.expiryYear}
                            onChange={handleInputChange}
                            maxLength={2}
                            autoComplete="cc-exp-year"
                            onFocus={() => {
                              if (cardData.isFlipped) {
                                setCardData({...cardData, isFlipped: false});
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Verso do cartão */}
                  <div 
                    className="absolute w-full h-full backface-hidden rounded-xl p-6 shadow-lg bg-gradient-to-r from-gray-700 to-gray-900 text-white rotate-y-180"
                    style={{ 
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)"
                    }}
                  >
                    <div className="w-full h-10 bg-gray-800 mt-4"></div>
                    
                    <div className="mt-4 flex justify-end">
                      <div className="w-3/4 flex items-center justify-between bg-white/90 h-10 px-3 rounded-sm">
                        <div className="text-sm text-gray-800 font-mono">CVV</div>
                        <input
                          id="cvv"
                          name="cvv"
                          className="bg-transparent border-none w-16 text-right font-medium text-gray-900 focus:outline-none focus:ring-0 font-mono"
                          placeholder="•••"
                          value={cardData.cvv}
                          onChange={handleInputChange}
                          maxLength={4}
                          autoComplete="cc-csc"
                          onFocus={() => setCardData({...cardData, isFlipped: true})}
                        />
                      </div>
                    </div>
                    
                    <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                      <div className="text-xs text-white/60">
                        Para sua segurança, seus dados nunca serão armazenados.
                      </div>
                      <Shield className="h-4 w-4 text-white/60" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Botões para virar o cartão */}
              <div className="flex justify-center space-x-2 mb-4">
                <Button 
                  type="button" 
                  variant={!cardData.isFlipped ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCardData({...cardData, isFlipped: false})}
                >
                  Frente
                </Button>
                <Button 
                  type="button" 
                  variant={cardData.isFlipped ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCardData({...cardData, isFlipped: true})}
                >
                  Verso (CVV)
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          {message && (
            <div className="text-sm text-red-700">{message}</div>
          )}
          
          <Button
            type="submit"
            className="w-full"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              "Finalizar Pagamento"
            )}
          </Button>
        </div>
      </form>
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
  
  // Controla o carregamento completo do modal
  useEffect(() => {
    if (isOpen && planoSelecionado) {
      setIsLoading(true);
      setIsFullyLoaded(false);
      
      // Simula carregamento de dados críticos
      const initializeModal = async () => {
        try {
          // Verifica se os dados do plano estão presentes
          if (!planoSelecionado.id || !planoSelecionado.nome) {
            throw new Error('Dados do plano incompletos');
          }
          
          // Simula tempo de carregamento para preparar interface
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
              // Selecione o cartão padrão ou o primeiro disponível
              // Usar stripePaymentMethodId em vez do id do banco de dados
              const defaultCard = data.find((card: any) => card.isDefault) || data[0];
              setSelectedCard(defaultCard.stripePaymentMethodId);
              console.log('Cartão selecionado (método de pagamento Stripe):', defaultCard.stripePaymentMethodId);
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
      
      // Preparar dados para assinatura
      const payload = {
        planoId: planoSelecionado?.id,
        tipoCobranca: periodoPlanos,
        // Apenas inclui o método de pagamento se estiver usando cartão existente
        ...(useExistingCard && selectedCard ? { paymentMethodId: selectedCard } : {})
      };
      
      // Chamar API de assinatura diretamente
      const response = await apiRequest("POST", "/api/assinaturas", payload);
      
      if (response.error) {
        throw new Error(response.error.message || "Falha ao processar assinatura");
      }
      
      // Invalidar consultas para atualizar dados
      queryClient.invalidateQueries({ queryKey: ['/api/minha-assinatura'] });
      
      toast({
        title: "Assinatura processada com sucesso",
        description: `Seu plano ${planoSelecionado?.nome} foi ativado.`,
        variant: "default"
      });
      
      // Notificar componente pai do sucesso
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
  
  // Função para processar novo cartão e criar assinatura
  const handleProcessNewCard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsProcessing(true);
      setStatusMessage("Processando pagamento...");
      
      // Iniciar o processo de criação de SetupIntent para o cartão
      const setupResponse = await fetch('/api/setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!setupResponse.ok) {
        throw new Error("Não foi possível inicializar o processamento do cartão");
      }
      
      const setupData = await setupResponse.json();
      
      // Agora temos um clientSecret para usar com o Stripe Elements
      setClientSecret(setupData.clientSecret);
      
    } catch (error: any) {
      console.error("Erro ao preparar formulário de cartão:", error);
      setStatusMessage(null);
      
      toast({
        title: "Erro ao processar cartão",
        description: error.message || "Não foi possível iniciar o processamento do cartão.",
        variant: "destructive"
      });
      
      setIsProcessing(false);
    }
  };

  // Opções de aparência para o Stripe Elements
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
  
  // Apenas fornecer options quando clientSecret estiver disponível
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
            
            {/* Formulário de novo cartão com cartão visual */}
            {!useExistingCard && (
              <NewCardForm 
                isProcessing={isProcessing}
                onSubmit={handleProcessNewCard}
              />
            )}
            
            {/* Mensagem de status */}
            {statusMessage && (
              <div className="p-3 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded-md flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">{statusMessage}</p>
              </div>
            )}
            
            {/* Botões de ação - só mostrar se não estiver no formulário de novo cartão */}
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