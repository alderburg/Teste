import React, { useState, useEffect } from "react";
import { Check, X, Users, Package, Star, Crown, Building, Building2, BarChart2, ArrowRight, Sparkles, Zap, Award, PercentCircle, Activity, Shield, Rocket, Loader2, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import PaymentModal from "@/components/planos/PaymentModal";
import { useAuth } from "@/hooks/use-auth";

export default function PlanosEUpgradesPage() {
  // ✅ USAR O HOOK DE AUTENTICAÇÃO CORRETO
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Tratamento de erros para depurar problemas
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Erro não tratado na página de planos:", event.reason);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    console.log("### PlanosEUpgradesPage MONTADO COM SUCESSO! ###");

    // ✅ USAR DADOS DO HOOK DE AUTENTICAÇÃO
    if (isAuthenticated && user) {
      console.log("════════════════════════════════════════════");
      console.log("📊 INFORMAÇÕES DO USUÁRIO AUTENTICADO (useAuth)");
      console.log("════════════════════════════════════════════");
      console.log("👤 ID do usuário:", user.id);
      console.log("👤 Nome de usuário:", user.username);
      console.log("👤 Email:", user.email);
      console.log("👤 Perfil:", user.role);
      console.log("✅ Status: LOGADO E AUTENTICADO");
      console.log("════════════════════════════════════════════");
    } else if (isLoading) {
      console.log("⏳ Verificando autenticação...");
    } else {
      console.log("❌ Usuário NÃO autenticado");
    }

    // Imprimir um log mais visível para depuração
    console.log("═══════════════════════════════════════");
    console.log("▶ PATH ATUAL:", window.location.pathname);
    console.log("▶ COMPONENTE: PlanosEUpgradesPage");
    console.log("▶ STATUS AUTENTICAÇÃO:", isAuthenticated ? "LOGADO" : "NÃO LOGADO");
    console.log("▶ CARREGANDO:", isLoading ? "SIM" : "NÃO");
    console.log("═══════════════════════════════════════");

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [user, isAuthenticated, isLoading]);

  // Mantemos o useLocation apenas para os botões de ação
  const [, navigate] = useLocation();
  const [periodoPlanos, setPeriodoPlanos] = useState<"mensal" | "anual">("anual");

  // Log para depuração e força re-renderização quando o período mudar
  useEffect(() => {
    console.log("Período de planos atualizado:", periodoPlanos);
    // Forçar renderização
    setRerenderKey(prevKey => prevKey + 1);
  }, [periodoPlanos]);

  // Estado para forçar re-renderização - sempre reinicializar com valores padrão
  const [rerenderKey, setRerenderKey] = useState(0);
  // Reiniciar animateValue como false a cada renderização para evitar persistência entre navegações
  
  // Função auxiliar para comparar planos e determinar se é upgrade ou downgrade
  const compararPlanos = (planoReferencia: string, planoComparado: string) => {
    // Normalização de nomes de planos para garantir compatibilidade independente do formato recebido da API
    const normalizarNomePlano = (plano: string): string => {
      // Se o plano for null, undefined ou string vazia, retornar como "Nenhum"
      if (!plano) return "Nenhum";
      
      // Converter para lowercase e depois capitalizar a primeira letra
      const planoLower = plano.toLowerCase();
      
      if (planoLower.includes("essencial")) return "Essencial";
      if (planoLower.includes("profissional")) return "Profissional";
      if (planoLower.includes("empresarial")) return "Empresarial";
      if (planoLower.includes("premium")) return "Premium";
      
      return plano; // Retorna o original se não corresponder a nenhum dos planos conhecidos
    };
    
    const hierarquiaPlanos = ["Nenhum", "Essencial", "Profissional", "Empresarial", "Premium"];
    const planoRefNormalizado = normalizarNomePlano(planoReferencia);
    const planoCompNormalizado = normalizarNomePlano(planoComparado);
    
    const posicaoReferencia = hierarquiaPlanos.indexOf(planoRefNormalizado);
    const posicaoComparado = hierarquiaPlanos.indexOf(planoCompNormalizado);
    
    console.log(`Comparando: [${planoReferencia}] normalizado para [${planoRefNormalizado}] (${posicaoReferencia}) com [${planoComparado}] normalizado para [${planoCompNormalizado}] (${posicaoComparado})`);
    
    if (posicaoComparado < posicaoReferencia) return "DOWNGRADE";
    if (posicaoComparado > posicaoReferencia) return "UPGRADE";
    return "PLANO ATUAL";
  };
  const [animateValue, setAnimateValue] = useState(false);
  const { toast } = useToast();

  // Definir tipo da resposta da API
  interface AssinaturaResponse {
    temAssinatura: boolean;
    loggedIn: boolean;
    plano?: {
      id: number;
      nome: string;
      descricao: string;
      valorMensal: string;
      valorAnual: string;
      valorAnualTotal: string;
      economiaAnual: string;
      limitesCadastro: {
        produtos: string | number; 
        servicos: string | number;
        categorias: string | number;
        usuarios: string | number; 
      };
    } | null;
    estatisticas?: {
      produtosCadastrados: number; 
      servicosCadastrados: number;
      categoriasCadastradas: number;
      usuariosCadastrados: number; 
    };
    assinatura?: any;
    user?: {
      id: number;
      username: string;
    };
  }

  // Consultar API para verificar se o usuário tem plano ativo
  const { data: assinaturaData, isLoading: assinaturaLoading } = useQuery<AssinaturaResponse>({
    queryKey: ['/api/minha-assinatura'],
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 0, // Sempre buscar dados frescos do servidor
    cacheTime: 0, // Não manter em cache
    onSuccess: (data) => {
      // Garantir que sempre mostramos dados do usuário no console
      console.log("🔶 SISTEMA DE ACESSO - PÁGINA DE PLANOS E ASSINATURAS 🔶");
      console.log("====================================================");
      
      if (data?.user) {
        console.log(`🔑 USUÁRIO ID ${data.user.id} ESTÁ ACESSANDO PLANOS E ASSINATURAS`);
        console.log(`👤 Username: ${data.user.username}`);
        console.log(`📊 Plano: ${data.temAssinatura ? data.plano?.nome : "Nenhum plano ativo"}`);
        
        // Registrar detalhes adicionais sobre o acesso
        const tempo = new Date().toLocaleString('pt-BR');
        console.log(`⏱️ Data/hora do acesso: ${tempo}`);
        
        // Salvar dados do acesso no localStorage para histórico
        try {
          const acessos = JSON.parse(localStorage.getItem('acessos_planos') || '[]');
          acessos.push({
            userId: data.user.id,
            username: data.user.username,
            timestamp: new Date().toISOString(),
            plano: data.temAssinatura ? data.plano?.nome : "Nenhum"
          });
          // Manter apenas os últimos 10 acessos
          if (acessos.length > 10) acessos.shift();
          localStorage.setItem('acessos_planos', JSON.stringify(acessos));
        } catch (err) {
          // Falha ao salvar histórico, mas não crítico
        }
      } else {
        console.log("⛔ ALERTA: Nenhum usuário identificado na resposta da API");
        console.log("💬 Detalhes da resposta:", data);
      }
      
      console.log("====================================================");
    }
  });

  // Interface para tipagem dos planos
  interface Plano {
    id: number;
    nome: string;
    descricao: string;
    valorMensal: string;
    valorAnual: string;
    valorAnualTotal: string;
    economiaAnual: string;
    limitesCadastro: {
      produtos: string | number;
      servicos: string | number;
      categorias: string | number;
      usuarios: string | number;
    };
  }

  // Consultar a lista de planos disponíveis
  const { data: planosData, isLoading: planosLoading } = useQuery<Plano[]>({
    queryKey: ['/api/planos'],
    retry: 1,
    refetchOnWindowFocus: false
  });

  // Extrair dados da assinatura e plano atual utilizando a tipagem segura
  const temAssinatura = assinaturaData?.temAssinatura || false;
  const loggedIn = assinaturaData?.loggedIn || false;
  const planoAtual = temAssinatura && assinaturaData?.plano ? 
    assinaturaData.plano.nome : "Nenhum";

  // Simular progresso de utilização - sempre inicializar com 0
  const [progress, setProgress] = useState(0);

  // Atualizar o progresso baseado nas estatísticas
  useEffect(() => {
    if (assinaturaData?.estatisticas && assinaturaData.plano?.limitesCadastro) {
      const { produtosCadastrados = 0 } = assinaturaData.estatisticas;
      const limitesProdutos = assinaturaData.plano.limitesCadastro.produtos;
      
      let percentual = 0;
      
      if (limitesProdutos === 'Ilimitado') {
        // Se for ilimitado, mostrar um valor fixo como 10%
        percentual = 10;
      } else if (typeof limitesProdutos === 'number' && limitesProdutos > 0) {
        // Calcular percentual real
        percentual = Math.min(100, (produtosCadastrados * 100) / limitesProdutos);
      }
      
      setProgress(Math.round(percentual));
    } else {
      setProgress(0);
    }
  }, [assinaturaData]);

  // Função para calcular dias restantes na assinatura
  const calcularDiasRestantes = (assinatura: any) => {
    if (!assinatura || !assinatura.dataInicio) {
      return "Informações da assinatura não disponíveis";
    }

    const dataInicio = new Date(assinatura.dataInicio);
    const hoje = new Date();

    // Determinar a data de vencimento com base no tipo de cobrança
    let dataVencimento = new Date(dataInicio);
    if (assinatura.tipoCobranca === "anual") {
      dataVencimento.setFullYear(dataVencimento.getFullYear() + 1);
    } else {
      dataVencimento.setDate(dataVencimento.getDate() + 30);
    }

    // Calcular dias restantes
    const diferencaEmMilissegundos = dataVencimento.getTime() - hoje.getTime();
    const diasRestantes = Math.ceil(diferencaEmMilissegundos / (1000 * 60 * 60 * 24));

    if (diasRestantes <= 0) {
      return "Assinatura expirada";
    } else if (diasRestantes === 1) {
      return "Expira amanhã";
    } else if (diasRestantes <= 7) {
      return `Expira em ${diasRestantes} dias`;
    } else {
      // Para qualquer quantidade de dias, sempre exibir em dias
      // Isso torna a exibição mais clara para assinaturas anuais
      return `Faltam ${diasRestantes} dias para vencer`;
    
    }
  };

  // Estados para controlar o modal de pagamento
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [acaoTipo, setAcaoTipo] = useState<"ASSINAR" | "UPGRADE" | "DOWNGRADE">("ASSINAR");

  // Botões de upgrade ou assinar
  const handleUpgrade = (plano: string = "Profissional") => {
    // Estamos assumindo que o usuário está logado, já que a página de planos
    // só é acessível para usuários logados devido à proteção de rota
    // Não faremos verificação adicional que pode falhar
    
    // Determinar o tipo de ação (upgrade, downgrade ou assinatura)
    let tipoAcao: "ASSINAR" | "UPGRADE" | "DOWNGRADE" = "ASSINAR";
    
    if (temAssinatura) {
      const comparacao = compararPlanos(planoAtual, plano);
      tipoAcao = comparacao === "UPGRADE" ? "UPGRADE" : 
                comparacao === "DOWNGRADE" ? "DOWNGRADE" : "ASSINAR";
    }
    
    // Encontrar os detalhes do plano selecionado
    const planosArray = Array.isArray(planosData) ? planosData : [];
    const planoObj = planosArray.find((p: any) => 
      p.nome.toLowerCase() === plano.toLowerCase()
    );
    
    if (!planoObj) {
      toast({
        title: "Plano não encontrado",
        description: "Não foi possível encontrar os detalhes do plano selecionado.",
        variant: "destructive"
      });
      return;
    }
    
    // Definir o plano selecionado e o tipo de ação
    setSelectedPlan(planoObj);
    setAcaoTipo(tipoAcao);
    
    // Abrir o modal de pagamento
    setIsPaymentModalOpen(true);
  };

  // Manipulação de sucesso de pagamento
  const handlePaymentSuccess = () => {
    setIsPaymentModalOpen(false);
    
    toast({
      title: "Pagamento processado com sucesso!",
      description: "Seu plano foi atualizado.",
      variant: "default"
    });
    
    // Forçar recarregamento da página após 2 segundos
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  // Componente de Loading para mostrar durante carregamento
  const LoadingComponent = () => (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Planos e Upgrades</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-lg p-6 animate-pulse"
              style={{ animationDelay: `${i * 0.3}s` }}
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                <div className="h-3 bg-gray-200 rounded w-4/6"></div>
              </div>
              <div className="h-10 bg-gray-200 rounded mt-6"></div>
            </div>
          ))}
        </div>

        {/* Indicadores de progresso */}
        <div className="flex justify-center items-center space-x-2 mt-8">
          <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
          <span className="text-sm text-gray-500">Carregando dados de assinatura...</span>
        </div>
      </div>
    </div>
  );

  // Se ainda está carregando, mostrar o componente de loading
  if (assinaturaLoading || planosLoading) {
    return <LoadingComponent />;
  }

  return (
    <div className="p-4 sm:p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Layout para desktop - Grid com coluna da esquerda (box de plano atual) e direita (cabeçalho roxo + cards de planos) */}
        <div className="w-full overflow-hidden hidden md:block">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Coluna do plano atual */}
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-teal-500 h-full flex flex-col">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-3 mb-4">Seu plano atual</h2>
              <div className="space-y-5">
                <div className="flex items-center">
                  <Package className="h-5 w-5 text-teal-500 mr-2" />
                  <p className="font-medium text-gray-700">{planoAtual}</p>
                  <Badge variant="outline" className="ml-2 bg-teal-50 text-teal-700 border-teal-200">Ativo</Badge>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Utilização de cadastros</span>
                    <span className="text-sm font-medium text-teal-600">{progress}%</span>
                  </div>

                  {/* Utilização de produtos */}
                  {temAssinatura && assinaturaData?.estatisticas && assinaturaData.plano?.limitesCadastro && (
                    <div className="mb-3">
                      <div className="flex items-center mb-1">
                        <Package className="h-3 w-3 text-teal-600 mr-1" />
                        <span className="text-xs text-gray-700 font-medium">Produtos:</span>
                        <span className="text-xs ml-auto">
                          {assinaturaData.estatisticas.produtosCadastrados || 0} de {' '}
                          {assinaturaData.plano.limitesCadastro.produtos === 'Ilimitado' 
                            ? 'Ilimitado' 
                            : assinaturaData.plano.limitesCadastro.produtos}
                        </span>
                      </div>
                      <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full bg-teal-500 rounded-full" 
                          style={{ width: `${
                            assinaturaData.plano.limitesCadastro.produtos === 'Ilimitado' 
                              ? 25 // Mostra 25% para ilimitado, apenas indicativo
                              : Math.min(100, (assinaturaData.estatisticas.produtosCadastrados || 0) * 100 / 
                                  (typeof assinaturaData.plano.limitesCadastro.produtos === 'number' 
                                    ? assinaturaData.plano.limitesCadastro.produtos 
                                    : 100))
                          }%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Utilização de usuários */}
                  {temAssinatura && assinaturaData?.estatisticas && assinaturaData.plano?.limitesCadastro?.usuarios && (
                    <div className="mb-2">
                      <div className="flex items-center mb-1">
                        <Users className="h-3 w-3 text-purple-600 mr-1" />
                        <span className="text-xs text-gray-700 font-medium">Usuários:</span>
                        <span className="text-xs ml-auto">
                          {assinaturaData.estatisticas.usuariosCadastrados || 1} de {' '}
                          {assinaturaData.plano.limitesCadastro.usuarios === 'Ilimitado' 
                            ? 'Ilimitado' 
                            : assinaturaData.plano.limitesCadastro.usuarios}
                        </span>
                      </div>
                      <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full bg-purple-500 rounded-full" 
                          style={{ width: `${
                            assinaturaData.plano.limitesCadastro.usuarios === 'Ilimitado' 
                              ? 25 // Mostra 25% para ilimitado, apenas indicativo
                              : Math.min(100, (assinaturaData.estatisticas.usuariosCadastrados || 1) * 100 / 
                                  (typeof assinaturaData.plano.limitesCadastro.usuarios === 'number' 
                                    ? assinaturaData.plano.limitesCadastro.usuarios 
                                    : 100))
                          }%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Expiração da assinatura (ainda mantemos essa informação) */}
                  {temAssinatura && assinaturaData?.assinatura && (
                    <div className="mt-1 text-xs text-gray-600 flex items-center">
                      <Calendar className="h-3 w-3 text-teal-600 mr-1" />
                      <span>{calcularDiasRestantes(assinaturaData.assinatura)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cabeçalho roxo e planos */}
            <div className="col-span-12 md:col-span-4">
              {/* Cabeçalho roxo */}
              <div className="bg-purple-900 p-4 rounded-t-lg mb-4">
                <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                  <h2 className="text-lg font-semibold text-white text-center sm:text-left">Compare seu plano atual com as opções disponíveis</h2>

                  <div className="flex items-center bg-purple-800 rounded-full p-1">
                    <button
                      onClick={() => setPeriodoPlanos("mensal")}
                      className={`px-4 py-1 text-sm rounded-full transition-all ${
                        periodoPlanos === "mensal"
                          ? "bg-white text-purple-900 font-medium"
                          : "text-purple-200 hover:text-white"
                      }`}
                    >
                      Mensal
                    </button>
                    <button
                      onClick={() => setPeriodoPlanos("anual")}
                      className={`px-4 py-1 text-sm rounded-full transition-all ${
                        periodoPlanos === "anual"
                          ? "bg-white text-purple-900 font-medium"
                          : "text-purple-200 hover:text-white"
                      }`}
                    >
                      Anual
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid de planos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Plano ESSENCIAL */}
                <div className="bg-white shadow rounded-lg overflow-hidden transition-transform duration-300 hover:shadow-lg hover:-translate-y-1">
                  <div className="py-2 bg-blue-50 text-center">
                    <span className="text-xs font-medium text-blue-800 uppercase">
                      {temAssinatura ? 
                        (planoAtual === "Essencial" ? "PLANO ATUAL" : compararPlanos(planoAtual, "Essencial")) 
                        : "ASSINAR"}
                    </span>
                  </div>
                  <div className="p-4 flex flex-col items-center">
                    {/* Nome do plano com ícone */}
                    <div className="flex items-center justify-center mb-4">
                      <Package className="h-5 w-5 text-blue-500 mr-2" />
                      <span className="text-base font-medium text-black">ESSENCIAL</span>
                    </div>

                    {/* Preço riscado (Apenas quando anual) */}
                    {periodoPlanos === "anual" && (
                      <p className="text-sm line-through opacity-70 text-black mb-1">R$ 87,90/MÊS</p>
                    )}

                    {/* Preço atual */}
                    <div className="flex flex-wrap justify-center items-baseline mb-1">
                      <span className="text-2xl font-bold text-black">R$ {periodoPlanos === "anual" ? "73,25" : "87,90"}</span>
                      <span className="text-sm ml-1 text-black">/MÊS</span>
                    </div>

                    {/* Economia anual */}
                    {periodoPlanos === "anual" && (
                      <div className="bg-blue-50 px-2 py-1 rounded-full mb-4">
                        <span className="text-xs font-medium text-blue-800">Economia de 17% no plano anual</span>
                      </div>
                    )}

                    {/* Lista de benefícios */}
                    <ul className="space-y-2 text-sm text-gray-600 mb-6 w-full">
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Até 50 produtos cadastrados</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Até 15 serviços cadastrados</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Calculos de precificação</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>1 usuário</span>
                      </li>
                    </ul>

                    <button 
                      onClick={() => handleUpgrade("Essencial")} 
                      className={`w-full py-2 rounded-lg text-sm font-medium
                        ${planoAtual === "Essencial" 
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : compararPlanos(planoAtual, "Essencial") === "DOWNGRADE"
                            ? "bg-amber-500 hover:bg-amber-600 text-white" 
                            : "bg-blue-500 hover:bg-blue-600 text-white"
                        }`}
                      disabled={planoAtual === "Essencial"}
                    >
                      {planoAtual === "Essencial" 
                        ? "Seu plano atual" 
                        : compararPlanos(planoAtual, "Essencial") === "DOWNGRADE"
                          ? "Fazer Downgrade"
                          : temAssinatura ? "Fazer Upgrade" : "Assinar agora"}
                    </button>
                  </div>
                </div>

                {/* Plano PROFISSIONAL */}
                <div className="bg-white shadow rounded-lg overflow-hidden transition-transform duration-300 hover:shadow-lg hover:-translate-y-1">
                  <div className="py-2 bg-green-50 text-center">
                    <span className="text-xs font-medium text-green-800 uppercase">
                      {temAssinatura ? 
                        (planoAtual === "Profissional" ? "PLANO ATUAL" : compararPlanos(planoAtual, "Profissional")) 
                        : "ASSINAR"}
                    </span>
                  </div>
                  <div className="p-4 flex flex-col items-center">
                    {/* Nome do plano com ícone */}
                    <div className="flex items-center justify-center mb-4">
                      <Zap className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-base font-medium text-black">PROFISSIONAL</span>
                    </div>

                    {/* Preço riscado (Apenas quando anual) */}
                    {periodoPlanos === "anual" && (
                      <p className="text-sm line-through opacity-70 text-black mb-1">R$ 117,90/MÊS</p>
                    )}

                    {/* Preço atual */}
                    <div className="flex flex-wrap justify-center items-baseline mb-1">
                      <span className="text-2xl font-bold text-black">R$ {periodoPlanos === "anual" ? "98,25" : "117,90"}</span>
                      <span className="text-sm ml-1 text-black">/MÊS</span>
                    </div>

                    {/* Economia anual */}
                    {periodoPlanos === "anual" && (
                      <div className="bg-green-50 px-2 py-1 rounded-full mb-4">
                        <span className="text-xs font-medium text-green-800">Economia de 17% no plano anual</span>
                      </div>
                    )}

                    {/* Lista de benefícios */}
                    <ul className="space-y-2 text-sm text-gray-600 mb-6 w-full">
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Até 250 produtos cadastrados</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Até 50 serviços cadastrados</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Calculos de precificação</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Etiquetas de produtos</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Até 3 usuários</span>
                      </li>
                    </ul>

                    <button 
                      onClick={() => handleUpgrade("Profissional")} 
                      className={`w-full py-2 rounded-lg text-sm font-medium
                        ${planoAtual === "Profissional" 
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : compararPlanos(planoAtual, "Profissional") === "DOWNGRADE"
                            ? "bg-amber-500 hover:bg-amber-600 text-white" 
                            : "bg-green-500 hover:bg-green-600 text-white"
                        }`}
                      disabled={planoAtual === "Profissional"}
                    >
                      {planoAtual === "Profissional" 
                        ? "Seu plano atual" 
                        : compararPlanos(planoAtual, "Profissional") === "DOWNGRADE"
                          ? "Fazer Downgrade"
                          : temAssinatura ? "Fazer Upgrade" : "Assinar agora"}
                    </button>
                  </div>
                </div>

                {/* Plano EMPRESARIAL */}
                <div className="bg-white shadow rounded-lg overflow-hidden transition-transform duration-300 hover:shadow-lg hover:-translate-y-1 relative">
                  {/* Marcação de Popular */}
                  <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs py-1 px-2 rounded-bl-lg">
                    Popular
                  </div>
                  
                  <div className="py-2 bg-orange-50 text-center">
                    <span className="text-xs font-medium text-orange-800 uppercase">
                      {temAssinatura ? 
                        (planoAtual === "Empresarial" ? "PLANO ATUAL" : compararPlanos(planoAtual, "Empresarial")) 
                        : "ASSINAR"}
                    </span>
                  </div>
                  <div className="p-4 flex flex-col items-center">
                    {/* Nome do plano com ícone */}
                    <div className="flex items-center justify-center mb-4">
                      <Building className="h-5 w-5 text-orange-500 mr-2" />
                      <span className="text-base font-medium text-black">EMPRESARIAL</span>
                    </div>

                    {/* Preço riscado (Apenas quando anual) */}
                    {periodoPlanos === "anual" && (
                      <p className="text-sm line-through opacity-70 text-black mb-1">R$ 197,90/MÊS</p>
                    )}

                    {/* Preço atual */}
                    <div className="flex flex-wrap justify-center items-baseline mb-1">
                      <span className="text-2xl font-bold text-black">R$ {periodoPlanos === "anual" ? "164,90" : "197,90"}</span>
                      <span className="text-sm ml-1 text-black">/MÊS</span>
                    </div>

                    {/* Economia anual */}
                    {periodoPlanos === "anual" && (
                      <div className="bg-orange-50 px-2 py-1 rounded-full mb-4">
                        <span className="text-xs font-medium text-orange-800">Economia de 17% no plano anual</span>
                      </div>
                    )}

                    {/* Lista de benefícios */}
                    <ul className="space-y-2 text-sm text-gray-600 mb-6 w-full">
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Até 500 produtos cadastrados</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Até 100 serviços cadastrados</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Calculos de precificação</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Etiquetas de produtos</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Dashboards avançados</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Até 6 usuários</span>
                      </li>
                    </ul>

                    <button 
                      onClick={() => handleUpgrade("Empresarial")} 
                      className={`w-full py-2 rounded-lg text-sm font-medium
                        ${planoAtual === "Empresarial" 
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : compararPlanos(planoAtual, "Empresarial") === "DOWNGRADE"
                            ? "bg-amber-500 hover:bg-amber-600 text-white" 
                            : "bg-orange-500 hover:bg-orange-600 text-white"
                        }`}
                      disabled={planoAtual === "Empresarial"}
                    >
                      {planoAtual === "Empresarial" 
                        ? "Seu plano atual" 
                        : compararPlanos(planoAtual, "Empresarial") === "DOWNGRADE"
                          ? "Fazer Downgrade"
                          : temAssinatura ? "Fazer Upgrade" : "Assinar agora"}
                    </button>
                  </div>
                </div>

                {/* Plano PREMIUM */}
                <div className="bg-white shadow rounded-lg overflow-hidden transition-transform duration-300 hover:shadow-lg hover:-translate-y-1">
                  <div className="py-2 bg-purple-50 text-center">
                    <span className="text-xs font-medium text-purple-800 uppercase">
                      {temAssinatura ? 
                        (planoAtual === "Premium" ? "PLANO ATUAL" : compararPlanos(planoAtual, "Premium")) 
                        : "ASSINAR"}
                    </span>
                  </div>
                  <div className="p-4 flex flex-col items-center">
                    {/* Nome do plano com ícone */}
                    <div className="flex items-center justify-center mb-4">
                      <Crown className="h-5 w-5 text-purple-500 mr-2" />
                      <span className="text-base font-medium text-black">PREMIUM</span>
                    </div>

                    {/* Preço riscado (Apenas quando anual) */}
                    {periodoPlanos === "anual" && (
                      <p className="text-sm line-through opacity-70 text-black mb-1">R$ 297,90/MÊS</p>
                    )}

                    {/* Preço atual */}
                    <div className="flex flex-wrap justify-center items-baseline mb-1">
                      <span className="text-2xl font-bold text-black">R$ {periodoPlanos === "anual" ? "247,90" : "297,90"}</span>
                      <span className="text-sm ml-1 text-black">/MÊS</span>
                    </div>

                    {/* Economia anual */}
                    {periodoPlanos === "anual" && (
                      <div className="bg-purple-50 px-2 py-1 rounded-full mb-4">
                        <span className="text-xs font-medium text-purple-800">Economia de 17% no plano anual</span>
                      </div>
                    )}

                    {/* Lista de benefícios */}
                    <ul className="space-y-2 text-sm text-gray-600 mb-6 w-full">
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Produtos cadastrados ilimitados</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Serviços cadastrados ilimitados</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Calculos de precificação</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Etiquetas e códigos de barras</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Dashboards avançados</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Integrações com marketplaces</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Até 10 usuários</span>
                      </li>
                    </ul>

                    <button 
                      onClick={() => handleUpgrade("Premium")} 
                      className={`w-full py-2 rounded-lg text-sm font-medium
                        ${planoAtual === "Premium" 
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : compararPlanos(planoAtual, "Premium") === "DOWNGRADE"
                            ? "bg-amber-500 hover:bg-amber-600 text-white" 
                            : "bg-purple-500 hover:bg-purple-600 text-white"
                        }`}
                      disabled={planoAtual === "Premium"}
                    >
                      {planoAtual === "Premium" 
                        ? "Seu plano atual" 
                        : compararPlanos(planoAtual, "Premium") === "DOWNGRADE"
                          ? "Fazer Downgrade"
                          : temAssinatura ? "Fazer Upgrade" : "Assinar agora"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seção de Perguntas Frequentes (FAQ) */}
        <div className="mt-12 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Perguntas Frequentes</h2>
          
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-gray-700 hover:text-purple-700">
                Como funciona a cobrança dos planos?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                Todos os planos são cobrados de forma recorrente, podendo ser mensal ou anual. 
                O plano anual oferece um desconto significativo em relação ao plano mensal.
                Você pode alterar seu plano a qualquer momento.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-gray-700 hover:text-purple-700">
                O que acontece quando eu atualizo meu plano?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                Ao fazer um upgrade, você terá acesso imediato aos recursos do novo plano. 
                A cobrança será proporcional ao período restante de sua assinatura atual.
                Seus dados e configurações são preservados durante a atualização.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-gray-700 hover:text-purple-700">
                Posso cancelar minha assinatura a qualquer momento?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                Sim, você pode cancelar sua assinatura a qualquer momento. 
                O acesso permanecerá ativo até o final do período pago.
                Não há taxas de cancelamento.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-gray-700 hover:text-purple-700">
                Como aumentar o número de usuários permitidos?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                Cada plano inclui um número específico de usuários permitidos. Para aumentar este limite, 
                você precisa fazer upgrade para um plano superior. O plano Essencial permite 1 usuário, 
                o Profissional até 3 usuários, o Empresarial até 6 usuários e o Premium até 10 usuários.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Modal de Pagamento */}
      {isPaymentModalOpen && selectedPlan && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          selectedPlan={selectedPlan}
          periodoPlanos={periodoPlanos}
          onSuccess={handlePaymentSuccess}
          acaoTipo={acaoTipo}
        />
      )}
    </div>
  );
}