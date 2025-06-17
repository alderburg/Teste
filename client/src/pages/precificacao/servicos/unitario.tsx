import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { calcularPrecoServico, formatarMoeda } from "@/services/calculoService";
import { ArrowLeft, Save, Calculator, Pencil, Trash, X, Search, ChevronLeft, ChevronRight, Wrench, Plus, LayoutList, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CustomDialog as Dialog,
  CustomDialogContent as DialogContent,
  CustomDialogClose as DialogClose,
  CustomDialogTitle as DialogTitle,
  CustomDialogTrigger as DialogTrigger,
} from "@/components/ui/custom-dialog";
import { StarRating } from "@/components/StarRating";

export default function PrecificacaoServicosUnitarioPage() {
  const [exclusaoId, setExclusaoId] = useState<number | null>(null);
  const { toast } = useToast();
  const [calculando, setCalculando] = useState(false);
  const [editando, setEditando] = useState<number | false>(false);
  const [precificacoesSalvas, setPrecificacoesSalvas] = useState<any[]>([]);
  const [location, navigate] = useLocation();
  const [servicoCarregado, setServicoCarregado] = useState<{id: string, nome: string, valorCusto: number} | null>(null);

  // Estados para paginação e filtragem
  const [filtro, setFiltro] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [itensPorPagina, setItensPorPagina] = useState(5);
  const [precificacoesFiltradas, setPrecificacoesFiltradas] = useState<any[]>([]);

  // Estados para gerenciamento de custos
  const [custosSelecionados, setCustosSelecionados] = useState<any[]>([]);
  const [custosTemporarios, setCustosTemporarios] = useState<any[]>([]);
  const [abaCustoAtiva, setAbaCustoAtiva] = useState<"manual" | "buscar">("manual");
  const [filtroCustos, setFiltroCustos] = useState("");
  const [custosFiltrados, setCustosFiltrados] = useState<any[]>([]);
  const [nomeCustoManual, setNomeCustoManual] = useState("");
  const [custoAdicional, setCustoAdicional] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Estados para pesquisa de serviços
  const [servicosFiltrados, setServicosFiltrados] = useState<any[]>([]);
  const [showServicoDropdown, setShowServicoDropdown] = useState(false);
  const servicoDropdownRef = useRef<HTMLDivElement>(null);

  // Dados de exemplo para pesquisa de serviços
  const servicosOriginais = [
    { 
      id: "S001", 
      nome: "Instalação de Sistema", 
      valorCusto: 80,
      margem: 25, // Margem específica para este serviço
      custos: [
        { id: 101, nome: "Software de configuração", valor: 120 },
        { id: 102, nome: "Suporte remoto", valor: 50 }
      ]
    },
    { 
      id: "S002", 
      nome: "Manutenção de Computador", 
      valorCusto: 60,
      margem: 30, // Margem específica para este serviço
      custos: [
        { id: 103, nome: "Peças de reposição básicas", valor: 85 }
      ]
    },
    { 
      id: "S003", 
      nome: "Consultoria de TI", 
      valorCusto: 150,
      margem: 35, // Margem específica para este serviço
      custos: [
        { id: 104, nome: "Licença de análise", valor: 200 },
        { id: 105, nome: "Elaboração de relatório", valor: 100 }
      ]
    },
    { 
      id: "S004", 
      nome: "Desenvolvimento de Aplicativo", 
      valorCusto: 120,
      margem: 40, // Margem específica para este serviço
      custos: [
        { id: 106, nome: "Hospedagem", valor: 45 },
        { id: 107, nome: "Design UI/UX", valor: 80 }
      ]
    }
  ];

  // Função helper para exibir toast com fechamento automático
  const showToast = (
    title: string, 
    description: string, 
    variant: "default" | "destructive" = "default"
  ) => {
    toast({
      title,
      description,
      variant,
      duration: 3000, // Sempre fecha automaticamente após 3 segundos
    });
  };

  const [formValues, setFormValues] = useState({
    nomeServico: "",
    valorCusto: "",
    deslocamento: "",
    valorKm: "",
    lucroPercentual: "",
    formaPagamento: "PIX",
    parcelas: "1",
    unidade: "",
    quantidade: ""
  });

  const [resultado, setResultado] = useState<{
    valorVenda: number;
    lucroBruto: number;
    lucroLiquido: number;
    lucroPercentual: number;
    valorParcela?: number;
    custoTotal: number;
    taxaTotal: number;
    valorCusto?: number;
    custoDeslocamento?: number;
  } | null>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (servicoDropdownRef.current && !servicoDropdownRef.current.contains(event.target as Node)) {
        setShowServicoDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Verificar URL para carregamento automático
  useEffect(() => {
    console.log("Verificando URL para carregamento automático");
    // Verificar se há um ID de serviço na URL
    const url = new URL(window.location.href);
    const servicoId = url.searchParams.get("servicoId");

    // Se já tiver um serviço carregado ou não tem ID na URL, não faz nada
    if (servicoCarregado || !servicoId) {
      console.log("Nenhum serviço a carregar da URL ou serviço já carregado");
      return;
    }

    // Buscar serviço pelo ID
    const servico = servicosOriginais.find(s => s.id === servicoId);
    if (servico) {
      handleServicoSelect(servico);
    }
  }, [servicoCarregado]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;

    if (id === 'nomeServico') {
      // Limpar o resultado e resetar modo de edição com qualquer alteração do campo de busca
      setResultado(null);
      setEditando(false);

      if (value === '') {
        // Se o campo de busca for completamente apagado, limpar todos os campos
        setServicoCarregado(null);
        setCustosSelecionados([]);
        // Resetar formulário para os valores iniciais
        setFormValues({
          nomeServico: '',
          valorCusto: '',
          lucroPercentual: '',
          deslocamento: '',
          valorKm: '',
          horasTrabalhadas: '',
          formaPagamento: 'PIX',
          parcelas: '1',
          unidade: "",
          quantidade: ""
        });
        setShowServicoDropdown(false);
        return;
      }

      // Limpar valor de custo, margem e outros campos ao editar nome
      setFormValues(prev => ({ 
        ...prev, 
        [id]: value,
        valorCusto: "", // Limpar valor de custo
        lucroPercentual: "" // Limpar margem de lucro
      }));

      // Filtrar serviços
      if (value.trim()) {
        const filtered = servicosOriginais.filter(servico =>
          servico.nome.toLowerCase().includes(value.toLowerCase())
        );
        setServicosFiltrados(filtered);
        setShowServicoDropdown(true);
      } else {
        setServicosFiltrados([]);
        setShowServicoDropdown(false);
      }
      // Sempre limpar custos ao editar nome
      setCustosSelecionados([]);
      setServicoCarregado(null);
    } else {
      setFormValues(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleServicoSelect = (servico: any) => {
    // Encontrar a última precificação do serviço
    const ultimaPrecificacao = precificacoesSalvas
      .filter(p => p.servicoId === servico.id)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0];

    // Get the last pricing margin, or service margin, or default to 25%
    const margemAtual = ((ultimaPrecificacao?.lucroPercentual) || servico.margem || 25).toString();

    setFormValues(prev => ({
      ...prev,
      nomeServico: servico.nome,
      valorCusto: servico.valorCusto.toString(),
      lucroPercentual: margemAtual
    }));

    // Carregar custos do serviço
    if (servico.custos) {
      setCustosSelecionados(servico.custos);
    } else {
      setCustosSelecionados([]);
    }

    setShowServicoDropdown(false);
    setServicoCarregado(servico);

    // Resetar editando
    setEditando(false);
  };

  const handleSelectChange = (id: string, value: string) => {
    setFormValues(prev => ({ ...prev, [id]: value }));
  };

  // Funções para gerenciamento de custos
  const formatarValorExibicao = (valor: number) => {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  };

  // Inicializar custos temporários ao abrir o modal
  const inicializarCustosTemporarios = () => {
    setCustosTemporarios([...custosSelecionados]);
  };

  // Confirmar custos temporários (ao clicar em Confirmar)
  const confirmarCustos = () => {
    // Salva os custos (mesmo que seja lista vazia) e fecha o modal
    setCustosSelecionados([...custosTemporarios]);
    setDialogOpen(false); // Fecha o modal
  };

  // Cancelar edição de custos (ao clicar no X)
  const cancelarEdicaoCustos = () => {
    setCustosTemporarios([]);
  };

  // Adicionar custo da lista de filtrados (vai para a lista temporária)
  const adicionarCusto = (custo: any) => {
    if (!custosTemporarios.some(c => c.id === custo.id)) {
      setCustosTemporarios([...custosTemporarios, custo]);
      setFiltroCustos("");
      setCustosFiltrados([]);
    }
  };

  // Adicionar custo digitado manualmente (vai para a lista temporária)
  const adicionarCustoManual = () => {
    if (custoAdicional?.trim()) {
      const valor = Number(custoAdicional.replace(",", "."));

      if (isNaN(valor) || valor <= 0) {
        toast({
          title: "Valor inválido",
          description: "Digite um valor válido maior que zero",
          variant: "destructive"
        });
        return;
      }

      const nomeCusto = nomeCustoManual.trim() 
        ? nomeCustoManual 
        : `Custo adicional R$ ${valor.toFixed(2)}`;

      const novoCusto = {
        id: Date.now(), // ID único baseado no timestamp
        nome: nomeCusto,
        valor
      };

      setCustosTemporarios([...custosTemporarios, novoCusto]);

      // Limpar os campos
      setCustoAdicional("");
      setNomeCustoManual("");
    } else {
      toast({
        title: "Campo obrigatório",
        description: "Digite um valor para o custo",
        variant: "destructive"
      });
    }
  };

  // Remover custo da lista temporária
  const removerCusto = (id: number) => {
    setCustosTemporarios(custosTemporarios.filter(c => c.id !== id));
  };

  // Filtrar custos para a busca
  const handleCustosBusca = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setFiltroCustos(valor);

    if (valor.trim()) {
      // Simular busca de custos (em um ambiente real, seria uma chamada à API)
      const custosFake = [
        { id: 1, nome: "Taxa de visita técnica", valor: 35.0 },
        { id: 2, nome: "Licença de software", valor: 75.0 },
        { id: 3, nome: "Seguro de transporte", valor: 25.0 },
        { id: 4, nome: "Aluguel de equipamento", valor: 120.0 },
        { id: 5, nome: "Hospedagem sistema", valor: 45.0 }
      ];

      const resultados = custosFake.filter(custo => 
        custo.nome.toLowerCase().includes(valor.toLowerCase())
      );
      setCustosFiltrados(resultados);
    } else {
      setCustosFiltrados([]);
    }
  };

  const handleCalcular = () => {
    try {
      setCalculando(true);

      // Validação do valor de custo
      if (!formValues.valorCusto || isNaN(Number(formValues.valorCusto.replace(",", ".")))) {
        toast({
          title: "Campo obrigatório",
          description: "O valor de custo precisa ser um número válido",
          variant: "destructive"
        });
        setCalculando(false);
        return;
      }

      // Validação da margem de lucro
      if (!formValues.lucroPercentual || isNaN(Number(formValues.lucroPercentual.replace(",", ".")))) {
        toast({
          title: "Campo obrigatório",
          description: "A margem de lucro precisa ser um número válido",
          variant: "destructive"
        });
        setCalculando(false);
        return;
      }

      // Converter valores para números
      const valorCusto = Number(formValues.valorCusto.replace(",", "."));
      const deslocamento = Number(formValues.deslocamento.replace(",", ".") || "0");
      const valorKm = Number(formValues.valorKm.replace(",", ".") || "0");
      const lucroPercentual = Number(formValues.lucroPercentual.replace(",", "."));
      const parcelas = Number(formValues.parcelas || "1");

      // Calcular total de custos adicionais
      const totalCustosAdicionais = custosSelecionados.reduce((acc, custo) => acc + custo.valor, 0);
      const custoDeslocamento = deslocamento * valorKm;

      // Calcular valor total incluindo custos adicionais
      const valorCustoComAdicionais = valorCusto + totalCustosAdicionais;

      // Calcular preço usando a função do serviço
      const resultado = calcularPrecoServico({
        valorCusto: valorCustoComAdicionais,
        deslocamento,
        valorKm,
        lucroPercentual,
        formaPagamento: formValues.formaPagamento,
        parcelas,
        custos: custosSelecionados.map(c => c.valor)
      });

      // Adicionar valor de custo original ao resultado
      const resultadoComValorCusto = {
        ...resultado,
        valorCusto, // Guardar o valor de custo original
        custoDeslocamento
      };

      setResultado(resultadoComValorCusto);
      setCalculando(false);
    } catch (error) {
      console.error("Erro ao calcular preço:", error);
      toast({
        title: "Erro no cálculo",
        description: "Não foi possível calcular o preço. Verifique os dados inseridos.",
        variant: "destructive"
      });
      setCalculando(false);
    }
  };

  const handleSalvarCalculoSuccess = () => {
    if (!formValues.nomeServico.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Preencha o nome do serviço para salvar a precificação",
        variant: "destructive"
      });
      return;
    }

    if (!resultado) return;

    if (editando) {
      // Atualizar precificação existente
      const index = precificacoesSalvas.findIndex(p => p.id === editando);
      if (index !== -1) {
        // Adicionar número de parcelas quando for cartão de crédito
        const parcelas = formValues.formaPagamento === "CARTAO_CREDITO" 
          ? parseInt(formValues.parcelas)
          : undefined;

        const novasPrecificacoes = [...precificacoesSalvas];
        const precificacaoOriginal = precificacoesSalvas[index];
        novasPrecificacoes[index] = {
          id: editando,
          data: new Date(),
          nomeServico: formValues.nomeServico,
          servicoId: precificacaoOriginal.servicoId || servicoCarregado?.id || null, // Manter o ID do serviço
          deslocamento: Number(formValues.deslocamento || 0),
          valorKm: Number(formValues.valorKm || 0),
          formaPagamento: formValues.formaPagamento,
          parcelas: parcelas,
          custos: custosSelecionados, // Atualizar custos adicionais
          ...resultado
        };
        setPrecificacoesSalvas(novasPrecificacoes);
        setEditando(false);

        toast({
          title: "Precificação atualizada",
          description: "Os dados da precificação foram atualizados com sucesso",
        });
      }
    } else {
      // Adicionar nova precificação
      // Adicionar número de parcelas quando for cartão de crédito
      const parcelas = formValues.formaPagamento === "CARTAO_CREDITO" 
        ? parseInt(formValues.parcelas) 
        : undefined;

      const novaPrecificacao = {
        id: Date.now(), // ID único baseado no timestamp
        data: new Date(),
        nomeServico: formValues.nomeServico,
        servicoId: servicoCarregado?.id || null, // Salvar o ID do serviço para filtrar
        deslocamento: Number(formValues.deslocamento || 0),
        valorKm: Number(formValues.valorKm || 0),
        formaPagamento: formValues.formaPagamento,
        parcelas: parcelas,
        custos: custosSelecionados, // Salvar os custos adicionais
        ...resultado
      };

      // Adicionar à lista de precificações
      setPrecificacoesSalvas([...precificacoesSalvas, novaPrecificacao]);

      // Se um serviço estiver carregado, atualize seu valor de custo
      if (servicoCarregado) {
        // Atualizar o valor de custo do serviço no sistema com base na nova precificação
        const valorCustoOriginal = resultado.valorCusto || 0;
        setServicoCarregado({
          ...servicoCarregado,
          valorCusto: valorCustoOriginal
        });

        toast({
          title: "Cálculo salvo com sucesso",
          description: "Esta é agora a precificação atual do serviço",
        });
      } else {
        toast({
          title: "Cálculo salvo com sucesso",
          description: "A precificação foi registrada no sistema",
        });
      }
    }

    // Limpar o formulário
    setFormValues({
      nomeServico: "",
      valorCusto: "",
      deslocamento: "",
      valorKm: "",
      lucroPercentual: "",
      formaPagamento: "PIX",
      parcelas: "1",
      unidade: "",
      quantidade: ""
    });
    setCustosSelecionados([]); // Limpar custos selecionados
    setServicoCarregado(null); // Limpar serviço carregado
    setEditando(false); // Sair do modo de edição
    setResultado(null); // Limpar resultado do cálculo

    // Verificar se veio de uma rota específica para redirecionar de volta
    const url = new URL(window.location.href);
    const servicoId = url.searchParams.get("servicoId");

    if (servicoId) {
      // Se veio da página de serviços, redirecionar de volta
      toast({
        title: "Redirecionando",
        description: "Voltando para a lista de serviços",
      });

      // Redirecionar após pequeno delay para o toast ser exibido
      setTimeout(() => {
        navigate("/precificacao/servicos");
      }, 1500);
    }
  };

  const handleEditarPrecificacao = (precificacao: any) => {
    // Preencher formulário com dados existentes
    console.log("Editando precificação:", precificacao);

    // Usar o valor de custo original se disponível, ou usar o valor total como fallback
    const valorCustoOriginal = precificacao.valorCusto || 0;

    setFormValues({
      nomeServico: precificacao.nomeServico,
      valorCusto: valorCustoOriginal.toString(),
      deslocamento: precificacao.deslocamento?.toString() || "0",
      valorKm: precificacao.valorKm?.toString() || "0",
      lucroPercentual: typeof precificacao.lucroPercentual === 'number' 
        ? precificacao.lucroPercentual.toFixed(2) 
        : precificacao.lucroPercentual?.toString() || "0",
      formaPagamento: precificacao.formaPagamento,
      parcelas: precificacao.parcelas?.toString() || "1",
      unidade: "", // Add unit and quantity fields
      quantidade: "" // Add unit and quantity fields
    });

    // Carregar os custos adicionais
    if (precificacao.custos && Array.isArray(precificacao.custos)) {
      setCustosSelecionados(precificacao.custos);
    }

    setResultado({
      valorVenda: precificacao.valorVenda,
      lucroBruto: precificacao.lucroBruto,
      lucroLiquido: precificacao.lucroLiquido,
      lucroPercentual: precificacao.lucroPercentual,
      custoTotal: precificacao.custoTotal,
      taxaTotal: precificacao.taxaTotal,
      valorParcela: precificacao.valorParcela,
      valorCusto: valorCustoOriginal,
      custoDeslocamento: precificacao.custoDeslocamento
    });

    setEditando(precificacao.id);

    // Rolar para o topo da página
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExcluirPrecificacao = () => {
    if (exclusaoId !== null) {
      // Excluir precificação pelo ID
      setPrecificacoesSalvas(prev => 
        prev.filter(p => p.id !== exclusaoId)
      );

      toast({
        title: "Precificação excluída",
        description: "A precificação foi excluída com sucesso"
      });

      setExclusaoId(null);
    }
  };

  const handleBusca = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setFiltro(valor);
  };

  // Filtrar precificações ao alterar critérios de busca
  useEffect(() => {
    // Iniciar com todas as precificações
    let filtradas = [...precificacoesSalvas];

    // Filtrar pelo ID do serviço se tiver um carregado
    if (servicoCarregado) {
      filtradas = filtradas.filter(p => p.servicoId === servicoCarregado.id);
    }

    // Filtrar por nome do serviço
    if (filtro.trim()) {
      filtradas = filtradas.filter(p => 
        p.nomeServico.toLowerCase().includes(filtro.toLowerCase())
      );
    }

    // Ordenar por data mais recente
    filtradas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    setPrecificacoesFiltradas(filtradas);
    // Resetar página ao filtrar
    setPaginaAtual(0);
  }, [precificacoesSalvas, filtro, servicoCarregado]);

  // Carregar serviço da URL, se houver
  useEffect(() => {
    const url = new URL(window.location.href);
    const servicoId = url.searchParams.get("servicoId");
    const servicoNome = url.searchParams.get("servicoNome");
    const servicoValorCusto = url.searchParams.get("servicoValorCusto");

    if (servicoId && servicoNome && servicoValorCusto) {
      console.log("Carregando serviço da URL:", servicoId, servicoNome, servicoValorCusto);

      // Carregar serviço
      setServicoCarregado({
        id: servicoId,
        nome: servicoNome,
        valorCusto: Number(servicoValorCusto)
      });

      // Preencher o formulário
      setFormValues(prev => ({
        ...prev,
        nomeServico: servicoNome,
        valorCusto: servicoValorCusto
      }));

      // Filtrar precificações desse serviço
      const filtradas = precificacoesSalvas.filter(p => 
        p.servicoId === servicoId
      );
      setPrecificacoesFiltradas(filtradas);
    } else {
      console.log("Nenhum serviço a carregar da URL ou serviço já carregado");
    }
  }, [location]);

  return (
    <div className="space-y-6">
      <div className="pt-5 sm:pt-0">
        <div className="flex flex-row items-start justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              <span className="hidden sm:inline">Precificação Unitária - Serviço</span>
              <span className="inline sm:hidden">Precificação Unitária - Serviço</span>
            </h2>
            <p className="text-gray-500 text-sm sm:text-base -mt-1">
              Calcule o preço ideal para<br className="hidden xs:inline sm:hidden" /> um serviço
            </p>
          </div>
          <div className="flex items-start pt-1">
            <Link href="/precificacao/servicos">
              <Button variant="outline" className="flex items-center whitespace-nowrap">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Dados do Serviço</CardTitle>
                <CardDescription>
                  Informe os dados para cálculo do preço
                </CardDescription>
              </div>
              {editando && (
                <div className="bg-teal-100 text-teal-800 px-3 py-1 rounded-md text-sm font-medium">
                  Editando
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nomeServico">Nome do Serviço</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="nomeServico"
                  placeholder="Pesquisar serviço..."
                  value={formValues.nomeServico}
                  onChange={handleInputChange}
                  onFocus={() => setShowServicoDropdown(true)}
                  className="pl-8"
                />

                {/* Dropdown de resultados da busca */}
                {showServicoDropdown && servicosFiltrados.length > 0 && (
                  <div 
                    ref={servicoDropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
                    style={{ marginTop: "0.5rem" }}
                  >
                    {servicosFiltrados.map(servico => (
                      <div
                        key={servico.id}
                        className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleServicoSelect(servico)}
                      >
                        <div>
                          <p className="font-medium text-gray-900">{servico.nome}</p>
                          <p className="text-sm text-gray-500">
                            Valor por hora: {formatarMoeda(servico.valorCusto)}
                            {servico.custos?.length > 0 && ` • ${servico.custos.length} Custo${servico.custos.length > 1 ? 's' : ''}: ${formatarMoeda(servico.custos.reduce((acc, custo) => acc + custo.valor, 0))}`}
                            {` • Margem Atual: ${servico.margem || 25}%`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleServicoSelect(servico);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade</Label>
                <Select
                  value={formValues.unidade}
                  onValueChange={(value) => handleSelectChange("unidade", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper" 
                    side="bottom" 
                    sideOffset={4}
                    className="max-h-[180px] overflow-y-auto"
                  >
                    <SelectItem value="HORA">Hora</SelectItem>
                    <SelectItem value="DIA">Dia</SelectItem>
                    <SelectItem value="MES">Mês</SelectItem>
                    <SelectItem value="SERVICO">Serviço</SelectItem>
                    <SelectItem value="PACOTE">Pacote</SelectItem>
                    <SelectItem value="SESSAO">Sessão</SelectItem>
                    <SelectItem value="M2">Metro Quadrado (M²)</SelectItem>
                    <SelectItem value="KM">Quilômetro (KM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantidade">
                  {formValues.unidade === "HORA" ? "Tempo (HH:mm:ss)" : "Quantidade"}
                </Label>
                <Input
                  id="quantidade"
                  type={formValues.unidade === "HORA" ? "time" : "number"}
                  step={formValues.unidade === "HORA" ? "1" : "any"}
                  placeholder={formValues.unidade === "HORA" ? "00:00:00" : "0"}
                  value={formValues.quantidade}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valorCusto">Valor de Custo (R$)</Label>
                <Input
                  id="valorCusto"
                  placeholder="0,00"
                  value={formValues.valorCusto}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lucroPercentual">Margem de Lucro (%)</Label>
                <Input
                  id="lucroPercentual"
                  placeholder="Percentual de lucro"
                  value={formValues.lucroPercentual}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="deslocamento">Deslocamento (km)</Label>
                <Input
                  id="deslocamento"
                  placeholder="0"
                  value={formValues.deslocamento}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valorKm">Valor por km (R$)</Label>
                <Input
                  id="valorKm"
                  placeholder="0,00"
                  value={formValues.valorKm}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="custoAdicional">Custos Adicionais (R$)</Label>
                <Input
                  id="custoAdicional"
                  placeholder="0,00"
                  value={custosSelecionados.length > 0 ? 
                    formatarValorExibicao(custosSelecionados.reduce((acc: number, custo: any) => acc + custo.valor, 0)) : 
                    "0,00"
                  }
                  readOnly
                />
              </div>
              <div className="flex items-end">
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  if (!open) {
                    // Quando fecha o modal sem confirmar, descarta as alterações
                    setCustosTemporarios([]);
                  }
                  setDialogOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button 
                      type="button"
                      onClick={inicializarCustosTemporarios}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      <Calculator className="mr-2 h-4 w-4" />
                      Gerenciar Custos
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[90vw] max-w-[360px] sm:max-w-md p-0 overflow-hidden border-none shadow-xl h-[530px] sm:h[470px] flex flex-col" style={{borderRadius: '0.65rem'}}>
                    <div className="bg-teal-600 px-5 py-2 text-white" style={{borderTopLeftRadius: '0.65rem', borderTopRightRadius: '0.65rem'}}>
                      <div className="flex items-center justify-between mb-1">
                        <DialogTitle className="text-base font-semibold text-white">Custos Adicionais</DialogTitle>
                        <DialogClose className="rounded-full bg-white/20 hover:bg-white/30 p-1.5" onClick={cancelarEdicaoCustos}>
                          <X className="h-3.5 w-3.5 text-white" />
                        </DialogClose>
                      </div>

                      {/* Totalizador no topo */}
                      <div className="bg-white/10 rounded-md p-2 mb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-white/80">Total de custos:</span>
                          <span className="text-xl font-bold text-white">
                            {formatarValorExibicao(custosTemporarios.reduce((acc: number, custo: any) => acc + custo.valor, 0))}
                          </span>
                        </div>
                        <div className="text-xs text-white/60 mt-1">
                          {custosTemporarios.length} {custosTemporarios.length === 1 ? "item" : "itens"} adicionados
                        </div>
                      </div>

                      {/* Botões de controle */}
                      <div className="flex gap-2 mb-1">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          className={`flex-1 ${abaCustoAtiva === "manual" ? "bg-white text-teal-700" : "text-white hover:bg-white/10"} rounded-full h-8`}
                          onClick={() => setAbaCustoAtiva("manual")}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Novo
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          className={`flex-1 ${abaCustoAtiva === "buscar" ? "bg-white text-teal-700" : "text-white hover:bg-white/10"} rounded-full h-8`}
                          onClick={() => setAbaCustoAtiva("buscar")}
                        >
                          <Search className="h-3.5 w-3.5 mr-1.5" />
                          Buscar
                        </Button>
                      </div>
                    </div>

                    {/* Conteúdo do modal */}
                    <div className="p-2 bg-white flex-1 overflow-hidden">
                      {abaCustoAtiva === "buscar" && (
                        <div className="space-y-4">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Buscar custos cadastrados..."
                              className="pl-9 border-gray-300 rounded-md h-9"
                              value={filtroCustos}
                              onChange={handleCustosBusca}
                            />

                            {/* Dropdown de resultados da busca - só aparece quando há texto digitado */}
                            {filtroCustos && (
                              <div className="absolute top-full left-0 right-0 mt-1 border border-gray-200 rounded-lg overflow-hidden shadow-lg bg-white z-50 h-[120px]">
                                {custosFiltrados.length > 0 ? (
                                  <div className="divide-y divide-gray-100 h-full overflow-y-auto">
                                    {custosFiltrados.map(custo => (
                                      <div 
                                        key={custo.id}
                                        className="flex items-center justify-between px-2 py-1 hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => adicionarCusto(custo)}
                                      >
                                        <div className="overflow-hidden">
                                          <p className="text-sm font-medium text-gray-700 truncate">{custo.nome}</p>
                                          <p className="text-xs text-gray-500">{formatarValorExibicao(custo.valor)}</p>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 rounded-full text-teal-600 hover:bg-teal-50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            adicionarCusto(custo);
                                          }}
                                        >
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center h-full text-center text-sm text-gray-500">
                                    Nenhum resultado para "{filtroCustos}"
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {abaCustoAtiva === "manual" && (
                        <div className="space-y-2 h-[150px] md:h-[94px]">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-0.5">
                                Nome do custo
                              </label>
                              <Input
                                value={nomeCustoManual}
                                onChange={(e) => setNomeCustoManual(e.target.value)}
                                placeholder="Descreva o custo"
                                className="border-gray-300 rounded-md h-9"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-0.5">
                                Valor (R$)
                              </label>
                              <Input
                                id="custoAdicional"
                                placeholder="0,00"
                                value={custoAdicional}
                                onChange={(e) => setCustoAdicional(e.target.value)}
                                className="border-gray-300 rounded-md h-9"
                              />
                            </div>
                          </div>

                          <Button 
                            type="button" 
                            className="bg-teal-600 hover:bg-teal-700 text-white w-full h-8"
                            onClick={adicionarCustoManual}
                          >
                            Adicionar custo
                          </Button>
                        </div>
                      )}

                      {/* Lista de custos adicionados */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-sm font-medium text-gray-700">Custos adicionados</h3>
                          {custosTemporarios.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-red-500 p-0"
                              onClick={() => setCustosTemporarios([])}
                            >
                              Limpar todos
                            </Button>
                          )}
                        </div>

                        {custosTemporarios.length > 0 ? (
                          <div className={`space-y-1 overflow-y-auto pr-1 ${abaCustoAtiva === "buscar" ? "h-[185px]" : "h-[170px] md:h-[140px]"}`}>
                            {custosTemporarios.map(custo => (
                              <div key={custo.id} className="flex items-center justify-between bg-gray-50 py-1 px-3 rounded-md border border-gray-200">
                                <div className="overflow-hidden mr-2">
                                  <p className="text-sm font-medium text-gray-700 truncate">{custo.nome}</p>
                                  <p className="text-xs text-teal-700 font-medium">{formatarValorExibicao(custo.valor)}</p>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50"
                                  onClick={() => removerCusto(custo.id)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={`flex justify-center items-center bg-gray-50 rounded-md border border-dashed border-gray-200 ${abaCustoAtiva === "buscar" ? "h-[185px]" : "h-[170px] md:h-[140px]"}`}>
                            <p className="text-xs text-gray-500">Nenhum custo adicionado</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rodapé */}
                    <div className="border-t py-2 px-3 bg-gray-50 rounded-b-xl">
                      <Button 
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                        onClick={confirmarCustos}
                      >
                        Confirmar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                  <Select 
                    value={formValues.formaPagamento}
                    onValueChange={(value) => handleSelectChange("formaPagamento", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper" 
                      side="bottom" 
                      sideOffset={4}
                      className="max-h-[180px] overflow-y-auto"
                    >
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="DINHEIRO">DINHEIRO</SelectItem>
                      <SelectItem value="BOLETO">BOLETO</SelectItem>
                      <SelectItem value="CARTAO_CREDITO">CARTÃO DE CRÉDITO</SelectItem>
                      <SelectItem value="CARTAO_DEBITO">CARTÃO DE DÉBITO</SelectItem>
                      <SelectItem value="TRANSFERENCIA">TRANSFERÊNCIA BANCÁRIA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formValues.formaPagamento === "CARTAO_CREDITO" ? (
                  <div className="space-y-2">
                    <Label htmlFor="parcelas">Parcelas</Label>
                    <Select 
                      value={formValues.parcelas} 
                      onValueChange={(value) => handleSelectChange("parcelas", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper" 
                        side="bottom" 
                        sideOffset={4}
                        className="max-h-[180px] overflow-y-auto"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}x
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2 opacity-50">
                    <Label htmlFor="parcelas">Parcelas</Label>
                    <Select disabled value="1">
                      <SelectTrigger>
                        <SelectValue placeholder="Não aplicável" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper" 
                        side="bottom" 
                        sideOffset={4}
                        className="max-h-[180px] overflow-y-auto"
                      >
                        <SelectItem value="1">Não aplicável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <Button 
                  onClick={handleCalcular} 
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={calculando}
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  {calculando ? "Calculando..." : "Calcular Preço"}
                </Button>
              </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
            <CardDescription>
              Preço calculado com base nas informações fornecidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Custo Total</p>
                  <p className="text-2xl font-bold">{resultado ? formatarMoeda(resultado.custoTotal) : "R$ 0,00"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Preço de Venda</p>
                  <p className="text-2xl font-bold text-teal-600">{resultado ? formatarMoeda(resultado.valorVenda) : "R$ 0,00"}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Lucro Bruto</p>
                  <p className="text-xl font-semibold">{resultado ? formatarMoeda(resultado.lucroBruto) : "R$ 0,00"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Lucro Líquido</p>
                  <p className="text-xl font-semibold">{resultado ? formatarMoeda(resultado.lucroLiquido) : "R$ 0,00"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Margem de Lucro Líquida</p>
                  <p className="text-xl font-semibold">{resultado ? `${resultado.lucroPercentual}%` : "0%"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Taxas</p>
                  <p className="text-xl font-semibold">{resultado ? formatarMoeda(resultado.taxaTotal) : "R$ 0,00"}</p>
                </div>
              </div>

              {resultado && resultado.custoDeslocamento !== undefined && resultado.custoDeslocamento > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Custo de Deslocamento</p>
                  <p className="text-xl font-semibold">{formatarMoeda(resultado.custoDeslocamento)}</p>
                </div>
              )}

              {parseInt(formValues.parcelas) > 1 && formValues.formaPagamento === "CARTAO_CREDITO" && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Valor da Parcela</p>
                    <p className="text-2xl font-bold text-teal-600">
                      {formValues.parcelas}x de {resultado ? formatarMoeda(resultado.valorParcela || 0) : "R$ 0,00"}
                    </p>
                  </div>
                </>
              )}

              <div className="mt-6 space-y-2">
                <Button 
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white" 
                  disabled={!resultado}
                  onClick={handleSalvarCalculoSuccess}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {editando ? "Atualizar Precificação" : "Salvar Precificação"}
                </Button>

                {editando && (
                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      setEditando(false);
                      setFormValues({
                        nomeServico: "",
                        valorCusto: "",
                        deslocamento: "",
                        valorKm: "",
                        lucroPercentual: "",
                        formaPagamento: "PIX",
                        parcelas: "1",
                        unidade: "",
                        quantidade: ""
                      });
                      setResultado(null);
                      setCustosSelecionados([]);
                      toast({
                        title: "Edição cancelada",
                        description: "A operação de edição foi cancelada"
                      });
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar Edição
                  </Button>
                )}
              </div>


            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Precificações Salvas</CardTitle>
          <CardDescription>
            {servicoCarregado 
              ? `Histórico de precificações para o serviço: ${servicoCarregado.nome}` 
              : "Histórico de precificações salvas para serviços"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative flex pt-1">
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                placeholder="Buscar por nome do serviço..."
                value={filtro}
                onChange={handleBusca}
                className="pl-8 w-full"
              />
            </div>
          </div>

          {precificacoesFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
              <Wrench className="h-12 w-12 text-gray-400" strokeWidth={1.5} />
              <h3 className="text-lg font-medium">Nenhum cálculo registrado</h3>
              <p className="text-gray-500">
                Utilize o formulário acima para calcular e salvar precificações
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Custo Total</TableHead>
                    <TableHead>Preço Venda</TableHead>
                    <TableHead>Margem Líquida</TableHead>
                    <TableHead>ROI</TableHead>
                    <TableHead>Forma Pagamento</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {precificacoesFiltradas
                    .slice(paginaAtual * itensPorPagina, paginaAtual * itensPorPagina + itensPorPagina)
                    .map((precificacao) => (
                      <TableRow key={precificacao.id}>
                        <TableCell>{new Date(precificacao.data).toLocaleDateString()}</TableCell>
                        <TableCell>{precificacao.nomeServico || "Serviço sem nome"}</TableCell>
                        <TableCell>{formatarMoeda(precificacao.valorCusto || 0)}</TableCell>
                        <TableCell>{formatarMoeda(precificacao.custoTotal || 0)}</TableCell>
                        <TableCell>{formatarMoeda(precificacao.valorVenda)}</TableCell>
                        <TableCell>{precificacao.lucroPercentual.toFixed(2)}%</TableCell>
                        <TableCell>
                          {precificacao.custoTotal > 0 
                            ? (precificacao.valorVenda / precificacao.custoTotal).toFixed(2) 
                            : "0,00"}
                        </TableCell>
                        <TableCell>
                          {precificacao.formaPagamento === "PIX" && "PIX"}
                          {precificacao.formaPagamento === "DINHEIRO" && "Dinheiro"}
                          {precificacao.formaPagamento === "BOLETO" && "Boleto"}
                          {precificacao.formaPagamento === "CARTAO_DEBITO" && "Cartão de Débito"}
                          {precificacao.formaPagamento === "CARTAO_CREDITO" && (
                            <>Cartão de Crédito {precificacao.parcelas && precificacao.parcelas > 1 ? `(${precificacao.parcelas}x)` : ""}</>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEditarPrecificacao(precificacao)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => setExclusaoId(precificacao.id)}
                                  type="button"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center">
                                    <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                                    Confirmar exclusão
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir esta precificação? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setExclusaoId(null)}>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    onClick={handleExcluirPrecificacao}
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginação simplificada conforme design */}
          <div className="flex items-center justify-between mt-4">
            <div>
              <Select
                value={itensPorPagina.toString()}
                onValueChange={(value) => {
                  setItensPorPagina(Number(value));
                  setPaginaAtual(0);
                }}
              >
                <SelectTrigger className="h-10 w-[70px]">
                  <SelectValue placeholder="5" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPaginaAtual(prev => Math.max(0, prev - 1))}
                disabled={paginaAtual === 0}
                className="h-10 w-10 rounded-md"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-1">
                {precificacoesFiltradas.length > 0 
                  ? `${paginaAtual + 1}/${Math.ceil(precificacoesFiltradas.length / itensPorPagina)}`
                  : "0/0"
                }
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPaginaAtual(prev => prev + 1)}
                disabled={precificacoesFiltradas.length === 0 || (paginaAtual + 1) * itensPorPagina >= precificacoesFiltradas.length}
                className="h-10 w-10 rounded-md"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}