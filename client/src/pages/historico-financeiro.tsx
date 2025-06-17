import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Download, 
  RefreshCw, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  ExternalLink,
  Coins,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoricoPagamento {
  id: number;
  data: string;
  valor: number;
  valorCartao: number;
  valorCredito: number;
  status: 'Pago' | 'Falhou' | 'Pendente';
  plano: string;
  periodo: string;
  metodoPagamento: string;
  resumo: string;
  faturaUrl?: string;
  temCredito: boolean;
  isFullCredit: boolean;
  detalhesCredito?: string;
}

interface EstatisticasFinanceiras {
  totalPago: number;
  totalCreditos: number;
  totalCartao: number;
  totalTransacoes: number;
  transacoesPagas: number;
  transacoesFalhadas: number;
}

export default function HistoricoFinanceiro() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar histórico financeiro
  const { data: historicoData, isLoading, error } = useQuery({
    queryKey: ['historico-financeiro'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/historico-financeiro');
      return response.json();
    },
  });

  // Mutation para sincronizar pagamentos da Stripe
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/sync-stripe-payments');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sincronização concluída",
        description: `${data.syncCount} pagamentos sincronizados com sucesso`,
      });
      queryClient.invalidateQueries({ queryKey: ['historico-financeiro'] });
    },
    onError: (error) => {
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar os pagamentos",
        variant: "destructive",
      });
    },
  });

  const historico: HistoricoPagamento[] = historicoData?.historico || [];
  const estatisticas: EstatisticasFinanceiras = historicoData?.estatisticas || {
    totalPago: 0,
    totalCreditos: 0,
    totalCartao: 0,
    totalTransacoes: 0,
    transacoesPagas: 0,
    transacoesFalhadas: 0
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pago':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Falhou':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'Pago': 'default',
      'Falhou': 'destructive',
      'Pendente': 'secondary'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {getStatusIcon(status)}
        <span className="ml-1">{status}</span>
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Histórico Financeiro</h2>
            <p className="text-gray-500">Carregando dados financeiros...</p>
          </div>
        </div>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Histórico Financeiro</h2>
            <p className="text-gray-500">Erro ao carregar dados financeiros</p>
          </div>
          <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sincronizar Pagamentos
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600">Não foi possível carregar o histórico financeiro</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Histórico Financeiro</h2>
          <p className="text-gray-500">
            Acompanhe seus pagamentos, créditos e transações
          </p>
        </div>
        <Button 
          onClick={() => syncMutation.mutate()} 
          disabled={syncMutation.isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {syncMutation.isLoading ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sincronizar Pagamentos
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(estatisticas.totalPago)}
            </div>
            <p className="text-xs text-muted-foreground">
              {estatisticas.transacoesPagas} transações bem-sucedidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamento Cartão</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(estatisticas.totalCartao)}
            </div>
            <p className="text-xs text-muted-foreground">
              Cobrado no cartão de crédito
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Créditos Utilizados</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(estatisticas.totalCreditos)}
            </div>
            <p className="text-xs text-muted-foreground">
              Economia com créditos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transações</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estatisticas.totalTransacoes}
            </div>
            <p className="text-xs text-muted-foreground">
              {estatisticas.transacoesFalhadas} falharam
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
          <CardDescription>
            Detalhes completos de todos os seus pagamentos e tentativas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historico.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum histórico encontrado
              </h3>
              <p className="text-gray-500 mb-6">
                Sincronize seus pagamentos da Stripe para ver o histórico completo
              </p>
              <Button 
                onClick={() => syncMutation.mutate()} 
                disabled={syncMutation.isLoading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Sincronizar Agora
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Detalhes do Pagamento</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map((pagamento) => (
                    <TableRow key={pagamento.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {formatDate(pagamento.data)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(pagamento.data), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{pagamento.plano}</span>
                          <span className="text-xs text-gray-500">{pagamento.periodo}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getStatusBadge(pagamento.status)}
                      </TableCell>
                      
                      <TableCell>
                        <span className="font-bold">
                          {formatCurrency(pagamento.valor)}
                        </span>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          {/* Detalhamento visual do pagamento */}
                          {pagamento.isFullCredit ? (
                            <div className="flex items-center">
                              <Coins className="h-4 w-4 mr-2 text-orange-600" />
                              <div>
                                <div className="font-medium text-orange-700">100% Crédito</div>
                                <div className="text-xs text-gray-500">
                                  {formatCurrency(pagamento.valorCredito)} em créditos
                                </div>
                              </div>
                            </div>
                          ) : pagamento.temCredito ? (
                            <div className="space-y-1">
                              <div className="flex items-center text-sm">
                                <span className="font-medium text-gray-700">Pagamento Misto:</span>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                  <CreditCard className="h-3 w-3 mr-1 text-blue-600" />
                                  <span className="text-sm text-blue-700 font-medium">
                                    {formatCurrency(pagamento.valorCartao)}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <Coins className="h-3 w-3 mr-1 text-orange-600" />
                                  <span className="text-sm text-orange-700 font-medium">
                                    {formatCurrency(pagamento.valorCredito)}
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                {((pagamento.valorCredito / pagamento.valor) * 100).toFixed(0)}% crédito + {((pagamento.valorCartao / pagamento.valor) * 100).toFixed(0)}% cartão
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <CreditCard className="h-4 w-4 mr-2 text-blue-600" />
                              <div>
                                <div className="font-medium text-blue-700">Cartão</div>
                                <div className="text-xs text-gray-500">
                                  {formatCurrency(pagamento.valorCartao)} no cartão
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          {pagamento.detalhesCredito && (
                            <div className="text-xs bg-orange-50 text-orange-800 px-2 py-1 rounded border">
                              {pagamento.detalhesCredito}
                            </div>
                          )}
                          <span className="text-sm text-gray-600">{pagamento.metodoPagamento}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex space-x-2">
                          {pagamento.faturaUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(pagamento.faturaUrl, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}