import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isMobileDevice } from "@/lib/utils";
import MobileContaPage from "./mobile-conta";
import InputMask from "react-input-mask";
import { Loader2, Shield, User, LogOut, UserCheck, Key, Smartphone, MapPin, Phone, CreditCard, RefreshCw, Save, Upload, Building, PlusCircle, Edit3, Trash2, Mail, Coins, AlertTriangle } from "lucide-react";
import PaymentModal from "@/components/planos/PaymentModal";
import { useCreditBalance } from "@/hooks/use-credit-balance";

// Esquemas de validação
export const perfilSchema = z.object({
  logoUrl: z.string().optional(),
  primeiroNome: z.string().min(1, { message: "O primeiro nome é obrigatório" }),
  ultimoNome: z.string().min(1, { message: "O último nome é obrigatório" }),
  razaoSocial: z.string().optional(),
  nomeFantasia: z.string().optional(),
  tipoPessoa: z.string().min(1, { message: "O tipo de pessoa é obrigatório" }),
  cpfCnpj: z.string().min(1, { message: "CPF/CNPJ é obrigatório" }),
  inscricaoEstadual: z.string().optional(),
  inscricaoMunicipal: z.string().optional(),
  cnae: z.string().optional(),
  regimeTributario: z.string().optional(),
  atividadePrincipal: z.string().optional(),
  responsavelNome: z.string().min(1, { message: "O nome do responsável é obrigatório" }),
  responsavelEmail: z.string().email("Email inválido").min(1, { message: "O email do responsável é obrigatório" }),
  responsavelTelefone: z.string().min(1, { message: "O telefone do responsável é obrigatório" }),
  responsavelSetor: z.string().optional(),
  contadorNome: z.string().optional(),
  contadorEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  contadorTelefone: z.string().optional(),
});

export const enderecoSchema = z.object({
  cep: z.string().min(1, { message: "CEP é obrigatório" }),
  logradouro: z.string().min(1, { message: "Logradouro é obrigatório" }),
  numero: z.string().min(1, { message: "Número é obrigatório" }),
  complemento: z.string().optional(),
  bairro: z.string().min(1, { message: "Bairro é obrigatório" }),
  cidade: z.string().min(1, { message: "Cidade é obrigatória" }),
  estado: z.string().min(1, { message: "Estado é obrigatório" }),
  principal: z.boolean().default(false),
  tipo: z.string().default("comercial"),
});

export const contatoSchema = z.object({
  nome: z.string().min(1, { message: "Nome do contato é obrigatório" }),
  setor: z.string().min(1, { message: "Setor é obrigatório" }).default("comercial"),
  cargo: z.string().min(1, { message: "Cargo/Função é obrigatório" }),
  telefone: z.string().min(1, { message: "Telefone é obrigatório" }),
  celular: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("Email inválido").min(1, { message: "Email é obrigatório" }),
  principal: z.boolean().default(false),
  tipo: z.string().default("comercial"),
});

export const usuarioSchema = z.object({
  nome: z.string().min(1, { message: "Nome do usuário é obrigatório" }),
  email: z.string().email("Email inválido").min(1, { message: "Email é obrigatório" }),
  setor: z.string().min(1, { message: "Setor é obrigatório" }),
  perfil: z.string().min(1, { message: "Perfil de acesso é obrigatório" }),
  status: z.string().default("ativo"),
});

