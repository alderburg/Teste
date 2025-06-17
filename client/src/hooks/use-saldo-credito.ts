
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface SaldoCreditoData {
  creditoDisponivel: number;
  creditoDisponivelFormatado: string;
  temCreditoDisponivel: boolean;
  loading: boolean;
  error: string | null;
}

export function useSaldoCredito() {
  const [saldoData, setSaldoData] = useState<SaldoCreditoData>({
    creditoDisponivel: 0,
    creditoDisponivelFormatado: 'R$ 0,00',
    temCreditoDisponivel: false,
    loading: true,
    error: null
  });

  const buscarSaldoCredito = async () => {
    try {
      setSaldoData(prev => ({ ...prev, loading: true, error: null }));

      // Usar endpoint específico para saldo de crédito
      const response = await apiRequest('/api/saldo-credito', {
        method: 'GET',
      });

      if (response.success) {
        let credito = 0;
        
        // Validar e converter o valor de forma mais robusta
        if (response.creditoDisponivel !== undefined && response.creditoDisponivel !== null) {
          if (typeof response.creditoDisponivel === 'number' && !isNaN(response.creditoDisponivel)) {
            credito = response.creditoDisponivel;
          } else if (typeof response.creditoDisponivel === 'string') {
            const valorConvertido = parseFloat(response.creditoDisponivel);
            if (!isNaN(valorConvertido)) {
              credito = valorConvertido;
            }
          }
        }
        
        setSaldoData({
          creditoDisponivel: credito,
          creditoDisponivelFormatado: response.creditoDisponivelFormatado || `R$ ${credito.toFixed(2).replace('.', ',')}`,
          temCreditoDisponivel: credito > 0,
          loading: false,
          error: null
        });
      } else {
        throw new Error('Não foi possível obter informações de saldo');
      }
    } catch (error) {
      console.error('Erro ao buscar saldo de crédito:', error);
      setSaldoData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
  };

  useEffect(() => {
    buscarSaldoCredito();
  }, []);

  return {
    ...saldoData,
    refetch: buscarSaldoCredito
  };
}
