import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWebSocketData } from "@/hooks/useWebSocketData";
import { 
  CreditCard, 
  Download, 
  Calendar, 
  DollarSign, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Loader2,
  Coins,
  Gift
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Pagamento {
  id: string;
  valor: number;
  valorCartao: number;
  valorCredito: number;
  valor_diferenca?: number;
  credito_gerado?: number;
  detalhesCredito?: string;
  status: string;
  planoNome: string;
  dataPagamento: string;
  metodoPagamento: string;
  faturaUrl?: string;
  stripeInvoiceId?: string;
  resumoPagamento?: string;
  temCredito: boolean;
  isFullCredit: boolean;
}

interface Assinatura {
  id: string;
  stripeSubscriptionId: string;
  status: string;
  planoNome: string;
  valor: number;
  periodo: string;
  dataInicio: string;
  dataFim?: string;
  proximoPagamento?: string;
}

export function HistoricoFinanceiro() {
  const { toast } = useToast();

  // WebSocket data for histórico de pagamentos
  const { 
    data: pagamentos = [], 
    loading: loadingPagamentos, 
    error: errorPagamentos,
    refetch: refetchPagamentos
  } = useWebSocketData({
    endpoint: '/api/historico-pagamentos',
    resource: 'historico-pagamentos'
  });

  // WebSocket data for histórico de assinaturas
  const { 
    data: assinaturas = [], 
    loading: loadingAssinaturas,
    refetch: refetchAssinaturas
  } = useWebSocketData({
    endpoint: '/api/historico-assinaturas',
    resource: 'historico-assinaturas'
  });

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchPagamentos(), refetchAssinaturas()]);
      toast({
        title: "Dados atualizados",
        description: "Histórico financeiro atualizado com sucesso",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os dados",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pago':
      case 'paid':
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pago</Badge>;
      case 'pendente':
      case 'pending':
      case 'incomplete':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendente</Badge>;
      case 'falhado':
      case 'failed':
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Falhado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pago':
      case 'paid':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pendente':
      case 'pending':
      case 'incomplete':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'falhado':
      case 'failed':
      case 'canceled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatCurrency = (value: number) => {
    let rawValue = Number(value);
    if (isNaN(rawValue)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(rawValue);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Histórico Financeiro</h2>
          <p className="text-muted-foreground">
            Acompanhe seus pagamentos e assinaturas do sistema
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Tabs defaultValue="pagamentos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pagamentos" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Histórico de Pagamentos
          </TabsTrigger>
          <TabsTrigger value="assinaturas" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Histórico de Assinaturas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pagamentos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pagamentos Realizados
              </CardTitle>
              <CardDescription>
                Histórico de todos os seus pagamentos processados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPagamentos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Carregando pagamentos...</span>
                </div>
              ) : pagamentos.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-muted-foreground">Nenhum pagamento encontrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Detalhes do Pagamento</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(pagamentos) && pagamentos.flat().map((pagamento: any) => {
                        console.log('🔍 Renderizando pagamento:', pagamento.id, 'valor_diferenca:', pagamento.valor_diferenca);

                        return (
                          <TableRow key={pagamento.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(pagamento.status)}
                                {getStatusBadge(pagamento.status)}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {pagamento.planoNome}
                            </TableCell>
                            <TableCell className="font-mono font-bold">
                              {formatCurrency(pagamento.valor)}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm font-medium">
                                  {pagamento.metodoPagamento}
                                </div>
                                {pagamento.temCredito ? (
                                  <div className="space-y-1">
                                    {pagamento.valorCartao > 0 && (
                                      <div className="text-xs text-gray-600">
                                        💳 Cartão: {formatCurrency(pagamento.valorCartao)}
                                      </div>
                                    )}
                                    <div className="text-xs text-green-600 font-medium">
                                      🎁 Créditos: {formatCurrency(pagamento.valorCredito)}
                                    </div>
                                    {pagamento.detalhesCredito && (
                                      <div className="text-xs text-gray-500 italic">
                                        {pagamento.detalhesCredito}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-600">
                                    💳 Cartão: {formatCurrency(pagamento.valorCartao || pagamento.valor)}
                                  </div>
                                )}

                                {/* Exibir valor_diferenca apenas quando existe e é diferente de zero */}
                                {/* Exibir valor_diferenca apenas quando existe, é diferente de zero e é positivo (saldo de tempo) */}
                                {pagamento.valor_diferenca !== null && 
                                 pagamento.valor_diferenca !== undefined && 
                                 pagamento.valor_diferenca !== 0 &&
                                 Number(pagamento.valor_diferenca) > 0 && (
                                  <div className="text-xs mt-1 pt-1 border-t border-gray-200">
                                    <div className="flex items-center gap-1 text-blue-600">
                                      <RefreshCw className="h-3 w-3" />
                                      <span className="font-medium">Saldo de tempo de uso do plano anterior:</span>
                                      <span>{formatCurrency(Number(pagamento.valor_diferenca))}</span>
                                    </div>
                                  </div>
                                )}

                                {/* Exibir credito_gerado quando existe e é diferente de zero */}
                                {pagamento.credito_gerado !== null && 
                                 pagamento.credito_gerado !== undefined && 
                                 pagamento.credito_gerado !== 0 &&
                                 Number(pagamento.credito_gerado) > 0 && (
                                  <div className="text-xs mt-1 pt-1 border-t border-gray-200">
                                    <div className="flex items-center gap-1 text-green-600">
                                      <Gift className="h-3 w-3" />
                                      <span className="font-medium">Créditos gerados:</span>
                                      <span>{formatCurrency(Number(pagamento.credito_gerado))}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{pagamento.dataPagamento}</TableCell>
                            <TableCell>
                              {pagamento.faturaUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                >
                                  <a
                                    href={pagamento.faturaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1"
                                  >
                                    <Download className="h-3 w-3" />
                                    Fatura
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assinaturas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Assinaturas Ativas e Históricas
              </CardTitle>
              <CardDescription>
                Histórico de todas as suas assinaturas e renovações
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAssinaturas ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Carregando assinaturas...</span>
                </div>
              ) : !assinaturas || assinaturas.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-muted-foreground">Nenhuma assinatura encontrada</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Próximo Pagamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assinaturas.map((assinatura: any) => (
                        <TableRow key={assinatura.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(assinatura.status)}
                              {getStatusBadge(assinatura.status)}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {assinatura.planoNome}
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(assinatura.valor)}
                          </TableCell>
                          <TableCell className="capitalize">
                            {assinatura.periodo === 'month' ? 'Mensal' : 
                             assinatura.periodo === 'year' ? 'Anual' : assinatura.periodo}
                          </TableCell>
                          <TableCell>{assinatura.dataInicio}</TableCell>
                          <TableCell>{assinatura.proximoPagamento || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}