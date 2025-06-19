import React, { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, ArrowLeft, CreditCardIcon } from "lucide-react";

// Ícones de bandeiras de cartão
import { 
  SiVisa,
  SiMastercard,
  SiAmericanexpress,
  SiDiscover
} from "react-icons/si";

interface CreditCardFormData {
  cardNumber: string;
  cardName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

interface InteractiveCardFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Função para detectar a bandeira do cartão baseado no número
const detectCardBrand = (cardNumber: string): string => {
  // Remove espaços e caracteres não numéricos
  const number = cardNumber.replace(/\D/g, "");

  if (!number) return "";

  // Visa: começa com 4
  if (/^4/.test(number)) return "visa";

  // Mastercard: começa com 51-55 ou 2221-2720
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01])/.test(number)) return "mastercard";

  // American Express: começa com 34 ou 37
  if (/^3[47]/.test(number)) return "amex";

  // Discover: começa com 6011, 622126-622925, 644-649, ou 65
  if (/^(6011|622(12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9[0-1][0-9]|92[0-5])|64[4-9]|65)/.test(number)) return "discover";

  // JCB: começa com 3528-3589
  if (/^35(2[8-9]|[3-8][0-9])/.test(number)) return "jcb";

  return "";
};

const getBrandIcon = (brand: string) => {
  switch (brand) {
    case "visa":
      return <SiVisa className="text-blue-600 h-8 w-12" />;
    case "mastercard":
      return <SiMastercard className="text-red-600 h-8 w-12" />;
    case "amex":
      return <SiAmericanexpress className="text-blue-700 h-8 w-12" />;
    case "discover":
      return <SiDiscover className="text-orange-600 h-8 w-12" />;
    case "jcb":
      return <CreditCardIcon className="text-green-600 h-8 w-12" />;
    default:
      return <CreditCardIcon className="text-gray-400 h-8 w-12" />;
  }
};

