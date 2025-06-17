import { useState } from "react";
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
  CardTitle 
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
import { 
  Calculator, 
  ChevronLeft, 
  ChevronRight, 
  Edit, 
  PlusCircle, 
  Search, 
  Trash,
  Percent,
  CreditCard
} from "lucide-react";

// Tipos
interface Taxa {
  id: string;
  nome: string;
  descricao: string;
  tipo: "PERCENTUAL" | "VALOR_FIXO" | "COMBINADO";
  valorFixo?: number; // Invertendo a ordem: valorFixo antes de valorPercentual
  valorPercentual?: number;
  aplicacao: "PIX" | "DINHEIRO" | "BOLETO" | "CARTAO DE CRÉDITO" | "CARTAO DE DÉBITO" | "GLOBAL";
  numParcelas?: number;
  dataCriacao: Date;
}

// Esquema de validação do formulário
const formSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  descricao: z.string().optional(),
  tipo: z.enum(["PERCENTUAL", "VALOR_FIXO", "COMBINADO"]),
  valorFixo: z.number().optional(), // Invertendo a ordem: valorFixo antes de valorPercentual
  valorPercentual: z.number().optional(),
  aplicacao: z.enum(["PIX", "DINHEIRO", "BOLETO", "CARTAO DE CRÉDITO", "CARTAO DE DÉBITO", "GLOBAL"]),
  numParcelas: z.number().optional(),
})
.refine(
  (data) => {
    if (data.tipo === "VALOR_FIXO" || data.tipo === "COMBINADO") {
      return data.valorFixo !== undefined && data.valorFixo > 0;
    }
    return true;
  },
  {
    message: "Valor fixo é obrigatório para este tipo de taxa",
    path: ["valorFixo"],
  }
)
.refine(
  (data) => {
    if (data.tipo === "PERCENTUAL" || data.tipo === "COMBINADO") {
      return data.valorPercentual !== undefined && data.valorPercentual > 0 && data.valorPercentual <= 100;
    }
    return true;
  },
  {
    message: "Valor percentual é obrigatório para este tipo de taxa",
    path: ["valorPercentual"],
  }
).refine(
  (data) => {
    if (data.aplicacao === "CARTAO DE CRÉDITO") {
      return data.numParcelas !== undefined && data.numParcelas >= 1 && data.numParcelas <= 24;
    }
    return true;
  },
  {
    message: "Número de parcelas é obrigatório para Cartão de Crédito",
    path: ["numParcelas"],
  }
);

