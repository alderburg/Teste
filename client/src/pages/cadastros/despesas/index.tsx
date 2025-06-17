import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  PlusCircle,
  Search,
  Trash,
  ClipboardList
} from "lucide-react";

// Tipos
interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  diaVencimento: number;
  dataVencimento?: Date; // Campo antigo, mantido para compatibilidade
  tipo: "FIXA" | "VARIAVEL";
  categoria?: "FIXA" | "VARIAVEL"; // Campo antigo, mantido para compatibilidade
  formaPagamento?: "PIX" | "DINHEIRO" | "BOLETO" | "CARTAO DE CRÉDITO" | "CARTAO DE DÉBITO";
  departamento?: string;
  observacoes?: string;
  dataCriacao: Date;
}

// Esquema de validação do formulário
const formSchema = z.object({
  descricao: z.string().min(3, "Descrição deve ter pelo menos 3 caracteres"),
  valor: z.coerce.number({
    required_error: "O valor é obrigatório",
    invalid_type_error: "Valor precisa ser um número válido"
  }).min(0.01, "O valor precisa ser maior que zero"),
  diaVencimento: z.coerce.number().min(1, "Dia deve ser entre 1 e 31").max(31, "Dia deve ser entre 1 e 31"),
  tipo: z.enum(["FIXA", "VARIAVEL"]),
  formaPagamento: z.enum(["PIX", "DINHEIRO", "BOLETO", "CARTAO DE CRÉDITO", "CARTAO DE DÉBITO"]),
  departamento: z.string().min(1, "Departamento é obrigatório"),
  observacoes: z.string().optional(),
});

