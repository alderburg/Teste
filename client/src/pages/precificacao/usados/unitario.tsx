import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { calcularPrecoProduto, formatarMoeda } from "@/services/calculoService";
import { ArrowLeft, Save, Calculator, Pencil, Trash, X, Search, ChevronLeft, ChevronRight, ShoppingBag, Plus } from "lucide-react";
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

export default function PrecificacaoUsadosUnitarioPage() {
  const [exclusaoId, setExclusaoId] = useState<number | null>(null);
  const { toast } = useToast();
  const [calculando, setCalculando] = useState(false);
  const [editando, setEditando] = useState<number | false>(false);
  const [precificacoesSalvas, setPrecificacoesSalvas] = useState<any[]>([]);
  const [location, navigate] = useLocation();
  const [produtoCarregado, setProdutoCarregado] = useState<{id: string, nome: string, valorCusto: number, estado: string} | null>(null);

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

  // Estados para busca de produtos
  const [showProdutoDropdown, setShowProdutoDropdown] = useState(false);
  const produtoDropdownRef = useRef(null);
  const [produtosFiltrados, setProdutosFiltrados] = useState<any[]>([]);


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
    nomeProduto: "",
    valorCusto: "",
    unidade: "",
    quantidade: "",
    estadoConservacao: "bom",
    frete: "",
    lucroPercentual: "",
    formaPagamento: "PIX",
    parcelas: "1"
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
    ajusteEstado: number;
  } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;

    // Garantir que o produtoCarregado não interfira na digitação
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
          valorCusto: '',
          lucroPercentual: '',
          frete: '',
          formaPagamento: 'PIX',
          parcelas: '1',
          estadoConservacao: 'bom',
          custoAdicional: ''
        });
        setShowProdutoDropdown(false);
        return;
      }

      // Limpar valor de custo e margem ao editar nome
      setFormValues(prev => ({ 
        ...prev, 
        [id]: value,
        valorCusto: "", // Limpar valor de custo
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
      // Caso normal para outros campos
      setFormValues(prev => ({ ...prev, [id]: value }));
    }
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
    // Sempre atualiza os custos selecionados, mesmo que a lista esteja vazia
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
        { id: 1, nome: "Embalagem", valor: 10.5 },
        { id: 2, nome: "Taxa de entrega", valor: 15.0 },
        { id: 3, nome: "Seguro", valor: 25.0 },
        { id: 4, nome: "Imposto de importação", valor: 50.0 },
        { id: 5, nome: "Manuseio", valor: 5.0 }
      ];

      // Filtrar custos que já foram adicionados
      const resultados = custosFake.filter(custo => 
        custo.nome.toLowerCase().includes(valor.toLowerCase()) && 
        !custosTemporarios.some(custoTemp => custoTemp.id === custo.id)
      );
      setCustosFiltrados(resultados);
    } else {
      setCustosFiltrados([]);
    }
  };

  // Usamos o formatarMoeda importado do calculoService

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
      const frete = Number(formValues.frete.replace(",", ".") || "0");
      const lucroPercentual = Number(formValues.lucroPercentual.replace(",", "."));
      const parcelas = Number(formValues.parcelas || "1");

      // Calcular total de custos adicionais
      const totalCustosAdicionais = custosSelecionados.reduce((acc, custo) => acc + custo.valor, 0);

      // Calcular ajuste baseado no estado de conservação
      let ajusteEstado = 1.0;
      if (formValues.estadoConservacao === "excelente") {
        ajusteEstado = 1.1; // 10% acima para itens em excelente estado
      } else if (formValues.estadoConservacao === "regular") {
        ajusteEstado = 0.9; // 10% abaixo para itens em estado regular
      } else if (formValues.estadoConservacao === "ruim") {
        ajusteEstado = 0.7; // 30% abaixo para itens em estado ruim
      }

      // Calcular valor total incluindo custos adicionais
      const valorCustoComAdicionais = valorCusto + totalCustosAdicionais;

      // Aplicar ajuste do estado ao valor de custo
      const valorCustoAjustado = valorCustoComAdicionais * ajusteEstado;

      // Calcular preço usando a função do serviço
      const resultado = calcularPrecoProduto({
        valorCusto: valorCustoAjustado,
        frete,
        lucroPercentual,
        tipoLucro: 'LIQUIDO',
        formaPagamento: formValues.formaPagamento.toLowerCase(),
        parcelas
      });

      // Adicionar valor de custo original e ajuste ao resultado
      const resultadoComValorCusto = {
        ...resultado,
        valorCusto, // Guardar o valor de custo original
        custoTotal: valorCustoAjustado + frete, // Custo total ajustado + frete
        ajusteEstado // Guardar o fator de ajuste pelo estado
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

        const novasPrecificacoes = [...precificacoesSalvas];
        const precificacaoOriginal = precificacoesSalvas[index];
        novasPrecificacoes[index] = {
          id: editando,
          data: new Date(),
          nomeProduto: formValues.nomeProduto,
          produtoId: precificacaoOriginal.produtoId || produtoCarregado?.id || null, // Manter o ID do produto
          estadoConservacao: formValues.estadoConservacao,
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
        nomeProduto: formValues.nomeProduto,
        produtoId: produtoCarregado?.id || null, // Salvar o ID do produto para filtrar
        estadoConservacao: formValues.estadoConservacao,
        formaPagamento: formValues.formaPagamento,
        parcelas: parcelas,
        custos: custosSelecionados, // Salvar os custos adicionais
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

    // Limpar o formulário e todos os estados
    setFormValues({
      nomeProduto: "",
      valorCusto: "",
      estadoConservacao: "bom",
      frete: "",
      lucroPercentual: "",
      formaPagamento: "PIX",
      parcelas: "1"
    });
    setResultado(null);
    setCustosSelecionados([]); // Limpar custos selecionados
    setProdutoCarregado(null); // Limpar produto carregado
    setEditando(false); // Sair do modo de edição
    setProdutosFiltrados([]); // Limpar resultados da busca
    setShowProdutoDropdown(false); // Fechar dropdown de busca

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
        navigate("/precificacao/usados");
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

    setFormValues({
      nomeProduto: precificacao.nomeProduto,
      valorCusto: valorCustoOriginal.toString(),
      estadoConservacao: precificacao.estadoConservacao || "bom",
      frete: freteValor.toString(),
      lucroPercentual: typeof precificacao.lucroPercentual === 'number' 
        ? precificacao.lucroPercentual.toFixed(2) 
        : precificacao.lucroPercentual?.toString() || "0",
      formaPagamento: precificacao.formaPagamento,
      parcelas: precificacao.parcelas?.toString() || "1"
    });

    // Carregar os custos adicionais
    if (precificacao.custos && Array.isArray(precificacao.custos)) {
      setCustosSelecionados(precificacao.custos);
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
      valorCusto: valorCustoOriginal, // Incluir o valor de custo original
      ajusteEstado: precificacao.ajusteEstado || 1.0
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

  // Checar se há um produto ID na URL ao carregar a página
  useEffect(() => {
    // Extrair o ID do produto diretamente da URL
    const url = new URL(window.location.href);
    const produtoId = url.searchParams.get("produtoId");

    console.log("URL completa:", window.location.href);
    console.log("Parâmetros:", Array.from(url.searchParams.entries()));
    console.log("Produto ID detectado:", produtoId);

    // Carregamos o produto se houver um ID na URL e não houver produto já carregado
    if (produtoId && !produtoCarregado) {
      console.log("Carregando produto da URL:", produtoId);

      // Buscar o produto real a partir dos dados originais já definidos fora do escopo
      // Em uma aplicação real, isso seria uma chamada à API

      const produtoEncontrado = produtosOriginais.find(p => p.id === produtoId);

      // Se não encontrar, usa um padrão, mas isso não deveria acontecer
      const dadosProduto = produtoEncontrado ? {
        id: produtoEncontrado.id,
        nome: produtoEncontrado.nome,
        valorCusto: produtoEncontrado.valorCusto, // Pegando o valor de custo
        estado: produtoEncontrado.estado,
        custos: produtoEncontrado.custos || []
      } : {
        id: produtoId,
        nome: `Produto ${produtoId}`,
        valorCusto: 1000, // Valor padrão caso não encontre
        estado: "bom",
        custos: []
      };

      // Agora carregaremos os dados do produto para preencher os campos
      setProdutoCarregado(dadosProduto);
      setFormValues(prev => ({
        ...prev,
        nomeProduto: dadosProduto.nome,
        valorCusto: dadosProduto.valorCusto.toString(),
        estadoConservacao: dadosProduto.estado,
        lucroPercentual: produtoEncontrado ? produtoEncontrado.margem.toString() : "25",
        unidade: prev.unidade,
        quantidade: prev.quantidade
      }));
      setCustosSelecionados(dadosProduto.custos); //set custos adicionais

      // Mostrar notificação de carregamento
      toast({
        title: "Produto carregado",
        description: `${dadosProduto.nome} carregado com sucesso`,
      });

      console.log("Produto carregado automaticamente:", dadosProduto);
    } else {
      console.log("Nenhum produto a carregar da URL ou produto já carregado");
    }
  }, [location, produtoCarregado]);

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

  const handleChangeItensPorPagina = (value: string) => {
    setItensPorPagina(Number(value));
    setPaginaAtual(0); // Volta para a primeira página ao alterar o número de itens
  };

  // Obter itens da página atual
  const itensPaginaAtual = precificacoesFiltradas.slice(
    paginaAtual * itensPorPagina,
    (paginaAtual + 1) * itensPorPagina
  );

  // Lidar com busca
  const handleBusca = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiltro(e.target.value);
  };

  const handleProdutoSelect = (produto: any) => {
    // Encontrar a última precificação para obter a margem
    const margemAtual = ((precificacoesSalvas.find(p => p.produtoId === produto.id)?.lucroPercentual) || produto.margem || 25).toString();

    setFormValues(prev => ({
      ...prev,
      nomeProduto: produto.nome,
      valorCusto: produto.valorCusto.toString(),
      estadoConservacao: produto.estado || "bom",
      lucroPercentual: margemAtual,
      unidade: prev.unidade,
      quantidade: prev.quantidade
    }));

    // Carregar custos do produto
    if (produto.custos && produto.custos.length > 0) {
      setCustosSelecionados(produto.custos);
    } else {
      setCustosSelecionados([]);
    }

    setShowProdutoDropdown(false);
    setProdutoCarregado(produto);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (produtoDropdownRef.current && !produtoDropdownRef.current.contains(event.target as Node)) {
        setShowProdutoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  // Esse event listener não é mais necessário pois estamos filtrando no handleInputChange

  // Dados de produtos para demo/teste
  const produtosOriginais = [
    { id: "001", nome: "Smartphone Galaxy S23 Usado", valorCusto: 2800, precoVenda: 3499, margem: 25, estado: "bom", custos: [{id:1, nome: "Custo 1", valor: 50}] },
    { id: "002", nome: "Notebook Dell Inspiron Usado", valorCusto: 3200, precoVenda: 4299, margem: 34.3, estado: "regular", custos: [{id:2, nome: "Custo 2", valor: 100}] },
    { id: "003", nome: "Smart TV LG 55\" Usada", valorCusto: 1800, precoVenda: 2499, margem: 38.8, estado: "excelente" },
    { id: "004", nome: "Samsung Galaxy S21", valorCusto: 1900, precoVenda: 2499, margem: 31.5, estado: "bom" },
    { id: "005", nome: "iPad Air 2020", valorCusto: 2500, precoVenda: 3299, margem: 32, estado: "excelente" },
    { id: "006", nome: "Microsoft Surface Pro", valorCusto: 3100, precoVenda: 3999, margem: 29, estado: "bom" },
    { id: "007", nome: "Nintendo Switch", valorCusto: 1200, precoVenda: 1599, margem: 33.3, estado: "regular" },
  ];


  return (
    <div className="space-y-6">
      <div className="pt-5 sm:pt-0">
        <div className="flex flex-row items-start justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              <span className="hidden sm:inline">Precificação Unitária - Produto Usado</span>
              <span className="inline sm:hidden">Precificação Unitária - Usado</span>
            </h2>
            <p className="text-gray-500 text-sm sm:text-base -mt-1">
              Calcule o preço ideal para<br className="hidden xs:inline sm:hidden" /> um produto usado
            </p>
          </div>
          <div className="flex items-start pt-1">
            <Link href="/precificacao/usados">
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
                    className="absolute z-50 w-full mt-1 bg-white rounded-lg border border-gray-200 shadowlg overflow-hidden"
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

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custos">Custos Adicionais (R$)</Label>

                {/* Desktop: Input e Botão na mesma linha */}
                <div className="hidden md:flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="custosDesktop"
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
                        className="flex items-center gap-2 h-10 bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap"
                      >
                        <Calculator className="h-4 w-4" />
                        Gerenciar Custos
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[90vw] max-w-[360px] sm:max-w-md p-0 overflow-hidden border-none shadow-xl h-[530px] sm:h-[470px] flex flex-col" style={{borderRadius: '0.65rem'}}>
                      <div className="bg-amber-600 px-5 py-2 text-white" style={{borderTopLeftRadius: '0.65rem', borderTopRightRadius: '0.65rem'}}>
                        <div className="flex items-center justify-between mb-1">
                          <DialogTitle className="text-base font-semibold text-white">Custos Adicionais</DialogTitle>
                          <DialogClose className="rounded-full bg-white/20 hover:bg-white/30 p-1.5" onClick={cancelarEdicaoCustos}>
                            <X className="h-3.5 w-3.5 text-white" />
                          </DialogClose>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Mobile: Input em linha separada */}
                <div className="md:hidden">
                  <div className="relative mb-2">
                    <Input
                      id="custosMobile"
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
                      // Quando o modal abrir, inicializar os custos temporários
                      inicializarCustosTemporarios();
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full flex items-center gap-2 h-10 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Calculator className="h-4 w-4" />
                      Gerenciar Custos
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[90vw] max-w-[360px] sm:max-w-md p-0 overflow-hidden border-none shadow-xl h-[530px] sm:h-[470px] flex flex-col" style={{borderRadius: '0.65rem'}}>
                    <div className="bg-amber-600 px-5 py-2 text-white" style={{borderTopLeftRadius: '0.65rem', borderTopRightRadius: '0.65rem'}}>
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
                          className={`flex-1 ${abaCustoAtiva === "manual" ? "bg-white text-amber-700" : "text-white hover:bg-white/10"} rounded-full h-8`}
                          onClick={() => setAbaCustoAtiva("manual")}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Novo
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          className={`flex-1 ${abaCustoAtiva === "buscar" ? "bg-white text-amber-700" : "text-white hover:bg-white/10"} rounded-full h-8`}
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
                                          className="h-7 w-7 p-0 rounded-full text-amber-600 hover:bg-amber-50"
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
                            className="bg-amber-600 hover:bg-amber-700 text-white w-full h-8"
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
                                  <p className="text-xs text-amber-700 font-medium">{formatarValorExibicao(custo.valor)}</p>
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
                          <div className="flex justify-center items-center bg-gray-50 rounded-md border border-dashed border-gray-200 h-[170px] md:h-[140px]">
                            <p className="text-xs text-gray-500">Nenhum custo adicionado</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rodapé */}
                    <div className="border-t py-2 px-3 bg-gray-50 rounded-b-xl">
                      <Button 
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={confirmarCustos}
                      >
                        Confirmar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Grid para Estado de Conservação e Margem de Lucro - responsivo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estadoConservacao">Estado de Conservação</Label>
                <Select
                  value={formValues.estadoConservacao}
                  onValueChange={(value) => handleSelectChange("estadoConservacao", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent 
                    position="popper"
                    side="bottom"
                    sideOffset={4}
                    className="max-h-[180px] overflow-y-auto"
                  >
                    <SelectItem value="excelente">Excelente</SelectItem>
                    <SelectItem value="bom">Bom</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="ruim">Ruim</SelectItem>
                  </SelectContent>
                </Select>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                <Select
                  value={formValues.formaPagamento}
                  onValueChange={(value) => handleSelectChange("formaPagamento", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
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

            <div className="mt-6">
              <Button 
                onClick={handleCalcular}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
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
                  <p className="text-2xl font-bold text-green-600">{resultado ? formatarMoeda(resultado.valorVenda) : "R$ 0,00"}</p>
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

              <div>
                <p className="text-sm font-medium text-gray-500">Ajuste pelo estado de conservação</p>
                <p className="text-xl font-semibold">
                  {resultado ? (resultado.ajusteEstado > 1 
                    ? `+${((resultado.ajusteEstado - 1) * 100).toFixed(0)}%` 
                    : `${((resultado.ajusteEstado - 1) * 100).toFixed(0)}%`) : "0%"}
                </p>
              </div>

              {parseInt(formValues.parcelas) > 1 && formValues.formaPagamento === "CARTAO_CREDITO" && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Valor da Parcela</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {formValues.parcelas}x de {resultado ? formatarMoeda(resultado.valorParcela || 0) : "R$ 0,00"}
                    </p>
                  </div>
                </>
              )}

              <div className="mt-6 space-y-2">
                <Button 
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white" 
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
                        nomeProduto: "",
                        valorCusto: "",
                        estadoConservacao: "bom",
                        frete: "",
                        lucroPercentual: "",
                        formaPagamento: "PIX",
                        parcelas: "1"
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
              : "Histórico de precificações salvas para produtos usados"}
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
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Frete</TableHead>
                    <TableHead>Custo Total</TableHead>
                    <TableHead>Estado</TableHead>
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
                      <TableCell>{formatarMoeda(precificacao.valorCusto || 0)}</TableCell>
                      <TableCell>{formatarMoeda(parseFloat(precificacao.frete) || 0)}</TableCell>
                      <TableCell>{formatarMoeda(precificacao.custoTotal || 0)}</TableCell>
                      <TableCell>
                        {precificacao.estadoConservacao === "excelente" && "Excelente"}
                        {precificacao.estadoConservacao === "bom" && "Bom"}
                        {precificacao.estadoConservacao === "regular" && "Regular"}
                        {precificacao.estadoConservacao === "ruim" && "Ruim"}
                      </TableCell>
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
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setExclusaoId(precificacao.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
                  <SelectValue placeholder="5" />
                </SelectTrigger>
                <SelectContent 
                  position="popper" 
                  side="bottom"
                  sideOffset={4}
                  className="max-h-[180px] overflow-y-auto"
                >
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
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

      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={exclusaoId !== null} onOpenChange={() => setExclusaoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta precificação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
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
  );
}