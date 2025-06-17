/**
 * Utilitários para conversão de fuso horário brasileiro
 */

/**
 * Converte timestamp Unix para Date ajustado ao fuso horário brasileiro (UTC-3)
 * @param timestamp Timestamp Unix em segundos
 * @returns Date ajustado para fuso horário brasileiro
 */
export function timestampToBrazilianDate(timestamp: number): Date {
  // Converter timestamp para Date UTC
  const utcDate = new Date(timestamp * 1000);
  
  // Subtrair 3 horas para converter UTC para horário brasileiro (UTC-3)
  const brazilianDate = new Date(utcDate.getTime() - (3 * 60 * 60 * 1000));
  
  return brazilianDate;
}

/**
 * Converte qualquer Date para horário brasileiro
 * @param date Data a ser convertida
 * @returns Date ajustado para fuso horário brasileiro
 */
export function toBrazilianTime(date: Date): Date {
  // Criar nova data em horário brasileiro
  const brazilianDate = new Date(date.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  return brazilianDate;
}

/**
 * Obtém a data/hora atual no fuso horário brasileiro
 * @returns Date atual em horário brasileiro
 */
export function getBrazilianNow(): Date {
  return toBrazilianTime(new Date());
}

/**
 * Formata uma data para string no padrão brasileiro
 * @param date Data a ser formatada
 * @returns String formatada no padrão dd/mm/aaaa hh:mm:ss
 */
export function formatBrazilianDateTime(date: Date): string {
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}