export const alterarSenhaSchema = z.object({
  senhaAtual: z.string().min(6, "Senha atual é obrigatória"),
  novaSenha: z.string()
    .min(8, "A nova senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "A senha deve conter pelo menos um caractere especial"),
  confirmarSenha: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.novaSenha === data.confirmarSenha, {
  path: ["confirmarSenha"],
  message: "As senhas não conferem",
});

type PerfilFormValues = z.infer<typeof perfilSchema>;
type EnderecoFormValues = z.infer<typeof enderecoSchema>;
type ContatoFormValues = z.infer<typeof contatoSchema>;
type UsuarioFormValues = z.infer<typeof usuarioSchema>;
type AlterarSenhaFormValues = z.infer<typeof alterarSenhaSchema>;

const CountdownTimer = () => {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    setCountdown(30 - (Math.floor(Date.now() / 1000) % 30));

    const timer = setInterval(() => {
      const newCountdown = 30 - (Math.floor(Date.now() / 1000) % 30);
      setCountdown(newCountdown);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center text-sm text-gray-500 mb-4">
      Atualiza em: {countdown}s
    </div>
  );
};

export default function MinhaContaPage() {
  if (isMobileDevice()) {
    return <MobileContaPage />;
  }

  const { user, logout } = useAuth();
  const { balance: creditBalance, formattedBalance, hasCredits, isLoading: isLoadingCredits, refetch: refetchCredits } = useCreditBalance();
  const { toast } = useToast();
  
  // Estados principais
  const [activeTab, setActiveTab] = useState("dados");
  const [isUploading, setIsUploading] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showHistoricoPagamentos, setShowHistoricoPagamentos] = useState(true);
  const [showHistoricoAssinaturas, setShowHistoricoAssinaturas] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddEndereco, setShowAddEndereco] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [show2FASection, setShow2FASection] = useState(false);
  const [showAddUsuario, setShowAddUsuario] = useState(false);
  
  // Estados para o PaymentModal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [periodoPlanos, setPeriodoPlanos] = useState<"mensal" | "anual">("anual");
  
  // Estados para dados WebSocket
  const [assinaturaData, setAssinaturaData] = useState<any>(null);
  const [perfilData, setPerfilData] = useState<any>(null);
  const [enderecosData, setEnderecosData] = useState<any[]>([]);
  const [contatosData, setContatosData] = useState<any[]>([]);
  const [usuariosData, setUsuariosData] = useState<any[]>([]);
  const [historicoPagamentosData, setHistoricoPagamentosData] = useState<any[]>([]);
  
  // Estados de loading
  const [isLoadingAssinatura, setIsLoadingAssinatura] = useState(false);
  const [isLoadingPerfil, setIsLoadingPerfil] = useState(false);
  const [isLoadingEnderecos, setIsLoadingEnderecos] = useState(false);
  const [isLoadingContatos, setIsLoadingContatos] = useState(false);
  const [isLoadingUsuarios, setIsLoadingUsuarios] = useState(false);
  const [isLoadingHistoricoPagamentos, setIsLoadingHistoricoPagamentos] = useState(false);
  
  // Estados para sessões
  const [sessoes, setSessoes] = useState<any[]>([]);
  const [carregandoSessoes, setCarregandoSessoes] = useState(false);
  const [erroSessoes, setErroSessoes] = useState<string | null>(null);
  const [sessoesCarregadas, setSessoesCarregadas] = useState(false);
  
  // Estados para 2FA
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [qrCode2FA, setQrCode2FA] = useState<string | null>(null);
  const [secret2FA, setSecret2FA] = useState<string | null>(null);
  const [erro2FA, setErro2FA] = useState<string | null>(null);
  const [carregando2FA, setCarregando2FA] = useState(false);

  // Formulários
  const perfilForm = useForm<PerfilFormValues>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      logoUrl: "",
      primeiroNome: "",
      ultimoNome: "",
      razaoSocial: "",
      nomeFantasia: "",
      tipoPessoa: "fisica",
      cpfCnpj: "",
      inscricaoEstadual: "",
      inscricaoMunicipal: "",
      cnae: "",
      regimeTributario: "", 
      atividadePrincipal: "",
      responsavelNome: "",
      responsavelEmail: "",
      responsavelTelefone: "",
      responsavelSetor: "Administrativa",
      contadorNome: "",
      contadorEmail: "",
      contadorTelefone: "",
    },
    mode: "onSubmit",
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
  
  const contatoForm = useForm<ContatoFormValues>({
    resolver: zodResolver(contatoSchema),
    defaultValues: {
      nome: "",
      setor: "comercial",
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
      setor: "comercial",
      perfil: "usuario",
      status: "ativo"
    },
    mode: "onChange",
  });

  // Funções de fetch com WebSocket
  const fetchAssinatura = async () => {
    setIsLoadingAssinatura(true);
    try {
      const response = await fetch('/api/minha-assinatura', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setAssinaturaData(data);
      }
    } catch (error) {
      console.error('Erro ao buscar assinatura:', error);
    } finally {
      setIsLoadingAssinatura(false);
    }
  };

  const fetchPerfil = async () => {
    setIsLoadingPerfil(true);
    try {
      const response = await fetch('/api/minha-conta/perfil', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setPerfilData(data);
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setIsLoadingPerfil(false);
    }
  };

  const fetchEnderecos = async () => {
    setIsLoadingEnderecos(true);
    try {
      const response = await fetch('/api/enderecos', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setEnderecosData(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Erro ao buscar endereços:', error);
    } finally {
      setIsLoadingEnderecos(false);
    }
  };

  const fetchContatos = async () => {
    setIsLoadingContatos(true);
    try {
      const response = await fetch('/api/contatos', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setContatosData(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
    } finally {
      setIsLoadingContatos(false);
    }
  };

  const fetchUsuarios = async () => {
    setIsLoadingUsuarios(true);
    try {
      const response = await fetch('/api/usuarios', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setUsuariosData(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setIsLoadingUsuarios(false);
    }
  };

  const fetchHistoricoPagamentos = async () => {
    setIsLoadingHistoricoPagamentos(true);
    try {
      const response = await fetch('/api/historico-pagamentos', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setHistoricoPagamentosData(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Erro ao buscar histórico de pagamentos:', error);
    } finally {
      setIsLoadingHistoricoPagamentos(false);
    }
  };

  const fetchSessoes = async () => {
    setCarregandoSessoes(true);
    setErroSessoes(null);
    
    try {
      const isAdditionalUser = user?.isAdditionalUser || false;
      const endpoint = isAdditionalUser ? '/api/conta/sessoes-adicional' : '/api/conta/sessoes';
      
      const response = await fetch(endpoint, {
        method: "GET",
        credentials: "include",
        cache: "no-cache",
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar sessões: ${response.status}`);
      }
      
      const data = await response.json();
      setSessoes(data);
      setSessoesCarregadas(true);
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
      setErroSessoes('Não foi possível carregar suas sessões ativas. Tente novamente mais tarde.');
    } finally {
      setCarregandoSessoes(false);
    }
  };

  // Atualizar o formulário quando os dados forem carregados
  useEffect(() => {
    if (perfilData) {
      const displayPerfil = Array.isArray(perfilData) ? perfilData[0] : perfilData;
      perfilForm.reset({
        logoUrl: displayPerfil.logoUrl || "",
        primeiroNome: displayPerfil.primeiroNome || "",
        ultimoNome: displayPerfil.ultimoNome || "",
        razaoSocial: displayPerfil.razaoSocial || "",
        nomeFantasia: displayPerfil.nomeFantasia || "",
        tipoPessoa: displayPerfil.tipoPessoa || "fisica",
        cpfCnpj: displayPerfil.cpfCnpj || "",
        inscricaoEstadual: displayPerfil.inscricaoEstadual || "",
        inscricaoMunicipal: displayPerfil.inscricaoMunicipal || "",
        cnae: displayPerfil.cnae || "",
        regimeTributario: displayPerfil.regimeTributario || "",
        atividadePrincipal: displayPerfil.atividadePrincipal || "",
        responsavelNome: displayPerfil.responsavelNome || "",
        responsavelEmail: displayPerfil.responsavelEmail || "",
        responsavelTelefone: displayPerfil.responsavelTelefone || "",
        responsavelSetor: displayPerfil.responsavelSetor || "Administrativa",
        contadorNome: displayPerfil.contadorNome || "",
        contadorEmail: displayPerfil.contadorEmail || "",
        contadorTelefone: displayPerfil.contadorTelefone || "",
      });
    }
  }, [perfilData, perfilForm]);

  // Carregar dados iniciais
  useEffect(() => {
    if (user?.id) {
      fetchAssinatura();
      fetchPerfil();
      fetchEnderecos();
      fetchContatos();
      fetchUsuarios();
      fetchHistoricoPagamentos();
    }
  }, [user?.id]);

  // UseEffect para carregar sessões apenas quando a aba de segurança for ativada
  useEffect(() => {
    if (activeTab === 'seguranca' && user?.id && !sessoesCarregadas && !carregandoSessoes) {
      fetchSessoes();
    }
  }, [activeTab, user?.id, sessoesCarregadas, carregandoSessoes]);

  // Efeito para resetar os formulários quando trocar de aba
  useEffect(() => {
    if (activeTab !== 'contatos') {
      setShowAddContact(false);
    }
    
    if (activeTab !== 'enderecos') {
      setShowAddEndereco(false);
    }
    
    if (activeTab === 'financeiro' && user?.id) {
      fetchAssinatura();
      fetchHistoricoPagamentos();
    } else if (activeTab !== 'financeiro') {
      setShowAddCard(false);
    }
  }, [activeTab, user?.id]);

  // Função para salvar os dados do perfil
  const handleSavePerfil = async (data: PerfilFormValues) => {
    try {
      const response = await fetch(`/api/minha-conta/perfil/${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (response.ok) {
        toast({
          title: "Dados atualizados com sucesso",
          description: "Suas informações pessoais foram salvas.",
        });
        fetchPerfil();
      } else {
        throw new Error('Erro ao salvar dados');
      }
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: "Erro ao salvar dados",
        description: error.message || "Ocorreu um erro ao salvar suas informações. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para fazer upload da logo
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Falha no upload');
      }

      const result = await response.json();
      
      perfilForm.setValue('logoUrl', result.logoUrl);
      
      toast({
        title: "Logo atualizada com sucesso",
        description: "Sua nova logo foi carregada.",
      });

      fetchPerfil();
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer upload da logo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Função para renovar assinatura
  const handleRenovarAssinatura = () => {
    const displayData = Array.isArray(assinaturaData) ? assinaturaData[0] : assinaturaData;
    
    if (displayData?.plano) {
      const planoAtual = {
        id: displayData.plano.id,
        nome: displayData.plano.nome,
        descricao: displayData.plano.descricao,
        valorMensal: displayData.plano.valorMensal,
        valorAnual: displayData.plano.valorAnual,
        valorAnualTotal: displayData.plano.valorAnualTotal,
        economiaAnual: displayData.plano.economiaAnual,
        limitesCadastro: displayData.plano.limitesCadastro || {
          produtos: 50,
          servicos: 50,
          categorias: 50,
          usuarios: 1
        }
      };
      
      setSelectedPlan(planoAtual);
      
      const tipoCobranca = displayData.assinatura?.tipoCobranca || 'mensal';
      setPeriodoPlanos(tipoCobranca === 'anual' ? 'anual' : 'mensal');
      
      setIsPaymentModalOpen(true);
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da sua assinatura. Tente recarregar a página.",
        variant: "destructive"
      });
    }
  };
  
  // Função chamada após o pagamento bem-sucedido
  const handlePaymentSuccess = () => {
    fetchAssinatura();
    
    toast({
      title: "Pagamento processado com sucesso!",
      description: "Sua assinatura foi renovada. Os dados serão atualizados automaticamente.",
      variant: "default"
    });
    
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('tab', newTab);
    window.history.pushState({}, '', newUrl.toString());
  };

  const displayData = Array.isArray(assinaturaData) ? assinaturaData[0] : assinaturaData;
  const displayPerfil = Array.isArray(perfilData) ? perfilData[0] : perfilData;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Minha Conta</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Gerencie suas informações pessoais e configurações da conta</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dados" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Dados
          </TabsTrigger>
          <TabsTrigger value="enderecos" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Endereços
          </TabsTrigger>
          <TabsTrigger value="contatos" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Contatos
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados Cadastrais</CardTitle>
              <CardDescription>
                Mantenha suas informações pessoais atualizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPerfil ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Form {...perfilForm}>
                  <form onSubmit={perfilForm.handleSubmit(handleSavePerfil)} className="space-y-6">
                    {/* Logo da empresa */}
                    <div className="space-y-2">
                      <FormLabel>Logo da Empresa</FormLabel>
                      <div className="flex items-center space-x-4">
                        <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                          {perfilForm.watch('logoUrl') ? (
                            <img 
                              src={perfilForm.watch('logoUrl')} 
                              alt="Logo" 
                              className="w-full h-full object-contain rounded-lg"
                            />
                          ) : (
                            <Building className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                            id="logo-upload"
                            disabled={isUploading}
                          />
                          <label htmlFor="logo-upload">
                            <Button 
                              type="button" 
                              variant="outline" 
                              disabled={isUploading}
                              asChild
                            >
                              <span>
                                {isUploading ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Enviando...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Escolher arquivo
                                  </>
                                )}
                              </span>
                            </Button>
                          </label>
                          <p className="text-sm text-gray-500 mt-1">PNG, JPG até 2MB</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={perfilForm.control}
                        name="primeiroNome"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primeiro Nome *</FormLabel>
                            <FormControl>
                              <Input placeholder="Digite seu primeiro nome" {...field} />
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
                            <FormLabel>Último Nome *</FormLabel>
                            <FormControl>
                              <Input placeholder="Digite seu último nome" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={perfilForm.control}
                      name="tipoPessoa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Pessoa *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="fisica">Pessoa Física</SelectItem>
                              <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {perfilForm.watch('tipoPessoa') === 'juridica' && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={perfilForm.control}
                            name="razaoSocial"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Razão Social</FormLabel>
                                <FormControl>
                                  <Input placeholder="Digite a razão social" {...field} />
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
                                <FormLabel>Nome Fantasia</FormLabel>
                                <FormControl>
                                  <Input placeholder="Digite o nome fantasia" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    )}

                    <FormField
                      control={perfilForm.control}
                      name="cpfCnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{perfilForm.watch('tipoPessoa') === 'juridica' ? 'CNPJ' : 'CPF'} *</FormLabel>
                          <FormControl>
                            <InputMask
                              mask={perfilForm.watch('tipoPessoa') === 'juridica' ? "99.999.999/9999-99" : "999.999.999-99"}
                              value={field.value}
                              onChange={field.onChange}
                            >
                              {(inputProps: any) => (
                                <Input 
                                  {...inputProps} 
                                  placeholder={perfilForm.watch('tipoPessoa') === 'juridica' ? "00.000.000/0000-00" : "000.000.000-00"} 
                                />
                              )}
                            </InputMask>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Seção do Responsável */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Dados do Responsável</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={perfilForm.control}
                          name="responsavelNome"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome do Responsável *</FormLabel>
                              <FormControl>
                                <Input placeholder="Digite o nome do responsável" {...field} />
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
                              <FormLabel>Email do Responsável *</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="Digite o email do responsável" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={perfilForm.control}
                          name="responsavelTelefone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone do Responsável *</FormLabel>
                              <FormControl>
                                <InputMask
                                  mask="(99) 99999-9999"
                                  value={field.value}
                                  onChange={field.onChange}
                                >
                                  {(inputProps: any) => (
                                    <Input {...inputProps} placeholder="(00) 00000-0000" />
                                  )}
                                </InputMask>
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
                              <FormLabel>Setor</FormLabel>
                              <FormControl>
                                <Input placeholder="Digite o setor" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={perfilForm.formState.isSubmitting}>
                        {perfilForm.formState.isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Dados
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enderecos">
          <Card>
            <CardHeader>
              <CardTitle>Endereços</CardTitle>
              <CardDescription>Gerencie os endereços cadastrados</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingEnderecos ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-gray-600">
                      {enderecosData.length} endereço(s) cadastrado(s)
                    </p>
                    <Button onClick={() => setShowAddEndereco(true)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Adicionar Endereço
                    </Button>
                  </div>

                  {enderecosData.length === 0 ? (
                    <div className="text-center py-8">
                      <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">Nenhum endereço cadastrado</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {enderecosData.map((endereco: any, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">
                                  {endereco.logradouro}, {endereco.numero}
                                  {endereco.complemento && ` - ${endereco.complemento}`}
                                </p>
                                <p className="text-gray-600">
                                  {endereco.bairro}, {endereco.cidade} - {endereco.estado}
                                </p>
                                <p className="text-gray-600">CEP: {endereco.cep}</p>
                                {endereco.principal && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                    Principal
                                  </span>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm">
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contatos">
          <Card>
            <CardHeader>
              <CardTitle>Contatos</CardTitle>
              <CardDescription>Gerencie os contatos da empresa</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingContatos ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-gray-600">
                      {contatosData.length} contato(s) cadastrado(s)
                    </p>
                    <Button onClick={() => setShowAddContact(true)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Adicionar Contato
                    </Button>
                  </div>

                  {contatosData.length === 0 ? (
                    <div className="text-center py-8">
                      <Phone className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">Nenhum contato cadastrado</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {contatosData.map((contato: any, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{contato.nome}</p>
                                <p className="text-gray-600">{contato.cargo} - {contato.setor}</p>
                                <div className="mt-2 space-y-1">
                                  <p className="text-sm text-gray-600">
                                    <Phone className="h-4 w-4 inline mr-1" />
                                    {contato.telefone}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    <Mail className="h-4 w-4 inline mr-1" />
                                    {contato.email}
                                  </p>
                                </div>
                                {contato.principal && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 mt-2">
                                    Principal
                                  </span>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm">
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios">
          <Card>
            <CardHeader>
              <CardTitle>Usuários</CardTitle>
              <CardDescription>Gerencie os usuários do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsuarios ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-gray-600">
                      {usuariosData.length} usuário(s) cadastrado(s)
                    </p>
                    <Button onClick={() => setShowAddUsuario(true)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Adicionar Usuário
                    </Button>
                  </div>

                  {usuariosData.length === 0 ? (
                    <div className="text-center py-8">
                      <UserCheck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">Nenhum usuário adicional cadastrado</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {usuariosData.map((usuario: any, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{usuario.nome}</p>
                                <p className="text-gray-600">{usuario.email}</p>
                                <div className="mt-2">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                    usuario.status === 'ativo' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {usuario.status}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 ml-2">
                                    {usuario.perfil}
                                  </span>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm">
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro">
          <Card>
            <CardHeader>
              <CardTitle>Informações Financeiras</CardTitle>
              <CardDescription>Acompanhe sua assinatura e histórico de pagamentos</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAssinatura ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : displayData ? (
                <div className="space-y-6">
                  {/* Informações da assinatura */}
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-blue-900">
                          {displayData.plano?.nome || 'Plano Básico'}
                        </h3>
                        <p className="text-blue-700 mt-1">
                          {displayData.plano?.descricao || 'Seu plano atual'}
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-blue-600">Valor Mensal</p>
                            <p className="text-lg font-bold text-blue-900">
                              R$ {displayData.plano?.valorMensal || '0,00'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-blue-600">Status</p>
                            <p className="text-lg font-bold text-green-600">Ativo</p>
                          </div>
                        </div>
                      </div>
                      <Button onClick={handleRenovarAssinatura} className="bg-blue-600 hover:bg-blue-700">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Renovar Assinatura
                      </Button>
                    </div>
                  </div>

                  {/* Saldo de créditos */}
                  {hasCredits && (
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-green-900">Saldo de Créditos</h3>
                          <p className="text-2xl font-bold text-green-700 mt-2">
                            {formattedBalance}
                          </p>
                        </div>
                        <Coins className="h-12 w-12 text-green-600" />
                      </div>
                    </div>
                  )}

                  {/* Histórico de pagamentos */}
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Histórico de Pagamentos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isLoadingHistoricoPagamentos ? (
                          <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <CountdownTimer />
                            <p className="text-gray-500 text-center">
                              Histórico de pagamentos será carregado aqui
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhuma assinatura encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca">
          <Card>
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>Gerencie a segurança da sua conta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Alterar senha */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Alterar Senha</h3>
                    <p className="text-sm text-gray-600">Mantenha sua senha segura</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Alterar Senha
                  </Button>
                </div>

                {/* Autenticação em dois fatores */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Autenticação em Dois Fatores</h3>
                    <p className="text-sm text-gray-600">
                      {is2FAEnabled ? 'Ativada' : 'Adicione uma camada extra de segurança'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShow2FASection(!show2FASection)}
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    {is2FAEnabled ? 'Gerenciar' : 'Ativar'} 2FA
                  </Button>
                </div>

                {/* Sessões ativas */}
                <div className="space-y-4">
                  <h3 className="font-medium">Sessões Ativas</h3>
                  {carregandoSessoes ? (
                    <div className="flex justify-center items-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : erroSessoes ? (
                    <p className="text-red-500 text-sm">{erroSessoes}</p>
                  ) : (
                    <div className="space-y-2">
                      {sessoes.length === 0 ? (
                        <p className="text-gray-500">Nenhuma sessão ativa encontrada</p>
                      ) : (
                        sessoes.map((sessao: any, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded">
                            <div>
                              <p className="font-medium">{sessao.userAgent || 'Navegador'}</p>
                              <p className="text-sm text-gray-600">
                                {sessao.ip} - {new Date(sessao.lastAccess).toLocaleString()}
                              </p>
                            </div>
                            <Button variant="outline" size="sm">
                              <LogOut className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de pagamento */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        plano={selectedPlan}
        periodoSelecionado={periodoPlanos}
        onPaymentSuccess={handlePaymentSuccess}
        isRenewal={true}
      />
    </div>
  );
}