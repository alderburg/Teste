import React, { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, ArrowLeft, CreditCardIcon, ChevronRight, ChevronLeft } from "lucide-react";

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
  const number = cardNumber.replace(/\D/g, "");
  if (!number) return "";
  
  if (/^4/.test(number)) return "visa";
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01])/.test(number)) return "mastercard";
  if (/^3[47]/.test(number)) return "amex";
  if (/^(6011|622(12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9[0-1][0-9]|92[0-5])|64[4-9]|65)/.test(number)) return "discover";
  
  return "";
};

// Função para formatar número do cartão
const formatCardNumber = (value: string): string => {
  const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
  
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

// Função para formatar a data de expiração
const formatExpiryDate = (month: string, year: string): string => {
  const m = month.padStart(2, "0");
  const y = year.length === 2 ? year : year.slice(-2);

  if (!m || !y) return "";
  return `${m}/${y}`;
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
  const cardNumberRef = useRef<HTMLInputElement>(null);
  const cvvRef = useRef<HTMLInputElement>(null);

  // Função para salvar cartão (substituindo useMutation)
  const saveCard = async (data: CreditCardFormData) => {
    try {
      setIsProcessing(true);
      console.log("Salvando cartão:", data.cardNumber.substring(0, 4) + "xxxx");
      
      // Simular processamento do cartão
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Cartão adicionado com sucesso!",
        description: "Seu método de pagamento foi configurado e está pronto para uso.",
        variant: "default"
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao processar cartão",
        description: error.message || "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Efeito para detectar a bandeira do cartão
  useEffect(() => {
    const brand = detectCardBrand(formData.cardNumber);
    setCardBrand(brand);
  }, [formData.cardNumber]);

  // Efeito para focar no campo de número do cartão quando o componente é montado
  useEffect(() => {
    setTimeout(() => {
      if (cardNumberRef.current) {
        cardNumberRef.current.focus();
      }
    }, 100);
  }, []);

  // Verificar se a frente do cartão está completa
  useEffect(() => {
    const complete = formData.cardNumber.replace(/\s+/g, "").length >= 15 && 
                    formData.cardName.length >= 3 && 
                    Boolean(formData.expiryMonth) && 
                    Boolean(formData.expiryYear);
    setIsFrontComplete(complete);
    
    if (complete && !formData.cvv) {
      setIsFlipped(true);
      setTimeout(() => {
        cvvRef.current?.focus();
      }, 300);
    }
  }, [formData.cardNumber, formData.cardName, formData.expiryMonth, formData.expiryYear, formData.cvv]);

  // Handler unificado para mudanças nos inputs (do arquivo original)
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
              (yearInput as HTMLInputElement).focus();
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
            (yearInput as HTMLInputElement).focus();
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

  // Handler para submissão do formulário (do arquivo original)
  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation(); // Impede comportamento padrão do browser
    }

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

    console.log("Iniciando salvamento do cartão:", submissionData);
    await saveCard(submissionData);
  };

  // Função para validar o formulário
  const validarFormulario = (): boolean => {
    // Validação do CVV
    if (!formData.cvv || formData.cvv.length < (cardBrand === "amex" ? 4 : 3)) {
      setIsFlipped(true);
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
        description: `O cartão deve ter ${requiredLength} dígitos`,
        variant: "destructive"
      });
      setIsFlipped(false);
      cardNumberRef.current?.focus();
      return false;
    }

    if (!formData.cardName || formData.cardName.trim().length < 3) {
      toast({
        title: "Nome inválido",
        description: "Por favor, informe o nome completo do titular",
        variant: "destructive"
      });
      setIsFlipped(false);
      return false;
    }

    if (!formData.expiryMonth || !formData.expiryYear) {
      toast({
        title: "Data de expiração inválida",
        description: "Por favor, informe mês e ano de expiração",
        variant: "destructive"
      });
      setIsFlipped(false);
      return false;
    }

    return true;
  };

  const toggleCardSide = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Adicionar Cartão</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </Button>
          </div>

          {/* Cartão Virtual */}
          <div className="perspective-1000 mb-6">
            <div 
              className={`relative w-full h-48 transition-transform duration-700 transform-style-preserve-3d ${
                isFlipped ? "rotate-y-180" : ""
              }`}
            >
              {/* Frente do Cartão */}
              <div className="absolute inset-0 w-full h-full rounded-xl bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 text-white p-6 backface-hidden">
                <div className="h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <CreditCardIcon className="w-8 h-8" />
                    {cardBrand && (
                      <div className="text-2xl">
                        {cardBrand === "visa" && <SiVisa />}
                        {cardBrand === "mastercard" && <SiMastercard />}
                        {cardBrand === "amex" && <SiAmericanexpress />}
                        {cardBrand === "discover" && <SiDiscover />}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className="text-xl font-mono tracking-wider mb-4">
                      {formData.cardNumber || "•••• •••• •••• ••••"}
                    </div>
                    <div className="flex justify-between">
                      <div>
                        <div className="text-xs opacity-70 mb-1">NOME</div>
                        <div className="text-sm font-medium">
                          {formData.cardName.toUpperCase() || "SEU NOME"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs opacity-70 mb-1">VÁLIDO ATÉ</div>
                        <div className="text-sm font-mono">
                          {formatExpiryDate(formData.expiryMonth, formData.expiryYear) || "MM/AA"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verso do Cartão */}
              <div className="absolute inset-0 w-full h-full rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 text-white p-6 rotate-y-180 backface-hidden">
                <div className="h-full flex flex-col">
                  <div className="w-full h-12 bg-black mt-4 mb-6"></div>
                  <div className="flex-1 flex items-center">
                    <div className="w-full">
                      <div className="text-xs opacity-70 mb-2">CVV</div>
                      <div className="bg-white text-black p-2 rounded text-right font-mono">
                        {formData.cvv || "•••"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Formulário */}
          <div className="space-y-4">
            {!isFlipped ? (
              <>
                {/* Número do Cartão */}
                <div>
                  <Label htmlFor="cardNumber">Número do Cartão</Label>
                  <Input
                    id="cardNumber"
                    ref={cardNumberRef}
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={formData.cardNumber}
                    onChange={handleInputChange}
                    name="cardNumber"
                    className="mt-1"
                  />
                </div>

                {/* Nome do Titular */}
                <div>
                  <Label htmlFor="cardName">Nome do Titular</Label>
                  <Input
                    id="cardName"
                    type="text"
                    placeholder="Nome como no cartão"
                    value={formData.cardName}
                    onChange={handleNameChange}
                    className="mt-1"
                  />
                </div>

                {/* Data de Expiração */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="expiryMonth">Mês</Label>
                    <Input
                      id="expiryMonth"
                      type="text"
                      placeholder="MM"
                      value={formData.expiryMonth}
                      onChange={handleExpiryMonthChange}
                      maxLength={2}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiryYear">Ano</Label>
                    <Input
                      id="expiryYear"
                      type="text"
                      placeholder="AA"
                      value={formData.expiryYear}
                      onChange={handleExpiryYearChange}
                      maxLength={2}
                      className="mt-1"
                    />
                  </div>
                </div>

                {isFrontComplete && (
                  <Button
                    onClick={toggleCardSide}
                    variant="outline"
                    className="w-full"
                  >
                    Continuar para CVV
                    →
                  </Button>
                )}
              </>
            ) : (
              <>
                {/* CVV */}
                <div>
                  <Label htmlFor="cvv">Código de Segurança (CVV)</Label>
                  <Input
                    id="cvv"
                    ref={cvvRef}
                    type="text"
                    placeholder={cardBrand === "amex" ? "1234" : "123"}
                    value={formData.cvv}
                    onChange={handleCvvChange}
                    maxLength={cardBrand === "amex" ? 4 : 3}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {cardBrand === "amex" 
                      ? "4 dígitos na frente do cartão" 
                      : "3 dígitos no verso do cartão"}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={toggleCardSide}
                    variant="outline"
                    className="flex-1"
                  >
                    ←
                    Voltar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isProcessing || !validarFormulario()}
                    className="flex-1"
                  >
                    {isProcessing ? "Processando..." : "Adicionar Cartão"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}