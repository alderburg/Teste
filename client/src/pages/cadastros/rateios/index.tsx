import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Edit, 
  PlusCircle, 
  Search, 
  Trash,
  SplitSquareVertical,
  Plus,
  X,
  AlertCircle,
  CheckCircle,
  Calculator,
  Divide,
  Package,
  DollarSign,
  Percent
} from "lucide-react";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AlertCircleIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Combobox } from "@/components/ui/combobox";

// Tipos
interface ItemVinculavel {
  id: string;
  nome: string;
  tipo: "PRODUTO" | "SERVICO" | "ALUGUEL";
}

interface ItemOpcao {
  id: string;
  descricao: string;
  tipo: "CUSTO" | "DESPESA" | "TAXA";
  valor: number;
}

interface Destinatario {
  id: string;
  nome: string;
  tipo: string;
  percentual?: number;
  valorFixo?: number;
  valorCalculado: number;
}

interface Rateio {
  id: string;
  vinculoId: string;
  vinculoNome: string;
  vinculoTipo: "PRODUTO" | "SERVICO" | "ALUGUEL";
  itemId: string;
  itemDescricao: string;
  itemTipo: "CUSTO" | "DESPESA" | "TAXA";
  tipoRateio: "IGUALITARIO" | "PROPORCIONAL" | "MANUAL" | "MISTO";
  descricao: string;
  valorTotal: number;
  destinatarios: Destinatario[];
  dataCriacao: Date;
}

// Esquema de validação para destinatário
const destinatarioSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  tipo: z.string().min(2, "Tipo deve ser informado"),
  percentual: z.number().optional(),
  valorFixo: z.number().optional(),
  valorCalculado: z.number(),
});

// Esquema de validação do formulário principal
const formSchema = z.object({
  vinculoId: z.string().min(1, "Selecione um produto, serviço ou aluguel"),
  vinculoNome: z.string().min(1, "Nome do vínculo é obrigatório"),
  vinculoTipo: z.enum(["PRODUTO", "SERVICO", "ALUGUEL"]),
  itemId: z.string().min(1, "Selecione um custo, despesa ou taxa"),
  itemDescricao: z.string().min(1, "Descrição do item é obrigatória"),
  itemTipo: z.enum(["CUSTO", "DESPESA", "TAXA"]),
  tipoRateio: z.enum(["IGUALITARIO", "PROPORCIONAL", "MANUAL", "MISTO"]),
  descricao: z.string().optional(),
  valorTotal: z.number().min(0.01, "Valor total deve ser maior que zero"),
  destinatarios: z.array(destinatarioSchema).min(1, "Adicione pelo menos um destinatário"),
})
.refine(
  (data) => {
    if (data.tipoRateio === "PROPORCIONAL") {
      // Verifica se todos os destinatários têm percentual definido
      const todosTemPercentual = data.destinatarios.every(d => d.percentual !== undefined && d.percentual > 0);
      return todosTemPercentual;
    }
    return true;
  },
  {
    message: "Todos os destinatários devem ter um percentual definido quando o tipo de rateio é Proporcional",
    path: ["destinatarios"],
  }
)
.refine(
  (data) => {
    if (data.tipoRateio === "MANUAL" || data.tipoRateio === "MISTO") {
      // Verifica se todos os destinatários têm valor fixo definido
      const todosTemValorFixo = data.destinatarios.every(d => d.valorFixo !== undefined && d.valorFixo >= 0);
      return todosTemValorFixo;
    }
    return true;
  },
  {
    message: "Todos os destinatários devem ter um valor fixo definido quando o tipo de rateio é Manual ou Misto",
    path: ["destinatarios"],
  }
)
.refine(
  (data) => {
    if (data.tipoRateio === "PROPORCIONAL") {
      // Verifica se a soma dos percentuais é 100%
      const somaPercentuais = data.destinatarios.reduce((acc, dest) => acc + (dest.percentual || 0), 0);
      return Math.abs(somaPercentuais - 100) < 0.01; // Permitir pequena margem de erro
    }
    return true;
  },
  {
    message: "A soma dos percentuais deve ser exatamente 100%",
    path: ["destinatarios"],
  }
)
.refine(
  (data) => {
    if (data.tipoRateio === "MANUAL") {
      // Verifica se a soma dos valores fixos é igual ao valor total
      const somaValores = data.destinatarios.reduce((acc, dest) => acc + (dest.valorFixo || 0), 0);
      return Math.abs(somaValores - data.valorTotal) < 0.01; // Permitir pequena margem de erro
    }
    return true;
  },
  {
    message: "A soma dos valores fixos deve ser igual ao valor total do rateio",
    path: ["destinatarios"],
  }
);

