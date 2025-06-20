
import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Loader2, 
  Shield, 
  LogOut, 
  Smartphone, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Lock,
  Monitor,
  Trash2,
  RefreshCw
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocketData } from "@/hooks/useWebSocketData";
import { Badge } from "@/components/ui/badge";
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

// Schema para alteração de senha
const changePasswordSchema = z.object({
  senhaAtual: z.string().min(6, "Senha atual é obrigatória"),
  novaSenha: z.string()
    .min(8, "A nova senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número"),
  confirmarSenha: z.string().min(1, "Confirmação da senha é obrigatória")
}).refine((data) => data.novaSenha === data.confirmarSenha, {
  message: "As senhas não coincidem",
  path: ["confirmarSenha"],
});

// Schema para 2FA
const enable2FASchema = z.object({
  codigo: z.string().length(6, "O código deve ter 6 dígitos").regex(/^\d+$/, "O código deve conter apenas números")
});

type ChangePasswordData = z.infer<typeof changePasswordSchema>;
type Enable2FAData = z.infer<typeof enable2FASchema>;

interface SessaoData {
  id: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastActivity: string;
  isCurrentSession: boolean;
  location?: string;
  device?: string;
  deviceInfo?: string;
  browser?: string;
  current?: boolean;
  isActive?: boolean;
  status?: string;
  userId?: number;
  nomeUsuario?: string;
  username?: string;
  deviceType?: string;
  activityText?: string;
  expiryText?: string;
}

