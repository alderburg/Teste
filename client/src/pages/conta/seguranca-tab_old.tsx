import { useState, useEffect, useCallback } from "react";
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
import { useWebSocketContext } from "@/components/WebSocketProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

// Definição de tipo para as props do componente
interface SegurancaTabProps {
  usuarioAtual: { id: number } | null;
  is2FAEnabled: boolean;
  qrCode2FA: string | null;
  secret2FA: string | null;
  erroSenha: string | null;
  sucessoSenha: boolean;
  carregandoSenha: boolean;
  erro2FA: string | null;
  sucesso2FA: boolean;
  carregando2FA: boolean;
  showPasswordSection: boolean;
  show2FASection: boolean;
  setShowPasswordSection: (show: boolean) => void;
  setShow2FASection: (show: boolean) => void;
  alterarSenha: (data: ChangePasswordData) => Promise<void>;
  iniciar2FA: () => Promise<void>;
  ativar2FA: (data: { codigo: string, secret: string }) => Promise<void>;
  desativar2FA: () => Promise<void>;
}

const SegurancaTab: React.FC<SegurancaTabProps> = ({
  usuarioAtual,
  is2FAEnabled,
  qrCode2FA,
  secret2FA,
  erroSenha,
  sucessoSenha,
  carregandoSenha,
  erro2FA,
  sucesso2FA,
  carregando2FA,
  showPasswordSection,
  show2FASection,
  setShowPasswordSection,
  setShow2FASection,
  alterarSenha,
  iniciar2FA,
  ativar2FA,
  desativar2FA,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [carregandoEncerramento, setCarregandoEncerramento] = useState<string | null>(null);

  // Estados para controlar a visibilidade das senhas
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estado local para controlar o preloader do botão, independente do estado do componente pai
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [show2FACode, setShow2FACode] = useState(false);

  // Estados para sessões
  const [carregandoSessoes, setCarregandoSessoes] = useState(false);
  const [erroSessoes, setErroSessoes] = useState<any>(null);
  const [sessoes, setSessoes] = useState<any[]>([]);

  // Buscar sessões de usuário
  const buscarSessoes = useCallback(async () => {
    if (!user?.id) return;

    try {
      setCarregandoSessoes(true);
      setErroSessoes(null);
      
      const response = await fetch('/api/user-sessions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Dados das sessões recebidos:', data);
      
      setSessoes(data.sessions || []);
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
      setErroSessoes(error);
    } finally {
      setCarregandoSessoes(false);
    }
  }, [user?.id]);

  // Carregar sessões quando o componente montar
  useEffect(() => {
    buscarSessoes();
  }, [buscarSessoes]);

  // Encerrar sessão específica
  const encerrarSessao = async (sessionId: string) => {
    try {
      setCarregandoEncerramento(sessionId);
      
      const response = await fetch(`/api/user-sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Erro ao encerrar sessão');
      }
      
      toast({
        title: "Sessão encerrada",
        description: "A sessão foi encerrada com sucesso",
      });
      
      // Recarregar sessões
      await buscarSessoes();
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível encerrar a sessão",
        variant: "destructive",
      });
    } finally {
      setCarregandoEncerramento(null);
    }
  };

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
          <Separator />

          {/* Seção: Sessões Ativas */}
          <div>
            <h3 className="text-lg font-medium">Sessões Ativas</h3>
            <p className="text-sm text-gray-500 mt-1">Gerencie os dispositivos conectados à sua conta</p>

            {carregandoSessoes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                <span className="ml-2 text-sm text-gray-500">Carregando sessões...</span>
              </div>
            ) : erroSessoes ? (
              <div className="text-center py-8 text-red-600">
                <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
                <p>Erro ao carregar sessões: {erroSessoes.message || 'Erro desconhecido'}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={buscarSessoes}
                >
                  Tentar novamente
                </Button>
              </div>
            ) : sessoes && sessoes.length > 0 ? (
              <div className="space-y-4 mt-4">
                {sessoes.map((sessao: any, index: number) => (
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
                          <span className="font-medium">{sessao.deviceInfo || 'Dispositivo desconhecido'}</span>
                          {sessao.current && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                              Sessão atual
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          <strong>Navegador:</strong> {sessao.browser || 'Desconhecido'}
                        </div>
                        <div className="text-sm text-gray-500">
                          <strong>IP:</strong> {sessao.ip || 'Não disponível'}
                        </div>
                        <div className="text-sm text-gray-500">
                          <strong>Última atividade:</strong> {sessao.activityText || 'Desconhecida'}
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
                          onClick={() => encerrarSessao(sessao.id)}
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
                  onClick={buscarSessoes}
                  disabled={carregandoSessoes}
                >
                  {carregandoSessoes ? (
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
    </Card>
  );
};

export default SegurancaTab;