// Componente principal
export default function CadastroRateios() {
  // Estados
  const [showForm, setShowForm] = useState(false);
  const [editingRateio, setEditingRateio] = useState<Rateio | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rateiosPerPage, setRateiosPerPage] = useState(5);
  const [vinculoSelecionado, setVinculoSelecionado] = useState<ItemVinculavel | null>(null);
  const [vinculoBuscando, setVinculoBuscando] = useState("");
  const [itemSelecionado, setItemSelecionado] = useState<ItemOpcao | null>(null);
  const [itemBuscando, setItemBuscando] = useState("");
  const [novoDestinatario, setNovoDestinatario] = useState<Partial<Destinatario>>({
    nome: "",
    tipo: "",
    percentual: 0,
    valorFixo: 0,
    valorCalculado: 0
  });
  const [tipoRateioAtual, setTipoRateioAtual] = useState<"IGUALITARIO" | "PROPORCIONAL" | "MANUAL" | "MISTO">("PROPORCIONAL");
  const [vinculoOptions, setVinculoOptions] = useState<ItemVinculavel[]>([]);
  const [itemOptions, setItemOptions] = useState<ItemOpcao[]>([]);
  const [destinatarioOptions, setDestinatarioOptions] = useState<{id: string, nome: string, tipo: string}[]>([]);
  const [searchVinculo, setSearchVinculo] = useState("");
  const [searchItem, setSearchItem] = useState("");
  const [searchDestinatario, setSearchDestinatario] = useState("");
  const [showVinculoDropdown, setShowVinculoDropdown] = useState(false);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [showDestinatarioDropdown, setShowDestinatarioDropdown] = useState(false);

  // Referências para os dropdowns
  const vinculoDropdownRef = React.useRef<HTMLDivElement>(null);
  const itemDropdownRef = React.useRef<HTMLDivElement>(null);
  const destinatarioDropdownRef = React.useRef<HTMLDivElement>(null);

  // Handlers para fechar dropdowns quando clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        vinculoDropdownRef.current &&
        !vinculoDropdownRef.current.contains(event.target as Node)
      ) {
        setShowVinculoDropdown(false);
      }

      if (
        itemDropdownRef.current &&
        !itemDropdownRef.current.contains(event.target as Node)
      ) {
        setShowItemDropdown(false);
      }

      if (
        destinatarioDropdownRef.current &&
        !destinatarioDropdownRef.current.contains(event.target as Node)
      ) {
        setShowDestinatarioDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Toast para mensagens
  const { toast } = useToast();

  // Inicialização do formulário com react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vinculoId: "",
      vinculoNome: "",
      vinculoTipo: "PRODUTO",
      itemId: "",
      itemDescricao: "",
      itemTipo: "CUSTO",
      tipoRateio: "PROPORCIONAL",
      descricao: "",
      valorTotal: 0,
      destinatarios: [],
    },
  });

  // Obter a lista atual de destinatários para manipulação
  const destinatariosAtuais = form.watch("destinatarios") || [];
  const valorTotalAtual = form.watch("valorTotal") || 0;
  const tipoRateio = form.watch("tipoRateio");

  // Acompanhar mudanças no tipo de rateio
  useEffect(() => {
    if (tipoRateio !== tipoRateioAtual) {
      setTipoRateioAtual(tipoRateio);

      // Se mudar para igualitário e já houver destinatários, calcular automaticamente
      if (tipoRateio === "IGUALITARIO" && destinatariosAtuais.length > 0) {
        distribuirIgualitariamente();
      }
    }
  }, [tipoRateio]);

  // Calcular o valor calculado sempre que o valor total ou percentuais mudarem
  useEffect(() => {
    if (tipoRateioAtual === "PROPORCIONAL" && destinatariosAtuais.length > 0) {
      const novosDestinatarios = destinatariosAtuais.map(dest => ({
        ...dest,
        valorCalculado: ((dest.percentual || 0) / 100) * valorTotalAtual
      }));
      form.setValue("destinatarios", novosDestinatarios);
    }
  }, [valorTotalAtual, tipoRateioAtual]);

  // Mock de dados para testes
  const rateiosMock: Rateio[] = [];

  const produtosMock: ItemVinculavel[] = [
    { id: "1", nome: "Produto A", tipo: "PRODUTO" },
    { id: "2", nome: "Produto B", tipo: "PRODUTO" },
    { id: "3", nome: "Serviço X", tipo: "SERVICO" },
    { id: "4", nome: "Aluguel Y", tipo: "ALUGUEL" },
  ];

  const itensMock: ItemOpcao[] = [
    { id: "1", descricao: "Custo de Produção", tipo: "CUSTO", valor: 1500 },
    { id: "2", descricao: "Despesa Administrativa", tipo: "DESPESA", valor: 2300 },
    { id: "3", descricao: "Taxa de Comissão", tipo: "TAXA", valor: 780 },
    { id: "4", descricao: "Custo de Matéria Prima", tipo: "CUSTO", valor: 650 },
  ];

  const destinatariosMock = [
    { id: "1", nome: "Departamento A", tipo: "DEPARTAMENTO" },
    { id: "2", nome: "Departamento B", tipo: "DEPARTAMENTO" },
    { id: "3", nome: "Centro de Custo X", tipo: "CENTRO_CUSTO" },
    { id: "4", nome: "Filial Y", tipo: "FILIAL" },
  ];

  // Simular busca de produtos/serviços/aluguéis
  useEffect(() => {
    // Em um cenário real, isso seria uma chamada à API
    const resultados = produtosMock.filter(
      item => item.nome.toLowerCase().includes(searchVinculo.toLowerCase())
    );
    setVinculoOptions(resultados);
  }, [searchVinculo]);

  // Simular busca de custos/despesas/taxas
  useEffect(() => {
    if (vinculoSelecionado) {
      // Em um cenário real, isso seria uma chamada à API com o ID do vínculo
      const resultados = itensMock.filter(
        item => item.descricao.toLowerCase().includes(searchItem.toLowerCase())
      );
      setItemOptions(resultados);
    } else {
      setItemOptions([]);
    }
  }, [searchItem, vinculoSelecionado]);

  // Simular busca de destinatários
  useEffect(() => {
    const resultados = destinatariosMock.filter(
      item => item.nome.toLowerCase().includes(searchDestinatario.toLowerCase())
    );
    setDestinatarioOptions(resultados);
  }, [searchDestinatario]);

  // Query para buscar rateios (simulada)
  const { data: rateios = rateiosMock, isLoading } = useQuery({
    queryKey: ["rateios"],
    // queryFn já configurado no queryClient para fazer fetch de "/api/rateios"
  });

  // Mutations para criar, atualizar e excluir rateios
  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => {
      return apiRequest("/api/rateios", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: "Rateio criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["rateios"] });
      setShowForm(false);
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao criar rateio", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema> & { id: string }) => {
      return apiRequest(`/api/rateios/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: "Rateio atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["rateios"] });
      setShowForm(false);
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao atualizar rateio", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return apiRequest(`/api/rateios/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({ title: "Rateio excluído com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["rateios"] });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao excluir rateio", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Handlers
  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este rateio?")) {
      deleteMutation.mutate(id);
    }
  };

  const openFormForCreate = () => {
    setEditingRateio(null);
    setVinculoSelecionado(null);
    setItemSelecionado(null);
    setTipoRateioAtual("PROPORCIONAL");
    form.reset({
      vinculoId: "",
      vinculoNome: "",
      vinculoTipo: "PRODUTO",
      itemId: "",
      itemDescricao: "",
      itemTipo: "CUSTO",
      tipoRateio: "PROPORCIONAL",
      descricao: "",
      valorTotal: 0,
      destinatarios: [],
    });
    setShowForm(true);
  };

  const openFormForEdit = (rateio: Rateio) => {
    setEditingRateio(rateio);
    setVinculoSelecionado({
      id: rateio.vinculoId,
      nome: rateio.vinculoNome,
      tipo: rateio.vinculoTipo
    });
    setItemSelecionado({
      id: rateio.itemId,
      descricao: rateio.itemDescricao,
      tipo: rateio.itemTipo,
      valor: rateio.valorTotal
    });
    setTipoRateioAtual(rateio.tipoRateio);
    form.reset({
      vinculoId: rateio.vinculoId,
      vinculoNome: rateio.vinculoNome,
      vinculoTipo: rateio.vinculoTipo,
      itemId: rateio.itemId,
      itemDescricao: rateio.itemDescricao,
      itemTipo: rateio.itemTipo,
      tipoRateio: rateio.tipoRateio,
      descricao: rateio.descricao,
      valorTotal: rateio.valorTotal,
      destinatarios: rateio.destinatarios,
    });
    setShowForm(true);
  };

  // Manipulação de dados do formulário
  const handleSelectVinculo = (vinculo: ItemVinculavel) => {
    setVinculoSelecionado(vinculo);
    form.setValue("vinculoId", vinculo.id);
    form.setValue("vinculoNome", vinculo.nome);
    form.setValue("vinculoTipo", vinculo.tipo);
    setSearchVinculo("");
    setShowVinculoDropdown(false);

    // Resetar o item selecionado
    setItemSelecionado(null);
    form.setValue("itemId", "");
    form.setValue("itemDescricao", "");
    form.setValue("itemTipo", "CUSTO");
    form.setValue("valorTotal", 0);
  };

  const handleSelectItem = (item: ItemOpcao) => {
    setItemSelecionado(item);
    form.setValue("itemId", item.id);
    form.setValue("itemDescricao", item.descricao);
    form.setValue("itemTipo", item.tipo);
    form.setValue("valorTotal", item.valor);
    setSearchItem("");
    setShowItemDropdown(false);
  };

  const handleSelectDestinatario = (destinatario: any) => {
    setNovoDestinatario({
      ...novoDestinatario,
      id: destinatario.id,
      nome: destinatario.nome,
      tipo: destinatario.tipo
    });
    setSearchDestinatario("");
    setShowDestinatarioDropdown(false);
  };

  const adicionarDestinatario = () => {
    if (!novoDestinatario.nome || !novoDestinatario.tipo) {
      toast({
        title: "Erro ao adicionar destinatário",
        description: "Nome e tipo do destinatário são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Calcular o valor com base no tipo de rateio
    let valorCalculado = 0;
    if (tipoRateioAtual === "PROPORCIONAL" && novoDestinatario.percentual) {
      valorCalculado = (novoDestinatario.percentual / 100) * valorTotalAtual;
    } else if ((tipoRateioAtual === "MANUAL" || tipoRateioAtual === "MISTO") && novoDestinatario.valorFixo) {
      valorCalculado = novoDestinatario.valorFixo;
    }

    const novoItem: Destinatario = {
      id: novoDestinatario.id || `temp-${Date.now()}`,
      nome: novoDestinatario.nome || "",
      tipo: novoDestinatario.tipo || "",
      percentual: tipoRateioAtual === "PROPORCIONAL" || tipoRateioAtual === "MISTO" ? novoDestinatario.percentual : undefined,
      valorFixo: tipoRateioAtual === "MANUAL" || tipoRateioAtual === "MISTO" ? novoDestinatario.valorFixo : undefined,
      valorCalculado: valorCalculado
    };

    const novosDestinatarios = [...destinatariosAtuais, novoItem];
    form.setValue("destinatarios", novosDestinatarios);

    // Limpar o formulário de novo destinatário
    setNovoDestinatario({
      nome: "",
      tipo: "",
      percentual: 0,
      valorFixo: 0,
      valorCalculado: 0
    });

    // Se o tipo for igualitário, recalcular tudo
    if (tipoRateioAtual === "IGUALITARIO" && novosDestinatarios.length > 0) {
      distribuirIgualitariamente(novosDestinatarios);
    }
  };

  const removerDestinatario = (index: number) => {
    const novosDestinatarios = [...destinatariosAtuais];
    novosDestinatarios.splice(index, 1);
    form.setValue("destinatarios", novosDestinatarios);

    // Se o tipo for igualitário, recalcular tudo
    if (tipoRateioAtual === "IGUALITARIO" && novosDestinatarios.length > 0) {
      distribuirIgualitariamente(novosDestinatarios);
    }
  };

  const atualizarPercentualDestinatario = (index: number, novoPercentual: number) => {
    const novosDestinatarios = [...destinatariosAtuais];
    novosDestinatarios[index] = { 
      ...novosDestinatarios[index], 
      percentual: novoPercentual,
      valorCalculado: (novoPercentual / 100) * valorTotalAtual
    };
    form.setValue("destinatarios", novosDestinatarios);
  };

  const atualizarValorFixoDestinatario = (index: number, novoValorFixo: number) => {
    const novosDestinatarios = [...destinatariosAtuais];
    novosDestinatarios[index] = { 
      ...novosDestinatarios[index], 
      valorFixo: novoValorFixo,
      valorCalculado: novoValorFixo
    };
    form.setValue("destinatarios", novosDestinatarios);
  };

  const distribuirIgualitariamente = (destinatarios = destinatariosAtuais) => {
    if (destinatarios.length === 0) return;

    const percentualIgual = 100 / destinatarios.length;
    const valorIgual = valorTotalAtual / destinatarios.length;

    const novosDestinatarios = destinatarios.map(dest => ({
      ...dest,
      percentual: Number(percentualIgual.toFixed(2)),
      valorFixo: Number(valorIgual.toFixed(2)),
      valorCalculado: Number(valorIgual.toFixed(2))
    }));

    form.setValue("destinatarios", novosDestinatarios);
  };

  // Formatar status de rateio
  const formatarTipoRateio = (tipo: string) => {
    switch (tipo) {
      case "IGUALITARIO": return "Igualitário";
      case "PROPORCIONAL": return "Proporcional";
      case "MANUAL": return "Manual";
      case "MISTO": return "Misto";
      default: return tipo;
    }
  };

  // Formatar tipo de item
  const formatarTipoItem = (tipo: string) => {
    switch (tipo) {
      case "CUSTO": return "Custo";
      case "DESPESA": return "Despesa";
      case "TAXA": return "Taxa";
      default: return tipo;
    }
  };

  // Formatar tipo de vínculo
  const formatarTipoVinculo = (tipo: string) => {
    switch (tipo) {
      case "PRODUTO": return "Produto";
      case "SERVICO": return "Serviço";
      case "ALUGUEL": return "Aluguel";
      default: return tipo;
    }
  };

  // Calcular soma dos percentuais
  const somaPercentuais = destinatariosAtuais.reduce((acc, dest) => acc + (dest.percentual || 0), 0);

  // Calcular soma dos valores fixos
  const somaValoresFixos = destinatariosAtuais.reduce((acc, dest) => acc + (dest.valorFixo || 0), 0);

  // Verificar se o rateio está completo
  const rateioCompleto = tipoRateioAtual === "PROPORCIONAL" 
    ? Math.abs(somaPercentuais - 100) < 0.01 
    : tipoRateioAtual === "MANUAL" 
      ? Math.abs(somaValoresFixos - valorTotalAtual) < 0.01
      : true;

  // Calcular progresso do rateio
  const progressoRateio = tipoRateioAtual === "PROPORCIONAL" 
    ? somaPercentuais
    : tipoRateioAtual === "MANUAL" && valorTotalAtual > 0
      ? (somaValoresFixos / valorTotalAtual) * 100
      : 0;

  // Filtrar e paginar rateios
  const filteredRateios = rateios.filter((rateio) =>
    rateio.vinculoNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rateio.itemDescricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rateio.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pageCount = Math.ceil(filteredRateios.length / rateiosPerPage);
  const paginatedRateios = filteredRateios.slice(
    (currentPage - 1) * rateiosPerPage,
    currentPage * rateiosPerPage
  );

  // Envio do formulário
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editingRateio) {
      updateMutation.mutate({ ...values, id: editingRateio.id });
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {showForm ? "Novo Rateio" : "Cadastro de Rateios"}
          </h2>
          <p className="text-gray-500">
            {showForm
              ? "Defina os parâmetros para o novo rateio"
              : "Gerencie os rateios de custos, despesas e taxas"}
          </p>
        </div>
        <div className="flex space-x-2">
          {!showForm ? (
            <Button onClick={openFormForCreate} className="flex items-center bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Rateio
            </Button>
          ) : (
            <Button onClick={() => setShowForm(false)} className="flex items-center" variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar para Lista
            </Button>
          )}
        </div>
      </div>

      {!showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Rateios Cadastrados</CardTitle>
            <CardDescription>
              Lista de rateios configurados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2 mb-6">
              <div className="relative w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar rateios..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {paginatedRateios.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <Divide className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h2 className="text-xl font-medium text-gray-900 mb-2 text-center">
                  Nenhum rateio cadastrado
                </h2>
                <p className="text-gray-500 mb-5 text-center">
                  Cadastre seu primeiro rateio.
                </p>
                <Button
                  onClick={openFormForCreate}
                  className="bg-blue-600 hover:bg-blue-700 h-12 px-6"
                >
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Novo Rateio
                </Button>
              </div>
            )}

            {paginatedRateios.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vínculo</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Tipo de Rateio</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Destinatários</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRateios.map((rateio) => (
                      <TableRow key={rateio.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{rateio.vinculoNome}</div>
                            <div className="text-xs text-gray-500">{formatarTipoVinculo(rateio.vinculoTipo)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{rateio.itemDescricao}</div>
                            <Badge variant="outline" className="mt-1">
                              {formatarTipoItem(rateio.itemTipo)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`
                            ${rateio.tipoRateio === "IGUALITARIO" ? "bg-green-100 text-green-800" : 
                              rateio.tipoRateio === "PROPORCIONAL" ? "bg-blue-100 text-blue-800" :
                              rateio.tipoRateio === "MANUAL" ? "bg-amber-100 text-amber-800" :
                              "bg-purple-100 text-purple-800"}
                          `}>
                            {formatarTipoRateio(rateio.tipoRateio)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {rateio.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {rateio.destinatarios.length} destinatário(s)
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openFormForEdit(rateio)}
                            >
                              <Edit className="h-4 w-4 text-amber-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(rateio.id)}
                            >
                              <Trash className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between mt-4">
                  <Select
                    value={rateiosPerPage.toString()}
                    onValueChange={(value) => {
                      setRateiosPerPage(parseInt(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 w-[70px]">
                      <SelectValue placeholder="5" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 relative z-10">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span>
                    {paginatedRateios.length > 0 ? `${currentPage}/${Math.max(1, pageCount)}` : "0/0"}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                    disabled={currentPage === pageCount || pageCount === 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Paginação que aparece mesmo sem dados */}
            {paginatedRateios.length === 0 && (
              <div className="flex items-center justify-between mt-4">
                <Select
                  value={rateiosPerPage.toString()}
                  onValueChange={(value) => {
                    setRateiosPerPage(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 w-[70px]">
                    <SelectValue placeholder="5" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span>
                    {paginatedRateios.length > 0 ? `Página ${currentPage} de ${Math.max(1, pageCount)}` : "0/0"}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                    disabled={currentPage === pageCount || pageCount === 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{editingRateio ? "Editar Rateio" : "Novo Rateio"}</CardTitle>
                <CardDescription>
                  Preencha os campos abaixo para {editingRateio ? "atualizar o" : "criar um novo"} rateio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Seleção de Vínculo (Produto/Serviço/Aluguel) */}
                <div className="space-y-4">
                  <div className="text-lg font-semibold flex items-center text-blue-600">
                    <Package className="mr-2 h-5 w-5" />
                    Seleção de Vínculo
                  </div>

                  <div className="relative">
                    <FormField
                      control={form.control}
                      name="vinculoId"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Produto, Serviço ou Aluguel</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="Buscar produto, serviço ou aluguel..."
                                className="pl-8"
                                value={searchVinculo}
                                onChange={(e) => {
                                  setSearchVinculo(e.target.value);
                                  setShowVinculoDropdown(true);
                                }}
                                onFocus={() => setShowVinculoDropdown(true)}
                              />
                              {showVinculoDropdown && vinculoOptions.length > 0 && (
                                <div ref={vinculoDropdownRef} className="absolute z-[9999] w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-y-auto" style={{position: 'fixed', marginTop: '2px', width: '100%'}}>
                                  <div className="py-1">
                                    {vinculoOptions.map((option) => (
                                      <div
                                        key={option.id}
                                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex justify-between"
                                        onClick={() => handleSelectVinculo(option)}
                                      >
                                        <span>{option.nome}</span>
                                        <Badge variant="outline">{formatarTipoVinculo(option.tipo)}</Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {vinculoSelecionado && (
                                <div className="mt-2 p-2 border rounded-md flex justify-between items-center bg-blue-50">
                                  <div>
                                    <div className="font-medium">{vinculoSelecionado.nome}</div>
                                    <div className="text-xs text-gray-600">{formatarTipoVinculo(vinculoSelecionado.tipo)}</div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setVinculoSelecionado(null);
                                      form.setValue("vinculoId", "");
                                      form.setValue("vinculoNome", "");
                                      form.setValue("vinculoTipo", "PRODUTO");
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Seleção de Item (Custo/Despesa/Taxa) - apenas visível se um vínculo estiver selecionado */}
                {vinculoSelecionado && (
                  <div className="space-y-4">
                    <div className="text-lg font-semibold flex items-center text-amber-600">
                      <DollarSign className="mr-2 h-5 w-5" />
                      Seleção de Custo, Despesa ou Taxa
                    </div>

                    <div className="relative">
                      <FormField
                        control={form.control}
                        name="itemId"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Custo, Despesa ou Taxa</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                  placeholder="Buscar custo, despesa ou taxa..."
                                  className="pl-8"
                                  value={searchItem}
                                  onChange={(e) => {
                                    setSearchItem(e.target.value);
                                    setShowItemDropdown(true);
                                  }}
                                  onFocus={() => setShowItemDropdown(true)}
                                />
                                {showItemDropdown && itemOptions.length > 0 && (
                                  <div ref={itemDropdownRef} className="absolute z-[9999] w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-y-auto" style={{position: 'fixed', marginTop: '2px', width: '100%'}}>
                                    <div className="py-1">
                                      {itemOptions.map((option) => (
                                        <div
                                          key={option.id}
                                          className="px-4 py-2 hover:bg-amber-50 cursor-pointer"
                                          onClick={() => handleSelectItem(option)}
                                        >
                                          <div className="flex justify-between">
                                            <span>{option.descricao}</span>
                                            <Badge variant="outline">{formatarTipoItem(option.tipo)}</Badge>
                                          </div>
                                          <div className="text-sm text-gray-600 mt-1">
                                            {option.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {itemSelecionado && (
                                  <div className="mt-2 p-2 border rounded-md flex justify-between items-center bg-amber-50">
                                    <div>
                                      <div className="font-medium">{itemSelecionado.descricao}</div>
                                      <div className="flex space-x-2 items-center mt-1">
                                        <Badge variant="outline">{formatarTipoItem(itemSelecionado.tipo)}</Badge>
                                        <span className="text-sm">
                                          {itemSelecionado.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setItemSelecionado(null);
                                        form.setValue("itemId", "");
                                        form.setValue("itemDescricao", "");
                                        form.setValue("itemTipo", "CUSTO");
                                        form.setValue("valorTotal", 0);
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Definição do Rateio - apenas visível se um item estiver selecionado */}
                {itemSelecionado && (
                  <div className="space-y-4">
                    <div className="text-lg font-semibold flex items-center text-green-600">
                      <SplitSquareVertical className="mr-2 h-5 w-5" />
                      Definição do Rateio
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tipoRateio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Rateio</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo de rateio" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="IGUALITARIO">Igualitário</SelectItem>
                                <SelectItem value="PROPORCIONAL">Proporcional</SelectItem>
                                <SelectItem value="MANUAL">Manual</SelectItem>
                                <SelectItem value="MISTO">Misto</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Define como o valor será distribuído entre os destinatários
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="valorTotal"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Total a Ratear</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                value={field.value}
                              />
                            </FormControl>
                            <FormDescription>
                              Valor total que será dividido entre os destinatários
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="descricao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição do Rateio</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descreva o objetivo deste rateio..."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Uma descrição clara ajuda a identificar o propósito deste rateio
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Destinatários */}
                    <div className="space-y-4">
                      <div className="text-lg font-semibold flex items-center mt-4">
                        Destinatários
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        {/* Seleção de destinatário */}
                        <div className="lg:col-span-2">
                          <FormLabel>Destinatário</FormLabel>
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Buscar destinatário..."
                              className="pl-8"
                              value={searchDestinatario}
                              onChange={(e) => {
                                setSearchDestinatario(e.target.value);
                                setShowDestinatarioDropdown(true);
                              }}
                              onFocus={() => setShowDestinatarioDropdown(true)}
                            />
                            {showDestinatarioDropdown && destinatarioOptions.length > 0 && (
                              <div ref={destinatarioDropdownRef} className="absolute z-[100] w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-y-auto">
                                <div className="py-1">
                                  {destinatarioOptions.map((option) => (
                                    <div
                                      key={option.id}
                                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                                      onClick={() => handleSelectDestinatario(option)}
                                    >
                                      <div className="flex justify-between">
                                        <span>{option.nome}</span>
                                        <span className="text-gray-500 text-sm">{option.tipo}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {novoDestinatario.nome && (
                              <div className="mt-2 text-sm font-medium">
                                Selecionado: {novoDestinatario.nome} ({novoDestinatario.tipo})
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Campo de percentual (para rateio proporcional ou misto) */}
                        {(tipoRateioAtual === "PROPORCIONAL" || tipoRateioAtual === "MISTO") && (
                          <div>
                            <FormLabel>Percentual (%)</FormLabel>
                            <div className="flex items-center">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                value={novoDestinatario.percentual || ""}
                                onChange={(e) => setNovoDestinatario({
                                  ...novoDestinatario,
                                  percentual: Number(e.target.value),
                                  valorCalculado: (Number(e.target.value) / 100) * valorTotalAtual
                                })}
                              />
                              <Percent className="ml-2 h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        )}

                        {/* Campo de valor fixo (para rateio manual ou misto) */}
                        {(tipoRateioAtual === "MANUAL" || tipoRateioAtual === "MISTO") && (
                          <div>
                            <FormLabel>Valor Fixo (R$)</FormLabel>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              value={novoDestinatario.valorFixo || ""}
                              onChange={(e) => setNovoDestinatario({
                                ...novoDestinatario,
                                valorFixo: Number(e.target.value),
                                valorCalculado: Number(e.target.value)
                              })}
                            />
                          </div>
                        )}

                        {/* Botão para adicionar destinatário */}
                        <div className="flex items-end">
                          <Button
                            type="button"
                            onClick={adicionarDestinatario}
                            className="w-full"
                            disabled={!novoDestinatario.nome}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar Destinatário
                          </Button>
                        </div>
                      </div>

                      {/* Lista de destinatários */}
                      {destinatariosAtuais.length > 0 ? (
                        <div className="rounded-md border mt-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Destinatário</TableHead>
                                {(tipoRateioAtual === "PROPORCIONAL" || tipoRateioAtual === "MISTO" || tipoRateioAtual === "IGUALITARIO") && (
                                  <TableHead>Percentual</TableHead>
                                )}
                                {(tipoRateioAtual === "MANUAL" || tipoRateioAtual === "MISTO" || tipoRateioAtual === "IGUALITARIO") && (
                                  <TableHead>Valor Fixo</TableHead>
                                )}
                                <TableHead>Valor Calculado</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {destinatariosAtuais.map((dest, index) => (
                                <TableRow key={dest.id || index}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{dest.nome}</div>
                                      <div className="text-xs text-gray-500">{dest.tipo}</div>
                                    </div>
                                  </TableCell>

                                  {(tipoRateioAtual === "PROPORCIONAL" || tipoRateioAtual === "MISTO" || tipoRateioAtual === "IGUALITARIO") && (
                                    <TableCell>
                                      <div className="flex items-center">
                                        <Input
                                          type="number"
                                          step="0.01"
                                          className="w-20"
                                          value={dest.percentual || 0}
                                          onChange={(e) => atualizarPercentualDestinatario(index, Number(e.target.value))}
                                          disabled={tipoRateioAtual === "IGUALITARIO"}
                                        />
                                        <span className="ml-1">%</span>
                                      </div>
                                    </TableCell>
                                  )}

                                  {(tipoRateioAtual === "MANUAL" || tipoRateioAtual === "MISTO" || tipoRateioAtual === "IGUALITARIO") && (
                                    <TableCell>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        className="w-28"
                                        value={dest.valorFixo || 0}
                                        onChange={(e) => atualizarValorFixoDestinatario(index, Number(e.target.value))}
                                        disabled={tipoRateioAtual === "IGUALITARIO"}
                                      />
                                    </TableCell>
                                  )}

                                  <TableCell>
                                    <div className="font-medium">
                                      {dest.valorCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </div>
                                  </TableCell>

                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      type="button"
                                      onClick={() => removerDestinatario(index)}
                                    >
                                      <Trash className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="border rounded-md p-6 text-center text-gray-500">
                          Nenhum destinatário adicionado
                        </div>
                      )}

                      {/* Progresso do rateio */}
                      {destinatariosAtuais.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <div className="flex justify-between text-sm">
                            <span>
                              {tipoRateioAtual === "PROPORCIONAL" 
                                ? `Percentual alocado: ${somaPercentuais.toFixed(2)}%`
                                : tipoRateioAtual === "MANUAL"
                                ? `Valor alocado: ${somaValoresFixos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de ${valorTotalAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                                : tipoRateioAtual === "MISTO"
                                ? `Percentual: ${somaPercentuais.toFixed(2)}% | Valor: ${somaValoresFixos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                                : `Distribuição igualitária: ${(100 / destinatariosAtuais.length).toFixed(2)}% por destinatário`
                              }
                            </span>
                            <span className={rateioCompleto ? "text-green-600" : "text-amber-600"}>
                              {rateioCompleto 
                                ? "Rateio completo" 
                                : (tipoRateioAtual === "PROPORCIONAL" 
                                  ? "Soma deve ser 100%" 
                                  : tipoRateioAtual === "MANUAL" 
                                  ? "Valor deve igualar o total" 
                                  : "")
                              }
                            </span>
                          </div>
                          <Progress value={progressoRateio} className="h-2" />
                        </div>
                      )}

                      {/* Alerta para problemas no rateio */}
                      {destinatariosAtuais.length > 0 && (
                        <>
                          {!rateioCompleto && (tipoRateioAtual === "PROPORCIONAL" || tipoRateioAtual === "MANUAL") && (
                            <Alert className="bg-amber-50 border-amber-200">
                              <AlertCircleIcon className="h-4 w-4 text-amber-600" />
                              <AlertTitle className="text-amber-800">Atenção</AlertTitle>
                              <AlertDescription className="text-amber-700">
                                {tipoRateioAtual === "PROPORCIONAL" 
                                  ? `A soma dos percentuais deve ser 100%. Atual: ${somaPercentuais.toFixed(2)}%`
                                  : `A soma dos valores deve ser igual ao valor total. Faltam: ${(valorTotalAtual - somaValoresFixos).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                                }
                              </AlertDescription>
                            </Alert>
                          )}

                          {tipoRateioAtual === "IGUALITARIO" && (
                            <div className="flex justify-center">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => distribuirIgualitariamente()}
                                className="mt-2"
                              >
                                <Calculator className="mr-2 h-4 w-4" />
                                Redistribuir Igualitariamente
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end space-x-2 mt-6">
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={
                    !vinculoSelecionado || 
                    !itemSelecionado || 
                    destinatariosAtuais.length === 0 ||
                    (tipoRateioAtual === "PROPORCIONAL" && !rateioCompleto) ||
                    (tipoRateioAtual === "MANUAL" && !rateioCompleto) ||
                    form.formState.isSubmitting
                  }
                >
                  {form.formState.isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    "Salvar Rateio"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      )}
    </div>
  );
}