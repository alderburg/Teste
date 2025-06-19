import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { MapPin, PlusCircle, Edit3, Trash2, Save, X, Building, Home, Briefcase, CheckCircle, AlertTriangle, Loader2, Search } from "lucide-react";
import { enderecoSchema } from "@/pages/conta/index";
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

// Expandimos a interface EnderecoFormValues para incluir id e outras propriedades recebidas da API
interface EnderecoFormValues extends z.infer<typeof enderecoSchema> {
  id?: number;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function EnderecosTab() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Usar WebSocket para gerenciar dados
  const {
    data: enderecosData,
    loading: isLoadingEnderecos,
    createItem: createEndereco,
    updateItem: updateEndereco,
    deleteItem: deleteEndereco
  } = useWebSocketData<EnderecoFormValues>({
    endpoint: '/api/enderecos',
    resource: 'enderecos'
  });
    // Permitir sempre buscar dados, seguindo o padrão das abas de Contatos e Usuários
    enabled: true,
    // Configurações para permitir atualização ao trocar de aba
    staleTime: 0, // Considerar dados sempre obsoletos (permite refetch ao trocar de aba)
    gcTime: 60000, // Manter no cache por 1 minuto
    refetchOnWindowFocus: false, // Sem refetch no foco da janela
    refetchOnMount: true, // Permitir refetch na montagem do componente
    refetchOnReconnect: false, // Sem refetch na reconexão
    retry: false // Não tentar novamente em caso de falha
  });

  // Use os dados da API ou um array vazio como fallback
  const [enderecos, setEnderecos] = useState<EnderecoFormValues[]>([]);
  
  // Estado para pesquisa
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  // Estado para controlar a exibição de loading inicial ao trocar de aba
  const [initialLoading, setInitialLoading] = useState(true);

  // Mutations para operações CRUD

  // Mutation para adicionar um endereço
  const addEnderecoMutation = useMutation({
    mutationFn: async (data: EnderecoFormValues) => {
      return await apiRequest("POST", "/api/enderecos", {
        ...data,
        userId: user?.id
      });
    },
    onSuccess: () => {
      // Fechar o formulário antes de mostrar o toast de sucesso
      setShowAddEndereco(false);
      setEditingEndereco(null);

      // Limpar o formulário após o salvamento bem-sucedido
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

      // Resetar o estado de validação
      setCamposEnderecoValidados({
        tipo: true,
        cep: true,
        logradouro: true,
        numero: true,
        bairro: true,
        cidade: true,
        estado: true,
      });

      // Invalidar dados do cache para forçar refetch
      // WebSocket irá atualizar automaticamente
      
      toast({
        title: "Endereço adicionado",
        description: "O endereço foi adicionado com sucesso.",
        variant: "default",
        className: "bg-white border-gray-200",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar endereço",
        description: error.message || "Ocorreu um erro ao adicionar o endereço.",
        variant: "destructive",
      });
    }
  });

  // Mutation para atualizar um endereço
  const updateEnderecoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: EnderecoFormValues }) => {
      return await apiRequest("PUT", `/api/enderecos/${id}`, {
        ...data,
        userId: user?.id
      });
    },
    onSuccess: () => {
      // Fechar o formulário antes de mostrar o toast de sucesso
      setShowAddEndereco(false);
      setEditingEndereco(null);

      // Limpar o formulário após o salvamento bem-sucedido
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

      // Resetar o estado de validação
      setCamposEnderecoValidados({
        tipo: true,
        cep: true,
        logradouro: true,
        numero: true,
        bairro: true,
        cidade: true,
        estado: true,
      });

      // Invalidar dados do cache para forçar refetch
      // WebSocket irá atualizar automaticamente
      
      toast({
        title: "Endereço atualizado",
        description: "O endereço foi atualizado com sucesso.",
        variant: "default",
        className: "bg-white border-gray-200",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar endereço",
        description: error.message || "Ocorreu um erro ao atualizar o endereço.",
        variant: "destructive",
      });
    }
  });

  // Mutation para excluir um endereço
  const deleteEnderecoMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/enderecos/${id}`);
    },
    onSuccess: () => {
      // WebSocket irá atualizar automaticamente
      toast({
        title: "Endereço removido",
        description: "O endereço foi removido com sucesso.",
        variant: "default",
        className: "bg-white border-gray-200",
      });

      // Limpar referência ao endereço que estava sendo excluído
      setEnderecoParaExcluir(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover endereço",
        description: error.message || "Ocorreu um erro ao remover o endereço.",
        variant: "destructive",
      });
    }
  });

  // Estado para controlar quais botões estão desabilitados durante operações
  const [disabledButtons, setDisabledButtons] = useState<{[key: number]: boolean}>({});

  // Mutation para definir endereço como principal
  const setPrincipalMutation = useMutation({
    mutationFn: async (id: number) => {
      // Desabilitar todos os botões temporariamente
      const allButtons: {[key: number]: boolean} = {};
      if (Array.isArray(enderecos)) {
        enderecos.forEach(e => {
          if (e.id) allButtons[e.id] = true;
        });
      }
      setDisabledButtons(allButtons);

      return await apiRequest("POST", `/api/enderecos/${id}/principal`);
    },
    onSuccess: () => {
      // WebSocket irá atualizar automaticamente - não precisamos invalidar manualmente
      toast({
        title: "Endereço principal definido",
        description: "O endereço foi definido como principal com sucesso.",
        variant: "default",
        className: "bg-white border-gray-200",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao definir endereço principal",
        description: error.message || "Ocorreu um erro ao definir o endereço como principal.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Reabilitar botões após operação
      setTimeout(() => {
        setDisabledButtons({});
      }, 1000);
    }
  });

  // Atualiza o estado local quando os dados forem carregados da API
  useEffect(() => {
    if (enderecosData) {
      // Garantir que enderecosData seja sempre tratado como array
      const enderecosArray = Array.isArray(enderecosData) ? enderecosData : [];
      console.log("Dados de endereços carregados:", enderecosArray);

      // Reordenar para colocar o endereço principal no topo
      const enderecosOrdenados = [...(enderecosArray as EnderecoFormValues[])].sort((a, b) => {
        if (a.principal && !b.principal) return -1; // a é principal, vai para o topo
        if (!a.principal && b.principal) return 1;  // b é principal, vai para o topo
        return 0; // mantém a ordem original
      });

      setEnderecos(enderecosOrdenados);
    }
  }, [enderecosData]);

  // Configuração inicial do loading ao trocar de aba
  useEffect(() => {
    setInitialLoading(true);

    // Forçar a revalidação dos dados ao trocar de aba
    refetchEnderecos().then(() => {
      setInitialLoading(false);
    });

    // Prevenção contra longos tempos de resposta
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [refetchEnderecos]);
  const [showAddEndereco, setShowAddEndereco] = useState(false);
  const [editingEndereco, setEditingEndereco] = useState<EnderecoFormValues | null>(null);
  const [camposEnderecoValidados, setCamposEnderecoValidados] = useState({
    tipo: true,
    cep: true,
    logradouro: true,
    numero: true,
    bairro: true,
    cidade: true,
    estado: true
  });

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

  // Função para adicionar/atualizar um endereço
  const handleSaveEndereco = (formData: EnderecoFormValues) => {
    try {
      // Se estamos no modo edição, atualize o endereço existente
      if (editingEndereco && editingEndereco.id) {
        updateEnderecoMutation.mutate({
          id: editingEndereco.id,
          data: formData
        });
      } else {
        // Adicione um novo endereço
        addEnderecoMutation.mutate(formData);
      }
      // A limpeza do formulário, fechamento e reset do estado são feitos no onSuccess das mutations
    } catch (error: any) {
      toast({
        title: "Erro ao salvar endereço",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Função para editar um endereço existente
  const handleEditEndereco = (endereco: EnderecoFormValues) => {
    setEditingEndereco(endereco);
    Object.keys(enderecoForm.getValues()).forEach((key) => {
      enderecoForm.setValue(key as any, endereco[key as keyof EnderecoFormValues]);
    });

    // Limpa o estado de validação ao iniciar a edição
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

  // Estado para controlar o endereço a ser excluído
  const [enderecoParaExcluir, setEnderecoParaExcluir] = useState<EnderecoFormValues | null>(null);

  // Função para iniciar o processo de exclusão de um endereço
  const handleDeleteEndereco = (endereco: EnderecoFormValues) => {
    setEnderecoParaExcluir(endereco);
  };

  // Função para confirmar a exclusão do endereço
  const confirmarExclusaoEndereco = () => {
    if (enderecoParaExcluir && enderecoParaExcluir.id) {
      deleteEnderecoMutation.mutate(enderecoParaExcluir.id);
      // Não fechamos o popup imediatamente, ele será fechado após o sucesso da operação
      // setEnderecoParaExcluir(null) será chamado no onSuccess da mutation
    }
  };

  // Função para definir um endereço como principal
  const handleSetPrincipal = (endereco: any) => {
    if (endereco.id) {
      setPrincipalMutation.mutate(endereco.id);
    }
  };

  // Estado para controlar o carregamento da consulta de CEP
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepErro, setCepErro] = useState<string | null>(null);

  // Função para consultar o CEP e preencher automaticamente os campos
  const consultarCep = async (cep: string) => {
    // Limpa o CEP removendo qualquer caracter que não seja número
    const cepLimpo = cep.replace(/\D/g, '');

    // Verifica se o CEP tem o tamanho adequado
    if (cepLimpo.length !== 8) {
      setCepErro('CEP inválido. O CEP deve ter 8 dígitos.');
      return;
    }

    // Limpa mensagem de erro anterior
    setCepErro(null);

    try {
      setIsLoadingCep(true);

      // Faz a consulta do CEP usando a API ViaCEP
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        setCepErro('CEP não encontrado');
        setIsLoadingCep(false);
        return;
      }

      // Preenche os campos automaticamente com os dados retornados
      enderecoForm.setValue('logradouro', data.logradouro || '');
      enderecoForm.setValue('bairro', data.bairro || '');
      enderecoForm.setValue('cidade', data.localidade || '');
      enderecoForm.setValue('estado', data.uf || '');

      // Atualiza o estado de validação
      setCamposEnderecoValidados(prev => ({
        ...prev,
        logradouro: data.logradouro ? true : prev.logradouro,
        bairro: data.bairro ? true : prev.bairro,
        cidade: data.localidade ? true : prev.cidade,
        estado: data.uf ? true : prev.estado
      }));

      // Se o campo de número estiver vazio, focaliza nele para facilitar o preenchimento
      if (!enderecoForm.getValues().numero) {
        // Usar setTimeout para garantir que o focus seja aplicado após a renderização
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

  // Função para formatar o CEP enquanto digita
  const formatarCep = (cep: string) => {
    // Remove qualquer caractere que não seja número
    const cepLimpo = cep.replace(/\D/g, '');

    // Formata o CEP (xxxxx-xxx)
    if (cepLimpo.length <= 5) {
      return cepLimpo;
    } else {
      return cepLimpo.slice(0, 5) + '-' + cepLimpo.slice(5, 8);
    }
  };

  // Função para lidar com o evento onBlur dos campos de endereço
  const handleEnderecoInputBlur = () => {
    // Verifica todos os campos obrigatórios
    const tipo = enderecoForm.getValues().tipo;
    const cep = enderecoForm.getValues().cep;
    const logradouro = enderecoForm.getValues().logradouro;
    const numero = enderecoForm.getValues().numero;
    const bairro = enderecoForm.getValues().bairro;
    const cidade = enderecoForm.getValues().cidade;
    const estado = enderecoForm.getValues().estado;

    // Atualiza o estado de validação
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

  // Função para validar o formulário de endereço quando o botão salvar é clicado
  const handleValidateEnderecoForm = (): boolean => {
    // Obtém os valores atuais do formulário
    const formValues = enderecoForm.getValues();

    // Verifica se todos os campos obrigatórios foram preenchidos
    const validacoes = {
      tipo: formValues.tipo.trim() !== '',
      cep: formValues.cep.trim() !== '',
      logradouro: formValues.logradouro.trim() !== '',
      numero: formValues.numero.trim() !== '',
      bairro: formValues.bairro.trim() !== '',
      cidade: formValues.cidade.trim() !== '',
      estado: formValues.estado.trim() !== ''
    };

    // Atualiza o estado de validação dos campos
    setCamposEnderecoValidados(validacoes);

    // Verifica se há algum campo inválido
    const camposInvalidos = Object.entries(validacoes)
      .filter(([_, valido]) => !valido)
      .map(([campo, _]) => campo);

    // Se houver campos inválidos, exibe um toast com os erros
    if (camposInvalidos.length > 0) {
      const camposFormatados = camposInvalidos.map(campo => {
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

      toast({
        title: "Erro de validação",
        description: `Preencha os campos obrigatórios: ${camposFormatados.join(', ')}`,
        variant: "destructive",
      });

      return false;
    }

    return true;
  };

  // Função para filtrar endereços baseado no termo de pesquisa e aplicar paginação
  const { filteredEnderecos, paginatedEnderecos, totalPages } = useMemo(() => {
    // Primeiro, filtrar por pesquisa
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

    // Calcular paginação
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
      case "entrega":
        return <Briefcase className="h-5 w-5 text-green-600" />;
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
                // Reseta o estado de validação quando adiciona um novo endereço
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
                  // Limpa o estado de validação ao fechar o formulário
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
                  // Validação manual dos campos obrigatórios
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

                  // Verificar se há campos inválidos
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

                  handleSaveEndereco(formData);
                })} 
                className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={enderecoForm.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={`${!camposEnderecoValidados.tipo ? 'text-red-500' : ''}`}>
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
                          <SelectTrigger className={`${!camposEnderecoValidados.tipo ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}>
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
                        <FormLabel className={`${!camposEnderecoValidados.cep ? 'text-red-500' : ''}`}>
                          CEP: <span className="text-red-500">*</span>
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <InputMask
                              mask="99999-999"
                              maskChar=""
                              value={field.value}
                              onChange={(e) => {
                                field.onChange(e);

                                // Atualiza a validação do campo
                                setCamposEnderecoValidados(prev => ({
                                  ...prev,
                                  cep: e.target.value.trim() !== ''
                                }));

                                // Verifica se o CEP está completo (com 8 dígitos) para busca automática
                                const cepLimpo = e.target.value.replace(/\D/g, '');
                                if (cepLimpo.length === 8) {
                                  // Busca o endereço automaticamente ao completar o último dígito
                                  consultarCep(cepLimpo);
                                }
                              }}
                              onBlur={(e) => {
                                handleEnderecoInputBlur();
                              }}
                            >
                              {(inputProps: any) => (
                                <Input 
                                  {...inputProps}
                                  placeholder="00000-000" 
                                  className={`${!camposEnderecoValidados.cep ? 'ring-2 ring-red-500 focus:ring-red-500' : ''} pr-10`}
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
                        {cepErro && (
                          <p className="mt-1 text-red-300 text-xs flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> {cepErro}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                  <div className="md:col-span-2">
                    <FormField
                      control={enderecoForm.control}
                      name="logradouro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={`${!camposEnderecoValidados.logradouro ? 'text-red-500' : ''}`}>
                            Logradouro: <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Rua, Avenida, etc." 
                              className={`${!camposEnderecoValidados.logradouro ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
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
                        <FormLabel className={`${!camposEnderecoValidados.numero ? 'text-red-500' : ''}`}>
                          Número: <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className={`${!camposEnderecoValidados.numero ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
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
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={enderecoForm.control}
                    name="complemento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento:</FormLabel>
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
                        <FormLabel className={`${!camposEnderecoValidados.bairro ? 'text-red-500' : ''}`}>
                          Bairro: <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className={`${!camposEnderecoValidados.bairro ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
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
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={enderecoForm.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={`${!camposEnderecoValidados.cidade ? 'text-red-500' : ''}`}>
                          Cidade: <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className={`${!camposEnderecoValidados.cidade ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
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
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={enderecoForm.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={`${!camposEnderecoValidados.estado ? 'text-red-500' : ''}`}>
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
                          <SelectTrigger className={`${!camposEnderecoValidados.estado ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}>
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
                    disabled={addEnderecoMutation.isPending || updateEnderecoMutation.isPending}
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

                      // Limpar mensagens de erro
                      enderecoForm.clearErrors();

                      // Resetar estado de validação
                      setCamposEnderecoValidados({
                        tipo: true,
                        cep: true,
                        logradouro: true,
                        numero: true,
                        bairro: true,
                        cidade: true,
                        estado: true
                      });

                      // Limpar estado de erro do CEP
                      setCepErro(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={addEnderecoMutation.isPending || updateEnderecoMutation.isPending}
                  >
                    {(addEnderecoMutation.isPending || updateEnderecoMutation.isPending) ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-gray-200 border-t-purple-600 animate-spin mr-2"></div>
                        {editingEndereco ? "Atualizando..." : "Salvando..."}
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {editingEndereco ? "Atualizar Endereço" : "Salvar Endereço"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        ) : null}

        {!showAddEndereco && (
          <>
            {isLoadingEnderecos || initialLoading ? (
              // Preloader de carregamento - mostrado sempre ao trocar de aba e durante carregamentos
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="h-10 w-10 rounded-full border-4 border-gray-200 border-t-purple-600 animate-spin mb-2"></div>
                <p className="text-gray-500">Carregando endereços...</p>
              </div>
            ) : enderecosData && paginatedEnderecos.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <MapPin className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum endereço cadastrado</h3>
                <p className="text-gray-500 mb-4">Adicione seu primeiro endereço para facilitar suas compras e entregas.</p>
                <Button 
                  onClick={() => setShowAddEndereco(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Adicionar Endereço
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedEnderecos.map((endereco, index) => (
                  <div 
                    key={index} 
                    className={`border rounded-lg p-4 relative ${endereco.principal ? 'border-purple-200 bg-purple-50' : 'border-gray-200'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        {renderEnderecoIcon(endereco.tipo)}
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
                          onClick={() => handleDeleteEndereco(endereco)}
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
                      <span className="text-xs px-2 py-1 rounded-full uppercase font-medium mr-2 
                        ${endereco.tipo === 'comercial' ? 'bg-purple-100 text-purple-700' : 
                          endereco.tipo === 'residencial' ? 'bg-blue-100 text-blue-700' : 
                          endereco.tipo === 'entrega' ? 'bg-green-100 text-green-700' : 
                          'bg-gray-100 text-gray-700'
                        }"
                      >
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
                          disabled={setPrincipalMutation.isPending || (endereco.id ? disabledButtons[endereco.id] : false)}
                        >
                          Definir como principal
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Componente de Paginação */}
            {!showAddEndereco && !isLoadingEnderecos && !initialLoading && filteredEnderecos.length > 0 && (
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

      {/* AlertDialog para confirmação de exclusão */}
      <AlertDialog open={enderecoParaExcluir !== null} onOpenChange={(open) => !open && setEnderecoParaExcluir(null)}>
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
            <AlertDialogCancel disabled={deleteEnderecoMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmarExclusaoEndereco} 
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteEnderecoMutation.isPending}
            >
              {deleteEnderecoMutation.isPending ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-gray-200 border-t-red-300 animate-spin mr-2"></div>
                  Excluindo...
                </>
              ) : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}