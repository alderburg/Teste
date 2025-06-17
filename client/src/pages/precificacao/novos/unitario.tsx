import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calcularPrecoProduto } from "@/services/calculoService";
import { ArrowLeft, Save, Calculator, Pencil, Trash, X, AlertTriangle, Search, ChevronLeft, ChevronRight, ShoppingBag, Plus, Ticket } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function PrecificacaoNovosUnitarioPage() {
  const [exclusaoId, setExclusaoId] = useState<number | null>(null);
  const { toast } = useToast();
  const [calculando, setCalculando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [precificacoesSalvas, setPrecificacoesSalvas] = useState<any[]>([]);
  const [location, navigate] = useLocation();
  const [produtoCarregado, setProdutoCarregado] = useState<{id: string, nome: string, valorCusto: number} | null>(null);

  // Estados para gerenciamento de custos
  const [custosSelecionados, setCustosSelecionados] = useState<any[]>([]);
  const [custosTemporarios, setCustosTemporarios] = useState<any[]>([]);
  const [abaCustoAtiva, setAbaCustoAtiva] = useState<"manual" | "buscar">("manual");
  const [filtroCustos, setFiltroCustos] = useState("");
  const [custosFiltrados, setCustosFiltrados] = useState<any[]>([]);
  const [nomeCustoManual, setNomeCustoManual] = useState("");
  
  // Estados para gerenciamento de promoções
  const [promocoesSelecionadas, setPromocoesSelecionadas] = useState<any[]>([]);
  const [promocoesTemporarias, setPromocoesTemporarias] = useState<any[]>([]);
  const [dialogPromocaoOpen, setDialogPromocaoOpen] = useState(false);
  const [abaPromocaoAtiva, setAbaPromocaoAtiva] = useState<"buscar">("buscar");
  const [filtroPromocoes, setFiltroPromocoes] = useState("");
  const [promocoesFiltradas, setPromocoesFiltradas] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  // Formatação de valor monetário para exibição
  const formatarValorExibicao = (valor: number) => {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  };

  // Inicializar custos temporários ao abrir o modal
  const inicializarCustosTemporarios = () => {
    setCustosTemporarios([...custosSelecionados]);
  };

  // Confirmar custos temporários (ao clicar em Confirmar)
  const confirmarCustos = () => {
    // Sempre atualiza os custos selecionados, mesmo que a lista esteja vazia
    setCustosSelecionados([...custosTemporarios]);
    setDialogOpen(false);
  };

  // Cancelar edição de custos (ao clicar no X)
  const cancelarEdicaoCustos = () => {
    setCustosTemporarios([]);
    setDialogOpen(false);
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
    if (formValues.custoAdicional?.trim()) {
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
    const novosCustos = custosTemporarios.filter(c => c.id !== id);
    setCustosTemporarios(novosCustos);
  };
  
  // Funções para gerenciamento de promoções
  const inicializarPromocoesTemporarias = () => {
    setPromocoesTemporarias([...promocoesSelecionadas]);
  };
  
  const confirmarPromocoes = () => {
    setPromocoesSelecionadas([...promocoesTemporarias]);
    setDialogPromocaoOpen(false);
  };
  
  const cancelarEdicaoPromocoes = () => {
    setPromocoesTemporarias([]);
    setDialogPromocaoOpen(false);
  };
  
  const adicionarPromocao = (promocao: any) => {
    if (!promocoesTemporarias.some(p => p.id === promocao.id)) {
      setPromocoesTemporarias([...promocoesTemporarias, promocao]);
      setFiltroPromocoes("");
      setPromocoesFiltradas([]);
    }
  };
  
  const removerPromocao = (id: number) => {
    const novasPromocoes = promocoesTemporarias.filter(p => p.id !== id);
    setPromocoesTemporarias(novasPromocoes);
  };
  
  const handlePromocoesBusca = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setFiltroPromocoes(valor);
    
    if (valor.trim()) {
      // Simular busca de promoções (em um ambiente real, seria uma chamada à API)
      const promocoesFake = [
        { id: 1, codigo: "DESC10", descricao: "Desconto 10%", tipo: "PERCENTUAL", desconto: 10 },
        { id: 2, codigo: "DESC20", descricao: "Desconto 20%", tipo: "PERCENTUAL", desconto: 20 },
        { id: 3, codigo: "FRETEGR", descricao: "Frete Grátis", tipo: "FRETE_GRATIS", desconto: 0 },
        { id: 4, codigo: "FIXO50", descricao: "R$50 OFF", tipo: "VALOR_FIXO", desconto: 50 },
        { id: 5, codigo: "FIXO100", descricao: "R$100 OFF", tipo: "VALOR_FIXO", desconto: 100 }
      ];
      
      // Filtrar promoções que já foram adicionadas e que correspondem ao termo de busca
      const resultados = promocoesFake.filter(promocao => {
        const matchesSearch = 
          promocao.codigo.toLowerCase().includes(valor.toLowerCase()) || 
          promocao.descricao.toLowerCase().includes(valor.toLowerCase());
        const notSelected = !promocoesTemporarias.some(promoTemp => promoTemp.id === promocao.id);
        return matchesSearch && notSelected;
      });
      setPromocoesFiltradas(resultados);
    } else {
      setPromocoesFiltradas([]);
    }
  };

  // Filtrar custos para a busca
  const handleCustosBusca = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setFiltroCustos(valor);

    if (valor.trim()) {
      // Simular busca de custos (em um ambiente real, seria uma chamada à API)
      const custosFake = [
        { id: 1, nome: "Embalagem", valor: 10.5 },
        { id: 2, nome: "Taxa de entrega", valor: 15.0 },
        { id: 3, nome: "Seguro", valor: 25.0 },
        { id: 4, nome: "Imposto de importação", valor: 50.0 },
        { id: 5, nome: "Manuseio", valor: 5.0 }
      ];

      // Filtrar custos que já foram adicionados e que correspondem ao termo de busca
      const resultados = custosFake.filter(custo => {
        const matchesSearch = custo.nome.toLowerCase().includes(valor.toLowerCase());
        const notSelected = !custosTemporarios.some(custoTemp => custoTemp.id === custo.id);
        return matchesSearch && notSelected;
      });
      setCustosFiltrados(resultados);
    } else {
      setCustosFiltrados([]);
    }
  };

  // Estados para paginação e filtragem
  const [filtro, setFiltro] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [itensPorPagina, setItensPorPagina] = useState(5);
  const [precificacoesFiltradas, setPrecificacoesFiltradas] = useState<any[]>([]);

  // Dados de exemplo para pesquisa de produtos
  // Mock de produtos e seus custos associados
  const produtosOriginais = [
    { 
      id: "001", 
      nome: "Smartphone Galaxy S23", 
      valorCusto: 3500,
      custos: [
        { id: 1, nome: "Embalagem Premium", valor: 150 },
        { id: 2, nome: "Seguro de Transporte", valor: 200 },
        { id: 3, nome: "Taxa de Importação", valor: 350 }
      ]
    },
    { 
      id: "002", 
      nome: "Notebook Dell Inspiron", 
      valorCusto: 4200,
      custos: [
        { id: 4, nome: "Garantia Estendida", valor: 300 },
        { id: 5, nome: "Software Licenciado", valor: 250 }
      ]
    },
    { 
      id: "003", 
      nome: "Smart TV LG 55\"", 
      valorCusto: 2800,
      custos: [
        { id: 6, nome: "Frete Especial", valor: 180 },
        { id: 7, nome: "Seguro", valor: 150 }
      ]
    },
    { 
      id: "004", 
      nome: "Monitor Samsung 27\"", 
      valorCusto: 1200,
      custos: []
    },
    { 
      id: "005", 
      nome: "iPad Pro 2023", 
      valorCusto: 6500,
      custos: [
        { id: 8, nome: "AppleCare+", valor: 500 },
        { id: 9, nome: "Acessórios", valor: 200 }
      ]
    }
  ];

  // Mock de custos padrão para busca
  const custosPadroes = [
    { id: 10, nome: "Embalagem Padrão", valor: 50 },
    { id: 11, nome: "Seguro Básico", valor: 100 },
    { id: 12, nome: "Frete Nacional", valor: 80 },
    { id: 13, nome: "Taxa de Manuseio", valor: 30 },
    { id: 14, nome: "Garantia Básica", valor: 150 },
    { id: 15, nome: "Marketing", valor: 200 },
    { id: 16, nome: "Comissão", valor: 120 },
    { id: 17, nome: "Armazenamento", valor: 75 },
    { id: 18, nome: "Seguro de Estoque", valor: 90 },
    { id: 19, nome: "Taxa Administrativa", valor: 45 }
  ];

  const [formValues, setFormValues] = useState({
    nomeProduto: "",
    unidade: "",
    quantidade: "",
    valorCusto: "",
    frete: "",
    lucroPercentual: "",
    tipoLucro: "LIQUIDO", // Sempre usar LIQUIDO
    formaPagamento: "PIX",
    parcelas: "1",
    custoAdicional: "", // Adicionado para gerenciamento de custos
    promocaoDesconto: "" // Campo para gerenciamento de promoções
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
  } | null>(null);

  const [produtosFiltrados, setProdutosFiltrados] = useState<any[]>([]);
  const [showProdutoDropdown, setShowProdutoDropdown] = useState(false);
  const produtoDropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (produtoDropdownRef.current && !produtoDropdownRef.current.contains(event.target as Node)) {
        setShowProdutoDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;

    if (id === 'nomeProduto') {
      // Limpar o resultado e resetar modo de edição com qualquer alteração do campo de busca
      setResultado(null);
      setEditando(false);

      if (value === '') {
        // Se o campo de busca for completamente apagado, limpar todos os campos
        setProdutoCarregado(null);
        setCustosSelecionados([]);
        // Resetar formulário para os valores iniciais
        setFormValues({
          nomeProduto: '',
          unidade: '',
          quantidade: '',
          valorCusto: '',
          lucroPercentual: '',
          frete: '',
          formaPagamento: 'PIX',
          parcelas: '1',
          tipoLucro: 'LIQUIDO',
          custoAdicional: '',
          promocaoDesconto: ''
        });
        setShowProdutoDropdown(false);
        return;
      }

      // Limpar valor de aquisição, margem e custos ao editar nome
      setFormValues(prev => ({ 
        ...prev, 
        [id]: value,
        valorCusto: "", // Limpar valor de aquisição
        lucroPercentual: "" // Limpar margem de lucro
      }));

      // Filtrar produtos
      if (value.trim()) {
        const filtered = produtosOriginais.filter(produto =>
          produto.nome.toLowerCase().includes(value.toLowerCase())
        );
        setProdutosFiltrados(filtered);
        setShowProdutoDropdown(true);
      } else {
        setProdutosFiltrados([]);
        setShowProdutoDropdown(false);
      }
      // Sempre limpar custos ao editar nome
      setCustosSelecionados([]);
      setProdutoCarregado(null);
    } else {
      setFormValues(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleProdutoSelect = (produto: any) => {
    // Encontrar a última precificação do produto
    const ultimaPrecificacao = precificacoesSalvas
      .filter(p => p.produtoId === produto.id)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0];

    // Get the last pricing margin, or product margin, or default to 25%
    const margemAtual = ((precificacoesSalvas.find(p => p.produtoId === produto.id)?.lucroPercentual) || produto.margem || 25).toString();

    setFormValues(prev => ({
      ...prev,
      nomeProduto: produto.nome,
      valorCusto: produto.valorCusto.toString(),
      lucroPercentual: margemAtual
    }));

    // Carregar custos do produto
    if (produto.custos) {
      setCustosSelecionados(produto.custos);
    } else {
      setCustosSelecionados([]);
    }

    setShowProdutoDropdown(false);
    setProdutoCarregado(produto);
  };

  const handleSelectChange = (id: string, value: string) => {
    if (id === "tipoLucro") {
      // Garantir que o valor seja apenas "BRUTO" ou "LIQUIDO"
      const tipoLucro = value === "LIQUIDO" ? "LIQUIDO" : "BRUTO";
      setFormValues(prev => ({ ...prev, [id]: tipoLucro }));
    } else {
      setFormValues(prev => ({ ...prev, [id]: value }));
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

      const valorCusto = Number(formValues.valorCusto.replace(",", "."));
      const frete = formValues.frete ? Number(formValues.frete.replace(",", ".")) : 0;
      const lucroPercentual = Number(formValues.lucroPercentual.replace(",", "."));
      const parcelas = Number(formValues.parcelas);

      // Calcular total de custos adicionais
      const custosAdicionais = custosSelecionados.map(c => c.valor);
      const totalCustosAdicionais = custosAdicionais.reduce((total, valor) => total + valor, 0);

      // Sempre usar LIQUIDO já que removemos a opção de seleção
      const resultado = calcularPrecoProduto({
        valorCusto,
        frete,
        lucroPercentual,
        tipoLucro: 'LIQUIDO',
        formaPagamento: formValues.formaPagamento,
        parcelas,
        custos: custosAdicionais
      });

      // Adicionar valor de custo original ao resultado e corrigir custoTotal
      const resultadoComValorCusto = {
        ...resultado,
        valorCusto, // Guardar o valor de custo original
        custoTotal: valorCusto + frete + totalCustosAdicionais // Corrigir o custoTotal para incluir todos os custos
      };

      console.log("Cálculo realizado:", {
        valorCusto,
        frete,
        resultado: resultadoComValorCusto,
        "resultado.custoTotal": resultadoComValorCusto.custoTotal,
        "valorCusto + frete": valorCusto + frete
      });

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
    if (!formValues.nomeProduto.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Preencha o nome do produto para salvar a precificação",
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
          nomeProduto: formValues.nomeProduto,
          produtoId: precificacaoOriginal.produtoId || produtoCarregado?.id || null, // Manter o ID do produto
          formaPagamento: formValues.formaPagamento,
          tipoLucro,
          parcelas: parcelas,
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

      // Garantir tipo de lucro correto
      const tipoLucro = formValues.tipoLucro === "LIQUIDO" ? "LIQUIDO" : "BRUTO";

      const novaPrecificacao = {
        id: Date.now(), // ID único baseado no timestamp
        data: new Date(),
        nomeProduto: formValues.nomeProduto,
        produtoId: produtoCarregado?.id || null, // Salvar o ID do produto para filtrar
        formaPagamento: formValues.formaPagamento,
        tipoLucro,
        parcelas: parcelas,
        ...resultado
      };

      // Adicionar à lista de precificações
      setPrecificacoesSalvas([...precificacoesSalvas, novaPrecificacao]);

      // Se um produto estiver carregado, atualize seu valor de custo
      if (produtoCarregado) {
        // Atualizar o valor de custo do produto no sistema com base na nova precificação
        const valorCustoOriginal = resultado.valorCusto || 0;
        setProdutoCarregado({
          ...produtoCarregado,
          valorCusto: valorCustoOriginal
        });

        toast({
          title: "Cálculo salvo com sucesso",
          description: "Esta é agora a precificação atual do produto",
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
      nomeProduto: "",
      unidade: "",
      quantidade: "",
      valorCusto: "",
      frete: "",
      lucroPercentual: "",
      tipoLucro: "LIQUIDO",
      formaPagamento: "PIX",
      parcelas: "1",
      custoAdicional: "",
      promocaoDesconto: ""
    });
    setResultado(null);
    setCustosSelecionados([]); // Limpar custos selecionados
    setProdutoCarregado(null); // Limpar produto carregado
    setEditando(false); // Sair do modo de edição

    // Verificar se veio de uma rota específica para redirecionar de volta
    const url = new URL(window.location.href);
    const produtoId = url.searchParams.get("produtoId");

    if (produtoId) {
      // Se veio da página de produtos, redirecionar de volta
      toast({
        title: "Redirecionando",
        description: "Voltando para a lista de produtos",
      });

      // Redirecionar após pequeno delay para o toast ser exibido
      setTimeout(() => {
        navigate("/precificacao/novos");
      }, 1500);
    }
  };

  const handleEditarPrecificacao = (precificacao: any) => {
    // Preencher formulário com dados existentes
    console.log("Editando precificação:", precificacao);

    // Usar o valor de custo original se disponível, ou usar o valor total como fallback
    const valorCustoOriginal = precificacao.valorCusto || 0;
    // Calcular o valor do frete (custoTotal - valorCusto)
    const freteValor = precificacao.custoTotal > valorCustoOriginal 
      ? precificacao.custoTotal - valorCustoOriginal 
      : 0;

    // Garantir que tipoLucro seja estritamente "BRUTO" ou "LIQUIDO"
    const tipoLucro = precificacao.tipoLucro === "LIQUIDO" ? "LIQUIDO" : "BRUTO";

    setFormValues({
      nomeProduto: precificacao.nomeProduto,
      unidade: "",
      quantidade: "",
      valorCusto: valorCustoOriginal.toString(),
      frete: freteValor.toString(),
      lucroPercentual: typeof precificacao.lucroPercentual === 'number' 
        ? precificacao.lucroPercentual.toFixed(2) 
        : precificacao.lucroPercentual?.toString() || "0",
      tipoLucro,
      formaPagamento: precificacao.formaPagamento,
      parcelas: precificacao.parcelas?.toString() || "1",
      custoAdicional: "",
      promocaoDesconto: ""
    });

    setResultado({
      valorVenda: precificacao.valorVenda,
      lucroBruto: precificacao.lucroBruto,
      lucroLiquido: precificacao.lucroLiquido,
      lucroPercentual: precificacao.lucroPercentual,
      custoTotal: precificacao.custoTotal,
      taxaTotal: precificacao.taxaTotal,
      valorParcela: precificacao.valorParcela,
      valorCusto: valorCustoOriginal // Incluir o valor de custo original
    });

    setEditando(precificacao.id);

    // Rolar para o topo da página para facilitar a edição
    window.scrollTo({ top: 0, behavior: 'smooth' });

    toast({
      title: "Editando precificação",
      description: "Os dados foram carregados para edição",
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
    if (excluindoMaisRecente && penultima && produtoCarregado) {
      toast({
        title: "Precificação atual excluída",
        description: "A penúltima precificação será usada como a atual",
      });

      // Se o produto carregado tem ID, atualizaríamos o valor de custo no sistema real
      // Aqui apenas simulamos a atualização
      const valorCustoOriginal = penultima.valorCusto || 0;

      // Se um produto estiver carregado, atualize seu valor de custo para a penúltima precificação
      if (produtoCarregado) {
        setProdutoCarregado({
          ...produtoCarregado,
          valorCusto: valorCustoOriginal
        });
      }
    } else {
      toast({
        title: "Precificação excluída",
        description: "A precificação foi removida do sistema",
      });
    }
  };

  // Formatação de valor monetário com locale
  const formatarValorLocale = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Checar se há um produto ID na URL ao carregar a página
  useEffect(() => {
    const url = new URL(window.location.href);
    const produtoId = url.searchParams.get("produtoId");

    // Carregamos o produto se houver um ID na URL e não houver produto já carregado
    if (produtoId && !produtoCarregado) {
      console.log("Carregando produto da URL:", produtoId);

      // Buscar o produto real a partir dos dados originais
      // Poderia ser substituído por uma chamada real à API
      const produtosOriginais = [
        { id: "001", nome: "Smartphone Galaxy S23", custo: 3500, precoVenda: 4999, margem: 42.8, custos: [{id: 1, nome: "Custo 1", valor: 100}, {id: 2, nome: "Custo 2", valor: 200}] },
        { id: "002", nome: "Notebook Dell Inspiron", custo: 4200, precoVenda: 5899, margem: 40.5, custos: [{id: 3, nome: "Custo 3", valor: 150}] },
        { id: "003", nome: "Smart TV LG 55\"", custo: 2800, precoVenda: 3999, margem: 42.8 },
        { id: "004", nome: "Monitor Samsung 27\"", custo: 1200, precoVenda: 1699, margem: 41.6 },
        { id: "005", nome: "iPad Pro 2023", custo: 6500, precoVenda: 8999, margem: 38.4 },
        { id: "006", nome: "Teclado Mecânico Logitech", custo: 350, precoVenda: 499, margem: 42.6 },
        { id: "007", nome: "Mouse Gamer Razer", custo: 280, precoVenda: 399, margem: 42.5 },
        { id: "008", nome: "Headphone Sony WH-1000XM4", custo: 1750, precoVenda: 2499, margem: 42.8 },
        { id: "009", nome: "Impressora HP LaserJet", custo: 1300, precoVenda: 1799, margem: 38.4 },
        { id: "010", nome: "Roteador Mesh TP-Link", custo: 450, precoVenda: 649, margem: 44.2 },
      ];

      const produtoEncontrado = produtosOriginais.find(p => p.id === produtoId);

      // Se não encontrar, usa um padrão, mas isso não deveria acontecer
      const dadosProduto = produtoEncontrado ? {
        id: produtoEncontrado.id,
        nome: produtoEncontrado.nome,
        valorCusto: produtoEncontrado.custo
      } : {
        id: produtoId,
        nome: `Produto ${produtoId}`,
        valorCusto: 1000 // Valor padrão caso não encontre
      };

      // Agora carregaremos os dados do produto para preencher os campos
      setProdutoCarregado(dadosProduto);

      // Preencher o formulário com os dados do produto
      setFormValues(prev => ({
        ...prev,
        nomeProduto: dadosProduto.nome,
        valorCusto: dadosProduto.valorCusto.toString(),
        lucroPercentual: produtoEncontrado?.margem.toString() || "25" // Carregar a margem de lucro salva
      }));

      // Mostrar notificação de carregamento
      toast({
        title: "Produto carregado",
        description: `${dadosProduto.nome} carregado com sucesso`,
      });

      console.log("Produto carregado automaticamente:", dadosProduto);
    } else {
      console.log("Nenhum produto a carregar da URL ou produto já carregado");
    }
  }, [location, produtoCarregado]); // Executar quando location mudar

  // Filtrar e ordenar precificações
  useEffect(() => {
    // Primeiro filtrar por produto se tiver um carregado
    let resultados = [...precificacoesSalvas];

    // Filtrar pelo ID do produto se tiver um carregado
    if (produtoCarregado) {
      resultados = resultados.filter(p => p.produtoId === produtoCarregado.id);
    }

    // Filtrar por descrição (nomeProduto)
    if (filtro.trim()) {
      resultados = resultados.filter(p => 
        p.nomeProduto.toLowerCase().includes(filtro.toLowerCase())
      );
    }

    // Ordenar por data mais recente
    resultados.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    setPrecificacoesFiltradas(resultados);
    setPaginaAtual(0); // Voltar para primeira página ao filtrar
  }, [precificacoesSalvas, filtro, produtoCarregado]);

  // Lidar com mudança de página
  const proximaPagina = () => {
    if ((paginaAtual + 1) * itensPorPagina < precificacoesFiltradas.length) {
      setPaginaAtual(paginaAtual + 1);
    }
  };

  const paginaAnterior = () => {
    if (paginaAtual > 0) {
      setPaginaAtual(paginaAtual - 1);
    }
  };

  // Calcular total de páginas
  const totalPaginas = Math.ceil(precificacoesFiltradas.length / itensPorPagina);

  // Obter itens da página atual
  const itensPaginaAtual = precificacoesFiltradas.slice(
    paginaAtual * itensPorPagina,
    (paginaAtual + 1) * itensPorPagina
  );

  // Lidar com busca
  const handleBusca = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiltro(e.target.value);
  };

  // Lidar com alteração de itens por página
  const handleChangeItensPorPagina = (value: string) => {
    setItensPorPagina(Number(value));
    setPaginaAtual(0); // Volta para a primeira página ao alterar o número de itens
  };

  return (
    <div className="space-y-6">
      {/* Modal de gerenciamento de custos */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) {
          // Quando fecha sem confirmar (X), descarta as alterações temporárias
          setCustosTemporarios([]);
        }
        setDialogOpen(open);
      }}>
        <DialogContent className="w-[90vw] max-w-[360px] sm:max-w-md p-0 overflow-hidden border-none shadow-xl h-[530px] sm:h-[470px] flex flex-col" style={{borderRadius: "0.65rem"}}>
          <div className="bg-blue-600 px-5 py-2 text-white" style={{borderTopLeftRadius: "0.65rem", borderTopRightRadius: "0.65rem"}}>
            <div className="flex items-center justify-between mb-1">
              <DialogTitle className="text-base font-semibold text-white">Gerenciar Custos</DialogTitle>
              <DialogClose className="rounded-full bg-white/20 hover:bg-white/30 p-1.5" onClick={cancelarEdicaoCustos}>
                <X className="h-3.5 w-3.5 text-white" />
              </DialogClose>
            </div>
            
            {/* Totalizador no topo */}
            <div className="bg-white/10 rounded-md p-2 mb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/80">Total de custos:</span>
                <span className="text-xl font-bold text-white">
                  {custosTemporarios.length} {custosTemporarios.length === 1 ? "item" : "itens"}
                </span>
              </div>
              <div className="text-xs text-white/60 mt-1">
                Adicione custos para incluir no cálculo de precificação.
              </div>
            </div>
            
            {/* Campo de pesquisa */}
            <div className="relative mb-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70 h-3.5 w-3.5" />
              <Input
                placeholder="Buscar custo..."
                className="border-white/30 bg-white/10 text-white placeholder:text-white/50 pl-9 h-8 text-sm"
                value={filtroCustos}
                onChange={handleCustosBusca}
              />
            </div>
          </div>

          {/* Conteúdo do modal */}
          <div className="flex-grow overflow-y-auto p-4 bg-white">
            {abaCustoAtiva === "manual" && (
              <div>
                {/* Adicionar custo manualmente */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomeCustoManual">Nome do Custo</Label>
                    <Input
                      id="nomeCustoManual"
                      placeholder="Ex: Embalagem, Seguro, etc."
                      value={nomeCustoManual}
                      onChange={(e) => setNomeCustoManual(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="custoAdicional">Valor do Custo (R$)</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="custoAdicional"
                        placeholder="0,00"
                        value={formValues.custoAdicional}
                        onChange={handleInputChange}
                        className="flex-1"
                      />
                      <Button 
                        type="button"
                        onClick={adicionarCustoManual}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {abaCustoAtiva === "buscar" && (
              <div>
                {/* Resultados da busca */}
                <div className="space-y-3">
                  {filtroCustos ? (
                    <div className="max-h-[200px] overflow-y-auto pr-1 space-y-2">
                      {custosFiltrados.length > 0 ? (
                        <div className="space-y-2">
                          {custosFiltrados.map(custo => (
                            <div 
                              key={custo.id} 
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer"
                              onClick={() => adicionarCusto(custo)}
                            >
                              <div>
                                <div className="text-sm font-medium text-gray-900">{custo.nome}</div>
                              </div>
                              <div className="flex items-center">
                                <span className="text-xs font-medium bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full mr-2">
                                  {formatarValorExibicao(custo.valor)}
                                </span>
                                <Plus className="h-4 w-4 text-gray-400" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-4">
                          <div className="bg-gray-100 rounded-full p-2 mb-2">
                            <AlertTriangle className="h-5 w-5 text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-500">Nenhum custo encontrado</p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
            
            {/* Lista de custos selecionados */}
            <div className={custosTemporarios.length > 0 ? "mt-0" : ""}>
              {custosTemporarios.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-sm font-medium text-gray-900">Custos Selecionados</h4>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={() => setCustosTemporarios([])}
                    >
                      Limpar
                    </Button>
                  </div>
                  
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    <div className="space-y-2">
                      {custosTemporarios.map((custo) => (
                        <div 
                          key={custo.id} 
                          className="flex items-center justify-between p-2 bg-blue-50 rounded-md"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900">{custo.nome}</div>
                          </div>
                          <div className="flex items-center">
                            <span className="text-xs font-medium bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full mr-2">
                              {formatarValorExibicao(custo.valor)}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50"
                              onClick={() => removerCusto(custo.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
          </div>

          {/* Rodapé */}
          <div className="border-t py-2 px-3 bg-gray-50 rounded-b-xl">
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={confirmarCustos}
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="pt-5 sm:pt-0">
        <div className="flex flex-row items-start justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              <span className="hidden sm:inline">Precificação Unitária - Produto Novo</span>
              <span className="inline sm:hidden">Precificação Unitária - Novo</span>
            </h2>
            <p className="text-gray-5000 text-sm sm:text-base -mt-1">
              Calcule o preço ideal para<br className="hidden xs:inline sm:hidden" /> um produto novo
            </p>
          </div>
          <div className="flex items-start pt-1">
            <Link href="/precificacao/novos">
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
                  <CardTitle>Dados do Produto</CardTitle>
                  <CardDescription>
                    Informe os dados para cálculo do preço
                  </CardDescription>
                </div>
                {editando && (
                  <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-md text-sm font-medium">
                    Editando
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nomeProduto">Nome do Produto</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="nomeProduto"
                    placeholder="Pesquisar produto..."
                    value={formValues.nomeProduto}
                    onChange={handleInputChange}
                    onFocus={() => setShowProdutoDropdown(true)}
                    className="pl-8"
                  />

                  {/* Dropdown de resultados da busca */}
                  {showProdutoDropdown && produtosFiltrados.length > 0 && (
                    <div 
                      ref={produtoDropdownRef}
                      className="absolute z-50 w-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
                    >
                      {produtosFiltrados.map(produto => (
                        <div
                          key={produto.id}
                          className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleProdutoSelect(produto)}
                        >
                          <div>
                            <p className="font-medium text-gray-900">{produto.nome}</p>
                            <p className="text-sm text-gray-500">
                              Aquisição: {formatarValorExibicao(produto.valorCusto)}
                              {produto.custos?.length > 0 && ` • ${produto.custos.length} Custo${produto.custos.length > 1 ? 's' : ''}: ${formatarValorExibicao(produto.custos.reduce((acc, custo) => acc + custo.valor, 0))}`}
                              {` • Margem Atual: ${((precificacoesSalvas.find(p => p.produtoId === produto.id)?.lucroPercentual) || produto.margem || 25).toFixed(2)}%`}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProdutoSelect(produto);
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
                      <SelectItem value="UN">Unidade (UN)</SelectItem>
                      <SelectItem value="PC">Peça (PC)</SelectItem>
                      <SelectItem value="KG">Quilograma (KG)</SelectItem>
                      <SelectItem value="G">Grama (G)</SelectItem>
                      <SelectItem value="L">Litro (L)</SelectItem>
                      <SelectItem value="ML">Mililitro (ML)</SelectItem>
                      <SelectItem value="M">Metro (M)</SelectItem>
                      <SelectItem value="M2">Metro Quadrado (M²)</SelectItem>
                      <SelectItem value="M3">Metro Cúbico (M³)</SelectItem>
                      <SelectItem value="CM">Centímetro (CM)</SelectItem>
                      <SelectItem value="CX">Caixa (CX)</SelectItem>
                      <SelectItem value="PAR">Par (PAR)</SelectItem>
                      <SelectItem value="KIT">Kit (KIT)</SelectItem>
                      <SelectItem value="PCT">Pacote (PCT)</SelectItem>
                      <SelectItem value="ROL">Rolo (ROL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantidade">Quantidade</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    placeholder="0"
                    value={formValues.quantidade}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valorCusto">Valor de Aquisição (R$)</Label>
                  <Input
                    id="valorCusto"
                    placeholder="0,00"
                    value={formValues.valorCusto}
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
                          className="flex items-center gap-2 h-10 bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                        >
                          <Calculator className="h-4 w-4" />
                          Gerenciar Custos
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[90vw] max-w-[360px] sm:max-w-md p-0 overflow-hidden border-none shadow-xl h-[530px] sm:h-[470px] flex flex-col" style={{borderRadius: '0.65rem'}}>
                        <div className="bg-blue-600 px-5 py-2 text-white" style={{borderTopLeftRadius: '0.65rem', borderTopRightRadius: '0.65rem'}}>
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
                                {formatarValorExibicao(custosTemporarios.reduce((acc, custo) => acc + custo.valor, 0))}
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
                              className={`flex-1 ${abaCustoAtiva === "manual" ? "bg-white text-blue-700" : "text-white hover:bg-white/10"} rounded-full h-8`}
                              onClick={() => setAbaCustoAtiva("manual")}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1.5" />
                              Novo
                            </Button>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              className={`flex-1 ${abaCustoAtiva === "buscar" ? "bg-white text-blue-700" : "text-white hover:bg-white/10"} rounded-full h-8`}
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
                                              className="h-7 w-7 p-0 rounded-full text-blue-600 hover:bg-blue-50"
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
                                className="bg-blue-600 hover:bg-blue-700 text-white w-full h-8"
                                onClick={adicionarCustoManual}
                              >
                                Adicionar custo
                              </Button>
                            </div>
                          )}

                          {/* Lista de custos adicionados */}
                          <div className="mt-4 flex flex-col h-[calc(100vh-380px)]">
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
                              <div className="space-y-1 overflow-y-auto pr-1 flex-1 max-h-[200px]">
                                {custosTemporarios.map(custo => (
                                  <div key={custo.id} className="flex items-center justify-between bg-gray-50 py-1 px-3 rounded-md border border-gray-200">
                                    <div className="overflow-hidden mr-2">
                                      <p className="text-sm font-medium text-gray-700 truncate">{custo.nome}</p>
                                      <p className="text-xs text-blue-700 font-medium">{formatarValorExibicao(custo.valor)}</p>
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
                              <div className="flex justify-center items-center bg-gray-50 rounded-md border border-dashed border-gray-200" style={{ minHeight: "200px" }}>
                                <p className="text-xs text-gray-500">Nenhum custo adicionado</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Rodapé */}
                        <div className="border-t py-2 px-3 bg-gray-50 rounded-b-xl">
                          <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={confirmarCustos}
                          >
                            Confirmar
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Mobile: Input e Botão em linhas separadas */}
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
                          className="w-full flex items-center gap-2 h-10 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Calculator className="h-4 w-4" />
                          Gerenciar Custos
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[90vw] max-w-[360px] sm:max-w-md p-0 overflow-hidden border-none shadow-xl h-[530px] sm:h-[470px] flex flex-col" style={{borderRadius: '0.65rem'}}>
                        <div className="bg-blue-600 px-5 py-2 text-white" style={{borderTopLeftRadius: '0.65rem', borderTopRightRadius: '0.65rem'}}>
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
                                {formatarValorExibicao(custosTemporarios.reduce((acc, custo) => acc + custo.valor, 0))}
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
                              className={`flex-1 ${abaCustoAtiva === "manual" ? "bg-white text-blue-700" : "text-white hover:bg-white/10"} rounded-full h-8`}
                              onClick={() => setAbaCustoAtiva("manual")}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1.5" />
                              Novo
                            </Button>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              className={`flex-1 ${abaCustoAtiva === "buscar" ? "bg-white text-blue-700" : "text-white hover:bg-white/10"} rounded-full h-8`}
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
                                              className="h-7 w-7 p-0 rounded-full text-blue-600 hover:bg-blue-50"
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
                                className="bg-blue-600 hover:bg-blue-700 text-white w-full h-8"
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
                              <div className="space-y-1 overflow-y-auto pr-1 flex-1 max-h-[200px]">
                                {custosTemporarios.map(custo => (
                                  <div key={custo.id} className="flex items-center justify-between bg-gray-50 py-1 px-3 rounded-md border border-gray-200">
                                    <div className="overflow-hidden mr-2">
                                      <p className="text-sm font-medium text-gray-700 truncate">{custo.nome}</p>
                                      <p className="text-xs text-blue-700 font-medium">{formatarValorExibicao(custo.valor)}</p>
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
                              <div className="flex justify-center items-center bg-gray-50 rounded-md border border-dashed border-gray-200" style={{ minHeight: "200px" }}>
                                <p className="text-xs text-gray-500">Nenhum custo adicionado</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Rodapé */}
                        <div className="border-t py-2 px-3 bg-gray-50 rounded-b-xl">
                          <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={confirmarCustos}
                          >
                            Confirmar
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Seção de Promoções */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="promocoes">Promoções</Label>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="promocoes"
                          placeholder="Sem promoções"
                          value={promocoesSelecionadas.length > 0 ? 
                            promocoesSelecionadas.map(promo => promo.descricao).join(", ") : 
                            ""}
                          readOnly
                          className="pr-24 text-ellipsis overflow-hidden whitespace-nowrap"
                          title={promocoesSelecionadas.length > 0 ? promocoesSelecionadas.map(promo => promo.descricao).join(", ") : ""}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-xs text-gray-500">
                            {promocoesSelecionadas.length > 0 && `${promocoesSelecionadas.length} ${promocoesSelecionadas.length > 1 ? "promoções" : "promoção"}`}
                          </span>
                        </div>
                      </div>

                      <Dialog 
                        open={dialogPromocaoOpen} 
                        onOpenChange={(open) => {
                          setDialogPromocaoOpen(open);
                          if (open) {
                            inicializarPromocoesTemporarias();
                            setAbaPromocaoAtiva("buscar");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button 
                            className="flex items-center justify-center gap-2 h-10 bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap w-full sm:w-auto"
                          >
                            <Ticket className="h-4 w-4" />
                            Gerenciar Promoções
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[90vw] max-w-[360px] sm:max-w-md p-0 overflow-hidden border-none shadow-xl h-[530px] sm:h-[470px] flex flex-col" style={{borderRadius: "0.65rem"}}>
                          <div className="bg-blue-600 px-5 py-2 text-white" style={{borderTopLeftRadius: "0.65rem", borderTopRightRadius: "0.65rem"}}>
                            <div className="flex items-center justify-between mb-1">
                              <DialogTitle className="text-base font-semibold text-white">Promoções Aplicáveis</DialogTitle>
                              <DialogClose className="rounded-full bg-white/20 hover:bg-white/30 p-1.5" onClick={cancelarEdicaoPromocoes}>
                                <X className="h-3.5 w-3.5 text-white" />
                              </DialogClose>
                            </div>

                            {/* Totalizador no topo */}
                            <div className="bg-white/10 rounded-md p-2 mb-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-white/80">Total de promoções:</span>
                                <span className="text-xl font-bold text-white">
                                  {promocoesTemporarias.length} {promocoesTemporarias.length === 1 ? "item" : "itens"}
                                </span>
                              </div>
                              <div className="text-xs text-white/60 mt-1">
                                Selecione as promoções aplicáveis
                              </div>
                            </div>

                            {/* Campo de pesquisa */}
                            <div className="relative mb-3">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70 h-4 w-4" />
                                <Input
                                  placeholder="Digite o código ou nome da promoção..."
                                  className="border-white/30 bg-white/10 text-white placeholder:text-white/50 pl-10 h-9 text-sm font-medium"
                                  value={filtroPromocoes}
                                  onChange={handlePromocoesBusca}
                                />
                              </div>
                              {filtroPromocoes && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 text-xs">
                                  {promocoesFiltradas.length} resultado{promocoesFiltradas.length !== 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Conteúdo do modal */}
                          <div className="flex-grow overflow-hidden p-4 bg-white flex flex-col">
                            {abaPromocaoAtiva === "buscar" && (
                              <div className="flex flex-col h-full">
                                {/* Resultados da busca */}
                                <div className="flex-1 min-h-0">
                                  {filtroPromocoes && (
                                    <div className="h-full">
                                      {promocoesFiltradas.length > 0 ? (
                                        <div className="grid gap-2 max-h-[200px] overflow-y-auto pr-1">
                                          {promocoesFiltradas.map(promocao => (
                                            <div 
                                              key={promocao.id} 
                                              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                              onClick={() => adicionarPromocao(promocao)}
                                            >
                                              <div className="flex-1 min-w-0 mr-4">
                                                <div className="flex items-center mb-1">
                                                  <div className="text-sm font-semibold text-gray-900 truncate">{promocao.codigo}</div>
                                                  <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                                    {promocao.tipo === "PERCENTUAL" ? `${promocao.desconto}%` : 
                                                     promocao.tipo === "VALOR_FIXO" ? `R$ ${promocao.desconto}` : 
                                                     promocao.tipo === "FRETE_GRATIS" ? `Frete grátis` : 
                                                     `${promocao.desconto}`}
                                                  </span>
                                                </div>
                                                <div className="text-sm text-gray-500 truncate">{promocao.descricao}</div>
                                              </div>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                              >
                                                <Plus className="h-5 w-5" />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="flex flex-col items-center justify-center py-4">
                                          <div className="bg-gray-100 rounded-full p-2 mb-2">
                                            <AlertTriangle className="h-5 w-5 text-gray-400" />
                                          </div>
                                          <p className="text-sm text-gray-500">Nenhuma promoção encontrada</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Lista de promoções selecionadas temporariamente - só mostra quando não está pesquisando */}
                                  <div>
                                    {promocoesTemporarias.length > 0 && !filtroPromocoes && (
                                      <div className="mt-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                          <h4 className="text-sm font-medium text-gray-900">Promoções Selecionadas</h4>
                                          <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-7 text-xs"
                                            onClick={() => setPromocoesTemporarias([])}
                                          >
                                            Limpar
                                          </Button>
                                        </div>
                                        
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                          {promocoesTemporarias.length > 0 ? (
                                            <div className="space-y-2">
                                              {promocoesTemporarias.map(promocao => (
                                                <div 
                                                  key={promocao.id} 
                                                  className="flex items-center justify-between p-2 bg-blue-50 rounded-md"
                                                >
                                                  <div>
                                                    <div className="text-sm font-medium text-gray-900">{promocao.codigo}</div>
                                                    <div className="text-xs text-gray-500">{promocao.descricao}</div>
                                                  </div>
                                                  <div className="flex items-center">
                                                    <span className="text-xs font-medium bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full mr-2">
                                                      {promocao.tipo === "PERCENTUAL" ? `${promocao.desconto}%` : 
                                                       promocao.tipo === "VALOR_FIXO" ? `R$ ${promocao.desconto}` : 
                                                       promocao.tipo === "FRETE_GRATIS" ? `Frete grátis` : 
                                                       `${promocao.desconto}`}
                                                    </span>
                                                    <Button 
                                                      variant="ghost" 
                                                      size="sm" 
                                                      className="h-6 w-6 p-0 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50"
                                                      onClick={() => removerPromocao(promocao.id)}
                                                    >
                                                      <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Rodapé */}
                          <div className="border-t py-2 px-3 bg-gray-50 rounded-b-xl">
                            <Button 
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={confirmarPromocoes}
                            >
                              Confirmar
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lucroPercentual">Margem de Lucro Líquida (%)</Label>
                  <Input
                    id="lucroPercentual"
                    placeholder="Valor da margem de lucro"
                    value={formValues.lucroPercentual}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                    <Select 
                      value={formValues.formaPagamento}
                      onValueChange={(value) => handleSelectChange("formaPagamento", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PIX">PIX</SelectItem>
                        <SelectItem value="DINHEIRO">DINHEIRO</SelectItem>
                        <SelectItem value="BOLETO">BOLETO</SelectItem>
                        <SelectItem value="CARTAO_CREDITO">CARTÃO DE CRÉDITO</SelectItem>
                        <SelectItem value="CARTAO_DEBITO">CARTÃO DE DÉBITO</SelectItem>
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

                <div className="mt-6">
                  <Button 
                    disabled={calculando}
                    onClick={handleCalcular}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    {calculando ? "Calculando..." : "Calcular Preço"}
                  </Button>                </div>
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
                      <p className="text-2xl font-bold">{resultado ? formatarValorExibicao(resultado.custoTotal) : "R$ 0,00"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Preço de Venda</p>
                      <p className="text-2xl font-bold text-green-600">{resultado ? formatarValorExibicao(resultado.valorVenda) : "R$ 0,00"}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Lucro Bruto</p>
                      <p className="text-xl font-semibold">{resultado ? formatarValorExibicao(resultado.lucroBruto) : "R$ 0,00"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Lucro Líquido</p>
                      <p className="text-xl font-semibold">{resultado ? formatarValorExibicao(resultado.lucroLiquido) : "R$ 0,00"}</p>
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
                        <p className="text-2xl font-bold text-blue-600">
                          {formValues.parcelas}x de {resultado ? formatarValorExibicao(resultado.valorParcela || 0) : "R$ 0,00"}
                        </p>
                      </div>
                    </>
                  )}

                  <div className="mt-6 space-y-2">
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
                          setEditando(false);
                          setFormValues({
                            nomeProduto: "",
                            valorCusto: "",
                            frete: "",
                            lucroPercentual: "",
                            tipoLucro: "LIQUIDO",
                            formaPagamento: "PIX",
                            parcelas: "1",
                            custoAdicional: ""
                          });
                          setResultado(null);
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
                {produtoCarregado 
                  ? `Histórico de precificações para o produto: ${produtoCarregado.nome}` 
                  : "Histórico de precificações salvas para produtos novos"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative flex pt-1">
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    placeholder="Buscar por nome do produto..."
                    value={filtro}
                    onChange={handleBusca}
                    className="pl-8 w-full"
                  />
                </div>
              </div>

              {precificacoesFiltradas.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Custo</TableHead>
                        <TableHead>Frete</TableHead>
                        <TableHead>Custo Total</TableHead>
                        <TableHead>Preço Venda</TableHead>
                        <TableHead>Margem Líquida</TableHead>
                        <TableHead>ROI</TableHead>
                        <TableHead>Forma Pagamento</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensPaginaAtual.map((precificacao) => (
                        <TableRow key={precificacao.id}>
                          <TableCell>{new Date(precificacao.data).toLocaleDateString()}</TableCell>
                          <TableCell>{precificacao.nomeProduto || "Produto sem nome"}</TableCell>
                          <TableCell>{formatarValorExibicao(precificacao.valorCusto || 0)}</TableCell>
                          <TableCell>{formatarValorExibicao(precificacao.custoTotal - (precificacao.valorCusto || 0))}</TableCell>
                          <TableCell>{formatarValorExibicao(precificacao.custoTotal || 0)}</TableCell>
                          <TableCell>{formatarValorExibicao(precificacao.valorVenda)}</TableCell>
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
                                      onClick={handleExcluirPrecificacao}
                                      className="bg-red-600 hover:bg-red-700"
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
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <ShoppingBag className="h-12 w-12 text-gray-400" strokeWidth={1.5} />
                  <h3 className="text-lg font-medium">Nenhum cálculo registrado</h3>
                  <p className="text-gray-500">
                    Utilize o formulário acima para calcular e salvar precificações
                  </p>
                </div>
              )}

              {/* Paginação simplificada conforme design */}
              <div className="flex items-center justify-between mt-4">
                <div>
                  <Select
                    value={itensPorPagina.toString()}
                    onValueChange={handleChangeItensPorPagina}
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
                    onClick={paginaAnterior}
                    disabled={paginaAtual === 0}
                    className="h-10 w-10 rounded-md"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-1">
                    {precificacoesFiltradas.length > 0 
                      ? `${paginaAtual + 1}/${totalPaginas}`
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