// Componente principal
export default function CadastroDespesas() {
  // Estados
  const [showForm, setShowForm] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [despesasPerPage, setDespesasPerPage] = useState(5);

  // Toast para mensagens
  const { toast } = useToast();

  // Inicialização do formulário com react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descricao: "",
      valor: 0,
      diaVencimento: 1,
      tipo: "FIXA",
      formaPagamento: "PIX",
      departamento: "Geral",
      observacoes: "",
    },
  });

  // Mock de dados para testes (sem dados para mostrar tabela vazia)
  const despesasMock: Despesa[] = [];

  // Query para buscar despesas (simulada)
  const { data: despesas = despesasMock as Despesa[] } = useQuery<Despesa[]>({
    queryKey: ["despesas"],
    // queryFn já configurado no queryClient para fazer fetch de "/api/despesas"
  });

  // Mutations para criar, atualizar e excluir despesas
  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => {
      return apiRequest("/api/despesas", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: "Despesa criada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["despesas"] });
      setShowForm(false);
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao criar despesa", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema> & { id: string }) => {
      return apiRequest(`/api/despesas/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: "Despesa atualizada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["despesas"] });
      setShowForm(false);
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao atualizar despesa", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return apiRequest(`/api/despesas/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({ title: "Despesa excluída com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["despesas"] });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao excluir despesa", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Handlers
  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta despesa?")) {
      deleteMutation.mutate(id);
    }
  };

  const openFormForCreate = () => {
    setEditingDespesa(null);
    form.reset({
      descricao: "",
      valor: 0,
      diaVencimento: 1,
      tipo: "FIXA",
      formaPagamento: "PIX",
      departamento: "Geral",
      observacoes: "",
    });
    setShowForm(true);
  };

  const openFormForEdit = (despesa: Despesa) => {
    setEditingDespesa(despesa);

    // Extrair o dia de vencimento
    let diaVencimento = 1;
    if (despesa.diaVencimento) {
      diaVencimento = despesa.diaVencimento;
    } else if (despesa.dataVencimento) {
      // Para compatibilidade com dados antigos que ainda usam dataVencimento
      try {
        diaVencimento = new Date(despesa.dataVencimento).getDate();
      } catch (e) {
        diaVencimento = 1;
      }
    }

    form.reset({
      descricao: despesa.descricao,
      valor: despesa.valor,
      diaVencimento: diaVencimento,
      tipo: despesa.tipo || (despesa.categoria as "FIXA" | "VARIAVEL"), // Para compatibilidade
      formaPagamento: (despesa.formaPagamento as "PIX" | "DINHEIRO" | "BOLETO" | "CARTAO DE CRÉDITO" | "CARTAO DE DÉBITO") || "PIX",
      departamento: despesa.departamento || "Geral",
      observacoes: despesa.observacoes || "",
    });
    setShowForm(true);
  };

  // Filtrar e paginar despesas
  const filteredDespesas = despesas.filter((despesa: Despesa) =>
    despesa.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (despesa.categoria?.toLowerCase() || despesa.tipo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (despesa.departamento || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pageCount = Math.ceil(filteredDespesas.length / despesasPerPage);
  const paginatedDespesas = filteredDespesas.slice(
    (currentPage - 1) * despesasPerPage,
    currentPage * despesasPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {showForm ? "Nova Despesa" : "Cadastro de Despesas"}
          </h2>
          <p className="text-gray-500">
            {showForm
              ? "Preencha os dados da nova despesa"
              : "Gerencie as despesas fixas, variáveis e extraordinárias"}
          </p>
        </div>
        <div className="flex space-x-2">
          {!showForm ? (
            <Button onClick={openFormForCreate} className="flex items-center bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Despesa
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
            <CardTitle>Despesas Cadastradas</CardTitle>
            <CardDescription>
              Lista de despesas a pagar e pagas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2 mb-6">
              <div className="relative w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar despesas..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {paginatedDespesas.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Dia Vencimento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDespesas.map((despesa: Despesa) => (
                      <TableRow key={despesa.id}>
                        <TableCell className="font-medium">{despesa.descricao}</TableCell>
                        <TableCell>
                          {despesa.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell>
                          {despesa.diaVencimento || (despesa.dataVencimento ? new Date(despesa.dataVencimento).getDate() : "-")}
                        </TableCell>
                        <TableCell>
                          {(despesa.tipo || despesa.categoria) === "FIXA" ? "Fixa" : "Variável"}
                        </TableCell>
                        <TableCell>
                          {despesa.departamento || "Geral"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openFormForEdit(despesa)}
                            >
                              <Edit className="h-4 w-4 text-amber-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(despesa.id)}
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
                    value={despesasPerPage.toString()}
                    onValueChange={(value) => {
                      setDespesasPerPage(parseInt(value));
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
                      {paginatedDespesas.length > 0 ? `${currentPage}/${Math.max(1, pageCount)}` : "0/0"}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                      disabled={currentPage === pageCount}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-col items-center justify-center py-12">
                  <ClipboardList className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h2 className="text-xl font-medium text-gray-900 mb-2 text-center">
                    Nenhuma despesa cadastrada
                  </h2>
                  <p className="text-gray-500 mb-5 text-center">
                    Cadastre sua primeira despesa.
                  </p>
                  <Button
                    onClick={openFormForCreate}
                    className="bg-blue-600 hover:bg-blue-700 h-12 px-6"
                  >
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Nova Despesa
                  </Button>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <Select
                    value={despesasPerPage.toString()}
                    onValueChange={(value) => {
                      setDespesasPerPage(parseInt(value));
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
                      {paginatedDespesas.length > 0 ? `${currentPage}/${Math.max(1, pageCount)}` : "0/0"}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.min(Math.max(1, pageCount), p + 1))}
                      disabled={currentPage === Math.max(1, pageCount)}
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
              {editingDespesa ? "Editar Despesa" : "Dados da Despesa"}
            </CardTitle>
            <CardDescription>
              {editingDespesa
                ? "Atualize as informações da despesa"
                : "Informe os dados da nova despesa"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => {
                if (editingDespesa) {
                  updateMutation.mutate({ ...data, id: editingDespesa.id });
                } else {
                  createMutation.mutate(data);
                }
              })} className="space-y-6">
                <div className="grid gap-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="descricao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Input placeholder="Descrição da despesa" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="valor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value.replace(',', '.');
                                field.onChange(Number(value) || 0);
                              }}
                              value={field.value > 0 ? field.value : ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="diaVencimento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dia de Vencimento</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="31" 
                              placeholder="Dia" 
                              {...field} 
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="formaPagamento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Forma de Pagamento</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a forma de pagamento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PIX">Pix</SelectItem>
                              <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                              <SelectItem value="BOLETO">Boleto</SelectItem>
                              <SelectItem value="CARTAO DE CRÉDITO">Cartão de Crédito</SelectItem>
                              <SelectItem value="CARTAO DE DÉBITO">Cartão de Débito</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="tipo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="FIXA">Fixa</SelectItem>
                              <SelectItem value="VARIAVEL">Variável</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="departamento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Departamento</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o departamento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Geral">Geral</SelectItem>
                              <SelectItem value="Financeiro">Financeiro</SelectItem>
                              <SelectItem value="Comercial">Comercial</SelectItem>
                              <SelectItem value="RH">RH</SelectItem>
                              <SelectItem value="Marketing">Marketing</SelectItem>
                              <SelectItem value="TI">TI</SelectItem>
                              <SelectItem value="Operações">Operações</SelectItem>
                              <SelectItem value="Administrativo">Administrativo</SelectItem>
                              <SelectItem value="Logística">Logística</SelectItem>
                              <SelectItem value="Produção">Produção</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="observacoes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Observações adicionais sobre a despesa"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2">
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
                    {createMutation.isPending || updateMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      "Salvar"
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