export default function SegurancaTabWebSocket() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Estados para controle de seções
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [show2FASection, setShow2FASection] = useState(false);
  
  // Estados para 2FA
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [qrCode2FA, setQrCode2FA] = useState<string | null>(null);
  const [secret2FA, setSecret2FA] = useState<string | null>(null);
  const [codigo2FA, setCodigo2FA] = useState('');
  
  // Estados de loading e erros
  const [carregandoSenha, setCarregandoSenha] = useState(false);
  const [carregando2FA, setCarregando2FA] = useState(false);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [erro2FA, setErro2FA] = useState<string | null>(null);
  const [sucessoSenha, setSucessoSenha] = useState(false);
  const [sucesso2FA, setSucesso2FA] = useState(false);
  
  // Estados para controle de visibilidade das senhas
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Estados para sessões
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [sessaoParaExcluir, setSessaoParaExcluir] = useState<SessaoData | null>(null);
  const [carregandoEncerramento, setCarregandoEncerramento] = useState<string | null>(null);
  
  // Estado local para controlar o preloader do botão, independente do estado do componente pai
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [show2FACode, setShow2FACode] = useState(false);
  // Estado para indicar que estamos verificando o status do 2FA
  const [verificando2FAStatus, setVerificando2FAStatus] = useState(true);
  // Estado para controlar quando o usuário cancelou intencionalmente
  const [userCancelled, setUserCancelled] = useState(false);

  // Estado para controlar a validação e feedback visual nos campos - simplificado
  const [camposSenhaValidados, setCamposSenhaValidados] = useState({
    senhaAtual: false, // True quando a senha estiver correta
    novaSenha: false, // Iniciar como false (inválido)
    confirmarSenha: false, // Iniciar como false (inválido)
    senhasIguais: false, // Nova senha não pode ser igual à atual
    confirmacaoCorreta: false, // Confirmação deve ser igual à nova senha
    senhaAtualVerificada: false // Indica se a verificação já foi realizada
  });

  // Estado para controlar a validação do código 2FA
  const [codigo2FAValidado, setCodigo2FAValidado] = useState({
    digitado: false, // True quando o usuário já digitou algum código
    valido: false // True quando o código tem 6 dígitos numéricos
  });
  
  // WebSocket para gerenciar sessões
  const {
    data: sessoes,
    loading: isLoadingSessoes,
    deleteItem: deleteSessao,
    refetch: refetchSessoes
  } = useWebSocketData<SessaoData>({
    endpoint: '/api/conta/sessoes',
    resource: 'sessoes'
  });

  // Formulário para alteração de senha
  const alterarSenhaForm = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      senhaAtual: '',
      novaSenha: '',
      confirmarSenha: ''
    },
    mode: "onChange"
  });

  // Formulário para 2FA
  const enable2FAForm = useForm<Enable2FAData>({
    resolver: zodResolver(enable2FASchema),
    defaultValues: {
      codigo: ''
    }
  });

  // Mostrar notificação sobre 2FA quando o componente for carregado e 2FA não estiver ativado
  useEffect(() => {
    // Primeira vez que o componente carrega
    const timeoutId = setTimeout(() => {
      setVerificando2FAStatus(false);

      // Se 2FA não estiver habilitado, mostrar notificação
      if (!is2FAEnabled) {
        toast({
          title: "Melhore a segurança da sua conta",
          description: "Ative a autenticação de dois fatores para proteger melhor seus dados",
          variant: "default",
        });
      }
    }, 1500); // Aguarda 1,5 segundos para simular verificação

    return () => clearTimeout(timeoutId);
  }, [is2FAEnabled, toast]);

  // Verificar status do 2FA ao carregar o componente
  useEffect(() => {
    verificar2FAStatus();
  }, []);

  // Função para verificar status do 2FA
  const verificar2FAStatus = async () => {
    try {
      const response = await fetch('/api/conta/2fa/status', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setIs2FAEnabled(data.enabled || false);
      }
    } catch (error) {
      console.error('Erro ao verificar status do 2FA:', error);
    }
  };

  // Monitorar os campos do formulário para validação quando perder foco
  useEffect(() => {
    const subscription = alterarSenhaForm.watch(async (value, { name, type }) => {
      // Evitar loops infinitos - só processar mudanças reais
      if (!value || !name) return;

      // Validar senha atual apenas quando perder o foco
      if (name === 'senhaAtual' && type === 'blur') {
        // Se o campo estiver vazio, não fazemos validação
        if (!value.senhaAtual?.trim()) {
          setCamposSenhaValidados(prev => ({
            ...prev,
            senhaAtualVerificada: false
          }));
          return;
        }

        try {
          // Verificação simplificada - apenas se a senha está correta ou não
          const response = await fetch('/api/password/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              password: value.senhaAtual || ''
            })
          });

          const result = await response.json();
          const isPasswordCorrect = result.success;

          console.log(`Verificação de senha: ${isPasswordCorrect ? 'CORRETA ✓' : 'INCORRETA ✗'}`);

          // Atualiza o estado com o resultado da validação
          setCamposSenhaValidados(prev => ({
            ...prev,
            senhaAtual: isPasswordCorrect, // True quando a senha estiver correta
            senhaAtualVerificada: true, // Indicar que a verificação foi realizada
          }));

        } catch (error) {
          console.error('Erro ao validar senha:', error);
          setCamposSenhaValidados(prev => ({
            ...prev,
            senhaAtual: false,
            senhaAtualVerificada: true
          }));
        }
      }

      // Verificar se nova senha é igual à atual (VALIDAÇÃO RIGOROSA)
      if (name === 'novaSenha' && type === 'change' && value.senhaAtual && value.novaSenha) {
        // Nova senha deve ser diferente da atual
        const senhasDiferentes = value.senhaAtual !== value.novaSenha;

        // Evitar chamar setError se já tem erro para evitar loop
        const currentError = alterarSenhaForm.formState.errors.novaSenha;

        if (!senhasDiferentes && !currentError) {
          // Usar setTimeout para evitar loop de renderização
          setTimeout(() => {
            alterarSenhaForm.setError('novaSenha', {
              type: 'manual',
              message: 'A nova senha não pode ser igual à senha atual'
            });
          }, 0);

          // Atualizar estado de validação
          setCamposSenhaValidados(prev => ({
            ...prev,
            senhasIguais: false
          }));
        } else if (senhasDiferentes) {
          // Limpar erro se as senhas agora são diferentes
          if (currentError) {
            alterarSenhaForm.clearErrors('novaSenha');
          }

          // Se a nova senha for diferente da atual, atualizar o estado
          setCamposSenhaValidados(prev => ({
            ...prev,
            senhasIguais: true
          }));
        }
      }

      // Verificar se a confirmação corresponde à nova senha (VALIDAÇÃO RIGOROSA)
      if (name === 'confirmarSenha' || name === 'novaSenha') {
        // Caso 1: Se a nova senha estiver vazia mas a confirmação preenchida,
        // isso é um erro e as senhas não conferem
        if (!value.novaSenha || value.novaSenha.trim() === '') {
          if (value.confirmarSenha && value.confirmarSenha.trim() !== '') {
            setCamposSenhaValidados(prev => ({
              ...prev,
              confirmacaoCorreta: false,
              novaSenha: false // Marcar nova senha como inválida também
            }));
          }
        } 
        // Caso 2: Se ambos os campos estiverem preenchidos, verificar se são iguais
        else if (value.novaSenha && value.confirmarSenha && value.novaSenha !== value.confirmarSenha) {
          setCamposSenhaValidados(prev => ({
            ...prev,
            confirmacaoCorreta: false
          }));
        } 
        // Caso 3: Se ambos os campos estiverem preenchidos e forem iguais
        else if (value.novaSenha && value.confirmarSenha && value.novaSenha === value.confirmarSenha) {
          setCamposSenhaValidados(prev => ({
            ...prev,
            confirmacaoCorreta: true
          }));
        }
        // Caso 4: Se a nova senha estiver preenchida mas a confirmação ainda não
        else if (value.novaSenha && (!value.confirmarSenha || value.confirmarSenha.trim() === '')) {
          // Não fazemos nada aqui, mantemos o estado atual
        }
      }

      // Verificar preenchimento dos campos - NÃO VALIDAMOS SENHA ATUAL AQUI
      if (name === 'senhaAtual' && type !== 'blur') {
        // Não validamos a senha atual aqui, apenas quando perder o foco
        // Porém podemos resetar o estado de verificação quando o usuário começa a digitar novamente
        if (camposSenhaValidados.senhaAtualVerificada) {
          setCamposSenhaValidados(prev => ({
            ...prev,
            senhaAtualVerificada: false // Reset da validação quando começa a digitar novamente
          }));
        }
      } else if (name === 'novaSenha') {
        // Quando a nova senha é alterada, precisamos revalidar a confirmação
        const confirmacaoCorreta = value.novaSenha === value.confirmarSenha;
        setCamposSenhaValidados(prev => ({
          ...prev,
          novaSenha: value.novaSenha?.trim() !== '',
          confirmacaoCorreta: value.confirmarSenha?.trim() !== '' ? confirmacaoCorreta : prev.confirmacaoCorreta
        }));
      } else if (name === 'confirmarSenha') {
        // Quando a confirmação é alterada, precisamos verificar se confere com a nova senha
        const confirmacaoCorreta = value.novaSenha === value.confirmarSenha;
        setCamposSenhaValidados(prev => ({
          ...prev,
          confirmarSenha: value.confirmarSenha?.trim() !== '',
          confirmacaoCorreta: value.confirmarSenha?.trim() !== '' ? confirmacaoCorreta : prev.confirmacaoCorreta
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, [alterarSenhaForm, camposSenhaValidados.senhaAtualVerificada]);

  // Limpar validações ao alternar entre abas ou ao fechar seções
  useEffect(() => {
    // Se a seção de senha foi fechada, limpar a validação
    // IMPORTANTE: Só limpar quando não há erro ativo E quando o formulário foi fechado intencionalmente
    if (!showPasswordSection && !erroSenha && !isSubmitting) {
      // Redefinir estado de validação para valores iniciais
      setCamposSenhaValidados({
        senhaAtual: false,
        novaSenha: false,
        confirmarSenha: false,
        senhasIguais: false,
        confirmacaoCorreta: false,
        senhaAtualVerificada: false
      });

      // Resetar formulário
      alterarSenhaForm.reset({
        senhaAtual: '',
        novaSenha: '',
        confirmarSenha: ''
      });
    }

    // Se a seção de 2FA foi fechada, limpar a validação
    if (!show2FASection) {
      setCodigo2FAValidado({
        digitado: false,
        valido: false
      });

      // Resetar apenas o campo de código
      enable2FAForm.setValue('codigo', '');
    }
  }, [showPasswordSection, show2FASection, erroSenha, isSubmitting, alterarSenhaForm, enable2FAForm]);

  // Função para alterar senha
  const alterarSenha = async (data: ChangePasswordData) => {
    setCarregandoSenha(true);
    setErroSenha(null);
    setSucessoSenha(false);

    try {
      const response = await fetch('/api/conta/alterar-senha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao alterar senha');
      }

      setSucessoSenha(true);
      setShowPasswordSection(false);
      alterarSenhaForm.reset();
      
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso",
        variant: "default"
      });
    } catch (error: any) {
      setErroSenha(error.message);
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCarregandoSenha(false);
    }
  };

  // Função para iniciar 2FA
  const iniciar2FA = async () => {
    setCarregando2FA(true);
    setErro2FA(null);

    try {
      const response = await fetch('/api/conta/2fa/iniciar', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao iniciar 2FA: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.otpauthUrl && data.secret) {
        setQrCode2FA(data.otpauthUrl);
        setSecret2FA(data.secret);
        setShow2FASection(true);
      } else {
        throw new Error("Dados incompletos recebidos do servidor");
      }
    } catch (error: any) {
      setErro2FA('Não foi possível iniciar a configuração do 2FA. Tente novamente mais tarde.');
      toast({
        title: "Erro ao iniciar 2FA",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCarregando2FA(false);
    }
  };

  // Função para ativar 2FA
  const ativar2FA = async (data: Enable2FAData) => {
    if (!secret2FA) {
      setErro2FA('Secret não informado para ativação do 2FA');
      return;
    }

    setCarregando2FA(true);
    setErro2FA(null);

    try {
      const response = await fetch('/api/conta/2fa/ativar', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          codigo: data.codigo,
          secret: secret2FA
        })
      });

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.message || 'Código inválido ou expirado');
      }

      // Reset dos campos do 2FA
      setCodigo2FA('');
      setQrCode2FA(null);
      setSecret2FA(null);
      enable2FAForm.reset();

      // Atualiza o estado do 2FA
      setIs2FAEnabled(true);
      setSucesso2FA(true);
      setShow2FASection(false);

      toast({
        title: "2FA ativado",
        description: "A autenticação em dois fatores foi ativada com sucesso",
        variant: "default"
      });
    } catch (error: any) {
      setErro2FA(error.message);
      toast({
        title: "Erro ao ativar 2FA",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCarregando2FA(false);
    }
  };

  // Função para desativar 2FA
  const desativar2FA = async () => {
    setCarregando2FA(true);
    setErro2FA(null);

    try {
      const response = await fetch('/api/conta/2fa/desativar', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao desativar 2FA: ${response.status}`);
      }

      setIs2FAEnabled(false);
      
      toast({
        title: "2FA desativado",
        description: "A autenticação em dois fatores foi desativada com sucesso",
        variant: "default"
      });
    } catch (error: any) {
      setErro2FA('Não foi possível desativar o 2FA. Tente novamente mais tarde.');
      toast({
        title: "Erro ao desativar 2FA",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCarregando2FA(false);
    }
  };

  // Submissão de formulário de 2FA
  const handleAtivacao2FA = async (data: Enable2FAData) => {
    console.log("Dados recebidos no formulário 2FA:", data);

    const codigo = data.codigo?.trim();

    // Verificar se temos o código
    if (!codigo || codigo.length !== 6) {
      console.log("Código inválido: vazio ou não tem 6 dígitos:", codigo);
      setCodigo2FAValidado({
        digitado: true,
        valido: false
      });
      return;
    }

    const isValid = /^\d{6}$/.test(codigo);
    console.log("Código é válido?", isValid, "Código:", codigo);

    setCodigo2FAValidado({
      digitado: true,
      valido: isValid
    });

    if (!isValid) {
      toast({
        title: "Código inválido",
        description: "O código deve conter 6 dígitos numéricos",
        variant: "destructive"
      });
      return;
    }

    try {
      await ativar2FA({
        codigo: codigo
      });

      // Limpar o código após tentativa
      enable2FAForm.setValue('codigo', '');

    } catch (error) {
      console.error("Erro na ativação do 2FA:", error);
      toast({
        title: "Erro",
        description: "Não foi possível ativar o 2FA. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Gerenciamento de erros e sucessos com toast
  useEffect(() => {
    if (erroSenha) {
      // Parar o loading e não fechar o formulário
      setIsSubmitting(false);

      // Verificar se o erro é relacionado à senha atual
      if (erroSenha.includes('senha atual') || erroSenha.includes('senha incorreta') || erroSenha.includes('current password')) {
        // Colocar foco no campo de senha atual
        setTimeout(() => {
          const senhaAtualInput = document.getElementById('senha-atual');
          if (senhaAtualInput) {
            senhaAtualInput.focus();
          }
        }, 100);

        // Marcar senha atual como incorreta
        setCamposSenhaValidados(prev => ({
          ...prev,
          senhaAtual: false,
          senhaAtualVerificada: true
        }));
      }

      // IMPORTANTE: GARANTIR que o formulário permaneça aberto apenas se o usuário não cancelou
      // Forçar o formulário a permanecer visível quando há erro, mas não se o usuário cancelou
      if (!showPasswordSection && !userCancelled) {
        setShowPasswordSection(true);
      }
    }
  }, [erroSenha, showPasswordSection, userCancelled]);

  // Função para encerrar sessão
  const handleEncerrarSessao = async (sessao: SessaoData) => {
    setCarregandoEncerramento(sessao.id);
    
    try {
      await deleteSessao(sessao.id);
      
      toast({
        title: "Sessão encerrada",
        description: "A sessão foi encerrada com sucesso",
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao encerrar sessão",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCarregandoEncerramento(null);
      setSessaoParaExcluir(null);
    }
  };

  const handleSubmit = alterarSenhaForm.handleSubmit(async (data) => {
    // Ativar o preloader do botão imediatamente
    setIsSubmitting(true);

    // Validação básica do formulário
    const valores = alterarSenhaForm.getValues();

    // Verificação simplificada - campos obrigatórios
    if (!valores.senhaAtual?.trim() || !valores.novaSenha?.trim() || !valores.confirmarSenha?.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Todos os campos de senha devem ser preenchidos",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }

    // Verificar se nova senha é diferente da atual
    if (valores.senhaAtual === valores.novaSenha) {
      toast({
        title: "Senha inválida",
        description: "A nova senha deve ser diferente da senha atual",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }

    // Verificar se a senha contém caracteres especiais
    const contemCaracterEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(valores.novaSenha);
    if (!contemCaracterEspecial) {
      toast({
        title: "Senha inválida",
        description: "A senha deve conter pelo menos um caractere especial",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }

    // Verificar se confirmação corresponde à nova senha
    if (valores.novaSenha !== valores.confirmarSenha) {
      toast({
        title: "Senhas não conferem",
        description: "A confirmação da senha deve ser igual à nova senha",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await alterarSenha(data);

      // APENAS quando o salvamento for 100% bem-sucedido:
      // Resetar o formulário
      alterarSenhaForm.reset();

      // Redefinir estado de validação para valores iniciais
      setCamposSenhaValidados({
        senhaAtual: false,
        novaSenha: false,
        confirmarSenha: false,
        senhasIguais: false,
        confirmacaoCorreta: false,
        senhaAtualVerificada: false
      });

      // Fechar a seção apenas em caso de sucesso
      setShowPasswordSection(false);

      // Desativar loading apenas no sucesso
      setIsSubmitting(false);

    } catch (error) {
      // Em caso de erro, mantém os inputs visíveis e não reseta o formulário
      console.error("Erro ao alterar senha:", error);

      // IMPORTANTE: Parar o loading imediatamente em caso de erro
      setIsSubmitting(false);

      // Verificar se o erro é de senha atual incorreta
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('senha atual') || errorMessage.includes('senha incorreta') || errorMessage.includes('current password')) {
        // Colocar foco no campo de senha atual
        setTimeout(() => {
          const senhaAtualInput = document.getElementById('senha-atual');
          if (senhaAtualInput) {
            senhaAtualInput.focus();
          }
        }, 100);

        // Marcar senha atual como incorreta
        setCamposSenhaValidados(prev => ({
          ...prev,
          senhaAtual: false,
          senhaAtualVerificada: true
        }));
      }

      // NÃO fechar o formulário - manter aberto para correções
      // setShowPasswordSection permanece true para manter o formulário visível
    }
  });

  // Paginação das sessões
  const totalPages = Math.ceil(sessoes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSessoes = sessoes.slice(startIndex, startIndex + itemsPerPage);

  // Reset da página quando itens por página mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle>Segurança da Conta</CardTitle>
        <CardDescription>
          Gerencie sua senha e segurança da conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Separador após descrição */}
          <Separator />

          {/* Seção: Alteração de Senha */}
          <div>
            <h3 className="text-lg font-medium">Alteração de Senha</h3>
            <p className="text-sm text-gray-500 mt-1">Atualize sua senha periodicamente para maior segurança</p>

            {!showPasswordSection ? (
              <Button 
                onClick={() => {
                  setShowPasswordSection(true);
                  setUserCancelled(false); // Resetar o estado de cancelamento
                }}
                className="mt-4 bg-purple-600 hover:bg-purple-700"
              >
                <Shield className="mr-2 h-4 w-4" />
                Alterar Senha
              </Button>
            ) : (
              <div className="mt-4 space-y-4 border rounded-lg p-6">
                <Form {...alterarSenhaForm}>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={alterarSenhaForm.control}
                        name="senhaAtual"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel htmlFor="senha-atual" className={camposSenhaValidados.senhaAtualVerificada && !camposSenhaValidados.senhaAtual ? 'text-red-500 font-semibold' : camposSenhaValidados.senhaAtual ? 'text-green-500 font-semibold' : ''}>
                              Senha Atual <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  id="senha-atual"
                                  type={showCurrentPassword ? "text" : "password"} 
                                  placeholder="Digite sua senha atual"
                                  className={`w-full ${
                                    // Estado neutro - quando o campo ainda não foi validado
                                    !camposSenhaValidados.senhaAtualVerificada ? '' 
                                    // Quando a senha está correta (após verificação)
                                    : camposSenhaValidados.senhaAtual
                                      ? 'border-green-500 ring-1 ring-green-500 focus:ring-green-500 focus-visible:ring-green-500'
                                    // Quando a senha está incorreta (após verificação)
                                    : 'border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus-visible:ring-red-500'
                                  }`}
                                  {...field}
                                />
                                <button 
                                  type="button"
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                >
                                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>
                            {/* Exibe mensagem apenas depois da verificação ter ocorrido */}
                            {camposSenhaValidados.senhaAtualVerificada && (
                              <>
                                {camposSenhaValidados.senhaAtual ? (
                                  <p className="mt-1 text-green-500 text-xs flex items-center">
                                    <CheckCircle className="w-3 h-3 mr-1" /> Senha atual correta
                                  </p>
                                ) : (
                                  <p className="mt-1 text-red-500 text-xs flex items-center">
                                    Senha atual incorreta
                                  </p>
                                )}
                              </>
                            )}
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={alterarSenhaForm.control}
                        name="novaSenha"
                        render={({ field }) => (
                          <FormItem className="space-y-2 min-h-[90px]">
                            <FormLabel htmlFor="nova-senha" className={
                              (!camposSenhaValidados.novaSenha || !camposSenhaValidados.senhasIguais) && field.value?.trim() !== '' 
                              ? 'text-red-500 font-semibold' 
                              : field.value?.trim() !== '' && 
                                field.value.length >= 8 && 
                                /[A-Z]/.test(field.value) && 
                                /[a-z]/.test(field.value) && 
                                /[0-9]/.test(field.value) &&
                                /[!@#$%^&*(),.?":{}|<>]/.test(field.value) &&
                                camposSenhaValidados.senhasIguais
                              ? 'text-green-500 font-semibold'
                              : ''
                            }>
                              Nova Senha <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  id="nova-senha"
                                  type={showNewPassword ? "text" : "password"} 
                                  placeholder="Digite sua nova senha"
                                  className={`w-full ${
                                    (!camposSenhaValidados.novaSenha && field.value?.trim() !== '') ||
                                    (!camposSenhaValidados.senhasIguais && field.value?.trim() !== '') 
                                      ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus-visible:ring-red-500' 
                                      : field.value?.trim() !== '' && 
                                        field.value.length >= 8 && 
                                        /[A-Z]/.test(field.value) && 
                                        /[a-z]/.test(field.value) && 
                                        /[0-9]/.test(field.value) &&
                                        /[!@#$%^&*(),.?":{}|<>]/.test(field.value) &&
                                        camposSenhaValidados.senhasIguais
                                        ? 'border-green-500 ring-1 ring-green-500 focus:ring-green-500 focus-visible:ring-green-500'
                                        : ''
                                  }`}
                                  {...field}
                                />
                                <button 
                                  type="button"
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>
                            {field.value?.trim() !== '' && (
                              <div className="mt-2">
                                {field.value.length < 8 ? (
                                  <p className="text-xs text-red-500 flex items-center">
                                    Mínimo de 8 caracteres
                                  </p>
                                ) : !(/[A-Z]/.test(field.value)) ? (
                                  <p className="text-xs text-red-500 flex items-center">
                                    Pelo menos uma letra maiúscula
                                  </p>
                                ) : !(/[a-z]/.test(field.value)) ? (
                                  <p className="text-xs text-red-500 flex items-center">
                                    Pelo menos uma letra minúscula
                                  </p>
                                ) : !(/[0-9]/.test(field.value)) ? (
                               <p className="text-xs text-red-500 flex items-center">
                                    Pelo menos um número
                                  </p>
                                ) : !(/[!@#$%^&*(),.?":{}|<>]/.test(field.value)) ? (
                                  <p className="text-xs text-red-500 flex items-center">
                                    Pelo menos um caractere especial
                                  </p>
                                ) : !camposSenhaValidados.senhasIguais ? (
                                  <p className="text-xs text-red-500 flex items-center">
                                    Deve ser diferente da senha atual
                                  </p>
                                ) : (
                                  <p className="text-xs text-green-500 flex items-center">
                                    <CheckCircle className="w-3 h-3 mr-1" /> Senha válida
                                  </p>
                                )}
                              </div>
                            )}
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={alterarSenhaForm.control}
                        name="confirmarSenha"
                        render={({ field }) => (
                          <FormItem className="space-y-2 min-h-[90px]">
                            <FormLabel htmlFor="confirmar-senha" className={
                              !camposSenhaValidados.confirmacaoCorreta && field.value?.trim() !== '' && 
                              alterarSenhaForm.getValues().novaSenha?.trim() !== '' 
                              ? 'text-red-500 font-semibold' 
                              : field.value?.trim() !== '' && camposSenhaValidados.confirmacaoCorreta
                              ? 'text-green-500 font-semibold'
                              : ''
                            }>
                              Confirmar Senha <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  id="confirmar-senha"
                                  type={showConfirmPassword ? "text" : "password"} 
                                  placeholder="Confirme sua nova senha"
                                  className={`w-full ${
                                    !camposSenhaValidados.confirmacaoCorreta && field.value?.trim() !== '' 
                                      ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus-visible:ring-red-500' 
                                      : field.value?.trim() !== '' && camposSenhaValidados.confirmacaoCorreta
                                        ? 'border-green-500 ring-1 ring-green-500 focus:ring-green-500 focus-visible:ring-green-500'
                                        : ''
                                  }`}
                                  {...field}
                                />
                                <button 
                                  type="button"
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>
                            {field.value?.trim() !== '' && (
                              <>
                                {!camposSenhaValidados.confirmacaoCorreta ? (
                                  <p className="mt-1 text-red-500 text-xs flex items-center">
                                    As senhas não conferem
                                  </p>
                                ) : (
                                  <p className="mt-1 text-green-500 text-xs flex items-center">
                                    <CheckCircle className="w-3 h-3 mr-1" /> As senhas conferem
                                  </p>
                                )}
                              </>
                            )}
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={() => {
                          // Redefinir o formulário e estados de validação
                          alterarSenhaForm.reset({
                            senhaAtual: '',
                            novaSenha: '',
                            confirmarSenha: ''
                          });

                          // Redefinir estado de validação para valores iniciais
                          setCamposSenhaValidados({
                            senhaAtual: false,
                            novaSenha: false,
                            confirmarSenha: false,
                            senhasIguais: false,
                            confirmacaoCorreta: false,
                            senhaAtualVerificada: false
                          });

                          // Marcar que o usuário cancelou intencionalmente
                          setUserCancelled(true);

                          // Fechar a seção
                          setShowPasswordSection(false);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        className={`transition-all duration-200 ${
                          isSubmitting || carregandoSenha 
                            ? "bg-purple-400 cursor-not-allowed" 
                            : "bg-purple-600 hover:bg-purple-700 active:bg-purple-800"
                        }`}
                        disabled={isSubmitting || carregandoSenha}
                      >
                        {isSubmitting || carregandoSenha ? (
                          <span className="flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Atualizando...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <Lock className="mr-2 h-4 w-4" />
                            Atualizar Senha
                          </span>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}
          </div>

          <Separator />

          {/* Seção: Autenticação de Dois Fatores */}
          <div>
            <h3 className="text-lg font-medium">Autenticação de Dois Fatores (2FA)</h3>
            <p className="text-sm text-gray-500 mt-1">Adicione uma camada extra de segurança à sua conta</p>

            {verificando2FAStatus ? (
              <div className="mt-4 flex items-center space-x-3 p-4 border rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                <span className="text-sm">Verificando status do 2FA...</span>
              </div>
            ) : !is2FAEnabled ? (
              <>
                {!show2FASection ? (
                  <Button 
                    onClick={iniciar2FA}
                    className="mt-4 bg-purple-600 hover:bg-purple-700"
                    disabled={carregando2FA}
                  >
                    {carregando2FA ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Iniciando...
                      </>
                    ) : (
                      <>
                        <Smartphone className="mr-2 h-4 w-4" />
                        Ativar 2FA
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="mt-4 space-y-4 border rounded-lg p-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">1. Escaneie o QR Code</h4>
                        <p className="text-sm text-gray-500 mb-4">
                          Use um aplicativo de autenticação como Google Authenticator, Authy ou Microsoft Authenticator 
                          para escanear o QR code abaixo.
                        </p>

                        {qrCode2FA ? (
                          <div className="flex flex-col items-center mb-4">
                            <img 
                              src={qrCode2FA} 
                              alt="QR Code para 2FA" 
                              className="border p-2 rounded-lg mb-3"
                              width="200"
                              height="200"
                              onError={(e) => {
                                // Garantir que o elemento é um HTMLElement
                                const imgElement = e.currentTarget as HTMLImageElement;
                                imgElement.style.display = 'none';

                                // Verificar se o elemento seguinte existe e é um HTMLElement
                                const nextElement = imgElement.nextElementSibling;
                                if (nextElement instanceof HTMLElement) {
                                  nextElement.style.display = 'flex';
                                }
                              }}
                              style={{
                                backgroundColor: 'white',
                                padding: '12px'
                              }}
                            />
                            <div className="border p-2 rounded-lg mb-3 flex items-center justify-center" style={{display: 'none'}}>
                              <div className="w-48 h-48 flex items-center justify-center text-center p-4">
                                <div className="flex flex-col items-center">
                                  <AlertTriangle className="text-yellow-500 mb-2" size={24} />
                                  <p>QR Code indisponível.</p>
                                  <p>Use o código secreto abaixo para configuração manual.</p>
                                </div>
                              </div>
                            </div>

                            {/* Código secreto para copiar manualmente - Sempre exibir quando houver QR code */}
                            <div className="w-full max-w-md">
                              <p className="text-sm text-gray-500 mb-2">Código secreto (alternativa ao QR code):</p>
                              <div className="flex">
                                <div className="border rounded-l-md bg-gray-50 flex-1 p-2 font-mono text-sm overflow-x-auto">
                                  {secret2FA || 'Carregando...'}
                                </div>
                                <button
                                  type="button"
                                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 rounded-r-md flex items-center"
                                  onClick={() => {
                                    if (secret2FA) {
                                      navigator.clipboard.writeText(secret2FA);
                                      toast({
                                        title: "Código copiado",
                                        description: "O código secreto foi copiado para a área de transferência",
                                        variant: "default"
                                      });
                                    }
                                  }}
                                  disabled={!secret2FA}
                                >
                                  Copiar
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-center items-center h-40 mb-4">
                            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">2. Digite o código de verificação</h4>
                        <p className="text-sm text-gray-500 mb-4">
                          Digite o código de 6 dígitos gerado pelo aplicativo para verificar a configuração.
                        </p>

                        <Form {...enable2FAForm}>
                          <form onSubmit={enable2FAForm.handleSubmit(handleAtivacao2FA)} className="space-y-4">
                            <FormField
                              control={enable2FAForm.control}
                              name="codigo"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={codigo2FAValidado.digitado ? (codigo2FAValidado.valido ? 'text-green-500 font-semibold' : 'text-red-500 font-semibold') : ''}>
                                    Código de Verificação <span className="text-red-500">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Input 
                                        type={show2FACode ? "text" : "password"} 
                                        maxLength={6}
                                        pattern="[0-9]*"
                                        inputMode="numeric"
                                        placeholder="Digite o código de 6 dígitos"
                                        className={codigo2FAValidado.digitado ? (
                                          codigo2FAValidado.valido
                                            ? 'border-green-500 ring-1 ring-green-500 focus:ring-green-500 focus-visible:ring-green-500'
                                            : 'border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus-visible:ring-red-500'
                                        ) : ''}
                                        {...field}
                                        onChange={(e) => {
                                          // Permitir apenas dígitos
                                          const value = e.target.value.replace(/\D/g, '');
                                          field.onChange(value);

                                          // Validar o código
                                          const isValid = value.length === 6 && /^\d{6}$/.test(value);
                                          setCodigo2FAValidado({
                                            digitado: value.length > 0,
                                            valido: isValid
                                          });
                                        }}
                                      />
                                      <button 
                                        type="button"
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        onClick={() => setShow2FACode(!show2FACode)}
                                      >
                                        {show2FACode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                      </button>
                                    </div>
                                  </FormControl>
                                  {codigo2FAValidado.digitado && (
                                    <div className="flex items-center mt-1 text-sm">
                                      {codigo2FAValidado.valido ? (
                                        <div className="flex items-center text-green-500">
                                          <CheckCircle className="mr-1 h-4 w-4" />
                                          <span>Código válido</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center text-red-500">
                                          <AlertTriangle className="mr-1 h-4 w-4" />
                                          <span>O código deve conter 6 dígitos numéricos</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </FormItem>
                              )}
                            />
                            <div className="flex justify-end gap-2 mt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  // Limpar o campo de código e resetar a validação
                                  enable2FAForm.reset({
                                    codigo: ''
                                  });

                                  // Resetar o estado de validação
                                  setCodigo2FAValidado({
                                    digitado: false,
                                    valido: false
                                  });

                                  // Fechar a seção
                                  setShow2FASection(false);
                                }}
                              >
                                Cancelar
                              </Button>
                              <Button 
                                type="submit"
                                className="bg-purple-600 hover:bg-purple-700"
                                disabled={carregando2FA}
                              >
                                {carregando2FA ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verificando...
                                  </>
                                ) : (
                                  "Verificar e Ativar"
                                )}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-4 flex flex-col space-y-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex items-start">
                  <div className="bg-green-100 p-2 rounded-full mr-3">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-green-800">2FA está ativado</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Sua conta está protegida com autenticação de dois fatores. A cada login, 
                      você precisará digitar um código gerado pelo seu aplicativo de autenticação.
                    </p>
                  </div>
                </div>

                <Button 
                  variant="destructive" 
                  className="w-fit"
                  onClick={desativar2FA}
                  disabled={carregando2FA}
                >
                  {carregando2FA ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Desativando...
                    </>
                  ) : (
                    "Desativar 2FA"
                  )}
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Seção: Sessões Ativas */}
          <div>
            <h3 className="text-lg font-medium">Sessões Ativas</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">Gerencie os dispositivos conectados à sua conta</p>

            {isLoadingSessoes ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  <span className="ml-2 text-sm text-gray-500">Carregando sessões...</span>
                </div>
              ) : sessoes && sessoes.length > 0 ? (
                  <div className="space-y-4">
                    {paginatedSessoes.map((sessao: any, index: number) => (
                      <div key={sessao.id || index} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-white rounded-lg border">
                            {sessao.current ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : sessao.deviceType === 'mobile' ? (
                              <Smartphone className="h-5 w-5 text-gray-600" />
                            ) : (
                              <Shield className="h-5 w-5 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">
                                ID: {sessao.userId || 'N/A'} - {sessao.nomeUsuario || sessao.username}
                              </span>
                              {sessao.current && (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                                  Sessão atual
                                </span>
                              )}
                              {!sessao.current && !sessao.isActive && (
                                <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                                  Inativa
                                </span>
                              )}
                              {!sessao.current && sessao.status === 'expired' && (
                                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                                  Expirada
                                </span>
                              )}
                              {!sessao.current && sessao.isActive && sessao.status === 'active' && (
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                                  Ativa
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              <strong>Dispositivo:</strong> {(() => {
                                const userAgent = sessao.deviceInfo || '';
                                if (userAgent.includes('Windows NT 10.0')) return 'Windows 10';
                                if (userAgent.includes('Windows NT 6.3')) return 'Windows 8.1';
                                if (userAgent.includes('Windows NT 6.1')) return 'Windows 7';
                                if (userAgent.includes('Mac OS X')) return 'macOS';
                                if (userAgent.includes('X11') || userAgent.includes('Linux')) return 'Linux';
                                if (userAgent.includes('Android')) return 'Android';
                                if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
                                return 'Sistema desconhecido';
                              })()} - {sessao.browser || 'Navegador desconhecido'}
                            </div>

                            <div className="text-sm text-gray-500">
                              <strong>IP:</strong> {sessao.ip || 'Não disponível'}
                            </div>
                            <div className="text-sm text-gray-500">
                              <strong>Última atividade:</strong> {sessao.activityText || 'Desconhecida'}
                            </div>
                            {sessao.expiryText && (
                              <div className="text-sm text-gray-500">
                                <strong>Expiração:</strong> {sessao.expiryText}
                              </div>
                            )}
                            <div className="text-sm text-gray-500">
                              <strong>Localização:</strong> {sessao.location || 'Não identificada'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {sessao.current ? (
                            <span className="text-sm text-green-600 font-medium">
                              Esta sessão
                            </span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={carregandoEncerramento === sessao.id}
                              onClick={() => setSessaoParaExcluir(sessao)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {carregandoEncerramento === sessao.id ? (
                                <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
                              ) : (
                                <>
                                  <X className="h-4 w-4 mr-1" />
                                  Encerrar
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {sessoes.length > itemsPerPage && (
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={setItemsPerPage}
                        totalItems={sessoes.length}
                      />
                    )}
                  </div>
                ) : (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <h4 className="text-lg font-medium mb-2">Nenhuma sessão ativa encontrada</h4>
                  <p className="mb-4">As sessões aparecerão aqui quando você fizer login em diferentes dispositivos.</p>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => refetchSessoes()}
                    disabled={isLoadingSessoes}
                  >
                    {isLoadingSessoes ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Recarregar sessões
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>

        {/* AlertDialog para confirmação de exclusão de sessão */}
        <AlertDialog open={sessaoParaExcluir !== null} onOpenChange={(open) => !open && setSessaoParaExcluir(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Encerrar sessão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja encerrar esta sessão?
                <br />
                <span className="font-semibold">
                  {sessaoParaExcluir?.device} - {sessaoParaExcluir?.ip}
                </span>
                <br />
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => sessaoParaExcluir && handleEncerrarSessao(sessaoParaExcluir)}
                className="bg-red-600 hover:bg-red-700"
              >
                Encerrar Sessão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
  );
}
