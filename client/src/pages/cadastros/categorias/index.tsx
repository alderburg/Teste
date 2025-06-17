import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  PlusCircle, Edit, Trash, Search, Loader2, Tag,
  ChevronLeft, ChevronRight, ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Categoria } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
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
import { useAuth } from "@/hooks/use-auth";

// Componente para exibir mensagens de erro
const FormErrorMessage = ({ message }: { message: string }) => (
  <div className="text-sm font-medium text-destructive mt-1">{message}</div>
);

// Schema para validação do formulário
const categoriaSchema = z.object({
  nome: z.string().min(1, { message: "Nome é obrigatório" }),
  descricao: z.string().optional().nullable(),
  tipo: z.string().min(1, { message: "Tipo é obrigatório" }),
});

type FormData = z.infer<typeof categoriaSchema>;

export default function CategoriasPageFixed() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Estado
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // React Hook Form
  const form = useForm<FormData>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      tipo: "",
    }
  });

  // Consulta de categorias
  const { data: categorias = [], isLoading } = useQuery<Categoria[]>({
    queryKey: ['/api/categorias', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/categorias?userId=${user?.id || 0}`);
      return response.json();
    },
  });

  // Mutações
  const createCategoriaMutation = useMutation<Categoria, Error, FormData>({
    mutationFn: async (data) => {
      const categoriaData = {
        ...data,
        userId: user?.id || null,
      };
      const response = await apiRequest("POST", "/api/categorias", categoriaData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Categoria criada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categorias'] });
      resetForm();
      setShowForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro!",
        description: error.message || "Erro ao criar categoria.",
        variant: "destructive",
      });
    },
  });

  const updateCategoriaMutation = useMutation<Categoria, Error, { id: number; data: Partial<Categoria> }>({
    mutationFn: async ({ id, data }) => {
      const response = await apiRequest("PUT", `/api/categorias/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Categoria atualizada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categorias'] });
      resetForm();
      setShowForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro!",
        description: error.message || "Erro ao atualizar categoria.",
        variant: "destructive",
      });
    },
  });

  const deleteCategoriaMutation = useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiRequest("DELETE", `/api/categorias/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Categoria excluída",
        description: "Categoria excluída com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categorias'] });
    },
    onError: (error) => {
      toast({
        title: "Erro!",
        description: error.message || "Erro ao excluir categoria.",
        variant: "destructive",
      });
    },
  });

  // Funções auxiliares
  const novaCategoria = () => {
    setEditingCategoria(null);
    resetForm();
    setIsNewCategory(true);
    setShowForm(true);
    setFormErrors({});
  };

  const handleEdit = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    form.reset({
      nome: categoria.nome,
      descricao: categoria.descricao,
      tipo: categoria.tipo,
    });
    setIsNewCategory(false);
    setShowForm(true);
    setFormErrors({});
  };

  const resetForm = () => {
    form.reset({
      nome: "",
      descricao: "",
      tipo: "",
    });
  };

  // A função handleFormSubmit foi movida para o onSubmit do formulário

  // Filtrar e paginar categorias
  const filteredCategorias = categorias.filter((categoria) =>
    categoria.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (categoria.descricao && categoria.descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
    categoria.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCategorias.length / itemsPerPage);
  const currentItems = filteredCategorias.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  // Navegação de página
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="space-y-6">
      {!showForm && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Categorias</h2>
            <p className="text-muted-foreground">
              Gerencie as categorias do seu negócio
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={novaCategoria} className="flex items-center bg-purple-600 hover:bg-purple-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Categoria
            </Button>
          </div>
        </div>
      )}
      
      {showForm ? (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                {isNewCategory ? "Nova Categoria" : "Editar Categoria"}
              </h2>
              <p className="text-muted-foreground">
                {isNewCategory 
                  ? "Preencha os dados da nova categoria"
                  : "Atualize os dados da categoria"}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
              className="flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para a Lista
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Dados da Categoria</CardTitle>
              <CardDescription>
                Informe os dados de cadastro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    
                    const values = form.getValues();
                    const errors: Record<string, string> = {};
                    
                    // Validação simples
                    if (!values.nome) {
                      errors.nome = "Nome é obrigatório";
                    }
                    
                    if (!values.tipo) {
                      errors.tipo = "Tipo é obrigatório";
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
                    
                    // Se não houver erros, continua com a submissão
                    if (editingCategoria) {
                      updateCategoriaMutation.mutate({
                        id: editingCategoria.id,
                        data: {
                          ...values,
                          userId: user?.id || null,
                        },
                      });
                    } else {
                      createCategoriaMutation.mutate(values);
                    }
                  }}
                  className="space-y-5">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={cn(formErrors.nome ? "text-destructive" : "")}>
                          Nome*
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nome da categoria" 
                            {...field} 
                            className={cn(formErrors.nome ? "border-destructive" : "")}
                          />
                        </FormControl>
                        {formErrors.nome && <FormErrorMessage message={formErrors.nome} />}
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={cn(formErrors.tipo ? "text-destructive" : "")}>
                          Tipo*
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className={cn(formErrors.tipo ? "border-destructive" : "")}>
                              <SelectValue placeholder="Selecione o tipo de categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="produto">Produto</SelectItem>
                            <SelectItem value="servico">Serviço</SelectItem>
                            <SelectItem value="despesa">Despesa</SelectItem>
                            <SelectItem value="custo">Custo</SelectItem>
                          </SelectContent>
                        </Select>
                        {formErrors.tipo && <FormErrorMessage message={formErrors.tipo} />}
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descrição detalhada da categoria (opcional)"
                            className="resize-none"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowForm(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit"
                      className={cn(
                        "flex items-center bg-purple-600 hover:bg-purple-700", 
                        (createCategoriaMutation.isPending || updateCategoriaMutation.isPending) && 
                        "bg-purple-700 hover:bg-purple-800"
                      )}
                    >
                      {(createCategoriaMutation.isPending || updateCategoriaMutation.isPending) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {editingCategoria ? "Atualizando..." : "Cadastrando..."}
                        </>
                      ) : (
                        editingCategoria ? "Atualizar" : "Cadastrar"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Gerenciamento de Categorias</CardTitle>
            <CardDescription>
              Visualize, edite e gerencie suas categorias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2 mb-6">
              <div className="relative w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar categorias..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
              </div>
            ) : (
              <>
                {currentItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    {searchTerm ? (
                      <>
                        <Tag className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1 text-center">
                          Nenhuma categoria encontrada
                        </h3>
                        <p className="text-gray-500 mb-4 text-center">
                          Nenhuma categoria encontrada com os critérios de busca.
                        </p>
                      </>
                    ) : (
                      <>
                        <Tag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                        <h2 className="text-xl font-medium text-gray-900 mb-2 text-center">
                          Nenhuma categoria cadastrada
                        </h2>
                        <p className="text-gray-500 mb-5 text-center">
                          Cadastre sua primeira categoria.
                        </p>
                        <Button 
                          className="bg-purple-600 hover:bg-purple-700 h-12 px-6"
                          onClick={novaCategoria}
                        >
                          <PlusCircle className="mr-2 h-5 w-5" />
                          Nova Categoria
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead className="hidden md:table-cell">Tipo</TableHead>
                          <TableHead className="hidden md:table-cell">Descrição</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentItems.map((categoria) => (
                          <TableRow key={categoria.id}>
                            <TableCell className="font-medium">{categoria.nome}</TableCell>
                            <TableCell className="hidden md:table-cell">{categoria.tipo}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              {categoria.descricao || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(categoria)}
                                      >
                                        <Edit className="h-4 w-4 text-purple-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Editar categoria</p>
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
                                              Tem certeza que deseja excluir a categoria "{categoria.nome}"?
                                              Esta ação não pode ser desfeita.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => deleteCategoriaMutation.mutate(categoria.id)}
                                              className="bg-red-500 hover:bg-red-600"
                                            >
                                              {deleteCategoriaMutation.isPending ? (
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
                                      <p>Excluir categoria</p>
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
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={handleItemsPerPageChange}
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
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="text-sm text-muted-foreground mx-2">
                      {filteredCategorias.length > 0 ? `${currentPage}/${totalPages}` : "0/0"}
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage >= totalPages || totalPages === 0}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}