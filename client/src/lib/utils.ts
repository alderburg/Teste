import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Função para detectar se o dispositivo é móvel
export function isMobileDevice(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.innerWidth < 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ))
  );
}

export function formatCurrency(value: string | null): string {
  if (!value) return "R$ 0,00";
  const numValue = parseFloat(value.replace(',', '.'));
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(numValue);
}

/**
 * Formata um nome para ter a primeira letra de cada palavra em maiúscula,
 * exceto palavras de ligação como "de", "da", "dos", etc.
 * Exemplo: "anderson dos santos" => "Anderson dos Santos"
 * @param name Nome a ser formatado
 * @returns Nome formatado
 */
export function formatName(name: string): string {
  if (!name) return '';
  
  // Lista de palavras que devem permanecer em minúsculas
  const lowerCaseWords = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'por', 'com'];
  
  // Divide o nome em palavras, remove espaços extras e formata cada palavra
  return name
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      // Verifica se a palavra deve permanecer em minúsculas
      const lowerWord = word.toLowerCase();
      
      // Se for a primeira palavra OU não for uma palavra de ligação, capitaliza
      if (index === 0 || !lowerCaseWords.includes(lowerWord)) {
        return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
      }
      
      // Se for uma palavra de ligação, mantém em minúscula
      return lowerWord;
    })
    .join(' ');
}