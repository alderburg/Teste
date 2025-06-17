import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  PlusCircle, Edit, Trash, Search, Loader2, Building, Truck,
  ChevronLeft, ChevronRight, ArrowLeft
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Fornecedor } from "@shared/schema";

// Componente personalizado para mensagens de formulário (sem exibir erros padrão)
const FormMessage = () => null;

// Componente para exibir mensagens de erro
const FormErrorMessage = ({ message }: { message: string }) => (
  <div className="text-sm font-medium text-destructive mt-1">{message}</div>
);

// Schema para validação do formulário
const fornecedorSchema = z.object({
  nome: z.string().min(1, { message: "Nome é obrigatório" }),
  cnpj: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().email({ message: "E-mail inválido" }).optional().nullable(),
  contato: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

type FormData = z.infer<typeof fornecedorSchema>;

export default function CadastroFornecedoresPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isNewFornecedor, setIsNewFornecedor] = useState(false);

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: {
      nome: "",
      cnpj: null,
      telefone: null,
      email: null,
      contato: null,
      endereco: null,
      cidade: null,
      estado: null,
      observacoes: null,
    },
  });

  // Consulta de fornecedores
  const { data: fornecedores = [], isLoading } = useQuery({
    queryKey: ["/api/fornecedores", user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/fornecedores?userId=${user?.id || 0}`);
      return response.json();
    },
    enabled: !!user,
  });

  // Mutações
  const createFornecedorMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/fornecedores", {
        ...data,
        userId: user?.id || null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Fornecedor criado",
        description: "Fornecedor cadastrado com sucesso",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fornecedores"] });
      setShowForm(false);
      setIsNewFornecedor(false);
      form.reset();
      setFormErrors({});
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar fornecedor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateFornecedorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const response = await apiRequest("PUT", `/api/fornecedores/${id}`, {
        ...data,
        userId: user?.id || null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Fornecedor atualizado",
        description: "Fornecedor atualizado com sucesso",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fornecedores"] });
      setShowForm(false);
      setEditingFornecedor(null);
      form.reset();
      setFormErrors({});
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar fornecedor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFornecedorMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/fornecedores/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Fornecedor excluído",
        description: "Fornecedor excluído com sucesso",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fornecedores"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir fornecedor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Função para validar o formulário e submeter os dados
  const handleFormSubmit = (data: FormData) => {
    setFormErrors({});
    let hasError = false;

    // Validação nome
    if (!data.nome || data.nome.trim() === "") {
      setFormErrors(prev => ({...prev, nome: "O nome é obrigatório"}));
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "O nome do fornecedor é obrigatório",
      });
      hasError = true;
    }

    // Validação email
    if (data.email && !z.string().email().safeParse(data.email).success) {
      setFormErrors(prev => ({...prev, email: "E-mail inválido"}));
      toast({
        variant: "destructive",
        title: "E-mail inválido",
        description: "Por favor, forneça um e-mail válido",
      });
      hasError = true;
    }

    if (!hasError) {
      if (editingFornecedor) {
        updateFornecedorMutation.mutate({
          id: editingFornecedor.id,
          data,
        });
      } else {
        createFornecedorMutation.mutate(data);
      }
    }
  };

  // Função para lidar com a edição
  const handleEdit = (fornecedor: Fornecedor) => {
    setEditingFornecedor(fornecedor);
    setIsNewFornecedor(false);
    form.reset({
      nome: fornecedor.nome,
      cnpj: fornecedor.cnpj,
      telefone: fornecedor.telefone,
      email: fornecedor.email,
      contato: fornecedor.contato,
      endereco: fornecedor.endereco,
      cidade: fornecedor.cidade,
      estado: fornecedor.estado,
      observacoes: fornecedor.observacoes,
    });
    setShowForm(true);
  };

  // Função para abrir formulário novo
  const novoFornecedor = () => {
    setEditingFornecedor(null);
    setIsNewFornecedor(true);
    form.reset({
      nome: "",
      cnpj: null,
      telefone: null,
      email: null,
      contato: null,
      endereco: null,
      cidade: null,
      estado: null,
      observacoes: null,
    });
    setFormErrors({});
    setShowForm(true);
  };

  // Filtrar e paginar fornecedores
  const filteredFornecedores = fornecedores.filter((fornecedor: Fornecedor) => {
    const matchesSearch = 
      fornecedor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fornecedor.cnpj && fornecedor.cnpj.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (fornecedor.email && fornecedor.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (fornecedor.cidade && fornecedor.cidade.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const pageCount = Math.ceil(filteredFornecedores.length / itemsPerPage);
  const paginatedFornecedores = filteredFornecedores.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Navegação de página
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

  const handleChangeItemsPerPage = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {!showForm ? (
          <>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Fornecedores</h2>
              <p className="text-muted-foreground">Gerencie os fornecedores do seu negócio</p>
            </div>
            <div className="flex space-x-2">
              <Button 
                className="flex items-center bg-amber-600 hover:bg-amber-700"
                onClick={novoFornecedor}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Fornecedor
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{isNewFornecedor ? "Novo Fornecedor" : "Editar Fornecedor"}</h2>
              <p className="text-muted-foreground">
                {isNewFornecedor ? "Preencha os dados do novo fornecedor" : "Edite as informações do fornecedor"}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setIsNewFornecedor(false);
                form.reset();
                setFormErrors({});
              }}
              className="flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Lista
            </Button>
          </>
        )}
      </div>

      {!showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Gerenciamento de Fornecedores</CardTitle>
            <CardDescription>
              Visualize, edite e gerencie seus fornecedores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2 mb-6">
              <div className="relative w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar fornecedores..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
              </div>
            )}
            
            {!isLoading && paginatedFornecedores.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                {searchTerm ? (
                  <>
                    <Truck className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1 text-center">
                      Nenhum fornecedor encontrado
                    </h3>
                    <p className="text-gray-500 mb-4 text-center">
                      Nenhum fornecedor encontrado com os critérios de busca.
                    </p>
                  </>
                ) : (
                  <>
                    <Building className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h2 className="text-xl font-medium text-gray-900 mb-2 text-center">
                      Nenhum fornecedor cadastrado
                    </h2>
                    <p className="text-gray-500 mb-5 text-center">
                      Cadastre seu primeiro fornecedor para começar.
                    </p>
                    <Button 
                      className="bg-amber-600 hover:bg-amber-700 h-12 px-6"
                      onClick={novoFornecedor}
                    >
                      <PlusCircle className="mr-2 h-5 w-5" />
                      Novo Fornecedor
                    </Button>
                  </>
                )}
              </div>
            )}
            
            {!isLoading && paginatedFornecedores.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden md:table-cell">CNPJ</TableHead>
                      <TableHead className="hidden md:table-cell">Telefone</TableHead>
                      <TableHead className="hidden md:table-cell">E-mail</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedFornecedores.map((fornecedor: Fornecedor) => (
                      <TableRow key={fornecedor.id}>
                        <TableCell className="font-medium">{fornecedor.nome}</TableCell>
                        <TableCell className="hidden md:table-cell">{fornecedor.cnpj || "-"}</TableCell>
                        <TableCell className="hidden md:table-cell">{fornecedor.telefone || "-"}</TableCell>
                        <TableCell className="hidden md:table-cell">{fornecedor.email || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(fornecedor)}
                                  >
                                    <Edit className="h-4 w-4 text-amber-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Editar fornecedor</p>
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
                                          Tem certeza que deseja excluir o fornecedor "{fornecedor.nome}"?
                                          Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteFornecedorMutation.mutate(fornecedor.id)}
                                          className="bg-red-500 hover:bg-red-600"
                                        >
                                          {deleteFornecedorMutation.isPending ? (
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
                                  <p>Excluir fornecedor</p>
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
              
            {/* Controles de paginação */}
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
                    {filteredFornecedores.length > 0 
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
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Removemos o cabeçalho redundante */}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Dados do Fornecedor</CardTitle>
              <CardDescription>
                Informe os dados de cadastro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className={cn(
                            "font-medium",
                            formErrors.nome ? "text-destructive" : ""
                          )}>
                            Nome/Razão Social*
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Nome ou razão social" 
                              {...field} 
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
                      name="cnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="00.000.000/0000-00" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="(00) 0000-0000" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={cn(
                            "font-medium",
                            formErrors.email ? "text-destructive" : ""
                          )}>
                            E-mail
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="email@example.com" 
                              {...field} 
                              value={field.value || ""}
                              className={cn(
                                formErrors.email ? "border-destructive" : ""
                              )}
                            />
                          </FormControl>
                          <FormMessage />
                          {formErrors.email && <FormErrorMessage message={formErrors.email} />}
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="contato"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contato</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Nome do contato" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator className="md:col-span-2 my-2" />
                    
                    <FormField
                      control={form.control}
                      name="endereco"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Rua, número, bairro" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="cidade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Cidade" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="estado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Estado (UF)" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="observacoes"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Observações sobre o fornecedor" 
                              {...field} 
                              value={field.value || ""}
                              className="min-h-[100px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false);
                        setEditingFornecedor(null);
                        setIsNewFornecedor(false);
                        form.reset();
                        setFormErrors({});
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleFormSubmit(form.getValues())}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {createFornecedorMutation.isPending || updateFornecedorMutation.isPending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      ) : null}
                      {editingFornecedor ? "Atualizar" : "Cadastrar"}
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