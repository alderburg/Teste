import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Edit, Trash, PlusCircle, Search, Loader2, Wrench,
  ChevronLeft, ChevronRight, ArrowLeft
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Servico {
  id: number;
  nome: string;
  descricao: string | null;
  valorCusto: string;
  userId: number | null;
  createdAt: string;
  updatedAt: string;
}

const servicoSchema = z.object({
  nome: z.string().min(1, { message: "Nome é obrigatório" }),
  descricao: z.string().optional().nullable(),
  valorCusto: z.string().min(1, { message: "Valor do custo é obrigatório" }).refine(
    (val) => !isNaN(parseFloat(val.replace(",", "."))), 
    { message: "Valor deve ser um número válido" }
  ),
});

type FormValues = z.infer<typeof servicoSchema>;

export default function CadastroServicosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isNewService, setIsNewService] = useState(false);

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(servicoSchema),
    defaultValues: {
      nome: "",
      descricao: null,
      valorCusto: "",
    },
  });

  // Consulta de serviços
  const { data: servicos = [], isLoading } = useQuery({
    queryKey: ["/api/servicos", user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/servicos?userId=${user?.id || 0}`);
      return response.json();
    },
    enabled: !!user,
  });

  // Mutações
  const createServicoMutation = useMutation({
    mutationFn: async (data: Omit<Servico, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest("POST", "/api/servicos", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Serviço criado",
        description: "Serviço cadastrado com sucesso",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/servicos"] });
      setShowForm(false);
      setIsNewService(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar serviço",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateServicoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Omit<Servico, 'id' | 'createdAt' | 'updatedAt'> }) => {
      const response = await apiRequest("PUT", `/api/servicos/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Serviço atualizado",
        description: "Serviço atualizado com sucesso",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/servicos"] });
      setShowForm(false);
      setEditingServico(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar serviço",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteServicoMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/servicos/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Serviço excluído",
        description: "Serviço excluído com sucesso",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/servicos"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir serviço",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Função para lidar com a validação do formulário
  // A função handleFormSubmit foi movida para o onSubmit do formulário

  // Efeito para carregar dados no formulário ao editar
  const handleEdit = (servico: Servico) => {
    setEditingServico(servico);
    setIsNewService(false);
    form.reset({
      nome: servico.nome,
      descricao: servico.descricao,
      valorCusto: servico.valorCusto,
    });
    setShowForm(true);
  };

  const novoServico = () => {
    setEditingServico(null);
    setIsNewService(true);
    form.reset({
      nome: "",
      descricao: null,
      valorCusto: "",
    });
    setFormErrors({});
    setShowForm(true);
  };

  // Filtrar e paginar serviços
  const filteredServicos = servicos.filter((servico: Servico) => 
    servico.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (servico.descricao && servico.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pageCount = Math.ceil(filteredServicos.length / itemsPerPage);
  const paginatedServicos = filteredServicos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Formatação de valor para exibição
  const formatCurrency = (value: string | null) => {
    if (!value) return "R$ 0,00";
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

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
  
  // Função que lida com a alteração de itens por página
  const handleChangeItemsPerPage = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset para a primeira página
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {showForm ? "Novo Serviço" : "Cadastro de Serviços"}
          </h2>
          <p className="text-gray-500">
            {showForm 
              ? "Preencha os dados do novo serviço" 
              : "Gerencie seus serviços prestados"}
          </p>
        </div>
        <div className="flex space-x-2">
          {!showForm ? (
            <Button onClick={novoServico} className="flex items-center bg-teal-600 hover:bg-teal-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Serviço
            </Button>
          ) : (
            <Button onClick={() => {
              setShowForm(false);
              setEditingServico(null);
              setIsNewService(false);
              form.reset();
              setFormErrors({});
            }} className="flex items-center" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Lista
            </Button>
          )}
        </div>
      </div>

      {!showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Serviços Cadastrados</CardTitle>
            <CardDescription>
              Lista de serviços oferecidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2 mb-6">
              <div className="relative w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar serviços..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {isLoading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-500"></div>
              </div>
            )}
            
            {!isLoading && paginatedServicos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                {searchTerm ? (
                  <>
                    <Wrench className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1 text-center">
                      Nenhum serviço encontrado
                    </h3>
                    <p className="text-gray-500 mb-4 text-center">
                      Nenhum serviço encontrado com os critérios de busca.
                    </p>
                  </>
                ) : (
                  <>
                    <Wrench className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h2 className="text-xl font-medium text-gray-900 mb-2 text-center">
                      Nenhum serviço cadastrado
                    </h2>
                    <p className="text-gray-500 mb-5 text-center">
                      Cadastre seu primeiro serviço.
                    </p>
                    <Button 
                      className="bg-teal-600 hover:bg-teal-700 h-12 px-6"
                      onClick={novoServico}
                    >
                      <PlusCircle className="mr-2 h-5 w-5" />
                      Novo Serviço
                    </Button>
                  </>
                )}
              </div>
            )}
            
            {!isLoading && paginatedServicos.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Valor de Custo</TableHead>
                      <TableHead className="hidden md:table-cell">Descrição</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedServicos.map((servico: Servico) => (
                      <TableRow key={servico.id}>
                        <TableCell className="font-medium">{servico.nome}</TableCell>
                        <TableCell>{formatCurrency(servico.valorCusto)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {servico.descricao 
                            ? (servico.descricao.length > 50 
                              ? `${servico.descricao.substring(0, 50)}...` 
                              : servico.descricao)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(servico)}
                                  >
                                    <Edit className="h-4 w-4 text-teal-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Editar serviço</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <Trash className="h-4 w-4 text-red-600" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja excluir o serviço "{servico.nome}"?
                                          Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteServicoMutation.mutate(servico.id)}
                                          className="bg-red-500 hover:bg-red-600"
                                        >
                                          {deleteServicoMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            "Excluir"
                                          )}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Excluir serviço</p>
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
            {!isLoading && (
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={handleChangeItemsPerPage}
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
                    {filteredServicos.length > 0 
                      ? `${currentPage}/${pageCount || 1}`
                      : "0/0"
                    }
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToNextPage}
                    disabled={currentPage === pageCount || pageCount === 0}
                    className="h-10 w-10 rounded-md"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Dados do Serviço</CardTitle>
              <CardDescription>
                Informe os dados de cadastro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    
                    // Verificação crítica: evita múltiplas submissões
                    if (createServicoMutation.isPending || updateServicoMutation.isPending) {
                      return;
                    }
                    
                    const data = form.getValues();
                    
                    // Limpar erros anteriores
                    setFormErrors({});
                    const errors: Record<string, string> = {};
                    
                    // Fazer todas as validações de uma vez sem exibir toasts para cada erro
                    if (!data.nome || data.nome.trim() === "") {
                      errors.nome = "O nome do serviço é obrigatório";
                    }

                    if (!data.valorCusto || data.valorCusto.trim() === "") {
                      errors.valorCusto = "O valor de custo é obrigatório";
                    } else if (isNaN(Number(data.valorCusto.replace(",", ".")))) {
                      errors.valorCusto = "O valor de custo precisa ser um número válido";
                    }
                    
                    // Se houver erros, exibe apenas um toast e marca os campos com erro
                    if (Object.keys(errors).length > 0) {
                      setFormErrors(errors);
                      toast({
                        variant: "destructive",
                        title: "Preencha os campos obrigatórios",
                        description: "Verifique os campos destacados em vermelho.",
                      });
                      return;
                    }
                    
                    // Se não houver erros, prossegue com a submissão
                    try {
                      const servicoData = {
                        ...data,
                        descricao: data.descricao === undefined ? null : data.descricao,
                        userId: user?.id || null,
                      };

                      if (editingServico) {
                        updateServicoMutation.mutate({ id: editingServico.id, data: servicoData });
                      } else {
                        createServicoMutation.mutate(servicoData);
                      }
                    } catch (error) {
                      console.error("Erro ao processar formulário:", error);
                      toast({
                        variant: "destructive",
                        title: "Erro ao processar formulário",
                        description: "Verifique se todos os campos estão preenchidos corretamente.",
                      });
                    }
                  }} 
                  className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={cn(
                          "font-medium",
                          formErrors.nome ? "text-destructive" : ""
                        )}>Nome do Serviço*</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Ex: Instalação de Software" 
                            className={cn(
                              formErrors.nome ? "border-destructive" : ""
                            )}
                          />
                        </FormControl>
                        <FormMessage />
                        {formErrors.nome && <FormErrorMessage message={formErrors.nome} />}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="valorCusto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={cn(
                          "font-medium",
                          formErrors.valorCusto ? "text-destructive" : ""
                        )}>Valor de Custo*</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Ex: 100,00" 
                            type="text"
                            className={cn(
                              formErrors.valorCusto ? "border-destructive" : ""
                            )}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^\d.,]/g, "");
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                        {formErrors.valorCusto && <FormErrorMessage message={formErrors.valorCusto} />}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium">Descrição</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Descreva detalhes sobre o serviço"
                            value={field.value || ""}
                            className="min-h-[100px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false);
                        setEditingServico(null);
                        setIsNewService(false);
                        form.reset();
                        setFormErrors({});
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit"
                      className={cn(
                        "flex items-center bg-teal-600 hover:bg-teal-700", 
                        (createServicoMutation.isPending || updateServicoMutation.isPending) && 
                        "bg-teal-700 hover:bg-teal-800"
                      )}
                    >
                      {(createServicoMutation.isPending || updateServicoMutation.isPending) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {editingServico ? "Atualizando..." : "Cadastrando..."}
                        </>
                      ) : (
                        editingServico ? "Atualizar" : "Cadastrar"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}