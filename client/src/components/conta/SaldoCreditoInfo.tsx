
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, DollarSign } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface SaldoInfo {
  creditoDisponivel: number;
  creditoDisponivelFormatado: string;
  temCreditoDisponivel: boolean;
}

export default function SaldoCreditoInfo() {
  const [saldoInfo, setSaldoInfo] = useState<SaldoInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔄 SaldoCreditoInfo component mounted');
    
    const buscarSaldoCredito = async () => {
      try {
        console.log('🔄 Iniciando busca do saldo de crédito...');
        
        // Primeiro verificar se está logado
        try {
          const authCheck = await apiRequest('/api/auth/user');
          console.log('🔍 Status de autenticação:', authCheck);
        } catch (authError) {
          console.log('❌ Erro de autenticação:', authError);
          setSaldoInfo({
            creditoDisponivel: 0,
            creditoDisponivelFormatado: 'R$ 0,00',
            temCreditoDisponivel: false
          });
          setLoading(false);
          return;
        }
        
        // Usar endpoint específico para saldo de crédito
        console.log('🔍 Fazendo chamada para /api/saldo-credito...');
        const response = await apiRequest('/api/saldo-credito');
        console.log('🔍 Resposta RAW recebida:', response);

        console.log('🔍 Resposta completa da API saldo-credito:', JSON.stringify(response, null, 2));
        console.log('🔍 response existe?', !!response);
        console.log('🔍 response.success:', response?.success);
        console.log('🔍 Tipo do creditoDisponivel:', typeof response?.creditoDisponivel);
        console.log('🔍 Valor bruto creditoDisponivel:', response?.creditoDisponivel);
        console.log('🔍 creditoDisponivelFormatado:', response?.creditoDisponivelFormatado);

        if (response && response.success) {
          let credito = 0;
          
          // Validar e converter o valor de forma mais robusta
          if (response.creditoDisponivel !== undefined && response.creditoDisponivel !== null) {
            console.log('🔍 creditoDisponivel não é undefined/null');
            
            if (typeof response.creditoDisponivel === 'number' && !isNaN(response.creditoDisponivel)) {
              credito = response.creditoDisponivel;
              console.log('✅ Valor é número válido:', credito);
            } else if (typeof response.creditoDisponivel === 'string') {
              console.log('🔍 creditoDisponivel é string, tentando converter...');
              const valorConvertido = parseFloat(response.creditoDisponivel);
              console.log('🔍 Valor convertido:', valorConvertido);
              if (!isNaN(valorConvertido)) {
                credito = valorConvertido;
                console.log('✅ String convertida com sucesso:', credito);
              } else {
                console.error('❌ Falha ao converter string para número');
                credito = 0; // Valor padrão seguro
              }
            } else {
              console.error('❌ Tipo de creditoDisponivel não reconhecido:', typeof response.creditoDisponivel);
              credito = 0; // Valor padrão seguro
            }
          } else {
            console.error('❌ creditoDisponivel é undefined ou null');
            credito = 0; // Valor padrão seguro
          }
          
          console.log('🎯 Valor final do crédito:', credito);
          
          // Usar exatamente o mesmo formato do ProrationPreview (linha 268)
          const creditoSeguro = isNaN(credito) ? 0 : credito;
          const formatadoSeguro = `R$ ${creditoSeguro.toFixed(2)}`;
          
          console.log('🎯 Formatado será:', formatadoSeguro);
          
          const saldoFinal = {
            creditoDisponivel: creditoSeguro,
            creditoDisponivelFormatado: formatadoSeguro,
            temCreditoDisponivel: creditoSeguro > 0
          };
          
          console.log('📊 Estado final que será definido:', saldoFinal);
          setSaldoInfo(saldoFinal);
        } else {
          console.error('❌ API retornou success: false');
          // Definir valores padrão seguros em caso de erro
          setSaldoInfo({
            creditoDisponivel: 0,
            creditoDisponivelFormatado: 'R$ 0,00',
            temCreditoDisponivel: false
          });
        }
      } catch (error) {
        console.error('❌ Erro ao buscar saldo de crédito:', error);
        // Definir valores padrão seguros em caso de erro
        setSaldoInfo({
          creditoDisponivel: 0,
          creditoDisponivelFormatado: 'R$ 0,00',
          temCreditoDisponivel: false
        });
      } finally {
        setLoading(false);
      }
    };

    buscarSaldoCredito();
  }, []);

  if (loading) {
    return (
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="animate-pulse flex items-center">
          <div className="h-4 bg-blue-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  console.log('🎬 Renderizando SaldoCreditoInfo - Estado atual:', saldoInfo);
  console.log('🎬 Loading:', loading);

  return (
    <div className={`mt-4 p-3 border rounded-lg ${
      saldoInfo?.temCreditoDisponivel 
        ? 'bg-green-50 border-green-200' 
        : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-center">
        <DollarSign className={`h-5 w-5 mr-2 ${
          saldoInfo?.temCreditoDisponivel ? 'text-green-600' : 'text-gray-500'
        }`} />
        <div>
          <h4 className={`text-sm font-medium ${
            saldoInfo?.temCreditoDisponivel ? 'text-green-800' : 'text-gray-700'
          }`}>
            Seu Saldo
          </h4>
          <p className={`text-lg font-bold ${
            saldoInfo?.temCreditoDisponivel ? 'text-green-700' : 'text-gray-600'
          }`}>
            {saldoInfo?.creditoDisponivelFormatado && !saldoInfo.creditoDisponivelFormatado.includes('NaN') 
              ? saldoInfo.creditoDisponivelFormatado 
              : (saldoInfo?.creditoDisponivel ? 
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoInfo.creditoDisponivel) 
                  : 'R$ 0,00')}
          </p>
          <p className={`text-xs mt-1 ${
            saldoInfo?.temCreditoDisponivel 
              ? 'text-green-600' 
              : 'text-gray-500'
          }`}>
            {saldoInfo?.temCreditoDisponivel 
              ? 'Este crédito será aplicado automaticamente em upgrades ou na próxima renovação.'
              : 'Nenhum crédito disponível'
            }
          </p>
          {/* Debug info - remover depois */}
          <div className="text-xs text-gray-400 mt-2 border-t pt-1">
            Debug: creditoDisponivel={saldoInfo?.creditoDisponivel}, 
            formatado="{saldoInfo?.creditoDisponivelFormatado}",
            temCredito={saldoInfo?.temCreditoDisponivel ? 'true' : 'false'}
          </div>
        </div>
      </div>
    </div>
  );
}
