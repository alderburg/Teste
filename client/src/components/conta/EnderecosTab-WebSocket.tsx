import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { MapPin, PlusCircle, Edit3, Trash2, Save, X, Building, Home, Briefcase, CheckCircle, Loader2, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useWebSocketData } from "@/hooks/useWebSocketData";
import InputMask from "react-input-mask";
import { Pagination } from "@/components/Pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Schema de validação para endereços
const enderecoSchema = z.object({
  tipo: z.enum(["comercial", "residencial", "outro"], {
    required_error: "Selecione um tipo de endereço",
  }),
  cep: z.string().min(8, "CEP deve ter pelo menos 8 caracteres"),
  logradouro: z.string().min(1, "Logradouro é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  estado: z.string().length(2, "Estado deve ter 2 caracteres"),
  principal: z.boolean().default(false),
});

// Interface para EnderecoFormValues
interface EnderecoFormValues extends z.infer<typeof enderecoSchema> {
  id?: number;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function EnderecosTab() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Estados para dados carregados via WebSocket/fetch
  const [enderecosData, setEnderecosData] = useState<EnderecoFormValues[]>([]);
  const [isLoadingEnderecos, setIsLoadingEnderecos] = useState(true);

  // Estados locais para gerenciar endereços
  const [enderecos, setEnderecos] = useState<EnderecoFormValues[]>([]);
  
  // Estado para pesquisa
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  // Estados para controle de UI
  const [showAddEndereco, setShowAddEndereco] = useState(false);
  const [editingEndereco, setEditingEndereco] = useState<EnderecoFormValues | null>(null);
  const [enderecoParaExcluir, setEnderecoParaExcluir] = useState<EnderecoFormValues | null>(null);
  const [camposEnderecoValidados, setCamposEnderecoValidados] = useState({
    tipo: true,
    cep: true,
    logradouro: true,
    numero: true,
    bairro: true,
    cidade: true,
    estado: true
  });

  // Estados para CEP
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepErro, setCepErro] = useState<string | null>(null);

  // Estados para loading de operações
  const [isAddingEndereco, setIsAddingEndereco] = useState(false);
  const [isUpdatingEndereco, setIsUpdatingEndereco] = useState(false);
  const [isDeletingEndereco, setIsDeletingEndereco] = useState(false);

  // Form para endereços
  const enderecoForm = useForm<EnderecoFormValues>({
    resolver: zodResolver(enderecoSchema),
    defaultValues: {
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      principal: false,
      tipo: "comercial"
    },
    mode: "onSubmit",
  });

  // Função para buscar endereços via fetch
  const fetchEnderecosData = async () => {
    try {
      setIsLoadingEnderecos(true);
      const response = await fetch('/api/enderecos', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        const enderecosArray = Array.isArray(data) ? data : [];
        setEnderecosData(enderecosArray);
        setEnderecos(enderecosArray);
      }
    } catch (error) {
      console.error('Erro ao buscar endereços:', error);
    } finally {
      setIsLoadingEnderecos(false);
    }
  };

  // Função para adicionar um endereço
  const addEnderecoMutation = async (data: EnderecoFormValues) => {
    try {
      setIsAddingEndereco(true);
      const response = await fetch('/api/enderecos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: user?.id }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erro ao adicionar endereço: ${response.status}`);
      }

      const newEndereco = await response.json();
      
      // Atualizar dados locais
      setEnderecosData(prev => [...prev, newEndereco]);
      setEnderecos(prev => [...prev, newEndereco]);
      
      // Fechar o formulário e resetar
      setShowAddEndereco(false);
      setEditingEndereco(null);
      enderecoForm.reset({
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        principal: false,
        tipo: "comercial"
      });

      setCamposEnderecoValidados({
        tipo: true,
        cep: true,
        logradouro: true,
        numero: true,
        bairro: true,
        cidade: true,
        estado: true,
      });

      toast({
        title: "Endereço adicionado",
        description: "O endereço foi adicionado com sucesso.",
        variant: "default",
        className: "bg-white border-gray-200",
      });

      return newEndereco;
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar endereço",
        description: error.message || "Ocorreu um erro ao adicionar o endereço.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsAddingEndereco(false);
    }
  };

  // Função para atualizar um endereço
  const updateEnderecoMutation = async ({ id, data }: { id: number, data: EnderecoFormValues }) => {
    try {
      setIsUpdatingEndereco(true);
      const response = await fetch(`/api/enderecos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erro ao atualizar endereço: ${response.status}`);
      }

      const updatedEndereco = await response.json();
      
      // Atualizar dados locais
      setEnderecosData(prev => prev.map(endereco => endereco.id === id ? updatedEndereco : endereco));
      setEnderecos(prev => prev.map(endereco => endereco.id === id ? updatedEndereco : endereco));
      
      // Fechar o formulário e resetar
      setShowAddEndereco(false);
      setEditingEndereco(null);
      enderecoForm.reset({
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        principal: false,
        tipo: "comercial"
      });

      setCamposEnderecoValidados({
        tipo: true,
        cep: true,
        logradouro: true,
        numero: true,
        bairro: true,
        cidade: true,
        estado: true,
      });

      toast({
        title: "Endereço atualizado",
        description: "O endereço foi atualizado com sucesso.",
        variant: "default",
        className: "bg-white border-gray-200",
      });

      return updatedEndereco;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar endereço",
        description: error.message || "Ocorreu um erro ao atualizar o endereço.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUpdatingEndereco(false);
    }
  };

  // Função para excluir um endereço
  const deleteEnderecoMutation = async (id: number) => {
    try {
      setIsDeletingEndereco(true);
      const response = await fetch(`/api/enderecos/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erro ao excluir endereço: ${response.status}`);
      }

      // Atualizar dados locais
      setEnderecosData(prev => prev.filter(endereco => endereco.id !== id));
      setEnderecos(prev => prev.filter(endereco => endereco.id !== id));
      
      setEnderecoParaExcluir(null);

      toast({
        title: "Endereço removido",
        description: "O endereço foi removido com sucesso.",
        variant: "default",
        className: "bg-white border-gray-200",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover endereço",
        description: error.message || "Ocorreu um erro ao remover o endereço.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsDeletingEndereco(false);
    }
  };

  // Função para definir endereço como principal
  const setPrincipalMutation = async (id: number) => {
    try {
      const response = await fetch(`/api/enderecos/${id}/principal`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erro ao definir endereço principal: ${response.status}`);
      }

      // Recarregar dados
      await fetchEnderecosData();

      toast({
        title: "Endereço principal definido",
        description: "O endereço foi definido como principal com sucesso.",
        variant: "default",
        className: "bg-white border-gray-200",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao definir endereço principal",
        description: error.message || "Ocorreu um erro ao definir o endereço como principal.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Carregamento inicial
  useEffect(() => {
    if (user?.id) {
      fetchEnderecosData();
    }
  }, [user?.id]);

  // Função para consultar CEP
  const consultarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');

    if (cepLimpo.length !== 8) {
      setCepErro('CEP inválido. O CEP deve ter 8 dígitos.');
      return;
    }

    setCepErro(null);

    try {
      setIsLoadingCep(true);
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        setCepErro('CEP não encontrado');
        setIsLoadingCep(false);
        return;
      }

      enderecoForm.setValue('logradouro', data.logradouro || '');
      enderecoForm.setValue('bairro', data.bairro || '');
      enderecoForm.setValue('cidade', data.localidade || '');
      enderecoForm.setValue('estado', data.uf || '');

      setCamposEnderecoValidados(prev => ({
        ...prev,
        logradouro: data.logradouro ? true : prev.logradouro,
        bairro: data.bairro ? true : prev.bairro,
        cidade: data.localidade ? true : prev.cidade,
        estado: data.uf ? true : prev.estado
      }));

      if (!enderecoForm.getValues().numero) {
        setTimeout(() => {
          const numeroInput = document.querySelector('input[name="numero"]');
          if (numeroInput) {
            (numeroInput as HTMLInputElement).focus();
          }
        }, 100);
      }

      setIsLoadingCep(false);
    } catch (error) {
      console.error('Erro ao consultar CEP:', error);
      setCepErro('Erro ao consultar o CEP. Verifique sua conexão.');
      setIsLoadingCep(false);
    }
  };

  // Função para formatar CEP
  const formatarCep = (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length <= 5) {
      return cepLimpo;
    } else {
      return cepLimpo.slice(0, 5) + '-' + cepLimpo.slice(5, 8);
    }
  };

  // Handlers
  const handleSaveEndereco = async (formData: EnderecoFormValues) => {
    try {
      if (editingEndereco && editingEndereco.id) {
        await updateEnderecoMutation({
          id: editingEndereco.id,
          data: formData
        });
      } else {
        await addEnderecoMutation(formData);
      }
    } catch (error: any) {
      console.error('Erro ao salvar endereço:', error);
    }
  };

  const handleEditEndereco = (endereco: EnderecoFormValues) => {
    setEditingEndereco(endereco);
    Object.keys(enderecoForm.getValues()).forEach((key) => {
      enderecoForm.setValue(key as any, endereco[key as keyof EnderecoFormValues]);
    });

    setCamposEnderecoValidados({
      tipo: true,
      cep: true,
      logradouro: true,
      numero: true,
      bairro: true,
      cidade: true,
      estado: true
    });

    setShowAddEndereco(true);
  };

  const handleDeleteEndereco = (endereco: EnderecoFormValues) => {
    setEnderecoParaExcluir(endereco);
  };

  const confirmarExclusaoEndereco = async () => {
    if (enderecoParaExcluir && enderecoParaExcluir.id) {
      await deleteEnderecoMutation(enderecoParaExcluir.id);
    }
  };

  const handleSetPrincipal = async (endereco: any) => {
    if (endereco.id) {
      await setPrincipalMutation(endereco.id);
    }
  };

  // Filtrar endereços por pesquisa
  const filteredEnderecos = enderecos.filter(endereco => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      endereco.logradouro?.toLowerCase().includes(searchLower) ||
      endereco.bairro?.toLowerCase().includes(searchLower) ||
      endereco.cidade?.toLowerCase().includes(searchLower) ||
      endereco.tipo?.toLowerCase().includes(searchLower)
    );
  });

  // Paginação
  const totalPages = Math.ceil(filteredEnderecos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEnderecos = filteredEnderecos.slice(startIndex, endIndex);

  if (isLoadingEnderecos) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <span className="ml-2 text-gray-600">Carregando endereços...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium">Endereços</h3>
          <p className="text-sm text-gray-500">Gerencie seus endereços de entrega e cobrança</p>
        </div>
        <Button 
          onClick={() => {
            setEditingEndereco(null);
            enderecoForm.reset({
              cep: "",
              logradouro: "",
              numero: "",
              complemento: "",
              bairro: "",
              cidade: "",
              estado: "",
              principal: false,
              tipo: "comercial"
            });
            setCamposEnderecoValidados({
              tipo: true,
              cep: true,
              logradouro: true,
              numero: true,
              bairro: true,
              cidade: true,
              estado: true
            });
            setShowAddEndereco(true);
          }}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Adicionar Endereço
        </Button>
      </div>

      {/* Barra de pesquisa */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Pesquisar endereços..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Formulário de adicionar/editar endereço */}
      {showAddEndereco && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {editingEndereco ? 'Editar Endereço' : 'Adicionar Novo Endereço'}
            </CardTitle>
            <CardDescription>
              {editingEndereco ? 'Atualize as informações do endereço' : 'Preencha os dados do novo endereço'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...enderecoForm}>
              <form onSubmit={enderecoForm.handleSubmit(handleSaveEndereco)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={enderecoForm.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Endereço</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="comercial">Comercial</SelectItem>
                            <SelectItem value="residencial">Residencial</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={enderecoForm.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <InputMask
                            mask="99999-999"
                            value={field.value}
                            onChange={(e) => {
                              const formattedValue = formatarCep(e.target.value);
                              field.onChange(formattedValue);
                            }}
                            onBlur={() => {
                              if (field.value && field.value.length >= 8) {
                                consultarCep(field.value);
                              }
                            }}
                          >
                            {(inputProps) => (
                              <div className="relative">
                                <Input {...inputProps} placeholder="00000-000" />
                                {isLoadingCep && (
                                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                                )}
                              </div>
                            )}
                          </InputMask>
                        </FormControl>
                        {cepErro && <p className="text-sm text-red-500">{cepErro}</p>}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={enderecoForm.control}
                  name="logradouro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logradouro</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Rua, Avenida, etc." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={enderecoForm.control}
                    name="numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={enderecoForm.control}
                    name="complemento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Apto, Casa, etc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={enderecoForm.control}
                    name="bairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome do bairro" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={enderecoForm.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome da cidade" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={enderecoForm.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="SP" maxLength={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={enderecoForm.control}
                  name="principal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Definir como endereço principal
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex gap-3">
                  <Button 
                    type="submit" 
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={isAddingEndereco || isUpdatingEndereco}
                  >
                    {(isAddingEndereco || isUpdatingEndereco) ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {editingEndereco ? 'Atualizar' : 'Salvar'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowAddEndereco(false);
                      setEditingEndereco(null);
                      enderecoForm.reset();
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Lista de endereços */}
      {paginatedEnderecos.length > 0 ? (
        <div className="grid gap-4">
          {paginatedEnderecos.map((endereco) => (
            <Card key={endereco.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {endereco.tipo === 'comercial' && <Briefcase className="h-4 w-4 text-blue-600" />}
                      {endereco.tipo === 'residencial' && <Home className="h-4 w-4 text-green-600" />}
                      {endereco.tipo === 'outro' && <Building className="h-4 w-4 text-gray-600" />}
                      <span className="font-medium text-sm text-gray-700 capitalize">{endereco.tipo}</span>
                      {endereco.principal && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Principal
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{endereco.logradouro}, {endereco.numero}</p>
                      {endereco.complemento && (
                        <p className="text-sm text-gray-600">{endereco.complemento}</p>
                      )}
                      <p className="text-sm text-gray-600">
                        {endereco.bairro}, {endereco.cidade} - {endereco.estado}
                      </p>
                      <p className="text-sm text-gray-600">CEP: {endereco.cep}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!endereco.principal && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetPrincipal(endereco)}
                        className="text-purple-600 border-purple-600 hover:bg-purple-50"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Principal
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditEndereco(endereco)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteEndereco(endereco)}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                      disabled={isDeletingEndereco}
                    >
                      {isDeletingEndereco ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum endereço encontrado</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Nenhum endereço corresponde à sua pesquisa' : 'Você ainda não cadastrou nenhum endereço'}
            </p>
            {!searchTerm && (
              <Button 
                onClick={() => setShowAddEndereco(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Adicionar Primeiro Endereço
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Paginação */}
      {filteredEnderecos.length > itemsPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
          totalItems={filteredEnderecos.length}
        />
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!enderecoParaExcluir} onOpenChange={() => setEnderecoParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este endereço? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusaoEndereco}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}