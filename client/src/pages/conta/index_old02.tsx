import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isMobileDevice } from "@/lib/utils";
import MobileContaPage from "./mobile-conta";
import InputMask from "react-input-mask";
import websocketService from "@/services/websocketService";
import { changePasswordSchema, enable2FASchema, type ChangePasswordData, type UserSession } from "@shared/schema";
import { Loader2, Shield, User, LogOut, UserCheck, Settings, Key, Smartphone, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import PaymentModal from "@/components/planos/PaymentModal";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pagination } from '@/components/Pagination';
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

// Importações do Stripe
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

// Carrega o Stripe fora do componente de renderização
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Chave pública do Stripe não configurada (VITE_STRIPE_PUBLIC_KEY)');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Componente do formulário de pagamento do Stripe
function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // O Stripe.js ainda não carregou
      return;
    }

    setIsProcessing(true);

    // Confirma o pagamento com o Stripe.js
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Redirecionar para a página de sucesso após o pagamento
        return_url: `${window.location.origin}/financeiro/pagamento-sucesso`,
      },
    });

    if (error) {
      // Mostra mensagem de erro ao usuário
      toast({
        variant: "destructive",
        title: "Erro no pagamento",
        description: error.message || "Ocorreu um erro ao processar seu pagamento. Tente novamente.",
      });
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      <div className="p-4 bg-secondary/30 rounded-lg">
        <PaymentElement 
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
            }
          }}
        />
      </div>
      
      <div className="flex items-center space-x-2 pt-2">
        <Shield className="h-5 w-5 text-green-500" />
        <span className="text-sm text-muted-foreground">Seus dados de pagamento estão seguros e criptografados</span>
      </div>
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
      >
        {isProcessing ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Processando...
          </>
        ) : (
          'Confirmar pagamento'
        )}
      </Button>
    </form>
  );
}

