import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, enable2FASchema, type ChangePasswordData } from "@shared/schema";
import { Loader2, Shield, LogOut, Smartphone, Eye, EyeOff, AlertTriangle, CheckCircle, X, Lock } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Definição de tipo para as props do componente
interface SegurancaTabProps {
  usuarioAtual: { id: number } | null;
  sessoes: any[];
  is2FAEnabled: boolean;
  qrCode2FA: string | null;
  secret2FA: string | null; // Adicionado secret2FA como prop
  erroSenha: string | null;
  sucessoSenha: boolean;
  carregandoSenha: boolean;
  erro2FA: string | null;
  sucesso2FA: boolean;
  carregando2FA: boolean;
  carregandoSessoes: boolean;
  showPasswordSection: boolean;
  show2FASection: boolean;
  setShowPasswordSection: (show: boolean) => void;
  setShow2FASection: (show: boolean) => void;
  alterarSenha: (data: ChangePasswordData) => Promise<void>;
  iniciar2FA: () => Promise<void>;
  ativar2FA: (data: { codigo: string, secret: string }) => Promise<void>;
  desativar2FA: () => Promise<void>;
  encerrarSessao: (sessionId: string) => Promise<void>;
}

const SegurancaTab: React.FC<SegurancaTabProps> = ({
  usuarioAtual,
  sessoes,
  is2FAEnabled,
  qrCode2FA,
  secret2FA,
  erroSenha,
  sucessoSenha,
  carregandoSenha,
  erro2FA,
  sucesso2FA,
  carregando2FA,
  carregandoSessoes,
  showPasswordSection,
  show2FASection,
  setShowPasswordSection,
  setShow2FASection,
  alterarSenha,
  iniciar2FA,
  ativar2FA,
  desativar2FA,
  encerrarSessao
}) => {
  const { toast } = useToast();

  // Estados para controlar a visibilidade das senhas
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Estado local para controlar o preloader do botão, independente do estado do componente pai
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [show2FACode, setShow2FACode] = useState(false);
  // Estado para indicar que estamos verificando o status do 2FA
  const [verificando2FAStatus, setVerificando2FAStatus] = useState(true);
  
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

  // Formulário para alteração de senha
  const alterarSenhaForm = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      senhaAtual: '',
      novaSenha: '',
      confirmarSenha: ''
    },
    mode: "onChange" // Ativar validação durante a digitação
  });

  // Função para validar os campos do formulário
  const validarCamposSenha = async () => {
    const valores = alterarSenhaForm.getValues();
    
    // IMPORTANTE: verificações rigorosas de preenchimento
    // Verificar se os campos estão preenchidos
    const senhaAtualPreenchida = !!valores.senhaAtual && valores.senhaAtual.trim() !== '';
    const novaSenhaPreenchida = !!valores.novaSenha && valores.novaSenha.trim() !== '';
    const confirmacaoPreenchida = !!valores.confirmarSenha && valores.confirmarSenha.trim() !== '';
    
    // IMPORTANTE: Nova senha deve ser DIFERENTE da atual
    // O campo senhasDiferentes === true significa que elas são diferentes, como esperado
    const senhasDiferentes = valores.senhaAtual !== valores.novaSenha;
    
    // IMPORTANTE: Confirmação deve ser IGUAL à nova senha
    // O campo confirmacaoCorreta === true significa que elas são iguais, como esperado
    const confirmacaoCorreta = valores.novaSenha === valores.confirmarSenha;

    // Verificar senha atual com o servidor
    let senhaAtualCorreta = false;
    
    if (senhaAtualPreenchida) {
      try {
        // Precisamos do ID do usuário para validação rigorosa
        const userId = usuarioAtual?.id;
        
        if (!userId) {
          return false;
        }
        
        const response = await fetch('/api/password/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            password: valores.senhaAtual,
            userId: userId
          })
        });
        
        const result = await response.json();
        // API retorna { success: boolean, message: string }
        senhaAtualCorreta = result.success;
        console.log(`- Senha atual correta: ${senhaAtualCorreta ? 'SIM' : 'NÃO'}`);
      } catch (error) {
        console.error('Erro ao validar senha:', error);
        senhaAtualCorreta = false;
      }
    }

    // Verificar se a nova senha contém caracteres especiais
    const contemCaracterEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(valores.novaSenha || '');
    
    // Atualizar o estado visual dos campos
    setCamposSenhaValidados(prev => ({
      ...prev,
      senhaAtual: senhaAtualCorreta,
      novaSenha: novaSenhaPreenchida,
      confirmarSenha: confirmacaoPreenchida,
      senhasIguais: senhasDiferentes, // true quando diferentes (como esperado)
      confirmacaoCorreta: confirmacaoCorreta,
      senhaAtualVerificada: senhaAtualPreenchida
    }));

    // IMPORTANTE: Verificação final - todos os critérios devem ser atendidos
    const formValido = senhaAtualPreenchida && novaSenhaPreenchida && confirmacaoPreenchida 
                     && senhasDiferentes && confirmacaoCorreta && senhaAtualCorreta
                     && contemCaracterEspecial;
    
    return formValido;
  };

  // Monitorar os campos do formulário para validação quando perder foco
  useEffect(() => {
    const subscription = alterarSenhaForm.watch(async (value, { name, type }) => {
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
          // Precisamos enviar o userId junto com a senha para verificação
          const userId = usuarioAtual?.id;
          
          console.log('Verificando senha para usuário:', userId);
          
          if (!userId) {
            console.error('Erro: ID do usuário não disponível para verificação de senha');
            setCamposSenhaValidados(prev => ({
              ...prev,
              senhaAtual: false,
              senhaAtualVerificada: true
            }));
            return;
          }
          
          // Verificação simplificada - apenas se a senha está correta ou não
          const response = await fetch('/api/password/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              password: value.senhaAtual || '',
              userId: userId
            })
          });

          const result = await response.json();
          // API agora retorna informações simplificadas:
          // { success, message, isComplete }
          
          const isPasswordCorrect = result.success;
          
          console.log(`Verificação de senha: ${isPasswordCorrect ? 'CORRETA ✓' : 'INCORRETA ✗'}`);
          console.log("Resposta:", result);

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
      if (value.senhaAtual && value.novaSenha) {
        // Nova senha deve ser diferente da atual
        const senhasDiferentes = value.senhaAtual !== value.novaSenha;
        
        if (!senhasDiferentes) {
          alterarSenhaForm.setError('novaSenha', {
            type: 'manual',
            message: 'A nova senha não pode ser igual à senha atual'
          });

          // Atualizar estado de validação
          setCamposSenhaValidados(prev => ({
            ...prev,
            senhasIguais: false
          }));

          // Mostrar notificação toast apenas quando o usuário terminar de digitar
          if (name === 'novaSenha' && type === 'change') {
            toast({
              title: "Erro na senha",
              description: "A nova senha não pode ser igual à senha atual",
              variant: "destructive"
            });
          }
        } else {
          // Se a nova senha for diferente da atual, atualizar o estado
          setCamposSenhaValidados(prev => ({
            ...prev,
            senhasIguais: true
          }));
        }
      }

      // Verificar se a confirmação corresponde à nova senha (VALIDAÇÃO RIGOROSA)
      if (value.confirmarSenha || value.novaSenha) {
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
      // IMPORTANTE: Não devemos validar senhaAtual apenas verificando se está preenchida
      // Isso deve ser feito através das verificações de segurança completas
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
  }, [alterarSenhaForm, toast]);

  // Formulário para ativação do 2FA
  const ativar2FAForm = useForm<z.infer<typeof enable2FASchema>>({
    resolver: zodResolver(enable2FASchema),
    defaultValues: {
      codigo: '',
      secret: secret2FA || ''  // Usar secret2FA diretamente
    }
  });

  // Atualiza o valor do secret quando o secret muda
  useEffect(() => {
    if (secret2FA) {
      ativar2FAForm.setValue('secret', secret2FA);
      console.log("Atualizando secret no formulário:", secret2FA);
    }
  }, [secret2FA, ativar2FAForm]);
  
  // Limpar validações ao alternar entre abas ou ao fechar seções
  useEffect(() => {
    // Se a seção de senha foi fechada, limpar a validação
    if (!showPasswordSection) {
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
      
      // Resetar apenas o campo de código, mantendo o secret
      ativar2FAForm.setValue('codigo', '');
    }
  }, [showPasswordSection, show2FASection, alterarSenhaForm, ativar2FAForm]);

  // Submissão de formulário de 2FA
  const handleAtivacao2FA = async (data: z.infer<typeof enable2FASchema>) => {
    console.log("Dados recebidos no formulário 2FA:", data);
    
    const codigo = data.codigo?.trim();
    
    // Verificar se temos o código e o secret
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
      // Verificar se temos o secret
      if (!data.secret) {
        console.error("Secret não fornecido para a ativação do 2FA");
        toast({
          title: "Erro",
          description: "Informações de configuração incompletas. Tente reiniciar o processo.",
          variant: "destructive"
        });
        return;
      }
      
      console.log("Enviando dados para ativação 2FA:", {
        codigo: codigo,
        secret: data.secret
      });
      
      await ativar2FA({
        codigo: codigo,
        secret: data.secret
      });
      
      // Limpar o código após tentativa
      ativar2FAForm.setValue('codigo', '');
      
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
      toast({
        title: "Erro ao alterar senha",
        description: erroSenha,
        variant: "destructive"
      });
    }

    // Notificação de sucesso de senha é gerenciada no componente principal (index.tsx)
    // para evitar notificações duplicadas

    if (erro2FA) {
      toast({
        title: "Erro no 2FA",
        description: erro2FA,
        variant: "destructive"
      });
    }

    if (sucesso2FA) {
      toast({
        title: "2FA ativado",
        description: "Autenticação de dois fatores ativada com sucesso!",
        variant: "default",
        className: "bg-green-100 border-green-300"
      });
    }
  }, [erroSenha, sucessoSenha, erro2FA, sucesso2FA, toast]);

  // Formatação da data para exibição
  const formatarData = (dataString: string) => {
    try {
      const data = new Date(dataString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(data);
    } catch (error) {
      return dataString;
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
      alterarSenhaForm.reset();
      setShowPasswordSection(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar a senha. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      // Sempre desativa o preloader do botão ao finalizar
      setIsSubmitting(false);
    }
  });

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
          {/* Seção: Alteração de Senha */}
          <div>
            <h3 className="text-lg font-medium">Alteração de Senha</h3>
            <p className="text-sm text-gray-500 mt-1">Atualize sua senha periodicamente para maior segurança</p>

            {!showPasswordSection ? (
              <Button 
                onClick={() => setShowPasswordSection(true)}
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
                          // IMPORTANTE: Não definimos senhaAtual como true aqui, 
                          // pois isso causaria um falso positivo na validação
                          setCamposSenhaValidados({
                            senhaAtual: false,
                            novaSenha: false,
                            confirmarSenha: false,
                            senhasIguais: false,
                            confirmacaoCorreta: false,
                            senhaAtualVerificada: false
                          });

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

                        <Form {...ativar2FAForm}>
                          <form onSubmit={(e) => {
                            e.preventDefault();
                            
                            // Verificando secret antes de prosseguir
                            if (!secret2FA) {
                              console.error("Secret não disponível para ativação 2FA");
                              toast({
                                title: "Erro",
                                description: "Informações de configuração incompletas. Tente reiniciar o processo.",
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            // Garantindo que o secret está definido no formulário
                            ativar2FAForm.setValue('secret', secret2FA);
                            
                            // Continuando com o processamento normal
                            ativar2FAForm.handleSubmit(handleAtivacao2FA)(e);
                          }} 
                          className="space-y-4">
                            {/* Campo oculto para o secret */}
                            <input 
                              type="hidden" 
                              name="secret" 
                              value={secret2FA || ''} 
                            />
                            
                            <FormField
                              control={ativar2FAForm.control}
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
                                  {/* Removemos o FormMessage para evitar validação dupla */}
                                </FormItem>
                              )}
                            />
                            <div className="flex justify-end gap-2 mt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  // Limpar o campo de código e resetar a validação
                                  ativar2FAForm.reset({
                                    codigo: '',
                                    secret: secret2FA || ''
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
            <p className="text-sm text-gray-500 mt-1">Gerencie os dispositivos conectados à sua conta</p>

            <div className="mt-4 space-y-4">
              {carregandoSessoes ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : sessoes.length > 0 ? (
                <div className="border rounded-lg divide-y">
                  {sessoes.map((sessao) => (
                    <div key={sessao.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="bg-purple-100 p-2 rounded-full">
                            {sessao.deviceType === 'mobile' ? (
                              <Smartphone className="h-5 w-5 text-purple-600" />
                            ) : (
                              <Shield className="h-5 w-5 text-purple-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <div className="font-medium">{sessao.userAgent || 'Dispositivo desconhecido'}</div>
                              {sessao.current && (
                                <div className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                  Sessão atual
                                </div>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              <div className="flex items-center space-x-4">
                                <span>IP: {sessao.ip || 'Não disponível'}</span>
                                <span>•</span>
                                <span>Criada em: {formatarData(sessao.createdAt)}</span>
                              </div>
                              {sessao.lastActivity && (
                                <div className="text-xs text-gray-400 mt-1">
                                  Última atividade: {formatarData(sessao.lastActivity)}
                                </div>
                              )}
                            </div>
                            {sessao.user && (
                              <div className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded-md">
                                <div className="flex items-center space-x-4">
                                  <span><strong>Usuário:</strong> {sessao.user.username}</span>
                                  <span>•</span>
                                  <span><strong>Email:</strong> {sessao.user.email}</span>
                                </div>
                              </div>
                            )}
                            {sessao.location && (
                              <div className="text-xs text-gray-500 mt-1">
                                <strong>Localização:</strong> {sessao.location}
                              </div>
                            )}
                          </div>
                        </div>

                        {!sessao.current && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 ml-4"
                            onClick={() => encerrarSessao(sessao.id)}
                          >
                            <LogOut className="h-4 w-4 mr-1" />
                            Encerrar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  Nenhuma sessão ativa encontrada.
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SegurancaTab;