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

  // Não precisamos mais de redirecionamentos, já que temos apenas uma rota
  // useEffect removido para evitar qualquer comportamento de navegação automática

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
      // Não sendo mais usado, substituído por limitesCadastro.usuarios
      // usuariosPermitidos: number;
      // Limites de cadastro para cada plano
      limitesCadastro: {
        produtos: string | number; // "50", "250", "500", "Ilimitado" ou números
        servicos: string | number;
        categorias: string | number;
        usuarios: string | number; // Novo campo para limite de usuários
      };
    } | null;
    estatisticas?: {
      produtosCadastrados: number; // Total de produtos cadastrados pelo usuário
      servicosCadastrados: number;
      categoriasCadastradas: number;
      usuariosCadastrados: number; // Novo campo para total de usuários cadastrados
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
  
  // Função chamada após o pagamento bem-sucedido
  const handlePaymentSuccess = () => {
    toast({
      title: "Pagamento processado com sucesso!",
      description: "Seu plano foi atualizado.",
      variant: "default"
    });
  };

  // Mostrar mensagem de economia em alguns segundos e remover o splash quando os dados carregarem
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimateValue(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Calcular progresso de uso baseado na quantidade de produtos cadastrados
  useEffect(() => {
    if (temAssinatura && assinaturaData) {
      // Verificar se existem estatísticas e plano para cálculo
      if (assinaturaData.estatisticas && assinaturaData.plano?.limitesCadastro) {
        const { produtosCadastrados = 0 } = assinaturaData.estatisticas;
        let limiteProdutos: number = 0;

        // Converter o limite de produtos para número
        const limitePlano = assinaturaData.plano.limitesCadastro.produtos;
        if (typeof limitePlano === 'number') {
          limiteProdutos = limitePlano;
        } else if (limitePlano === 'Ilimitado') {
          limiteProdutos = 10000; // Um valor muito alto para representar "ilimitado"
        } else {
          // Tentar converter string para número
          try {
            limiteProdutos = parseInt(limitePlano.toString(), 10);
          } catch (error) {
            console.error('Erro ao converter limite de produtos:', error);
            limiteProdutos = 50; // Valor padrão em caso de erro
          }
        }

        // Calcular porcentagem de uso (limitado a 98% para sempre mostrar algo restante)
        const porcentagemUso = limiteProdutos > 0 
          ? Math.min(Math.floor((produtosCadastrados / limiteProdutos) * 100), 98)
          : 0;

        // Atualizar o progresso após um breve delay para efeito visual
        const timer = setTimeout(() => {
          setProgress(porcentagemUso);
        }, 500);

        return () => clearTimeout(timer);
      } else {
        // Se não tiver dados de estatísticas, iniciar com zero
        setProgress(0);
      }
    } else {
      // Caso não tenha assinatura, mostramos zero de utilização
      setProgress(0);
    }
  }, [temAssinatura, assinaturaData]);

  // Remover o splash screen quando os dados estiverem carregados
  useEffect(() => {
    if (!assinaturaLoading && !planosLoading && assinaturaData && planosData) {
      console.log("Escondendo splash screen - dados carregados com sucesso!");

      // Esconder o splash screen original diretamente
      const splash = document.getElementById('splash-screen');
      if (splash) {
        console.log("Splash screen encontrado, escondendo...");
        splash.style.opacity = '0';
        setTimeout(() => {
          splash.style.display = 'none';
        }, 500);
      } else {
        console.log("Splash screen não encontrado");
      }
    }
  }, [assinaturaLoading, planosLoading, assinaturaData, planosData]);

  // Componente de loading elegante para a página de planos
  const LoadingComponent = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center space-y-6 p-8">
        {/* Logo/Ícone animado */}
        <div className="relative mx-auto w-20 h-20 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-purple-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-purple-600 border-t-transparent animate-spin"></div>
          <div className="absolute inset-2 rounded-full bg-purple-100 flex items-center justify-center">
            <Crown className="h-8 w-8 text-purple-600 animate-pulse" />
          </div>
        </div>

        {/* Texto de carregamento */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-gray-800">Carregando planos</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Estamos buscando os melhores planos para você...
          </p>
        </div>

        {/* Barras de loading animadas */}
        <div className="flex justify-center space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-8 bg-purple-500 rounded-full animate-pulse"
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s'
              }}
            ></div>
          ))}
        </div>

        {/* Cards de skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
          {[0, 1, 2].map((i) => (
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

                    {/* Economia (Apenas quando anual) */}
                    {periodoPlanos === "anual" && (
                      <div className="text-xs text-green-600 font-medium mb-4 text-center whitespace-nowrap">ECONOMIZE R$ 175,80/ANO</div>
                    )}

                    {/* Ideal para */}
                    <div className="text-xs font-medium space-y-1 mt-4 w-full">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-blue-500 mr-1" />
                        <p className="text-black">AUTÔNOMOS</p>
                      </div>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-blue-500 mr-1" />
                        <p className="text-black">INICIANTES</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plano PROFISSIONAL */}
                <div className="bg-purple-900 shadow rounded-lg overflow-hidden transition-transform duration-300 hover:shadow-lg hover:-translate-y-1">
                  <div className="py-2 bg-purple-800 text-center">
                    <span className="text-xs font-medium text-white uppercase">
                      {temAssinatura ? 
                        (planoAtual === "Profissional" ? "PLANO ATUAL" : compararPlanos(planoAtual, "Profissional")) 
                        : "ASSINAR"}
                    </span>
                  </div>
                  <div className="p-4 flex flex-col items-center">
                    {/* Nome do plano com ícone */}
                    <div className="flex items-center justify-center mb-4">
                      <Rocket className="h-5 w-5 text-white mr-2" />
                      <span className="text-base font-medium text-white">PROFISSIONAL</span>
                    </div>

                    {/* Preço riscado (Apenas quando anual) */}
                    {periodoPlanos === "anual" && (
                      <p className="text-sm line-through opacity-70 text-white mb-1">R$ 197,90/MÊS</p>
                    )}

                    {/* Preço atual */}
                    <div className="flex flex-wrap justify-center items-baseline mb-1">
                      <span className="text-2xl font-bold text-white">R$ {periodoPlanos === "anual" ? "164,92" : "197,90"}</span>
                      <span className="text-sm ml-1 text-white">/MÊS</span>
                    </div>

                    {/* Economia (Apenas quando anual) */}
                    {periodoPlanos === "anual" && (
                      <div className="text-xs text-purple-200 font-medium mb-4 whitespace-nowrap text-center">ECONOMIZE R$ 395,76/ANO</div>
                    )}

                    {/* Ideal para */}
                    <div className="text-xs font-medium space-y-1 mt-4 w-full">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 text-purple-200 mr-1" />
                        <p className="text-white">PEQUENAS EMPRESAS</p>
                      </div>
                      <div className="flex items-center">
                        <Rocket className="h-4 w-4 text-purple-200 mr-1" />
                        <p className="text-white">CRESCIMENTO</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plano EMPRESARIAL */}
                <div className="bg-white shadow rounded-lg overflow-hidden transition-transform duration-300 hover:shadow-lg hover:-translate-y-1">
                  <div className="py-2 bg-teal-50 text-center">
                    <span className="text-xs font-medium text-teal-800 uppercase">
                      {temAssinatura ? 
                        (planoAtual === "Empresarial" ? "PLANO ATUAL" : compararPlanos(planoAtual, "Empresarial")) 
                        : "ASSINAR"}
                    </span>
                  </div>
                  <div className="p-4 flex flex-col items-center">
                    {/* Nome do plano com ícone */}
                    <div className="flex items-center justify-center mb-4">
                      <Building2 className="h-5 w-5 text-teal-600 mr-2" />
                      <span className="text-base font-medium text-black">EMPRESARIAL</span>
                    </div>

                    {/* Preço riscado (Apenas quando anual) */}
                    {periodoPlanos === "anual" && (
                      <p className="text-sm line-through opacity-70 text-black mb-1">R$ 397,90/MÊS</p>
                    )}

                    {/* Preço atual */}
                    <div className="flex flex-wrap justify-center items-baseline mb-1">
                      <span className="text-2xl font-bold text-black">R$ {periodoPlanos === "anual" ? "331,58" : "397,90"}</span>
                      <span className="text-sm ml-1 text-black">/MÊS</span>
                    </div>

                    {/* Economia (Apenas quando anual) */}
                    {periodoPlanos === "anual" && (
                      <div className="text-xs text-green-600 font-medium mb-4 whitespace-nowrap text-center">ECONOMIZE R$ 795,84/ANO</div>
                    )}

                    {/* Ideal para */}
                    <div className="text-xs font-medium space-y-1 mt-4 w-full">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 text-teal-600 mr-1" />
                        <p className="text-black">EMPRESAS MÉDIAS</p>
                      </div>
                      <div className="flex items-center">
                        <BarChart2 className="h-4 w-4 text-teal-600 mr-1" />
                        <p className="text-black">GESTÃO EMPRESARIAL</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plano PREMIUM */}
                <div className="bg-white shadow rounded-lg overflow-hidden transition-transform duration-300 hover:shadow-lg hover:-translate-y-1">
                  <div className="py-2 bg-amber-50 text-center">
                    <span className="text-xs font-medium text-amber-800 uppercase">
                      {temAssinatura ? 
                        (planoAtual === "Premium" ? "PLANO ATUAL" : compararPlanos(planoAtual, "Premium")) 
                        : "ASSINAR"}
                    </span>
                  </div>
                  <div className="p-4 flex flex-col items-center">
                    {/* Nome do plano com ícone */}
                    <div className="flex items-center justify-center mb-4">
                      <Crown className="h-5 w-5 text-amber-500 mr-2" />
                      <span className="text-base font-medium text-black">PREMIUM</span>
                    </div>

                    {/* Preço riscado (Apenas quando anual) */}
                    {periodoPlanos === "anual" && (
                      <p className="text-sm line-through opacity-70 text-black mb-1">R$ 697,90/MÊS</p>
                    )}

                    {/* Preço atual */}
                    <div className="flex flex-wrap justify-center items-baseline mb-1">
                      <span className="text-2xl font-bold text-black">R$ {periodoPlanos === "anual" ? "581,58" : "697,90"}</span>
                      <span className="text-sm ml-1 text-black">/MÊS</span>
                    </div>

                    {/* Economia (Apenas quando anual) */}
                    {periodoPlanos === "anual" && (
                      <div className="text-xs text-green-600 font-medium mb-4 whitespace-nowrap text-center">ECONOMIZE R$ 1.395,84/ANO</div>
                    )}

                    {/* Ideal para */}
                    <div className="text-xs font-medium space-y-1 mt-4 w-full">
                      <div className="flex items-center">
                        <Crown className="h-4 w-4 text-amber-500 mr-1" />
                        <p className="text-black mt-[-2px]">CORPORAÇÕES</p>
                      </div>
                      <div className="flex items-center">
                        <Crown className="h-4 w-4 text-amber-500 mr-1" />
                        <p className="text-black mt-[-2px]">ESCALA PREMIUM</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Espaço reduzido entre os boxes de planos e a tabela de comparação */}
          <div className="py-2"></div>

          {/* Tabela de comparação de recursos */}
          <div className="overflow-x-auto shadow rounded-lg">
            <table className="min-w-full border-collapse border border-gray-200 rounded-lg">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="p-3 text-left font-medium text-gray-700 border-r border-gray-200">
                    Funcionalidades
                  </th>
                  <th className="p-3 text-center font-medium text-gray-700 w-1/5 border-r border-gray-200">
                    Essencial
                  </th>
                  <th className="p-3 text-center font-medium text-white bg-purple-900 w-1/5 border-r border-gray-200">
                    Profissional
                  </th>
                  <th className="p-3 text-center font-medium text-gray-700 w-1/5 border-r border-gray-200">
                    Empresarial
                  </th>
                  <th className="p-3 text-center font-medium text-gray-700 w-1/5">
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Dashboard */}
                <tr className="bg-gray-50">
                  <td className="p-3 border-r border-gray-200">
                    <div className="font-medium">Dashboard</div>
                    <div className="text-xs text-gray-500">Painel de controle e análises</div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-blue-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-blue-600 font-medium">Básica</span>
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-purple-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-purple-700 font-medium">Intermediária</span>
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-teal-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-teal-600 font-medium">Completa</span>
                    </div>
                  </td>
                  <td className="p-3 text-center bg-amber-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-amber-600 font-medium">Avançada com filtros</span>
                    </div>
                  </td>
                </tr>

                {/* Precificação */}
                <tr className="bg-white">
                  <td className="p-3 border-r border-gray-200">
                    <div className="font-medium">Precificação</div>
                    <div className="text-xs text-gray-500">Tipos de produtos suportados</div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-blue-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-blue-600 font-medium">Apenas produtos novos</span>
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200">
                    <div className="flex justify-center">
                      <span className="text-sm text-purple-700 font-medium">Novos, usados e serviços</span>
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200">
                    <div className="flex justify-center">
                      <span className="text-sm text-teal-600 font-medium">Novos, usados, serviços e aluguéis</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center">
                      <span className="text-sm text-amber-600 font-medium">Todos + API</span>
                    </div>
                  </td>
                </tr>

                {/* Precificação unitária sem cadastro */}
                <tr className="bg-gray-50">
                  <td className="p-3 border-r border-gray-200">
                    <div className="font-medium">Precificação unitária sem cadastro</div>
                    <div className="text-xs text-gray-500">Cálculos sem precisar cadastrar produtos</div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-blue-50">
                    <div className="flex justify-center">
                      <Check className="h-5 w-5 text-teal-500" />
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-purple-50">
                    <div className="flex justify-center">
                      <Check className="h-5 w-5 text-purple-600" />
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-teal-50">
                    <div className="flex justify-center">
                      <Check className="h-5 w-5 text-teal-500" />
                    </div>
                  </td>
                  <td className="p-3 text-center bg-amber-50">
                    <div className="flex justify-center">
                      <Check className="h-5 w-5 text-amber-500" />
                    </div>
                  </td>
                </tr>

                {/* Importação */}
                <tr className="bg-white">
                  <td className="p-3 border-r border-gray-200">
                    <div className="font-medium">Importação (Excel / XML / API)</div>
                    <div className="text-xs text-gray-500">Importar dados emlote de outras fontes</div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-blue-50">
                    <div className="flex justify-center">
                      <X className="h-5 w-5 text-red-500" />
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-purple-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-purple-700 font-medium">Excel</span>
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-teal-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-teal-600 font-medium">Excel + XML</span>
                    </div>
                  </td>
                  <td className="p-3 text-center bg-amber-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-amber-600 font-medium">Excel + XML + API</span>
                    </div>
                  </td>
                </tr>

                {/* Cadastro de produtos, serviços e aluguéis */}
                <tr className="bg-gray-50">
                  <td className="p-3 border-r border-gray-200">
                    <div className="font-medium">Cadastro de produtos, serviços e aluguéis</div>
                    <div className="text-xs text-gray-500">Limite de itens para cadastro</div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-blue-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-blue-600 font-medium">Até 50 itens</span>
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-purple-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-purple-700 font-medium">Até 250 itens</span>
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-teal-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-teal-600 font-medium">Até 500 itens</span>
                    </div>
                  </td>
                  <td className="p-3 text-center bg-amber-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-amber-600 font-medium">Ilimitado</span>
                    </div>
                  </td>
                </tr>

                {/* Cadastro de clientes e fornecedores */}
                <tr className="bg-white">
                  <td className="p-3 border-r border-gray-200">
                    <div className="font-medium">Cadastro de clientes e fornecedores</div>
                    <div className="text-xs text-gray-500">Gestão de relacionamentos comerciais</div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-blue-50">
                    <div className="flex justify-center">
                      <X className="h-5 w-5 text-red-500" />
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-purple-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-purple-700 font-medium">Até 250 itens</span>
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-teal-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-teal-600 font-medium">Até 500 itens</span>
                    </div>
                  </td>
                  <td className="p-3 text-center bg-amber-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-amber-600 font-medium">Ilimitado</span>
                    </div>
                  </td>
                </tr>

                {/* Relatórios personalizados */}
                <tr className="bg-gray-50">
                  <td className="p-3 border-r border-gray-200">
                    <div className="font-medium">Relatórios personalizados</div>
                    <div className="text-xs text-gray-500">Geração de relatórios detalhados</div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-blue-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-blue-600 font-medium">Básicos</span>
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-purple-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-purple-700 font-medium">Intermediários</span>
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-teal-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-teal-600 font-medium">Avançados</span>
                    </div>
                  </td>
                  <td className="p-3 text-center bg-amber-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-amber-600 font-medium">Exportação</span>
                    </div>
                  </td>
                </tr>

                {/* Gerenciamento de custos e despesas */}
                <tr className="bg-white">
                  <td className="p-3 border-r border-gray-200">
                    <div className="font-medium">Gerenciamento de custos e despesas</div>
                    <div className="text-xs text-gray-500">Controle financeiro detalhado</div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-blue-50">
                    <div className="flex justify-center">
                      <X className="h-5 w-5 text-red-500" />
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-purple-50">
                    <div className="flex justify-center">
                      <Check className="h-5 w-5 text-purple-600" />
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-teal-50">
                    <div className="flex justify-center">
                      <Check className="h-5 w-5 text-teal-500" />
                    </div>
                  </td>
                  <td className="p-3 text-center bg-amber-50">
                    <div className="flex justify-center">
                      <Check className="h-5 w-5 text-amber-500" />
                    </div>
                  </td>
                </tr>

                {/* Gerenciamento de taxas e promoções */}
                <tr className="bg-gray-50">
                  <td className="p-3 border-r border-gray-200">
                    <div className="font-medium">Gerenciamento de taxas e promoções</div>
                    <div className="text-xs text-gray-500">Personalização de taxas e descontos</div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-blue-50">
                    <div className="flex justify-center">
                      <X className="h-5 w-5 text-red-500" />
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-purple-50">
                    <div className="flex justify-center">
                      <Check className="h-5 w-5 text-purple-600" />
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-teal-50">
                    <div className="flex justify-center">
                      <Check className="h-5 w-5 text-teal-500" />
                    </div>
                  </td>
                  <td className="p-3 text-center bg-amber-50">
                    <div className="flex justify-center">
                      <Check className="h-5 w-5 text-amber-500" />
                    </div>
                  </td>
                </tr>

                {/* Gerenciamento de tributações e rateios */}
                <tr className="bg-white">
                  <td className="p-3 border-r border-gray-200">
                    <div className="font-medium">Gerenciamento de tributações e rateios</div>
                    <div className="text-xs text-gray-500">Configuração avançada de tributos</div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-blue-50">
                    <div className="flex justify-center">
                      <X className="h-5 w-5 text-red-500" />
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-purple-50">
                    <div className="flex justify-center">
                      <X className="h-5 w-5 text-red-500" />
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-teal-50">
                    <div className="flex justify-center">
                      <Check className="h-5 w-5 text-teal-500" />
                    </div>
                  </td>
                  <td className="p-3 text-center bg-amber-50">
                    <div className="flex justify-center">
                      <Check className="h-5 w-5 text-amber-500" />
                    </div>
                  </td>
                </tr>

                {/* Integração com Marketplaces */}
                <tr className="bg-gray-50">
                  <td className="p-3 border-r border-gray-200">
                    <div className="font-medium">Integração com Marketplaces</div>
                    <div className="text-xs text-gray-500">Conexão com plataformas de vendas online</div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-blue-50">
                    <div className="flex justify-center">
                      <X className="h-5 w-5 text-red-500" />
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-purple-50">
                    <div className="flex justify-center">
                      <Check className="h-5 w-5 text-purple-600" />
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-teal-50">
                    <div className="flex justify-center">
                      <Check className="h-5 w-5 text-teal-500" />
                    </div>
                  </td>
                  <td className="p-3 text-center bg-amber-50">
                    <div className="flex justify-center">
                      <Check className="h-5 w-5 text-amber-500" />
                    </div>
                  </td>
                </tr>

                {/* Central de treinamento */}
                <tr className="bg-white">
                  <td className="p-3 border-r border-gray-200">
                    <div className="font-medium">Central de treinamento</div>
                    <div className="text-xs text-gray-500">Acesso a materiais de capacitação</div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-blue-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-blue-600 font-medium">Essencial</span>
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-purple-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-purple-700 font-medium">Profissional</span>
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-teal-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-teal-600 font-medium">Empresarial</span>
                    </div>
                  </td>
                  <td className="p-3 text-center bg-amber-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-amber-600 font-medium">Premium</span>
                    </div>
                  </td>
                </tr>

                {/* Suporte */}
                <tr className="bg-gray-50">
                  <td className="p-3 border-r border-gray-200">
                    <div className="font-medium">Suporte</div>
                    <div className="text-xs text-gray-500">Canais de atendimento disponíveis</div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-blue-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-blue-600 font-medium">E-mail</span>
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-purple-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-purple-700 font-medium">Chat</span>
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-teal-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-teal-600 font-medium">Prioritário</span>
                    </div>
                  </td>
                  <td className="p-3 text-center bg-amber-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-amber-600 font-medium">WhatsApp</span>
                    </div>
                  </td>
                </tr>

                {/* Usuários permitidos */}
                <tr className="bg-white">
                  <td className="p-3 border-r border-gray-200">
                    <div className="font-medium">Usuários permitidos</div>
                    <div className="text-xs text-gray-500">Número de acessos simultâneos</div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-blue-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-blue-600 font-medium">1</span>
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-purple-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-purple-700 font-medium">Até 3</span>
                    </div>
                  </td>
                  <td className="p-3 text-center border-r border-gray-200 bg-teal-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-teal-600 font-medium">Até 5</span>
                    </div>
                  </td>
                  <td className="p-3 text-center bg-amber-50">
                    <div className="flex justify-center">
                      <span className="text-sm text-amber-600 font-medium">Ilimitado</span>
                    </div>
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-gray-50">
                <tr className="border-t border-gray-200">
                  <td className="p-4 border-r border-gray-200 font-medium">
                    Escolha seu plano
                  </td>
                  <td className="p-4 text-center border-r border-gray-200">
                    <Button 
                      onClick={() => handleUpgrade("Essencial")}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                      disabled={planoAtual === "ESSENCIAL"}
                    >
                      {temAssinatura ? 
                        (planoAtual === "ESSENCIAL" ? "PLANO ATUAL" : 
                        (compararPlanos(planoAtual, "Essencial") === "DOWNGRADE" ? "FAZER DOWNGRADE" : "FAZER UPGRADE")) 
                        : "ASSINAR"}
                    </Button>
                  </td>
                  <td className="p-4 text-center bg-purple-50">
                    <Button 
                      onClick={() => handleUpgrade("Profissional")}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      disabled={planoAtual === "PROFISSIONAL"}
                    >
                      {temAssinatura ? 
                        (planoAtual === "PROFISSIONAL" ? "PLANO ATUAL" : 
                        (compararPlanos(planoAtual, "Profissional") === "DOWNGRADE" ? "FAZER DOWNGRADE" : "FAZER UPGRADE")) 
                        : "ASSINAR"}
                    </Button>
                  </td>
                  <td className="p-4 text-center">
                    <Button 
                      onClick={() => handleUpgrade("Empresarial")}
                      className="w-full bg-teal-500 hover:bg-teal-600 text-white"
                      disabled={planoAtual === "EMPRESARIAL"}
                    >
                      {temAssinatura ? 
                        (planoAtual === "EMPRESARIAL" ? "PLANO ATUAL" : 
                        (compararPlanos(planoAtual, "Empresarial") === "DOWNGRADE" ? "FAZER DOWNGRADE" : "FAZER UPGRADE")) 
                        : "ASSINAR"}
                    </Button>
                  </td>
                  <td className="p-4 text-center">
                    <Button 
                      onClick={() => handleUpgrade("Premium")}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                      disabled={planoAtual === "PREMIUM"}
                    >
                      {temAssinatura ? 
                        (planoAtual === "PREMIUM" ? "PLANO ATUAL" : 
                        (compararPlanos(planoAtual, "Premium") === "DOWNGRADE" ? "FAZER DOWNGRADE" : "FAZER UPGRADE")) 
                        : "ASSINAR"}
                    </Button>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Layout para mobile */}
        <div className="md:hidden">
          {/* Cabeçalho do mobile */}
          <div className="bg-gradient-to-r from-purple-700 to-purple-900 p-4 rounded-lg mb-6 text-center">
            <h2 className="text-xl font-bold text-white mb-3">Compare as opções e escolha seu plano ideal</h2>

            {/* Seletor de período no mobile */}
            <div className="flex justify-center items-center mb-3">
              <div className="bg-purple-800 p-1 rounded-full inline-flex">
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

            {periodoPlanos === "anual" && (
              <Badge className="bg-amber-400 text-purple-900 font-medium rounded-full py-1 px-4">
                Economize 2 meses no plano anual!
              </Badge>
            )}
          </div>

          {/* Card do plano atual no mobile */}
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">Seu plano atual</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <Package className="h-5 w-5 text-blue-500 mr-2" />
                <p className="font-medium text-gray-700">{planoAtual}</p>
                <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">Ativo</Badge>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Utilização de cadastros</span>
                  <span className="text-sm font-medium text-blue-600">{progress}%</span>
                </div>

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
                            ? 25 
                            : Math.min(100, ((assinaturaData.estatisticas.usuariosCadastrados || 1) * 100) / 
                                (typeof assinaturaData.plano.limitesCadastro.usuarios === 'number' 
                                  ? assinaturaData.plano.limitesCadastro.usuarios 
                                  : parseInt(assinaturaData.plano.limitesCadastro.usuarios, 10) || 1))
                        }%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Utilização de produtos (mobile) */}
                {temAssinatura && assinaturaData?.estatisticas && assinaturaData.plano?.limitesCadastro && (
                  <div className="mb-3">
                    <div className="flex items-center mb-1">
                      <Package className="h-3 w-3 text-blue-600 mr-1" />
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
                        className="absolute top-0 left-0 h-full bg-blue-500 rounded-full" 
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

                {/* Utilização de usuários (mobile) */}
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

                {/* Expiração da assinatura (mobile) */}
                {temAssinatura && assinaturaData?.assinatura && (
                  <div className="mt-1 text-xs text-gray-600 flex items-center">
                    <Calendar className="h-3 w-3 text-blue-600 mr-1" />
                    <span>{calcularDiasRestantes(assinaturaData.assinatura)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cards de planos no mobile */}
          <div className="space-y-6">
            {/* Plano PROFISSIONAL */}
            <div className="bg-purple-900 shadow rounded-lg overflow-hidden">
              <div className="py-2 bg-purple-800 text-center">
                <span className="text-xs font-medium text-white uppercase">Recomendado para você</span>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <Rocket className="h-6 w-6 text-white mr-2" />
                    <span className="text-lg font-bold text-white">PROFISSIONAL</span>
                  </div>
                  <Badge className="bg-purple-200 text-purple-900 font-medium">Popular</Badge>
                </div>

                <div className="mb-4">
                  {periodoPlanos === "anual" && (
                    <p className="text-sm line-through opacity-70 text-purple-200 mb-1">R$ 197,90/mês</p>
                  )}

                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-white">R$ {periodoPlanos === "anual" ? "164,92" : "197,90"}</span>
                    <span className="text-sm ml-1 text-white">/mês</span>
                  </div>

                  {periodoPlanos === "anual" && (
                    <div className="text-sm text-purple-200 font-medium mt-1">ECONOMIZE R$ 395,76/ANO</div>
                  )}
                </div>

                <div className="mb-5 text-white">
                  <p className="text-sm mb-3">Ideal para pequenas empresas e negócios em crescimento que precisam de mais recursos e funcionalidades avançadas.</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-start">
                      <Check className="h-5 w-5 text-purple-200 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">Recursos ilimitados para produtos e serviços</p>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-5 w-5 text-purple-200 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">Ferramentas avançadas de precificação</p>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-5 w-5 text-purple-200 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">Integração com marketplaces</p>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-5 w-5 text-purple-200 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">Suporte prioritário</p>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full bg-white hover:bg-gray-100 text-purple-900 font-bold py-3 rounded-lg"
                  onClick={() => handleUpgrade("Profissional")}
                  disabled={planoAtual === "PROFISSIONAL"}
                >
                  {planoAtual === "PROFISSIONAL" ? "PLANO ATUAL" : temAssinatura ? "Fazer upgrade agora" : "Assinar agora"}
                  {planoAtual !== "PROFISSIONAL" && <ArrowRight className="h-4 w-4 ml-2" />}
                </Button>
              </div>
            </div>

            {/* Plano EMPRESARIAL */}
            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
              <div className="py-2 bg-teal-50 text-center">
                <span className="text-xs font-medium text-teal-800 uppercase">Mais recursos</span>
              </div>
              <div className="p-5">
                <div className="flex items-center mb-4">
                  <Building2 className="h-6 w-6 text-teal-600 mr-2" />
                  <span className="text-lg font-bold text-gray-900">EMPRESARIAL</span>
                </div>

                <div className="mb-4">
                  {periodoPlanos === "anual" && (
                    <p className="text-sm line-through opacity-70 text-gray-500 mb-1">R$ 397,90/mês</p>
                  )}

                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">R$ {periodoPlanos === "anual" ? "331,58" : "397,90"}</span>
                    <span className="text-sm ml-1 text-gray-700">/mês</span>
                  </div>

                  {periodoPlanos === "anual" && (
                    <div className="text-sm text-green-600 font-medium mt-1">ECONOMIZE R$ 795,84/ANO</div>
                  )}
                </div>

                <Button 
                  variant="outline"
                  className="w-full border-teal-600 text-teal-700 hover:bg-teal-50 font-medium py-3 rounded-lg mb-4"
                  onClick={() => handleUpgrade("Empresarial")}
                  disabled={planoAtual === "EMPRESARIAL"}
                >
                  {planoAtual === "EMPRESARIAL" ? "PLANO ATUAL" : temAssinatura ? "Fazer upgrade" : "Assinar"}
                </Button>
              </div>
            </div>

            {/* Plano PREMIUM */}
            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
              <div className="py-2 bg-amber-50 text-center">
                <span className="text-xs font-medium text-amber-800 uppercase">Premium</span>
              </div>
              <div className="p-5">
                <div className="flex items-center mb-4">
                  <Crown className="h-6 w-6 text-amber-500 mr-2" />
                  <span className="text-lg font-bold text-gray-900">PREMIUM</span>
                </div>

                <div className="mb-4">
                  {periodoPlanos === "anual" && (
                    <p className="text-sm line-through opacity-70 text-gray-500 mb-1">R$ 697,90/mês</p>
                  )}

                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">R$ {periodoPlanos === "anual" ? "581,58" : "697,90"}</span>
                    <span className="text-sm ml-1 text-gray-700">/mês</span>
                  </div>

                  {periodoPlanos === "anual" && (
                    <div className="text-sm text-green-600 font-medium mt-1">ECONOMIZE R$ 1.395,84/ANO</div>
                  )}
                </div>

                <Button 
                  variant="outline"
                  className="w-full border-amber-500 text-amber-700 hover:bg-amber-50 font-medium py-3 rounded-lg mb-4"
                  onClick={() => handleUpgrade("Premium")}
                  disabled={planoAtual === "PREMIUM"}
                >
                  {planoAtual === "PREMIUM" ? "PLANO ATUAL" : temAssinatura ? "Fazer upgrade" : "Assinar"}
                </Button>
              </div>
            </div>

            {/* Tabela de comparação de recursos para mobile - Accordion por PLANO */}
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 text-center">Comparativo de funcionalidades</h3>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {/* PLANO ESSENCIAL */}
                <AccordionItem value="plano-essencial">
                  <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 mr-2 text-blue-500" />
                      <span className="font-medium">Plano Essencial</span>
                      <Badge className="ml-2 bg-blue-50 text-blue-700 border-blue-200">Atual</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-3 border-t border-gray-100">
                    <div className="space-y-5 text-sm">
                      <div className="pb-3 mb-3 border-b border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-2">O que você tem</h4>
                        <div className="space-y-2">
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Dashboard básico</p>
                              <p className="text-gray-600">Painel de controle com funções essenciais</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Precificação para produtos novos</p>
                              <p className="text-gray-600">Calcule preços apenas para produtos novos</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Precificação unitária sem cadastro</p>
                              <p className="text-gray-600">Cálculos avulsos sem precisar cadastrar produtos</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Cadastro básico</p>
                              <p className="text-gray-600">Até 50 itens para produtos/serviços</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Relatórios básicos</p>
                              <p className="text-gray-600">Informações essenciais para seu negócio</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Gerenciamento parcial de custos</p>
                              <p className="text-gray-600">Controle financeiro básico</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Suporte por E-mail</p>
                              <p className="text-gray-600">Atendimento básico para dúvidas</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">1 usuário</p>
                              <p className="text-gray-600">Acesso individual</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">O que você não tem</h4>
                        <div className="space-y-2">
                          <div className="flex items-start">
                            <X className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Precificação avançada</p>
                              <p className="text-gray-600">Produtos usados, serviços e aluguéis</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <X className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Importação de dados</p>
                              <p className="text-gray-600">Excel, XML e API</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <div className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0 flex items-center justify-center">
                              <span className="font-medium">X</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">Cadastro de clientes e fornecedores</p>
                              <p className="text-gray-600">Gestão de relacionamentos comerciais</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <X className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Integração com Marketplaces</p>
                              <p className="text-gray-600">Conexão com plataformas de vendas online</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <X className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Gestão de taxas e promoções</p>
                              <p className="text-gray-600">Personalização de taxas e descontos</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <X className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Gerenciamento de tributações</p>
                              <p className="text-gray-600">Configuração avançada de tributos</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Central de treinamento</p>
                              <p className="text-gray-600">Acesso a materiais essenciais</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* PLANO PROFISSIONAL */}
                <AccordionItem value="plano-profissional">
                  <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 bg-purple-50">
                    <div className="flex items-center">
                      <Rocket className="h-5 w-5 mr-2 text-purple-600" />
                      <span className="font-medium text-purple-800">Plano Profissional</span>
                      <Badge className="ml-2 bg-purple-100 text-purple-700 border-purple-200">Recomendado</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-3 border-t border-gray-100 bg-purple-50/50">
                    <div className="space-y-5 text-sm">
                      <div className="pb-3 mb-3 border-b border-purple-200/50">
                        <h4 className="font-semibold text-gray-900 mb-2">O que você ganha</h4>
                        <div className="space-y-2">
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Dashboard intermediário</p>
                              <p className="text-gray-600">Painéis e análises intermediários</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Precificação completa</p>
                              <p className="text-gray-600">Produtos novos, usados e serviços</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Precificação unitária</p>
                              <p className="text-gray-600">Cálculos sem precisar cadastrar produtos</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Importação Excel</p>
                              <p className="text-gray-600">Importação de dados em lote</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Cadastros ampliados</p>
                              <p className="text-gray-600">Até 250 itens para produtos e serviços</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Cadastro de clientes/fornecedores</p>
                              <p className="text-gray-600">Gestão de relacionamentos comerciais</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Integração com Marketplaces</p>
                              <p className="text-gray-600">Conexão com plataformas de vendas online</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Relatórios intermediários</p>
                              <p className="text-gray-600">Relatórios e análises detalhados</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Gestão de custos e despesas</p>
                              <p className="text-gray-600">Controle financeiro completo</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Gestão de taxas e promoções</p>
                              <p className="text-gray-600">Personalização de taxas e descontos</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Central de treinamento</p>
                              <p className="text-gray-600">Acesso a materiais profissionais</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Suporte via Chat</p>
                              <p className="text-gray-600">Atendimento rápido em tempo real</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Até 3 usuários</p>
                              <p className="text-gray-600">Acessos simultâneos</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pb-3 mb-3 border-b border-purple-200/50">
                        <h4 className="font-semibold text-gray-900 mb-2">O que você não tem</h4>
                        <div className="space-y-2">
                          <div className="flex items-start">
                            <X className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Importação XML e API</p>
                              <p className="text-gray-600">Disponível nos planos superiores</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <X className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Gerenciamento de tributações</p>
                              <p className="text-gray-600">Configuração avançada de tributos</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <X className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Suporte prioritário avançado</p>
                              <p className="text-gray-600">Com WhatsApp e atendimento dedicado</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <X className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Cadastros ilimitados</p>
                              <p className="text-gray-600">Disponível apenas no plano Premium</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Button 
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium"
                          onClick={() => handleUpgrade("Profissional")}
                          disabled={planoAtual === "PROFISSIONAL"}
                        >
                          {planoAtual === "PROFISSIONAL" ? "Plano atual" : temAssinatura ? "Fazer upgrade para Profissional" : "Assinar plano Profissional"}
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* PLANO EMPRESARIAL */}
                <AccordionItem value="plano-empresarial">
                  <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center">
                      <Building2 className="h-5 w-5 mr-2 text-teal-600" />
                      <span className="font-medium text-teal-800">Plano Empresarial</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-3 border-t border-gray-100">
                    <div className="space-y-5 text-sm">
                      <div className="pb-3 mb-3 border-b border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-2">O que você ganha</h4>
                        <div className="space-y-2">
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-teal-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Cadastros ilimitados</p>
                              <p className="text-gray-600">Produtos, serviços, fornecedores, clientes</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-teal-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Ferramentas avançadas</p>
                              <p className="text-gray-600">Estratégias personalizadas e análises</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-teal-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Integração com marketplaces</p>
                              <p className="text-gray-600">Sincronização com plataformas populares</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-teal-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Suporte Prioritário</p>
                              <p className="text-gray-600">Atendimento com prioridade de resposta</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-teal-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Dashboard financeiro avançado</p>
                              <p className="text-gray-600">Visão completa das suas finanças</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-teal-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Multi-usuários</p>
                              <p className="text-gray-600">Até 5 usuários simultâneos</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-teal-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Central de treinamento</p>
                              <p className="text-gray-600">Acesso a materiais empresariais</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pb-3 mb-3 border-b border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-2">O que não está incluído</h4>
                        <div className="space-y-2">
                          <div className="flex items-start">
                            <X className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Acesso a API premium</p>
                              <p className="text-gray-600">Disponível apenas no plano Premium</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <X className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Relatórios avançados</p>
                              <p className="text-gray-600">Disponível apenas no plano Premium</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Button 
                          variant="outline"
                          className="w-full border-teal-600 text-teal-700 hover:bg-teal-50 font-medium"
                          onClick={() => handleUpgrade("Empresarial")}
                          disabled={planoAtual === "EMPRESARIAL"}
                        >
                          {planoAtual === "EMPRESARIAL" ? "Plano atual" : temAssinatura ? "Fazer upgrade para Empresarial" : "Assinar plano Empresarial"}
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* PLANO PREMIUM */}
                <AccordionItem value="plano-premium">
                  <AccordionTrigger className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center">
                      <Crown className="h-5 w-5 mr-2 text-amber-500" />
                      <span className="font-medium text-amber-800">Plano Premium</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-3 border-t border-gray-100">
                    <div className="space-y-5 text-sm">
                      <div className="pb-3 mb-3 border-b border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-2">Tudo que você recebe</h4>
                        <div className="space-y-2">
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Cadastros ilimitados</p>
                              <p className="text-gray-600">Produtos, serviços, fornecedores, clientes</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Ferramentas avançadas</p>
                              <p className="text-gray-600">Estratégias personalizadas e análises</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Integração com marketplaces</p>
                              <p className="text-gray-600">Sincronização com plataformas populares</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Suporte WhatsApp</p>
                              <p className="text-gray-600">Atendimento direto via WhatsApp</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Dashboard financeiro premium</p>
                              <p className="text-gray-600">Visão completa das suas finanças</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Multi-usuários ilimitados</p>
                              <p className="text-gray-600">Usuários ilimitados com controle de permissões</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Central de treinamento</p>
                              <p className="text-gray-600">Acesso premium a todos os materiais</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Acesso a API e integrações premium</p>
                              <p className="text-gray-600">Conecte com outros sistemas</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Check className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Relatórios e análises avançadas</p>
                              <p className="text-gray-600">Insights completos para seu negócio</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Button 
                          variant="outline"
                          className="w-full border-amber-500 text-amber-700 hover:bg-amber-50 font-medium"
                          onClick={() => handleUpgrade("Premium")}
                          disabled={planoAtual === "PREMIUM"}
                        >
                          {planoAtual === "PREMIUM" ? "Plano atual" : temAssinatura ? "Fazer upgrade para Premium" : "Assinar plano Premium"}
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de Pagamento */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        planoSelecionado={selectedPlan}
        periodoPlanos={periodoPlanos}
        onSuccess={handlePaymentSuccess}
        acaoTipo={acaoTipo}
      />
    </div>
  );
}