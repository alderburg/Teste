import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
// Import dos componentes das abas
import ContatosTab from "@/components/conta/ContatosTab";
import EnderecosTab from "@/components/conta/EnderecosTab";
import { 
  User, Camera, Save, Upload, ArrowLeft, Loader2, 
  MapPin, CreditCard, FileText, Shield, Edit3,
  Building, Users, CheckCircle, CreditCard as CreditCardIcon,
  Download, DollarSign, Calendar, Badge, Landmark, BriefcaseBusiness, 
  UserCog, FileText as ReceiptIcon, Phone, Lock, Settings,
  X, Mail, PlusCircle, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";

// Esquemas de validação importados da versão desktop
import { perfilSchema, enderecoSchema, contatoSchema, usuarioSchema } from "@/pages/conta/index";

type PerfilFormValues = z.infer<typeof perfilSchema>;
type EnderecoFormValues = z.infer<typeof enderecoSchema>;
type ContatoFormValues = z.infer<typeof contatoSchema>;
type UsuarioFormValues = z.infer<typeof usuarioSchema>;

export default function MobileContaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Função para obter a aba ativa a partir dos parâmetros da URL
  const getActiveTabFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['dados', 'contatos', 'usuarios', 'financeiro', 'seguranca'].includes(tab)) {
      return tab;
    }
    return "dados"; // Aba padrão
  };
  
  const [activeTab, setActiveTab] = useState(getActiveTabFromURL());
  const [isUploading, setIsUploading] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddEndereco, setShowAddEndereco] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [show2FASection, setShow2FASection] = useState(false);
  const [showAddUsuario, setShowAddUsuario] = useState(false);
  const [showHistoricoPagamentos, setShowHistoricoPagamentos] = useState(false);
  const [showHistoricoAssinaturas, setShowHistoricoAssinaturas] = useState(false);
  const [camposUsuarioValidados, setCamposUsuarioValidados] = useState({
    nome: true,
    email: true,
    cargo: true,
    perfil: true
  });
  const [enderecos, setEnderecos] = useState<EnderecoFormValues[]>([]);
  const [contatos, setContatos] = useState<ContatoFormValues[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioFormValues[]>([]);
  const [editingEndereco, setEditingEndereco] = useState<EnderecoFormValues | null>(null);
  const [editingContato, setEditingContato] = useState<ContatoFormValues | null>(null);
  const [editingUsuario, setEditingUsuario] = useState<UsuarioFormValues | null>(null);
  
  // Gerenciamento de erros específicos dos campos
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const perfilForm = useForm<PerfilFormValues>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      logoUrl: user?.logoUrl || "",
      primeiroNome: "",
      ultimoNome: "",
      razaoSocial: "",
      nomeFantasia: "",
      tipoPessoa: "fisica",
      cpfCnpj: "",
      inscricaoEstadual: "",
      inscricaoMunicipal: "",
      cnae: "",
      regimeTributario: "mei",
      atividadePrincipal: "",

      // Responsável
      responsavelNome: "",
      responsavelEmail: "",
      responsavelTelefone: "",
      responsavelSetor: "Administrativa",

      // Contador
      contadorNome: "",
      contadorEmail: "",
      contadorTelefone: "",
    },
    mode: "onSubmit",
  });

  const enderecoForm = useForm<EnderecoFormValues>({
    resolver: zodResolver(enderecoSchema),
    defaultValues: {
      nome: "",
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
      principal: false
    },
    mode: "onSubmit",
  });
  
  const usuarioForm = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      nome: "",
      email: "",
      cargo: "",
      perfil: "usuario",
      status: "ativo"
    },
    mode: "onSubmit",
  });

  // Fetch user profile data
  const { data: perfilData, isLoading: isLoadingPerfil } = useQuery({
    queryKey: ["/api/minha-conta/perfil", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/minha-conta/perfil?userId=${user?.id || 0}`);
      return res.json();
    },
    enabled: !!user,
  });

  // Mutation para atualizar dados do perfil
  const updatePerfilMutation = useMutation({
    mutationFn: async (data: PerfilFormValues) => {
      const res = await apiRequest("PUT", `/api/minha-conta/perfil/${user?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Perfil atualizado",
        description: "Seus dados foram atualizados com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/minha-conta/perfil"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar endereço
  const updateEnderecoMutation = useMutation({
    mutationFn: async (data: EnderecoFormValues) => {
      const res = await apiRequest("PUT", `/api/minha-conta/perfil/${user?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Endereço atualizado",
        description: "Seus dados de endereço foram atualizados com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/minha-conta/perfil"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar endereço",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para upload de logo
  const uploadLogoMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", `/api/minha-conta/upload-logo`, formData);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Logo atualizado",
        description: "Seu logo foi atualizado com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      perfilForm.setValue("logoUrl", data.logoUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/minha-conta/perfil"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao fazer upload do logo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Efeito para escutar mudanças na URL e atualizar a aba ativa
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getActiveTabFromURL());
    };
    
    // Adiciona um listener para eventos de navegação
    window.addEventListener('popstate', handlePopState);
    
    // Limpa o listener quando o componente for desmontado
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
  
  // Efeito adicional para monitorar mudanças nos parâmetros da URL
  useEffect(() => {
    // Atualiza a aba ativa sempre que a URL mudar
    setActiveTab(getActiveTabFromURL());
    
    // Observe mudanças no URL (history pushState/replaceState)
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function() {
      originalPushState.apply(this, arguments as any);
      setActiveTab(getActiveTabFromURL());
    };
    
    window.history.replaceState = function() {
      originalReplaceState.apply(this, arguments as any);
      setActiveTab(getActiveTabFromURL());
    };
    
    // Escutar o evento personalizado de mudança de aba
    const handleTabChange = (event: any) => {
      if (event.detail) {
        setActiveTab(event.detail);
      }
    };
    
    window.addEventListener('tab-change', handleTabChange);
    
    return () => {
      // Restaura os métodos originais quando o componente for desmontado
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('tab-change', handleTabChange);
    };
  }, []);
  
  // Atualiza o formulário quando os dados do perfil são carregados
  useEffect(() => {
    if (perfilData) {
      // Atualiza o formulário de perfil
      Object.keys(perfilForm.getValues()).forEach((key) => {
        if (key in perfilData) {
          perfilForm.setValue(key as any, perfilData[key]);
        }
      });

      // Para demonstração, vamos criar alguns endereços e contatos de exemplo
      if (enderecos.length === 0) {
        setEnderecos([
          {
            nome: "Sede Principal",
            tipo: "comercial",
            cep: "89000-000",
            logradouro: "Rua das Empresas",
            numero: "1250",
            complemento: "Sala 301",
            bairro: "Centro",
            cidade: "Florianópolis", 
            estado: "SC",
            principal: true
          }
        ]);
      }
      
      if (contatos.length === 0) {
        setContatos([
          {
            nome: "João da Silva",
            setor: "comercial",
            cargo: "Gerente Comercial",
            telefone: "(48) 3333-4444",
            celular: "(48) 99999-8888",
            whatsapp: "(48) 99999-8888",
            email: "joao@empresa.com",
            principal: true
          }
        ]);
      }
      
      if (usuarios.length === 0) {
        setUsuarios([
          {
            nome: "João Silva",
            email: "joao@empresa.com",
            cargo: "Gerente Comercial",
            perfil: "administrador",
            status: "ativo"
          },
          {
            nome: "Maria Santos",
            email: "maria@empresa.com",
            cargo: "Analista Financeiro",
            perfil: "usuario",
            status: "ativo"
          },
          {
            nome: "Pedro Oliveira",
            email: "pedro@empresa.com",
            cargo: "Assistente Administrativo",
            perfil: "usuario",
            status: "inativo"
          }
        ]);
      }
    }
  }, [perfilData, perfilForm, enderecos.length, contatos.length, usuarios.length]);

  // Função para lidar com upload de imagem
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validação de tipo e tamanho
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Por favor, envie uma imagem nos formatos JPG, PNG ou GIF.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 5MB.",
        variant: "destructive",
      });
      return;
    }

    // Upload do arquivo
    setIsUploading(true);
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('userId', user?.id?.toString() || "0");

    uploadLogoMutation.mutate(formData);
    setIsUploading(false);
  };

  // Função para remover o logo
  const handleRemoveLogo = () => {
    if (window.confirm("Tem certeza que deseja remover seu logo?")) {
      perfilForm.setValue("logoUrl", "");
      const data = perfilForm.getValues();
      updatePerfilMutation.mutate(data);
    }
  };

  // Função para salvar o formulário de perfil
  const handleSavePerfil = (formData: PerfilFormValues) => {
    try {
      updatePerfilMutation.mutate(formData);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar dados",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Função para adicionar um novo endereço
  const handleAddEndereco = (formData: EnderecoFormValues) => {
    try {
      // Se estamos no modo edição, atualize o endereço existente
      if (editingEndereco) {
        const enderecoIndex = enderecos.findIndex(e => e === editingEndereco);
        if (enderecoIndex !== -1) {
          const updatedEnderecos = [...enderecos];
          updatedEnderecos[enderecoIndex] = formData;
          setEnderecos(updatedEnderecos);
          setEditingEndereco(null);
        }
      } else {
        // Adicione um novo endereço
        setEnderecos(prev => [...prev, formData]);
      }
      
      // Limpe o formulário
      enderecoForm.reset({
        nome: "",
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
      
      // Feche o formulário de adição
      setShowAddEndereco(false);
      
      toast({
        title: "Endereço salvo",
        description: "O endereço foi salvo com sucesso.",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      
      // Posteriormente, atualize no backend
      // updateEnderecoMutation.mutate({ enderecos });
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
    setShowAddEndereco(true);
  };
  
  // Função para excluir um endereço
  const handleDeleteEndereco = (endereco: EnderecoFormValues) => {
    if (window.confirm("Tem certeza que deseja excluir este endereço?")) {
      setEnderecos(prev => prev.filter(e => e !== endereco));
      toast({
        title: "Endereço excluído",
        description: "O endereço foi excluído com sucesso.",
        variant: "default",
        className: "bg-white border-gray-200",
      });
    }
  };
  
  // Função para adicionar um novo contato
  const handleAddContato = (formData: ContatoFormValues) => {
    try {
      // Se estamos no modo edição, atualize o contato existente
      if (editingContato) {
        const contatoIndex = contatos.findIndex(c => c === editingContato);
        if (contatoIndex !== -1) {
          const updatedContatos = [...contatos];
          updatedContatos[contatoIndex] = formData;
          setContatos(updatedContatos);
          setEditingContato(null);
        }
      } else {
        // Adicione um novo contato
        setContatos(prev => [...prev, formData]);
      }
      
      // Limpe o formulário
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
      
      // Feche o formulário de adição
      setShowAddContact(false);
      
      toast({
        title: "Contato salvo",
        description: "O contato foi salvo com sucesso.",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      
      // Posteriormente, atualize no backend
      // updateContatoMutation.mutate({ contatos });
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
    setShowAddContact(true);
  };
  
  // Função para excluir um contato
  const handleDeleteContato = (contato: ContatoFormValues) => {
    if (window.confirm("Tem certeza que deseja excluir este contato?")) {
      setContatos(prev => prev.filter(c => c !== contato));
      toast({
        title: "Contato excluído",
        description: "O contato foi excluído com sucesso.",
        variant: "default",
        className: "bg-white border-gray-200",
      });
    }
  };
  
  // Função para validar formato de email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Função para validar campos quando o usuário sai do input
  const handleUsuarioInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'nome') {
      setCamposUsuarioValidados(prev => ({
        ...prev,
        nome: value.trim() !== ''
      }));
    } else if (name === 'email') {
      setCamposUsuarioValidados(prev => ({
        ...prev,
        email: value.trim() === '' || isValidEmail(value)
      }));
    } else if (name === 'cargo') {
      setCamposUsuarioValidados(prev => ({
        ...prev,
        cargo: value.trim() !== ''
      }));
    }
  };

  // Verifica se o formulário de usuário está válido
  const isUsuarioFormValid = () => {
    const values = usuarioForm.getValues();
    return (
      values.nome.trim() !== "" && 
      isValidEmail(values.email) && 
      values.cargo.trim() !== "" &&
      values.perfil !== ""
    );
  };

  // Função para adicionar um novo usuário
  const handleAddUsuario = (formData: UsuarioFormValues) => {
    try {
      // Valide os campos manualmente
      const validacoes = {
        nome: formData.nome.trim() !== '',
        email: isValidEmail(formData.email) || formData.email.trim() === '',
        cargo: formData.cargo.trim() !== '',
        perfil: formData.perfil !== ''
      };
      
      setCamposUsuarioValidados(validacoes);
      
      // Verificar especificamente o email e mostrar toast se for inválido
      if (!isValidEmail(formData.email) && formData.email.trim() !== '') {
        toast({
          title: "Formato de e-mail inválido",
          description: "Por favor, verifique o formato do email inserido.",
          variant: "destructive",
        });
      }
      
      // Se qualquer campo for inválido, não continue
      if (!Object.values(validacoes).every(Boolean)) {
        return;
      }
      
      // Se estamos no modo edição, atualize o usuário existente
      if (editingUsuario) {
        const usuarioIndex = usuarios.findIndex(u => u === editingUsuario);
        if (usuarioIndex !== -1) {
          const updatedUsuarios = [...usuarios];
          updatedUsuarios[usuarioIndex] = formData;
          setUsuarios(updatedUsuarios);
          setEditingUsuario(null);
        }
      } else {
        // Adicione um novo usuário
        setUsuarios(prev => [...prev, formData]);
      }
      
      // Limpe o formulário
      usuarioForm.reset({
        nome: "",
        email: "",
        cargo: "",
        perfil: "usuario",
        status: "ativo"
      });
      
      // Resete as validações
      setCamposUsuarioValidados({
        nome: true,
        email: true,
        cargo: true,
        perfil: true
      });
      
      // Feche o formulário de adição
      setShowAddUsuario(false);
      
      toast({
        title: "Usuário salvo",
        description: "O usuário foi salvo com sucesso.",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      
      // Posteriormente, atualize no backend
      // updateUsuarioMutation.mutate({ usuarios });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  // Função para editar um usuário existente
  const handleEditUsuario = (usuario: UsuarioFormValues) => {
    setEditingUsuario(usuario);
    Object.keys(usuarioForm.getValues()).forEach((key) => {
      usuarioForm.setValue(key as any, usuario[key as keyof UsuarioFormValues]);
    });
    setShowAddUsuario(true);
  };
  
  // Função para excluir um usuário
  const handleDeleteUsuario = (usuario: UsuarioFormValues) => {
    if (window.confirm("Tem certeza que deseja remover este usuário?")) {
      setUsuarios(prev => prev.filter(u => u !== usuario));
      toast({
        title: "Usuário removido",
        description: "O usuário foi removido com sucesso.",
        variant: "default",
        className: "bg-white border-gray-200",
      });
    }
  };

  // Função para renderizar ícone da aba
  const renderTabIcon = (tab: string) => {
    switch (tab) {
      case "dados":
        return <User className="h-5 w-5" />;
      case "enderecos":
        return <MapPin className="h-5 w-5" />;
      case "contatos":
        return <Phone className="h-5 w-5" />;
      case "usuarios":
        return <Users className="h-5 w-5" />;
      case "financeiro":
        return <CreditCard className="h-5 w-5" />;
      case "seguranca":
        return <Shield className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen flex-1 w-full pb-16">
      <div className="container mx-auto p-4">
        {/* Cabeçalho */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Minha Conta</h2>
          <p className="text-gray-500 text-sm">
            Gerencie suas informações e configurações
          </p>
        </div>

        {/* Conteúdo da Aba */}
        <div className="mb-16">
          {activeTab === "dados" && (
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <Form {...perfilForm}>
                    <form onSubmit={perfilForm.handleSubmit(handleSavePerfil)} className="space-y-6">
                      <div className="space-y-4">
                        {/* Logo Upload Section - Simplificado */}
                        <div className="mb-4 flex justify-center">
                          <div className="relative inline-block mb-4">
                            <label htmlFor="logo-upload-mobile" className="cursor-pointer">
                              <Avatar className="w-64 h-32 rounded-lg shadow-sm hover:opacity-90 transition-opacity">
                                {perfilForm.watch("logoUrl") ? (
                                  <AvatarImage src={perfilForm.watch("logoUrl")} alt="Logo" className="object-contain" />
                                ) : (
                                  <AvatarFallback className="bg-purple-100 text-purple-600 text-2xl rounded-lg">
                                    {user?.primeiroNome?.charAt(0) || "U"}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div 
                                className="absolute -right-2 -bottom-2 bg-purple-600 rounded-full p-2 hover:bg-purple-700 transition-colors shadow-sm"
                              >
                                <Camera className="h-4 w-4 text-white" />
                              </div>
                              <input 
                                id="logo-upload-mobile" 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleLogoUpload}
                              />
                            </label>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                          <h3 className="text-base font-medium mb-3 flex items-center text-gray-800">
                            <Landmark className="h-4 w-4 mr-2 text-purple-600" />
                            Dados da Empresa
                          </h3>
                          
                          <div className="space-y-4">
                            <div className="bg-purple-50 p-3 rounded-md border-l-4 border-purple-500">
                              <FormField
                                control={perfilForm.control}
                                name="tipoPessoa"
                                render={({ field }) => (
                                  <FormItem className="mb-0">
                                    <FormLabel className="text-purple-700 font-medium text-sm">
                                      Tipo de Pessoa: <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <Select 
                                      value={field.value} 
                                      onValueChange={field.onChange}
                                    >
                                      <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Selecione o tipo" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="fisica">Física</SelectItem>
                                        <SelectItem value="juridica">Jurídica</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            {perfilForm.watch("tipoPessoa") === "fisica" && (
                              <div className="grid grid-cols-1 gap-3">
                                <FormField
                                  control={perfilForm.control}
                                  name="primeiroNome"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm">
                                        Primeiro Nome: <span className="text-red-500">*</span>
                                      </FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={perfilForm.control}
                                  name="ultimoNome"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm">
                                        Último Nome: <span className="text-red-500">*</span>
                                      </FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            )}

                            <FormField
                              control={perfilForm.control}
                              name="cpfCnpj"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm">
                                    {perfilForm.watch("tipoPessoa") === "fisica" ? "CPF" : "CNPJ"}: <span className="text-red-500">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            {perfilForm.watch("tipoPessoa") === "juridica" && (
                              <>
                                <FormField
                                  control={perfilForm.control}
                                  name="inscricaoEstadual"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm">Inscrição Estadual:</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={perfilForm.control}
                                  name="razaoSocial"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm">
                                        Razão Social: <span className="text-red-500">*</span>
                                      </FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={perfilForm.control}
                                  name="nomeFantasia"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm">Nome Fantasia:</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={perfilForm.control}
                                  name="inscricaoMunicipal"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm">Inscrição Municipal:</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={perfilForm.control}
                                  name="cnae"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm">CNAE:</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={perfilForm.control}
                                  name="regimeTributario"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm">
                                        Regime Tributário:
                                      </FormLabel>
                                      <Select 
                                        value={field.value} 
                                        onValueChange={field.onChange}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecione o regime" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="mei">MEI</SelectItem>
                                          <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                                          <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                                          <SelectItem value="lucro_real">Lucro Real</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={perfilForm.control}
                                  name="atividadePrincipal"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm">Atividade Principal:</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </>
                            )}
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                          <h3 className="text-base font-medium mb-3 flex items-center text-gray-800">
                            <UserCog className="h-4 w-4 mr-2 text-purple-600" />
                            Responsável Legal
                          </h3>
                          <div className="space-y-3">
                            <FormField
                              control={perfilForm.control}
                              name="responsavelNome"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm">Nome do Responsável: <span className="text-red-500">*</span></FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={perfilForm.control}
                              name="responsavelEmail"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm">Email: <span className="text-red-500">*</span></FormLabel>
                                  <FormControl>
                                    <Input {...field} type="email" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={perfilForm.control}
                              name="responsavelTelefone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm">Telefone: <span className="text-red-500">*</span></FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={perfilForm.control}
                              name="responsavelSetor"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm">Setor:</FormLabel>
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione o setor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Administrativa">Administrativa</SelectItem>
                                      <SelectItem value="Financeira">Financeira</SelectItem>
                                      <SelectItem value="Comercial">Comercial</SelectItem>
                                      <SelectItem value="Operacional">Operacional</SelectItem>
                                      <SelectItem value="TI">TI</SelectItem>
                                      <SelectItem value="Outro">Outro</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {perfilForm.watch("tipoPessoa") === "juridica" && (
                          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                            <h3 className="text-base font-medium mb-3 flex items-center text-gray-800">
                              <ReceiptIcon className="h-4 w-4 mr-2 text-purple-600" />
                              Contador Responsável
                            </h3>
                            <div className="space-y-3">
                              <FormField
                                control={perfilForm.control}
                                name="contadorNome"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm">Nome do Contador:</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={perfilForm.control}
                                name="contadorEmail"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm">Email:</FormLabel>
                                    <FormControl>
                                      <Input {...field} type="email" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={perfilForm.control}
                                name="contadorTelefone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm">Telefone:</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex justify-center md:justify-end">
                        <Button 
                          type="submit"
                          className="bg-purple-600 hover:bg-purple-700 transition-all w-full md:w-auto"
                          disabled={updatePerfilMutation.isPending}
                        >
                          {updatePerfilMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Salvar Alterações
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "enderecos" && (
            <div className="space-y-4">
              <EnderecosTab />
            </div>
          )}
          
          {activeTab === "contatos" && (
            <div className="space-y-4">
              <ContatosTab />
            </div>
          )}

          {activeTab === "usuarios" && (
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle>Meus Usuários</CardTitle>
                  <CardDescription>
                    Gerencie usuários que têm acesso ao seu perfil
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-4 gap-2">
                    <div>
                      <h3 className="text-base font-medium">Usuários com acesso</h3>
                      <p className="text-xs text-gray-500 mt-1">Adicione, remova ou altere os níveis de acesso</p>
                    </div>
                    {/* Botão só aparece quando não estamos no modo de edição */}
                    {!showAddUsuario && (
                      <Button 
                        className="bg-purple-600 hover:bg-purple-700 w-full md:w-auto"
                        onClick={() => {
                          setEditingUsuario(null);
                          usuarioForm.reset({
                            nome: "",
                            email: "",
                            cargo: "",
                            perfil: "usuario",
                            status: "ativo"
                          });
                          // Inicializa estados de validação ao abrir o formulário
                          setCamposUsuarioValidados({
                            nome: true,
                            email: true,
                            cargo: true,
                            perfil: true
                          });
                          setShowAddUsuario(true);
                        }}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Usuário
                      </Button>
                    )}
                  </div>

                  {/* Formulário de adição/edição de usuário */}
                  {showAddUsuario && (
                    <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium">
                          {editingUsuario ? "Editar Usuário" : "Adicionar Usuário"}
                        </h3>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setShowAddUsuario(false);
                            setEditingUsuario(null);
                            usuarioForm.reset();
                            setCamposUsuarioValidados({
                              nome: true,
                              email: true,
                              cargo: true,
                              perfil: true
                            });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Form {...usuarioForm}>
                        <form className="space-y-4" noValidate>
                          <div className="grid grid-cols-1 gap-4">
                            <FormField
                              control={usuarioForm.control}
                              name="nome"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={`${!camposUsuarioValidados.nome ? 'text-red-500' : ''}`}>Nome do Usuário <span className="text-red-500">*</span></FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      className={`${!camposUsuarioValidados.nome ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
                                      onBlur={handleUsuarioInputBlur}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        setCamposUsuarioValidados(prev => ({
                                          ...prev,
                                          nome: e.target.value.trim() !== ''
                                        }));
                                      }}
                                    />
                                  </FormControl>
                                  {!camposUsuarioValidados.nome && (
                                    <p className="mt-1 text-red-300 text-xs flex items-center">
                                      <AlertTriangle className="w-3 h-3 mr-1" /> Nome não pode estar vazio
                                    </p>
                                  )}
                                  {/* Desabilitando mensagem padrão de erro */}
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={usuarioForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={`${!camposUsuarioValidados.email ? 'text-red-500' : ''}`}>Email <span className="text-red-500">*</span></FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="text" 
                                      {...field} 
                                      className={`${!camposUsuarioValidados.email ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
                                      onBlur={handleUsuarioInputBlur}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                        const isValid = emailRegex.test(e.target.value);
                                        
                                        // Atualiza estado de validação
                                        // Campo vazio também é considerado inválido para mostrar a mensagem de erro
                                        setCamposUsuarioValidados(prev => ({
                                          ...prev,
                                          email: isValid && e.target.value.trim() !== ''
                                        }));
                                      }}
                                    />
                                  </FormControl>
                                  {!camposUsuarioValidados.email && (
                                    <p className="mt-1 text-red-300 text-xs flex items-center">
                                      <AlertTriangle className="w-3 h-3 mr-1" /> Formato de e-mail inválido
                                    </p>
                                  )}
                                  {/* Desabilitando mensagem padrão de erro */}
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={usuarioForm.control}
                              name="cargo"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={`${!camposUsuarioValidados.cargo ? 'text-red-500' : ''}`}>Cargo <span className="text-red-500">*</span></FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      className={`${!camposUsuarioValidados.cargo ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
                                      onBlur={handleUsuarioInputBlur}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        setCamposUsuarioValidados(prev => ({
                                          ...prev,
                                          cargo: e.target.value.trim() !== ''
                                        }));
                                      }}
                                    />
                                  </FormControl>
                                  {!camposUsuarioValidados.cargo && (
                                    <p className="mt-1 text-red-300 text-xs flex items-center">
                                      <AlertTriangle className="w-3 h-3 mr-1" /> Cargo não pode estar vazio
                                    </p>
                                  )}
                                  {/* Desabilitando mensagem padrão de erro */}
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={usuarioForm.control}
                              name="perfil"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={`${!camposUsuarioValidados.perfil ? 'text-red-500' : ''}`}>Perfil de Acesso <span className="text-red-500">*</span></FormLabel>
                                  <Select 
                                    value={field.value} 
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      setCamposUsuarioValidados(prev => ({
                                        ...prev,
                                        perfil: value.trim() !== ''
                                      }));
                                    }}
                                  >
                                    <SelectTrigger className={`${!camposUsuarioValidados.perfil ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}>
                                      <SelectValue placeholder="Selecione o perfil" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="administrador">Administrador</SelectItem>
                                      <SelectItem value="usuario">Usuário</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {!camposUsuarioValidados.perfil && (
                                    <p className="mt-1 text-red-300 text-xs flex items-center">
                                      <AlertTriangle className="w-3 h-3 mr-1" /> É necessário selecionar um perfil
                                    </p>
                                  )}
                                  {/* Desabilitando mensagem padrão de erro */}
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <Button 
                              type="button" 
                              variant="outline"
                              onClick={() => {
                                setShowAddUsuario(false);
                                setEditingUsuario(null);
                                usuarioForm.reset();
                                setCamposUsuarioValidados({
                                  nome: true,
                                  email: true,
                                  cargo: true,
                                  perfil: true
                                });
                              }}
                            >
                              Cancelar
                            </Button>
                            <Button 
                              type="button"
                              className="bg-purple-600 hover:bg-purple-700"
                              onClick={() => {
                                // Verificar se todos os campos estão válidos antes de enviar
                                const isNomeValido = usuarioForm.getValues().nome.trim() !== '';
                                const isEmailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usuarioForm.getValues().email);
                                const isCargoValido = usuarioForm.getValues().cargo.trim() !== '';
                                const isPerfilValido = usuarioForm.getValues().perfil.trim() !== '';
                                
                                // Atualiza o estado de validação
                                setCamposUsuarioValidados({
                                  nome: isNomeValido,
                                  email: isEmailValido && usuarioForm.getValues().email.trim() !== '',
                                  cargo: isCargoValido,
                                  perfil: isPerfilValido
                                });
                                
                                // Verifica todos os campos e agrupa os erros em uma única notificação
                                const camposInvalidos = [];
                                
                                if (!isNomeValido) {
                                  camposInvalidos.push("Nome");
                                }
                                
                                if (!isEmailValido) {
                                  if (usuarioForm.getValues().email.trim() === '') {
                                    camposInvalidos.push("Email");
                                  } else {
                                    camposInvalidos.push("Email (formato inválido)");
                                  }
                                }
                                
                                if (!isCargoValido) {
                                  camposInvalidos.push("Cargo");
                                }
                                
                                if (!isPerfilValido) {
                                  camposInvalidos.push("Perfil");
                                }
                                
                                // Se houver campos inválidos, exibe um toast com todos os erros
                                if (camposInvalidos.length > 0) {
                                  toast({
                                    title: "Erro de validação",
                                    description: `Preencha os campos obrigatórios: ${camposInvalidos.join(', ')}`,
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                // Se passou por todas as validações, chama a função de submit
                                handleAddUsuario(usuarioForm.getValues());
                              }}
                            >
                              {editingUsuario ? "Atualizar" : "Adicionar"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </div>
                  )}

                  {/* Lista de usuários em cards */}
                  {!showAddUsuario && (
                    <div className="grid grid-cols-1 gap-4">
                      {/* Usuário 1: Administrador (destacado em roxo) */}
                      <div className="border rounded-lg p-4 relative hover:shadow-md transition-shadow border-purple-200 bg-purple-50">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <div className="p-2 rounded-full bg-purple-100">
                              <Users className="h-5 w-5 text-purple-600" />
                            </div>
                            <h3 className="font-medium text-lg ml-2">João Silva</h3>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                usuarioForm.reset({
                                  nome: "João Silva",
                                  email: "joao@empresa.com",
                                  cargo: "Gerente Comercial",
                                  perfil: "administrador",
                                  status: "ativo"
                                });
                                setEditingUsuario({
                                  nome: "João Silva",
                                  email: "joao@empresa.com",
                                  cargo: "Gerente Comercial",
                                  perfil: "administrador",
                                  status: "ativo"
                                });
                                // Inicializa estados de validação
                                setCamposUsuarioValidados({
                                  nome: true,
                                  email: true,
                                  cargo: true,
                                  perfil: true
                                });
                                setShowAddUsuario(true);
                              }}
                            >
                              <Edit3 className="h-4 w-4 text-gray-500" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDeleteUsuario({
                                nome: "João Silva",
                                email: "joao@empresa.com",
                                cargo: "Gerente Comercial",
                                perfil: "administrador",
                                status: "ativo"
                              })}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-800 font-medium mb-2">
                          Gerente Comercial
                        </div>
                        
                        <div className="text-sm text-gray-700 mb-3">
                          <div className="flex items-center mb-1">
                            <Mail className="h-4 w-4 mr-2 text-gray-500" />
                            <span>joao@empresa.com</span>
                          </div>
                          <div className="flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-gray-500" />
                            <span>Administrador</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs px-2 py-1 rounded-full uppercase font-medium bg-green-100 text-green-700">
                            Ativo
                          </span>
                          <span className="text-xs text-gray-500">Desde 01/05/2025</span>
                        </div>
                      </div>

                      {/* Usuário 2: Usuário comum */}
                      <div className="border rounded-lg p-4 relative hover:shadow-md transition-shadow border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <div className="p-2 rounded-full bg-green-100">
                              <Users className="h-5 w-5 text-green-600" />
                            </div>
                            <h3 className="font-medium text-lg ml-2">Maria Santos</h3>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                usuarioForm.reset({
                                  nome: "Maria Santos",
                                  email: "maria@empresa.com",
                                  cargo: "Analista Financeiro",
                                  perfil: "usuario",
                                  status: "ativo"
                                });
                                setEditingUsuario({
                                  nome: "Maria Santos",
                                  email: "maria@empresa.com",
                                  cargo: "Analista Financeiro",
                                  perfil: "usuario",
                                  status: "ativo"
                                });
                                // Inicializa estados de validação
                                setCamposUsuarioValidados({
                                  nome: true,
                                  email: true,
                                  cargo: true,
                                  perfil: true
                                });
                                setShowAddUsuario(true);
                              }}
                            >
                              <Edit3 className="h-4 w-4 text-gray-500" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDeleteUsuario({
                                nome: "Maria Santos",
                                email: "maria@empresa.com",
                                cargo: "Analista Financeiro",
                                perfil: "usuario",
                                status: "ativo"
                              })}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-800 font-medium mb-2">
                          Analista Financeiro
                        </div>
                        
                        <div className="text-sm text-gray-700 mb-3">
                          <div className="flex items-center mb-1">
                            <Mail className="h-4 w-4 mr-2 text-gray-500" />
                            <span>maria@empresa.com</span>
                          </div>
                          <div className="flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-gray-500" />
                            <span>Usuário</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs px-2 py-1 rounded-full uppercase font-medium bg-green-100 text-green-700">
                            Ativo
                          </span>
                          <span className="text-xs text-gray-500">Desde 05/05/2025</span>
                        </div>
                      </div>

                      {/* Usuário 3: Usuário inativo */}
                      <div className="border rounded-lg p-4 relative hover:shadow-md transition-shadow border-gray-200 opacity-70">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <div className="p-2 rounded-full bg-gray-100">
                              <Users className="h-5 w-5 text-gray-600" />
                            </div>
                            <h3 className="font-medium text-lg ml-2">Pedro Oliveira</h3>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                usuarioForm.reset({
                                  nome: "Pedro Oliveira",
                                  email: "pedro@empresa.com",
                                  cargo: "Assistente Administrativo",
                                  perfil: "usuario",
                                  status: "inativo"
                                });
                                setEditingUsuario({
                                  nome: "Pedro Oliveira",
                                  email: "pedro@empresa.com",
                                  cargo: "Assistente Administrativo",
                                  perfil: "usuario",
                                  status: "inativo"
                                });
                                // Inicializa estados de validação
                                setCamposUsuarioValidados({
                                  nome: true,
                                  email: true,
                                  cargo: true,
                                  perfil: true
                                });
                                setShowAddUsuario(true);
                              }}
                            >
                              <Edit3 className="h-4 w-4 text-gray-500" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDeleteUsuario({
                                nome: "Pedro Oliveira",
                                email: "pedro@empresa.com",
                                cargo: "Assistente Administrativo",
                                perfil: "usuario",
                                status: "inativo"
                              })}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-800 font-medium mb-2">
                          Assistente Administrativo
                        </div>
                        
                        <div className="text-sm text-gray-700 mb-3">
                          <div className="flex items-center mb-1">
                            <Mail className="h-4 w-4 mr-2 text-gray-500" />
                            <span>pedro@empresa.com</span>
                          </div>
                          <div className="flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-gray-500" />
                            <span>Usuário</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs px-2 py-1 rounded-full uppercase font-medium bg-red-100 text-red-700">
                            Inativo
                          </span>
                          <span className="text-xs text-gray-500">Desde 10/05/2025</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "financeiro" && (
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle>Informações Financeiras</CardTitle>
                  <CardDescription>
                    Gerencie suas informações de pagamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-medium mb-2">Assinatura Atual</h3>
                      <div className="border rounded-lg p-3 bg-gradient-to-r from-purple-50 to-purple-100">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div>
                            <div className="font-medium text-lg text-purple-800">Plano Pro</div>
                            <div className="text-sm text-gray-600">Faturamento Anual</div>
                          </div>
                          <div className="md:text-right">
                            <div className="text-xl font-bold text-purple-700">R$ 1.188,00<span className="text-sm font-normal text-gray-600">/ano</span></div>
                            <div className="text-xs text-green-600">Economiza R$ 228,00 por ano</div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          <p className="text-sm text-gray-600">Próxima cobrança: 15/06/2024</p>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-200 flex flex-col md:flex-row justify-between gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-sm"
                            onClick={() => setShowHistoricoPagamentos(!showHistoricoPagamentos)}
                          >
                            <DollarSign className="mr-2 h-3 w-3" />
                            Ver histórico de pagamentos
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-sm"
                            onClick={() => setShowHistoricoAssinaturas(!showHistoricoAssinaturas)}
                          >
                            <FileText className="mr-2 h-3 w-3" />
                            Ver histórico de assinaturas
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-medium mb-2">Métodos de Pagamento</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-gray-100 rounded">
                              <CreditCardIcon className="h-4 w-4 text-gray-500" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">•••• 4569</div>
                              <div className="text-xs text-gray-500">Visa - 08/2028</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Padrão
                            </div>
                          </div>
                        </div>

                        <Button className="bg-purple-600 hover:bg-purple-700 w-full text-sm mt-2">
                          <CreditCardIcon className="mr-2 h-4 w-4" />
                          Adicionar Cartão
                        </Button>
                      </div>
                    </div>

                    {/* Histórico de Pagamentos */}
                    {showHistoricoPagamentos && (
                      <div className="mt-6">
                        <h3 className="text-base font-medium mb-3">Histórico de Pagamentos</h3>
                        <div className="space-y-3">
                          <div className="border rounded-lg p-3 bg-green-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-sm">Pagamento Confirmado</div>
                                <div className="text-xs text-gray-500">Plano Pro - Anual</div>
                                <div className="text-xs text-gray-500">15 de Maio de 2024</div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-green-700">R$ 1.188,00</div>
                                <div className="text-xs text-gray-500">Visa •••• 4569</div>
                              </div>
                            </div>
                            <div className="mt-2 flex justify-between items-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Pago
                              </span>
                              <Button variant="ghost" size="sm" className="text-xs text-gray-500">
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>

                          <div className="border rounded-lg p-3 bg-green-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-sm">Pagamento Confirmado</div>
                                <div className="text-xs text-gray-500">Plano Pro - Anual</div>
                                <div className="text-xs text-gray-500">15 de Maio de 2023</div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-green-700">R$ 1.188,00</div>
                                <div className="text-xs text-gray-500">Visa •••• 4569</div>
                              </div>
                            </div>
                            <div className="mt-2 flex justify-between items-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Pago
                              </span>
                              <Button variant="ghost" size="sm" className="text-xs text-gray-500">
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>

                          <div className="border rounded-lg p-3 bg-green-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-sm">Pagamento Confirmado</div>
                                <div className="text-xs text-gray-500">Plano Básico - Mensal</div>
                                <div className="text-xs text-gray-500">15 de Abril de 2023</div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-green-700">R$ 118,00</div>
                                <div className="text-xs text-gray-500">Visa •••• 4569</div>
                              </div>
                            </div>
                            <div className="mt-2 flex justify-between items-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Pago
                              </span>
                              <Button variant="ghost" size="sm" className="text-xs text-gray-500">
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Histórico de Assinaturas */}
                    {showHistoricoAssinaturas && (
                      <div className="mt-6">
                        <h3 className="text-base font-medium mb-3">Histórico de Assinaturas</h3>
                        <div className="space-y-3">
                          <div className="border rounded-lg p-3 bg-purple-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-sm text-purple-800">Plano Pro</div>
                                <div className="text-xs text-gray-600">Faturamento Anual</div>
                                <div className="text-xs text-gray-500">Iniciado em: 15/05/2024</div>
                              </div>
                              <div className="text-right">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Ativo
                                </span>
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="text-xs text-gray-600">
                                Próxima renovação: 15/05/2025 • R$ 1.188,00
                              </div>
                            </div>
                          </div>

                          <div className="border rounded-lg p-3 bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-sm">Plano Pro</div>
                                <div className="text-xs text-gray-600">Faturamento Anual</div>
                                <div className="text-xs text-gray-500">Período: 15/05/2023 - 15/05/2024</div>
                              </div>
                              <div className="text-right">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Expirado
                                </span>
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="text-xs text-gray-600">
                                Valor pago: R$ 1.188,00 • Renovado automaticamente
                              </div>
                            </div>
                          </div>

                          <div className="border rounded-lg p-3 bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-sm">Plano Básico</div>
                                <div className="text-xs text-gray-600">Faturamento Mensal</div>
                                <div className="text-xs text-gray-500">Período: 15/02/2023 - 15/05/2023</div>
                              </div>
                              <div className="text-right">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Upgrade
                                </span>
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="text-xs text-gray-600">
                                Total pago: R$ 354,00 (3 meses) • Upgrade para Pro
                              </div>
                            </div>
                          </div>

                          <div className="border rounded-lg p-3 bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-sm">Plano Gratuito</div>
                                <div className="text-xs text-gray-600">Trial</div>
                                <div className="text-xs text-gray-500">Período: 01/02/2023 - 15/02/2023</div>
                              </div>
                              <div className="text-right">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Trial
                                </span>
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="text-xs text-gray-600">
                                Período de teste gratuito • Convertido para Básico
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "seguranca" && (
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle>Segurança da Conta</CardTitle>
                  <CardDescription>
                    Gerencie sua senha e segurança
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-medium mb-2">Alteração de Senha</h3>
                      <Button 
                        onClick={() => setShowPasswordSection(true)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-sm"
                      >
                        <Lock className="mr-2 h-4 w-4" />
                        Alterar Senha
                      </Button>
                      
                      {showPasswordSection && (
                        <div className="mt-3 space-y-3 border rounded-lg p-3">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
                              <input 
                                type="password" 
                                className="w-full border-gray-300 rounded-md" 
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                              <input 
                                type="password" 
                                className="w-full border-gray-300 rounded-md" 
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                              <input 
                                type="password" 
                                className="w-full border-gray-300 rounded-md" 
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-3">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowPasswordSection(false)}
                            >
                              Cancelar
                            </Button>
                            <Button 
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              Atualizar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-base font-medium mb-2">Autenticação em Dois Fatores</h3>
                      <Button 
                        onClick={() => setShow2FASection(true)}
                        className="w-full bg-gray-100 text-gray-800 hover:bg-gray-200 text-sm"
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Ativar 2FA
                      </Button>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-base font-medium mb-2">Sessões Ativas</h3>
                      <div className="space-y-2">
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center">
                            <div className="p-1.5 bg-purple-100 rounded-full">
                              <BriefcaseBusiness className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="ml-2 flex-1">
                              <div className="text-sm font-medium">Windows PC - Chrome</div>
                              <div className="text-xs text-gray-500">IP: 187.123.45.67</div>
                              <div className="text-xs text-green-600">Atual • Agora</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="p-1.5 bg-gray-100 rounded-full">
                                <Building className="h-4 w-4 text-gray-600" />
                              </div>
                              <div className="ml-2">
                                <div className="text-sm font-medium">iPhone 14 Pro</div>
                                <div className="text-xs text-gray-500">2 horas atrás</div>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-xs text-red-600">
                              Encerrar
                            </Button>
                          </div>
                        </div>
                        
                        <Button className="w-full mt-2 bg-red-600 hover:bg-red-700 text-sm">
                          Encerrar Todas as Sessões
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Menu Fixo na parte inferior */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-10">
          <div className="grid grid-cols-5 gap-1 max-w-lg mx-auto">
            <button 
              className={`flex flex-col items-center justify-center p-2 rounded-md ${activeTab === "dados" ? "text-purple-600" : "text-gray-500"}`}
              onClick={() => {
                // Atualiza a URL
                const url = new URL(window.location.href);
                url.searchParams.delete('tab');
                window.history.pushState({}, '', url.toString());
                // Atualiza a aba ativa
                setActiveTab("dados");
              }}
            >
              <User className="h-5 w-5" />
              <span className="text-xs mt-1">Perfil</span>
            </button>
            
            <button 
              className={`flex flex-col items-center justify-center p-2 rounded-md ${activeTab === "usuarios" ? "text-purple-600" : "text-gray-500"}`}
              onClick={() => {
                // Atualiza a URL
                const url = new URL(window.location.href);
                url.searchParams.set('tab', 'usuarios');
                window.history.pushState({}, '', url.toString());
                // Atualiza a aba ativa
                setActiveTab("usuarios");
              }}
            >
              <Users className="h-5 w-5" />
              <span className="text-xs mt-1">Usuários</span>
            </button>
            
            <button 
              className={`flex flex-col items-center justify-center p-2 rounded-md ${activeTab === "contatos" ? "text-purple-600" : "text-gray-500"}`}
              onClick={() => {
                // Atualiza a URL
                const url = new URL(window.location.href);
                url.searchParams.set('tab', 'contatos');
                window.history.pushState({}, '', url.toString());
                // Atualiza a aba ativa
                setActiveTab("contatos");
              }}
            >
              <Phone className="h-5 w-5" />
              <span className="text-xs mt-1">Contatos</span>
            </button>
            
            <button 
              className={`flex flex-col items-center justify-center p-2 rounded-md ${activeTab === "financeiro" ? "text-purple-600" : "text-gray-500"}`}
              onClick={() => {
                // Atualiza a URL
                const url = new URL(window.location.href);
                url.searchParams.set('tab', 'financeiro');
                window.history.pushState({}, '', url.toString());
                // Atualiza a aba ativa
                setActiveTab("financeiro");
              }}
            >
              <CreditCard className="h-5 w-5" />
              <span className="text-xs mt-1">Financeiro</span>
            </button>
            
            <button 
              className={`flex flex-col items-center justify-center p-2 rounded-md ${activeTab === "seguranca" ? "text-purple-600" : "text-gray-500"}`}
              onClick={() => {
                // Atualiza a URL
                const url = new URL(window.location.href);
                url.searchParams.set('tab', 'seguranca');
                window.history.pushState({}, '', url.toString());
                // Atualiza a aba ativa
                setActiveTab("seguranca");
              }}
            >
              <Shield className="h-5 w-5" />
              <span className="text-xs mt-1">Segurança</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}