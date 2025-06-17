import React, { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { 
  Calculator, Edit, PlusCircle, Search, Trash, ChevronLeft, ChevronRight, 
  Loader2, Tag, Percent, Calendar, CalendarDays, Clock, Ticket, X 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "../../../components/ui/date-picker";
import { RegionSelector } from "@/components/ui/region-selector";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// Função para gerar código de cupom aleatório
function gerarCodigoCupom(): string {
  const prefixo = "PROMO";
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let resultado = prefixo;
  
  // Gera 6 caracteres aleatórios
  for (let i = 0; i < 6; i++) {
    resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  
  return resultado;
}

const promocaoSchema = z.object({
  vinculoId: z.string().optional(),
  vinculoNome: z.string().optional(),
  vinculoTipo: z.enum(["PRODUTO", "SERVICO", "ALUGUEL"]).optional(),
  categoria: z.enum([
    // Categorias principais
    "NOVOS", "USADOS", "ALUGUEIS", "SERVICOS",
    // Subcategorias de Novos
    "NOVOS_ELETRONICOS", "NOVOS_SMARTPHONES", "NOVOS_COMPUTADORES", "NOVOS_MOVEIS",
    // Subcategorias de Usados
    "USADOS_ELETRONICOS", "USADOS_SMARTPHONES", "USADOS_COMPUTADORES", "USADOS_MOVEIS",
    // Subcategorias de Serviços
    "SERVICOS_MANUTENCAO", "SERVICOS_INSTALACAO", "SERVICOS_CONSULTORIA",
    // Subcategorias de Aluguéis
    "ALUGUEIS_EQUIPAMENTOS", "ALUGUEIS_IMOVEIS", "ALUGUEIS_VEICULOS"
  ], {
    required_error: "A categoria é obrigatória",
  }),
  tipoPromocao: z.enum(["DESCONTO", "FRETE_GRATIS", "CUPOM"], {
    required_error: "O tipo de promoção é obrigatório",
  }).default("DESCONTO"),
  condicaoTipo: z.enum(["QUANTIDADE_MINIMA", "VALOR_MINIMO", "POR_REGIAO", "QUANTIDADE_MINIMA_POR_REGIAO", "VALOR_MINIMO_POR_REGIAO"]).optional(),
  valorMinimo: z.number().optional(),
  quantidadeMinima: z.number().optional(),
  regioesFrete: z.array(z.enum(["TODAS", "NORTE", "NORDESTE", "CENTRO_OESTE", "SUDESTE", "SUL"])).optional(),
  regioesCondicao: z.array(z.string()).optional(),
  regioes: z.array(z.enum(["TODAS", "NORTE", "NORDESTE", "CENTRO_OESTE", "SUDESTE", "SUL"])).optional(),
  aplicarTodaCategoria: z.boolean().default(false),
  tipoDesconto: z.enum(["PERCENTUAL", "VALOR_FIXO"]),
  descricao: z.string({
    required_error: "A descrição é obrigatória"
  }).min(3, "A descrição precisa ter pelo menos 3 caracteres"),
  valorDesconto: z.coerce.number({
    required_error: "O valor do desconto é obrigatório",
    invalid_type_error: "Valor precisa ser um número válido"
  }).min(0.01, "O valor precisa ser maior que zero"),
  observacoes: z.string().max(100, "Observações limitadas a 100 caracteres").optional(),
  temPeriodo: z.boolean().default(false),
  dataInicio: z.date().optional(),
  dataFim: z.date().optional(),
  codigoCupom: z.string().optional()
});

// Tipos de categorias suportadas
type CategoriaBase = "NOVOS" | "USADOS" | "ALUGUEIS" | "SERVICOS";
type SubcategoriaNovos = "NOVOS_ELETRONICOS" | "NOVOS_SMARTPHONES" | "NOVOS_COMPUTADORES" | "NOVOS_MOVEIS";
type SubcategoriaUsados = "USADOS_ELETRONICOS" | "USADOS_SMARTPHONES" | "USADOS_COMPUTADORES" | "USADOS_MOVEIS";
type SubcategoriaServicos = "SERVICOS_MANUTENCAO" | "SERVICOS_INSTALACAO" | "SERVICOS_CONSULTORIA";
type SubcategoriaAlugueis = "ALUGUEIS_EQUIPAMENTOS" | "ALUGUEIS_IMOVEIS" | "ALUGUEIS_VEICULOS";
type TipoCategoria = CategoriaBase | SubcategoriaNovos | SubcategoriaUsados | SubcategoriaServicos | SubcategoriaAlugueis;

interface Promocao {
  id: string;
  vinculoId: string;
  vinculoNome: string;
  vinculoTipo: "PRODUTO" | "SERVICO" | "ALUGUEL";
  categoria: TipoCategoria;
  tipoPromocao: "DESCONTO" | "FRETE_GRATIS" | "CUPOM";
  tipoDesconto: "PERCENTUAL" | "VALOR_FIXO";  // Removemos FRETE_GRATIS, agora é parte de tipoPromocao
  condicaoTipo: "QUANTIDADE_MINIMA" | "VALOR_MINIMO" | "POR_REGIAO" | "QUANTIDADE_MINIMA_POR_REGIAO" | "VALOR_MINIMO_POR_REGIAO";
  descricao: string;
  valorDesconto: number;
  quantidadeMinima?: number;
  valorMinimo?: number;
  regioes?: ("TODAS" | "NORTE" | "NORDESTE" | "CENTRO_OESTE" | "SUDESTE" | "SUL")[];
  regioesFrete?: ("TODAS" | "NORTE" | "NORDESTE" | "CENTRO_OESTE" | "SUDESTE" | "SUL")[];
  observacoes?: string;
  temPeriodo: boolean;
  dataInicio?: Date;
  dataFim?: Date;
  dataCriacao: Date;
  aplicarTodaCategoria?: boolean;
  codigoCupom?: string;
}

interface ItemVinculavel {
  id: string;
  nome: string;
  tipo: "PRODUTO" | "SERVICO" | "ALUGUEL";
  valorCusto?: number; // Valor de custo para produtos
  valorAtual?: number; // Valor atual para serviços e aluguéis
}

export default function CadastroPromocoesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingPromocao, setEditingPromocao] = useState<Promocao | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [promocoesPerPage, setPromocoesPerPage] = useState(5);
  const [vinculoSearchTerm, setVinculoSearchTerm] = useState("");
  const [categoriaAtual, setCategoriaAtual] = useState<string>("");
  const [showVinculoSuggestions, setShowVinculoSuggestions] = useState(false);
  const [showRegioesDropdown, setShowRegioesDropdown] = useState(false); // Added state for region dropdown
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({
    NOVOS: false,
    USADOS: false,
    SERVICOS: false,
    ALUGUEIS: false
  });

  const [codigoCupom, setCodigoCupom] = useState<string>("");
  const [editandoCupom, setEditandoCupom] = useState<boolean>(false);

  const form = useForm<z.infer<typeof promocaoSchema>>({
    resolver: zodResolver(promocaoSchema),
    defaultValues: {
      tipoPromocao: "DESCONTO",
      tipoDesconto: "PERCENTUAL",
      condicaoTipo: "QUANTIDADE_MINIMA",
      quantidadeMinima: 1,
      descricao: "",
      valorDesconto: 0,
      observacoes: "",
      vinculoTipo: undefined,
      vinculoId: "",
      vinculoNome: "",
      categoria: undefined, // Sem categoria padrão
      temPeriodo: false,
      dataInicio: undefined,
      dataFim: undefined,
      aplicarTodaCategoria: false,
      regioesFrete: [],
      regioes: [],
      codigoCupom: ""
    },
  });

  // Mock de dados para desenvolvimento
  const itensVinculaveisMock: ItemVinculavel[] = [
    // Produtos (alguns serão "novos" e outros "usados" com base na filtragem)
    { id: "1", nome: "iPhone 13", tipo: "PRODUTO", valorCusto: 3500.50 },
    { id: "2", nome: "MacBook Pro", tipo: "PRODUTO", valorCusto: 8900.00 },
    { id: "3", nome: "Smart TV 55\"", tipo: "PRODUTO", valorCusto: 2800.00 },
    { id: "4", nome: "Tablet Samsung Galaxy", tipo: "PRODUTO", valorCusto: 2200.00 },
    { id: "5", nome: "Câmera Digital Sony", tipo: "PRODUTO", valorCusto: 1500.00 },
    { id: "6", nome: "Fone de Ouvido JBL", tipo: "PRODUTO", valorCusto: 350.00 },
    { id: "7", nome: "Cadeira Gamer", tipo: "PRODUTO", valorCusto: 950.00 },
    { id: "8", nome: "Mesa de Escritório", tipo: "PRODUTO", valorCusto: 650.00 },
    
    // Serviços
    { id: "9", nome: "Manutenção de Notebook", tipo: "SERVICO", valorAtual: 150.00 },
    { id: "10", nome: "Instalação de Software", tipo: "SERVICO", valorAtual: 85.00 },
    { id: "11", nome: "Consultoria de TI", tipo: "SERVICO", valorAtual: 200.00 },
    { id: "12", nome: "Formatação de Computador", tipo: "SERVICO", valorAtual: 120.00 },
    { id: "13", nome: "Reparo de Smartphone", tipo: "SERVICO", valorAtual: 180.00 },
    { id: "14", nome: "Instalação de Rede", tipo: "SERVICO", valorAtual: 250.00 },
    
    // Aluguéis
    { id: "15", nome: "Sala Comercial", tipo: "ALUGUEL", valorAtual: 2800.00 },
    { id: "16", nome: "Equipamento de Som", tipo: "ALUGUEL", valorAtual: 500.00 },
    { id: "17", nome: "Veículo Utilitário", tipo: "ALUGUEL", valorAtual: 1800.00 },
    { id: "18", nome: "Apartamento", tipo: "ALUGUEL", valorAtual: 1500.00 },
    { id: "19", nome: "Projetor", tipo: "ALUGUEL", valorAtual: 300.00 },
    { id: "20", nome: "Impressora Industrial", tipo: "ALUGUEL", valorAtual: 700.00 },
  ];

  const { data: promocoes = [], isLoading } = useQuery<Promocao[]>({
    queryKey: ['promocoes'],
    queryFn: async () => {
      return promocoesMock;
    },
  });

  // Array vazio para iniciar com estado vazio
  const promocoesMock: Promocao[] = [];

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof promocaoSchema>) => {
      console.log("Salvando promoção:", data);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Promoção criada",
        description: "Promoção cadastrada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['promocoes'] });
      setShowForm(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof promocaoSchema> & { id: string }) => {
      console.log("Atualizando promoção:", data);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Promoção atualizada",
        description: "Promoção atualizada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['promocoes'] });
      setShowForm(false);
      setEditingPromocao(null);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log("Excluindo promoção:", id);
    },
    onSuccess: () => {
      toast({
        title: "Promoção excluída",
        description: "Promoção excluída com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['promocoes'] });
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const openFormForCreate = () => {
    setEditingPromocao(null);
    setCategoriaAtual(""); // Sem categoria padrão
    setVinculoSearchTerm(""); // Limpar o campo de busca de vínculo
    form.reset({
      tipoPromocao: "DESCONTO",
      tipoDesconto: "PERCENTUAL",
      condicaoTipo: "QUANTIDADE_MINIMA",
      quantidadeMinima: 1,
      descricao: "",
      valorDesconto: 0,
      observacoes: "",
      vinculoId: "",
      vinculoNome: "",
      vinculoTipo: "PRODUTO",
      categoria: undefined, // Sem categoria padrão
      temPeriodo: false,
      dataInicio: undefined,
      dataFim: undefined,
      aplicarTodaCategoria: false,
      regioesFrete: [],
      regioes: []
    });
    setShowForm(true);
  };

  const openFormForEdit = (promocao: Promocao) => {
    setEditingPromocao(promocao);
    setCategoriaAtual(promocao.categoria);
    setVinculoSearchTerm(promocao.vinculoNome); // Inicializar o termo de busca com o nome do vínculo
    
    // Se a promoção for do tipo CUPOM, carregue o código do cupom
    if (promocao.tipoPromocao === "CUPOM" && promocao.codigoCupom) {
      setCodigoCupom(promocao.codigoCupom);
    } else {
      setCodigoCupom("");
    }

    form.reset({
      tipoPromocao: promocao.tipoPromocao || "DESCONTO",
      tipoDesconto: promocao.tipoPromocao === "FRETE_GRATIS" ? "PERCENTUAL" : promocao.tipoDesconto,
      condicaoTipo: promocao.condicaoTipo || "QUANTIDADE_MINIMA",
      quantidadeMinima: promocao.quantidadeMinima,
      valorMinimo: promocao.valorMinimo,
      aplicarTodaCategoria: promocao.aplicarTodaCategoria || false,
      vinculoId: promocao.vinculoId,
      vinculoNome: promocao.vinculoNome,
      vinculoTipo: promocao.vinculoTipo,
      categoria: promocao.categoria,
      descricao: promocao.descricao,
      valorDesconto: promocao.valorDesconto,
      observacoes: promocao.observacoes,
      temPeriodo: promocao.temPeriodo,
      dataInicio: promocao.dataInicio,
      dataFim: promocao.dataFim,
      regioes: (promocao.regioes || []) as ("TODAS" | "NORTE" | "NORDESTE" | "CENTRO_OESTE" | "SUDESTE" | "SUL")[],
      regioesFrete: (promocao.regioesFrete || []) as ("TODAS" | "NORTE" | "NORDESTE" | "CENTRO_OESTE" | "SUDESTE" | "SUL")[]
    });
    setShowForm(true);
  };

  const filteredItensVinculaveis = itensVinculaveisMock.filter(item => {
    const categoriaFiltro = form.watch("categoria");
    const searchTerm = vinculoSearchTerm.trim().toLowerCase();
    const aplicarTodaCategoria = form.watch("aplicarTodaCategoria");

    // Se não houver categoria selecionada ou se aplicar a toda categoria, não mostra itens
    if (!categoriaFiltro || aplicarTodaCategoria) return false;

    // Filtra apenas pela categoria específica selecionada (sem mostrar itens das categorias pai)
    let matchesCategoria = false;
    
    // Para categorias principais
    if (categoriaFiltro === "NOVOS" && item.tipo === "PRODUTO") {
      matchesCategoria = true;
    } else if (categoriaFiltro === "USADOS" && item.tipo === "PRODUTO") {
      matchesCategoria = true;
    } else if (categoriaFiltro === "SERVICOS" && item.tipo === "SERVICO") {
      matchesCategoria = true;
    } else if (categoriaFiltro === "ALUGUEIS" && item.tipo === "ALUGUEL") {
      matchesCategoria = true;
    } 
    // Para subcategorias específicas de Produtos Novos
    else if (categoriaFiltro.startsWith("NOVOS_") && item.tipo === "PRODUTO") {
      // Lógica para filtrar apenas pela subcategoria específica
      // Aqui estamos simulando que cada item tem uma subcategoria específica
      // Na implementação real, o item teria uma propriedade subcategoria
      const subcategoriaFiltro = categoriaFiltro.replace("NOVOS_", "");
      // Simular que 25% dos produtos são de cada subcategoria com base no ID
      const itemId = parseInt(item.id);
      const subcategoriaItem = 
        itemId % 4 === 0 ? "ELETRONICOS" : 
        itemId % 4 === 1 ? "SMARTPHONES" : 
        itemId % 4 === 2 ? "COMPUTADORES" : "MOVEIS";
      
      matchesCategoria = subcategoriaItem === subcategoriaFiltro;
    }
    // Para subcategorias específicas de Produtos Usados
    else if (categoriaFiltro.startsWith("USADOS_") && item.tipo === "PRODUTO") {
      const subcategoriaFiltro = categoriaFiltro.replace("USADOS_", "");
      // Simular que 25% dos produtos são de cada subcategoria com base no ID
      const itemId = parseInt(item.id);
      const subcategoriaItem = 
        itemId % 4 === 0 ? "ELETRONICOS" : 
        itemId % 4 === 1 ? "SMARTPHONES" : 
        itemId % 4 === 2 ? "COMPUTADORES" : "MOVEIS";
      
      matchesCategoria = subcategoriaItem === subcategoriaFiltro;
    }
    // Para subcategorias específicas de Serviços
    else if (categoriaFiltro.startsWith("SERVICOS_") && item.tipo === "SERVICO") {
      const subcategoriaFiltro = categoriaFiltro.replace("SERVICOS_", "");
      // Simular que 33% dos serviços são de cada subcategoria
      const itemId = parseInt(item.id);
      const subcategoriaItem = 
        itemId % 3 === 0 ? "MANUTENCAO" : 
        itemId % 3 === 1 ? "INSTALACAO" : "CONSULTORIA";
      
      matchesCategoria = subcategoriaItem === subcategoriaFiltro;
    }
    // Para subcategorias específicas de Aluguéis
    else if (categoriaFiltro.startsWith("ALUGUEIS_") && item.tipo === "ALUGUEL") {
      const subcategoriaFiltro = categoriaFiltro.replace("ALUGUEIS_", "");
      // Simular que 33% dos aluguéis são de cada subcategoria
      const itemId = parseInt(item.id);
      const subcategoriaItem = 
        itemId % 3 === 0 ? "EQUIPAMENTOS" : 
        itemId % 3 === 1 ? "IMOVEIS" : "VEICULOS";
      
      matchesCategoria = subcategoriaItem === subcategoriaFiltro;
    }

    if (!matchesCategoria) return false;

    // Se não houver termo de busca, retorna todos os itens da categoria
    if (!searchTerm) return true;

    // Filtra pelo texto de busca
    return item.nome.toLowerCase().includes(searchTerm);
  });

  // Referências para fechar os selectores quando clicar fora
  const vinculoRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  // Efeito para fechar os dropdowns quando clicar fora deles
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Fechar dropdown de vínculos
      if (vinculoRef.current && !vinculoRef.current.contains(event.target as Node)) {
        setShowVinculoSuggestions(false);
      }
      
      // Fechar dropdown de categorias
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectVinculo = (item: ItemVinculavel) => {
    try {
      const condicaoTipo = form.getValues("condicaoTipo");
      
      // Atualiza os valores do formulário
      form.setValue("vinculoId", item.id, { 
        shouldValidate: true, 
        shouldDirty: true, 
        shouldTouch: true 
      });
      
      form.setValue("vinculoNome", item.nome, { 
        shouldValidate: true, 
        shouldDirty: true, 
        shouldTouch: true 
      });
      
      form.setValue("vinculoTipo", item.tipo, { 
        shouldValidate: true, 
        shouldDirty: true, 
        shouldTouch: true 
      });

      // Atualiza o termo de busca e fecha as sugestões
      setVinculoSearchTerm(item.nome);
      setShowVinculoSuggestions(false);

      // Mantém a categoria atual
      const currentCategoria = form.getValues("categoria");
      if (currentCategoria) {
        setCategoriaAtual(currentCategoria);
      }

      // Força a validação e atualização imediata do formulário
      form.trigger(["vinculoId", "vinculoNome", "vinculoTipo"]);

    } catch (error) {
      console.error("Erro ao selecionar vínculo:", error);
    }
  };

  // Filtrar e paginar promoções
  const filteredPromocoes = promocoes.filter((promocao) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    return promocao.descricao.toLowerCase().includes(term) ||
           promocao.vinculoNome.toLowerCase().includes(term);
  });

  const pageCount = Math.ceil(filteredPromocoes.length / promocoesPerPage);
  const paginatedPromocoes = filteredPromocoes.slice(
    (currentPage - 1) * promocoesPerPage,
    currentPage * promocoesPerPage
  );

  const onSubmit = (data: z.infer<typeof promocaoSchema>) => {
    // Se não foi especificado um período, remova as datas
    if (!data.temPeriodo) {
      data.dataInicio = undefined;
      data.dataFim = undefined;
    }
    
    // Inclui o código do cupom se o tipo de promoção for CUPOM
    if (data.tipoPromocao === "CUPOM") {
      data.codigoCupom = codigoCupom || gerarCodigoCupom();
    }

    if (editingPromocao) {
      // Adiciona o ID para a atualização
      updateMutation.mutate({ ...data, id: editingPromocao.id });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {showForm ? "Nova Promoção" : "Cadastro de Promoções"}
          </h2>
          <p className="text-gray-500">
            {showForm
              ? "Preencha os dados da nova promoção"
              : "Gerencie suas promoções e descontos"}
          </p>
        </div>
        <div className="flex space-x-2">
          {!showForm ? (
            <Button onClick={openFormForCreate} className="flex items-center bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Promoção
            </Button>
          ) : (
            <Button onClick={() => setShowForm(false)} className="flex items-center" variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar para Lista
            </Button>
          )}
        </div>
      </div>

      {showForm ? (
        <Card>
          <CardHeader className="relative">
            <CardTitle>{editingPromocao ? "Editar Promoção" : "Nova Promoção"}</CardTitle>
            <CardDescription>
              {editingPromocao
                ? "Edite os dados da promoção selecionada"
                : "Preencha os campos para criar uma nova promoção"}
            </CardDescription>
            
            {/* Tag do código de cupom no canto superior direito do CardHeader */}
            {form.watch("tipoPromocao") === "CUPOM" && (
              <div className="absolute top-6 right-8 z-20 flex items-center">
                <div 
                  className={`bg-blue-100 text-blue-800 rounded-md px-4 py-2 text-base font-medium flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg transition-shadow ${editandoCupom ? 'border-2 border-blue-400' : ''}`}
                  onClick={() => {
                    if (!editandoCupom) {
                      setEditandoCupom(true);
                      // Não gera código automático, permite que o usuário digite
                    }
                  }}
                >
                  <Ticket className="h-5 w-5" />
                  <span
                    className="text-lg ml-1"
                    contentEditable={editandoCupom}
                    suppressContentEditableWarning={true}
                    ref={(el) => {
                      if (editandoCupom && el) {
                        el.focus();
                        const range = document.createRange();
                        range.selectNodeContents(el);
                        const sel = window.getSelection();
                        if (sel) {
                          sel.removeAllRanges();
                          sel.addRange(range);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      setEditandoCupom(false);
                      const newValue = e.currentTarget.textContent || "";
                      setCodigoCupom(newValue);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setEditandoCupom(false);
                        const newValue = e.currentTarget.textContent || "";
                        setCodigoCupom(newValue);
                      }
                    }}
                  >
                    {codigoCupom || "Digite um código"}
                  </span>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-6">
                  {/* Primeira linha: Descrição */}
                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição da Promoção</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Ex: Black Friday 30% OFF"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Segunda linha: Tipo de promoção, condição e quantidade */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Tipo de Promoção */}
                    <FormField
                      control={form.control}
                      name="tipoPromocao"
                      defaultValue="DESCONTO"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Promoção</FormLabel>
                          <div className="relative">
                            <Select
                              value={field.value}
                              defaultValue="DESCONTO"
                              onValueChange={(value) => {
                                field.onChange(value);
                                if (value === "DESCONTO" || value === "CUPOM") {
                                  // Para Desconto e Cupom, garante que o campo de tipo de desconto esteja disponível
                                  form.setValue("regioesFrete", []);
                                  // Garante que tenha um valor de desconto
                                  if (!form.getValues("tipoDesconto")) {
                                    form.setValue("tipoDesconto", "PERCENTUAL");
                                  }
                                  
                                  // Se for Cupom, não gera um código automático
                                  // vamos permitir que o usuário digite seu próprio código
                                  if (value === "CUPOM") {
                                    setCodigoCupom(""); // Limpa qualquer código anterior
                                  }
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="DESCONTO">Desconto</SelectItem>
                                <SelectItem value="FRETE_GRATIS">Frete Grátis</SelectItem>
                                <SelectItem value="CUPOM">Cupom de Desconto</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Condição */}
                    <FormField
                      control={form.control}
                      name="condicaoTipo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condição</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue("valorMinimo", undefined);
                              form.setValue("quantidadeMinima", undefined);
                              form.setValue("regioesCondicao", []);
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a condição" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="QUANTIDADE_MINIMA">Quantidade Mínima</SelectItem>
                              <SelectItem value="VALOR_MINIMO">Valor Mínimo de Compra</SelectItem>
                              <SelectItem value="POR_REGIAO">Região</SelectItem>
                              <SelectItem value="QUANTIDADE_MINIMA_POR_REGIAO">Quantidade + Região</SelectItem>
                              <SelectItem value="VALOR_MINIMO_POR_REGIAO">Valor Mínimo + Região</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />



                    {/* Campos dinâmicos baseados na condição */}
                    <div className="grid grid-cols-1 gap-4">
                      {form.watch("condicaoTipo") === "QUANTIDADE_MINIMA" && (
                        <FormField
                          control={form.control}
                          name="quantidadeMinima"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantidade Mínima</FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="Ex: 5"
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    // Permite apenas números inteiros
                                    const value = e.target.value.replace(/[^\d]/g, '');
                                    // Converte para número ou mantém como string se vazio
                                    const numValue = value ? parseInt(value) : "";
                                    field.onChange(numValue);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {form.watch("condicaoTipo") === "QUANTIDADE_MINIMA_POR_REGIAO" && (
                        <div className="grid grid-cols-4 gap-4">
                          {/* Região com o novo seletor - ocupa 3/4 do espaço */}
                          <div className="col-span-3">
                            <FormField
                              control={form.control}
                              name="regioes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Regiões</FormLabel>
                                  <FormControl>
                                    <RegionSelector
                                      options={[
                                        { label: "Norte", value: "NORTE" },
                                        { label: "Nordeste", value: "NORDESTE" },
                                        { label: "Centro Oeste", value: "CENTRO_OESTE" },
                                        { label: "Sudeste", value: "SUDESTE" },
                                        { label: "Sul", value: "SUL" }
                                      ]}
                                      selected={field.value || []}
                                      onChange={field.onChange}
                                      placeholder="Selecione as regiões"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          {/* Quantidade mínima - ocupa 1/4 do espaço */}
                          <div className="col-span-1">
                            <FormField
                              control={form.control}
                              name="quantidadeMinima"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quantidade</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="text"
                                      placeholder="Ex: 5"
                                      value={field.value || ""}
                                      onChange={(e) => {
                                        // Permite apenas números inteiros
                                        const value = e.target.value.replace(/[^\d]/g, '');
                                        // Converte para número ou mantém como string se vazio
                                        const numValue = value ? parseInt(value) : "";
                                        field.onChange(numValue);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}

                      {form.watch("condicaoTipo") === "VALOR_MINIMO" && (
                        <FormField
                          control={form.control}
                          name="valorMinimo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor Mínimo de Compra</FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="Ex: 100.00"
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    // Permite apenas números e um ponto decimal
                                    const value = e.target.value.replace(/[^\d.]/g, '');
                                    // Converte para número ou mantém como string se vazio
                                    const numValue = value ? parseFloat(value) : "";
                                    field.onChange(numValue);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {form.watch("condicaoTipo") === "VALOR_MINIMO_POR_REGIAO" && (
                        <div className="grid grid-cols-4 gap-4">
                          {/* Região com o novo seletor - ocupa 3/4 do espaço */}
                          <div className="col-span-3">
                            <FormField
                              control={form.control}
                              name="regioes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Regiões</FormLabel>
                                  <FormControl>
                                    <RegionSelector
                                      options={[
                                        { label: "Norte", value: "NORTE" },
                                        { label: "Nordeste", value: "NORDESTE" },
                                        { label: "Centro Oeste", value: "CENTRO_OESTE" },
                                        { label: "Sudeste", value: "SUDESTE" },
                                        { label: "Sul", value: "SUL" }
                                      ]}
                                      selected={field.value || []}
                                      onChange={field.onChange}
                                      placeholder="Selecione as regiões"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          {/* Valor mínimo - ocupa 1/4 do espaço */}
                          <div className="col-span-1">
                            <FormField
                              control={form.control}
                              name="valorMinimo"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Valor Mínimo</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="text"
                                      placeholder="Ex: 100.00"
                                      value={field.value || ""}
                                      onChange={(e) => {
                                        // Permite apenas números e um ponto decimal
                                        const value = e.target.value.replace(/[^\d.]/g, '');
                                        // Converte para número ou mantém como string se vazio
                                        const numValue = value ? parseFloat(value) : "";
                                        field.onChange(numValue);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}

                      {/* Campo de seleção de regiões quando a condição é POR_REGIAO */}
                      {form.watch("condicaoTipo") === "POR_REGIAO" && (
                        <FormField
                          control={form.control}
                          name="regioes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Regiões</FormLabel>
                              <FormControl>
                                <RegionSelector
                                  options={[
                                    { label: "Norte", value: "NORTE" },
                                    { label: "Nordeste", value: "NORDESTE" },
                                    { label: "Centro Oeste", value: "CENTRO_OESTE" },
                                    { label: "Sudeste", value: "SUDESTE" },
                                    { label: "Sul", value: "SUL" }
                                  ]}
                                  selected={field.value || []}
                                  onChange={field.onChange}
                                  placeholder="Selecione as regiões"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>


                  </div>

                  {/* Segunda linha: Categoria e Item */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Categoria */}
                    <FormField
                      control={form.control}
                      name="categoria"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <div className="relative" ref={categoryRef}>
                            {/* Campo de seleção customizado */}
                            <div
                              onClick={() => setShowCategoryDropdown(prev => !prev)}
                              className={`flex items-center justify-between rounded-md border border-input px-3 py-2 text-sm bg-background ring-offset-background ${showCategoryDropdown ? 'ring-2 ring-ring ring-offset-2' : ''} ${!field.value ? 'text-muted-foreground' : ''}`}
                            >
                              {field.value ? (
                                <>
                                  {(() => {
                                    // Função para mostrar o caminho completo da categoria
                                    if (field.value.startsWith("NOVOS_")) {
                                      const subcategory = field.value.replace("NOVOS_", "");
                                      const subcategoryMap: Record<string, string> = {
                                        "ELETRONICOS": "Eletrônicos",
                                        "SMARTPHONES": "Smartphones",
                                        "COMPUTADORES": "Computadores",
                                        "MOVEIS": "Móveis"
                                      };
                                      return (
                                        <span>
                                          <span className="text-blue-600">Produtos Novos</span> &gt; {subcategoryMap[subcategory] || subcategory}
                                        </span>
                                      );
                                    } else if (field.value.startsWith("USADOS_")) {
                                      const subcategory = field.value.replace("USADOS_", "");
                                      const subcategoryMap: Record<string, string> = {
                                        "ELETRONICOS": "Eletrônicos",
                                        "SMARTPHONES": "Smartphones",
                                        "COMPUTADORES": "Computadores",
                                        "MOVEIS": "Móveis"
                                      };
                                      return (
                                        <span>
                                          <span className="text-blue-600">Produtos Usados</span> &gt; {subcategoryMap[subcategory] || subcategory}
                                        </span>
                                      );
                                    } else if (field.value.startsWith("SERVICOS_")) {
                                      const subcategory = field.value.replace("SERVICOS_", "");
                                      const subcategoryMap: Record<string, string> = {
                                        "MANUTENCAO": "Manutenção",
                                        "INSTALACAO": "Instalação",
                                        "CONSULTORIA": "Consultoria"
                                      };
                                      return (
                                        <span>
                                          <span className="text-blue-600">Serviços</span> &gt; {subcategoryMap[subcategory] || subcategory}
                                        </span>
                                      );
                                    } else if (field.value.startsWith("ALUGUEIS_")) {
                                      const subcategory = field.value.replace("ALUGUEIS_", "");
                                      const subcategoryMap: Record<string, string> = {
                                        "EQUIPAMENTOS": "Equipamentos",
                                        "IMOVEIS": "Imóveis",
                                        "VEICULOS": "Veículos"
                                      };
                                      return (
                                        <span>
                                          <span className="text-blue-600">Aluguéis</span> &gt; {subcategoryMap[subcategory] || subcategory}
                                        </span>
                                      );
                                    } else {
                                      const categoryMap: Record<string, string> = {
                                        "NOVOS": "Produtos Novos",
                                        "USADOS": "Produtos Usados",
                                        "SERVICOS": "Serviços",
                                        "ALUGUEIS": "Aluguéis"
                                      };
                                      return <span className="text-blue-600">{categoryMap[field.value] || field.value}</span>;
                                    }
                                  })()}
                                </>
                              ) : (
                                <span>Selecione uma categoria</span>
                              )}
                              <ChevronRight className={`ml-2 h-4 w-4 transition-transform ${showCategoryDropdown ? 'rotate-90' : ''}`} />
                            </div>

                            {/* Dropdown customizado com expansão de árvore */}
                            {showCategoryDropdown && (
                              <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                                <div className="max-h-[300px] overflow-y-auto p-1">
                                  {/* Categoria: Produtos Novos */}
                                  <div className="category-group">
                                    <div 
                                      className="category-parent flex items-center justify-between px-2 py-2 cursor-pointer hover:bg-gray-100 rounded-md"
                                      onClick={() => {
                                        setExpandedCategories(prev => ({
                                          ...prev,
                                          NOVOS: !prev.NOVOS
                                        }));
                                      }}
                                    >
                                      <div 
                                        className="flex-grow font-medium text-blue-600"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          field.onChange("NOVOS");
                                          form.setValue("vinculoId", "", { shouldValidate: true });
                                          form.setValue("vinculoNome", "", { shouldValidate: true });
                                          setVinculoSearchTerm("");
                                          setShowCategoryDropdown(false);
                                        }}
                                      >
                                        Produtos Novos
                                      </div>
                                      <ChevronRight className={`h-4 w-4 transition-transform ${expandedCategories.NOVOS ? 'rotate-90' : ''}`} />
                                    </div>
                                    
                                    {/* Subcategorias de Produtos Novos */}
                                    {expandedCategories.NOVOS && (
                                      <div className="pl-4 mt-1 space-y-1">
                                        <div 
                                          className="px-2 py-1 cursor-pointer hover:bg-gray-100 rounded-md"
                                          onClick={() => {
                                            field.onChange("NOVOS_ELETRONICOS");
                                            form.setValue("vinculoId", "", { shouldValidate: true });
                                            form.setValue("vinculoNome", "", { shouldValidate: true });
                                            setVinculoSearchTerm("");
                                            setShowCategoryDropdown(false);
                                          }}
                                        >
                                          ↳ Eletrônicos
                                        </div>
                                        <div 
                                          className="px-2 py-1 cursor-pointer hover:bg-gray-100 rounded-md"
                                          onClick={() => {
                                            field.onChange("NOVOS_SMARTPHONES");
                                            form.setValue("vinculoId", "", { shouldValidate: true });
                                            form.setValue("vinculoNome", "", { shouldValidate: true });
                                            setVinculoSearchTerm("");
                                            setShowCategoryDropdown(false);
                                          }}
                                        >
                                          ↳ Smartphones
                                        </div>
                                        <div 
                                          className="px-2 py-1 cursor-pointer hover:bg-gray-100 rounded-md"
                                          onClick={() => {
                                            field.onChange("NOVOS_COMPUTADORES");
                                            form.setValue("vinculoId", "", { shouldValidate: true });
                                            form.setValue("vinculoNome", "", { shouldValidate: true });
                                            setVinculoSearchTerm("");
                                            setShowCategoryDropdown(false);
                                          }}
                                        >
                                          ↳ Computadores
                                        </div>
                                        <div 
                                          className="px-2 py-1 cursor-pointer hover:bg-gray-100 rounded-md"
                                          onClick={() => {
                                            field.onChange("NOVOS_MOVEIS");
                                            form.setValue("vinculoId", "", { shouldValidate: true });
                                            form.setValue("vinculoNome", "", { shouldValidate: true });
                                            setVinculoSearchTerm("");
                                            setShowCategoryDropdown(false);
                                          }}
                                        >
                                          ↳ Móveis
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Categoria: Produtos Usados */}
                                  <div className="category-group mt-2">
                                    <div 
                                      className="category-parent flex items-center justify-between px-2 py-2 cursor-pointer hover:bg-gray-100 rounded-md"
                                      onClick={() => {
                                        setExpandedCategories(prev => ({
                                          ...prev,
                                          USADOS: !prev.USADOS
                                        }));
                                      }}
                                    >
                                      <div 
                                        className="flex-grow font-medium text-blue-600"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          field.onChange("USADOS");
                                          form.setValue("vinculoId", "", { shouldValidate: true });
                                          form.setValue("vinculoNome", "", { shouldValidate: true });
                                          setVinculoSearchTerm("");
                                          setShowCategoryDropdown(false);
                                        }}
                                      >
                                        Produtos Usados
                                      </div>
                                      <ChevronRight className={`h-4 w-4 transition-transform ${expandedCategories.USADOS ? 'rotate-90' : ''}`} />
                                    </div>
                                    
                                    {/* Subcategorias de Produtos Usados */}
                                    {expandedCategories.USADOS && (
                                      <div className="pl-4 mt-1 space-y-1">
                                        <div 
                                          className="px-2 py-1 cursor-pointer hover:bg-gray-100 rounded-md"
                                          onClick={() => {
                                            field.onChange("USADOS_ELETRONICOS");
                                            form.setValue("vinculoId", "", { shouldValidate: true });
                                            form.setValue("vinculoNome", "", { shouldValidate: true });
                                            setVinculoSearchTerm("");
                                            setShowCategoryDropdown(false);
                                          }}
                                        >
                                          ↳ Eletrônicos
                                        </div>
                                        <div 
                                          className="px-2 py-1 cursor-pointer hover:bg-gray-100 rounded-md"
                                          onClick={() => {
                                            field.onChange("USADOS_SMARTPHONES");
                                            form.setValue("vinculoId", "", { shouldValidate: true });
                                            form.setValue("vinculoNome", "", { shouldValidate: true });
                                            setVinculoSearchTerm("");
                                            setShowCategoryDropdown(false);
                                          }}
                                        >
                                          ↳ Smartphones
                                        </div>
                                        <div 
                                          className="px-2 py-1 cursor-pointer hover:bg-gray-100 rounded-md"
                                          onClick={() => {
                                            field.onChange("USADOS_COMPUTADORES");
                                            form.setValue("vinculoId", "", { shouldValidate: true });
                                            form.setValue("vinculoNome", "", { shouldValidate: true });
                                            setVinculoSearchTerm("");
                                            setShowCategoryDropdown(false);
                                          }}
                                        >
                                          ↳ Computadores
                                        </div>
                                        <div 
                                          className="px-2 py-1 cursor-pointer hover:bg-gray-100 rounded-md"
                                          onClick={() => {
                                            field.onChange("USADOS_MOVEIS");
                                            form.setValue("vinculoId", "", { shouldValidate: true });
                                            form.setValue("vinculoNome", "", { shouldValidate: true });
                                            setVinculoSearchTerm("");
                                            setShowCategoryDropdown(false);
                                          }}
                                        >
                                          ↳ Móveis
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Categoria: Serviços */}
                                  <div className="category-group mt-2">
                                    <div 
                                      className="category-parent flex items-center justify-between px-2 py-2 cursor-pointer hover:bg-gray-100 rounded-md"
                                      onClick={() => {
                                        setExpandedCategories(prev => ({
                                          ...prev,
                                          SERVICOS: !prev.SERVICOS
                                        }));
                                      }}
                                    >
                                      <div 
                                        className="flex-grow font-medium text-blue-600"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          field.onChange("SERVICOS");
                                          form.setValue("vinculoId", "", { shouldValidate: true });
                                          form.setValue("vinculoNome", "", { shouldValidate: true });
                                          setVinculoSearchTerm("");
                                          setShowCategoryDropdown(false);
                                        }}
                                      >
                                        Serviços
                                      </div>
                                      <ChevronRight className={`h-4 w-4 transition-transform ${expandedCategories.SERVICOS ? 'rotate-90' : ''}`} />
                                    </div>
                                    
                                    {/* Subcategorias de Serviços */}
                                    {expandedCategories.SERVICOS && (
                                      <div className="pl-4 mt-1 space-y-1">
                                        <div 
                                          className="px-2 py-1 cursor-pointer hover:bg-gray-100 rounded-md"
                                          onClick={() => {
                                            field.onChange("SERVICOS_MANUTENCAO");
                                            form.setValue("vinculoId", "", { shouldValidate: true });
                                            form.setValue("vinculoNome", "", { shouldValidate: true });
                                            setVinculoSearchTerm("");
                                            setShowCategoryDropdown(false);
                                          }}
                                        >
                                          ↳ Manutenção
                                        </div>
                                        <div 
                                          className="px-2 py-1 cursor-pointer hover:bg-gray-100 rounded-md"
                                          onClick={() => {
                                            field.onChange("SERVICOS_INSTALACAO");
                                            form.setValue("vinculoId", "", { shouldValidate: true });
                                            form.setValue("vinculoNome", "", { shouldValidate: true });
                                            setVinculoSearchTerm("");
                                            setShowCategoryDropdown(false);
                                          }}
                                        >
                                          ↳ Instalação
                                        </div>
                                        <div 
                                          className="px-2 py-1 cursor-pointer hover:bg-gray-100 rounded-md"
                                          onClick={() => {
                                            field.onChange("SERVICOS_CONSULTORIA");
                                            form.setValue("vinculoId", "", { shouldValidate: true });
                                            form.setValue("vinculoNome", "", { shouldValidate: true });
                                            setVinculoSearchTerm("");
                                            setShowCategoryDropdown(false);
                                          }}
                                        >
                                          ↳ Consultoria
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Categoria: Aluguéis */}
                                  <div className="category-group mt-2">
                                    <div 
                                      className="category-parent flex items-center justify-between px-2 py-2 cursor-pointer hover:bg-gray-100 rounded-md"
                                      onClick={() => {
                                        setExpandedCategories(prev => ({
                                          ...prev,
                                          ALUGUEIS: !prev.ALUGUEIS
                                        }));
                                      }}
                                    >
                                      <div 
                                        className="flex-grow font-medium text-blue-600"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          field.onChange("ALUGUEIS");
                                          form.setValue("vinculoId", "", { shouldValidate: true });
                                          form.setValue("vinculoNome", "", { shouldValidate: true });
                                          setVinculoSearchTerm("");
                                          setShowCategoryDropdown(false);
                                        }}
                                      >
                                        Aluguéis
                                      </div>
                                      <ChevronRight className={`h-4 w-4 transition-transform ${expandedCategories.ALUGUEIS ? 'rotate-90' : ''}`} />
                                    </div>
                                    
                                    {/* Subcategorias de Aluguéis */}
                                    {expandedCategories.ALUGUEIS && (
                                      <div className="pl-4 mt-1 space-y-1">
                                        <div 
                                          className="px-2 py-1 cursor-pointer hover:bg-gray-100 rounded-md"
                                          onClick={() => {
                                            field.onChange("ALUGUEIS_EQUIPAMENTOS");
                                            form.setValue("vinculoId", "", { shouldValidate: true });
                                            form.setValue("vinculoNome", "", { shouldValidate: true });
                                            setVinculoSearchTerm("");
                                            setShowCategoryDropdown(false);
                                          }}
                                        >
                                          ↳ Equipamentos
                                        </div>
                                        <div 
                                          className="px-2 py-1 cursor-pointer hover:bg-gray-100 rounded-md"
                                          onClick={() => {
                                            field.onChange("ALUGUEIS_IMOVEIS");
                                            form.setValue("vinculoId", "", { shouldValidate: true });
                                            form.setValue("vinculoNome", "", { shouldValidate: true });
                                            setVinculoSearchTerm("");
                                            setShowCategoryDropdown(false);
                                          }}
                                        >
                                          ↳ Imóveis
                                        </div>
                                        <div 
                                          className="px-2 py-1 cursor-pointer hover:bg-gray-100 rounded-md"
                                          onClick={() => {
                                            field.onChange("ALUGUEIS_VEICULOS");
                                            form.setValue("vinculoId", "", { shouldValidate: true });
                                            form.setValue("vinculoNome", "", { shouldValidate: true });
                                            setVinculoSearchTerm("");
                                            setShowCategoryDropdown(false);
                                          }}
                                        >
                                          ↳ Veículos
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Campo de vínculo com produto/serviço/aluguel */}
                    <div className="relative" ref={vinculoRef}>
                    <FormField
                      control={form.control}
                      name="vinculoNome"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Item (Produto/Serviço/Aluguel)</FormLabel>
                          <div className="relative">
                            <div className="flex items-center gap-2">
                              <FormControl className="flex-1">
                                <div className="relative">
                                  <Input
                                    {...field}
                                    placeholder={form.watch("categoria") ? "Buscar item..." : "Selecione uma categoria primeiro"}
                                    value={vinculoSearchTerm}
                                    onChange={(e) => {
                                      setVinculoSearchTerm(e.target.value);
                                      setShowVinculoSuggestions(true);
                                    }}
                                    onFocus={() => setShowVinculoSuggestions(true)}
                                    disabled={!form.watch("categoria") || form.watch("aplicarTodaCategoria")}
                                  />
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <FormField
                                      control={form.control}
                                      name="aplicarTodaCategoria"
                                      render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                          <FormControl>
                                            <Checkbox
                                              checked={field.value}
                                              disabled={!form.watch("categoria")}
                                              onCheckedChange={(checked) => {
                                                field.onChange(checked);
                                                if (checked) {
                                                  form.setValue("vinculoId", "", { shouldValidate: true });
                                                  form.setValue("vinculoNome", "", { shouldValidate: true });
                                                  form.setValue("vinculoTipo", undefined, { shouldValidate: true });
                                                  setVinculoSearchTerm("");
                                                  setShowVinculoSuggestions(false);
                                                }
                                              }}
                                            />
                                          </FormControl>
                                          <div className="text-xs text-gray-500">
                                            Toda categoria
                                          </div>
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </div>
                              </FormControl>
                            </div>
                            <FormMessage />
                          </div>
                          {showVinculoSuggestions && filteredItensVinculaveis.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg border">
                              <ul className="max-h-60 overflow-auto rounded-md py-1 text-base">
                                {filteredItensVinculaveis.map((item) => (
                                  <li
                                    key={item.id}
                                    className="cursor-pointer select-none px-3 py-2 hover:bg-gray-100"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleSelectVinculo(item);
                                    }}
                                  >
                                    <div className="flex justify-between">
                                      <span>{item.nome}</span>
                                      <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                                        {item.tipo === "PRODUTO" ? "Produto" : 
                                          item.tipo === "SERVICO" ? "Serviço" : "Aluguel"}
                                      </span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                    </div>
                  </div>

                  {/* Linha adicional: Período da Promoção */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Seletor de Período */}
                    <FormField
                      control={form.control}
                      name="temPeriodo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Período da Promoção</FormLabel>
                          <Select
                            value={field.value ? "determinado" : "indeterminado"}
                            onValueChange={(value) => {
                              const temPeriodo = value === "determinado";
                              field.onChange(temPeriodo);
                              if (!temPeriodo) {
                                form.setValue("dataInicio", undefined);
                                form.setValue("dataFim", undefined);
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o período" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="determinado">Período Determinado</SelectItem>
                              <SelectItem value="indeterminado">Tempo Indeterminado</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Data de Início - sempre visível, mas desativado quando não é período determinado */}
                    <FormField
                      control={form.control}
                      name="dataInicio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Início</FormLabel>
                          <FormControl>
                            <DatePicker
                              date={field.value}
                              setDate={field.onChange}
                              disabled={!form.watch("temPeriodo")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Data de Término - sempre visível, mas desativado quando não é período determinado */}
                    <FormField
                      control={form.control}
                      name="dataFim"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Término</FormLabel>
                          <FormControl>
                            <DatePicker
                              date={field.value}
                              setDate={field.onChange}
                              disabled={!form.watch("temPeriodo")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Terceira linha: Tipo de Desconto e Valor */}
                  <div className="grid grid-cols-2 gap-4">

                    {/* Tipo de Desconto - Mostrado para DESCONTO e CUPOM */}
                    {(form.watch("tipoPromocao") === "DESCONTO" || form.watch("tipoPromocao") === "CUPOM") && (
                      <>
                        <FormField
                          control={form.control}
                          name="tipoDesconto"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Desconto</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent
                                  position="popper" 
                                  side="bottom" 
                                  sideOffset={4}
                                  className="max-h-[180px] overflow-y-auto"
                                >
                                  <SelectItem value="PERCENTUAL">Percentual (%)</SelectItem>
                                  <SelectItem value="VALOR_FIXO">Valor Fixo (R$)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Valor do Desconto - mostrado para promoções de DESCONTO e CUPOM */}
                        <FormField
                          control={form.control}
                          name="valorDesconto"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {form.watch("tipoDesconto") === "PERCENTUAL" 
                                  ? "Percentual de Desconto (%)" 
                                  : "Valor do Desconto (R$)"}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="text"
                                  placeholder={form.watch("tipoDesconto") === "PERCENTUAL" ? "Ex: 10.5" : "Ex: 49.90"}
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    // Permite apenas números e um ponto decimal
                                    const value = e.target.value.replace(/[^\d.]/g, '');
                                    // Converte para número ou mantém como string se vazio
                                    const numValue = value ? parseFloat(value) : 0;
                                    field.onChange(numValue);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {/* Campo de Frete Grátis foi removido conforme solicitado */}
                  </div>

                  {/* Observações (opcional) */}
                  <FormField
                    control={form.control}
                    name="observacoes"
                    render={({ field }) => (
                      <FormItem className="col-span-1 md:col-span-2">
                        <FormLabel>Observações (opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Informações adicionais sobre a promoção..."
                            className="min-h-[80px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Removidos campos de período do fim do formulário - agora estão após o campo de item */}
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingPromocao ? "Atualizar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    ) : (
      <Card>
        <CardHeader>
          <CardTitle>Promoções Cadastradas</CardTitle>
          <CardDescription>
            Lista de promoções e descontos ativos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-2 mb-6">
            <div className="relative w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar promoções..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}

          {!isLoading && (
            <div>
              {paginatedPromocoes.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor/Percentual</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Item Vinculado</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPromocoes.map((promocao) => (
                        <TableRow key={promocao.id}>
                          <TableCell className="font-medium">{promocao.descricao}</TableCell>
                          <TableCell>
                            {promocao.tipoPromocao === "CUPOM" ? (
                              <span className="flex items-center gap-1">
                                <Ticket className="h-3.5 w-3.5 text-blue-600" />
                                Cupom: {promocao.codigoCupom}
                              </span>
                            ) : (
                              promocao.tipoDesconto === "PERCENTUAL" ? "Percentual" : "Valor Fixo"
                            )}
                          </TableCell>
                          <TableCell>
                            {promocao.tipoDesconto === "PERCENTUAL" 
                              ? `${promocao.valorDesconto}%` 
                              : promocao.valorDesconto.toLocaleString('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL' 
                                })}
                          </TableCell>
                          <TableCell>
                            {promocao.temPeriodo && promocao.dataInicio && promocao.dataFim
                              ? `${new Date(promocao.dataInicio).toLocaleDateString()} até ${new Date(promocao.dataFim).toLocaleDateString()}`
                              : "Sem período definido"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{promocao.aplicarTodaCategoria ? "Todos os itens" : promocao.vinculoNome}</span>
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {promocao.categoria === "NOVOS" 
                                  ? "Produto Novo" 
                                  : promocao.categoria === "USADOS" 
                                  ? "Produto Usado" 
                                  : promocao.categoria === "SERVICOS" 
                                  ? "Serviço" 
                                  : "Aluguel"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openFormForEdit(promocao)}
                              >
                                <Edit className="h-4 w-4 text-amber-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(promocao.id)}
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
                      value={promocoesPerPage.toString()}
                      onValueChange={(value) => {
                        setPromocoesPerPage(parseInt(value));
                        setCurrentPage(1);
                      }}
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
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-md"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="text-sm">
                        Página{" "}
                        <span className="font-semibold">{currentPage}</span> de{" "}
                        <span className="font-semibold">{Math.max(1, pageCount)}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-md"
                        onClick={() => 
                          setCurrentPage((prev) => Math.min(prev + 1, pageCount))
                        }
                        disabled={currentPage === pageCount || pageCount === 0}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex flex-col items-center justify-center py-12">
                    {searchTerm ? (
                      <>
                        <Tag className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1 text-center">
                          Nenhuma promoção encontrada
                        </h3>
                        <p className="text-gray-500 mb-4 text-center">
                          Nenhuma promoção encontrada com os critérios de busca.
                        </p>
                      </>
                    ) : (
                      <>
                        <Tag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                        <h2 className="text-xl font-medium text-gray-900 mb-2 text-center">
                          Nenhuma promoção cadastrada
                        </h2>
                        <p className="text-gray-500 mb-5 text-center">
                          Cadastre sua primeira promoção.
                        </p>
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700 h-12 px-6"
                          onClick={openFormForCreate}
                        >
                          <PlusCircle className="mr-2 h-5 w-5" />
                          Nova Promoção
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <Select
                      value={promocoesPerPage.toString()}
                      onValueChange={(value) => {
                        setPromocoesPerPage(parseInt(value));
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
                        {paginatedPromocoes.length > 0 ? `${currentPage}/${Math.max(1, pageCount)}` : "0/0"}
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
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )}
  </div>
  );
}