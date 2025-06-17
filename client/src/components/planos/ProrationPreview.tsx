import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CreditCard, TrendingUp, TrendingDown, Calendar, Clock, DollarSign, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ProrationData {
  tipoOperacao: string;
  planoAtual: {
    id: number;
    nome: string;
    valor: number;
    periodo: string;
  };
  planoNovo: {
    id: number;
    nome: string;
    valor: number;
    periodo: string;
  };
  proracao: {
    valorExato: number;
    isCobrancaImediata: boolean;
    tipoCobranca: 'IMEDIATA' | 'PROXIMO_CICLO';
    saldoCliente?: number;
    saldoClienteFormatado?: string;
    creditoDisponivel?: number;
    creditoDisponivelFormatado?: string;
    valorRealCartao: number;
    valorRealCartaoFormatado: string;
    temSaldoDisponivel: boolean;
    saldoAplicado?: number;
    diasRestantes: number;
    diasTotais: number;
    diasUsados: number;
    percentualUsado: number;
    proximaCobrancaData: string;
    proximaCobrancaTimestamp: number;
    descricao: string;
    resumo: string;
    stripeCalculado: boolean;
    itensProration: number;
    valorTotalCentavos: number;
  };
}

interface ProrationPreviewProps {
  planoId: number;
  tipoCobranca: 'mensal' | 'anual';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ProrationPreview({ 
  planoId, 
  tipoCobranca, 
  onConfirm, 
  onCancel, 
  isLoading = false 
}: ProrationPreviewProps) {
  const [prorationData, setProrationData] = useState<ProrationData | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const calcularProracao = async () => {
    setCalculando(true);
    setErro(null);

    try {
      const response = await apiRequest("POST", "/api/assinaturas/calcular-proracao", {
        planoId,
        tipoCobranca
      });

      if (response.success) {
        setProrationData(response);
        console.log('📊 Dados de proração recebidos:', response);
      } else {
        setErro(response.message || "Erro ao calcular proração");
      }
    } catch (error: any) {
      setErro(error.message || "Erro ao calcular valores");
    } finally {
      setCalculando(false);
    }
  };

  // Calcular proração automaticamente quando o componente carrega
  useEffect(() => {
    calcularProracao();
  }, [planoId, tipoCobranca]);

  if (calculando) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Calculando Valores Exatos
          </CardTitle>
          <CardDescription>
            Consultando o Stripe para obter os valores precisos de proração...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (erro) {
    return (
      <Card className="w-full max-w-2xl mx-auto border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Erro ao Calcular Valores
          </CardTitle>
          <CardDescription className="text-red-600">
            {erro}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline" onClick={calcularProracao}>
              Tentar Novamente
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prorationData) {
    return null;
  }

  const { tipoOperacao, planoAtual, planoNovo, proracao } = prorationData;

  const getOperationIcon = () => {
    switch (tipoOperacao) {
      case 'UPGRADE':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'DOWNGRADE':
        return <TrendingDown className="h-5 w-5 text-blue-600" />;
      case 'MUDANCA_PERIODO':
        return <Calendar className="h-5 w-5 text-purple-600" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getOperationColor = () => {
    switch (tipoOperacao) {
      case 'UPGRADE':
        return 'bg-green-100 text-green-800';
      case 'DOWNGRADE':
        return 'bg-blue-100 text-blue-800';
      case 'MUDANCA_PERIODO':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCobrancaInfo = () => {
    if (proracao.isCobrancaImediata) {
      return {
        badge: 'bg-orange-100 text-orange-800',
        icon: <DollarSign className="h-4 w-4" />,
        titulo: 'Cobrança Imediata',
        descricao: 'Será cobrado agora no seu cartão'
      };
    } else {
      return {
        badge: 'bg-blue-100 text-blue-800',
        icon: <Clock className="h-4 w-4" />,
        titulo: 'Crédito Próximo Ciclo',
        descricao: `Crédito aplicado em ${proracao.proximaCobrancaData}`
      };
    }
  };

  const cobrancaInfo = getCobrancaInfo();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getOperationIcon()}
          Confirmação de Mudança de Plano
          {proracao.stripeCalculado && (
            <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
              <Info className="h-3 w-3 mr-1" />
              Valores Exatos
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Valores calculados pelo Stripe - Revise antes de confirmar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tipo de Operação */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Tipo de Operação:</span>
          <Badge className={getOperationColor()}>
            {tipoOperacao === 'UPGRADE' && 'Upgrade'}
            {tipoOperacao === 'DOWNGRADE' && 'Downgrade'}
            {tipoOperacao === 'MUDANCA_PERIODO' && 'Mudança de Período'}
          </Badge>
        </div>

        {/* Comparação de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-600">Plano Atual</h4>
            <div className="p-3 border rounded-lg bg-gray-50">
              <div className="font-medium">{planoAtual.nome}</div>
              <div className="text-sm text-gray-600">
                R$ {planoAtual.valor.toFixed(2)}/{planoAtual.periodo}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-600">Novo Plano</h4>
            <div className="p-3 border rounded-lg bg-blue-50">
              <div className="font-medium">{planoNovo.nome}</div>
              <div className="text-sm text-gray-600">
                R$ {planoNovo.valor.toFixed(2)}/{planoNovo.periodo}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Valor e Tipo de Cobrança */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Cobrança</h4>
            <Badge className={cobrancaInfo.badge}>
              {cobrancaInfo.icon}
              <span className="ml-1">{cobrancaInfo.titulo}</span>
            </Badge>
          </div>

          {/* Valor Principal */}
          <div className={`p-6 rounded-lg border-2 text-center ${
            proracao.isCobrancaImediata 
              ? 'border-orange-200 bg-orange-50' 
              : 'border-blue-200 bg-blue-50'
          }`}>
            <div className="text-sm font-medium text-gray-600 mb-2">
              {proracao.isCobrancaImediata ? 'Cobrança no Cartão:' : 
               tipoOperacao === 'DOWNGRADE' ? 'Cobrança do Downgrade:' : 'Crédito a aplicar:'}
            </div>
            <div className={`text-3xl font-bold mb-2 ${
              proracao.isCobrancaImediata ? 'text-orange-600' : 'text-blue-600'
            }`}>
              {proracao.isCobrancaImediata ? 
                (proracao.valorRealCartaoFormatado || `R$ ${proracao.valorRealCartao.toFixed(2)}`) : 
                tipoOperacao === 'DOWNGRADE' ? `R$ ${planoNovo.valor.toFixed(2)}` : `R$ ${Math.abs(proracao.valorExato).toFixed(2)}`
              }
            </div>
            <div className="text-sm text-gray-600 mb-3">
              {cobrancaInfo.descricao}
            </div>
            <div className="text-xs text-gray-500 bg-white/50 px-3 py-2 rounded">
              {tipoOperacao === 'DOWNGRADE' ? 
                `💡 Você pagará o plano ${planoNovo.nome} (R$ ${planoNovo.valor.toFixed(2)}) com os créditos de R$ ${Math.abs(proracao.valorExato).toFixed(2)} gerados do seu plano ${planoAtual.nome} anterior.` :
                proracao.isCobrancaImediata ? 
                  `💡 Você paga apenas a diferença proporcional (R$ ${proracao.valorExato.toFixed(2)}) menos o seu saldo disponível (R$ ${((proracao.creditoDisponivel || 0) || Math.abs(proracao.saldoCliente || 0)).toFixed(2)}) = ${proracao.valorRealCartaoFormatado} no cartão. O plano completo será cobrado apenas no próximo ciclo normal.` :
                  `💡 O valor será descontado da sua próxima fatura em ${proracao.proximaCobrancaData}`
              }
            </div>
          </div>

          {/* Informações de Saldo e Cobrança Real - SEMPRE MOSTRA */}
          <div className="space-y-3">
            <h5 className="font-medium text-gray-800">Detalhes da Cobrança</h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Saldo Disponível */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Seu Saldo</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {proracao.creditoDisponivelFormatado || `R$ ${(Math.abs(proracao.saldoCliente || 0)).toFixed(2)}`}
                </div>
                <div className="text-xs text-green-700 mt-1">
                  {(proracao.creditoDisponivel && proracao.creditoDisponivel > 0) || 
                   (proracao.saldoCliente && proracao.saldoCliente > 0) ? 
                   'crédito disponível' : 'nenhum crédito'}
                </div>
              </div>

              {/* Diferença Total ou Valor do Downgrade */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    {tipoOperacao === 'DOWNGRADE' ? 'Valor de Créditos Gerado' : 'Diferença de Upgrade'}
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  R$ {Math.abs(proracao.valorExato).toFixed(2)}
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  {tipoOperacao === 'DOWNGRADE' ? 'crédito do plano anterior' : 'Valor total da diferença'}
                </div>
              </div>
            </div>

            
          </div>

          {/* Informações do Período */}
          {proracao.diasRestantes > 0 && (
            <div className="grid grid-cols-3 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
              <div className="text-center">
                <div className="text-gray-600">Dias Usados</div>
                <div className="font-medium text-lg">{proracao.diasUsados}</div>
                <div className="text-xs text-gray-500">{proracao.percentualUsado}%</div>
              </div>
              <div className="text-center">
                <div className="text-gray-600">Dias Restantes</div>
                <div className="font-medium text-lg text-blue-600">{proracao.diasRestantes}</div>
                <div className="text-xs text-gray-500">do período atual</div>
              </div>
              <div className="text-center">
                <div className="text-gray-600">Próxima Cobrança</div>
                <div className="font-medium text-sm">{proracao.proximaCobrancaData}</div>
                <div className="text-xs text-gray-500">ciclo normal</div>
              </div>
            </div>
          )}

          {/* Descrição Detalhada */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              <strong>Como funciona:</strong> {
                tipoOperacao === 'DOWNGRADE' ? 
                  `Downgrade para ${planoNovo.nome}: A Stripe calculou um crédito de R$ ${Math.abs(proracao.valorExato).toFixed(2)} que será aplicado na sua próxima fatura em ${proracao.proximaCobrancaData}.` :
                  proracao.isCobrancaImediata && ((proracao.creditoDisponivel || 0) > 0 || (proracao.saldoCliente || 0) > 0) ? 
                    `${tipoOperacao} para ${planoNovo.nome}: A Stripe calculou uma diferença de R$ ${proracao.valorExato.toFixed(2)} com base no tempo restante do seu plano atual. Como você possui R$ ${((proracao.creditoDisponivel || 0) || Math.abs(proracao.saldoCliente || 0)).toFixed(2)} em créditos disponíveis, será cobrado apenas R$ ${proracao.valorRealCartao.toFixed(2)} no seu cartão.` :
                    proracao.descricao
              }
            </div>
          </div>
        </div>

        <Separator />

        {/* Botões de Ação */}
        <div className="flex gap-3 pt-2">
          <Button 
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1"
            variant={proracao.isCobrancaImediata ? "default" : "default"}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processando...
              </>
            ) : proracao.isCobrancaImediata ? (
              `Confirmar e Pagar ${proracao.valorRealCartaoFormatado || `R$ ${proracao.valorRealCartao.toFixed(2)}`}`
            ) : (
              `Confirmar ${tipoOperacao} com Crédito`
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}