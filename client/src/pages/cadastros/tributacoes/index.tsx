
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
import { Calculator, Edit, PlusCircle, Search, Trash, ChevronLeft, ChevronRight, Loader2, Link2, BarChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const custoSchema = z.object({
  vinculoId: z.string({
    required_error: "O vínculo é obrigatório",
  }).min(1, "É necessário vincular a um item"),
  vinculoNome: z.string({
    required_error: "O vínculo é obrigatório",
  }).min(1, "É necessário vincular a um item"),
  vinculoTipo: z.enum(["PRODUTO", "SERVICO", "ALUGUEL"]),
  tipo: z.enum(["FIXO", "VARIAVEL"]),
  categoria: z.enum(["NOVOS", "USADOS", "ALUGUEIS", "SERVICOS"], {
    required_error: "A categoria é obrigatória",
  }),
  descricao: z.string({
    required_error: "A descrição é obrigatória"
  }).min(3, "A descrição precisa ter pelo menos 3 caracteres"),
  valor: z.coerce.number({
    required_error: "O valor é obrigatório",
    invalid_type_error: "Valor precisa ser um número válido"
  }).min(0.01, "O valor precisa ser maior que zero"),
  observacoes: z.string().max(100, "Observações limitadas a 100 caracteres").optional(),
  temRecorrencia: z.boolean().default(false),
  periodoValor: z.coerce.number().min(1, "O período deve ser maior que zero").default(1),
  periodoUnidade: z.enum(["DIAS", "MESES", "ANOS"]).default("MESES"),
});

interface Custo {
  id: string;
  vinculoId: string;
  vinculoNome: string;
  vinculoTipo: "PRODUTO" | "SERVICO" | "ALUGUEL";
  tipo: "FIXO" | "VARIAVEL";
  categoria: "NOVOS" | "USADOS" | "ALUGUEIS" | "SERVICOS";
  descricao: string;
  valor: number;
  observacoes?: string;
  dataCriacao: Date;
}

interface ItemVinculavel {
  id: string;
  nome: string;
  tipo: "PRODUTO" | "SERVICO" | "ALUGUEL";
  valorCusto?: number; // Valor de custo para produtos
  valorAtual?: number; // Valor atual para serviços e aluguéis
}

export default function CadastroCustos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCusto, setEditingCusto] = useState<Custo | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [custosPerPage, setCustosPerPage] = useState(5);
  // Removed dialog state in favor of inline suggestions
  const [vinculoSearchTerm, setVinculoSearchTerm] = useState("");
  const [categoriaAtual, setCategoriaAtual] = useState<string>("");
  const [showVinculoSuggestions, setShowVinculoSuggestions] = useState(false);

  const form = useForm<z.infer<typeof custoSchema>>({
    resolver: zodResolver(custoSchema),
    defaultValues: {
      tipo: "FIXO",
      descricao: "",
      valor: 0,
      observacoes: "",
      vinculoTipo: "PRODUTO",
      vinculoId: "",
      vinculoNome: "",
      categoria: undefined, // Sem valor padrão para categoria
      temRecorrencia: false,
      periodoValor: 1,
      periodoUnidade: "MESES",
    },
  });

  // Mock de dados para desenvolvimento
  const itensVinculaveisMock: ItemVinculavel[] = [
    { id: "1", nome: "iPhone 13", tipo: "PRODUTO", valorCusto: 3500.50 },
    { id: "2", nome: "Manutenção de Notebook", tipo: "SERVICO", valorAtual: 150.00 },
    { id: "3", nome: "Sala Comercial", tipo: "ALUGUEL", valorAtual: 2800.00 },
  ];

  const { data: custos = [], isLoading } = useQuery<Custo[]>({
    queryKey: ['custos'],
    queryFn: async () => {
      return custosMock;
    },
  });

  // Array vazio para iniciar com estado vazio
  const custosMock: Custo[] = [];

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof custoSchema>) => {
      console.log("Salvando custo:", data);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Custo criado",
        description: "Custo cadastrado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['custos'] });
      setShowForm(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof custoSchema> & { id: string }) => {
      console.log("Atualizando custo:", data);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Custo atualizado",
        description: "Custo atualizado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['custos'] });
      setShowForm(false);
      setEditingCusto(null);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log("Excluindo custo:", id);
    },
    onSuccess: () => {
      toast({
        title: "Custo excluído",
        description: "Custo excluído com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['custos'] });
    },
  });

  const handleDelete = (id: string) => {
    // Remover popup de confirmação - exclusão direta
    deleteMutation.mutate(id);
  };

  const openFormForCreate = () => {
    setEditingCusto(null);
    setCategoriaAtual(""); // Sem categoria padrão
    setVinculoSearchTerm(""); // Limpar o campo de busca de vínculo
    form.reset({
      tipo: "FIXO",
      descricao: "",
      valor: 0,
      observacoes: "",
      vinculoId: "",
      vinculoNome: "",
      vinculoTipo: "PRODUTO",
      categoria: undefined, // Sem categoria padrão
      temRecorrencia: false,
      periodoValor: 1,
      periodoUnidade: "MESES",
    });
    setShowForm(true);
  };

  const openFormForEdit = (custo: Custo) => {
    setEditingCusto(custo);
    setCategoriaAtual(custo.categoria);
    setVinculoSearchTerm(custo.vinculoNome); // Inicializar o termo de busca com o nome do vínculo

    // Valores padrão para campos de período
    const periodoValor = 1;
    const periodoUnidade = "MESES";

    form.reset({
      vinculoId: custo.vinculoId,
      vinculoNome: custo.vinculoNome,
      vinculoTipo: custo.vinculoTipo,
      tipo: custo.tipo,
      categoria: custo.categoria,
      descricao: custo.descricao,
      valor: custo.valor,
      observacoes: custo.observacoes,
      temRecorrencia: false, // Nunca pré-seleciona recorrência
      periodoValor: periodoValor,
      periodoUnidade: periodoUnidade,
    });
    setShowForm(true);
  };

  const filteredItensVinculaveis = itensVinculaveisMock.filter(item => {
    // Primeiro filtra por categoria
    const categoriaFiltro = form.watch("categoria");
    if (categoriaFiltro) {
      // Se for uma categoria específica, filtrar com base no tipo
      if (categoriaFiltro === "NOVOS" || categoriaFiltro === "USADOS") {
        if (item.tipo !== "PRODUTO") return false;
      } else if (categoriaFiltro === "ALUGUEIS") {
        if (item.tipo !== "ALUGUEL") return false;
      } else if (categoriaFiltro === "SERVICOS") {
        if (item.tipo !== "SERVICO") return false;
      }
    }

    // Depois filtra pelo texto de busca
    if (!vinculoSearchTerm) return true;
    return item.nome.toLowerCase().includes(vinculoSearchTerm.toLowerCase());
  });

  // Referência para fechar o seletor de vínculo quando clicar fora
  const vinculoRef = useRef<HTMLDivElement>(null);

  // Efeito para fechar o dropdown quando clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (vinculoRef.current && !vinculoRef.current.contains(event.target as Node)) {
        setShowVinculoSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectVinculo = (item: ItemVinculavel) => {
    try {
      // Definir os campos do formulário
      form.setValue("vinculoId", item.id, { shouldValidate: true });
      form.setValue("vinculoNome", item.nome, { shouldValidate: true });
      form.setValue("vinculoTipo", item.tipo, { shouldValidate: true });

      // Limpar erros de validação
      form.clearErrors("vinculoId");
      form.clearErrors("vinculoNome");

      // Atualizar o texto de pesquisa para o nome do item selecionado
      setVinculoSearchTerm(item.nome);
      setShowVinculoSuggestions(false);

      // Definir categoria com base no tipo de vínculo
      if (item.tipo === "PRODUTO") {
        form.setValue("categoria", "NOVOS", { shouldValidate: true }); // Padrão para produtos
        setCategoriaAtual("NOVOS");
      } else if (item.tipo === "SERVICO") {
        form.setValue("categoria", "SERVICOS", { shouldValidate: true });
        setCategoriaAtual("SERVICOS");
      } else if (item.tipo === "ALUGUEL") {
        form.setValue("categoria", "ALUGUEIS", { shouldValidate: true });
        setCategoriaAtual("ALUGUEIS");
      }

      console.log("Vínculo selecionado:", item.nome, "Tipo:", item.tipo, "Categoria:", 
                 item.tipo === "PRODUTO" ? "NOVOS" : 
                 item.tipo === "SERVICO" ? "SERVICOS" : "ALUGUEIS");
    } catch (error) {
      console.error("Erro ao selecionar vínculo:", error);
    }
  };

  // Filtrar e paginar custos
  const filteredCustos = custos.filter((custo) =>
    custo.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    custo.vinculoNome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pageCount = Math.ceil(filteredCustos.length / custosPerPage);
  const paginatedCustos = filteredCustos.slice(
    (currentPage - 1) * custosPerPage,
    currentPage * custosPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {showForm ? "Novo Custo" : "Cadastro de Custos"}
          </h2>
          <p className="text-gray-500">
            {showForm
              ? "Preencha os dados do novo custo"
              : "Gerencie os custos fixos e variáveis"}
          </p>
        </div>
        <div className="flex space-x-2">
          {!showForm ? (
            <Button onClick={openFormForCreate} className="flex items-center bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Custo
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
            <CardTitle>Custos Cadastrados</CardTitle>
            <CardDescription>
              Lista de custos fixos e variáveis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2 mb-6">
              <div className="relative w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar custos..."
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
              <>
                {paginatedCustos.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Vínculo</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedCustos.map((custo) => (
                          <TableRow key={custo.id}>
                            <TableCell className="font-medium">{custo.descricao}</TableCell>
                            <TableCell>{custo.tipo === "FIXO" ? "Fixo" : "Variável"}</TableCell>
                            <TableCell>
                              {custo.categoria === "NOVOS" ? "Produtos Novos" :
                                custo.categoria === "USADOS" ? "Produtos Usados" :
                                  custo.categoria === "ALUGUEIS" ? "Aluguéis" : "Serviços"}
                            </TableCell>
                            <TableCell>
                              {custo.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{custo.vinculoNome}</span>
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {custo.vinculoTipo}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openFormForEdit(custo)}
                                >
                                  <Edit className="h-4 w-4 text-amber-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(custo.id)}
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
                        value={custosPerPage.toString()}
                        onValueChange={(value) => {
                          setCustosPerPage(parseInt(value));
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
                          {currentPage}/{pageCount}
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
                      {searchTerm ? (
                        <>
                          <Calculator className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                          <h3 className="text-lg font-medium text-gray-900 mb-1 text-center">
                            Nenhum custo encontrado
                          </h3>
                          <p className="text-gray-500 mb-4 text-center">
                            Nenhum custo encontrado com os critérios de busca.
                          </p>
                        </>
                      ) : (
                        <>
                          <BarChart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                          <h2 className="text-xl font-medium text-gray-900 mb-2 text-center">
                            Nenhum custo cadastrado
                          </h2>
                          <p className="text-gray-500 mb-5 text-center">
                            Cadastre seu primeiro custo.
                          </p>
                          <Button 
                            className="bg-blue-600 hover:bg-blue-700 h-12 px-6"
                            onClick={openFormForCreate}
                          >
                            <PlusCircle className="mr-2 h-5 w-5" />
                            Novo Custo
                          </Button>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <Select
                        value={custosPerPage.toString()}
                        onValueChange={(value) => {
                          setCustosPerPage(parseInt(value));
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
                          {currentPage}/{pageCount || 1}
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
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingCusto ? "Editar Custo" : "Dados do Custo"}
            </CardTitle>
            <CardDescription>
              {editingCusto
                ? "Atualize as informações do custo"
                : "Informe os dados do novo custo"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => {
                console.log("Dados do formulário:", data);
                console.log("Erros de validação:", form.formState.errors);
                if (editingCusto) {
                  updateMutation.mutate({ ...data, id: editingCusto.id });
                } else {
                  createMutation.mutate(data);
                }
              }, (errors) => {
                console.error("Erro ao submeter formulário:", errors);
                // Mostra um toast com os erros de validação para o usuário
                toast({
                  title: "Erro ao salvar",
                  description: "Verifique se todos os campos obrigatórios foram preenchidos corretamente",
                  variant: "destructive"
                });
              })} className="space-y-6">
                <div className="grid gap-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="categoria"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              setCategoriaAtual(value);
                              // Limpar campos de vínculo ao mudar categoria
                              form.setValue("vinculoId", "", { shouldValidate: true });
                              form.setValue("vinculoNome", "", { shouldValidate: true });
                              setVinculoSearchTerm("");
                            }}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a categoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NOVOS">Produtos Novos</SelectItem>
                              <SelectItem value="USADOS">Produtos Usados</SelectItem>
                              <SelectItem value="ALUGUEIS">Aluguéis</SelectItem>
                              <SelectItem value="SERVICOS">Serviços</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Campos ocultos para garantir que valores importantes sejam enviados corretamente */}
                    <FormField
                      control={form.control}
                      name="vinculoId"
                      render={({ field }) => (
                        <input type="hidden" {...field} />
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vinculoTipo"
                      render={({ field }) => (
                        <input type="hidden" {...field} />
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vinculoNome"
                      render={({ field }) => (
                        <FormItem className="relative">
                          <FormLabel>Vínculo</FormLabel>
                          <div>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  placeholder="Pesquisar vínculo..."
                                  value={vinculoSearchTerm}
                                  onChange={(e) => {
                                    setVinculoSearchTerm(e.target.value);
                                    if (categoriaAtual) {
                                      setShowVinculoSuggestions(true);
                                    }
                                  }}
                                  onFocus={() => {
                                    if (categoriaAtual) {
                                      setShowVinculoSuggestions(true);
                                    }
                                  }}
                                  disabled={!categoriaAtual}
                                  className="w-full pr-8"
                                />
                              </FormControl>
{/* Indicador "Selecionado" removido conforme solicitado */}
                              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                            </div>

                            {showVinculoSuggestions && categoriaAtual && (
                              <div 
                                ref={vinculoRef}
                                className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border max-h-[200px] overflow-y-auto"
                              >
                                {filteredItensVinculaveis.length > 0 ? (
                                  filteredItensVinculaveis.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                                      onClick={() => handleSelectVinculo(item)}
                                    >
                                      <div>
                                        <p className="font-medium text-gray-800">
                                          {item.nome} - {item.tipo === "PRODUTO" 
                                            ? `Valor de Custo: ${item.valorCusto?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` 
                                            : item.tipo === "SERVICO"
                                              ? `Valor de Custo: ${item.valorAtual?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                                              : `Valor do Bem: ${item.valorAtual?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                                        </p>
                                        <div className="flex items-center mt-1">
                                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                            {item.tipo === "PRODUTO" ? "Produto" : 
                                             item.tipo === "SERVICO" ? "Serviço" : "Aluguel"}
                                          </span>
                                        </div>
                                      </div>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" tabIndex={-1}>
                                        <Link2 className="h-4 w-4 text-blue-500" />
                                      </Button>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-3 text-gray-500 text-center">Nenhum item encontrado para esta categoria</div>
                                )}
                              </div>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-6 sm:grid-cols-4">
                    <FormField
                      control={form.control}
                      name="descricao"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Input placeholder="Descrição do custo" {...field} />
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
                                const value = e.target.value.replace(/[^0-9,\.]/g, '');
                                // Só converte para float se não estiver vazio
                                if (value) {
                                  field.onChange(parseFloat(value.replace(',', '.')));
                                } else {
                                  field.onChange(''); // Passa string vazia para tratar depois no schema
                                }
                              }}
                              value={field.value ? field.value.toString().replace('.', ',') : ''}
                            />
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
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="FIXO">Fixo</SelectItem>
                              <SelectItem value="VARIAVEL">Variável</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4">
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="temRecorrencia"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recorrência</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(value === "true")} 
                              value={field.value ? "true" : "false"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="true">Possui recorrência</SelectItem>
                                <SelectItem value="false">Sem recorrência</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="periodoValor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={!form.watch("temRecorrencia") ? "text-muted-foreground" : ""}>
                              Recorrência (a cada)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Valor"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                disabled={!form.watch("temRecorrencia")}
                                className={!form.watch("temRecorrencia") ? "opacity-50 cursor-not-allowed" : ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="periodoUnidade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={!form.watch("temRecorrencia") ? "text-muted-foreground" : ""}>
                              Unidade
                            </FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value || "MESES"}
                              value={field.value}
                              disabled={!form.watch("temRecorrencia")}
                            >
                              <FormControl>
                                <SelectTrigger className={!form.watch("temRecorrencia") ? "opacity-50 cursor-not-allowed" : ""}>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="DIAS">Dias</SelectItem>
                                <SelectItem value="MESES">Meses</SelectItem>
                                <SelectItem value="ANOS">Anos</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="observacoes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações (opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Observações sobre este custo"
                            className="resize-none h-20"
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
                    onClick={() => {
                      setShowForm(false);
                      setEditingCusto(null);
                      form.reset();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={
                      createMutation.isPending || 
                      updateMutation.isPending
                    }
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingCusto ? "Atualizando..." : "Cadastrando..."}
                      </>
                    ) : (
                      editingCusto ? "Atualizar" : "Cadastrar"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Dialog removido em favor da busca e sugestões inline */}
    </div>
  );
}
