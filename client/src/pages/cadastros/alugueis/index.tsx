import { useState, useEffect } from "react";
// DashboardLayout removido para usar layout persistente
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { BookOpen, Box, Edit, PlusCircle, Search, Trash, Upload, Download, Filter, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Componente para exibir mensagens de erro
const FormErrorMessage = ({ message }: { message: string }) => (
  <div className="text-sm font-medium text-destructive mt-1">{message}</div>
);

interface BemAluguel {
  id: number;
  nome: string;
  descricao: string | null;
  valorEquipamento: number;
  frete: number | null;
  retornoInvestimentoMeses: number;
  userId: number | null;
  createdAt: string;
  updatedAt: string;
}

const bemSchema = z.object({
  nome: z.string().min(1, { message: "O nome do bem é obrigatório" }),
  descricao: z.string().optional(),
  valorEquipamento: z.string()
    .min(1, { message: "O valor do equipamento é obrigatório" })
    .refine(
      (val) => !isNaN(parseFloat(val?.replace(",", ".") || "0")), 
      { message: "O valor do equipamento precisa ser um número válido" }
    ),
  frete: z.string().optional().refine(
    (val) => val === "" || !isNaN(parseFloat(val?.replace(",", ".") || "0")), 
    { message: "O valor do frete precisa ser um número válido" }
  ),
  retornoInvestimentoMeses: z.string()
    .min(1, { message: "O prazo de retorno é obrigatório" })
    .refine(
      (val) => !isNaN(parseInt(val || "0", 10)) && parseInt(val || "0", 10) > 0, 
      { message: "O prazo de retorno precisa ser um número inteiro positivo" }
    ),
  userId: z.number().nullable(),
});

type FormValues = z.infer<typeof bemSchema>;

export default function CadastroBensAluguelPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingBem, setEditingBem] = useState<BemAluguel | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [bensPerPage, setBensPerPage] = useState(5);

  // Estado para rastrear erros de campos específicos
  const [formErrors, setFormErrors] = useState<{
    nome?: string;
    valorEquipamento?: string;
    frete?: string;
    retornoInvestimentoMeses?: string;
  }>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(bemSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      valorEquipamento: "",
      frete: "",
      retornoInvestimentoMeses: "12",
      userId: user?.id,
    },
    mode: "onSubmit",
  });

  const { data: bensAluguel = [], isLoading } = useQuery<BemAluguel[]>({
    queryKey: ["/api/itens-aluguel", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/itens-aluguel?userId=${user?.id || 0}`);
      return await res.json();
    },
    enabled: !!user,
  });

  // Mutations
  const createMutation = useMutation<BemAluguel, Error, Omit<BemAluguel, 'id' | 'createdAt' | 'updatedAt'>>({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", "/api/itens-aluguel", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Bem de aluguel criado",
        description: "Bem cadastrado com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/itens-aluguel"] });
      setShowForm(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar bem de aluguel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation<BemAluguel, Error, { id: number; data: Omit<BemAluguel, 'id' | 'createdAt' | 'updatedAt'> }>({
    mutationFn: async ({ id, data }) => {
      const res = await apiRequest("PUT", `/api/itens-aluguel/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Bem de aluguel atualizado",
        description: "Bem atualizado com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/itens-aluguel"] });
      setShowForm(false);
      setEditingBem(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar bem de aluguel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation<void, Error, number>({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/itens-aluguel/${id}`);
      if (!res.ok) throw new Error("Falha ao excluir bem");
      return;
    },
    onSuccess: () => {
      toast({
        title: "Bem de aluguel excluído",
        description: "Bem excluído com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/itens-aluguel"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir bem de aluguel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (editingBem) {
      form.reset({
        nome: editingBem.nome,
        descricao: editingBem.descricao || "",
        valorEquipamento: editingBem.valorEquipamento.toString(),
        frete: editingBem.frete ? editingBem.frete.toString() : "",
        retornoInvestimentoMeses: editingBem.retornoInvestimentoMeses.toString(),
        userId: user?.id,
      });
    }
  }, [editingBem, form, user]);

  // A função handleFormSubmit foi movida para o onSubmit do formulário

  const openFormForCreate = () => {
    setEditingBem(null);
    form.reset({
      nome: "",
      descricao: "",
      valorEquipamento: "",
      frete: "",
      retornoInvestimentoMeses: "12",
      userId: user?.id,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const openFormForEdit = (bem: BemAluguel) => {
    setEditingBem(bem);
    setFormErrors({});
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este bem de aluguel?")) {
      deleteMutation.mutate(id);
    }
  };

  // Filtrar e paginar bens
  const filteredBens = bensAluguel.filter((bem) => 
    bem.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bem.descricao && bem.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pageCount = Math.ceil(filteredBens.length / bensPerPage);
  const paginatedBens = filteredBens.slice(
    (currentPage - 1) * bensPerPage,
    currentPage * bensPerPage
  );

  // Formatação de valores
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

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

  // Função que lida com a alteração de bens por página
  const handleChangeBensPerPage = (value: string) => {
    setBensPerPage(parseInt(value));
    setCurrentPage(1); // Reset para a primeira página
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {showForm ? "Novo Bem para Aluguel" : "Cadastro de Bens para Aluguel"}
          </h2>
          <p className="text-gray-500">
            {showForm 
              ? "Preencha os dados do novo bem disponível para aluguel" 
              : "Gerencie seus bens disponíveis para aluguel"}
          </p>
        </div>
        <div className="flex space-x-2">
          {!showForm ? (
            <Button onClick={openFormForCreate} className="flex items-center bg-purple-600 hover:bg-purple-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Bem para Aluguel
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
            <CardTitle>Bens para Aluguel</CardTitle>
            <CardDescription>
              Lista de bens disponíveis para aluguel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2 mb-6">
              <div className="relative w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar bens..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {isLoading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            )}

            {!isLoading && paginatedBens.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                {searchTerm ? (
                  <>
                    <Box className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1 text-center">
                      Nenhum bem para aluguel encontrado
                    </h3>
                    <p className="text-gray-500 mb-4 text-center">
                      Nenhum bem para aluguel encontrado com os critérios de busca.
                    </p>
                  </>
                ) : (
                  <>
                    <Box className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h2 className="text-xl font-medium text-gray-900 mb-2 text-center">
                      Nenhum bem para aluguel cadastrado
                    </h2>
                    <p className="text-gray-500 mb-5 text-center">
                      Cadastre seu primeiro bem para aluguel.
                    </p>
                    <Button 
                      className="bg-purple-600 hover:bg-purple-700 h-12 px-6"
                      onClick={openFormForCreate}
                    >
                      <PlusCircle className="mr-2 h-5 w-5" />
                      Novo Bem para Aluguel
                    </Button>
                  </>
                )}
              </div>
            )}

            {!isLoading && (
              <div className="overflow-x-auto">
                {paginatedBens.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor do Bem</TableHead>
                        <TableHead>Frete</TableHead>
                        <TableHead>Prazo de Retorno</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedBens.map((bem) => (
                        <TableRow key={bem.id}>
                          <TableCell className="font-medium">{bem.nome}</TableCell>
                          <TableCell>{bem.descricao || "-"}</TableCell>
                          <TableCell>{formatCurrency(bem.valorEquipamento)}</TableCell>
                          <TableCell>{formatCurrency(bem.frete)}</TableCell>
                          <TableCell>{bem.retornoInvestimentoMeses} meses</TableCell>
                          <TableCell className="text-right flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              className="h-8 w-8 p-0" 
                              onClick={() => openFormForEdit(bem)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" 
                              onClick={() => handleDelete(bem.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}

                <div className="flex items-center justify-between mt-4">
                  <div>
                    <Select
                      value={bensPerPage.toString()}
                      onValueChange={handleChangeBensPerPage}
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
                      {filteredBens.length > 0 
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
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingBem ? "Editar Bem para Aluguel" : "Dados do Bem"}
            </CardTitle>
            <CardDescription>
              {editingBem
                ? "Atualize as informações do bem para aluguel"
                : "Informe os dados de cadastro"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={(e) => {
                e.preventDefault();

                // Verificação crítica: evita múltiplas submissões
                if (createMutation.isPending || updateMutation.isPending) {
                  return;
                }

                const formData = form.getValues();

                // Limpar erros anteriores
                setFormErrors({});
                const errors: Record<string, string> = {};

                // Fazer todas as validações de uma vez sem exibir toasts para cada erro
                if (!formData.nome || formData.nome.trim() === "") {
                  errors.nome = "O nome do bem é obrigatório";
                }

                if (!formData.valorEquipamento || formData.valorEquipamento.trim() === "") {
                  errors.valorEquipamento = "O valor do bem é obrigatório";
                } else if (isNaN(Number(formData.valorEquipamento.replace(",", ".")))) {
                  errors.valorEquipamento = "O valor do bem precisa ser um número válido";
                }

                if (!formData.retornoInvestimentoMeses || formData.retornoInvestimentoMeses.trim() === "") {
                  errors.retornoInvestimentoMeses = "O prazo de retorno é obrigatório";
                } else if (isNaN(parseInt(formData.retornoInvestimentoMeses, 10)) || parseInt(formData.retornoInvestimentoMeses, 10) <= 0) {
                  errors.retornoInvestimentoMeses = "O prazo de retorno precisa ser um número inteiro positivo";
                }

                if (formData.frete && formData.frete.trim() !== "" && isNaN(Number(formData.frete.replace(",", ".")))) {
                  errors.frete = "O valor do frete precisa ser um número válido";
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
                  // Converter strings para números
                  const numericData = {
                    ...formData,
                    valorEquipamento: parseFloat(formData.valorEquipamento.replace(",", ".")),
                    frete: formData.frete ? parseFloat(formData.frete.replace(",", ".")) : null,
                    retornoInvestimentoMeses: parseInt(formData.retornoInvestimentoMeses, 10),
                    userId: user?.id || null,
                    descricao: formData.descricao || null,
                  };

                  if (editingBem) {
                    updateMutation.mutate({ id: editingBem.id, data: numericData });
                  } else {
                    createMutation.mutate(numericData);
                  }
                } catch (error) {
                  console.error("Erro ao processar formulário:", error);
                  toast({
                    variant: "destructive",
                    title: "Erro ao processar formulário",
                    description: "Verifique se todos os campos estão preenchidos corretamente.",
                  });
                }
              }} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem className={formErrors.nome ? "border-red-500 rounded-md p-1" : ""}>
                        <FormLabel>Nome do Bem</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nome do bem" 
                            {...field} 
                            className={formErrors.nome ? "border-red-500" : "w-full"} 
                          />
                        </FormControl>
                        {formErrors.nome && <FormErrorMessage message={formErrors.nome} />}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="valorEquipamento"
                    render={({ field }) => (
                      <FormItem className={formErrors.valorEquipamento ? "border-red-500 rounded-md p-1" : ""}>
                        <FormLabel>Valor do Bem (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="0,00" 
                            {...field} 
                            className={formErrors.valorEquipamento ? "border-red-500" : "w-full"} 
                          />
                        </FormControl>
                        {formErrors.valorEquipamento && <FormErrorMessage message={formErrors.valorEquipamento} />}
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="frete"
                    render={({ field }) => (
                      <FormItem className={formErrors.frete ? "border-red-500 rounded-md p-1" : ""}>
                        <FormLabel>Frete (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="0,00" 
                            {...field} 
                            className={formErrors.frete ? "border-red-500" : "w-full"} 
                          />
                        </FormControl>
                        {formErrors.frete && <FormErrorMessage message={formErrors.frete} />}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="retornoInvestimentoMeses"
                    render={({ field }) => (
                      <FormItem className={formErrors.retornoInvestimentoMeses ? "border-red-500 rounded-md p-1" : ""}>
                        <FormLabel>Prazo de Retorno (meses)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="12" 
                            {...field} 
                            className={formErrors.retornoInvestimentoMeses ? "border-red-500" : "w-full"} 
                          />
                        </FormControl>
                        {formErrors.retornoInvestimentoMeses && <FormErrorMessage message={formErrors.retornoInvestimentoMeses} />}
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descrição detalhada do bem" 
                          {...field} 
                          rows={3}
                          className="resize-none w-full" 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingBem(null);
                      setFormErrors({});
                      form.reset();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    className={cn(
                      "flex items-center bg-purple-600 hover:bg-purple-700", 
                      (createMutation.isPending || updateMutation.isPending) && 
                      "bg-purple-700 hover:bg-purple-800"
                    )}
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingBem ? "Atualizando..." : "Cadastrando..."}
                      </>
                    ) : (
                      editingBem ? "Atualizar" : "Cadastrar"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}