// Função para formatar o número do cartão
const formatCardNumber = (value: string): string => {
  if (!value) return value;

  // Remove espaços e caracteres não numéricos
  const v = value.replace(/\s+/g, "").replace(/\D/g, "");

  // Amex formata 4-6-5 (15 dígitos)
  if (detectCardBrand(v) === "amex") {
    // Limitar a 15 dígitos para AMEX
    const digits = v.slice(0, 15);

    // Formato 4-6-5
    if (digits.length <= 4) {
      return digits;
    } else if (digits.length <= 10) {
      return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    } else {
      return `${digits.slice(0, 4)} ${digits.slice(4, 10)} ${digits.slice(10)}`;
    }
  }

  // Outros cartões formatam 4-4-4-4 (16 dígitos)
  // Limitar a 16 dígitos para outros cartões
  const digits = v.slice(0, 16);

  // Aplicar formato 4-4-4-4
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

// Função para formatar a data de expiração
const formatExpiryDate = (month: string, year: string): string => {
  const m = month.padStart(2, "0");
  const y = year.length === 2 ? year : year.slice(-2);

  if (!m || !y) return "";
  return `${m}/${y}`;
};

// Função para validar o cartão e simular verificação de fundos
interface VerifyCardResult {
  success: boolean;
  errorTitle?: string;
  errorMessage?: string;
}

const verifyCardFunds = async (cardData: CreditCardFormData): Promise<VerifyCardResult> => {
  // Remover espaços do número do cartão
  const cardNumber = cardData.cardNumber.replace(/\s+/g, "");

  // Regras de teste para simulação:
  // 1. Cartões terminados em "0000" - recusados por falta de fundos
  // 2. Cartões terminados em "0001" - recusados por cartão inválido
  // 3. Cartões terminados em "0002" - recusados por cartão expirado
  // 4. Outros cartões - aceitos normalmente

  // Simular uma chamada de API (atraso de 1 segundo)
  return new Promise(resolve => {
    setTimeout(() => {
      if (cardNumber.endsWith("0000")) {
        resolve({
          success: false,
          errorTitle: "Cartão recusado",
          errorMessage: "Cartão sem fundos suficientes. Por favor, tente outro cartão."
        });
      } else if (cardNumber.endsWith("0001")) {
        resolve({
          success: false,
          errorTitle: "Cartão inválido",
          errorMessage: "Os dados do cartão são inválidos. Verifique as informações e tente novamente."
        });
      } else if (cardNumber.endsWith("0002")) {
        resolve({
          success: false,
          errorTitle: "Cartão expirado",
          errorMessage: "Este cartão expirou ou foi cancelado. Por favor, tente outro cartão."
        });
      } else {
        // Cartão válido com fundos suficientes
        resolve({ success: true });
      }
    }, 1000);
  });
};

export default function InteractiveCardForm({ onClose, onSuccess }: InteractiveCardFormProps) {
  const [formData, setFormData] = useState<CreditCardFormData>({
    cardNumber: "",
    cardName: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [cardBrand, setCardBrand] = useState("");
  const [isFrontComplete, setIsFrontComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cardNumberRef = useRef<HTMLInputElement>(null);
  const cvvRef = useRef<HTMLInputElement>(null);

  const saveCardMutation = useMutation({
    mutationFn: async (data: CreditCardFormData) => {
      try {
        setIsProcessing(true);
        // Mostrar mensagem de carregamento
        toast({
          title: "Processando cartão",
          description: "Verificando dados do cartão...",
          variant: "default"
        });

        console.log("Iniciando processamento do cartão:", data.cardNumber.substring(0, 4) + "xxxx");

        // Formatar e validar os dados do cartão
        const cleanCardNumber = data.cardNumber.replace(/\s+/g, '');
        if (cleanCardNumber.length < 15 || cleanCardNumber.length > 16) {
          throw new Error("Número de cartão inválido. Deve ter 15 ou 16 dígitos.");
        }

        const expMonth = parseInt(data.expiryMonth);
        if (isNaN(expMonth) || expMonth < 1 || expMonth > 12) {
          throw new Error("Mês de expiração inválido. Deve ser entre 1 e 12.");
        }

        const expYear = data.expiryYear.length === 2 ? 
                       parseInt('20' + data.expiryYear) : 
                       parseInt(data.expiryYear);

        // Verificar se o ano é válido (não expirado)
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
          throw new Error("Cartão expirado. Por favor, verifique a data de validade.");
        }

        if (!data.cardName || data.cardName.trim().length < 3) {
          throw new Error("Nome do titular inválido. Por favor, informe o nome completo.");
        }

        // Validar CVV baseado no tipo de cartão
        const requiredCvvLength = (cardBrand === "amex") ? 4 : 3;
        if (!data.cvv || data.cvv.length !== requiredCvvLength) {
          throw new Error(`Código de segurança inválido. ${cardBrand === "amex" ? "American Express" : "Este cartão"} deve ter ${requiredCvvLength} dígitos.`);
        }

        console.log("Dados do cartão validados localmente, conectando ao Stripe...");

        // 2. Usar o endpoint de SetupIntent para tokenização segura
        console.log("Criando SetupIntent para tokenização segura...");

        toast({
          title: "Configurando pagamento",
          description: "Preparando para processar o cartão de forma segura...",
          variant: "default"
        });

        // Obter SetupIntent do servidor
        let setupIntentResult;
        try {
          setupIntentResult = await apiRequest("POST", "/api/setup-intent");
          console.log("SetupIntent criado com sucesso:", setupIntentResult);
        } catch (setupError) {
          console.error("Erro ao criar SetupIntent:", setupError);
          throw new Error("Não foi possível iniciar o processo de pagamento. Tente novamente mais tarde.");
        }

        if (!setupIntentResult?.clientSecret) {
          throw new Error("Erro na configuração de pagamento. Resposta incompleta do servidor.");
        }

        // Usar Stripe.js para criar PaymentMethod de forma segura
        console.log("Criando PaymentMethod com Stripe.js...");

        // Verificar se temos acesso ao Stripe
        if (!window.Stripe) {
          throw new Error("Stripe não carregado. Recarregue a página e tente novamente.");
        }

        const stripe = window.Stripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
        if (!stripe) {
          throw new Error("Erro ao inicializar Stripe. Verifique a configuração.");
        }

        // Para ambiente de teste, usar tokens de teste do Stripe
        // Em produção, isso seria feito com Stripe Elements
        let paymentMethod;
        let paymentMethodError = null;

        // Mapear diferentes tipos de cartão para tokens de teste do Stripe
        let testToken = 'tok_visa'; // padrão

        if (cleanCardNumber === '4242424242424242') {
          testToken = 'tok_visa';
        } else if (cleanCardNumber === '5555555555554444') {
          testToken = 'tok_mastercard';
        } else if (cleanCardNumber === '378282246310005') {
          testToken = 'tok_amex';
        } else if (cleanCardNumber === '6011111111111117') {
          testToken = 'tok_discover';
        } else if (cleanCardNumber === '3566111111111113') {
          testToken = 'tok_visa'; // JCB usa token genérico para teste
        } else {
          // Aceitar qualquer cartão válido para teste, usando token genérico
          testToken = 'tok_visa';
        }

        // Criar PaymentMethod com o token apropriado
        const result = await stripe.createPaymentMethod({
          type: 'card',
          card: {
            token: testToken
          },
          billing_details: {
            name: data.cardName,
          },
        });
        paymentMethodError = result.error;
        paymentMethod = result.paymentMethod;

        if (paymentMethodError) {
          console.error("Erro ao criar PaymentMethod:", paymentMethodError);
          throw new Error(paymentMethodError.message || "Erro ao processar os dados do cartão.");
        }

        if (!paymentMethod) {
          throw new Error("Falha ao criar método de pagamento.");
        }

        console.log("PaymentMethod criado com sucesso:", paymentMethod.id);

        // Confirmar SetupIntent com o PaymentMethod
        const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(
          setupIntentResult.clientSecret,
          {
            payment_method: paymentMethod.id,
          }
        );

        if (confirmError) {
          console.error("Erro ao confirmar SetupIntent:", confirmError);
          throw new Error(confirmError.message || "Erro ao confirmar o cartão.");
        }

        if (!setupIntent || setupIntent.status !== 'succeeded') {
          throw new Error("Falha na confirmação do cartão.");
        }

        console.log("SetupIntent confirmado com sucesso:", setupIntent.id);

        // Agora salvar no servidor usando a nova rota de confirmação
        console.log("Salvando cartão no banco de dados...");

        try {
          const saveResult = await apiRequest("POST", "/api/confirm-card-setup", {
            setupIntentId: setupIntent.id,
            paymentMethodId: paymentMethod.id
          });

          console.log("Cartão salvo com sucesso:", saveResult);

          toast({
            title: "Cartão adicionado com sucesso!",
            description: "Seu método de pagamento foi configurado e está pronto para uso.",
            variant: "default"
          });

          // Invalidar cache para atualizar lista de cartões
          queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });

          if (onSuccess) {
            onSuccess(saveResult);
          }

        } catch (saveError) {
          console.error("Erro ao salvar cartão:", saveError);
          throw new Error("Cartão validado mas não foi possível salvar. Tente novamente.");
        }

      } catch (error) {
        console.error("Erro durante o processamento:", error);
        throw error instanceof Error ? error : new Error("Erro ao processar o cartão");
      } finally {
        setIsProcessing(false);
      }
    },
    onSuccess: () => {
      toast({
        title: "Cartão adicionado",
        description: "Seu cartão foi adicionado com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar cartão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Efeito para detectar a bandeira do cartão
  useEffect(() => {
    const brand = detectCardBrand(formData.cardNumber);
    setCardBrand(brand);
  }, [formData.cardNumber]);

  // Efeito para focar no campo de número do cartão quando o componente é montado
  useEffect(() => {
    // Pequeno atraso para garantir que o componente já está renderizado
    setTimeout(() => {
      if (cardNumberRef.current) {
        cardNumberRef.current.focus();
      }
    }, 100);
  }, []);

  // Efeito para verificar se a frente do cartão está completa
  // Não exigimos validação completa para permitir a navegação entre campos
  useEffect(() => {
    // Consideramos "frente completa" se o usuário preencheu pelo menos o número do cartão
    // e começou a preencher os outros campos, para permitir maior flexibilidade
    const isFrontComplete = 
      formData.cardNumber.replace(/\s+/g, "").length >= 15 &&
      formData.cardName.length >= 3;

    setIsFrontComplete(isFrontComplete);

    // Não viramos o cartão automaticamente, o usuário deve clicar no botão
    // para proporcionar melhor experiência com digitação direta no cartão
  }, [formData]);

  // Handler para mudanças nos inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "cardNumber") {
      // Limitar número de caracteres com base no tipo de cartão
      // AMEX: 4-6-5 (15 dígitos + 2 espaços = 17 caracteres máximo)
      // Outros: 4-4-4-4 (16 dígitos + 3 espaços = 19 caracteres máximo)
      const maxLength = detectCardBrand(value) === "amex" ? 17 : 19;

      // Formatar e limitar o valor
      const formattedValue = formatCardNumber(value).slice(0, maxLength);

      setFormData({
        ...formData,
        [name]: formattedValue,
      });
    } else if (name === "expiryMonth") {
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
            // antes de mudar para o campo do ano
            setFormData(prev => ({
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

      setFormData({
        ...formData,
        [name]: month,
      });
    } else if (name === "expiryYear") {
      // Atualizar ano
      const numericValue = value.replace(/\D/g, "");
      const currentYear = new Date().getFullYear();
      let year = numericValue;

      // Se for digitado apenas dois dígitos, assume como 20XX
      if (numericValue.length <= 2) {
        year = numericValue;
      }

      setFormData({
        ...formData,
        [name]: year,
      });
    } else if (name === "cvv") {
      // Limitar CVV a 3-4 dígitos numéricamente
      const maxLength = cardBrand === "amex" ? 4 : 3;
      const numericValue = value.replace(/\D/g, "").slice(0, maxLength);
      setFormData({
        ...formData,
        [name]: numericValue,
      });
    } else if (name === "cardName") {
      // Converter o nome para maiúsculas enquanto digita
      const upperCaseValue = value.toUpperCase();
      setFormData({
        ...formData,
        [name]: upperCaseValue,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  // Handler para submissão do formulário
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Impede comportamento padrão do browser

    // Validar os campos antes de submeter
    if (!validarFormulario()) {
      return;
    }

    // Formatar os dados para envio (adicionar zero à esquerda no mês se necessário)
    let expiryMonth = formData.expiryMonth;
    if (expiryMonth.length === 1) {
      expiryMonth = "0" + expiryMonth;
    }

    const submissionData = {
      ...formData,
      expiryMonth: expiryMonth,
      expiryYear: formData.expiryYear.length === 2 
        ? "20" + formData.expiryYear 
        : formData.expiryYear,
    };

    console.log("Iniciando mutação otimista:", submissionData);

    // Chamar diretamente a mutação sem verificação prévia de fundos
    // A verificação agora só acontecerá pelo Stripe durante o processamento
    saveCardMutation.mutate(submissionData);
  };

  // Função para validar o formulário
  const validarFormulario = (): boolean => {
    // Validação do CVV
    if (!formData.cvv || formData.cvv.length < (cardBrand === "amex" ? 4 : 3)) {
      setIsFlipped(true); // Garante que estamos no verso do cartão
      setTimeout(() => {
        cvvRef.current?.focus();
      }, 300);
      return false;
    }

    // Validação do número do cartão
    const cardNumberDigits = formData.cardNumber.replace(/\s+/g, "");
    const isAmex = detectCardBrand(cardNumberDigits) === "amex";
    const requiredLength = isAmex ? 15 : 16;

    if (cardNumberDigits.length !== requiredLength) {
      toast({
        title: "Número de cartão inválido",
        description: `Por favor, digite um número de cartão válido com ${requiredLength} dígitos`,
        variant: "destructive",
      });
      setIsFlipped(false);
      setTimeout(() => cardNumberRef.current?.focus(), 300);
      return false;
    }

    // Validação do nome no cartão
    if (formData.cardName.length < 3) {
      toast({
        title: "Nome inválido",
        description: "Por favor, digite o nome como aparece no cartão",
        variant: "destructive",
      });
      setIsFlipped(false);
      return false;
    }

    // Validação da data de expiração
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const expYear = formData.expiryYear.length === 2 
      ? parseInt("20" + formData.expiryYear) 
      : parseInt(formData.expiryYear);
    const expMonth = parseInt(formData.expiryMonth);

    if (
      isNaN(expYear) || 
      isNaN(expMonth) || 
      expMonth < 1 || 
      expMonth > 12 || 
      (expYear < currentYear) || 
      (expYear === currentYear && expMonth < currentMonth)
    ) {
      toast({
        title: "Data de expiração inválida",
        description: "Por favor, verifique a data de expiração do cartão",
        variant: "destructive",
      });
      setIsFlipped(false);
      return false;
    }

    // Se passou por todas as validações
    return true;
  };

  // Vira o cartão manualmente sem forçar foco
  const flipCard = () => {
    setIsFlipped(!isFlipped);
    // Removido foco automático para permitir que o usuário clique em qualquer campo livremente
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <Button 
          variant="ghost" 
          className="p-0 h-auto mr-3" 
          onClick={onClose}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h3 className="text-xl font-semibold">Adicionar Novo Cartão</h3>
          <p className="text-sm text-gray-500 mt-1">
            Clique diretamente no cartão para inserir seus dados
          </p>
        </div>
      </div>

      {/* Container do cartão com animação */}
      <form onSubmit={handleSubmit} className="space-y-4 mt-6" noValidate>
        <div 
          className="w-full max-w-md mx-auto perspective-1000 my-6"
          style={{ perspective: "1000px" }}
        >
          <div 
            className={`relative transform-style-3d transition-transform duration-500 h-56 w-full ${
              isFlipped ? "rotate-y-180" : ""
            }`}
            style={{ 
              transformStyle: "preserve-3d", 
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              transition: "transform 0.6s"
            }}
          >
            {/* Frente do cartão */}
            <div 
              className="absolute w-full h-full backface-hidden rounded-xl p-6 shadow-lg bg-gradient-to-r from-purple-700 to-indigo-800 text-white cursor-pointer"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-sm opacity-80">Cartão de Crédito</span>
                  <span className="text-xs opacity-70 mt-1">Meu Preço Certo</span>
                </div>
                <div className="h-8">
                  {getBrandIcon(cardBrand)}
                </div>
              </div>

              {/* Número do cartão */}
              <div className="mt-8 font-mono text-xl tracking-wider">
                <input
                    id="cardNumber"
                    name="cardNumber"
                    className="bg-transparent border-none w-full font-medium text-white placeholder-white/60 focus:outline-none focus:ring-0 focus:bg-transparent"
                    placeholder="0000 0000 0000 0000"
                    value={formData.cardNumber}
                    onChange={handleInputChange}
                    autoComplete="cc-number"
                    ref={cardNumberRef}
                    maxLength={19} // 16 dígitos + 3 espaços (ou 15+2 para AMEX)
                    style={{ background: 'transparent' }}
                    autoFocus
                    disabled={isProcessing}
                  />
              </div>

              <div className="mt-6 flex justify-between">
                <div className="flex flex-col relative">
                  <span className="text-xs opacity-70">Nome no Cartão</span>
                  <input
                      id="cardName"
                      name="cardName"
                      className="bg-transparent border-none font-medium truncate max-w-[180px] text-white placeholder-white/60 focus:outline-none focus:ring-0 focus:bg-transparent"
                      placeholder="NOME COMPLETO"
                      value={formData.cardName}
                      onChange={handleInputChange}
                      onFocus={(e) => {
                        // Verificar se o número do cartão está completo
                        const cardNumberDigits = formData.cardNumber.replace(/\s+/g, "");
                        const isAmex = detectCardBrand(cardNumberDigits) === "amex";
                        const requiredLength = isAmex ? 15 : 16;

                        if (cardNumberDigits.length < requiredLength) {
                          // Se não estiver completo, volta o foco para o número do cartão
                          e.preventDefault();
                          toast({
                            title: "Preencha o número do cartão",
                            description: "Por favor, complete o número do cartão primeiro",
                            variant: "destructive",
                          });
                          setTimeout(() => cardNumberRef.current?.focus(), 10);
                        }
                      }}
                      autoComplete="cc-name"
                      style={{ background: 'transparent' }}
                      disabled={isProcessing}
                    />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs opacity-70">Validade</span>
                  <div className="flex items-center">
                    <input
                        id="expiryMonth"
                        name="expiryMonth"
                        className="bg-transparent border-none font-medium w-8 text-white placeholder-white/60 focus:outline-none focus:ring-0 text-center focus:bg-transparent"
                        placeholder="MM"
                        value={formData.expiryMonth}
                        onChange={handleInputChange}
                        onFocus={(e) => {
                          // Verificar se o número do cartão está completo
                          const cardNumberDigits = formData.cardNumber.replace(/\s+/g, "");
                          const isAmex = detectCardBrand(cardNumberDigits) === "amex";
                          const requiredLength = isAmex ? 15 : 16;

                          if (cardNumberDigits.length < requiredLength) {
                            // Se não estiver completo, volta o foco para o número do cartão
                            e.preventDefault();
                            toast({
                              title: "Preencha o número do cartão",
                              description: "Por favor, complete o número do cartão primeiro",
                              variant: "destructive",
                            });
                            setTimeout(() => cardNumberRef.current?.focus(), 10);
                          }
                        }}
                        maxLength={2}
                        autoComplete="cc-exp-month"
                        style={{ background: 'transparent' }}
                        disabled={isProcessing}
                      />
                    <span className="mx-1">/</span>
                    <input
                        id="expiryYear"
                        name="expiryYear"
                        className="bg-transparent border-none font-medium w-8 text-white placeholder-white/60 focus:outline-none focus:ring-0 text-center focus:bg-transparent"
                        placeholder="AA"
                        value={formData.expiryYear}
                        onChange={handleInputChange}
                        onFocus={(e) => {
                          // Verificar se o número do cartão está completo
                          const cardNumberDigits = formData.cardNumber.replace(/\s+/g, "");
                          const isAmex = detectCardBrand(cardNumberDigits) === "amex";
                          const requiredLength = isAmex ? 15 : 16;

                          if (cardNumberDigits.length < requiredLength) {
                            // Se não estiver completo, volta o foco para o número do cartão
                            e.preventDefault();
                            toast({
                              title: "Preencha o número do cartão",
                              description: "Por favor, complete o número do cartão primeiro",
                              variant: "destructive",
                            });
                            setTimeout(() => cardNumberRef.current?.focus(), 10);
                          }
                        }}
                        maxLength={2}
                        autoComplete="cc-exp-year"
                        style={{ background: 'transparent' }}
                        disabled={isProcessing}
                      />
                  </div>
                </div>
              </div>
            </div>

            {/* Verso do cartão */}
            <div 
              className="absolute w-full h-full backface-hidden rounded-xl shadow-lg bg-gradient-to-r from-purple-700 to-indigo-800 text-white cursor-pointer"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <div className="w-full h-12 bg-gray-800 mt-4"></div>

              <div className="mt-6 relative">
                <div className="bg-white/80 h-10 flex items-center px-3 rounded">
                  <div className="flex-grow"></div>
                  <input
                      id="cvv"
                      name="cvv"
                      className="font-mono text-gray-800 text-right bg-transparent border-none focus:outline-none focus:ring-0 w-16 focus:bg-transparent"
                      placeholder={`CVV ${cardBrand === "amex" ? "4" : "3"} Dígitos`}
                      value={formData.cvv}
                      onChange={handleInputChange}
                      onFocus={(e) => {
                        // Verificar se o número do cartão está completo
                        const cardNumberDigits = formData.cardNumber.replace(/\s+/g, "");
                        const isAmex = detectCardBrand(cardNumberDigits) === "amex";
                        const requiredLength = isAmex ? 15 : 16;

                        if (cardNumberDigits.length < requiredLength) {
                          // Se não estiver completo, volta o foco para o número do cartão
                          e.preventDefault();
                          toast({
                            title: "Preencha o número do cartão",
                            description: "Por favor, complete o número do cartão primeiro",
                            variant: "destructive",
                          });
                          setIsFlipped(false); // Vira o cartão
                          setTimeout(() => cardNumberRef.current?.focus(), 300);
                        }
                      }}
                      maxLength={cardBrand === "amex" ? 4 : 3}
                      ref={cvvRef}
                      autoComplete="new-password"
                      style={{ background: 'transparent' }}
                      aria-invalid="false"
                      formNoValidate
                      disabled={isProcessing}
                    />
                </div>

                <div className="absolute -right-2 -top-2">
                  {getBrandIcon(cardBrand)}
                </div>
              </div>

              <div className="mt-6 text-xs opacity-70 text-right">
                O código de segurança está no verso do seu cartão.
              </div>
            </div>
          </div>
        </div>

        {/* Botões de navegação e submissão */}
        <div className="mt-6">
          {!isFlipped ? (
            // Quando estiver na frente do cartão
            <div className="pt-2">
              <div className="text-xs text-center text-gray-500 mb-2">
                Clique nos campos do cartão e preencha os dados livremente em qualquer ordem
              </div>
              <Button 
                type="button" 
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={flipCard}
                disabled={!isFrontComplete || isProcessing}
              >
                Continuar para CVV
              </Button>
            </div>
          ) : (
            // Quando estiver no verso do cartão
            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                className="flex-1"
                variant="outline"
                onClick={flipCard}
                disabled={isProcessing}
              >
                Voltar
              </Button>

              <Button 
                type="submit" 
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={saveCardMutation.isPending || isProcessing}
              >
                {(saveCardMutation.isPending || isProcessing) ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Salvando...
                  </div>
                ) : (
                  "Salvar Cartão"
                )}
              </Button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}