// Componente de pagamento com Stripe
function StripePayment() {
  const [clientSecret, setClientSecret] = useState('');
  const { toast } = useToast();
  const planPrice = 87.90;
  
  useEffect(() => {
    // Cria o PaymentIntent assim que o componente carrega
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        amount: Math.round(planPrice * 100), // Converter para centavos
        description: 'Renovação Plano Profissional'
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Falha ao iniciar pagamento');
        }
        return res.json();
      })
      .then((data) => {
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        toast({
          variant: "destructive",
          title: "Erro ao iniciar pagamento",
          description: error.message || "Não foi possível iniciar o processo de pagamento. Tente novamente mais tarde.",
        });
      });
  }, [toast, planPrice]);

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as 'stripe',
      variables: {
        colorPrimary: '#6d28d9',
        colorBackground: '#ffffff',
        colorText: '#1e293b',
        colorDanger: '#ef4444',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        borderRadius: '8px',
      },
    },
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
        <div className="flex items-center mb-2">
          <CreditCardIcon className="h-5 w-5 text-purple-700 mr-2" />
          <h3 className="font-medium text-lg text-purple-800">Renovar Assinatura</h3>
        </div>
        <p className="text-sm text-gray-600">Realize o pagamento para renovar seu plano atual por mais um período</p>
      </div>
      
      <div className="grid md:grid-cols-5 gap-6">
        <div className="md:col-span-3">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle>Informações de pagamento</CardTitle>
              <CardDescription>Preencha os dados do seu cartão para realizar o pagamento</CardDescription>
            </CardHeader>
            <CardContent>
              {clientSecret ? (
                <Elements stripe={stripePromise} options={options}>
                  <CheckoutForm />
                </Elements>
              ) : (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle>Resumo do pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-700">Plano Profissional</span>
                    <span className="font-medium">R$ {planPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Período</span>
                    <span>Mensal</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span>R$ {planPrice.toFixed(2)}</span>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg mt-4">
                  <h4 className="font-medium text-sm mb-2">O que está incluído:</h4>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Acesso a todas as funcionalidades</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Até 3 usuários simultâneos</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Suporte por e-mail</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

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

import { apiRequest } from "@/lib/queryClient";
// Import dos componentes das abas
import ContatosTab from "@/components/conta/ContatosTab";
import EnderecosTab from "@/components/conta/EnderecosTab";
import { UsuariosTab } from "@/components/conta/UsuariosTab";
import { PaymentMethodsManager } from "@/components/conta/PaymentMethodsManager";
import SegurancaTab from "./seguranca-tab";
import { useCreditBalance } from "@/hooks/use-credit-balance";
import { QRCodeSVG } from 'qrcode.react';
import { 
  Camera, Save, Upload, ArrowLeft, 
  MapPin, CreditCard, FileText, Edit3,
  Building, Users, CheckCircle, CreditCard as CreditCardIcon,
  Download, Calendar, Badge, Landmark, BriefcaseBusiness, 
  UserCog, FileText as ReceiptIcon, Phone, Pencil, XCircle, Ban,
  PlusCircle, Check, X, Trash2, Mail, Home, Briefcase,
  AlertTriangle, RefreshCw, DollarSign, Coins, Gift
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

// Componente para exibir mensagens de erro
const FormErrorMessage = ({ message }: { message: string }) => (
  <p className="mt-1 text-red-300 text-xs flex items-center">
    <AlertTriangle className="w-3 h-3 mr-1" /> {message}
  </p>
);

// Esquema de validação para dados pessoais
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

  // Responsável
  responsavelNome: z.string().min(1, { message: "O nome do responsável é obrigatório" }),
  responsavelEmail: z.string().email("Email inválido").min(1, { message: "O email do responsável é obrigatório" }),
  responsavelTelefone: z.string().min(1, { message: "O telefone do responsável é obrigatório" }),
  responsavelSetor: z.string().optional(),

  // Contador
  contadorNome: z.string().optional(),
  contadorEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  contadorTelefone: z.string().optional(),
});

// Esquema de validação para endereço
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

// Esquema de validação para contatos
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

// Esquema de validação para usuários
export const usuarioSchema = z.object({
  nome: z.string().min(1, { message: "Nome do usuário é obrigatório" }),
  email: z.string().email("Email inválido").min(1, { message: "Email é obrigatório" }),
  setor: z.string().min(1, { message: "Setor é obrigatório" }),
  perfil: z.string().min(1, { message: "Perfil de acesso é obrigatório" }),
  status: z.string().default("ativo"),
});

// Schema para alteração de senha
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

// Schema para ativação de 2FA
export const ativar2FASchema = z.object({
  codigo: z.string().min(6, "Código é obrigatório").max(6, "Código deve ter 6 dígitos"),
  secret: z.string().min(1, "Secret é obrigatório")
});

type PerfilFormValues = z.infer<typeof perfilSchema>;
type EnderecoFormValues = z.infer<typeof enderecoSchema>;
type ContatoFormValues = z.infer<typeof contatoSchema>;
type UsuarioFormValues = z.infer<typeof usuarioSchema>;
type AlterarSenhaFormValues = z.infer<typeof alterarSenhaSchema>;
type Ativar2FAFormValues = z.infer<typeof ativar2FASchema>;

export default function MinhaContaPage() {
  // Verifica se o dispositivo é mobile e renderiza o componente apropriado
  if (isMobileDevice()) {
    return <MobileContaPage />;
  }

  // Continua com a versão desktop
  const { user, logout } = useAuth();
  const userId = user?.id || parseInt(localStorage.getItem('userId') || '0');
  const { balance: creditBalance, formattedBalance, hasCredits, isLoading: isLoadingCredits, refetch: refetchCredits } = useCreditBalance();
  
  // Guardar o ID do usuário no localStorage para persistir entre reloads
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem('userId', user.id.toString());
      console.log("Obtendo ID do usuário do localStorage:", user.id);
    }
  }, [user?.id]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Função para obter a aba ativa a partir dos parâmetros da URL
  const getActiveTabFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['dados', 'enderecos', 'contatos', 'usuarios', 'financeiro', 'seguranca'].includes(tab)) {
      return tab;
    }
    return "dados"; // Aba padrão
  };
  
  const [activeTab, setActiveTab] = useState(getActiveTabFromURL());
  const [isUploading, setIsUploading] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showHistoricoPagamentos, setShowHistoricoPagamentos] = useState(true); // Padrão ativo
  const [showHistoricoAssinaturas, setShowHistoricoAssinaturas] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddEndereco, setShowAddEndereco] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [show2FASection, setShow2FASection] = useState(false);
  
  // Estados para o PaymentModal (popup de planos)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [periodoPlanos, setPeriodoPlanos] = useState<"mensal" | "anual">("anual");
  
  // Função para abrir o popup de planos (renovação)
  const handleRenovarAssinatura = () => {
    // Para renovação, carregar o plano atual da assinatura
    if (displayData?.plano) {
      // Usar os dados do plano atual para renovação
      const planoAtual = {
        id: displayData.plano.id,
        nome: displayData.plano.nome,
        descricao: displayData.plano.descricao,
        valorMensal: displayData.plano.valorMensal,
        valorAnual: displayData.plano.valorAnual,
        valorAnualTotal: displayData.plano.valorAnualTotal,
        economiaAnual: displayData.plano.economiaAnual,
        limitesCadastro: displayData.plano.limitesCadastro || {
          produtos: displayData.plano.limiteProdutos || 50,
          servicos: 50,
          categorias: 50,
          usuarios: displayData.plano.limiteUsuarios || 1
        }
      };
      
      setSelectedPlan(planoAtual);
      
      // Definir período baseado na assinatura atual
      const tipoCobranca = displayData.assinatura?.tipoCobranca || 'mensal';
      setPeriodoPlanos(tipoCobranca === 'anual' ? 'anual' : 'mensal');
      
      setIsPaymentModalOpen(true);
    } else {
      // Se não conseguir carregar o plano atual, mostrar erro
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da sua assinatura. Tente recarregar a página.",
        variant: "destructive"
      });
    }
  };
  
  // Função chamada após o pagamento bem-sucedido
  const handlePaymentSuccess = () => {
    queryClient.refetchQueries({ queryKey: ['/api/minha-assinatura'] });
    
    toast({
      title: "Pagamento processado com sucesso!",
      description: "Sua assinatura foi renovada. Os dados serão atualizados automaticamente.",
      variant: "default"
    });
    
    // Recarregar a página para garantir atualização dos dados
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };
  
  // Estados para paginação do histórico de pagamentos
  const [currentPagePagamentos, setCurrentPagePagamentos] = useState(1);
  const [itemsPerPagePagamentos, setItemsPerPagePagamentos] = useState(6);
  
  // Estados para paginação do histórico de assinaturas
  const [currentPageAssinaturas, setCurrentPageAssinaturas] = useState(1);
  const [itemsPerPageAssinaturas, setItemsPerPageAssinaturas] = useState(6);
  
  // Efeito para resetar os formulários quando trocar de aba
  useEffect(() => {
    // REMOVIDO: Não fechar formulários automaticamente ao mudar de aba
    // O usuário deve poder navegar entre abas sem perder dados inseridos
    // if (activeTab !== 'seguranca') {
    //   setShowPasswordSection(false);
    //   setShow2FASection(false);
    // }
    
    // Fechar formulários de outras abas ao mudar
    if (activeTab !== 'contatos') {
      setShowAddContact(false);
    }
    
    if (activeTab !== 'enderecos') {
      setShowAddEndereco(false);
    }
    
    // Ao entrar na aba financeira, recarregar os dados da assinatura
    if (activeTab === 'financeiro' && user?.id) {
      console.log("Aba financeira ativada: verificando assinatura para o usuário", user.id);
      
      // Aplicamos a mesma lógica ao mudar de aba: limpar dados e ativar preloader
      setFinalPlanoData(null);
      setIsReloadingAssinatura(true);
      setForceShowPreloader(true);
      
      // Resetar paginação quando entrar na aba financeira
      setCurrentPagePagamentos(1);
      setCurrentPageAssinaturas(1);
      
      // Refetch da assinatura para garantir dados atualizados
      refetchAssinatura();
    } else if (activeTab !== 'financeiro') {
      setShowAddCard(false);
    }
  }, [activeTab, user?.id, queryClient]);
  
  // Estados para alteração de senha
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [sucessoSenha, setSucessoSenha] = useState(false);
  const [carregandoSenha, setCarregandoSenha] = useState(false);
  const [camposSenhaValidados, setCamposSenhaValidados] = useState({
    senhaAtual: true,
    novaSenha: true,
    confirmarSenha: true,
    senhasIguais: true,
    confirmacaoCorreta: true
  });
  
  // Estados para autenticação de dois fatores
  const [codigo2FA, setCodigo2FA] = useState('');
  const [qrCode2FA, setQrCode2FA] = useState<string | null>(null);
  const [secret2FA, setSecret2FA] = useState<string | null>(null);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [erro2FA, setErro2FA] = useState<string | null>(null);
  const [sucesso2FA, setSucesso2FA] = useState(false);
  const [carregando2FA, setCarregando2FA] = useState(false);
  
  // Estados para sessões ativas
  const [sessoes, setSessoes] = useState<any[]>([]);
  const [carregandoSessoes, setCarregandoSessoes] = useState(false);
  const [sessoesCarregadas, setSessoesCarregadas] = useState(false);
  const [erroSessoes, setErroSessoes] = useState<string | null>(null);
  const [enderecos, setEnderecos] = useState<EnderecoFormValues[]>([]);
  const [contatos, setContatos] = useState<ContatoFormValues[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioFormValues[]>([]);
  const [editingEndereco, setEditingEndereco] = useState<EnderecoFormValues | null>(null);
  const [editingContato, setEditingContato] = useState<ContatoFormValues | null>(null);
  const [editingUsuario, setEditingUsuario] = useState<UsuarioFormValues | null>(null);
  const [showAddUsuario, setShowAddUsuario] = useState(false);
  
  // Gerenciamento de erros específicos dos campos
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Estado para validação dos campos do usuário
  const [camposUsuarioValidados, setCamposUsuarioValidados] = useState({
    nome: true,
    email: true,
    setor: true,
    perfil: true
  });
  
  // Estado para validação dos campos de perfil
  const [camposPerfilValidados, setCamposPerfilValidados] = useState({
    primeiroNome: true,
    ultimoNome: true,
    razaoSocial: true,
    tipoPessoa: true,
    cpfCnpj: true,
    responsavelNome: true,
    responsavelEmail: true,
    responsavelTelefone: true
  });

  // Usar um objeto vazio como defaultValues inicial
  // para que não haja conflito com os dados que serão carregados da API
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
    mode: "onChange", // Alterado para onChange para evitar a validação padrão do onSubmit
  });

  // UseEffect para carregar sessões apenas quando a aba de segurança for ativada
  useEffect(() => {
    if (activeTab === 'seguranca' && user?.id && !sessoesCarregadas && !carregandoSessoes) {
      console.log('🔄 Carregando sessões ao acessar aba segurança pela primeira vez');
      fetchSessoes();
    }
  }, [activeTab, user?.id, sessoesCarregadas, carregandoSessoes]);



  // Função auxiliar direta para buscar as sessões ativas
  async function fetchSessoes() {
    setCarregandoSessoes(true);
    setErroSessoes(null);
    
    try {
      // Determinar qual endpoint usar baseado no tipo de usuário
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
  }
  
  // Função para verificar o status do 2FA
  async function verificar2FAStatus() {
    try {
      console.log("Verificando status do 2FA");
      
      const response = await fetch('/api/conta/2fa/status', {
        method: "GET",
        credentials: "include",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao verificar status do 2FA: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Status do 2FA:", data);
      
      // Atualiza o estado com o status atual do 2FA
      setIs2FAEnabled(!!data.enabled);
      
      return data.enabled;
    } catch (error) {
      console.error('Erro ao verificar status do 2FA:', error);
      // Não mostrar toast para este erro, apenas log
      return false;
    }
  }
  
  // Função para encerrar uma sessão
  async function encerrarSessao(sessionId: string) {
    try {
      // Determinar qual endpoint usar baseado no tipo de usuário
      const isAdditionalUser = user?.isAdditionalUser || false;
      const endpoint = isAdditionalUser ? `/api/conta/sessoes-adicional/${sessionId}` : `/api/conta/sessoes/${sessionId}`;
      
      const response = await fetch(endpoint, {
        method: "DELETE",
        credentials: "include",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao encerrar sessão: ${response.status}`);
      }
      
      // Atualiza a lista de sessões após encerrar uma sessão
      fetchSessoes();
      
      toast({
        title: "Sessão encerrada",
        description: "A sessão foi encerrada com sucesso",
        variant: "default",
      });
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error);
      toast({
        title: "Erro ao encerrar sessão",
        description: "Não foi possível encerrar a sessão. Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  }
  
  // Formulário para alteração de senha
  const alterarSenhaForm = useForm<AlterarSenhaFormValues>({
    resolver: zodResolver(alterarSenhaSchema),
    defaultValues: {
      senhaAtual: '',
      novaSenha: '',
      confirmarSenha: ''
    }
  });

  // Função para alterar a senha
  async function alterarSenha(data: AlterarSenhaFormValues) {
    setErroSenha(null);
    setSucessoSenha(false);
    setCarregandoSenha(true);
    
    try {
      const response = await fetch('/api/conta/alterar-senha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          senhaAtual: data.senhaAtual,
          novaSenha: data.novaSenha,
          confirmarSenha: data.confirmarSenha
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        setErroSenha(errorData.message || 'Erro ao alterar senha');
        
        toast({
          title: "Erro ao alterar senha",
          description: errorData.message || 'Não foi possível alterar a senha. Tente novamente.',
          variant: "destructive",
        });
        
        // NÃO lançar exceção - apenas retornar sem fechar o formulário
        return;
      }
      
      const responseData = await response.json();
      setSucessoSenha(true);
      alterarSenhaForm.reset();
      
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso. Você será redirecionado para fazer login novamente.",
        variant: "default",
      });
      
      // Salvar a última página/aba visitada no localStorage
      localStorage.setItem('lastVisitedTab', 'seguranca');
      
      // APENAS fechar o formulário quando for BEM-SUCEDIDO
      setTimeout(() => {
        setShowPasswordSection(false);
        setSucessoSenha(false);
        
        // Usar a mesma função de logout do botão "Sair"
        console.log('Executando logout após alteração de senha');
        logout();
      }, 3000);
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      setErroSenha(error instanceof Error ? error.message : 'Erro ao alterar senha');
      
      toast({
        title: "Erro ao alterar senha",
        description: error instanceof Error ? error.message : 'Não foi possível alterar a senha. Tente novamente.',
        variant: "destructive",
      });
      
      // IMPORTANTE: Em caso de erro, NÃO fechar o formulário
      // Manter setShowPasswordSection(true) ou não chamar setShowPasswordSection(false)
      // O formulário deve permanecer aberto para que o usuário possa corrigir os erros
    } finally {
      setCarregandoSenha(false);
    }
  }
  
  // Função para iniciar o processo de ativação do 2FA
  async function iniciar2FA() {
    setCarregando2FA(true);
    setErro2FA(null);
    
    try {
      // Mostrar o formulário de 2FA para prosseguir com o processo
      setShow2FASection(true);
      
      const response = await fetch('/api/conta/2fa/iniciar', {
        method: "POST",
        credentials: "include",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao iniciar 2FA: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Resposta da API de 2FA:", data); // Log para debug
      
      // Garantir que temos os dados corretos e armazená-los
      if (data.otpauthUrl && data.secret) {
        setQrCode2FA(data.otpauthUrl);
        setSecret2FA(data.secret);
        
        // Log adicional para debug
        console.log("QR Code URL definido:", data.otpauthUrl);
        console.log("Secret definido:", data.secret);
      } else {
        console.error("Dados inválidos recebidos da API:", data);
        throw new Error("Dados incompletos recebidos do servidor");
      }
    } catch (error) {
      console.error('Erro ao iniciar 2FA:', error);
      setErro2FA('Não foi possível iniciar a configuração do 2FA. Tente novamente mais tarde.');
    } finally {
      setCarregando2FA(false);
    }
  }
  
  // Função para verificar e ativar o 2FA - versão adaptada para o componente SegurancaTab
  async function ativar2FA(data: { codigo: string, secret: string }) {
    console.log("Ativando 2FA com dados:", data);
    
    if (!data.codigo) {
      setErro2FA('O código de verificação é obrigatório');
      return;
    }
    
    if (data.codigo.length !== 6) {
      setErro2FA('O código deve ter 6 dígitos');
      return;
    }
    
    setCarregando2FA(true);
    setErro2FA(null);
    
    try {
      // Verifique se temos o secret
      if (!data.secret) {
        console.error('Secret não informado para ativação do 2FA');
        throw new Error('Secret não informado para ativação do 2FA');
      }
      
      console.log("Enviando requisição para ativar 2FA com:", {
        codigo: data.codigo,
        secret: data.secret
      });
      
      const response = await fetch('/api/conta/2fa/ativar', {
        method: "POST",
        credentials: "include",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          codigo: data.codigo,
          secret: data.secret
        })
      });
      
      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.message || `Erro ao verificar código: ${response.status}`);
      }
      
      // Reseta os campos do 2FA
      setCodigo2FA('');
      setQrCode2FA(null);
      setSecret2FA(null);
      
      // Atualiza o estado do 2FA e verifica novamente o status
      console.log("2FA ativado com sucesso, verificando status atualizado");
      
      // Obtém o status atual do 2FA para garantir sincronia com o banco de dados
      const statusAtualizado = await verificar2FAStatus();
      console.log("Status 2FA após ativação:", statusAtualizado);
      
      // Atualiza a interface
      setIs2FAEnabled(true);
      setSucesso2FA(true);
      setShow2FASection(false);
      
      toast({
        title: "2FA ativado",
        description: "A autenticação em dois fatores foi ativada com sucesso",
        variant: "default",
      });
    } catch (error: any) {
      console.error('Erro ao verificar código 2FA:', error);
      setErro2FA(error.message || 'Código inválido ou expirado. Tente novamente.');
    } finally {
      setCarregando2FA(false);
    }
  }
  
  // Função para desativar o 2FA
  async function desativar2FA() {
    setCarregando2FA(true);
    setErro2FA(null);
    
    try {
      console.log("Enviando requisição para desativar 2FA");
      
      const response = await fetch('/api/conta/2fa/desativar', {
        method: "POST",
        credentials: "include",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao desativar 2FA: ${response.status}`);
      }
      
      // Verifica o status atualizado do 2FA após a desativação
      console.log("2FA desativado com sucesso, verificando status atualizado");
      
      // Obtém o status atual do 2FA para garantir sincronia com o banco de dados
      const statusAtualizado = await verificar2FAStatus();
      console.log("Status 2FA após desativação:", statusAtualizado);
      
      // Atualiza o estado do 2FA
      setIs2FAEnabled(false);
      
      toast({
        title: "2FA desativado",
        description: "A autenticação em dois fatores foi desativada com sucesso",
        variant: "default",
      });
    } catch (error) {
      console.error('Erro ao desativar 2FA:', error);
      setErro2FA('Não foi possível desativar o 2FA. Tente novamente mais tarde.');
    } finally {
      setCarregando2FA(false);
    }
  }
  
  // Função auxiliar direta para buscar os dados do perfil
  async function fetchPerfilData(userId: number) {
    console.log("Chamando diretamente fetchPerfilData para userId:", userId);
    
    const response = await fetch(`/api/minha-conta/perfil?userId=${userId}`, {
      method: "GET",
      credentials: "include",
      cache: "no-cache",
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar perfil: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Dados do perfil obtidos diretamente:", data);
    return data;
  }

  // Fetch user profile data with retry and silently handle errors
  const { data: perfilData, isLoading: isLoadingPerfil, error: perfilError, refetch: refetchPerfil } = useQuery({
    queryKey: ["/api/minha-conta/perfil", userId], // Usar o userId que pode vir do localStorage
    queryFn: async ({ queryKey }) => {
      try {
        const userId = queryKey[1] as number;
        
        if (!userId) {
          console.error("ID do usuário não fornecido para busca de perfil");
          return null;
        }
        
        console.log("Buscando dados do perfil para usuário:", userId);
        return await fetchPerfilData(userId);
      } catch (error) {
        console.error("Erro ao buscar dados do perfil:", error);
        throw error; // Propagar erro para que o React Query tente novamente
      }
    },
    enabled: !!userId, // Somente habilitado quando temos um userId
    retry: 3,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    staleTime: 10000, // 10 segundos
    // Importante: Não transformar ou filtrar os dados aqui, retornar exatamente o que a API retorna
  });

  // Referenciar serviço WebSocket (já importado no início do arquivo)
    
  // Mutation para atualizar dados do perfil
  const updatePerfilMutation = useMutation({
    mutationFn: async (data: PerfilFormValues) => {
      // Usar o fetch diretamente para ter controle sobre a resposta
      const res = await fetch(`/api/minha-conta/perfil/${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error(`Erro ao atualizar perfil: ${res.status}`);
      }

      try {
        // Tentar obter a resposta como JSON
        return await res.json();
      } catch (error) {
        // Se não for JSON, retornar um objeto simples
        return { 
          success: true, 
          message: "Perfil atualizado com sucesso",
          data: data
        };
      }
    },
    onSuccess: (updatedData) => {
      toast({
        title: "Perfil atualizado",
        description: "Seus dados foram atualizados com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      
      // Invalidar cache local
      queryClient.invalidateQueries({ queryKey: ["/api/minha-conta/perfil"] });
      
      // Notificar outros clientes via WebSocket
      if (websocketService) {
        websocketService.notify('perfil', 'update', updatedData, user?.id);
      }
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
  // Mutation para criar um novo endereço
  const createEnderecoMutation = useMutation({
    mutationFn: async (data: EnderecoFormValues) => {
      const payload = {
        ...data,
        userId: user?.id
      };
      // A função apiRequest já retorna o objeto JSON processado
      return await apiRequest("POST", `/api/enderecos`, payload);
    },
    onSuccess: (newEndereco) => {
      toast({
        title: "Endereço adicionado",
        description: "O endereço foi adicionado com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/enderecos", user?.id] });
      
      // Notificar outros clientes via WebSocket
      if (websocketService) {
        websocketService.notify('enderecos', 'create', newEndereco, user?.id);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar endereço",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para atualizar um endereço existente
  const updateEnderecoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: EnderecoFormValues }) => {
      // Usar o fetch diretamente para ter controle sobre a resposta
      const res = await fetch(`/api/enderecos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Endereço não encontrado");
        }
        throw new Error(`Erro ao atualizar endereço: ${res.status}`);
      }

      try {
        // Tentar obter a resposta como JSON
        return await res.json();
      } catch (error) {
        // Se não for JSON, retornar um objeto simples
        return { 
          success: true, 
          message: "Endereço atualizado com sucesso",
          data: data
        };
      }
    },
    onSuccess: (updatedEndereco) => {
      toast({
        title: "Endereço atualizado",
        description: "O endereço foi atualizado com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/enderecos", user?.id] });
      
      // Notificar outros clientes via WebSocket
      if (websocketService) {
        websocketService.notify('enderecos', 'update', updatedEndereco, user?.id);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar endereço",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para excluir um endereço
  const deleteEnderecoMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/enderecos/${id}`, {});
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Endereço não encontrado");
        }
        const jsonResponse = await res.json().catch(() => ({}));
        throw new Error(jsonResponse.message || "Erro desconhecido ao excluir endereço");
      }
      return res.json();
    },
    onSuccess: (deletedData) => {
      toast({
        title: "Endereço excluído",
        description: "O endereço foi excluído com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/enderecos", user?.id] });
      
      // Notificar outros clientes via WebSocket
      if (websocketService) {
        websocketService.notify('enderecos', 'delete', { id: deletedData?.id }, user?.id);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir endereço",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para definir um endereço como principal
  const setEnderecoPrincipalMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/enderecos/${id}/principal`, {});
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Endereço não encontrado");
        }
        const jsonResponse = await res.json().catch(() => ({}));
        throw new Error(jsonResponse.message || "Erro desconhecido ao definir endereço como principal");
      }
      return res.json();
    },
    onSuccess: (principalData) => {
      queryClient.invalidateQueries({ queryKey: ["/api/enderecos", user?.id] });
      toast({
        title: "Endereço principal atualizado",
        description: "O endereço foi definido como principal com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      
      // Notificar outros clientes via WebSocket
      if (websocketService) {
        websocketService.notify('enderecos', 'update', principalData, user?.id);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao definir endereço principal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para criar um novo contato
  const createContatoMutation = useMutation({
    mutationFn: async (data: ContatoFormValues) => {
      const payload = {
        ...data,
        userId: user?.id
      };
      const res = await apiRequest("POST", `/api/contatos`, payload);
      return res.json();
    },
    onSuccess: (newContato) => {
      toast({
        title: "Contato adicionado",
        description: "O contato foi adicionado com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contatos", user?.id] });
      
      // Notificar outros clientes via WebSocket
      if (websocketService) {
        websocketService.notify('contatos', 'create', newContato, user?.id);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para atualizar um contato existente
  const updateContatoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: ContatoFormValues }) => {
      const res = await apiRequest("PUT", `/api/contatos/${id}`, data);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Contato não encontrado");
        }
        const jsonResponse = await res.json().catch(() => ({}));
        throw new Error(jsonResponse.message || "Erro desconhecido ao atualizar contato");
      }
      return res.json();
    },
    onSuccess: (updatedContato) => {
      toast({
        title: "Contato atualizado",
        description: "O contato foi atualizado com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contatos", user?.id] });
      
      // Notificar outros clientes via WebSocket
      if (websocketService) {
        websocketService.notify('contatos', 'update', updatedContato, user?.id);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para excluir um contato
  const deleteContatoMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/contatos/${id}`, {});
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Contato não encontrado");
        }
        const jsonResponse = await res.json().catch(() => ({}));
        throw new Error(jsonResponse.message || "Erro desconhecido ao excluir contato");
      }
      return res.json();
    },
    onSuccess: (deletedData) => {
      toast({
        title: "Contato excluído",
        description: "O contato foi excluído com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contatos", user?.id] });
      
      // Notificar outros clientes via WebSocket
      if (websocketService) {
        websocketService.notify('contatos', 'delete', { id: deletedData?.id }, user?.id);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para definir um contato como principal
  const setContatoPrincipalMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/contatos/${id}/principal`, {});
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Contato não encontrado");
        }
        const jsonResponse = await res.json().catch(() => ({}));
        throw new Error(jsonResponse.message || "Erro desconhecido ao definir contato como principal");
      }
      return res.json();
    },
    onSuccess: (principalData) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contatos", user?.id] });
      toast({
        title: "Contato principal atualizado",
        description: "O contato foi definido como principal com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      
      // Notificar outros clientes via WebSocket
      if (websocketService) {
        websocketService.notify('contatos', 'update', principalData, user?.id);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao definir contato principal",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para criar um novo usuário adicional
  const createUsuarioMutation = useMutation({
    mutationFn: async (data: UsuarioFormValues) => {
      const payload = {
        ...data,
        userId: user?.id
      };
      const res = await apiRequest("POST", `/api/usuarios-adicionais`, payload);
      return res.json();
    },
    onSuccess: (newUsuario) => {
      toast({
        title: "Usuário adicionado",
        description: "O usuário foi adicionado com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/usuarios-adicionais", user?.id] });
      
      // Notificar outros clientes via WebSocket
      if (websocketService) {
        websocketService.notify('usuarios_adicionais', 'create', newUsuario, user?.id);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para atualizar um usuário adicional existente
  const updateUsuarioMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: UsuarioFormValues }) => {
      const res = await apiRequest("PUT", `/api/usuarios-adicionais/${id}`, data);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Usuário não encontrado");
        }
        const jsonResponse = await res.json().catch(() => ({}));
        throw new Error(jsonResponse.message || "Erro desconhecido ao atualizar usuário");
      }
      return res.json();
    },
    onSuccess: (updatedUsuario) => {
      toast({
        title: "Usuário atualizado",
        description: "O usuário foi atualizado com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/usuarios-adicionais", user?.id] });
      
      // Notificar outros clientes via WebSocket
      if (websocketService) {
        websocketService.notify('usuarios_adicionais', 'update', updatedUsuario, user?.id);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para excluir um usuário adicional
  const deleteUsuarioMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/usuarios-adicionais/${id}`, {});
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Usuário não encontrado");
        }
        const jsonResponse = await res.json().catch(() => ({}));
        throw new Error(jsonResponse.message || "Erro desconhecido ao excluir usuário");
      }
      return res.json();
    },
    onSuccess: (deletedData) => {
      toast({
        title: "Usuário excluído",
        description: "O usuário foi excluído com sucesso",
        variant: "default",
        className: "bg-white border-gray-200",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/usuarios-adicionais", user?.id] });
      
      // Notificar outros clientes via WebSocket
      if (websocketService) {
        websocketService.notify('usuarios_adicionais', 'delete', { id: deletedData?.id }, user?.id);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir usuário",
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
    const novaAba = getActiveTabFromURL();
    setActiveTab(novaAba);
    
    // Verificar o status do 2FA quando a página carregar
    if (user?.id) {
      console.log("Verificando status do 2FA ao carregar o componente");
      verificar2FAStatus();
    }
    
    // Ao mudar de aba, recarregue os dados do perfil para garantir que os campos estejam preenchidos
    if (user?.id) {
      refetchPerfil();
    }
    
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
  
  // Quando o componente montar, fazer uma busca direta por dados de perfil
  useEffect(() => {
    // Buscar dados diretamente se tivermos o ID do usuário
    const loadPerfilDiretamente = async () => {
      try {
        // Forçar o uso do ID do localStorage se disponível
        const idToUse = userId;
        
        if (!idToUse || idToUse <= 0) {
          console.error("ID do usuário inválido para busca direta:", idToUse);
          return;
        }
        
        console.log("Carregando perfil diretamente ao montar para userId:", idToUse);
        const dadosPerfil = await fetchPerfilData(idToUse);
        
        if (dadosPerfil) {
          console.log("Perfil carregado diretamente:", dadosPerfil);
          // Atualizar o formulário imediatamente
          await atualizarFormularioComDados(dadosPerfil);
        }
      } catch (error) {
        console.error("Erro ao carregar perfil diretamente:", error);
      }
    };
    
    // Executar imediatamente
    if (userId > 0) {
      loadPerfilDiretamente();
    }
  }, [userId]); // Dependência no userId (que inclui localStorage)
  
  // Função para atualizar o formulário com os dados recebidos
  const atualizarFormularioComDados = async (dadosPerfil: any) => {
    if (!dadosPerfil || typeof dadosPerfil !== 'object') {
      console.error("Dados de perfil inválidos:", dadosPerfil);
      return;
    }
    
    console.log("Atualizando formulário com dados:", dadosPerfil);
    
    try {
      // Função auxiliar para garantir valores string ou padrões
      const getPropSafely = (obj: any, prop: string, defaultValue: string = ""): string => {
        return obj && obj[prop] !== undefined && obj[prop] !== null ? String(obj[prop]) : defaultValue;
      };
      
      // Forçar a redefinição completa do formulário com os dados do backend
      const newValues = {
        logoUrl: getPropSafely(dadosPerfil, 'logoUrl'),
        primeiroNome: getPropSafely(dadosPerfil, 'primeiroNome'),
        ultimoNome: getPropSafely(dadosPerfil, 'ultimoNome'),
        razaoSocial: getPropSafely(dadosPerfil, 'razaoSocial'),
        nomeFantasia: getPropSafely(dadosPerfil, 'nomeFantasia'),
        tipoPessoa: getPropSafely(dadosPerfil, 'tipoPessoa', "fisica"),
        cpfCnpj: getPropSafely(dadosPerfil, 'cpfCnpj'),
        inscricaoEstadual: getPropSafely(dadosPerfil, 'inscricaoEstadual'),
        inscricaoMunicipal: getPropSafely(dadosPerfil, 'inscricaoMunicipal'),
        cnae: getPropSafely(dadosPerfil, 'cnae'),
        regimeTributario: getPropSafely(dadosPerfil, 'regimeTributario'),
        atividadePrincipal: getPropSafely(dadosPerfil, 'atividadePrincipal'),
        responsavelNome: getPropSafely(dadosPerfil, 'responsavelNome'),
        responsavelEmail: getPropSafely(dadosPerfil, 'responsavelEmail'),
        responsavelTelefone: getPropSafely(dadosPerfil, 'responsavelTelefone'),
        responsavelSetor: getPropSafely(dadosPerfil, 'responsavelSetor', "Administrativa"),
        contadorNome: getPropSafely(dadosPerfil, 'contadorNome'),
        contadorEmail: getPropSafely(dadosPerfil, 'contadorEmail'),
        contadorTelefone: getPropSafely(dadosPerfil, 'contadorTelefone'),
      };
      
      console.log("Valores para formulário:", newValues);
      
      // Resetar o formulário com os valores corretos
      await perfilForm.reset(newValues);
      
      // Forçar atualização de campos importantes
      perfilForm.setValue("tipoPessoa", getPropSafely(dadosPerfil, 'tipoPessoa', "fisica"));
      perfilForm.setValue("primeiroNome", getPropSafely(dadosPerfil, 'primeiroNome'));
      perfilForm.setValue("ultimoNome", getPropSafely(dadosPerfil, 'ultimoNome'));
      perfilForm.setValue("cpfCnpj", getPropSafely(dadosPerfil, 'cpfCnpj'));
      
      // Forçar recálculo/renderização de campos
      await perfilForm.trigger();
      
      console.log("Dados carregados no formulário com sucesso.");
      
      // Mostrar apenas uma notificação de dados carregados ao abrir a página
      // usando uma flag para evitar notificações repetidas
      if (!window.localStorage.getItem('notificacaoExibida')) {
        toast({
          title: "Dados carregados",
          description: "Seus dados de cadastro foram carregados com sucesso.",
          variant: "default",
          className: "bg-white border-gray-200",
        });
        // Definir a flag no localStorage para evitar mostrar novamente durante a sessão
        window.localStorage.setItem('notificacaoExibida', 'true');
        
        // Limpar a flag após 5 minutos para permitir que a notificação seja mostrada novamente
        // se o usuário recarregar a página depois de um tempo
        setTimeout(() => {
          window.localStorage.removeItem('notificacaoExibida');
        }, 5 * 60 * 1000);
      }
    } catch (error) {
      console.error("Erro ao atualizar formulário:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Ocorreu um erro ao carregar seus dados. Tente recarregar a página.",
        variant: "destructive",
      });
    }
  };
  
  // Atualiza o formulário quando os dados do perfil são carregados via React Query
  useEffect(() => {
    if (perfilData) {
      atualizarFormularioComDados(perfilData);
    } else {
      console.log("Não há dados de perfil para carregar, ou os dados estão vazios");
    }
  }, [perfilData]);
  
  // Query para buscar endereços - seguindo o padrão das outras abas
  const { 
    data: enderecosData, 
    isLoading: isLoadingEnderecos 
  } = useQuery({
    queryKey: ["/api/enderecos"],
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
  
  // Query para buscar contatos - seguindo o padrão das outras abas
  const { 
    data: contatosData, 
    isLoading: isLoadingContatos 
  } = useQuery({
    queryKey: ["/api/contatos"],
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
  
  // Query para buscar usuários adicionais - seguindo o padrão das outras abas
  const { 
    data: usuariosData, 
    isLoading: isLoadingUsuarios 
  } = useQuery({
    queryKey: ["/api/usuarios-adicionais"],
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

  // Query para buscar histórico de assinaturas - seguindo o padrão das outras abas
  const { 
    data: historicoAssinaturas, 
    isLoading: isLoadingHistoricoAssinaturas 
  } = useQuery({
    queryKey: ["/api/historico-assinaturas"],
    // Permitir sempre buscar dados quando a seção for exibida
    enabled: showHistoricoAssinaturas,
    // Configurações para permitir atualização ao trocar de aba
    staleTime: 0, // Considerar dados sempre obsoletos (permite refetch ao trocar de aba)
    gcTime: 60000, // Manter no cache por 1 minuto
    refetchOnWindowFocus: false, // Sem refetch no foco da janela
    refetchOnMount: true, // Permitir refetch na montagem do componente
    refetchOnReconnect: false, // Sem refetch na reconexão
    retry: false // Não tentar novamente em caso de falha
  });

  // Query para buscar histórico de pagamentos - seguindo o padrão das outras abas
  const { 
    data: historicoPagamentos, 
    isLoading: isLoadingHistoricoPagamentos, 
    refetch: refetchHistoricoPagamentos 
  } = useQuery({
    queryKey: ["/api/historico-pagamentos"],
    // Permitir sempre buscar dados quando a seção for exibida
    enabled: showHistoricoPagamentos,
    // Configurações para permitir atualização ao trocar de aba
    staleTime: 0, // Considerar dados sempre obsoletos (permite refetch ao trocar de aba)
    gcTime: 60000, // Manter no cache por 1 minuto
    refetchOnWindowFocus: false, // Sem refetch no foco da janela
    refetchOnMount: true, // Permitir refetch na montagem do componente
    refetchOnReconnect: false, // Sem refetch na reconexão
    retry: false // Não tentar novamente em caso de falha
  });

  // Efeito para buscar dados quando o histórico for exibido
  useEffect(() => {
    if (showHistoricoPagamentos && user?.id) {
      console.log('🔄 Forçando busca de histórico de pagamentos...');
      refetchHistoricoPagamentos();
    }
  }, [showHistoricoPagamentos, user?.id, refetchHistoricoPagamentos]);
  
  // Interface para tipagem dos dados da assinatura
  interface AssinaturaResponse {
    temAssinatura: boolean;
    loggedIn: boolean;
    plano?: {
      id: number;
      nome: string;
      descricao: string;
      valorMensal: string;
      valorAnual: string;
      valorAnualTotal: string;
      economiaAnual: string;
      limitesCadastro: {
        produtos: string | number;
        servicos: string | number;
        categorias: string | number;
        usuarios: string | number;
      };
    } | null;
    estatisticas?: {
      produtosCadastrados: number;
      servicosCadastrados: number;
      categoriasCadastradas: number;
      usuariosCadastrados: number;
    };
    assinatura?: {
      id: number;
      userId: number;
      planoId: number;
      dataInicio: string;
      dataFim: string | null;
      statusPagamento: string;
      dataProximaCobranca: string;
      tipoCobranca: string;
      valorPago: string;
    };
    user?: {
      id: number;
      username: string;
    };
  }
  
  // Estado para controlar manualmente o estado de carregamento ao trocar de aba
  const [isReloadingAssinatura, setIsReloadingAssinatura] = useState(false);
  
  // Estado para armazenar dados finalizados após um recarregamento completo
  const [finalPlanoData, setFinalPlanoData] = useState<AssinaturaResponse | null>(null);
  
  // Query para buscar assinatura - seguindo o padrão das outras abas
  const { 
    data: assinaturaData, 
    isLoading: isLoadingAssinaturaOriginal, 
    refetch: refetchAssinatura 
  } = useQuery<AssinaturaResponse>({
    queryKey: ["/api/minha-assinatura"],
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


  
  // Não precisamos mais de uma função para obter a data de próxima cobrança
  // Vamos deixar o código mais simples e usar diretamente o campo dataFim da tabela

  // Efeito para atualizar dados quando a query terminar com sucesso
  useEffect(() => {
    if (assinaturaData && !isReloadingAssinatura) {
      // Apenas atualiza os dados finais se o plano estiver realmente carregado
      if (assinaturaData.plano) {
        console.log("Atualizado dados no carregamento inicial:", assinaturaData.plano.nome);
        
        // Vamos garantir que a dataProximaCobranca esteja preenchida com a dataFim
        if (assinaturaData.assinatura && assinaturaData.assinatura.dataFim) {
          assinaturaData.assinatura.dataProximaCobranca = assinaturaData.assinatura.dataFim;
        }
        
        setFinalPlanoData(assinaturaData);
      } else {
        console.log("Recebidos dados incompletos no carregamento inicial (sem plano)");
        // Não atualiza dados finais, pois o plano não foi carregado corretamente
        // Em vez disso, agenda uma nova tentativa
        const timer = setTimeout(() => {
          refetchAssinatura();
        }, 500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [assinaturaData, isReloadingAssinatura, refetchAssinatura]);
  
  // Para garantir que o preloader seja exibido por tempo suficiente
  const [forceShowPreloader, setForceShowPreloader] = useState(false);
  
  // Efeito para gerenciar o estado de carregamento quando a query é finalizada
  useEffect(() => {
    // Verifica se a requisição terminou mas ainda estamos em modo de recarregamento
    if (!isLoadingAssinaturaOriginal && isReloadingAssinatura && assinaturaData) {
      // Verifica se o plano está presente nos dados da assinatura
      if (assinaturaData && assinaturaData.plano) {
        console.log("Atualizando dados finais após recarregamento:", assinaturaData.plano.nome);
        
        // Vamos garantir que a dataProximaCobranca esteja preenchida com a dataFim
        if (assinaturaData.assinatura && assinaturaData.assinatura.dataFim) {
          assinaturaData.assinatura.dataProximaCobranca = assinaturaData.assinatura.dataFim;
        }
        
        // Plano carregado corretamente, atualiza os dados finais
        setFinalPlanoData(assinaturaData);
        
        // Depois de atualizar os dados, remove os estados de carregamento
        setIsReloadingAssinatura(false);
        setForceShowPreloader(false);
      } else {
        // Se o plano não estiver presente, mantém o preloader e tenta novamente
        console.log("Dados recebidos sem plano, tentando novamente...");
        
        // Agenda nova tentativa após 500ms
        const timer = setTimeout(() => {
          refetchAssinatura();
        }, 500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isLoadingAssinaturaOriginal, isReloadingAssinatura, assinaturaData, refetchAssinatura]);
  
  // Combinando os estados de carregamento
  const isLoadingAssinatura = isLoadingAssinaturaOriginal || isReloadingAssinatura || forceShowPreloader;
  
  // Dados a serem usados na renderização - durante carregamento, não mostramos NENHUM dado
  // e quando o carregamento terminar, mostramos APENAS os dados finais atualizados
  const displayData = isLoadingAssinatura ? null : finalPlanoData;
  
  // Efeito para logs com finalidade de diagnóstico
  useEffect(() => {
    if (assinaturaData) {
      console.log("Dados da assinatura carregados com sucesso:", assinaturaData);
    }
  }, [assinaturaData]);
  
  // Já temos um useEffect para preencher o formulário mais acima no código
  // Não precisamos de dois useEffects fazendo a mesma coisa
  
  // Atualizar o estado local quando os dados de endereços forem carregados
  useEffect(() => {
    if (enderecosData && Array.isArray(enderecosData)) {
      console.log("Dados de endereços carregados:", enderecosData);
      setEnderecos(enderecosData);
    }
  }, [enderecosData]);
  
  // Atualizar o estado local quando os dados de contatos forem carregados
  useEffect(() => {
    if (contatosData && Array.isArray(contatosData)) {
      console.log("Dados de contatos carregados:", contatosData);
      setContatos(contatosData);
    }
  }, [contatosData]);
  
  // Atualizar o estado local quando os dados de usuários adicionais forem carregados
  useEffect(() => {
    if (usuariosData && Array.isArray(usuariosData)) {
      console.log("Dados de usuários adicionais carregados:", usuariosData);
      setUsuarios(usuariosData);
    }
  }, [usuariosData]);

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

  // Função para validar os campos do perfil
  const handleValidatePerfilForm = (): boolean => {
    const formValues = perfilForm.getValues();
    const isFisica = formValues.tipoPessoa === "fisica";
    const isJuridica = formValues.tipoPessoa === "juridica";
    
    // Validações específicas por tipo de pessoa
    const validacoes = {
      primeiroNome: isFisica ? formValues.primeiroNome.trim() !== '' : true,
      ultimoNome: isFisica ? formValues.ultimoNome.trim() !== '' : true,
      razaoSocial: isJuridica ? (formValues.razaoSocial || '').trim() !== '' : true,
      tipoPessoa: formValues.tipoPessoa.trim() !== '',
      cpfCnpj: formValues.cpfCnpj.trim() !== '',
      responsavelNome: formValues.responsavelNome.trim() !== '',
      responsavelEmail: isValidEmail(formValues.responsavelEmail),
      responsavelTelefone: formValues.responsavelTelefone.trim() !== ''
    };
    
    // Atualiza o estado de validação dos campos
    setCamposPerfilValidados(validacoes);
    
    // Verifica se há algum campo inválido
    const camposInvalidos = Object.entries(validacoes)
      .filter(([_, valido]) => !valido)
      .map(([campo, _]) => campo);
    
    // Se houver campos inválidos, exibe um toast com os erros
    if (camposInvalidos.length > 0) {
      const camposFormatados = camposInvalidos.map(campo => {
        switch(campo) {
          case 'primeiroNome': return 'Primeiro Nome';
          case 'ultimoNome': return 'Último Nome';
          case 'razaoSocial': return 'Razão Social';
          case 'tipoPessoa': return 'Tipo de Pessoa';
          case 'cpfCnpj': return isFisica ? 'CPF' : 'CNPJ';
          case 'responsavelNome': return 'Nome do Responsável';
          case 'responsavelEmail': return 'Email do Responsável (formato inválido)';
          case 'responsavelTelefone': return 'Telefone do Responsável';
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
  
  // Função para lidar com o evento onBlur dos campos de perfil
  const handlePerfilInputBlur = () => {
    const formValues = perfilForm.getValues();
    const isFisica = formValues.tipoPessoa === "fisica";
    const isJuridica = formValues.tipoPessoa === "juridica";
    
    // Atualize o estado de validação com base no tipo de pessoa, garantindo que valores undefined sejam tratados
    setCamposPerfilValidados({
      primeiroNome: isFisica ? (formValues.primeiroNome || '').trim() !== '' : true,
      ultimoNome: isFisica ? (formValues.ultimoNome || '').trim() !== '' : true, 
      razaoSocial: isJuridica ? (formValues.razaoSocial || '').trim() !== '' : true,
      tipoPessoa: (formValues.tipoPessoa || '').trim() !== '',
      cpfCnpj: (formValues.cpfCnpj || '').trim() !== '',
      responsavelNome: (formValues.responsavelNome || '').trim() !== '',
      responsavelEmail: isValidEmail(formValues.responsavelEmail || ''),
      responsavelTelefone: (formValues.responsavelTelefone || '').trim() !== ''
    });
  };

  // Função para salvar o formulário de perfil
  const handleSavePerfil = (formData: PerfilFormValues) => {
    try {
      console.log("Salvando dados do perfil:", formData);
      
      // Valida todos os campos antes de enviar
      if (handleValidatePerfilForm()) {
        // Se for pessoa física, garantir que o regime tributário seja nulo/vazio
        if (formData.tipoPessoa === "fisica") {
          formData.regimeTributario = "";
        }
        
        console.log("Dados validados, enviando para o backend:", formData);
        updatePerfilMutation.mutate(formData);
      }
    } catch (error: any) {
      console.error("Erro ao salvar perfil:", error);
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
      if (editingEndereco && (editingEndereco as any).id) {
        // Usar mutação para atualizar no banco de dados
        updateEnderecoMutation.mutate({ 
          id: (editingEndereco as any).id, 
          data: formData 
        });
        setEditingEndereco(null);
      } else {
        // Usar mutação para adicionar no banco de dados
        createEnderecoMutation.mutate(formData);
      }
      
      // Limpe o formulário
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
      
      // Feche o formulário de adição
      setShowAddEndereco(false);
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
      if ((endereco as any).id) {
        // Usar mutação para excluir do banco de dados
        deleteEnderecoMutation.mutate((endereco as any).id);
      } else {
        // Se o endereço ainda não tem ID (não foi salvo no banco), apenas remova localmente
        setEnderecos(prev => prev.filter(e => e !== endereco));
      }
    }
  };
  
  // Função para definir um endereço como principal
  const handleSetEnderecoPrincipal = (endereco: EnderecoFormValues) => {
    if ((endereco as any).id) {
      setEnderecoPrincipalMutation.mutate((endereco as any).id);
    }
  };
  
  // Função para verificar se o email é válido
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Função para adicionar um novo contato
  const handleAddContato = (formData: ContatoFormValues) => {
    try {
      // Verifica se o email é válido antes de salvar
      if (!isValidEmail(formData.email) && formData.email.trim() !== '') {
        toast({
          title: "Formato de e-mail inválido",
          description: "Por favor, verifique o formato do email inserido.",
          variant: "destructive",
        });
        return;
      }
      
      // Se estamos no modo edição, atualize o contato existente
      if (editingContato && (editingContato as any).id) {
        // Usar mutação para atualizar no banco de dados
        updateContatoMutation.mutate({ 
          id: (editingContato as any).id, 
          data: formData 
        });
        setEditingContato(null);
      } else {
        // Usar mutação para adicionar no banco de dados
        createContatoMutation.mutate(formData);
      }
      
      // Limpe o formulário
      contatoForm.reset({
        nome: "",
        setor: "comercial",
        telefone: "",
        celular: "",
        whatsapp: "",
        email: "",
        principal: false
      });
      
      // Feche o formulário de adição
      setShowAddContact(false);
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
      if ((contato as any).id) {
        // Usar mutação para excluir do banco de dados
        deleteContatoMutation.mutate((contato as any).id);
      } else {
        // Se o contato ainda não tem ID (não foi salvo no banco), apenas remova localmente
        setContatos(prev => prev.filter(c => c !== contato));
      }
    }
  };
  
  // Função para definir um contato como principal
  const handleSetContatoPrincipal = (contato: ContatoFormValues) => {
    if ((contato as any).id) {
      setContatoPrincipalMutation.mutate((contato as any).id);
    }
  };
  
  // Função para manipular validação de campos do usuário
  const handleUsuarioInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'nome') {
      setCamposUsuarioValidados(prev => ({
        ...prev,
        nome: value.trim() !== ''
      }));
    } else if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // Campo vazio também é considerado inválido para mostrar mensagem de erro
      setCamposUsuarioValidados(prev => ({
        ...prev,
        email: emailRegex.test(value) && value.trim() !== ''
      }));
    } else if (name === 'setor') {
      setCamposUsuarioValidados(prev => ({
        ...prev,
        setor: value.trim() !== ''
      }));
    }
  };
  
  // Função para adicionar um novo usuário
  const handleAddUsuario = (formData: UsuarioFormValues) => {
    // Validar campos antes de submeter
    const isNomeValido = formData.nome.trim() !== '';
    const isEmailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    const isSetorValido = formData.setor.trim() !== '';
    const isPerfilValido = formData.perfil.trim() !== '';
    
    setCamposUsuarioValidados({
      nome: isNomeValido,
      email: isEmailValido && formData.email.trim() !== '', // Campo vazio também é inválido para mostrar erro
      setor: isSetorValido,
      perfil: isPerfilValido
    });
    
    // Lista de mensagens para exibir
    const mensagensErro = [];
    
    // Verificar cada campo e adicionar mensagem apropriada
    if (!isNomeValido) {
      mensagensErro.push("Nome é obrigatório");
    }
    
    if (!isEmailValido && formData.email.trim() === '') {
      mensagensErro.push("Email é obrigatório");
    } else if (!isEmailValido) {
      mensagensErro.push("Formato de e-mail inválido");
    }
    
    if (!isSetorValido) {
      mensagensErro.push("Setor é obrigatório");
    }
    
    // Se houver erros, mostrar toast e parar
    if (mensagensErro.length > 0) {
      toast({
        title: "Erro de validação",
        description: mensagensErro[0], // Mostra apenas o primeiro erro
        variant: "destructive",
      });
      return;
    }
    
    // Se algum campo não é válido, pare aqui (verificação adicional)
    if (!isNomeValido || !isEmailValido || !isSetorValido || !isPerfilValido) {
      return;
    }
    
    try {
      // Se estamos no modo edição, atualize o usuário existente
      if (editingUsuario && (editingUsuario as any).id) {
        // Usar mutação para atualizar no banco de dados
        updateUsuarioMutation.mutate({ 
          id: (editingUsuario as any).id, 
          data: formData 
        });
        setEditingUsuario(null);
      } else {
        // Usar mutação para adicionar no banco de dados
        createUsuarioMutation.mutate(formData);
      }
      
      // Limpe o formulário
      usuarioForm.reset({
        nome: "",
        email: "",
        setor: "comercial",
        perfil: "usuario",
        status: "ativo"
      });
      
      // Feche o formulário de adição
      setShowAddUsuario(false);
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
    
    // Verifica se os campos são válidos quando abre para edição
    const isNomeValido = usuario.nome.trim() !== '';
    const isEmailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usuario.email);
    const isSetorValido = usuario.setor.trim() !== '';
    
    // Inicializa os estados de validação como válidos quando editando
    // mas ainda faz a validação para garantir a consistência
    setCamposUsuarioValidados({
      nome: isNomeValido,
      email: isEmailValido && usuario.email.trim() !== '',
      setor: isSetorValido,
      perfil: true // Perfil sempre é válido pois vem do select
    });
    
    setShowAddUsuario(true);
  };
  
  // Função para excluir um usuário
  const handleDeleteUsuario = (usuario: UsuarioFormValues) => {
    if (window.confirm("Tem certeza que deseja remover este usuário?")) {
      if ((usuario as any).id) {
        // Usar mutação para excluir do banco de dados
        deleteUsuarioMutation.mutate((usuario as any).id);
      } else {
        // Se o usuário ainda não tem ID (não foi salvo no banco), apenas remova localmente
        setUsuarios(prev => prev.filter(u => u !== usuario));
      }
    }
  };

  // Função para renderizar ícone da aba
  const renderTabIcon = (tab: string) => {
    switch (tab) {
      case "dados":
        return <User className="h-4 w-4" />;
      case "enderecos":
        return <MapPin className="h-4 w-4" />;
      case "contatos":
        return <Phone className="h-4 w-4" />;
      case "usuarios":
        return <Users className="h-4 w-4" />;
      case "financeiro":
        return <CreditCard className="h-4 w-4" />;
      case "seguranca":
        return <Shield className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Componente de loading elegante para a página de conta
  const LoadingComponent = () => (
    <div className="flex-1 bg-gradient-to-br from-gray-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6">
          {/* Cabeçalho skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-80 animate-pulse"></div>
            </div>
          </div>

          {/* Tabs skeleton */}
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-4 border-b pb-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-gray-200 rounded animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                ></div>
              ))}
            </div>

            {/* Card skeleton principal */}
            <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6 animate-pulse">
              {/* Avatar e formulário skeleton */}
              <div className="flex gap-6">
                <div className="w-40 h-24 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-32"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              </div>

              {/* Campos de formulário skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div 
                      className="h-10 bg-gray-200 rounded animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    ></div>
                  </div>
                ))}
              </div>

              {/* Botões skeleton */}
              <div className="flex gap-3">
                <div className="h-10 bg-purple-200 rounded w-24 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
              </div>
            </div>

            {/* Cards adicionais skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg shadow-sm border p-6 space-y-4 animate-pulse"
                  style={{ animationDelay: `${i * 0.3}s` }}
                >
                  <div className="h-5 bg-gray-200 rounded w-32"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Indicador de progresso */}
          <div className="flex justify-center items-center space-x-2 mt-8">
            <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
            <span className="text-sm text-gray-500">Carregando informações da conta...</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Verificar se qualquer query principal ainda está carregando
  const isAnyLoading = isLoadingPerfil || isLoadingEnderecos || isLoadingContatos || isLoadingUsuarios;

  // Se ainda está carregando, mostrar o componente de loading
  if (isAnyLoading) {
    return <LoadingComponent />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Minha Conta</h2>
        <p className="text-gray-500">
          Gerencie seus dados pessoais, segurança e configurações
        </p>
      </div>

      {/* Conteúdo das abas */}
      <Tabs 
            defaultValue="dados" 
            value={activeTab} 
            onValueChange={(value) => {
              setActiveTab(value);
              
              // REMOVIDO: Não resetar formulários ao mudar de aba
              // O usuário deve poder navegar sem perder dados inseridos
              // if (value !== 'seguranca') {
              //   setShowPasswordSection(false);
              //   setShow2FASection(false);
              //   if (alterarSenhaForm) {
              //     alterarSenhaForm.reset();
              //   }
              // }

              // Refetch data based on active tab
              if (value === "dados" && user?.id) {
                refetchPerfil();
              } else if (value === "enderecos" && user?.id) {
                queryClient.invalidateQueries({ queryKey: ["/api/enderecos", user?.id] });
              } else if (value === "contatos" && user?.id) {
                queryClient.invalidateQueries({ queryKey: ["/api/contatos", user?.id] });
              } else if (value === "usuarios" && user?.id) {
                queryClient.invalidateQueries({ queryKey: ["/api/usuarios-adicionais", user?.id] });
              } else if (value === "financeiro" && user?.id) {
                setFinalPlanoData(null);
                setIsReloadingAssinatura(true);
                setForceShowPreloader(true);
                refetchAssinatura();
                refetchCredits(); // Recarregar créditos também
                queryClient.invalidateQueries({ queryKey: ["/api/historico-pagamentos", user?.id] });
                queryClient.invalidateQueries({ queryKey: ["/api/historico-assinaturas", user?.id] });
              }
            }}
            className="w-full"
          >
            <TabsList className="grid grid-cols-1 md:grid-cols-6 w-full mb-4 h-auto border-b rounded-none bg-transparent">
              <TabsTrigger 
                value="dados" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-600 rounded-none bg-transparent hover:bg-transparent data-[state=active]:bg-transparent px-4 py-3"
                onClick={() => {
                  // Atualiza a URL
                  const url = new URL(window.location.href);
                  url.searchParams.delete('tab');
                  window.history.pushState({}, '', url.toString());
                }}
              >
                {renderTabIcon("dados")}
                <span>Dados de Cadastro</span>
              </TabsTrigger>
              <TabsTrigger 
                value="enderecos" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-600 rounded-none bg-transparent hover:bg-transparent data-[state=active]:bg-transparent px-4 py-3"
                onClick={() => {
                  // Atualiza a URL
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', 'enderecos');
                  window.history.pushState({}, '', url.toString());
                }}
              >
                <MapPin className="h-4 w-4" />
                <span>Endereços</span>
              </TabsTrigger>
              <TabsTrigger 
                value="contatos" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-600 rounded-none bg-transparent hover:bg-transparent data-[state=active]:bg-transparent px-4 py-3"
                onClick={() => {
                  // Atualiza a URL
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', 'contatos');
                  window.history.pushState({}, '', url.toString());
                }}
              >
                <Phone className="h-4 w-4" />
                <span>Contatos</span>
              </TabsTrigger>
              <TabsTrigger 
                value="usuarios" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-600 rounded-none bg-transparent hover:bg-transparent data-[state=active]:bg-transparent px-4 py-3"
                onClick={() => {
                  // Atualiza a URL
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', 'usuarios');
                  window.history.pushState({}, '', url.toString());
                }}
              >
                {renderTabIcon("usuarios")}
                <span>Usuários</span>
              </TabsTrigger>
              <TabsTrigger 
                value="financeiro" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-600 rounded-none bg-transparent hover:bg-transparent data-[state=active]:bg-transparent px-4 py-3"
                onClick={() => {
                  // Atualiza a URL
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', 'financeiro');
                  window.history.pushState({}, '', url.toString());
                  
                  // Início do carregamento
                  if (user?.id) {
                    // Limpar dados e ativar preloader
                    setIsReloadingAssinatura(true);
                    
                    // Forçar refetch da API de assinatura
                    refetchAssinatura();
                  }
                }}
              >
                {renderTabIcon("financeiro")}
                <span>Financeiro</span>
              </TabsTrigger>
              <TabsTrigger 
                value="seguranca" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-600 rounded-none bg-transparent hover:bg-transparent data-[state=active]:bg-transparent px-4 py-3"
                onClick={() => {
                  // Atualiza a URL
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', 'seguranca');
                  window.history.pushState({}, '', url.toString());
                }}
              >
                {renderTabIcon("seguranca")}
                <span>Segurança</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab: Dados de Cadastro */}
            <TabsContent value="dados" className="space-y-4">
              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  {/* Removido o indicador de carregamento conforme solicitado */}
                  
                  {/* Se não houver dados do perfil, permitiremos que o formulário seja preenchido sem mostrar erro */}
                  
                  {/* Toast de erro é mostrado na função de erro da query */}
                  
                  <Form {...perfilForm}>
                    <form className="space-y-4" noValidate 
                      onSubmit={perfilForm.handleSubmit((data) => {
                        console.log("Formulário submetido com dados:", data);
                        handleSavePerfil(data);
                      })}>
                      <div>
                        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-4">
                          <h3 className="text-lg font-medium mb-4 flex items-center text-gray-800">
                            <Landmark className="h-5 w-5 mr-2 text-purple-600" />
                            Dados da Empresa
                          </h3>
                          
                          <div className="space-y-4">
                            <div className="flex flex-row gap-4 items-start">
                              <div className="relative inline-block">
                                <label htmlFor="logo-upload" className="cursor-pointer">
                                  <Avatar className="w-40 h-24 rounded-lg shadow-sm hover:opacity-90 transition-opacity">
                                    {perfilForm.watch("logoUrl") ? (
                                      <AvatarImage src={perfilForm.watch("logoUrl")} alt="Logo" className="object-contain" />
                                    ) : (
                                      <AvatarFallback className="bg-purple-100 text-purple-600 text-2xl rounded-lg">
                                        {perfilData?.primeiroNome?.charAt(0) || "U"}
                                      </AvatarFallback>
                                    )}
                                  </Avatar>
                                  <div 
                                    className="absolute -right-3 -bottom-3 bg-purple-600 rounded-full p-2 hover:bg-purple-700 transition-colors shadow-sm"
                                  >
                                    <Camera className="h-4 w-4 text-white" />
                                  </div>
                                  <input 
                                    id="logo-upload" 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleLogoUpload}
                                  />
                                </label>
                              </div>
                              
                              <div className="flex-1">
                                <div className="bg-purple-50 p-4 rounded-md border-l-4 border-purple-500">
                                  <FormField
                                    control={perfilForm.control}
                                    name="tipoPessoa"
                                    render={({ field }) => (
                                      <FormItem className="mb-0">
                                        <FormLabel className="text-purple-700 font-medium">
                                          Tipo de Pessoa: <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <Select 
                                          value={field.value} 
                                          onValueChange={(val) => {
                                            field.onChange(val);
                                            // Limpar o regime tributário quando mudar para pessoa física
                                            if (val === "fisica") {
                                              perfilForm.setValue("regimeTributario", "");
                                            }
                                          }}
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
                              </div>
                            </div>
                            
                            {perfilForm.watch("tipoPessoa") === "fisica" && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={perfilForm.control}
                                  name="primeiroNome"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className={!camposPerfilValidados.primeiroNome ? "text-destructive" : ""}>
                                        Primeiro Nome: <span className="text-red-500">*</span>
                                      </FormLabel>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          className={!camposPerfilValidados.primeiroNome ? "border-destructive" : ""}
                                          onChange={(e) => {
                                            field.onChange(e.target.value);
                                            setCamposPerfilValidados(prev => ({
                                              ...prev,
                                              primeiroNome: e.target.value.trim() !== ''
                                            }));
                                          }}
                                          onBlur={handlePerfilInputBlur}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                      {!camposPerfilValidados.primeiroNome && (
                                        <FormErrorMessage message="Primeiro nome é obrigatório" />
                                      )}
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={perfilForm.control}
                                  name="ultimoNome"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className={!camposPerfilValidados.ultimoNome ? "text-destructive" : ""}>
                                        Último Nome: <span className="text-red-500">*</span>
                                      </FormLabel>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          className={!camposPerfilValidados.ultimoNome ? "border-destructive" : ""}
                                          onChange={(e) => {
                                            field.onChange(e.target.value);
                                            setCamposPerfilValidados(prev => ({
                                              ...prev,
                                              ultimoNome: e.target.value.trim() !== ''
                                            }));
                                          }}
                                          onBlur={handlePerfilInputBlur}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                      {!camposPerfilValidados.ultimoNome && (
                                        <FormErrorMessage message="Último nome é obrigatório" />
                                      )}
                                    </FormItem>
                                  )}
                                />
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <FormField
                                control={perfilForm.control}
                                name="cpfCnpj"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className={!camposPerfilValidados.cpfCnpj ? "text-destructive" : ""}>
                                      {perfilForm.watch("tipoPessoa") === "fisica" ? "CPF" : "CNPJ"}: <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                      <InputMask
                                        mask={perfilForm.watch("tipoPessoa") === "fisica" ? "999.999.999-99" : "99.999.999/9999-99"}
                                        value={field.value}
                                        onChange={(e) => {
                                          field.onChange(e.target.value);
                                          setCamposPerfilValidados(prev => ({
                                            ...prev,
                                            cpfCnpj: e.target.value.trim() !== ''
                                          }));
                                        }}
                                        onBlur={handlePerfilInputBlur}
                                        className={cn(
                                          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                          !camposPerfilValidados.cpfCnpj && "border-destructive"
                                        )}
                                      >
                                        {(inputProps) => <Input {...inputProps} type="text" />}
                                      </InputMask>
                                    </FormControl>
                                    <FormMessage />
                                    {!camposPerfilValidados.cpfCnpj && (
                                      <FormErrorMessage message={perfilForm.watch("tipoPessoa") === "fisica" ? "CPF é obrigatório" : "CNPJ é obrigatório"} />
                                    )}
                                  </FormItem>
                                )}
                              />
                              
                              {perfilForm.watch("tipoPessoa") === "juridica" && (
                                <FormField
                                  control={perfilForm.control}
                                  name="inscricaoEstadual"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Inscrição Estadual:</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}
                            </div>

                            {perfilForm.watch("tipoPessoa") === "juridica" && (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField
                                    control={perfilForm.control}
                                    name="razaoSocial"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className={!camposPerfilValidados.razaoSocial ? "text-destructive" : ""}>
                                          Razão Social: <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                          <Input 
                                            {...field} 
                                            className={!camposPerfilValidados.razaoSocial ? "border-destructive" : ""}
                                            onChange={(e) => {
                                              field.onChange(e.target.value);
                                              setCamposPerfilValidados(prev => ({
                                                ...prev,
                                                razaoSocial: e.target.value.trim() !== ''
                                              }));
                                            }}
                                            onBlur={handlePerfilInputBlur}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                        {!camposPerfilValidados.razaoSocial && (
                                          <FormErrorMessage message="Razão Social é obrigatória" />
                                        )}
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={perfilForm.control}
                                    name="nomeFantasia"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Nome Fantasia:</FormLabel>
                                        <FormControl>
                                          <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField
                                    control={perfilForm.control}
                                    name="inscricaoMunicipal"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Inscrição Municipal:</FormLabel>
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
                                        <FormLabel>CNAE:</FormLabel>
                                        <FormControl>
                                          <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField
                                    control={perfilForm.control}
                                    name="regimeTributario"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>
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
                                        <FormLabel>Atividade Principal:</FormLabel>
                                        <FormControl>
                                          <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-4">
                          <h3 className="text-lg font-medium mb-4 flex items-center text-gray-800">
                            <UserCog className="h-5 w-5 mr-2 text-purple-600" />
                            Responsável Legal
                          </h3>
                          <div className="space-y-4">
                            <FormField
                              control={perfilForm.control}
                              name="responsavelNome"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={!camposPerfilValidados.responsavelNome ? "text-destructive" : ""}>
                                    Nome do Responsável: <span className="text-red-500">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      className={!camposPerfilValidados.responsavelNome ? "border-destructive" : ""}
                                      onChange={(e) => {
                                        field.onChange(e.target.value);
                                        setCamposPerfilValidados(prev => ({
                                          ...prev,
                                          responsavelNome: e.target.value.trim() !== ''
                                        }));
                                      }}
                                      onBlur={handlePerfilInputBlur}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                  {!camposPerfilValidados.responsavelNome && (
                                    <FormErrorMessage message="Nome do responsável é obrigatório" />
                                  )}
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={perfilForm.control}
                                name="responsavelEmail"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className={!camposPerfilValidados.responsavelEmail ? "text-destructive" : ""}>
                                      Email: <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field} 
                                        type="text" 
                                        className={!camposPerfilValidados.responsavelEmail ? "border-destructive" : ""}
                                        onChange={(e) => {
                                          field.onChange(e.target.value);
                                          setCamposPerfilValidados(prev => ({
                                            ...prev,
                                            responsavelEmail: isValidEmail(e.target.value)
                                          }));
                                        }}
                                        onBlur={handlePerfilInputBlur}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                    {!camposPerfilValidados.responsavelEmail && (
                                      <FormErrorMessage 
                                        message={field.value ? "Formato de email inválido" : "Email do responsável é obrigatório"} 
                                      />
                                    )}
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={perfilForm.control}
                                name="responsavelTelefone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className={!camposPerfilValidados.responsavelTelefone ? "text-destructive" : ""}>
                                      Telefone: <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                      <InputMask
                                        mask="(99) 99999-9999"
                                        value={field.value}
                                        onChange={(e) => {
                                          field.onChange(e.target.value);
                                          setCamposPerfilValidados(prev => ({
                                            ...prev,
                                            responsavelTelefone: e.target.value.trim() !== ''
                                          }));
                                        }}
                                        onBlur={handlePerfilInputBlur}
                                        className={cn(
                                          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                          !camposPerfilValidados.responsavelTelefone && "border-destructive"
                                        )}
                                      >
                                        {(inputProps) => <Input {...inputProps} type="text" />}
                                      </InputMask>
                                    </FormControl>
                                    <FormMessage />
                                    {!camposPerfilValidados.responsavelTelefone && (
                                      <FormErrorMessage message="Telefone do responsável é obrigatório" />
                                    )}
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={perfilForm.control}
                              name="responsavelSetor"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Setor:</FormLabel>
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <SelectTrigger>
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
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {perfilForm.watch("tipoPessoa") === "juridica" && (
                          <div className="bg-white p-6 rounded-lg border border-gray-200 mb-4">
                            <h3 className="text-lg font-medium mb-4 flex items-center text-gray-800">
                              <ReceiptIcon className="h-5 w-5 mr-2 text-purple-600" />
                              Contador Responsável
                            </h3>
                            <div className="space-y-4">
                              <FormField
                                control={perfilForm.control}
                                name="contadorNome"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nome do Contador:</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={perfilForm.control}
                                  name="contadorEmail"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Email:</FormLabel>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          type="text"
                                          onChange={(e) => {
                                            field.onChange(e.target.value);
                                            // Como é campo opcional, não precisamos validar se estiver vazio
                                            if (e.target.value.trim() !== '' && !isValidEmail(e.target.value)) {
                                              // Poderíamos adicionar um estado para validação, mas como é opcional
                                              // só validamos se não estiver vazio
                                            }
                                          }}
                                        />
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
                                      <FormLabel>Telefone:</FormLabel>
                                      <FormControl>
                                        <InputMask
                                          mask="(99) 99999-9999"
                                          value={field.value}
                                          onChange={(e) => {
                                            field.onChange(e.target.value);
                                          }}
                                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          {(inputProps) => <Input {...inputProps} type="text" />}
                                        </InputMask>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end mt-2 mb-6">
                        <Button 
                          type="button" 
                          className="bg-purple-600 hover:bg-purple-700 transition-all px-6"
                          size="lg"
                          disabled={updatePerfilMutation.isPending}
                          onClick={() => {
                            if (handleValidatePerfilForm()) {
                              perfilForm.handleSubmit(handleSavePerfil)();
                            }
                          }}
                        >
                          {updatePerfilMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-5 w-5" />
                              Salvar Alterações
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Endereços */}
            <TabsContent value="enderecos" className="space-y-4">
              <EnderecosTab />
            </TabsContent>
            
            {/* Tab: Contatos */}
            <TabsContent value="contatos" className="space-y-4">
              <ContatosTab />
            </TabsContent>
            {/* Tab: Usuários */}
            <TabsContent value="usuarios" className="space-y-4">
              <UsuariosTab />
            </TabsContent>
            {/* Tab: Financeiro */}
            <TabsContent value="financeiro" className="space-y-4 relative">
              
              {/* Grid para posicionar boxes lado a lado */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Box de Informações Financeiras (à esquerda) */}
                <div>
                  {!showAddCard ? (
                    <Card className="shadow-sm h-full">
                      <CardHeader className="pb-2">
                        <CardTitle>Informações Financeiras</CardTitle>
                        <CardDescription>
                          Gerencie sua assinatura
                        </CardDescription>
                        <div className="mt-3 border-b border-gray-200"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium">Assinatura Atual</h3>
                            {!isLoadingAssinatura && (
                              <Button 
                                variant="outline" 
                                onClick={handleRenovarAssinatura}
                              >
                                <CreditCardIcon className="mr-2 h-4 w-4" />
                                Renovar Assinatura
                              </Button>
                            )}
                          </div>

                          <div className="border rounded-lg p-4 plano-box">
                            {isLoadingAssinatura ? (
                              <div className="plano-spinner"></div>
                            ) : displayData?.plano ? (
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-xl text-purple-800">
                                    Plano {displayData.plano.nome || 'Atual'}
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    Faturamento {displayData.assinatura.tipoCobranca === 'anual' ? 'Anual' : 'Mensal'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-purple-700">
                                    R$ {displayData.assinatura.tipoCobranca === 'anual' ? 
                                      parseFloat(displayData.assinatura.valorPago).toFixed(2).replace('.', ',') :
                                      (displayData.plano.valorMensal ? 
                                        parseFloat(displayData.plano.valorMensal).toFixed(2).replace('.', ',') : 
                                        "87,90")
                                    }<span className="text-sm font-normal text-gray-600">
                                      {displayData.assinatura.tipoCobranca === 'anual' ? '/ano' : '/mês'}
                                    </span>
                                  </div>
                                  <div className="text-sm text-green-600 mt-1">
                                    {displayData.plano.nome === 'ESSENCIAL' ? 'Acesso aos recursos essenciais' : 
                                     displayData.plano.nome === 'PROFISSIONAL' ? 'Acesso a todos os recursos' :
                                     displayData.plano.nome === 'EMPRESARIAL' ? 'Acesso a recursos avançados' : 
                                     'Acesso total ao sistema'}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between animate-pulse">
                                <div>
                                  <div className="h-7 w-36 bg-gray-200 rounded"></div>
                                  <div className="h-4 w-28 bg-gray-200 rounded mt-2"></div>
                                </div>
                                <div className="text-right">
                                  <div className="h-8 w-28 bg-gray-200 rounded ml-auto"></div>
                                  <div className="h-4 w-36 bg-gray-200 rounded mt-2 ml-auto"></div>
                                </div>
                              </div>
                            )}

                            <div className="mt-4 flex items-center">
                              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                              {isLoadingAssinatura ? (
                                <div className="flex items-center">
                                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                              ) : displayData && displayData.assinatura && displayData.assinatura.dataFim ? (
                                <p className="text-sm text-gray-600">
                                  Validade do plano: {new Date(displayData.assinatura.dataFim).toLocaleDateString('pt-BR')}
                                </p>
                              ) : (
                                <p className="text-sm text-gray-600">Data de vencimento não disponível</p>
                              )}
                            </div>

                            {/* Seção de Créditos da Conta - só mostra quando há créditos e tudo está carregado */}
                            {!isLoadingAssinatura && !isLoadingCredits && hasCredits && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <Gift className="h-5 w-5 text-green-600 mr-2" />
                                    <span className="text-sm font-medium text-gray-700">Créditos para próximo ciclo</span>
                                  </div>
                                  <span className="text-sm font-semibold text-green-600">{formattedBalance}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Estes créditos serão aplicados automaticamente na sua próxima cobrança
                                </p>
                              </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                              <div className="flex space-x-2">
                                <Button 
                                  variant={showHistoricoPagamentos ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    setShowHistoricoPagamentos(true);
                                    setShowHistoricoAssinaturas(false);
                                  }}
                                >
                                  <DollarSign className="mr-2 h-4 w-4" />
                                  Ver Pagamentos
                                </Button>
                                <Button 
                                  variant={showHistoricoAssinaturas ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    setShowHistoricoAssinaturas(true);
                                    setShowHistoricoPagamentos(false);
                                  }}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Ver Assinaturas
                                </Button>
                              </div>

                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div>
                      <div className="flex items-center mb-4">
                        <Button 
                          variant="ghost" 
                          className="p-0 h-auto mr-3" 
                          onClick={() => setShowAddCard(false)}
                        >
                          <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h3 className="text-xl font-semibold">Renovar Assinatura</h3>
                      </div>
                      
                      <StripePayment />
                    </div>
                  )}
                </div>
                
                {/* Box de Métodos de Pagamento (à direita) */}
                <div>
                  <PaymentMethodsManager />
                </div>
              </div>

              {/* Histórico de Pagamentos */}
              {showHistoricoPagamentos && (
                <Card className="shadow-sm mt-6">
                  <CardHeader>
                    <CardTitle>Histórico de Pagamentos</CardTitle>
                    <CardDescription>
                      Visualize todos os seus pagamentos realizados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingHistoricoPagamentos ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="border rounded-lg p-4">
                            <div className="animate-pulse">
                              <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                                </div>
                                <div className="space-y-2">
                                  <div className="h-6 bg-gray-200 rounded w-24"></div>
                                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Verificar diferentes estruturas de dados possíveis
                      (() => {
                        const pagamentos = historicoPagamentos?.data || 
                                         (Array.isArray(historicoPagamentos) ? historicoPagamentos : []);
                        
                        if (pagamentos.length > 0) {
                          // Calcular paginação
                          const totalPagesPagamentos = Math.ceil(pagamentos.length / itemsPerPagePagamentos);
                          const startIndexPagamentos = (currentPagePagamentos - 1) * itemsPerPagePagamentos;
                          const endIndexPagamentos = startIndexPagamentos + itemsPerPagePagamentos;
                          const paginatedPagamentos = pagamentos.slice(startIndexPagamentos, endIndexPagamentos);
                          
                          return (
                            <>
                              <div className="space-y-4">
                                {paginatedPagamentos.map((pagamento: any, index: number) => (
                                <div key={pagamento.id || index} className={`border rounded-lg p-6 shadow-sm transition-all duration-200 hover:shadow-md ${
                                  pagamento.status === 'paid' || pagamento.status === 'Pago' ? 'bg-green-50 border-green-200' : 
                                  pagamento.status === 'failed' || pagamento.status === 'Falhado' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                                }`}>
                                  <div className="flex justify-between items-start mb-4">
                                    <div className="space-y-2">
                                      <div className={`font-semibold text-lg flex items-center gap-2 ${
                                        pagamento.status === 'paid' || pagamento.status === 'Pago' ? 'text-green-800' : 
                                        pagamento.status === 'failed' || pagamento.status === 'Falhado' ? 'text-red-800' : 'text-yellow-800'
                                      }`}>
                                        {pagamento.status === 'paid' || pagamento.status === 'Pago' && <CheckCircle className="h-5 w-5 text-green-500" />}
                                        {pagamento.status === 'paid' || pagamento.status === 'Pago' ? 'Pagamento Confirmado' : 
                                         pagamento.status === 'failed' || pagamento.status === 'Falhado' ? 'Pagamento Falhado' : 'Pagamento Pendente'}
                                      </div>
                                      <div className="text-sm font-medium text-gray-700">{pagamento.planoNome || pagamento.plan_name || 'Plano não identificado'}</div>
                                      <div className="text-sm text-gray-500 flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        {pagamento.dataPagamento || pagamento.data_pagamento || new Date(pagamento.created * 1000).toLocaleDateString('pt-BR')}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className={`text-2xl font-bold ${
                                        pagamento.status === 'paid' || pagamento.status === 'Pago' ? 'text-green-700' : 
                                        pagamento.status === 'failed' || pagamento.status === 'Falhado' ? 'text-red-700' : 'text-yellow-700'
                                      }`}>
                                        R$ {(pagamento.valor || pagamento.amount_total || pagamento.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </div>
                                      <div className="text-sm text-gray-500">{pagamento.metodoPagamento || pagamento.payment_method_type || 'Cartão'}</div>
                                    </div>
                                  </div>
                                  
                                  {/* Detalhes do Pagamento */}
                                  <div className="bg-white/70 rounded-lg p-4 border">
                                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                      <DollarSign className="h-4 w-4 text-purple-600" />
                                      Detalhes do Pagamento
                                    </h4>
                                    
                                    <div className="space-y-2">
                                      {/* Sempre mostrar saldo de tempo primeiro, quando existe */}
                                      {pagamento.valor_diferenca !== null && 
                                       pagamento.valor_diferenca !== undefined && 
                                       pagamento.valor_diferenca !== 0 &&
                                       Number(pagamento.valor_diferenca) > 0 && (
                                        <div className="flex justify-between items-center py-1">
                                          <div className="flex items-center gap-2 text-sm">
                                            <RefreshCw className="h-4 w-4 text-blue-600" />
                                            <span className="text-blue-600">Saldo de tempo de uso do plano anterior:</span>
                                          </div>
                                          <span className="text-sm font-medium text-blue-700">
                                            R$ {Number(pagamento.valor_diferenca).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </span>
                                        </div>
                                      )}

                                      {/* Verificar se é pagamento híbrido */}
                                      {pagamento.temCredito && (pagamento.valorCartao > 0 && pagamento.valorCredito > 0) ? (
                                        <>
                                          {/* Pagamento Híbrido */}
                                          <div className="flex justify-between items-center py-1">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                              <CreditCard className="h-4 w-4" />
                                              <span>Pago no cartão:</span>
                                            </div>
                                            <span className="text-sm font-medium text-gray-800">
                                              R$ {(pagamento.valorCartao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                          </div>
                                          <div className="flex justify-between items-center py-1">
                                            <div className="flex items-center gap-2 text-sm text-green-600">
                                              <Coins className="h-4 w-4" />
                                              <span>Pago com saldo do plano anterior:</span>
                                            </div>
                                            <span className="text-sm font-medium text-green-700">
                                              R$ {(pagamento.valorCredito || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                          </div>
                                          {pagamento.detalhesCredito && (
                                            <div className="text-xs text-gray-500 italic mt-1 pl-6">
                                              {pagamento.detalhesCredito}
                                            </div>
                                          )}
                                        </>
                                      ) : pagamento.temCredito && pagamento.isFullCredit ? (
                                        <>
                                          {/* Pagamento 100% com créditos */}
                                          <div className="flex justify-between items-center py-1">
                                            <div className="flex items-center gap-2 text-sm text-green-600">
                                              <Coins className="h-4 w-4" />
                                              <span>Pago com saldo em conta:</span>
                                            </div>
                                            <span className="text-sm font-medium text-green-700">
                                              R$ {(pagamento.valorCredito || pagamento.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                          </div>
                                          {pagamento.detalhesCredito && (
                                            <div className="text-xs text-gray-500 italic mt-1 pl-6">
                                              {pagamento.detalhesCredito}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <>
                                          {/* Pagamento 100% no cartão */}
                                          <div className="flex justify-between items-center py-1">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                              <CreditCard className="h-4 w-4" />
                                              <span>Pago no cartão:</span>
                                            </div>
                                            <span className="text-sm font-medium text-gray-800">
                                              R$ {(pagamento.valorCartao || pagamento.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                          </div>
                                        </>
                                      )}

                                      {/* Mostrar credito_gerado quando existe e é diferente de zero */}
                                      {pagamento.credito_gerado !== null && 
                                       pagamento.credito_gerado !== undefined && 
                                       pagamento.credito_gerado !== 0 &&
                                       Number(pagamento.credito_gerado) > 0 && (
                                        <>
                                          {/* Linha divisória */}
                                          <div className="border-t border-gray-200 my-2"></div>
                                          <div className="flex justify-between items-center py-1">
                                            <div className="flex items-center gap-2 text-sm">
                                              <Gift className="h-4 w-4 text-green-600" />
                                              <span className="text-green-600">Créditos gerados:</span>
                                            </div>
                                            <span className="text-sm font-medium text-green-700">
                                              R$ {Number(pagamento.credito_gerado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="mt-4 flex justify-between items-center">
                                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium shadow-sm ${
                                      pagamento.status === 'paid' || pagamento.status === 'Pago' ? 'bg-green-100 text-green-700 border border-green-200' : 
                                      pagamento.status === 'failed' || pagamento.status === 'Falhado' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                    }`}>
                                      {pagamento.status === 'paid' || pagamento.status === 'Pago' && <CheckCircle className="w-4 h-4 mr-2" />}
                                      {pagamento.status === 'paid' || pagamento.status === 'Pago' ? 'Pago' : 
                                       pagamento.status === 'failed' || pagamento.status === 'Falhado' ? 'Falhado' : pagamento.status}
                                    </span>
                                    {(pagamento.faturaUrl || pagamento.invoice_pdf) && (
                                      <Button variant="ghost" size="sm" className="text-gray-500 hover:text-purple-600" onClick={() => window.open(pagamento.faturaUrl || pagamento.invoice_pdf, '_blank')}>
                                        <Download className="w-4 h-4 mr-2" />
                                        Download da Fatura
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              </div>
                              
                              {/* Componente de Paginação para Pagamentos */}
                              {pagamentos.length > 0 && (
                                <Pagination
                                  currentPage={currentPagePagamentos}
                                  totalPages={totalPagesPagamentos}
                                  onPageChange={setCurrentPagePagamentos}
                                  itemsPerPage={itemsPerPagePagamentos}
                                  onItemsPerPageChange={setItemsPerPagePagamentos}
                                  totalItems={pagamentos.length}
                                />
                              )}
                            </>
                          );
                        } else {
                          return (
                            <div className="text-center py-8">
                              <div className="text-gray-500 mb-2">Nenhum pagamento encontrado</div>
                              <div className="text-sm text-gray-400">Seus pagamentos aparecerão aqui quando forem processados</div>
                            </div>
                          );
                        }
                      })()
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Histórico de Assinaturas */}
              {showHistoricoAssinaturas && (
                <Card className="shadow-sm mt-6">
                  <CardHeader>
                    <CardTitle>Histórico de Assinaturas</CardTitle>
                    <CardDescription>
                      Visualize todas as suas assinaturas e mudanças de plano
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingHistoricoAssinaturas ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="border rounded-lg p-4">
                            <div className="animate-pulse">
                              <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                                </div>
                                <div className="space-y-2">
                                  <div className="h-6 bg-gray-200 rounded w-24"></div>
                                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : historicoAssinaturas?.success && historicoAssinaturas?.data?.length > 0 ? (
                      (() => {
                        const assinaturas = historicoAssinaturas.data;
                        
                        // Calcular paginação
                        const totalPagesAssinaturas = Math.ceil(assinaturas.length / itemsPerPageAssinaturas);
                        const startIndexAssinaturas = (currentPageAssinaturas - 1) * itemsPerPageAssinaturas;
                        const endIndexAssinaturas = startIndexAssinaturas + itemsPerPageAssinaturas;
                        const paginatedAssinaturas = assinaturas.slice(startIndexAssinaturas, endIndexAssinaturas);
                        
                        return (
                          <>
                            <div className="space-y-4">
                              {paginatedAssinaturas.map((assinatura: any) => (
                          <div key={assinatura.id} className={`border rounded-lg p-6 shadow-sm transition-all duration-200 hover:shadow-md ${
                            assinatura.planoNome === 'ESSENCIAL' ? 'bg-gradient-to-r from-blue-50 to-sky-50 border-blue-200' :
                            assinatura.planoNome === 'PROFISSIONAL' ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200' :
                            assinatura.planoNome === 'EMPRESARIAL' ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200' :
                            assinatura.planoNome === 'PREMIUM' ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200' : 
                            'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div className="space-y-2">
                                <div className={`font-semibold text-xl flex items-center gap-2 ${
                                  assinatura.planoNome === 'ESSENCIAL' ? 'text-blue-700' :
                                  assinatura.planoNome === 'PROFISSIONAL' ? 'text-purple-700' :
                                  assinatura.planoNome === 'EMPRESARIAL' ? 'text-emerald-700' :
                                  assinatura.planoNome === 'PREMIUM' ? 'text-amber-700' :
                                  'text-gray-700'
                                }`}>
                                  {assinatura.status === 'Ativo' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                                  {assinatura.planoNome}
                                </div>
                                <div className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  {assinatura.dataInicio} {assinatura.dataFim && `- ${assinatura.dataFim}`}
                                </div>
                                <div className="text-sm text-gray-600 flex items-center gap-1">
                                  <RefreshCw className="h-4 w-4" />
                                  Período: {assinatura.periodo}
                                </div>
                              </div>
                              <div className="text-right space-y-1">
                                <div className={`text-2xl font-bold tracking-tight ${
                                  assinatura.planoNome === 'ESSENCIAL' ? 'text-blue-600' :
                                  assinatura.planoNome === 'PROFISSIONAL' ? 'text-purple-600' :
                                  assinatura.planoNome === 'EMPRESARIAL' ? 'text-emerald-600' :
                                  assinatura.planoNome === 'PREMIUM' ? 'text-amber-600' :
                                  'text-gray-600'
                                }`}>
                                  R$ {parseFloat(assinatura.valor).toFixed(2)}
                                </div>
                                <div className="text-sm font-medium text-gray-500 capitalize">{assinatura.periodo}</div>
                              </div>
                            </div>
                            <div className="mt-4 flex justify-between items-center">
                              <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium shadow-sm ${
                                assinatura.status === 'Ativo' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 
                                assinatura.status === 'Cancelado' ? 'bg-gray-100 text-gray-700 border border-gray-200' : 
                                assinatura.status === 'Pausado' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                              }`}>
                                {assinatura.status === 'Ativo' && <CheckCircle className="w-4 h-4 mr-2" />}
                                {assinatura.status === 'Cancelado' && <XCircle className="w-4 h-4 mr-2" />}
                                {assinatura.status === 'Pausado' && <Clock className="w-4 h-4 mr-2" />}
                                {assinatura.status}
                              </span>
                            </div>
                          </div>
                                ))}
                              </div>
                              
                              {/* Componente de Paginação para Assinaturas */}
                              {assinaturas.length > 0 && (
                                <Pagination
                                  currentPage={currentPageAssinaturas}
                                  totalPages={totalPagesAssinaturas}
                                  onPageChange={setCurrentPageAssinaturas}
                                  itemsPerPage={itemsPerPageAssinaturas}
                                  onItemsPerPageChange={setItemsPerPageAssinaturas}
                                  totalItems={assinaturas.length}
                                />
                              )}
                          </>
                        );
                      })()
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-500 mb-2">Nenhuma assinatura encontrada</div>
                        <div className="text-sm text-gray-400">Seu histórico de assinaturas aparecerá aqui</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab: Segurança da Conta */}
            <TabsContent value="seguranca" className="space-y-4">
              <SegurancaTab 
                usuarioAtual={{id: perfilData?.userId || 1}}
                sessoes={sessoes}
                is2FAEnabled={is2FAEnabled}
                qrCode2FA={qrCode2FA}
                secret2FA={secret2FA}
                erroSenha={erroSenha}
                sucessoSenha={sucessoSenha}
                carregandoSenha={carregandoSenha}
                erro2FA={erro2FA}
                sucesso2FA={sucesso2FA}
                carregando2FA={carregando2FA}
                carregandoSessoes={carregandoSessoes}
                showPasswordSection={showPasswordSection}
                show2FASection={show2FASection}
                setShowPasswordSection={setShowPasswordSection}
                setShow2FASection={setShow2FASection}
                alterarSenha={alterarSenha}
                iniciar2FA={iniciar2FA}
                ativar2FA={ativar2FA}
                desativar2FA={desativar2FA}
                encerrarSessao={encerrarSessao}
                recarregarSessoes={fetchSessoes}
              />
            </TabsContent>
          </Tabs>

          {/* Modal de Pagamento para Renovação de Assinatura */}
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            planoSelecionado={selectedPlan}
            periodoPlanos={periodoPlanos}
            onSuccess={handlePaymentSuccess}
            acaoTipo="ASSINAR"
          />
    </div>
  );
}