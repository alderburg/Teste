import { useState, useEffect } from "react";
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
import { User, Users, Edit, PlusCircle, Search, Trash, Upload, Download, Filter, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Componente para exibir mensagens de erro
const FormErrorMessage = ({ message }: { message: string }) => (
  <div className="text-sm font-medium text-destructive mt-1">{message}</div>
);

interface Cliente {
  id: number;
  nome: string;
  cpfCnpj: string | null;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
  ativo: boolean;
  userId: number | null;
  createdAt: string;
  updatedAt: string;
}

const clienteSchema = z.object({
  nome: z.string().min(1, { message: "O nome do cliente é obrigatório" }),
  cpfCnpj: z.string().optional().nullable(),
  email: z.string().email({ message: "E-mail inválido" }).optional().nullable(),
  telefone: z.string().optional().nullable(),
  celular: z.string().optional().nullable(),
  cep: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
  userId: z.number().nullable(),
});

type FormValues = z.infer<typeof clienteSchema>;

export default function ClientesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Estados do componente
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [clientesPerPage, setClientesPerPage] = useState(5);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Configuração do formulário com react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nome: "",
      cpfCnpj: "",
      email: "",
      telefone: "",
      celular: "",
      cep: "",
      endereco: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      observacoes: "",
      ativo: true,
      userId: user?.id,
    },
    mode: "onSubmit",
  });

  // Consulta para obter a lista de clientes
  const { data: clientes = [], isLoading } = useQuery<Cliente[]>({
    queryKey: ["/api/clientes", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/clientes?userId=${user?.id || 0}`);
      return await res.json();
    },
    enabled: !!user,
  });

  // Mutation para criar um novo cliente
  const createMutation = useMutation<Cliente, Error, Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'>>({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", "/api/clientes", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Cliente criado",
        description: "Cliente cadastrado com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clientes"] });
      setShowForm(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar um cliente existente
  const updateMutation = useMutation<Cliente, Error, { id: number; data: Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'> }>({
    mutationFn: async ({ id, data }) => {
      const res = await apiRequest("PUT", `/api/clientes/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Cliente atualizado",
        description: "Cliente atualizado com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clientes"] });
      setShowForm(false);
      setEditingCliente(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir um cliente
  const deleteMutation = useMutation<void, Error, number>({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/clientes/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Cliente excluído",
        description: "Cliente removido com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clientes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler para submissão do formulário
  const onSubmit = () => {
    const values = form.getValues();
    const errors: Record<string, string> = {};
    
    // Validação simples
    if (!values.nome) {
      errors.nome = "Nome é obrigatório";
    }
    
    if (!values.email) {
      errors.email = "Email é obrigatório";
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
    const clienteData = {
      ...values,
      userId: user?.id || null,
    };
    
    if (editingCliente) {
      updateMutation.mutate({ id: editingCliente.id, data: clienteData });
    } else {
      createMutation.mutate(clienteData);
    }
  };

  // Função para alterar número de itens por página
  const handleChangeClientesPerPage = (value: string) => {
    setClientesPerPage(Number(value));
    setCurrentPage(1);
  };

  // Funções para manipulação do formulário
  const openFormForCreate = () => {
    setEditingCliente(null);
    form.reset({
      nome: "",
      cpfCnpj: "",
      email: "",
      telefone: "",
      celular: "",
      cep: "",
      endereco: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      observacoes: "",
      ativo: true,
      userId: user?.id,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const openFormForEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    form.reset({
      nome: cliente.nome,
      cpfCnpj: cliente.cpfCnpj || "",
      email: cliente.email || "",
      telefone: cliente.telefone || "",
      celular: cliente.celular || "",
      cep: cliente.cep || "",
      endereco: cliente.endereco || "",
      numero: cliente.numero || "",
      complemento: cliente.complemento || "",
      bairro: cliente.bairro || "",
      cidade: cliente.cidade || "",
      estado: cliente.estado || "",
      observacoes: cliente.observacoes || "",
      ativo: cliente.ativo,
      userId: cliente.userId,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este cliente?")) {
      deleteMutation.mutate(id);
    }
  };

  // Filtrar e paginar clientes
  const filteredClientes = clientes.filter((cliente) => 
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cliente.cpfCnpj && cliente.cpfCnpj.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (cliente.email && cliente.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (cliente.telefone && cliente.telefone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pageCount = Math.ceil(filteredClientes.length / clientesPerPage);
  const paginatedClientes = filteredClientes.slice(
    (currentPage - 1) * clientesPerPage,
    currentPage * clientesPerPage
  );
  
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
            {showForm 
              ? (editingCliente ? "Editar Cliente" : "Novo Cliente") 
              : "Cadastro de Clientes"
            }
          </h2>
          <p className="text-gray-500">
            {showForm 
              ? (editingCliente 
                ? "Atualize os dados do cliente" 
                : "Preencha os dados do novo cliente"
                ) 
              : "Gerencie os clientes do seu negócio"
            }
          </p>
        </div>
        <div className="flex space-x-2">
          {!showForm ? (
            <Button onClick={openFormForCreate} className="flex items-center bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          ) : (
            <Button onClick={() => setShowForm(false)} className="flex items-center" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Lista
            </Button>
          )}
        </div>
      </div>

      {!showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>
              Lista de clientes cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2 mb-6 flex flex-col sm:flex-row gap-4">
              <div className="relative w-full sm:w-auto sm:flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar clientes..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                {filteredClientes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    {searchTerm ? (
                      <>
                        <Users className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1 text-center">
                          Nenhum cliente encontrado
                        </h3>
                        <p className="text-gray-500 mb-4 text-center">
                          Nenhum cliente encontrado com os critérios de busca.
                        </p>
                      </>
                    ) : (
                      <>
                        <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                        <h2 className="text-xl font-medium text-gray-900 mb-2 text-center">
                          Nenhum cliente cadastrado
                        </h2>
                        <p className="text-gray-500 mb-5 text-center">
                          Cadastre seu primeiro cliente.
                        </p>
                        <Button
                          onClick={openFormForCreate}
                          className="bg-blue-600 hover:bg-blue-700 h-12 px-6"
                        >
                          <PlusCircle className="mr-2 h-5 w-5" />
                          Novo Cliente
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>CPF/CNPJ</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>E-mail</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedClientes.map((cliente) => (
                          <TableRow key={cliente.id}>
                            <TableCell className="font-medium">{cliente.nome}</TableCell>
                            <TableCell>{cliente.cpfCnpj || "-"}</TableCell>
                            <TableCell>{cliente.telefone || "-"}</TableCell>
                            <TableCell>{cliente.email || "-"}</TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                  cliente.ativo
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                )}
                              >
                                {cliente.ativo ? "Ativo" : "Inativo"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right flex justify-end gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      className="h-8 w-8 p-0" 
                                      onClick={() => openFormForEdit(cliente)}
                                    >
                                      <Edit className="h-4 w-4 text-blue-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Editar cliente</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" 
                                      onClick={() => handleDelete(cliente.id)}
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Excluir cliente</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
            
            {!isLoading && (
              <div className="flex items-center justify-between mt-4">
                <div>
                  <Select
                    value={clientesPerPage.toString()}
                    onValueChange={handleChangeClientesPerPage}
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
                    size="icon"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1 || filteredClientes.length === 0}
                    className="h-10 w-10 rounded-md"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {filteredClientes.length === 0 ? "0/0" : `${currentPage}/${pageCount}`}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToNextPage}
                    disabled={currentPage >= pageCount || filteredClientes.length === 0}
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
        <Card>
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
            <CardDescription>
              Informe os dados de cadastro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={cn(formErrors.nome ? "text-destructive" : "")}>
                          Nome/Razão Social*
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nome completo ou razão social" 
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
                    name="cpfCnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF/CNPJ</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="CPF ou CNPJ" 
                            {...field} 
                            value={field.value || ""}
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={cn(formErrors.email ? "text-destructive" : "")}>
                          E-mail*
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="E-mail para contato" 
                            {...field} 
                            value={field.value || ""}
                            className={cn(formErrors.email ? "border-destructive" : "")}
                          />
                        </FormControl>
                        {formErrors.email && <FormErrorMessage message={formErrors.email} />}
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
                            placeholder="Telefone principal" 
                            {...field} 
                            value={field.value || ""}
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
                    name="celular"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Celular</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Celular" 
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
                    name="ativo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === "true")}
                          defaultValue={field.value ? "true" : "false"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Ativo</SelectItem>
                            <SelectItem value="false">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Separator />
                <h3 className="text-lg font-medium">Endereço</h3>
                
                <div className="grid gap-6 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="CEP" 
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
                    name="endereco"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Rua, Avenida, etc." 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid gap-6 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Número" 
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
                    name="complemento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Apto, sala, etc." 
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
                    name="bairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Bairro" 
                            {...field} 
                            value={field.value || ""}
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
                        <Select 
                          onValueChange={field.onChange}
                          defaultValue={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o estado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="AC">Acre</SelectItem>
                            <SelectItem value="AL">Alagoas</SelectItem>
                            <SelectItem value="AP">Amapá</SelectItem>
                            <SelectItem value="AM">Amazonas</SelectItem>
                            <SelectItem value="BA">Bahia</SelectItem>
                            <SelectItem value="CE">Ceará</SelectItem>
                            <SelectItem value="DF">Distrito Federal</SelectItem>
                            <SelectItem value="ES">Espírito Santo</SelectItem>
                            <SelectItem value="GO">Goiás</SelectItem>
                            <SelectItem value="MA">Maranhão</SelectItem>
                            <SelectItem value="MT">Mato Grosso</SelectItem>
                            <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                            <SelectItem value="MG">Minas Gerais</SelectItem>
                            <SelectItem value="PA">Pará</SelectItem>
                            <SelectItem value="PB">Paraíba</SelectItem>
                            <SelectItem value="PR">Paraná</SelectItem>
                            <SelectItem value="PE">Pernambuco</SelectItem>
                            <SelectItem value="PI">Piauí</SelectItem>
                            <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                            <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                            <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                            <SelectItem value="RO">Rondônia</SelectItem>
                            <SelectItem value="RR">Roraima</SelectItem>
                            <SelectItem value="SC">Santa Catarina</SelectItem>
                            <SelectItem value="SP">São Paulo</SelectItem>
                            <SelectItem value="SE">Sergipe</SelectItem>
                            <SelectItem value="TO">Tocantins</SelectItem>
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
                          placeholder="Observações adicionais sobre o cliente" 
                          className="min-h-[100px]" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-4 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingCliente(null);
                      form.reset();
                      setFormErrors({});
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => onSubmit(form.getValues())}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent border-white"></div>
                    ) : null}
                    {editingCliente ? "Atualizar" : "Cadastrar"}
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