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
import { MapPin, PlusCircle, Edit3, Trash2, Save, X, Building, Home, Briefcase, CheckCircle, Loader2, Search } from "lucide-react";
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

interface EnderecoFormValues extends z.infer<typeof enderecoSchema> {
  id?: number;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function EnderecosTab() {
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

  // Função para formatar CEP
  const formatarCep = (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length <= 5) {
      return cepLimpo;
    } else {
      return cepLimpo.slice(0, 5) + '-' + cepLimpo.slice(5, 8);
    }
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
      const response = await fetch(`/api/enderecos/${endereco.id}/principal`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erro ao definir endereço principal: ${response.status}`);
      }
    } catch (error) {
      console.error('Erro ao definir endereço principal:', error);
    }
  }, []);

  // Filtrar endereços e aplicar paginação
  const { filteredEnderecos, paginatedEnderecos, totalPages } = useMemo(() => {
    const filtered = enderecos.filter(endereco => {
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
  }, [enderecos, searchTerm, currentPage, itemsPerPage]);

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
      case "outro":
        return <Briefcase className="h-5 w-5 text-green-600" />;
      default:
        return <MapPin className="h-5 w-5 text-gray-600" />;
    }
  };

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
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Meus Endereços</CardTitle>
            <CardDescription>
              Gerencie os endereços associados à sua conta
            </CardDescription>
          </div>
          {!showAddEndereco && (
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
                          Tipo de Endereço *
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className={!camposEnderecoValidados.tipo ? 'border-red-500' : ''}>
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
                        <FormLabel className={!camposEnderecoValidados.cep ? 'text-red-500' : ''}>
                          CEP *
                        </FormLabel>
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
                            {(inputProps: any) => (
                              <div className="relative">
                                <Input 
                                  {...inputProps} 
                                  placeholder="00000-000" 
                                  className={!camposEnderecoValidados.cep ? 'border-red-500' : ''}
                                />
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
                      <FormLabel className={!camposEnderecoValidados.logradouro ? 'text-red-500' : ''}>
                        Logradouro *
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Rua, Avenida, etc." 
                          className={!camposEnderecoValidados.logradouro ? 'border-red-500' : ''}
                        />
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
                        <FormLabel className={!camposEnderecoValidados.numero ? 'text-red-500' : ''}>
                          Número *
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="123" 
                            className={!camposEnderecoValidados.numero ? 'border-red-500' : ''}
                          />
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
                        <FormLabel className={!camposEnderecoValidados.bairro ? 'text-red-500' : ''}>
                          Bairro *
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Nome do bairro" 
                            className={!camposEnderecoValidados.bairro ? 'border-red-500' : ''}
                          />
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
                        <FormLabel className={!camposEnderecoValidados.cidade ? 'text-red-500' : ''}>
                          Cidade *
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Nome da cidade" 
                            className={!camposEnderecoValidados.cidade ? 'border-red-500' : ''}
                          />
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
                        <FormLabel className={!camposEnderecoValidados.estado ? 'text-red-500' : ''}>
                          Estado *
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="SP" 
                            maxLength={2} 
                            className={!camposEnderecoValidados.estado ? 'border-red-500' : ''}
                          />
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

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit" 
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingEndereco ? 'Atualizar' : 'Salvar'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
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
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        ) : (
          <>
            {/* Lista de endereços */}
            {paginatedEnderecos.length > 0 ? (
              <div className="grid gap-4">
                {paginatedEnderecos.map((endereco) => (
                  <Card key={endereco.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {renderEnderecoIcon(endereco.tipo || '')}
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
                            onClick={() => setEnderecoParaExcluir(endereco)}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
    </Card>
  );
}