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

  // Paginação das sessões
  const totalPages = Math.ceil(sessoes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSessoes = sessoes.slice(startIndex, startIndex + itemsPerPage);

  // Reset da página quando itens por página mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  return (
    <div className="space-y-6">
      {/* Alteração de Senha */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Alteração de Senha
              </CardTitle>
              <CardDescription>
                Mantenha sua conta segura alterando sua senha regularmente
              </CardDescription>
            </div>
            {!showPasswordSection && (
              <Button
                onClick={() => setShowPasswordSection(true)}
                variant="outline"
              >
                Alterar Senha
              </Button>
            )}
          </div>
        </CardHeader>
        
        {showPasswordSection && (
          <CardContent>
            <Form {...alterarSenhaForm}>
              <form onSubmit={alterarSenhaForm.handleSubmit(alterarSenha)} className="space-y-4">
                <FormField
                  control={alterarSenhaForm.control}
                  name="senhaAtual"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha Atual</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Digite sua senha atual"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={alterarSenhaForm.control}
                  name="novaSenha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Digite sua nova senha"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        A senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula e número
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={alterarSenhaForm.control}
                  name="confirmarSenha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Nova Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirme sua nova senha"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {erroSenha && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    {erroSenha}
                  </div>
                )}

                {sucessoSenha && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    Senha alterada com sucesso!
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPasswordSection(false);
                      alterarSenhaForm.reset();
                      setErroSenha(null);
                      setSucessoSenha(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={carregandoSenha}>
                    {carregandoSenha ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Alterando...
                      </>
                    ) : (
                      "Alterar Senha"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        )}
      </Card>

      {/* Autenticação de Dois Fatores */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Autenticação de Dois Fatores (2FA)
              </CardTitle>
              <CardDescription>
                Adicione uma camada extra de segurança à sua conta
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={is2FAEnabled ? "default" : "secondary"}>
                {is2FAEnabled ? "Ativado" : "Desativado"}
              </Badge>
              {!is2FAEnabled && !show2FASection && (
                <Button
                  onClick={iniciar2FA}
                  disabled={carregando2FA}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {carregando2FA ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Smartphone className="mr-2 h-4 w-4" />
                  )}
                  Ativar 2FA
                </Button>
              )}
              {is2FAEnabled && (
                <Button
                  onClick={desativar2FA}
                  disabled={carregando2FA}
                  variant="destructive"
                >
                  {carregando2FA ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <X className="mr-2 h-4 w-4" />
                  )}
                  Desativar 2FA
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {show2FASection && (
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="font-medium mb-2">Escaneie o QR Code</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Use um aplicativo como Google Authenticator ou Authy para escanear o código
                </p>
                
                {qrCode2FA && (
                  <div className="flex justify-center mb-4">
                    <img src={qrCode2FA} alt="QR Code para 2FA" className="border rounded-lg" />
                  </div>
                )}
              </div>

              <Form {...enable2FAForm}>
                <form onSubmit={enable2FAForm.handleSubmit(ativar2FA)} className="space-y-4">
                  <FormField
                    control={enable2FAForm.control}
                    name="codigo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código de Verificação</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Digite o código de 6 dígitos"
                            maxLength={6}
                            className="text-center text-lg tracking-widest"
                          />
                        </FormControl>
                        <FormDescription>
                          Digite o código de 6 dígitos gerado pelo seu aplicativo
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {erro2FA && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      {erro2FA}
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShow2FASection(false);
                        setQrCode2FA(null);
                        setSecret2FA(null);
                        enable2FAForm.reset();
                        setErro2FA(null);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={carregando2FA}>
                      {carregando2FA ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        "Ativar 2FA"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Sessões Ativas */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Sessões Ativas
              </CardTitle>
              <CardDescription>
                Gerencie os dispositivos onde sua conta está conectada
              </CardDescription>
            </div>
            <Button
              onClick={() => refetchSessoes()}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoadingSessoes ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : sessoes.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              Nenhuma sessão ativa encontrada
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedSessoes.map((sessao) => (
                  <div
                    key={sessao.id}
                    className={`border rounded-lg p-4 ${
                      sessao.isCurrentSession ? 'bg-green-50 border-green-200' : 'bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Monitor className="h-4 w-4" />
                          <span className="font-medium">
                            {sessao.device || 'Dispositivo Desconhecido'}
                          </span>
                          {sessao.isCurrentSession && (
                            <Badge variant="default" className="bg-green-600">
                              Sessão Atual
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>IP: {sessao.ip}</p>
                          <p>Local: {sessao.location || 'Localização não disponível'}</p>
                          <p>Criado em: {new Date(sessao.createdAt).toLocaleDateString('pt-BR')}</p>
                          <p>Última atividade: {new Date(sessao.lastActivity).toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                      {!sessao.isCurrentSession && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSessaoParaExcluir(sessao)}
                          disabled={carregandoEncerramento === sessao.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          {carregandoEncerramento === sessao.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

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
            </>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}