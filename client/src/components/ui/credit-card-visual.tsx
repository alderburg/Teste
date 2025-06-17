import React from 'react';
import { cn } from '@/lib/utils';

interface CreditCardVisualProps {
  cardNumber: string;
  cardName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  brand: string;
  isFlipped: boolean;
  onFlip?: () => void;
}

export default function CreditCardVisual({
  cardNumber,
  cardName,
  expiryMonth,
  expiryYear,
  cvv,
  brand,
  isFlipped,
  onFlip
}: CreditCardVisualProps) {
  // Função para obter o gradiente da bandeira
  const getBrandGradient = (brand: string) => {
    switch (brand) {
      case 'visa':
        return 'from-blue-500 to-blue-700';
      case 'mastercard':
        return 'from-orange-500 to-red-600';
      case 'amex':
        return 'from-green-500 to-green-700';
      case 'elo':
        return 'from-yellow-500 to-orange-600';
      case 'hipercard':
        return 'from-red-500 to-pink-600';
      default:
        return 'from-gray-500 to-gray-700';
    }
  };

  // Função para obter o nome da bandeira
  const getBrandName = (brand: string) => {
    switch (brand) {
      case 'visa':
        return 'VISA';
      case 'mastercard':
        return 'MASTERCARD';
      case 'amex':
        return 'AMERICAN EXPRESS';
      case 'elo':
        return 'ELO';
      case 'hipercard':
        return 'HIPERCARD';
      default:
        return 'CREDIT CARD';
    }
  };

  // Função para formatar o número do cartão exibido
  const formatDisplayNumber = (number: string) => {
    if (!number) return '•••• •••• •••• ••••';
    
    // Remove espaços e caracteres não numéricos
    const cleanNumber = number.replace(/\D/g, '');
    
    // Se não há número, mostra o placeholder
    if (cleanNumber.length === 0) return '•••• •••• •••• ••••';
    
    // Adiciona bullets para os dígitos não digitados
    const paddedNumber = cleanNumber.padEnd(16, '•');
    
    // Formata em grupos de 4
    return paddedNumber.replace(/(.{4})/g, '$1 ').trim();
  };

  // Função para formatar a data de expiração
  const formatExpiryDate = () => {
    if (!expiryMonth && !expiryYear) return '••/••';
    
    const month = expiryMonth.padStart(2, '0') || '••';
    const year = expiryYear || '••';
    
    return `${month}/${year}`;
  };

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div 
        className={cn(
          "relative w-full h-48 cursor-pointer transition-transform duration-700 transform-style-preserve-3d",
          isFlipped && "rotate-y-180"
        )}
        onClick={onFlip}
        style={{ perspective: '1000px' }}
      >
        {/* Frente do cartão */}
        <div 
          className={cn(
            "absolute inset-0 w-full h-full rounded-xl shadow-2xl p-6 text-white",
            "bg-gradient-to-br", getBrandGradient(brand),
            "backface-hidden flex flex-col justify-between"
          )}
        >
          {/* Header com logo da bandeira */}
          <div className="flex justify-between items-start">
            <div className="text-xs font-medium opacity-80">
              {getBrandName(brand)}
            </div>
            <div className="w-8 h-5 bg-white/20 rounded border border-white/30"></div>
          </div>

          {/* Número do cartão */}
          <div className="space-y-4">
            <div className="text-lg font-mono tracking-wider">
              {formatDisplayNumber(cardNumber)}
            </div>
            
            <div className="flex justify-between items-end">
              {/* Nome do titular */}
              <div>
                <div className="text-xs opacity-80 mb-1">TITULAR</div>
                <div className="text-sm font-medium uppercase">
                  {cardName || 'SEU NOME AQUI'}
                </div>
              </div>
              
              {/* Data de expiração */}
              <div>
                <div className="text-xs opacity-80 mb-1">VÁLIDO ATÉ</div>
                <div className="text-sm font-mono">
                  {formatExpiryDate()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verso do cartão */}
        <div 
          className={cn(
            "absolute inset-0 w-full h-full rounded-xl shadow-2xl",
            "bg-gradient-to-br", getBrandGradient(brand),
            "backface-hidden rotate-y-180 flex flex-col"
          )}
        >
          {/* Tarja magnética */}
          <div className="w-full h-12 bg-black mt-6"></div>
          
          {/* Área do CVV */}
          <div className="flex-1 p-6 flex flex-col justify-center">
            <div className="bg-white h-8 rounded flex items-center justify-end px-3 mb-4">
              <span className="text-black font-mono text-sm">
                {cvv || '•••'}
              </span>
            </div>
            
            <div className="text-white text-xs opacity-80 text-center">
              {getBrandName(brand)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Instruções */}
      <div className="text-center mt-4">
        <p className="text-sm text-gray-500">
          Clique no cartão para ver o verso
        </p>
      </div>
    </div>
  );
}