// Componente principal
export default function CadastroTaxas() {
  // Estados
  const [showForm, setShowForm] = useState(false);
  const [editingTaxa, setEditingTaxa] = useState<Taxa | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [taxasPerPage, setTaxasPerPage] = useState(5);
  const [tipoAtual, setTipoAtual] = useState<"PERCENTUAL" | "VALOR_FIXO" | "COMBINADO">("PERCENTUAL");
  const [formaPagamentoAtual, setFormaPagamentoAtual] = useState<string>("PIX");

  // Toast para mensagens
  const { toast } = useToast();

  // Inicialização do formulário com react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      tipo: "PERCENTUAL",
      valorPercentual: 0,
      valorFixo: 0,
      aplicacao: "GLOBAL",
      numParcelas: 1,
    },
  });

  // Observar mudanças no tipo e aplicação
  const watchTipo = form.watch("tipo");
  const watchAplicacao = form.watch("aplicacao");

  if (watchTipo !== tipoAtual) {
    setTipoAtual(watchTipo);
  }

  if (watchAplicacao !== formaPagamentoAtual) {
    setFormaPagamentoAtual(watchAplicacao);
  }

  // Mock de dados para testes - deixando vazio
  const taxasMock: Taxa[] = [];

  // Query para buscar taxas (simulada)
  const { data: taxas = taxasMock } = useQuery({
    queryKey: ["taxas"],
    // queryFn já configurado no queryClient para fazer fetch de "/api/taxas"
  });

  // Mutations para criar, atualizar e excluir taxas
  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => {
      return apiRequest("/api/taxas", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: "Taxa criada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["taxas"] });
      setShowForm(false);
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao criar taxa", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema> & { id: string }) => {
      return apiRequest(`/api/taxas/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: "Taxa atualizada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["taxas"] });
      setShowForm(false);
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao atualizar taxa", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return apiRequest(`/api/taxas/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({ title: "Taxa excluída com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["taxas"] });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao excluir taxa", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Handlers
  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta taxa?")) {
      deleteMutation.mutate(id);
    }
  };

  const openFormForCreate = () => {
    setEditingTaxa(null);
    setTipoAtual("PERCENTUAL");
    setFormaPagamentoAtual("PIX");
    form.reset({
      nome: "",
      descricao: "",
      tipo: "PERCENTUAL",
      valorPercentual: 0,
      valorFixo: 0,
      aplicacao: "GLOBAL",
      numParcelas: 1,
    });
    setShowForm(true);
  };

  const openFormForEdit = (taxa: Taxa) => {
    setEditingTaxa(taxa);
    setTipoAtual(taxa.tipo);
    setFormaPagamentoAtual(taxa.aplicacao);
    form.reset({
      nome: taxa.nome,
      descricao: taxa.descricao,
      tipo: taxa.tipo,
      valorPercentual: taxa.valorPercentual || 0,
      valorFixo: taxa.valorFixo || 0,
      aplicacao: taxa.aplicacao,
      numParcelas: taxa.numParcelas || 1,
    });
    setShowForm(true);
  };

  // Filtrar e paginar taxas
  const filteredTaxas = taxas.filter((taxa) =>
    taxa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    taxa.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    taxa.aplicacao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pageCount = Math.ceil(filteredTaxas.length / taxasPerPage);
  const paginatedTaxas = filteredTaxas.slice(
    (currentPage - 1) * taxasPerPage,
    currentPage * taxasPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {showForm ? "Nova Taxa" : "Cadastro de Taxas"}
          </h2>
          <p className="text-gray-500">
            {showForm
              ? "Preencha os dados da nova taxa"
              : "Gerencie as taxas e comissões aplicáveis"}
          </p>
        </div>
        <div className="flex space-x-2">
          {!showForm ? (
            <Button onClick={openFormForCreate} className="flex items-center bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Taxa
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
            <CardTitle>Taxas Cadastradas</CardTitle>
            <CardDescription>
              Lista de taxas e comissões do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2 mb-6">
              <div className="relative w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar taxas..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {paginatedTaxas.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Aplicação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTaxas.map((taxa) => (
                      <TableRow key={taxa.id}>
                        <TableCell className="font-medium">{taxa.nome}</TableCell>
                        <TableCell>
                          {taxa.tipo === "PERCENTUAL" ? "Percentual" : 
                           taxa.tipo === "VALOR_FIXO" ? "Valor Fixo" : "Combinado"}
                        </TableCell>
                        <TableCell>
                          {taxa.tipo === "PERCENTUAL" 
                            ? `${taxa.valorPercentual?.toFixed(2)}%` 
                            : taxa.tipo === "VALOR_FIXO"
                            ? taxa.valorFixo?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            : `${taxa.valorPercentual?.toFixed(2)}% + ${taxa.valorFixo?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                        </TableCell>
                        <TableCell>
                          {taxa.aplicacao === "PIX" ? "Pix" :
                           taxa.aplicacao === "DINHEIRO" ? "Dinheiro" :
                           taxa.aplicacao === "BOLETO" ? "Boleto" :
                           taxa.aplicacao === "CARTAO DE CRÉDITO" ? `Cartão Crédito${taxa.numParcelas ? ` (${taxa.numParcelas}x)` : ''}` :
                           taxa.aplicacao === "CARTAO DE DÉBITO" ? "Cartão Débito" : "Global"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openFormForEdit(taxa)}
                            >
                              <Edit className="h-4 w-4 text-amber-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(taxa.id)}
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
                    value={taxasPerPage.toString()}
                    onValueChange={(value) => {
                      setTaxasPerPage(parseInt(value));
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
                      {paginatedTaxas.length > 0 ? `${currentPage}/${Math.max(1, pageCount)}` : "0/0"}
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
            ) : (
              <div>
                <div className="flex flex-col items-center justify-center py-12">
                  {searchTerm ? (
                    <>
                      <Percent className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1 text-center">
                        Nenhuma taxa encontrada
                      </h3>
                      <p className="text-gray-500 mb-4 text-center">
                        Nenhuma taxa encontrada com os critérios de busca.
                      </p>
                    </>
                  ) : (
                    <>
                      <Percent className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <h2 className="text-xl font-medium text-gray-900 mb-2 text-center">
                        Nenhuma taxa cadastrada
                      </h2>
                      <p className="text-gray-500 mb-5 text-center">
                        Cadastre sua primeira taxa.
                      </p>
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700 h-12 px-6"
                        onClick={openFormForCreate}
                      >
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Nova Taxa
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <Select
                    value={taxasPerPage.toString()}
                    onValueChange={(value) => {
                      setTaxasPerPage(parseInt(value));
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
                      {paginatedTaxas.length > 0 ? `${currentPage}/${Math.max(1, pageCount)}` : "0/0"}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.min(Math.max(1, pageCount), p + 1))}
                      disabled={currentPage === Math.max(1, pageCount) || pageCount === 0}
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
              {editingTaxa ? "Editar Taxa" : "Dados da Taxa"}
            </CardTitle>
            <CardDescription>
              {editingTaxa
                ? "Atualize as informações da taxa"
                : "Informe os dados da nova taxa"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => {
                if (editingTaxa) {
                  updateMutation.mutate({ ...data, id: editingTaxa.id });
                } else {
                  createMutation.mutate(data);
                }
              })} className="space-y-6">
                <div className="grid gap-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome da taxa" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                              <SelectItem value="PERCENTUAL">Percentual</SelectItem>
                              <SelectItem value="VALOR_FIXO">Valor Fixo</SelectItem>
                              <SelectItem value="COMBINADO">Combinado</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    {(tipoAtual === "VALOR_FIXO" || tipoAtual === "COMBINADO") && (
                      <FormField
                        control={form.control}
                        name="valorFixo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Fixo (R$)</FormLabel>
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
                    )}

                    {(tipoAtual === "PERCENTUAL" || tipoAtual === "COMBINADO") && (
                      <FormField
                        control={form.control}
                        name="valorPercentual"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Percentual (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="aplicacao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aplicação</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              setFormaPagamentoAtual(value);
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a aplicação" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="GLOBAL">Global</SelectItem>
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

                    {(formaPagamentoAtual === "CARTAO DE CRÉDITO" || formaPagamentoAtual === "CARTAO DE DÉBITO") && (
                      <FormField
                        control={form.control}
                        name="numParcelas"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número de Parcelas</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="24"
                                placeholder="Parcelas"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                value={field.value || 1}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descrição detalhada da taxa"
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