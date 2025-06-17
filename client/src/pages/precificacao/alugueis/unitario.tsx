import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calcularPrecoAluguel } from "@/services/calculoService";
import { ArrowLeft, Save, Calculator, Pencil, Trash, X, AlertTriangle, Search, SearchX, ChevronLeft, ChevronRight, ShoppingBag, Plus, PlusCircle, CircleDollarSign, ChevronsLeft, ChevronsRight, MoreHorizontal, Trash2 } from "lucide-react";
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

export default function PrecificacaoAlugueisUnitarioPage() {
  const [exclusaoId, setExclusaoId] = useState<number | null>(null);
  const { toast } = useToast();
  const [calculando, setCalculando] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [precificacoesSalvas, setPrecificacoesSalvas] = useState<any[]>([]);
  const [location, navigate] = useLocation();
  const [equipamentoCarregado, setEquipamentoCarregado] = useState<{id: string, nome: string, valorEquipamento: number} | null>(null);

  // Estados para lista de custos
  const [custosSelecionados, setCustosSelecionados] = useState<any[]>([]);
  const [custosTemporarios, setCustosTemporarios] = useState<any[]>([]);
  const [filtroCustos, setFiltroCustos] = useState("");
  const [custosFiltrados, setCustosFiltrados] = useState<any[]>([]);
  const [abaCustoAtiva, setAbaCustoAtiva] = useState<"buscar" | "manual">("buscar");
  const [nomeCustoManual, setNomeCustoManual] = useState("");

  // Lista de custos simulados
  const custosDisponiveis = [
    { id: 1, nome: "Instalação", valor: 150.00 },
    { id: 2, nome: "Manutenção Preventiva", valor: 120.00 },
    { id: 3, nome: "Seguro", valor: 85.00 },
    { id: 4, nome: "Treinamento", valor: 200.00 },
    { id: 5, nome: "Suporte Técnico", valor: 100.00 },
    { id: 6, nome: "Taxa de Entrega", valor: 70.00 },
    { id: 7, nome: "Garantia Estendida", valor: 95.00 },
    { id: 8, nome: "Configuração", valor: 110.00 },
    { id: 9, nome: "Software Adicional", valor: 180.00 },
    { id: 10, nome: "Acessórios", valor: 75.00 }
  ];

  // Dados de exemplo para pesquisa de equipamentos
  const equipamentosOriginais = [
    { 
      id: "E001", 
      nome: "Projetor 4K", 
      valorEquipamento: 4500,
      custos: [
        { id: 1, nome: "Instalação", valor: 150.00 },
        { id: 6, nome: "Taxa de Entrega", valor: 70.00 }
      ]
    },
    { 
      id: "E002", 
      nome: "Notebook Profissional i7", 
      valorEquipamento: 6800,
      custos: [
        { id: 5, nome: "Suporte Técnico", valor: 100.00 },
        { id: 9, nome: "Software Adicional", valor: 180.00 }
      ]
    },
    { 
      id: "E003", 
      nome: "Impressora Multifuncional Laser", 
      valorEquipamento: 3200,
      custos: [
        { id: 2, nome: "Manutenção Preventiva", valor: 120.00 }
      ]
    },
    { 
      id: "E004", 
      nome: "Drone DJI Profissional", 
      valorEquipamento: 12000,
      custos: [
        { id: 4, nome: "Treinamento", valor: 200.00 },
        { id: 7, nome: "Garantia Estendida", valor: 95.00 }
      ]
    }
  ];

  // Estados para pesquisa de equipamentos
  const [equipamentosFiltrados, setEquipamentosFiltrados] = useState<any[]>([]);
  const [showEquipamentoDropdown, setShowEquipamentoDropdown] = useState(false);
  const equipamentoDropdownRef = useRef<HTMLDivElement>(null);

  // Estados para paginação e filtragem
  const [filtro, setFiltro] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [itensPorPagina, setItensPorPagina] = useState(5);
  const [precificacoesFiltradas, setPrecificacoesFiltradas] = useState<any[]>([]);

  const [formValues, setFormValues] = useState({
    nomeEquipamento: "",
    valorEquipamento: "",
    unidade: "",
    quantidade: "",
    frete: "",
    retornoInvestimentoMeses: "12",
    tempoContratoMeses: "12",
    lucroMensalPercentual: "",
    tipoLucro: "LIQUIDO", // Sempre usar LIQUIDO para simplicidade
    formaPagamento: "PIX",
    parcelas: "1",
    custoAdicional: ""
  });

  const [resultado, setResultado] = useState<{
    valorVenda: number;
    lucroBruto: number;
    lucroLiquido: number;
    lucroPercentual: number;
    valorParcela?: number;
    custoTotal: number;
    taxaTotal: number;
    valorEquipamento?: number;
  } | null>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (equipamentoDropdownRef.current && !equipamentoDropdownRef.current.contains(event.target as Node)) {
        setShowEquipamentoDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Verificar URL para carregamento automático
  useEffect(() => {
    console.log("Verificando URL para carregamento automático");
    // Verificar se há um ID de equipamento na URL
    const url = new URL(window.location.href);
    const equipamentoId = url.searchParams.get("equipamentoId");

    // Se já tiver um equipamento carregado ou não tem ID na URL, não faz nada
    if (equipamentoCarregado || !equipamentoId) {
      console.log("Nenhum equipamento a carregar da URL ou equipamento já carregado");
      return;
    }

    // Buscar equipamento pelo ID
    const equipamento = equipamentosOriginais.find(s => s.id === equipamentoId);
    if (equipamento) {
      handleEquipamentoSelect(equipamento);
    }
  }, [equipamentoCarregado]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;

    if (id === 'nomeEquipamento') {
      // Limpar o resultado e resetar modo de edição com qualquer alteração do campo de busca
      setResultado(null);
      setEditando(null);

      if (value === '') {
        // Se o campo de busca for completamente apagado, limpar todos os campos
        setEquipamentoCarregado(null);
        setCustosSelecionados([]);
        // Resetar formulário para os valores iniciais
        setFormValues({
          nomeEquipamento: '',
          valorEquipamento: '',
          frete: '',
          formaPagamento: 'PIX',
          parcelas: '1',
          lucroMensalPercentual: '',
          retornoInvestimentoMeses: '12',
          tempoContratoMeses: '12',
          tipoLucro: 'LIQUIDO',
          custoAdicional: '',
          unidade: '',
          quantidade: ''
        });
        setShowEquipamentoDropdown(false);
        return;
      }

      // Limpar valor e margem ao editar nome
      setFormValues(prev => ({ 
        ...prev, 
        [id]: value,
        valorEquipamento: "", // Limpar valor do equipamento
        lucroMensalPercentual: "" // Limpar margem de lucro
      }));

      // Filtrar equipamentos
      if (value.trim()) {
        const filtered = equipamentosOriginais.filter(equipamento =>
          equipamento.nome.toLowerCase().includes(value.toLowerCase())
        );
        setEquipamentosFiltrados(filtered);
        setShowEquipamentoDropdown(true);
      } else {
        setEquipamentosFiltrados([]);
        setShowEquipamentoDropdown(false);
      }
      // Sempre limpar custos ao editar nome
      setCustosSelecionados([]);
      setEquipamentoCarregado(null);
    } else {
      setFormValues(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleEquipamentoSelect = (equipamento: any) => {
    // Encontrar a última precificação do equipamento
    const ultimaPrecificacao = precificacoesSalvas
      .filter(p => p.equipamentoId === equipamento.id)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0];

    // Obter a última margem de lucro mensal, ou margem do equipamento, ou usar valor padrão
    const margemAtual = ((precificacoesSalvas.find(p => p.equipamentoId === equipamento.id)?.lucroMensalPercentual) || equipamento.margem || 5).toString();

    setFormValues(prev => ({
      ...prev,
      nomeEquipamento: equipamento.nome,
      valorEquipamento: equipamento.valorEquipamento.toString(),
      lucroMensalPercentual: margemAtual
    }));

    // Carregar custos do equipamento
    if (equipamento.custos) {
      setCustosSelecionados(equipamento.custos);
    } else {
      setCustosSelecionados([]);
    }

    setShowEquipamentoDropdown(false);
    setEquipamentoCarregado(equipamento);
  };

  const handleSelectChange = (id: string, value: string) => {
    setFormValues(prev => ({ ...prev, [id]: value }));
  };

  // Busca de custos
  const handleCustosBusca = (e: React.ChangeEvent<HTMLInputElement>) => {
    const termo = e.target.value;
    setFiltroCustos(termo);

    if (termo.trim()) {
      // Filtrar custos disponíveis que correspondem ao termo de busca
      const resultados = custosDisponiveis
        .filter(custo => custo.nome.toLowerCase().includes(termo.toLowerCase()))
        // Excluir custos já selecionados
        .filter(custo => !custosSelecionados.some(selecionado => selecionado.id === custo.id));

      setCustosFiltrados(resultados);
    } else {
      // Se o campo de busca estiver vazio, limpar os resultados
      setCustosFiltrados([]);
    }
  };

  // Inicializar custos temporários quando o modal abre
  const inicializarCustosTemporarios = () => {
    setCustosTemporarios([...custosSelecionados]);
  };

  // Confirmar custos temporários (ao clicar em Confirmar)
  // Referência para o dialógController
  const [dialogOpen, setDialogOpen] = useState(false);

  const confirmarCustos = () => {
    // Salva os custos (mesmo que seja lista vazia) e fecha o modal
    setCustosSelecionados([...custosTemporarios]);
    setDialogOpen(false); // Fecha o modal
  };

  // Cancelar edição de custos (ao clicar no X)
  const cancelarEdicaoCustos = () => {
    setCustosTemporarios([]);
  };

  // Adicionar custo da lista de filtrados (agora vai para a lista temporária)
  const adicionarCusto = (custo: any) => {
    if (!custosTemporarios.some(c => c.id === custo.id)) {
      setCustosTemporarios([...custosTemporarios, custo]);
      setFiltroCustos("");
      setCustosFiltrados([]);
    }
  };

  // Adicionar custo digitado manualmente (agora vai para a lista temporária)
  const adicionarCustoManual = () => {
    if (formValues.custoAdicional.trim()) {
      const valor = Number(formValues.custoAdicional.replace(",", "."));

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
      setFormValues({...formValues, custoAdicional: ""});
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

  // Filtrar precificações pelo termo de busca
  const handleBusca = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiltro(e.target.value);
  };

  // Mudar a quantidade de itens por página
  const handleChangeItensPorPagina = (value: string) => {
    setItensPorPagina(Number(value));
    setPaginaAtual(0); // Voltar para a primeira página
  };

  // Calcular os itens da página atual
  const itensPaginaAtual = precificacoesFiltradas.slice(
    paginaAtual * itensPorPagina,
    (paginaAtual + 1) * itensPorPagina
  );

  // Calcular total de páginas
  const totalPaginas = Math.ceil(precificacoesFiltradas.length / itensPorPagina);

  const handleCalcular = () => {
    try {
      setCalculando(true);

      // Validação do valor do equipamento
      if (!formValues.valorEquipamento || isNaN(Number(formValues.valorEquipamento.replace(",", ".")))) {
        toast({
          title: "Campo obrigatório",
          description: "O valor do bem precisa ser um número válido",
          variant: "destructive"
        });
        setCalculando(false);
        return;
      }

      // Validação da margem de lucro
      if (!formValues.lucroMensalPercentual || isNaN(Number(formValues.lucroMensalPercentual.replace(",", ".")))) {
        toast({
          title: "Campo obrigatório",
          description: "A margem de lucro mensal precisa ser um número válido",
          variant: "destructive"
        });
        setCalculando(false);
        return;
      }

      const valorEquipamento = Number(formValues.valorEquipamento.replace(",", "."));
      const frete = formValues.frete ? Number(formValues.frete.replace(",", ".")) : 0;
      const lucroMensalPercentual = Number(formValues.lucroMensalPercentual.replace(",", "."));
      const parcelas = Number(formValues.parcelas);
      const retornoInvestimentoMeses = Number(formValues.retornoInvestimentoMeses);
      const tempoContratoMeses = Number(formValues.tempoContratoMeses);

      // Obter valores dos custos selecionados
      const custos = custosSelecionados.map(custo => custo.valor);

      // Calcular preço de aluguel
      const resultado = calcularPrecoAluguel({
        valorEquipamento,
        frete,
        lucroMensalPercentual,
        retornoInvestimentoMeses,
        tempoContratoMeses,
        formaPagamento: formValues.formaPagamento,
        parcelas,
        custos
      });

      // Adicionar valor de equipamento original ao resultado
      const resultadoComValorEquipamento = {
        ...resultado,
        valorEquipamento, // Guardar o valor original do equipamento
      };

      console.log("Cálculo realizado:", {
        valorEquipamento,
        frete,
        resultado: resultadoComValorEquipamento
      });

      setResultado(resultadoComValorEquipamento);
      setCalculando(false);
    } catch (error) {
      console.error("Erro ao calcular preço:", error);
      toast({
        title: "Erro no cálculo",
        description: "Não foi possível calcular o valor do aluguel. Verifique os dados inseridos.",
        variant: "destructive"
      });
      setCalculando(false);
    }
  };

  const handleSalvarCalculoSuccess = () => {
    if (!formValues.nomeEquipamento.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Preencha o nome do bem para salvar a precificação",
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

        // Garantir tipo de lucro correto
        const tipoLucro = formValues.tipoLucro === "LIQUIDO" ? "LIQUIDO" : "BRUTO";

        const novasPrecificacoes = [...precificacoesSalvas];
        const precificacaoOriginal = precificacoesSalvas[index];
        novasPrecificacoes[index] = {
          id: editando,
          data: new Date(),
          nomeEquipamento: formValues.nomeEquipamento,
          equipamentoId: precificacaoOriginal.equipamentoId || equipamentoCarregado?.id || null, // Manter o ID do equipamento
          formaPagamento: formValues.formaPagamento,
          tipoLucro,
          parcelas: parcelas,
          retornoInvestimentoMeses: parseInt(formValues.retornoInvestimentoMeses),
          tempoContratoMeses: parseInt(formValues.tempoContratoMeses),
          ...resultado
        };
        setPrecificacoesSalvas(novasPrecificacoes);
        setEditando(null);

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

      // Garantir tipo de lucro correto
      const tipoLucro = formValues.tipoLucro === "LIQUIDO" ? "LIQUIDO" : "BRUTO";

      const novaPrecificacao = {
        id: Date.now(), // ID único baseado no timestamp
        data: new Date(),
        nomeEquipamento: formValues.nomeEquipamento,
        equipamentoId: equipamentoCarregado?.id || null, // Salvar o ID do equipamento para filtrar
        formaPagamento: formValues.formaPagamento,
        tipoLucro,
        parcelas: parcelas,
        retornoInvestimentoMeses: parseInt(formValues.retornoInvestimentoMeses),
        tempoContratoMeses: parseInt(formValues.tempoContratoMeses),
        ...resultado
      };

      // Adicionar à lista de precificações
      setPrecificacoesSalvas([...precificacoesSalvas, novaPrecificacao]);

      // Se um equipamento estiver carregado, atualize seu valor
      if (equipamentoCarregado) {
        // Atualizar o valor do equipamento no sistema com base na nova precificação
        const valorEquipamentoOriginal = resultado.valorEquipamento || 0;
        setEquipamentoCarregado({
          ...equipamentoCarregado,
          valorEquipamento: valorEquipamentoOriginal
        });

        toast({
          title: "Cálculo salvo com sucesso",
          description: "Esta é agora a precificação atual do equipamento",
        });
      } else {
        toast({
          title: "Cálculo salvo com sucesso",
          description: "A precificação foi registrada no sistema",
        });
      }
    }

    // Limpar o formulário (todos os campos vazios)
    setFormValues({
      nomeEquipamento: "",
      valorEquipamento: "",
      frete: "",
      retornoInvestimentoMeses: "",
      tempoContratoMeses: "",
      lucroMensalPercentual: "",
      tipoLucro: "LIQUIDO",
      formaPagamento: "PIX",
      parcelas: "1",
      custoAdicional: "",
      unidade: "",
      quantidade: ""
    });
    setResultado(null);
    // Limpar custos selecionados
    setCustosSelecionados([]);

    // Verificar se veio de uma rota específica para redirecionar de volta
    const url = new URL(window.location.href);
    const equipamentoId = url.searchParams.get("equipamentoId");

    if (equipamentoId) {
      // Se veio da página de equipamentos, redirecionar de volta
      toast({
        title: "Redirecionando",
        description: "Voltando para a lista de equipamentos",
      });

      // Redirecionar após pequeno delay para o toast ser exibido
      setTimeout(() => {
        navigate("/precificacao/alugueis");
      }, 1500);
    }
  };

  const handleEditarPrecificacao = (precificacao: any) => {
    // Preencher formulário com dados existentes

    // Encontrar o equipamento pelos dados da precificação
    const equipamento = precificacao.equipamentoId 
      ? equipamentosOriginais.find((e) => e.id === precificacao.equipamentoId)
      : null;

    // Se encontrar o equipamento, carregá-lo
    if (equipamento) {
      setEquipamentoCarregado(equipamento);
    }

    // Usar o valor do equipamento original se disponível, ou usar o valor total como fallback
    const valorEquipamentoOriginal = precificacao.valorEquipamento || 0;
    // Calcular o valor do frete (custoTotal - valorEquipamento)
    const freteValor = precificacao.custoTotal > valorEquipamentoOriginal 
      ? precificacao.custoTotal - valorEquipamentoOriginal 
      : 0;

    // Garantir que tipoLucro seja estritamente "BRUTO" ou "LIQUIDO"
    const tipoLucro = precificacao.tipoLucro === "LIQUIDO" ? "LIQUIDO" : "BRUTO";

    setFormValues({
      nomeEquipamento: precificacao.nomeEquipamento || (equipamento ? equipamento.nome : ""),
      valorEquipamento: valorEquipamentoOriginal.toString(),
      frete: freteValor.toString(),
      retornoInvestimentoMeses: precificacao.retornoInvestimentoMeses?.toString() || "12",
      tempoContratoMeses: precificacao.tempoContratoMeses?.toString() || "12",
      lucroMensalPercentual: typeof precificacao.lucroPercentual === 'number' 
        ? precificacao.lucroPercentual.toFixed(2) 
        : precificacao.lucroPercentual?.toString() || "0",
      tipoLucro,
      formaPagamento: precificacao.formaPagamento,
      parcelas: precificacao.parcelas?.toString() || "1",
      custoAdicional: "",
      unidade: precificacao.unidade || "", // Add unidade
      quantidade: precificacao.quantidade || "" // Add quantidade
    });

    // Carregar custos da precificação
    if (precificacao.custos && Array.isArray(precificacao.custos)) {
      setCustosSelecionados(precificacao.custos);
    } else if (equipamento && equipamento.custos) {
      setCustosSelecionados(equipamento.custos);
    } else {
      setCustosSelecionados([]);
    }

    setResultado({
      valorVenda: precificacao.valorVenda,
      lucroBruto: precificacao.lucroBruto,
      lucroLiquido: precificacao.lucroLiquido,
      lucroPercentual: precificacao.lucroPercentual,
      custoTotal: precificacao.custoTotal,
      taxaTotal: precificacao.taxaTotal,
      valorParcela: precificacao.valorParcela,
      valorEquipamento: valorEquipamentoOriginal // Incluir o valor do equipamento original
    });

    setEditando(precificacao.id);

    // Rolar para o topo da página para facilitar a edição
    window.scrollTo({ top: 0, behavior: 'smooth' });

    toast({
      title: "Editando precificação",
      description: "Os dados foram carregados para edição"
    });
  };

  const handleExcluirPrecificacao = () => {
    if (exclusaoId === null) return;

    // Identificar a precificação mais recente (atual)
    const precificacoesOrdenadas = [...precificacoesSalvas].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    );

    // Verificar se estamos excluindo a precificação mais recente
    const maisRecente = precificacoesOrdenadas[0];
    const excluindoMaisRecente = maisRecente && maisRecente.id === exclusaoId;

    // Verificar se existe uma penúltima precificação
    const penultima = precificacoesOrdenadas.length > 1 ? precificacoesOrdenadas[1] : null;

    // Filtrar a precificação a ser excluída
    const novaLista = precificacoesSalvas.filter(p => p.id !== exclusaoId);
    setPrecificacoesSalvas(novaLista);
    setExclusaoId(null);

    // Se excluímos a precificação atual e existe uma penúltima
    if (excluindoMaisRecente && penultima && equipamentoCarregado) {
      toast({
        title: "Precificação atual excluída",
        description: "A penúltima precificação será usada como a atual",
      });

      // Se o equipamento carregado tem ID, atualizaríamos o valor no sistema real
      // Aqui apenas simulamos a atualização
      const valorEquipamentoOriginal = penultima.valorEquipamento || 0;

      // Se um equipamento estiver carregado, atualize seu valor para a penúltima precificação
      if (equipamentoCarregado) {
        setEquipamentoCarregado({
          ...equipamentoCarregado,
          valorEquipamento: valorEquipamentoOriginal
        });
      }
    } else {
      toast({
        title: "Precificação excluída",
        description: "A precificação foi removida do sistema",
      });
    }
  };

  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Checar se há um equipamento ID na URL ao carregar a página
  useEffect(() => {
    console.log("Verificando URL para carregamento automático");
    const url = new URL(window.location.href);
    const equipamentoId = url.searchParams.get("equipamentoId");

    // Se temos um ID de equipamento e ainda não carregamos nada
    if (equipamentoId && !equipamentoCarregado) {
      console.log("Carregando equipamento ID:", equipamentoId);

      // Buscar o equipamento real a partir dos dados originais
      // Poderia ser substituído por uma chamada real à API
      const equipamentosOriginais = [
        { id: "001", nome: "Câmera Profissional Canon EOS R5", valorEquipamento: 15000, precoAluguel: 850, margem: 25.5 },
        { id: "002", nome: "Drone DJI Mavic 3", valorEquipamento: 12000, precoAluguel: 600, margem: 20.0 },
        { id: "003", nome: "Notebook Dell XPS 17", valorEquipamento: 9000, precoAluguel: 450, margem: 22.5 },
        { id: "004", nome: "Projetor Epson 4K", valorEquipamento: 8000, precoAluguel: 400, margem: 23.0 },
        { id: "005", nome: "Filmadora Sony FX6", valorEquipamento: 25000, precoAluguel: 1250, margem: 24.0 },
        { id: "006", nome: "Sistema de Som Bose Completo", valorEquipamento: 18000, precoAluguel: 900, margem: 24.5 },
        { id: "007", nome: "iMac Pro 27 Polegadas", valorEquipamento: 22000, precoAluguel: 1100, margem: 25.0 },
        { id: "008", nome: "Mesa de Som Yamaha", valorEquipamento: 6000, precoAluguel: 300, margem: 22.0 },
        { id: "009", nome: "Microfone Shure Sem Fio", valorEquipamento: 4000, precoAluguel: 200, margem: 21.0 },
        { id: "010", nome: "Iluminação Profissional LED", valorEquipamento: 7500, precoAluguel: 375, margem: 23.5 },
      ];

      const equipamentoEncontrado = equipamentosOriginais.find(p => p.id === equipamentoId);

      // Se não encontrar, usa um padrão, mas isso não deveria acontecer
      const dadosEquipamento = equipamentoEncontrado ? {
        id: equipamentoEncontrado.id,
        nome: equipamentoEncontrado.nome,
        valorEquipamento: equipamentoEncontrado.valorEquipamento
      } : {
        id: equipamentoId,
        nome: `Equipamento ${equipamentoId}`,
        valorEquipamento: 5000 // Valor padrão caso não encontre
      };

      // Agora carregaremos os dados do equipamento para preencher os campos
      setEquipamentoCarregado(dadosEquipamento);

      // Preencher o formulário com os dados do equipamento
      setFormValues(prev => ({
        ...prev,
        nomeEquipamento: dadosEquipamento.nome,
        valorEquipamento: dadosEquipamento.valorEquipamento.toString(),
        lucroMensalPercentual: equipamentoEncontrado?.margem.toString() || "25", // Carregar a margem de lucro salva
        custoAdicional: "" // Manter o campo de custo adicional vazio
      }));

      // Mostrar notificação de carregamento
      toast({
        title: "Equipamento carregado",
        description: `${dadosEquipamento.nome} carregado com sucesso`,
      });

      console.log("Equipamento carregado automaticamente:", dadosEquipamento);
    } else {
      console.log("Nenhum equipamento a carregar da URL ou equipamento já carregado");
    }
  }, [location, equipamentoCarregado]); // Executar quando location mudar

  // Filtrar e ordenar precificações
  useEffect(() => {
    // Primeiro filtrar por equipamento se tiver um carregado
    let resultados = [...precificacoesSalvas];

    // Filtrar pelo ID do equipamento se tiver um carregado
    if (equipamentoCarregado) {
      resultados = resultados.filter(p => p.equipamentoId === equipamentoCarregado.id);
    }

    // Filtrar por descrição (nomeEquipamento)
    if (filtro.trim()) {
      resultados = resultados.filter(p => 
        p.nomeEquipamento?.toLowerCase().includes(filtro.toLowerCase())
      );
    }

    // Ordenar por data mais recente
    resultados.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    setPrecificacoesFiltradas(resultados);
    setPaginaAtual(0); // Voltar para primeira página ao filtrar
  }, [precificacoesSalvas, filtro, equipamentoCarregado]);

  // Lidar com mudança de página
  const proximaPagina = () => {
    if ((paginaAtual + 1) * itensPorPagina < precificacoesFiltradas.length) {
      setPaginaAtual(paginaAtual + 1);
    }
  };

  const paginaAnterior = () => {
    if (paginaAtual > 0) {
      setPaginaAtual(paginaAtual - 1);    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight pt-4 sm:pt-0">
            <span className="hidden sm:inline">Precificação Unitária - Alugueis</span>
            <span className="inline sm:hidden">Precificação Unitária - Aluguel</span>
          </h2>
          <p className="text-gray-500 text-sm sm:text-base -mt-1">
            Calcule o preço ideal para<br className="hidden xs:inline sm:hidden" /> um bem alugado
          </p>
        </div>

        <div className="sm:hidden pt-4">
          <Link to="/precificacao/alugueis">
            <Button variant="outline" className="flex items-center whitespace-nowrap">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>

        <div className="hidden sm:flex">
          <Link to="/precificacao/alugueis">
            <Button variant="outline" className="flex items-center whitespace-nowrap">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* COLUNA 1: Dados do Bem */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-1">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="mb-0 pb-0">Dados do Bem</CardTitle>
                  <CardDescription className="mt-0">
                    Informe os dados para cálculo do valor
                  </CardDescription>
                </div>
                {editando !== null && (
                  <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-md text-sm font-medium">
                    Editando
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nomeEquipamento">Nome do Bem</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      id="nomeEquipamento"
                      placeholder="Pesquisar equipamento..."
                      value={formValues.nomeEquipamento}
                      onChange={handleInputChange}
                      onFocus={() => setShowEquipamentoDropdown(true)}
                      className="pl-8"
                    />

                    {showEquipamentoDropdown && equipamentosFiltrados.length > 0 && (
                      <div 
                        ref={equipamentoDropdownRef}
                        className="absolute z-50 w-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
                      >
                        {equipamentosFiltrados.map(equipamento => (
                          <div
                            key={equipamento.id}
                            className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleEquipamentoSelect(equipamento)}
                          >
                            <div>
                              <p className="font-medium text-gray-900">{equipamento.nome}</p>
                              <p className="text-sm text-gray-500">
                                Valor do Bem: R$ {equipamento.valorEquipamento.toLocaleString('pt-BR')}
                                {equipamento.custos?.length > 0 && ` • ${equipamento.custos.length} Custo${equipamento.custos.length > 1 ? 's' : ''}: R$ ${equipamento.custos.reduce((acc: number, custo: any) => acc + custo.valor, 0).toLocaleString('pt-BR')}`}
                                {` • Margem Atual: ${((precificacoesSalvas.find(p => p.equipamentoId === equipamento.id)?.lucroPercentual) || equipamento.margem || 5).toFixed(2)}%`}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEquipamentoSelect(equipamento);
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
                        <SelectItem value="SEMANA">Semana</SelectItem>
                        <SelectItem value="MES">Mês</SelectItem>
                        <SelectItem value="EVENTO">Evento</SelectItem>
                        <SelectItem value="TURNO">Turno</SelectItem>
                        <SelectItem value="USO">Uso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantidade">
                      {formValues.unidade === "HORA" ? "Tempo" : "Quantidade"}
                    </Label>
                    {formValues.unidade === "HORA" ? (
                      <Input
                        id="quantidade"
                        type="time"
                        step="1"
                        placeholder="HH:mm:ss"
                        value={formValues.quantidade}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <Input
                        id="quantidade"
                        placeholder="Quantidade"
                        value={formValues.quantidade}
                        onChange={handleInputChange}
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valorEquipamento">Valor do Bem (R$)</Label>
                    <Input
                      id="valorEquipamento"
                      placeholder="0,00"
                      value={formValues.valorEquipamento}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frete">Frete (R$)</Label>
                    <Input
                      id="frete"
                      placeholder="0,00"
                      value={formValues.frete}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>


                {/* Seção de Custos Adicionais - Simplificada */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalCustosAdicionais">Custos Adicionais (R$)</Label>

                    {/* Desktop: Input e Botão na mesma linha */}
                    <div className="hidden md:flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="totalCustosAdicionaisDesktop"
                          placeholder="0,00"
                          value={custosSelecionados.length > 0 ? 
                            custosSelecionados.reduce((acc, custo) => acc + custo.valor, 0).toFixed(2).replace('.', ',') : 
                            ""}
                          readOnly
                          className="pr-10"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-xs text-gray-500">
                            {custosSelecionados.length > 0 && `${custosSelecionados.length} custo${custosSelecionados.length > 1 ? 's' : ''}`}
                          </span>
                        </div>
                      </div>

                      <Dialog 
                        open={dialogOpen} 
                        onOpenChange={(open) => {
                          setDialogOpen(open);
                          if (open) {
                            inicializarCustosTemporarios();
                            setAbaCustoAtiva("manual");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button 
                            className="flex items-center gap-2 h-10 bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap"
                          >
                            <Calculator className="h-4 w-4" />
                            Gerenciar Custos
                          </Button>
                        </DialogTrigger>
                        {/* Conteúdo do modal abaixo */}
                        <DialogContent className="w-[90vw] max-w-[360px] sm:max-w-md p-0 overflow-hidden border-none shadow-xl h-[530px] sm:h-[470px] flex flex-col" style={{borderRadius: '0.65rem'}}>
                          <div className="bg-purple-600 px-5 py-2 text-white" style={{borderTopLeftRadius: '0.65rem', borderTopRightRadius: '0.65rem'}}>
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
                                  {formatarValor(custosTemporarios.reduce((acc, custo) => acc + custo.valor, 0))}
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
                                className={`flex-1 ${abaCustoAtiva === "manual" ? "bg-white text-purple-700" : "text-white hover:bg-white/10"} rounded-full h-8`}
                                onClick={() => setAbaCustoAtiva("manual")}
                              >
                                <Plus className="h-3.5 w-3.5 mr-1.5" />
                                Novo
                              </Button>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm"
                                className={`flex-1 ${abaCustoAtiva === "buscar" ? "bg-white text-purple-700" : "text-white hover:bg-white/10"} rounded-full h-8`}
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
                                                <p className="text-xs text-gray-500">{formatarValor(custo.valor)}</p>
                                              </div>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 rounded-full text-purple-600 hover:bg-purple-50"
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
                                      value={formValues.custoAdicional}
                                      onChange={handleInputChange}
                                      className="border-gray-300 rounded-md h-9"
                                    />
                                  </div>
                                </div>

                                <Button 
                                  type="button" 
                                  className="bg-purple-600 hover:bg-purple-700 text-white w-full h-8"
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
                                        <p className="text-xs text-purple-700 font-medium">{formatarValor(custo.valor)}</p>
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
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={confirmarCustos}
                            >
                              Confirmar
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Mobile: Input em linha separada */}
                    <div className="md:hidden">
                      <div className="relative mb-2">
                        <Input
                          id="totalCustosAdicionaisMobile"
                          placeholder="0,00"
                          value={custosSelecionados.length > 0 ? 
                            custosSelecionados.reduce((acc, custo) => acc + custo.valor, 0).toFixed(2).replace('.', ',') : 
                            ""}
                          readOnly
                          className="pr-10"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-xs text-gray-500">
                            {custosSelecionados.length > 0 && `${custosSelecionados.length} custo${custosSelecionados.length > 1 ? 's' : ''}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botão Gerenciar Custos para mobile */}
                  <div className="flex md:hidden">
                    <Dialog 
                      open={dialogOpen} 
                      onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (open) {
                          // Quando o modal abrir, inicializar os custos temporários e selecionar aba "manual"
                          inicializarCustosTemporarios();
                          setAbaCustoAtiva("manual");
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full flex items-center gap-2 h-10 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Calculator className="h-4 w-4" />
                          Gerenciar Custos
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[90vw] max-w-[360px] sm:max-w-md p-0 overflow-hidden border-none shadow-xl h-[530px] sm:h-[470px] flex flex-col" style={{borderRadius: '0.65rem'}}>
                        <div className="bg-purple-600 px-5 py-2 text-white" style={{borderTopLeftRadius: '0.65rem', borderTopRightRadius: '0.65rem'}}>
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
                                {formatarValor(custosTemporarios.reduce((acc, custo) => acc + custo.valor, 0))}
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
                              className={`flex-1 ${abaCustoAtiva === "manual" ? "bg-white text-purple-700" : "text-white hover:bg-white/10"} rounded-full h-8`}
                              onClick={() => setAbaCustoAtiva("manual")}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1.5" />
                              Novo
                            </Button>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              className={`flex-1 ${abaCustoAtiva === "buscar" ? "bg-white text-purple-700" : "text-white hover:bg-white/10"} rounded-full h-8`}
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
                                              <p className="text-xs text-gray-500">{formatarValor(custo.valor)}</p>
                                            </div>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 w-7 p-0 rounded-full text-purple-600 hover:bg-purple-50"
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
                                    value={formValues.custoAdicional}
                                    onChange={handleInputChange}
                                    className="border-gray-300 rounded-md h-9"
                                  />
                                </div>
                              </div>

                              <Button 
                                type="button" 
                                className="bg-purple-600 hover:bg-purple-700 text-white w-full h-8"
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
                                      <p className="text-xs text-purple-700 font-medium">{formatarValor(custo.valor)}</p>
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
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={confirmarCustos}
                          >
                            Confirmar
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="retornoInvestimentoMeses">Retorno do Investimento (meses)</Label>
                    <Select 
                      value={formValues.retornoInvestimentoMeses}
                      onValueChange={(value) => handleSelectChange("retornoInvestimentoMeses", value)}
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
                        {[6, 12, 18, 24, 36, 48, 60].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num} meses</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tempoContratoMeses">Tempo de Contrato (meses)</Label>
                    <Select 
                      value={formValues.tempoContratoMeses}
                      onValueChange={(value) => handleSelectChange("tempoContratoMeses", value)}
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
                        {[1, 3, 6, 12, 24, 36, 48, 60].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num} meses</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lucroMensalPercentual">Margem de Lucro Mensal (%)</Label>
                  <Input
                    id="lucroMensalPercentual"
                    placeholder="Valor da margem de lucro"
                    value={formValues.lucroMensalPercentual}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      </SelectContent>
                    </Select>
                  </div>

                  {formValues.formaPagamento === "CARTAO_CREDITO" ? (                    <div className="space-y-2">
                      <Label htmlFor="parcelas">Parcelas</Label>
                      <Select 
                        value={formValues.parcelas} 
                        onValueChange={(value) => handleSelectChange("parcelas", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                            <SelectItem key={num} value={num.toString()}>{num}x</SelectItem>
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
                        <SelectContent>
                          <SelectItem value="1">Não aplicável</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <Button 
                  disabled={calculando}
                  onClick={handleCalcular}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  {calculando ? "Calculando..." : "Calcular Preço"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA 2: Resultado */}
        <div className="space-y-6">
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
                    <p className="text-2xl font-bold">{resultado ? formatarValor(resultado.custoTotal) : "R$ 0,00"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Valor do Aluguel</p>
                    <p className="text-2xl font-bold text-purple-600">{resultado ? formatarValor(resultado.valorVenda) : "R$ 0,00"}</p>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Lucro Bruto</p>
                    <p className="text-xl font-semibold">{resultado ? formatarValor(resultado.lucroBruto) : "R$ 0,00"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Lucro Líquido</p>
                    <p className="text-xl font-semibold">{resultado ? formatarValor(resultado.lucroLiquido) : "R$ 0,00"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Margem de Lucro</p>
                    <p className="text-xl font-semibold">{resultado ? resultado.lucroPercentual.toFixed(2) : "0,00"}%</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">ROI</p>
                    <p className="text-xl font-semibold">
                      {resultado 
                        ? (resultado.custoTotal > 0 
                            ? (resultado.valorVenda / resultado.custoTotal).toFixed(2) 
                            : "0,00")
                        : "0,00"}
                    </p>
                  </div>
                </div>

                {parseInt(formValues.parcelas) > 1 && (
                  <>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Valor da Parcela</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formValues.parcelas}x de {resultado ? formatarValor(resultado.valorParcela || 0) : "R$ 0,00"}
                      </p>
                    </div>
                  </>
                )}

                <div className="mt-6 space-y-2">
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={handleSalvarCalculoSuccess}
                    disabled={!resultado}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {editando ? "Atualizar Precificação" : "Salvar Precificação"}
                  </Button>

                  {editando && (
                    <Button 
                      className="w-full"
                      variant="outline"
                      onClick={() => {
                        setEditando(null);
                        setFormValues({
                          nomeEquipamento: "",
                          valorEquipamento: "",
                          frete: "",
                          retornoInvestimentoMeses: "12",
                          tempoContratoMeses: "12",
                          lucroMensalPercentual: "",
                          tipoLucro: "LIQUIDO",
                          formaPagamento: "PIX",
                          parcelas: "1",
                          custoAdicional: "",
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
      </div>

      {/* Precificações Salvas - Agora fora do grid, em toda a largura */}
      <Card>
        <CardHeader>
          <CardTitle>Precificações Salvas</CardTitle>
          <CardDescription>
            {equipamentoCarregado 
              ? `Histórico de precificações para o bem: ${equipamentoCarregado.nome}` 
              : "Histórico de precificações salvas para aluguéis"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative flex pt-1">
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                placeholder="Buscar por nome do bem..."
                value={filtro}
                onChange={handleBusca}
                className="pl-8 w-full"
              />
            </div>
          </div>

          {precificacoesFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
              <ShoppingBag className="h-12 w-12 text-gray-400" strokeWidth={1.5} />
              <h3 className="text-lg font-medium">Nenhum cálculo registrado</h3>
              <p className="text-gray-500">
                Utilize o formulário acima para calcular e salvar precificações
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm w-[150px]">Nome</TableHead>
                    <TableHead className="text-xs sm:text-sm w-[90px]">Data</TableHead>
                    <TableHead className="text-xs sm:text-sm w-[100px]">Valor Equipamento</TableHead>
                    <TableHead className="text-xs sm:text-sm w-[100px]">Aluguel Mensal</TableHead>
                    <TableHead className="text-xs sm:text-sm w-[70px]">Margem</TableHead>
                    <TableHead className="text-xs sm:text-sm w-[100px]">Pagamento</TableHead>
                    <TableHead className="text-xs sm:text-sm w-[60px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {precificacoesFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        {filtro ? (
                          <div className="text-center">
                            <Search className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-500 text-xs sm:text-sm">Nenhuma precificação encontrada com o termo pesquisado.</p>
                          </div>
                        ) : equipamentoCarregado ? (
                          <div className="text-center">
                            <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-amber-500 mb-2" />
                            <p className="text-gray-500 text-xs sm:text-sm">Este bem ainda não possui precificações salvas.</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-amber-500 mb-2" />
                            <p className="text-gray-500 text-xs sm:text-sm">Nenhuma precificação salva até o momento.</p>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    itensPaginaAtual.map((precificacao) => (
                      <TableRow key={precificacao.id}>
                        <TableCell className="py-2 font-medium">
                          <div className="flex items-center">
                            <span className="truncate max-w-[120px] sm:max-w-full">{precificacao.nomeEquipamento || "Sem nome"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">{new Date(precificacao.data).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="py-2">{formatarValor(precificacao.valorEquipamento)}</TableCell>
                        <TableCell className="py-2">{formatarValor(precificacao.valorVenda)}</TableCell>
                        <TableCell className="py-2">{precificacao.lucroPercentual?.toFixed(2)}%</TableCell>
                        <TableCell className="py-2">
                          {precificacao.formaPagamento === "PIX" && "PIX"}
                          {precificacao.formaPagamento === "DINHEIRO" && "Dinheiro"}
                          {precificacao.formaPagamento === "BOLETO" && "Boleto"}
                          {precificacao.formaPagamento === "CARTAO_DEBITO" && "Cartão de Débito"}
                          {precificacao.formaPagamento === "CARTAO_CREDITO" && (
                            <>Cartão de Crédito {precificacao.parcelas && precificacao.parcelas > 1 ? `(${precificacao.parcelas}x)` : ""}</>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
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
                                    onClick={handleExcluirPrecificacao}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </>
          )}

          {/* Paginação simplificada conforme design */}
          <div className="flex items-center justify-between mt-4">
            <div>
              <Select
                value={itensPorPagina.toString()}
                onValueChange={handleChangeItensPorPagina}
              >
                <SelectTrigger className="h-10 w-[70px]">
                  <SelectValue placeholder={itensPorPagina.toString()} />
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
                onClick={paginaAnterior}
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
                onClick={proximaPagina}
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
<style>{`
  input[type="time"]::-webkit-calendar-picker-indicator {
    background: none;
    cursor: pointer;
    filter: invert(0.4) sepia(1) saturate(1.5) hue-rotate(230deg);
  }
  ::-webkit-time-picker-popup {
    background: #f3e8ff !important;
    border: 1px solid #e9d5ff !important;
  }
  ::-webkit-time-picker-popup-button {
    color: #6b21a8 !important;
  }
  ::-webkit-time-picker-popup-hour,
  ::-webkit-time-picker-popup-minute,
  ::-webkit-time-picker-popup-second {
    background: #f3e8ff !important;
    color: #6b21a8 !important;
  }
  ::-webkit-time-picker-popup-hour:focus,
  ::-webkit-time-picker-popup-minute:focus,
  ::-webkit-time-picker-popup-second:focus {
    background: #e9d5ff !important;
  }
  ::-webkit-time-picker-popup-hour:hover,
  ::-webkit-time-picker-popup-minute:hover,
  ::-webkit-time-picker-popup-second:hover {
    background: #e9d5ff !important;
  }
`}</style>