import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AlertTriangle, Edit, Lock, Plus, PlusCircle, Save, Shield, Trash, Trash2, User, UserPlus, X, Search } from "lucide-react";
import { usuarioSchema } from "@/pages/conta/index";
import { useWebSocketData } from "@/hooks/useWebSocketData";
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
import { Badge } from "@/components/ui/badge";

// Schema para a aba de usuários
const usuarioTabSchema = z.object({
  nome: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
  email: z.string().email({ message: "Formato de e-mail inválido" }),
  setor: z.string().min(1, { message: "O setor é obrigatório" }),
  permissao: z.string().min(1, { message: "A permissão é obrigatória" }),
  ativo: z.boolean().default(true),
});

// Interface estendida para incluir campos necessários do backend
interface UsuarioFormValues extends z.infer<typeof usuarioTabSchema> {
  id?: number;
  perfil?: string;
  status?: string;
  password?: string | null;
};

export function UsuariosTab() {
  const { toast } = useToast();
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<UsuarioFormValues | null>(null);

  // Usar WebSocket para gerenciar dados
  const {
    data: usuarios,
    loading: isLoadingUsuarios,
    createItem: createUsuario,
    updateItem: updateUsuario,
    deleteItem: deleteUsuario
  } = useWebSocketData<UsuarioFormValues>({
    endpoint: '/api/usuarios-adicionais',
    resource: 'usuarios_adicionais'
  });

  // Estado adicional para controlar a exibição de loading entre abas
  const [initialLoading, setInitialLoading] = useState(true);
  // Estado para controlar botões desabilitados
  const [disabledButtons, setDisabledButtons] = useState<{[key: number]: boolean}>({});
  
  // Estado para pesquisa
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  // Access the query client
  const queryClient = useQueryClient();

  // Get the current user from localStorage (mais confiável para este caso)
  const [currentUserId, setCurrentUserId] = useState<number | undefined>();

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

  // Query for fetching usuarios_adicionais data
  const { data: usuariosData, isLoading: isLoadingUsuarios, refetch: refetchUsuarios } = useQuery({
    queryKey: ["/api/usuarios-adicionais"],
    enabled: true, // Sempre buscar os dados, já que a API já filtra por usuário logado
  });

  // Effect to update the local state when the data is loaded
  useEffect(() => {
    if (usuariosData) {
      console.log("Dados de usuários adicionais carregados:", usuariosData);

      // Garantir que usuariosData seja sempre tratado como array
      const usuariosArray = Array.isArray(usuariosData) ? usuariosData : [];

      // Map the API data to the component's format
      const formattedUsuarios = usuariosArray.map((u: any) => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        setor: u.setor || "comercial",
        permissao: u.perfil || "editor",
        ativo: u.status === "ativo",
        // Adicionar campos que estão faltando para evitar erros de tipo
        perfil: u.perfil || "editor",
        status: u.status || "ativo"
      }));

      setUsuarios(formattedUsuarios);

      // Definir que os dados foram verificados
    }
  }, [usuariosData]);


  // e configura o initialLoading para mostrar sempre o preloader ao trocar de aba
  useEffect(() => {
    // Primeiro definimos todos os estados necessários para que a UI não mostre
    // dados antigos ou inconsistentes durante a troca de aba
    
    setInitialLoading(true);

    // Forçar a revalidação dos dados ao trocar de aba
    refetchUsuarios().then(() => {
      // Assim que os dados chegarem, desativamos o loading imediatamente
      setInitialLoading(false);
    });

    // Prevenção contra longos tempos de resposta
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 300); // Tempo máximo reduzido para tornar a experiência mais instantânea

    return () => clearTimeout(timer);
  }, [refetchUsuarios]);

  // Este useEffect é responsável por controlar o estado de carregamento
  // após operações bem-sucedidas de CRUD nos usuários
  useEffect(() => {
    // Se estamos em estado de carregamento após uma operação
    if (false) {
      // Adiciona um delay maior para garantir que a tela de carregamento
      // seja exibida por tempo suficiente para o usuário perceber
      const timer = setTimeout(() => {
        
      }, 2000); // Aumentamos significativamente o tempo para garantir visibilidade

      return () => clearTimeout(timer);
    }
  }, [false]);

  // Mutation for creating a new usuario
  const createUsuarioMutation = useMutation({
    mutationFn: async (data: UsuarioFormValues) => {
      // Removido toast "Salvando usuário..." conforme solicitado

      const payload = {
        nome: data.nome,
        email: data.email,
        setor: data.setor,
        perfil: data.permissao,
        status: data.ativo ? "ativo" : "inativo",
        userId: currentUserId
      };
      // A função apiRequest já retorna o JSON quando o content-type é application/json
      return await apiRequest("POST", `/api/usuarios-adicionais`, payload);
    },
    onSuccess: () => {
      // Fechar o formulário antes de mostrar o toast de sucesso
      setShowAddUser(false);

      // Limpar o formulário após o salvamento bem-sucedido
      usuarioForm.reset({
        nome: "",
        email: "",
        setor: "comercial",
        permissao: "editor",
        ativo: true
      });

      // Mostrar toast de sucesso
      toast({
        title: "Usuário adicionado",
        description: "O usuário foi adicionado com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });

      // Ativar o estado de carregamento
      

      // Resetar dataVerified quando os dados forem alterados
      

      // Atualizar a lista de usuários
      // WebSocket irá atualizar automaticamente
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating an existing usuario
  const updateUsuarioMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: UsuarioFormValues }) => {
      // Removido toast "Atualizando usuário..." conforme solicitado

      const payload = {
        nome: data.nome,
        email: data.email,
        setor: data.setor,
        perfil: data.permissao,
        status: data.ativo ? "ativo" : "inativo",
      };
      // A função apiRequest já retorna o JSON quando o content-type é application/json
      return await apiRequest("PUT", `/api/usuarios-adicionais/${id}`, payload);
    },
    onSuccess: () => {
      // Fechar o formulário antes de mostrar o toast de sucesso
      setShowAddUser(false);

      // Limpar o formulário após o salvamento bem-sucedido
      usuarioForm.reset({
        nome: "",
        email: "",
        setor: "comercial",
        permissao: "editor",
        ativo: true
      });

      // Resetar estados de validação e foco
      setCamposUsuarioValidados({
        nome: true,
        email: true,
        setor: true,
        permissao: true
      });

      setCamposComFoco({
        nome: false,
        email: false,
        setor: false,
        permissao: false
      });

      // Limpar o usuário em edição
      setEditingUsuario(null);

      // Mostrar toast de sucesso
      toast({
        title: "Usuário atualizado",
        description: "O usuário foi atualizado com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });

      // Ativar o estado de carregamento
      

      // Resetar dataVerified quando os dados forem alterados
      

      // Atualizar a lista de usuários
      // WebSocket irá atualizar automaticamente
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for sending password email to usuario adicional
  const sendPasswordEmailMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("POST", `/api/usuarios-adicionais/${id}/send-password-email`, {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Email enviado",
        description: data.message || "Email para definição de senha enviado com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar email",
        description: error.message || "Não foi possível enviar o email",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting a usuario
  const deleteUsuarioMutation = useMutation({
    mutationFn: async (id: number) => {
      // Removido toast "Excluindo usuário..." conforme solicitado

      // A função apiRequest já retorna o JSON quando o content-type é application/json
      return await apiRequest("DELETE", `/api/usuarios-adicionais/${id}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Usuário excluído",
        description: "O usuário foi excluído com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });

      // Ativar o estado de carregamento
      

      // Resetar dataVerified quando os dados forem alterados
      

      // Atualizar a lista de usuários
      // WebSocket irá atualizar automaticamente

      // Limpar referência ao usuário que estava sendo excluído
      setUsuarioParaExcluir(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message,
        variant: "destructive",
      });

      // Limpar referência mesmo em caso de erro
      setUsuarioParaExcluir(null);
    },
  });

  // Validação de campos
  const [camposUsuarioValidados, setCamposUsuarioValidados] = useState({
    nome: true,
    email: true,
    setor: true,
    permissao: true
  });

  // Controle de campos tocados (para mostrar erros de forma gradual)
  const [camposComFoco, setCamposComFoco] = useState({
    nome: false,
    email: false,
    setor: false,
    permissao: false
  });

  const usuarioForm = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioTabSchema),
    defaultValues: {
      nome: "",
      email: "",
      setor: "comercial",
      permissao: "editor",
      ativo: true
    },
    mode: "onSubmit",
  });

  const handleAddUsuario = (formData: UsuarioFormValues) => {
    try {
      // Validação manual dos campos obrigatórios
      const camposValidos = {
        nome: formData.nome.trim().length >= 3,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && formData.email.trim() !== '',
        setor: formData.setor.trim() !== '',
        permissao: formData.permissao.trim() !== ''
      };

      // Marcar todos os campos como tocados ao tentar submeter
      setCamposComFoco({
        nome: true,
        email: true,
        setor: true,
        permissao: true
      });

      setCamposUsuarioValidados(camposValidos);

      // Verificar se há campos inválidos
      const camposInvalidos = Object.entries(camposValidos)
        .filter(([_, valido]) => !valido)
        .map(([campo, _]) => {
          switch(campo) {
            case 'nome': return 'Nome';
            case 'email': return 'E-mail';
            case 'setor': return 'Setor';
            case 'permissao': return 'Permissão';
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

      // Se estamos no modo edição, atualize o usuário existente
      if (editingUsuario) {
        // Use a mutation para atualizar o usuário no banco de dados
        if (editingUsuario.id) {
          updateUsuarioMutation.mutate({ 
            id: editingUsuario.id, 
            data: formData 
          });
        }
      } else {
        // Use a mutation para adicionar o usuário ao banco de dados
        createUsuarioMutation.mutate(formData);
      }

    } catch (error: any) {
      toast({
        title: "Erro ao salvar usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditUsuario = (usuario: UsuarioFormValues) => {
    setEditingUsuario(usuario);
    Object.keys(usuarioForm.getValues()).forEach((key) => {
      usuarioForm.setValue(key as any, usuario[key as keyof UsuarioFormValues]);
    });
    setShowAddUser(true);
  };

  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<UsuarioFormValues | null>(null);

  const handleDeleteUsuario = (usuario: UsuarioFormValues) => {
    setUsuarioParaExcluir(usuario);
  };

  const confirmarExclusaoUsuario = () => {
    if (usuarioParaExcluir && usuarioParaExcluir.id) {
      // Use a mutation para excluir o usuário do banco de dados
      deleteUsuarioMutation.mutate(usuarioParaExcluir.id);
      // Não fechamos o popup imediatamente, ele será fechado após o sucesso da operação
      // setUsuarioParaExcluir(null) será chamado no onSuccess da mutation
    }
  };

  const handleSendPasswordEmail = (id: number) => {
    sendPasswordEmailMutation.mutate(id);
  };

  // Funções para validar campos quando o usuário sai do input
  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Marcar que o campo perdeu o foco (foi tocado)
    setCamposComFoco(prev => ({
      ...prev,
      [name]: true
    }));

    if (name === 'nome') {
      setCamposUsuarioValidados(prev => ({
        ...prev,
        nome: value.trim().length >= 3
      }));
    } else if (name === 'email') {
      setCamposUsuarioValidados(prev => ({
        ...prev,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.trim() !== ''
      }));
    } else if (name === 'setor') {
      setCamposUsuarioValidados(prev => ({
        ...prev,
        setor: value.trim() !== ''
      }));
    } else if (name === 'permissao') {
      setCamposUsuarioValidados(prev => ({
        ...prev,
        permissao: value.trim() !== ''
      }));
    }
  };

  // Loading states for mutations
  const isAddingUsuario = createUsuarioMutation.isPending;
  const isUpdatingUsuario = updateUsuarioMutation.isPending;
  const isDeletingUsuario = deleteUsuarioMutation.isPending;

  // Função para filtrar usuários baseado no termo de pesquisa e aplicar paginação
  const { filteredUsuarios, paginatedUsuarios, totalPages } = useMemo(() => {
    // Primeiro, filtrar por pesquisa
    const filtered = usuarios.filter(usuario => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        usuario.nome?.toLowerCase().includes(searchLower) ||
        usuario.email?.toLowerCase().includes(searchLower) ||
        usuario.setor?.toLowerCase().includes(searchLower) ||
        usuario.permissao?.toLowerCase().includes(searchLower) ||
        usuario.perfil?.toLowerCase().includes(searchLower)
      );
    });

    // Calcular paginação
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

    return {
      filteredUsuarios: filtered,
      paginatedUsuarios: paginated,
      totalPages
    };
  }, [usuarios, searchTerm, currentPage, itemsPerPage]);

  // Reset da página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Meus Usuários</CardTitle>
            <CardDescription>
              Gerencie os usuários que têm acesso ao sistema
            </CardDescription>
          </div>
          {!showAddUser && (
            <Button
              onClick={() => {
                setEditingUsuario(null);
                usuarioForm.reset({
                  nome: "",
                  email: "",
                  setor: "comercial",
                  permissao: "editor",
                  ativo: true
                });
                setCamposUsuarioValidados({
                  nome: true,
                  email: true,
                  setor: true,
                  permissao: true
                });
                setCamposComFoco({
                  nome: false,
                  email: false,
                  setor: false,
                  permissao: false
                });
                setShowAddUser(true);
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar Usuário
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Campo de pesquisa */}
        {!showAddUser && (
          <div className="mb-6 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Pesquisar usuários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Formulário para adicionar/editar usuário */}
        {showAddUser && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {editingUsuario ? "Editar Usuário" : "Novo Usuário"}
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={isAddingUsuario || isUpdatingUsuario}
                onClick={() => {
                  setShowAddUser(false);
                  setEditingUsuario(null);
                  usuarioForm.reset({
                    nome: "",
                    email: "",
                    setor: "comercial",
                    permissao: "editor",
                    ativo: true
                  });

                  // Resetar completamente os estados de validação
                  setCamposUsuarioValidados({
                    nome: true,
                    email: true,
                    setor: true,
                    permissao: true
                  });

                  // Resetar completamente os estados de foco
                  setCamposComFoco({
                    nome: false,
                    email: false,
                    setor: false,
                    permissao: false
                  });

                  // Resetar o formulário e estados
                  usuarioForm.reset({
                    nome: "",
                    email: "",
                    setor: "comercial",
                    permissao: "editor",
                    ativo: true
                  });

                  // Limpar validações
                  setCamposUsuarioValidados({
                    nome: true,
                    email: true,
                    setor: true,
                    permissao: true
                  });

                  // Limpar estados de foco
                  setCamposComFoco({
                    nome: false,
                    email: false,
                    setor: false,
                    permissao: false
                  });

                  usuarioForm.clearErrors();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Form {...usuarioForm}>
              <form onSubmit={usuarioForm.handleSubmit(handleAddUsuario)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={usuarioForm.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={!camposUsuarioValidados.nome ? "text-red-500" : ""}>
                          Nome do usuário <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nome completo" 
                            {...field}
                            className={!camposUsuarioValidados.nome && camposComFoco.nome ? "border-red-500 ring-2 ring-red-500 focus:ring-red-500" : ""}
                            onBlur={(e) => {
                              field.onBlur();
                              handleInputBlur(e);
                            }}
                          />
                        </FormControl>
                        {!camposUsuarioValidados.nome && camposComFoco.nome && (
                          <p className="mt-1 text-red-300 text-xs flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> O nome deve ter pelo menos 3 caracteres
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={usuarioForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={(!camposUsuarioValidados.email || field.value.trim() === "") && camposComFoco.email ? "text-red-500" : ""}>
                          E-mail <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="email@empresa.com.br" 
                            {...field}
                            className={(!camposUsuarioValidados.email || field.value.trim() === "") && camposComFoco.email ? "border-red-500 ring-2 ring-red-500 focus:ring-red-500" : ""}
                            onBlur={(e) => {
                              field.onBlur();
                              handleInputBlur(e);
                              setCamposComFoco(prev => ({
                                ...prev,
                                email: true
                              }));
                            }}
                            onChange={(e) => {
                              field.onChange(e);
                              const value = e.target.value;
                              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                              setCamposUsuarioValidados(prev => ({
                                ...prev,
                                email: value.trim() !== "" && emailRegex.test(value)
                              }));
                              setCamposComFoco(prev => ({
                                ...prev,
                                email: true
                              }));
                            }}
                          />
                        </FormControl>
                        {(!camposUsuarioValidados.email || field.value.trim() === "") && camposComFoco.email && (
                          <p className="mt-1 text-red-300 text-xs flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> {field.value.trim() === "" ? "O e-mail é obrigatório" : "Formato de e-mail inválido"}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={usuarioForm.control}
                    name="setor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={!camposUsuarioValidados.setor ? "text-red-500" : ""}>
                          Setor <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setCamposUsuarioValidados(prev => ({
                              ...prev,
                              setor: value.trim() !== ''
                            }));
                          }}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className={!camposUsuarioValidados.setor && camposComFoco.setor ? "border-red-500 ring-2 ring-red-500 focus:ring-red-500" : ""}>
                              <SelectValue placeholder="Selecione o setor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="comercial">Comercial</SelectItem>
                            <SelectItem value="financeiro">Financeiro</SelectItem>
                            <SelectItem value="operacional">Operacional</SelectItem>
                            <SelectItem value="ti">TI</SelectItem>
                            <SelectItem value="administrativo">Administrativo</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        {!camposUsuarioValidados.setor && camposComFoco.setor && (
                          <p className="mt-1 text-red-300 text-xs flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> O setor é obrigatório
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={usuarioForm.control}
                    name="permissao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={!camposUsuarioValidados.permissao ? "text-red-500" : ""}>
                          Permissão <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select 
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            setCamposUsuarioValidados(prev => ({
                              ...prev,
                              permissao: value.trim() !== ''
                            }));
                          }}
                        >
                          <SelectTrigger className={!camposUsuarioValidados.permissao && camposComFoco.permissao ? "border-red-500 ring-2 ring-red-500 focus:ring-red-500" : ""}>
                            <SelectValue placeholder="Selecione o nível de acesso" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Visualizador</SelectItem>
                          </SelectContent>
                        </Select>
                        {!camposUsuarioValidados.permissao && camposComFoco.permissao && (
                          <p className="mt-1 text-red-300 text-xs flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Selecione uma permissão
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={usuarioForm.control}
                  name="ativo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          className="h-4 w-4 mt-1"
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Usuário ativo</FormLabel>
                        <FormDescription>
                          Desmarque para desativar o acesso do usuário temporariamente.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    disabled={isAddingUsuario || isUpdatingUsuario}
                    onClick={() => {
                      // Primeiro resetar o formulário com valores iniciais
                      usuarioForm.reset({
                        nome: "",
                        email: "",
                        setor: "comercial",
                        permissao: "editor",
                        ativo: true
                      });

                      // Limpar todos os erros antes de fechar
                      usuarioForm.clearErrors();

                      // Resetar estados de validação antes de fechar
                      setCamposUsuarioValidados({
                        nome: true,
                        email: true,
                        setor: true,
                        permissao: true
                      });

                      // Resetar estados de foco
                      setCamposComFoco({
                        nome: false,
                        email: false,
                        setor: false,
                        permissao: false
                      });

                      // Por último, fechar o formulário e limpar edição
                      setShowAddUser(false);
                      setEditingUsuario(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={isAddingUsuario || isUpdatingUsuario}
                  >
                    {(isAddingUsuario || isUpdatingUsuario) ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-gray-200 border-t-purple-600 animate-spin mr-2"></div>
                        {editingUsuario ? "Atualizando..." : "Salvando..."}
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {editingUsuario ? "Atualizar" : "Salvar Usuário"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {/* Lista de usuários ou carregamento */}
        {!showAddUser && (
          <>
            {isLoadingUsuarios || false || initialLoading ? (
              // Preloader de carregamento - mostrado sempre ao trocar de aba e durante carregamentos
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="h-10 w-10 rounded-full border-4 border-gray-200 border-t-purple-600 animate-spin mb-2"></div>
                <p className="text-gray-500">
                  {false ? "Atualizando lista de usuários..." : "Carregando usuários..."}
                </p>
              </div>
            ) : usuariosData && paginatedUsuarios.length === 0 ? (
              // Estado vazio - nenhum usuário
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <User className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum usuário cadastrado</h3>
                <p className="text-gray-500 mb-4">Adicione seu primeiro usuário adicional para compartilhar o acesso.</p>
                <Button 
                  onClick={() => {
                    setEditingUsuario(null);
                    usuarioForm.reset({
                      nome: "",
                      email: "",
                      setor: "comercial",
                      permissao: "editor",
                      ativo: true
                    });
                    setShowAddUser(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <UserPlus className="mr-2 h-4 w-4"                  />
                  Adicionar Usuário
                </Button>
              </div>
            ) : (
              // Lista de usuários
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Usuário</th>
                      <th className="text-left py-2 px-2">Setor</th>
                      <th className="text-left py-2 px-2">Permissão</th>
                      <th className="text-left py-2 px-2">Status</th>
                      <th className="text-left py-2 px-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsuarios.map((usuario, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${usuario.nome}`} alt={usuario.nome} />
                              <AvatarFallback>{usuario.nome.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{usuario.nome}</div>
                              <div className="text-sm text-gray-500">{usuario.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">{usuario.setor}</td>
                        <td className="py-3 px-2">
                          <Badge variant={usuario.perfil === 'admin' ? 'destructive' : usuario.perfil === 'editor' ? 'default' : 'secondary'}>
                            {usuario.perfil === 'admin' ? 'Administrador' : usuario.perfil === 'editor' ? 'Editor' : 'Visualizador'}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={usuario.status === 'ativo' ? 'default' : 'outline'} className={usuario.status === 'ativo' ? 'bg-green-500 hover:bg-green-600' : ''}>
                            {usuario.status === 'ativo' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditUsuario({
                                id: usuario.id,
                                nome: usuario.nome,
                                email: usuario.email,
                                setor: usuario.setor || "",
                                permissao: usuario.perfil || "editor",
                                ativo: usuario.status === 'ativo',
                                perfil: usuario.perfil || "editor",
                                status: usuario.status || "ativo"
                              })}
                              disabled={usuario.id ? disabledButtons[usuario.id] : false}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-500 hover:text-blue-700"
                              onClick={() => handleSendPasswordEmail(usuario.id!)}
                              disabled={usuario.id ? disabledButtons[usuario.id] : false}
                              title={usuario.password ? "Alterar senha" : "Criar senha"}
                            >
                              <Lock className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteUsuario({
                                id: usuario.id,
                                nome: usuario.nome,
                                email: usuario.email,
                                setor: usuario.setor || "",
                                permissao: usuario.perfil || "editor",
                                ativo: usuario.status === 'ativo',
                                perfil: usuario.perfil || "editor",
                                status: usuario.status || "ativo"
                              })}
                              disabled={usuario.id ? disabledButtons[usuario.id] : false}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Componente de Paginação */}
            {!showAddUser && !isLoadingUsuarios && !false && !initialLoading && filteredUsuarios.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                totalItems={filteredUsuarios.length}
              />
            )}
          </>
        )}
      </CardContent>

      {/* Alert Dialog de confirmação para exclusão */}
      <AlertDialog open={!!usuarioParaExcluir} onOpenChange={(open) => !open && setUsuarioParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{usuarioParaExcluir?.nome}</strong>?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingUsuario}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmarExclusaoUsuario}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeletingUsuario}
            >
              {isDeletingUsuario ? (
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