import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Edit, Trash, PlusCircle, Search, Package, ShoppingBag,
  ChevronLeft, ChevronRight, Loader2
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
// FormMessage personalizado que não exibe mensagens de erro
const FormMessage = () => null;

// Componente para exibir mensagens de erro
const FormErrorMessage = ({ message }: { message: string }) => (
  <div className="text-sm font-medium text-destructive mt-1">{message}</div>
);
import { useToast, toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/utils";

interface Produto {
  id: number;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  valorCusto: string;
  frete: string | null;
  tipo: "novo" | "usado";
  estadoConservacao: string | null;
  userId: number | null;
  createdAt: string;
  updatedAt: string;
}

// Schema de validação com Zod
const produtoSchema = z.object({
  nome: z.string().min(1, { message: "Nome é obrigatório" }),
  codigo: z.string().nullable().optional(),
  descricao: z.string().nullable().optional(),
  valorCusto: z.string().min(1, { message: "Valor do custo é obrigatório" }).refine(
    (val) => !isNaN(parseFloat(val.replace(",", "."))), 
    { message: "Valor deve ser um número válido" }
  ),
  frete: z.string().nullable().optional(),
  tipo: z.enum(["novo", "usado"], {
    required_error: "Selecione o tipo de produto",
  }),
  estadoConservacao: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof produtoSchema>;

const opcoesEstadoConservacao = [
  { value: "novo", label: "Novo" },
  { value: "excelente", label: "Excelente" },
  { value: "otimo", label: "Ótimo" },
  { value: "bom", label: "Bom" },
  { value: "regular", label: "Regular" },
  { value: "ruim", label: "Ruim" },
];

export default function CadastroProdutosUnificadoPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [tipoProduto, setTipoProduto] = useState<string>("novo");
  
  // Estado para rastrear erros de campos específicos
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(produtoSchema),
    defaultValues: {
      nome: "",
      codigo: null,
      descricao: null,
      valorCusto: "",
      frete: null,
      tipo: "novo",
      estadoConservacao: null,
    },
  });

  // Consulta de produtos
  const { data: produtos = [], isLoading } = useQuery<Produto[]>({
    queryKey: ["/api/produtos", user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/produtos?userId=${user?.id || 0}`);
      return response.json();
    },
    enabled: !!user,
  });

  // Mutações
  const createProdutoMutation = useMutation<Produto, Error, Omit<Produto, 'id' | 'createdAt' | 'updatedAt'>>({
    mutationFn: async (data) => {
      const response = await apiRequest("POST", "/api/produtos", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Produto criado",
        description: "Produto cadastrado com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/produtos"] });
      setShowForm(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProdutoMutation = useMutation<Produto, Error, { id: number; data: Omit<Produto, 'id' | 'createdAt' | 'updatedAt'> }>({
    mutationFn: async ({ id, data }) => {
      const response = await apiRequest("PUT", `/api/produtos/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Produto atualizado",
        description: "Produto atualizado com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/produtos"] });
      setShowForm(false);
      setEditingProduto(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProdutoMutation = useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiRequest("DELETE", `/api/produtos/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Produto excluído",
        description: "Produto excluído com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/produtos"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Efeito para carregar dados no formulário ao editar
  useEffect(() => {
    if (editingProduto) {
      setTipoProduto(editingProduto.tipo);
    }
  }, [editingProduto]);

  // Efeito para resetar form quando campo tipo é alterado
  useEffect(() => {
    form.setValue("estadoConservacao", null);
  }, [tipoProduto, form]);

  const openFormForEdit = (produto: Produto) => {
    setEditingProduto(produto);
    form.reset({
      nome: produto.nome,
      codigo: produto.codigo,
      descricao: produto.descricao,
      valorCusto: produto.valorCusto,
      frete: produto.frete,
      tipo: produto.tipo,
      estadoConservacao: produto.estadoConservacao,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este produto?")) {
      deleteProdutoMutation.mutate(id);
    }
  };

  const handleFormSubmit = () => {
    const values = form.getValues();
    const errors: Record<string, string> = {};
    
    // Validação simples
    if (!values.nome || values.nome.trim() === "") {
      errors.nome = "Nome é obrigatório";
    }
    
    if (!values.valorCusto || values.valorCusto.trim() === "") {
      errors.valorCusto = "Valor de custo é obrigatório";
    } else if (isNaN(parseFloat(values.valorCusto.replace(",", ".")))) {
      errors.valorCusto = "O valor de custo deve ser um número válido";
    }
    
    // Se houver erros, exibe-os e não continua
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      
      toast({
        title: "Preencha os campos obrigatórios",
        description: "Verifique os campos destacados em vermelho.",
        variant: "destructive",
      });
      
      return;
    }

    const produtoData = {
      ...values,
      userId: user?.id || null,
    };

    if (editingProduto) {
      updateProdutoMutation.mutate({ id: editingProduto.id, data: produtoData });
    } else {
      createProdutoMutation.mutate(produtoData);
    }
  };

  const openFormForCreate = () => {
    setEditingProduto(null);
    setTipoProduto("novo");
    form.reset({
      nome: "",
      codigo: null,
      descricao: null,
      valorCusto: "",
      frete: null,
      tipo: "novo",
      estadoConservacao: null,
    });
    setFormErrors({});
    setShowForm(true);
  };

  // Filtrar e paginar produtos
  const filteredProdutos = produtos.filter((produto) => {
    const matchesSearchTerm = 
      produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (produto.descricao && produto.descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (produto.codigo && produto.codigo.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTipo = filtroTipo ? produto.tipo === filtroTipo : true;
    
    return matchesSearchTerm && matchesTipo;
  });

  const pageCount = Math.ceil(filteredProdutos.length / itemsPerPage);
  const paginatedProdutos = filteredProdutos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Navegação entre páginas
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < pageCount) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {showForm ? (editingProduto ? "Editar Produto" : "Novo Produto") : "Cadastro de Produtos"}
          </h2>
          <p className="text-gray-500">
            {showForm
              ? (editingProduto ? "Edite as informações do produto" : "Preencha os dados do novo produto")
              : "Gerencie produtos novos e usados em um único lugar"}
          </p>
        </div>
        <div className="flex space-x-2">
          {!showForm ? (
            <Button onClick={openFormForCreate} className="flex items-center bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Produto
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
            <CardTitle>Produtos Cadastrados</CardTitle>
            <CardDescription>
              Lista completa de produtos novos e usados
            </CardDescription>
          </CardHeader>
          <CardContent>
          <div className="mt-2 mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative w-full sm:w-auto sm:flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar produtos..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={filtroTipo || "todos"}
              onValueChange={(value) => setFiltroTipo(value === "todos" ? null : value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="novo">Produtos Novos</SelectItem>
                <SelectItem value="usado">Produtos Usados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {paginatedProdutos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  {searchTerm || filtroTipo ? (
                    <>
                      <ShoppingBag className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1 text-center">
                        Nenhum produto encontrado
                      </h3>
                      <p className="text-gray-500 mb-4 text-center">
                        Nenhum produto encontrado com os critérios de busca.
                      </p>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <h2 className="text-xl font-medium text-gray-900 mb-2 text-center">
                        Nenhum produto cadastrado
                      </h2>
                      <p className="text-gray-500 mb-5 text-center">
                        Cadastre seu primeiro produto.
                      </p>
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700 h-12 px-6"
                        onClick={openFormForCreate}
                      >
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Novo Produto
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border border-gray-100">
                  <Table className="border-collapse">
                    <TableHeader className="bg-gray-50">
                      <TableRow className="border-b border-gray-200">
                        <TableHead className="py-3 text-xs font-semibold text-gray-500">Código</TableHead>
                        <TableHead className="py-3 text-xs font-semibold text-gray-500">Nome</TableHead>
                        <TableHead className="py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Descrição</TableHead>
                        <TableHead className="py-3 text-xs font-semibold text-gray-500">Valor de Custo</TableHead>
                        <TableHead className="py-3 text-xs font-semibold text-gray-500">Tipo</TableHead>
                        <TableHead className="py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Estado</TableHead>
                        <TableHead className="py-3 text-xs font-semibold text-gray-500 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProdutos.map((produto) => (
                        <TableRow key={produto.id}>
                          <TableCell>{produto.codigo || "-"}</TableCell>
                          <TableCell className="font-medium">{produto.nome}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {produto.descricao || "-"}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(produto.valorCusto)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={produto.tipo === 'novo' 
                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' 
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                              }
                            >
                              {produto.tipo === 'novo' ? 'Novo' : 'Usado'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {produto.estadoConservacao || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openFormForEdit(produto)}
                                      className="h-8 w-8"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Editar produto</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDelete(produto.id)}
                                      className="h-8 w-8 text-red-500 hover:text-red-700"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Excluir produto</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Controles de paginação - Sempre visíveis mesmo quando não há resultados */}
              <div className="flex items-center justify-between mt-4">
                <div>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(parseInt(value, 10));
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
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="h-10 w-10 rounded-md"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-1">
                    {filteredProdutos.length > 0 
                      ? `${currentPage}/${pageCount || 1}`
                      : "0/0"
                    }
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToNextPage}
                    disabled={currentPage >= pageCount}
                    className="h-10 w-10 rounded-md"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>
            {editingProduto ? "Editar Produto" : "Dados do Produto"}
          </CardTitle>
          <CardDescription>
            {editingProduto 
              ? "Atualize as informações do produto"
              : "Informe os dados de cadastro"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>

          <Form {...form}>
            <form className="space-y-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formErrors.tipo ? "text-destructive" : ""}>Tipo de Produto*</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setTipoProduto(value);
                      }}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className={formErrors.tipo ? "border-destructive" : ""}>
                          <SelectValue placeholder="Selecione o tipo de produto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="novo">Novo</SelectItem>
                        <SelectItem value="usado">Usado</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.tipo && <FormErrorMessage message={formErrors.tipo} />}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={formErrors.nome ? "text-destructive" : ""}>Nome do Produto*</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Digite o nome do produto" 
                        {...field} 
                        className={formErrors.nome ? "border-destructive" : ""}
                      />
                    </FormControl>
                    {formErrors.nome && <FormErrorMessage message={formErrors.nome} />}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: SKU-001" {...field} value={field.value || ''} />
                    </FormControl>
                     
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="valorCusto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={formErrors.valorCusto ? "text-destructive" : ""}>Valor de Custo (R$)*</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: 99,90" 
                          {...field} 
                          className={formErrors.valorCusto ? "border-destructive" : ""}
                        />
                      </FormControl>
                      {formErrors.valorCusto && <FormErrorMessage message={formErrors.valorCusto} />}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="frete"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frete (R$) - Opcional</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 15,00" {...field} value={field.value || ''} />
                      </FormControl>
                       
                    </FormItem>
                  )}
                />
              </div>

              {tipoProduto === "usado" && (
                <FormField
                  control={form.control}
                  name="estadoConservacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado de Conservação</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || ''}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o estado de conservação" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {opcoesEstadoConservacao.map((opcao) => (
                            <SelectItem key={opcao.value} value={opcao.value}>
                              {opcao.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                       
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Insira detalhes sobre o produto..." 
                        className="min-h-[100px] resize-y"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                     
                  </FormItem>
                )}
              />

              <Separator className="my-4" />


            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowForm(false)}
          >
            Cancelar
          </Button>
          <Button 
            type="button"
            onClick={() => handleFormSubmit()}
            disabled={createProdutoMutation.isPending || updateProdutoMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {createProdutoMutation.isPending || updateProdutoMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
            ) : null}
            {editingProduto ? "Atualizar" : "Cadastrar"}
          </Button>
        </CardFooter>
      </Card>
      )}
    </div>
  );
}