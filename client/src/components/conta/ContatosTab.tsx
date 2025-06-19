import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { PlusCircle, Edit3, Trash2, Save, X, Building, CheckCircle, AlertTriangle, Loader2, Phone, Mail, User, Briefcase, Smartphone, Search } from "lucide-react";
import { contatoSchema } from "@/pages/conta/index";
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

// Expandimos a interface ContatoFormValues para incluir id e outras propriedades recebidas da API
interface ContatoFormValues extends z.infer<typeof contatoSchema> {
  id?: number;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export { default as ContatosTabWebSocket } from './ContatosTab-WebSocket';

export default function ContatosTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showAddContato, setShowAddContato] = useState(false);
  const [editingContato, setEditingContato] = useState<ContatoFormValues | null>(null);
  // Estado para pesquisa
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  // Usar WebSocket para gerenciar dados
  const {
    data: contatos,
    loading: isLoadingContatos,
    createItem: createContato,
    updateItem: updateContato,
    deleteItem: deleteContato
  } = useWebSocketData<ContatoFormValues>({
    endpoint: '/api/contatos',
    resource: 'contatos'
  });
  
  // Access the query client
  const queryClient = useQueryClient();
  
  // Get the current user from localStorage
  const [currentUserId, setCurrentUserId] = useState<number | undefined>();
  
  // Estado para controlar a exibição de loading inicial ao trocar de aba
  const [initialLoading, setInitialLoading] = useState(true);
  
  useEffect(() => {
    try {
      // Obter o usuário do localStorage
      const userData = localStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        console.log("Obtendo ID do usuário do localStorage:", user.id);
        setCurrentUserId(user.id);
      } else {
        // Tentar obter da cache do React Query como fallback
        const user = queryClient.getQueryData(["/api/auth/me"]) as any;
        console.log("Obtendo ID do usuário da cache do React Query:", user?.id);
        setCurrentUserId(user?.id);
      }
    } catch (error) {
      console.error("Erro ao obter dados do usuário:", error);
    }
  }, [queryClient]);
  
  // Estado para controlar a validação de campos
  const [camposContatoValidados, setCamposContatoValidados] = useState({
    nome: true,
    setor: true,
    email: true,
    telefone: true,
    cargo: true
  });

  // Flags para controle extremamente rígido de requisições
  const firstLoadCompletedRef = useRef<boolean>(false);
  
  // Query para buscar contatos - atualizada para seguir o padrão das outras abas
  const { 
    data: contatosData, 
    isLoading: isLoadingContatos, 
    refetch: refetchContatos 
  } = useQuery({
    queryKey: ["/api/contatos"],
    // Permitir sempre buscar dados, seguindo o padrão das abas de Endereços e Usuários
    enabled: true,
    // Configurações para permitir atualização ao trocar de aba
    staleTime: 0, // Considerar dados sempre obsoletos (permite refetch ao trocar de aba)
    gcTime: 60000, // Manter no cache por 1 minuto
    refetchOnWindowFocus: false, // Sem refetch no foco da janela
    refetchOnMount: true, // Permitir refetch na montagem do componente
    refetchOnReconnect: false, // Sem refetch na reconexão
    retry: false // Não tentar novamente em caso de falha
  });
  
  // Effect para marcar a primeira carga como concluída
  useEffect(() => {
    if (contatosData && !firstLoadCompletedRef.current) {
      // Marcar primeira carga como concluída para evitar novas requisições automáticas
      firstLoadCompletedRef.current = true;
    }
  }, [contatosData]);
  

  
  // Effect para atualizar o estado local quando os dados são carregados 
  useEffect(() => {
    if (contatosData) {
      console.log("Dados de contatos carregados:", contatosData);
      
      // Garantir que contatosData seja sempre tratado como array
      const contatosArray = Array.isArray(contatosData) ? contatosData : [];
      
      // Formatar e ordenar os contatos de forma simples
      const formattedContatos = contatosArray.map((c: any) => ({
        id: c.id,
        nome: c.nome,
        setor: c.setor || "comercial",
        cargo: c.cargo || "",
        telefone: c.telefone || "",
        celular: c.celular || "",
        whatsapp: c.whatsapp || "",
        email: c.email || "",
        principal: c.principal === true,
        userId: c.userId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        tipo: c.tipo || "comercial"
      }));
      
      // Reordenar para colocar o contato principal no topo
      const contatosOrdenados = [...formattedContatos].sort((a, b) => {
        if (a.principal && !b.principal) return -1; // a é principal, vai para o topo
        if (!a.principal && b.principal) return 1;  // b é principal, vai para o topo
        // Para manter a ordem original por ID (mais antigos primeiro)
        return a.id && b.id ? (a.id - b.id) : 0;
      });
      
      // Atualizar o estado
      setContatos(contatosOrdenados);
      
      console.log(`Contatos atualizados: ${contatosArray.length} contatos carregados`);
    }
  }, [contatosData]);

  // Flag para controlar se devemos fazer requisições novas ao montar o componente
  const firstMountRef = useRef<boolean>(true);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  
  // Configuração inicial do loading ao trocar de aba
  useEffect(() => {
    setInitialLoading(true);
    
    // Forçar a revalidação dos dados ao trocar de aba
    refetchContatos().then(() => {
      setInitialLoading(false);
    });
    
    // Prevenção contra longos tempos de resposta
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [refetchContatos]);
  
  const contatoForm = useForm<ContatoFormValues>({
    resolver: zodResolver(contatoSchema),
    defaultValues: {
      nome: "",
      setor: "comercial",
      cargo: "",
      telefone: "",
      celular: "",
      whatsapp: "",
      email: "",
      principal: false,
      tipo: "comercial"
    },
    mode: "onSubmit",
  });

  // Função para verificar se o email é válido
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  // Mutation para criar um novo contato
  const createContatoMutation = useMutation({
    mutationFn: async (data: ContatoFormValues) => {
      const payload = {
        nome: data.nome,
        setor: data.setor,
        cargo: data.cargo,
        telefone: data.telefone,
        celular: data.celular || "",
        whatsapp: data.whatsapp || "",
        email: data.email,
        principal: data.principal,
        tipo: data.tipo || "comercial",
        userId: currentUserId
      };
      console.log("Enviando payload para criar contato:", payload);
      try {
        const response = await apiRequest("POST", "/api/contatos", payload);
        console.log("Resposta da criação de contato:", response);
        return response;
      } catch (error) {
        console.error("Erro na criação de contato:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Fechar o formulário antes de mostrar o toast de sucesso
      setShowAddContato(false);
      
      // Limpar o formulário após o salvamento bem-sucedido
      contatoForm.reset({
        nome: "",
        setor: "comercial",
        cargo: "",
        telefone: "",
        celular: "",
        whatsapp: "",
        email: "",
        principal: false
      });
      
      // Mostrar toast de sucesso
      toast({
        title: "Contato adicionado",
        description: "O contato foi adicionado com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      
      // Invalidar a query para refrescar os dados
      // WebSocket irá atualizar automaticamente
    },
    onError: (error: any) => {
      console.error("Erro completo ao adicionar contato:", error);
      toast({
        title: "Erro ao adicionar contato",
        description: error.message || "Erro ao salvar contato no banco de dados",
        variant: "destructive",
      });
    },
  });
  
  // Mutation para atualizar um contato existente
  const updateContatoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: ContatoFormValues }) => {
      const payload = {
        nome: data.nome,
        setor: data.setor,
        cargo: data.cargo,
        telefone: data.telefone,
        celular: data.celular || "",
        whatsapp: data.whatsapp || "",
        email: data.email,
        principal: data.principal,
        tipo: data.tipo || "comercial",
      };
      return await apiRequest("PUT", `/api/contatos/${id}`, payload);
    },
    onSuccess: (data, variables) => {
      // Fechar o formulário antes de mostrar o toast de sucesso
      setShowAddContato(false);
      
      // Limpar o formulário após o salvamento bem-sucedido
      contatoForm.reset({
        nome: "",
        setor: "comercial",
        cargo: "",
        telefone: "",
        celular: "",
        whatsapp: "",
        email: "",
        principal: false
      });
      
      // Limpar o contato em edição
      setEditingContato(null);
      
      // Mostrar toast de sucesso
      toast({
        title: "Contato atualizado",
        description: "O contato foi atualizado com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      
      // Invalidar a query para refrescar os dados
      // WebSocket irá atualizar automaticamente
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Função para adicionar/atualizar um contato
  const handleSaveContato = (formData: ContatoFormValues) => {
    try {
      // Garantir que o tipo está presente e definido como "comercial"
      const formDataWithTipo = {
        ...formData,
        tipo: "comercial" // Sempre definir como comercial, ignorando o que está no formData
      };
      
      // Validação manual dos campos obrigatórios
      const camposValidos = {
        nome: formData.nome.trim() !== '',
        setor: formData.setor.trim() !== '',
        email: isValidEmail(formData.email),
        telefone: formData.telefone.trim() !== '',
        cargo: formData.cargo.trim() !== ''
      };

      setCamposContatoValidados(camposValidos);

      // Verificar se há campos inválidos
      const camposInvalidos = Object.entries(camposValidos)
        .filter(([_, valido]) => !valido)
        .map(([campo, _]) => {
          switch(campo) {
            case 'nome': return 'Nome';
            case 'email': return 'E-mail';
            case 'telefone': return 'Telefone';
            case 'cargo': return 'Cargo';
            case 'setor': return 'Setor';
            default: return campo;
          }
        });

      if (camposInvalidos.length > 0) {
        toast({
          title: "Erro de validação",
          description: `Verifique os seguintes campos: ${camposInvalidos.join(', ')}`,
          variant: "destructive",
        });
        return;
      }
      
      // Se estamos no modo edição, atualize o contato existente
      if (editingContato && editingContato.id) {
        // Use a mutation para atualizar o contato no banco de dados
        updateContatoMutation.mutate({ 
          id: editingContato.id, 
          data: formDataWithTipo 
        });
      } else {
        // Use a mutation para adicionar o contato ao banco de dados
        createContatoMutation.mutate(formDataWithTipo);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao salvar contato",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Função para editar um contato existente
  const handleEditContato = (contato: ContatoFormValues) => {
    setEditingContato(contato);
    Object.keys(contatoForm.getValues()).forEach((key) => {
      contatoForm.setValue(key as any, contato[key as keyof ContatoFormValues]);
    });
    
    // Resetar estado de validação para não mostrar erros enquanto edita
    setCamposContatoValidados({
      nome: true,
      setor: true,
      email: true,
      telefone: true,
      cargo: true
    });
    
    setShowAddContato(true);
  };

  // Estado para controlar o contato a ser excluído
  const [contatoParaExcluir, setContatoParaExcluir] = useState<ContatoFormValues | null>(null);
  
  // Função para iniciar o processo de exclusão de um contato
  const handleDeleteContato = (contato: ContatoFormValues) => {
    setContatoParaExcluir(contato);
  };
  
  // Refs para controle de requisições e cache
  const cacheTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const skipNextFetchRef = useRef<boolean>(false);
  const pendingRequestRef = useRef<boolean>(false);
  
  // Mutation para excluir um contato - versão altamente otimizada
  const deleteContatoMutation = useMutation({
    mutationFn: async (id: number) => {
      // Definir que temos uma operação pendente
      pendingRequestRef.current = true;
      
      // Sinalizar para pular a próxima requisição automática
      skipNextFetchRef.current = true;
      
      // Limpar qualquer timeout de cache pendente
      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
        cacheTimeoutRef.current = null;
      }
      
      return await apiRequest("DELETE", `/api/contatos/${id}`, {});
    },
    onSuccess: (_, id) => {
      toast({
        title: "Contato excluído",
        description: "O contato foi excluído com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      
      // Invalidar a query para refrescar os dados
      // WebSocket irá atualizar automaticamente
      
      // Limpar referência ao contato que estava sendo excluído
      setContatoParaExcluir(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir contato",
        description: error.message,
        variant: "destructive",
      });
      

      
      // Limpar referência mesmo em caso de erro
      setContatoParaExcluir(null);
    },
  });
  
  // Estado para controlar quais botões estão desabilitados durante operações
  const [disabledButtons, setDisabledButtons] = useState<{[key: number]: boolean}>({});
  
  // Mutation para definir um contato como principal - versão altamente otimizada
  const setPrincipalContatoMutation = useMutation({
    mutationFn: async (id: number) => {
      // Desabilitar todos os botões para prevenir cliques múltiplos
      const allButtons: {[key: number]: boolean} = {};
      contatos.forEach(c => {
        if (c.id) allButtons[c.id] = true;
      });
      setDisabledButtons(allButtons);
      
      // Definir que temos uma operação pendente
      pendingRequestRef.current = true;
      
      // Sinalizar para pular a próxima requisição automática
      skipNextFetchRef.current = true;
      
      // Limpar qualquer timeout de cache pendente
      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
        cacheTimeoutRef.current = null;
      }
      
      // Fazer a requisição para definir o contato como principal
      return await apiRequest("POST", `/api/contatos/${id}/principal`, {});
    },
    onSuccess: (_, id) => {
      // Buscar o contato que foi marcado como principal
      const contato = contatos.find(c => c.id === id);
      
      toast({
        title: "Contato principal",
        description: contato ? `${contato.nome} foi definido como contato principal.` : "Contato definido como principal com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      
      // Ativar o estado de carregamento
      
      
      // Resetar dataVerified quando os dados forem alterados
      
      
      // Invalidar a query para refrescar os dados
      // WebSocket irá atualizar automaticamente
      
      pendingRequestRef.current = false;
    },
    onError: (error: any) => {
      // Reativar todos os botões
      setDisabledButtons({});
      
      // Desativar o estado de carregamento em caso de erro
      
      
      toast({
        title: "Erro ao definir contato como principal",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Garantir que após carregar os dados, os botões sejam habilitados novamente
      setTimeout(() => {
        setDisabledButtons({});
      }, 1000);
    }
  });
  
  // Função para confirmar a exclusão do contato
  const confirmarExclusaoContato = () => {
    if (contatoParaExcluir && contatoParaExcluir.id) {
      // Use a mutation para excluir o contato do banco de dados
      // Não fechamos o popup imediatamente, ele será fechado após o sucesso da operação
      deleteContatoMutation.mutate(contatoParaExcluir.id);
      // Não chamamos setContatoParaExcluir(null) aqui, isso será feito no onSuccess da mutation
    }
  };

  // Função para definir um contato como principal
  const handleSetPrincipal = (contato: ContatoFormValues) => {
    if (contato.id) {
      // Use a mutation para definir o contato como principal no banco de dados
      setPrincipalContatoMutation.mutate(contato.id);
    }
  };

  // Função para lidar com o evento onBlur dos campos de contato
  const handleContatoInputBlur = () => {
    // Verifica todos os campos obrigatórios
    const nome = contatoForm.getValues().nome;
    const setor = contatoForm.getValues().setor;
    const email = contatoForm.getValues().email;
    const telefone = contatoForm.getValues().telefone;
    const cargo = contatoForm.getValues().cargo;
    
    // Atualiza o estado de validação
    setCamposContatoValidados({
      nome: nome ? nome.trim() !== '' : false,
      setor: setor ? setor.trim() !== '' : false,
      email: isValidEmail(email || ''), // Email agora é sempre obrigatório
      telefone: telefone ? telefone.trim() !== '' : false,
      cargo: cargo ? cargo.trim() !== '' : false // Cargo agora é obrigatório
    });
  };
  
  // Função para validar o formulário de contato quando o botão salvar é clicado
  const handleValidateContatoForm = (): boolean => {
    // Obtém os valores atuais do formulário
    const formValues = contatoForm.getValues();
    
    // Verifica se todos os campos obrigatórios foram preenchidos
    const validacoes = {
      nome: formValues.nome ? formValues.nome.trim() !== '' : false,
      setor: formValues.setor ? formValues.setor.trim() !== '' : false,
      email: isValidEmail(formValues.email || ''), // Email é sempre obrigatório
      telefone: formValues.telefone ? formValues.telefone.trim() !== '' : false,
      cargo: formValues.cargo ? formValues.cargo.trim() !== '' : false // Cargo é obrigatório
    };
    
    // Atualiza o estado de validação dos campos
    setCamposContatoValidados(validacoes);
    
    // Verifica se há algum campo inválido
    const camposInvalidos = Object.entries(validacoes)
      .filter(([_, valido]) => !valido)
      .map(([campo, _]) => campo);
    
    // Se houver campos inválidos, exibe um toast com os erros
    if (camposInvalidos.length > 0) {
      const camposFormatados = camposInvalidos.map(campo => {
        switch(campo) {
          case 'nome': return 'Nome';
          case 'setor': return 'Setor';
          case 'email': return 'Email (formato inválido)';
          case 'telefone': return 'Telefone';
          case 'cargo': return 'Cargo/Função';
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

  // Função para obter a cor do setor
  const getSetorColor = (setor: string) => {
    switch (setor) {
      case "comercial":
        return "bg-blue-100 text-blue-700";
      case "financeiro":
        return "bg-green-100 text-green-700";
      case "operacional":
        return "bg-orange-100 text-orange-700";
      case "ti":
        return "bg-indigo-100 text-indigo-700";
      case "administrativo":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Função para filtrar contatos baseado no termo de pesquisa e aplicar paginação
  const { filteredContatos, paginatedContatos, totalPages } = useMemo(() => {
    // Primeiro, filtrar por pesquisa
    const filtered = contatos.filter(contato => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        contato.nome?.toLowerCase().includes(searchLower) ||
        contato.setor?.toLowerCase().includes(searchLower) ||
        contato.cargo?.toLowerCase().includes(searchLower) ||
        contato.telefone?.toLowerCase().includes(searchLower) ||
        contato.celular?.toLowerCase().includes(searchLower) ||
        contato.whatsapp?.toLowerCase().includes(searchLower) ||
        contato.email?.toLowerCase().includes(searchLower)
      );
    });

    // Calcular paginação
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

    return {
      filteredContatos: filtered,
      paginatedContatos: paginated,
      totalPages
    };
  }, [contatos, searchTerm, currentPage, itemsPerPage]);

  // Reset da página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Meus Contatos</CardTitle>
            <CardDescription>
              Gerencie os contatos associados à sua conta
            </CardDescription>
          </div>
          {!showAddContato && (
            <Button
              onClick={() => {
                setEditingContato(null);
                contatoForm.reset({
                  nome: "",
                  setor: "comercial",
                  cargo: "",
                  telefone: "",
                  celular: "",
                  whatsapp: "",
                  email: "",
                  principal: false,
                  tipo: "comercial"
                });
                setCamposContatoValidados({
                  nome: true,
                  setor: true,
                  email: true,
                  telefone: true,
                  cargo: true
                });
                setShowAddContato(true);
              }}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={createContatoMutation.isPending || updateContatoMutation.isPending}
            >
              <Phone className="mr-2 h-4 w-4" />
              Adicionar Contato
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Campo de pesquisa */}
        {!showAddContato && (
          <div className="mb-6 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Pesquisar contatos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}
        {showAddContato ? (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {editingContato ? "Editar Contato" : "Novo Contato"}
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowAddContato(false);
                  setEditingContato(null);
                  contatoForm.reset();
                  // Resetar estado de validação
                  setCamposContatoValidados({
                    nome: true,
                    setor: true,
                    email: true,
                    telefone: true,
                    cargo: true
                  });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <Form {...contatoForm}>
              <form onSubmit={contatoForm.handleSubmit(handleSaveContato)} className="space-y-4">
                {/* Adicionar campo oculto para tipo */}
                <input type="hidden" {...contatoForm.register("tipo")} value="comercial" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={contatoForm.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={`${!camposContatoValidados.nome ? 'text-red-500' : ''}`}>
                          Nome Completo: <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Nome completo do contato" 
                            className={`${!camposContatoValidados.nome ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
                            onBlur={handleContatoInputBlur}
                            onChange={(e) => {
                              field.onChange(e);
                              setCamposContatoValidados(prev => ({
                                ...prev,
                                nome: e.target.value ? e.target.value.trim() !== '' : false
                              }));
                            }}
                          />
                        </FormControl>
                        {!camposContatoValidados.nome && (
                          <p className="mt-1 text-red-300 text-xs flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Nome não pode estar vazio
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={contatoForm.control}
                    name="setor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={`${!camposContatoValidados.setor ? 'text-red-500' : ''}`}>
                          Setor: <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={(value) => {
                            field.onChange(value);
                            setCamposContatoValidados(prev => ({
                              ...prev,
                              setor: value ? value.trim() !== '' : false
                            }));
                            handleContatoInputBlur();
                          }}
                        >
                          <SelectTrigger className={`${!camposContatoValidados.setor ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}>
                            <SelectValue placeholder="Selecione o setor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="comercial">Comercial</SelectItem>
                            <SelectItem value="financeiro">Financeiro</SelectItem>
                            <SelectItem value="operacional">Operacional</SelectItem>
                            <SelectItem value="ti">TI</SelectItem>
                            <SelectItem value="administrativo">Administrativo</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        {!camposContatoValidados.setor && (
                          <p className="mt-1 text-red-300 text-xs flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Selecione um setor
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={contatoForm.control}
                  name="cargo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`${!camposContatoValidados.cargo ? 'text-red-500' : ''}`}>
                        Cargo/Função: <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Cargo ou função do contato" 
                          className={`${!camposContatoValidados.cargo ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
                          onBlur={handleContatoInputBlur}
                          onChange={(e) => {
                            field.onChange(e);
                            setCamposContatoValidados(prev => ({
                              ...prev,
                              cargo: e.target.value ? e.target.value.trim() !== '' : false
                            }));
                          }}
                        />
                      </FormControl>
                      {!camposContatoValidados.cargo && (
                        <p className="mt-1 text-red-300 text-xs flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Cargo não pode estar vazio
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={contatoForm.control}
                    name="telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={`${!camposContatoValidados.telefone ? 'text-red-500' : ''}`}>
                          Telefone: <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <InputMask 
                            mask="(99) 9999-9999"
                            maskChar={null}
                            value={field.value}
                            onBlur={handleContatoInputBlur}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              field.onChange(e);
                              setCamposContatoValidados(prev => ({
                                ...prev,
                                telefone: e.target.value ? e.target.value.trim() !== '' : false
                              }));
                            }}
                          >
                            {(inputProps: any) => (
                              <Input 
                                {...inputProps} 
                                placeholder="(00) 0000-0000" 
                                className={`${!camposContatoValidados.telefone ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
                              />
                            )}
                          </InputMask>
                        </FormControl>
                        {!camposContatoValidados.telefone && (
                          <p className="mt-1 text-red-300 text-xs flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Telefone não pode estar vazio
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={contatoForm.control}
                    name="celular"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Celular:</FormLabel>
                        <FormControl>
                          <InputMask 
                            mask="(99) 99999-9999"
                            maskChar={null}
                            value={field.value}
                            onChange={field.onChange}
                          >
                            {(inputProps: any) => (
                              <Input 
                                {...inputProps} 
                                placeholder="(00) 00000-0000" 
                              />
                            )}
                          </InputMask>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={contatoForm.control}
                    name="whatsapp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp:</FormLabel>
                        <FormControl>
                          <InputMask 
                            mask="(99) 99999-9999"
                            maskChar={null}
                            value={field.value}
                            onChange={field.onChange}
                          >
                            {(inputProps: any) => (
                              <Input 
                                {...inputProps} 
                                placeholder="(00) 00000-0000" 
                              />
                            )}
                          </InputMask>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={contatoForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={`${!camposContatoValidados.email ? 'text-red-500' : ''}`}>
                          Email: <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="text" 
                            placeholder="email@exemplo.com" 
                            className={`${!camposContatoValidados.email ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
                            onBlur={handleContatoInputBlur}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              field.onChange(e);
                              // Verifica se o email é válido ou se está vazio
                              const emailValido = isValidEmail(e.target.value) || e.target.value.trim() === '';
                              setCamposContatoValidados(prev => ({
                                ...prev,
                                email: emailValido
                              }));
                            }}
                          />
                        </FormControl>
                        {!camposContatoValidados.email && (
                          <p className="mt-1 text-red-300 text-xs flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Formato de e-mail inválido
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={contatoForm.control}
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
                          Definir como contato principal
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 mt-6">
                  <Button 
                    type="button" 
                    variant="outline"
                    disabled={createContatoMutation.isPending || updateContatoMutation.isPending}
                    onClick={() => {
                      setShowAddContato(false);
                      setEditingContato(null);
                      // Limpar todas as validações de campos
                      setCamposContatoValidados({
                        nome: true,
                        setor: true,
                        email: true,
                        telefone: true,
                        cargo: true
                      });
                      // Resetar o formulário para estado inicial
                      contatoForm.reset({
                        nome: "",
                        setor: "comercial",
                        cargo: "",
                        telefone: "",
                        celular: "",
                        whatsapp: "",
                        email: "",
                        principal: false,
                        tipo: "comercial"
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={createContatoMutation.isPending || updateContatoMutation.isPending}
                  >
                    {(createContatoMutation.isPending || updateContatoMutation.isPending) ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-gray-200 border-t-purple-600 animate-spin mr-2"></div>
                        {editingContato ? "Atualizando..." : "Salvando..."}
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {editingContato ? "Atualizar Contato" : "Salvar Contato"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        ) : null}

        {!showAddContato && (
          <>
            {isLoadingContatos || initialLoading ? (
              // Preloader de carregamento - mostrado sempre ao trocar de aba e durante carregamentos
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="h-10 w-10 rounded-full border-4 border-gray-200 border-t-purple-600 animate-spin mb-2"></div>
                <p className="text-gray-500">Carregando contatos...</p>
              </div>
            ) : contatosData && paginatedContatos.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Phone className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum contato cadastrado</h3>
                <p className="text-gray-500 mb-4">Adicione seu primeiro contato para facilitar a comunicação.</p>
                <Button 
                  onClick={() => {
                    // Resetar formulário
                    contatoForm.reset({
                      nome: "",
                      setor: "comercial",
                      cargo: "",
                      telefone: "",
                      celular: "",
                      whatsapp: "",
                      email: "",
                      principal: false,
                      tipo: "comercial"
                    });
                    // Resetar estado de validação
                    setCamposContatoValidados({
                      nome: true,
                      setor: true,
                      email: true,
                      telefone: true,
                      cargo: true
                    });
                    setShowAddContato(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Adicionar Contato
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedContatos.map((contato, index) => (
                  <div 
                    key={index} 
                    className={`border rounded-lg p-4 relative ${contato.principal ? 'border-purple-200 bg-purple-50' : 'border-gray-200'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-full ${
                          contato.setor === 'comercial' ? 'bg-blue-100' : 
                          contato.setor === 'financeiro' ? 'bg-green-100' : 
                          contato.setor === 'operacional' ? 'bg-orange-100' : 
                          contato.setor === 'ti' ? 'bg-indigo-100' : 
                          contato.setor === 'administrativo' ? 'bg-purple-100' : 
                          'bg-gray-100'
                        }`}>
                          <Phone className={`h-5 w-5 ${
                            contato.setor === 'comercial' ? 'text-blue-600' : 
                            contato.setor === 'financeiro' ? 'text-green-600' : 
                            contato.setor === 'operacional' ? 'text-orange-600' : 
                            contato.setor === 'ti' ? 'text-indigo-600' : 
                            contato.setor === 'administrativo' ? 'text-purple-600' : 
                            'text-gray-600'
                          }`} />
                        </div>
                        <h3 className="font-medium text-lg ml-2">{contato.nome}</h3>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditContato(contato)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteContato(contato)}
                          className="h-8 w-8 p-0"
                          disabled={contato.principal}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    
                    {contato.cargo && (
                      <div className="text-sm text-gray-800 font-medium mb-2">
                        {contato.cargo}
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-700 mb-3">
                      <div className="flex items-center mb-1">
                        <Phone className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{contato.telefone}</span>
                      </div>
                      
                      {contato.celular && (
                        <div className="flex items-center mb-1">
                          <Smartphone className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{contato.celular}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{contato.email}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center flex-wrap gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full uppercase font-medium ${getSetorColor(contato.setor)}`}>
                        {contato.setor}
                      </span>
                      
                      {contato.principal ? (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Principal
                        </span>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs text-purple-600 hover:text-purple-700 p-0 h-7"
                          onClick={() => handleSetPrincipal(contato)}
                          disabled={setPrincipalContatoMutation.isPending || (contato.id ? disabledButtons[contato.id] : false)}
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
            {!showAddContato && !isLoadingContatos && !initialLoading && filteredContatos.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                totalItems={filteredContatos.length}
              />
            )}
          </>
        )}
      </CardContent>

      {/* AlertDialog para confirmação de exclusão */}
      <AlertDialog open={contatoParaExcluir !== null} onOpenChange={(open) => !open && setContatoParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o contato <span className="font-semibold">{contatoParaExcluir?.nome}</span>?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteContatoMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmarExclusaoContato} 
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteContatoMutation.isPending}
            >
              {deleteContatoMutation.isPending ? (
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