
import { useState, useCallback, useMemo, useEffect } from "react";
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
import { useWebSocketData } from "@/hooks/useWebSocketData";
import { MapPin, PlusCircle, Edit3, Trash2, Save, X, Building, Home, Briefcase, CheckCircle, Loader2, Search, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
  tipo: z.enum(["comercial", "residencial", "entrega", "outro"], {
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

interface EnderecoFormValues extends z.infer<typeof enderecoSchema> {
  id?: number;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function EnderecosTabWebSocket() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showAddEndereco, setShowAddEndereco] = useState(false);
  const [editingEndereco, setEditingEndereco] = useState<EnderecoFormValues | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [enderecoParaExcluir, setEnderecoParaExcluir] = useState<EnderecoFormValues | null>(null);

  // Estados para controlar validação dos campos
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

  // Estado para controlar quais botões estão desabilitados durante operações
  const [disabledButtons, setDisabledButtons] = useState<{[key: number]: boolean}>({});

  // Usar WebSocket para gerenciar dados
  const {
    data: enderecos,
    loading: isLoadingEnderecos,
    createItem: createEndereco,
    updateItem: updateEndereco,
    deleteItem: deleteEndereco
  } = useWebSocketData<EnderecoFormValues>({
    endpoint: '/api/enderecos',
    resource: 'enderecos'
  });

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

  // Estados para ordenação e loading inicial
  const [enderecosOrdenados, setEnderecosOrdenados] = useState<EnderecoFormValues[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // Atualizar endereços ordenados quando os dados mudarem
  useEffect(() => {
    if (enderecos && Array.isArray(enderecos)) {
      console.log("Dados de endereços carregados:", enderecos);
      
      // Reordenar para colocar o endereço principal no topo
      const ordenados = [...enderecos].sort((a, b) => {
        if (a.principal && !b.principal) return -1;
        if (!a.principal && b.principal) return 1;
        return 0;
      });
      
      setEnderecosOrdenados(ordenados);
      setInitialLoading(false);
    }
  }, [enderecos]);

  // Função para consultar o CEP e preencher automaticamente os campos
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

  // Função para lidar com o evento onBlur dos campos de endereço
  const handleEnderecoInputBlur = () => {
    const tipo = enderecoForm.getValues().tipo;
    const cep = enderecoForm.getValues().cep;
    const logradouro = enderecoForm.getValues().logradouro;
    const numero = enderecoForm.getValues().numero;
    const bairro = enderecoForm.getValues().bairro;
    const cidade = enderecoForm.getValues().cidade;
    const estado = enderecoForm.getValues().estado;

    setCamposEnderecoValidados({
      tipo: tipo.trim() !== '',
      cep: cep.trim() !== '',
      logradouro: logradouro.trim() !== '',
      numero: numero.trim() !== '',
      bairro: bairro.trim() !== '',
      cidade: cidade.trim() !== '',
      estado: estado.trim() !== ''
    });
  };

  // Função para submeter o formulário
  const onSubmit = useCallback(async (data: EnderecoFormValues) => {
    try {
      if (editingEndereco) {
        await updateEndereco(editingEndereco.id!, data);
        setEditingEndereco(null);
      } else {
        await createEndereco(data);
      }
      
      setShowAddEndereco(false);
      enderecoForm.reset();
      setCamposEnderecoValidados({
        tipo: true,
        cep: true,
        logradouro: true,
        numero: true,
        bairro: true,
        cidade: true,
        estado: true
      });
    } catch (error) {
      // Erro já tratado no hook useWebSocketData
    }
  }, [editingEndereco, updateEndereco, createEndereco, enderecoForm]);

  // Função para confirmar exclusão
  const confirmarExclusaoEndereco = useCallback(async () => {
    if (enderecoParaExcluir) {
      await deleteEndereco(enderecoParaExcluir.id!);
      setEnderecoParaExcluir(null);
    }
  }, [enderecoParaExcluir, deleteEndereco]);

  // Função para editar endereço
  const handleEditEndereco = useCallback((endereco: EnderecoFormValues) => {
    setEditingEndereco(endereco);
    enderecoForm.reset(endereco);
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
  }, [enderecoForm]);

  // Função para definir endereço como principal
  const handleSetPrincipal = useCallback(async (endereco: EnderecoFormValues) => {
    try {
      const id = endereco.id!;
      
      // Desabilitar todos os botões temporariamente
      const allButtons: {[key: number]: boolean} = {};
      if (Array.isArray(enderecosOrdenados)) {
        enderecosOrdenados.forEach(e => {
          if (e.id) allButtons[e.id] = true;
        });
      }
      setDisabledButtons(allButtons);

      const response = await fetch(`/api/enderecos/${id}/principal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Endereço não encontrado");
        }
        const jsonResponse = await response.json().catch(() => ({}));
        throw new Error(jsonResponse.message || "Erro desconhecido ao definir endereço como principal");
      }

      toast({
        title: "Endereço principal atualizado",
        description: "O endereço foi definido como principal com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });

      // Reabilitar botões após operação
      setTimeout(() => {
        setDisabledButtons({});
      }, 1000);
    } catch (error: any) {
      console.error('Erro ao definir endereço principal:', error);
      toast({
        title: "Erro!",
        description: error.message,
        variant: "destructive",
      });
      setDisabledButtons({});
    }
  }, [enderecosOrdenados]);

  // Filtrar endereços e aplicar paginação
  const { filteredEnderecos, paginatedEnderecos, totalPages } = useMemo(() => {
    const filtered = enderecosOrdenados.filter(endereco => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        endereco.logradouro?.toLowerCase().includes(searchLower) ||
        endereco.bairro?.toLowerCase().includes(searchLower) ||
        endereco.cidade?.toLowerCase().includes(searchLower) ||
        endereco.estado?.toLowerCase().includes(searchLower) ||
        endereco.cep?.toLowerCase().includes(searchLower) ||
        endereco.tipo?.toLowerCase().includes(searchLower) ||
        endereco.numero?.toLowerCase().includes(searchLower) ||
        endereco.complemento?.toLowerCase().includes(searchLower)
      );
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

    return {
      filteredEnderecos: filtered,
      paginatedEnderecos: paginated,
      totalPages
    };
  }, [enderecosOrdenados, searchTerm, currentPage, itemsPerPage]);

  // Reset da página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  // Função para renderizar o ícone com base no tipo de endereço
  const renderEnderecoIcon = (tipo: string) => {
    switch (tipo) {
      case "residencial":
        return <Home className="h-5 w-5 text-blue-600" />;
      case "comercial":
        return <Building className="h-5 w-5 text-purple-600" />;
      case "entrega":
        return <Briefcase className="h-5 w-5 text-green-600" />;
      case "outro":
        return <MapPin className="h-5 w-5 text-orange-600" />;
      default:
        return <MapPin className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Meus Endereços</CardTitle>
            <CardDescription>
              Gerencie os endereços associados à sua conta
            </CardDescription>
          </div>
          {!showAddEndereco && !isLoadingEnderecos && !initialLoading && (
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
              <MapPin className="mr-2 h-4 w-4" />
              Adicionar Endereço
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Preloader de carregamento */}
        {(isLoadingEnderecos || initialLoading) && (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <span className="ml-2 text-gray-600">Carregando endereços...</span>
          </div>
        )}

        {/* Conteúdo quando não está carregando */}
        {!isLoadingEnderecos && !initialLoading && (
          <>
            {/* Campo de pesquisa */}
            {!showAddEndereco && (
              <div className="mb-6 mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Pesquisar endereços..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            {showAddEndereco ? (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {editingEndereco ? "Editar Endereço" : "Novo Endereço"}
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowAddEndereco(false);
                  setEditingEndereco(null);
                  enderecoForm.reset();
                  setCamposEnderecoValidados({
                    tipo: true,
                    cep: true,
                    logradouro: true,
                    numero: true,
                    bairro: true,
                    cidade: true,
                    estado: true
                  });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Form {...enderecoForm}>
              <form 
                onSubmit={enderecoForm.handleSubmit((formData) => {
                  const camposValidos = {
                    tipo: formData.tipo.trim() !== '',
                    cep: formData.cep.trim() !== '',
                    logradouro: formData.logradouro.trim() !== '',
                    numero: formData.numero.trim() !== '',
                    bairro: formData.bairro.trim() !== '',
                    cidade: formData.cidade.trim() !== '',
                    estado: formData.estado.trim() !== ''
                  };

                  setCamposEnderecoValidados(camposValidos);

                  const camposInvalidos = Object.entries(camposValidos)
                    .filter(([_, valido]) => !valido)
                    .map(([campo, _]) => {
                      switch(campo) {
                        case 'tipo': return 'Tipo';
                        case 'cep': return 'CEP';
                        case 'logradouro': return 'Logradouro';
                        case 'numero': return 'Número';
                        case 'bairro': return 'Bairro';
                        case 'cidade': return 'Cidade';
                        case 'estado': return 'Estado';
                        default: return campo;
                      }
                    });

                  if (camposInvalidos.length > 0) {
                    toast({
                      title: "Erro de validação",
                      description: `Preencha os campos obrigatórios: ${camposInvalidos.join(', ')}`,
                      variant: "destructive",
                    });
                    return;
                  }

                  onSubmit(formData);
                })} 
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={enderecoForm.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={!camposEnderecoValidados.tipo ? 'text-red-500' : ''}>
                          Tipo: <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={(value) => {
                            field.onChange(value);
                            setCamposEnderecoValidados(prev => ({
                              ...prev,
                              tipo: value.trim() !== ''
                            }));
                          }}
                        >
                          <SelectTrigger className={!camposEnderecoValidados.tipo ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Selecione o tipo de endereço" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="comercial">Comercial</SelectItem>
                            <SelectItem value="residencial">Residencial</SelectItem>
                            <SelectItem value="entrega">Entrega</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        {!camposEnderecoValidados.tipo && (
                          <p className="mt-1 text-red-300 text-xs flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Selecione um tipo de endereço
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={enderecoForm.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={!camposEnderecoValidados.cep ? 'text-red-500' : ''}>
                          CEP: <span className="text-red-500">*</span>
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <InputMask
                              mask="99999-999"
                              value={field.value}
                              onChange={(e) => {
                                field.onChange(e);
                                setCamposEnderecoValidados(prev => ({
                                  ...prev,
                                  cep: e.target.value.trim() !== ''
                                }));

                                const cepLimpo = e.target.value.replace(/\D/g, '');
                                if (cepLimpo.length === 8) {
                                  consultarCep(cepLimpo);
                                }
                              }}
                              onBlur={handleEnderecoInputBlur}
                            >
                              {(inputProps: any) => (
                                <Input 
                                  {...inputProps} 
                                  placeholder="00000-000" 
                                  className={!camposEnderecoValidados.cep ? 'border-red-500 pr-10' : 'pr-10'}
                                />
                              )}
                            </InputMask>
                          </FormControl>
                          {field.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => consultarCep(field.value)}
                              className="absolute right-0 top-0 h-full px-3"
                              disabled={isLoadingCep}
                            >
                              {isLoadingCep ? (
                                <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                              ) : (
                                <Search className="h-4 w-4 text-purple-600" />
                              )}
                            </Button>
                          )}
                        </div>
                        {!camposEnderecoValidados.cep && (
                          <p className="mt-1 text-red-300 text-xs flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> O CEP não pode estar vazio
                          </p>
                        )}
                        {cepErro && <p className="text-sm text-red-500">{cepErro}</p>}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="md:col-span-2">
                    <FormField
                      control={enderecoForm.control}
                      name="logradouro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={!camposEnderecoValidados.logradouro ? 'text-red-500' : ''}>
                            Logradouro: <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Rua, Avenida, etc." 
                              className={!camposEnderecoValidados.logradouro ? 'border-red-500' : ''}
                              onBlur={handleEnderecoInputBlur}
                              onChange={(e) => {
                                field.onChange(e);
                                setCamposEnderecoValidados(prev => ({
                                  ...prev,
                                  logradouro: e.target.value.trim() !== ''
                                }));
                              }}
                            />
                          </FormControl>
                          {!camposEnderecoValidados.logradouro && (
                            <p className="mt-1 text-red-300 text-xs flex items-center">
                              <AlertTriangle className="w-3 h-3 mr-1" /> O logradouro não pode estar vazio
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={enderecoForm.control}
                    name="numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={!camposEnderecoValidados.numero ? 'text-red-500' : ''}>
                          Número: <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="123" 
                            className={!camposEnderecoValidados.numero ? 'border-red-500' : ''}
                            onBlur={handleEnderecoInputBlur}
                            onChange={(e) => {
                              field.onChange(e);
                              setCamposEnderecoValidados(prev => ({
                                ...prev,
                                numero: e.target.value.trim() !== ''
                              }));
                            }}
                          />
                        </FormControl>
                        {!camposEnderecoValidados.numero && (
                          <p className="mt-1 text-red-300 text-xs flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> O número não pode estar vazio
                          </p>
                        )}
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
                          <Input {...field} placeholder="Bloco, Sala, Apto..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={enderecoForm.control}
                    name="bairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={!camposEnderecoValidados.bairro ? 'text-red-500' : ''}>
                          Bairro: <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className={!camposEnderecoValidados.bairro ? 'border-red-500' : ''}
                            onBlur={handleEnderecoInputBlur}
                            onChange={(e) => {
                              field.onChange(e);
                              setCamposEnderecoValidados(prev => ({
                                ...prev,
                                bairro: e.target.value.trim() !== ''
                              }));
                            }}
                          />
                        </FormControl>
                        {!camposEnderecoValidados.bairro && (
                          <p className="mt-1 text-red-300 text-xs flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> O bairro não pode estar vazio
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={enderecoForm.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={!camposEnderecoValidados.cidade ? 'text-red-500' : ''}>
                          Cidade: <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className={!camposEnderecoValidados.cidade ? 'border-red-500' : ''}
                            onBlur={handleEnderecoInputBlur}
                            onChange={(e) => {
                              field.onChange(e);
                              setCamposEnderecoValidados(prev => ({
                                ...prev,
                                cidade: e.target.value.trim() !== ''
                              }));
                            }}
                          />
                        </FormControl>
                        {!camposEnderecoValidados.cidade && (
                          <p className="mt-1 text-red-300 text-xs flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> A cidade não pode estar vazia
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={enderecoForm.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={!camposEnderecoValidados.estado ? 'text-red-500' : ''}>
                          Estado: <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={(value) => {
                            field.onChange(value);
                            setCamposEnderecoValidados(prev => ({
                              ...prev,
                              estado: value.trim() !== ''
                            }));
                          }}
                        >
                          <SelectTrigger className={!camposEnderecoValidados.estado ? 'border-red-500' : ''}>
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AC">AC</SelectItem>
                            <SelectItem value="AL">AL</SelectItem>
                            <SelectItem value="AP">AP</SelectItem>
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="BA">BA</SelectItem>
                            <SelectItem value="CE">CE</SelectItem>
                            <SelectItem value="DF">DF</SelectItem>
                            <SelectItem value="ES">ES</SelectItem>
                            <SelectItem value="GO">GO</SelectItem>
                            <SelectItem value="MA">MA</SelectItem>
                            <SelectItem value="MT">MT</SelectItem>
                            <SelectItem value="MS">MS</SelectItem>
                            <SelectItem value="MG">MG</SelectItem>
                            <SelectItem value="PA">PA</SelectItem>
                            <SelectItem value="PB">PB</SelectItem>
                            <SelectItem value="PR">PR</SelectItem>
                            <SelectItem value="PE">PE</SelectItem>
                            <SelectItem value="PI">PI</SelectItem>
                            <SelectItem value="RJ">RJ</SelectItem>
                            <SelectItem value="RN">RN</SelectItem>
                            <SelectItem value="RS">RS</SelectItem>
                            <SelectItem value="RO">RO</SelectItem>
                            <SelectItem value="RR">RR</SelectItem>
                            <SelectItem value="SC">SC</SelectItem>
                            <SelectItem value="SP">SP</SelectItem>
                            <SelectItem value="SE">SE</SelectItem>
                            <SelectItem value="TO">TO</SelectItem>
                          </SelectContent>
                        </Select>
                        {!camposEnderecoValidados.estado && (
                          <p className="mt-1 text-red-300 text-xs flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Selecione um estado
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={enderecoForm.control}
                  name="principal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-4">
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

                <div className="flex justify-end gap-2 mt-6">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
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
                        estado: true
                      });
                      setCepErro(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingEndereco ? "Atualizar Endereço" : "Salvar Endereço"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        ) : (
          <>
            {/* Lista de endereços */}
            {paginatedEnderecos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedEnderecos.map((endereco) => (
                  <div 
                    key={endereco.id} 
                    className={`border rounded-lg p-4 relative ${endereco.principal ? 'border-purple-200 bg-purple-50' : 'border-gray-200'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        {renderEnderecoIcon(endereco.tipo || '')}
                        <h3 className="font-medium text-lg ml-2">Endereço {endereco.tipo} - {endereco.cidade}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditEndereco(endereco)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setEnderecoParaExcluir(endereco)}
                          className="h-8 w-8 p-0"
                          disabled={endereco.principal}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-sm text-gray-700 mb-3">
                      <p>{endereco.logradouro}, {endereco.numero}{endereco.complemento ? `, ${endereco.complemento}` : ''}</p>
                      <p>{endereco.bairro} - {endereco.cidade}, {endereco.estado}</p>
                      <p>CEP: {endereco.cep}</p>
                    </div>

                    <div className="flex items-center">
                      <span className={`text-xs px-2 py-1 rounded-full uppercase font-medium mr-2 ${
                        endereco.tipo === 'comercial' ? 'bg-purple-100 text-purple-700' : 
                        endereco.tipo === 'residencial' ? 'bg-blue-100 text-blue-700' : 
                        endereco.tipo === 'entrega' ? 'bg-green-100 text-green-700' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {endereco.tipo}
                      </span>

                      {endereco.principal ? (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Principal
                        </span>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs text-purple-600 hover:text-purple-700 p-0 h-7"
                          onClick={() => handleSetPrincipal(endereco)}
                          disabled={endereco.id ? disabledButtons[endereco.id] : false}
                        >
                          Definir como principal
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
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
              </div>
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
          </>
        )}
      </CardContent>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!enderecoParaExcluir} onOpenChange={() => setEnderecoParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o endereço <span className="font-semibold">{enderecoParaExcluir?.tipo} em {enderecoParaExcluir?.cidade}</span>?
              <br />
              Esta ação não pode ser desfeita.
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
    </Card>
  );
}
