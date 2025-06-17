import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isMobileDevice } from "@/lib/utils";
import InputMask from "react-input-mask";
import { changePasswordSchema, enable2FASchema, type ChangePasswordData, type UserSession } from "@shared/schema";
import { 
  Loader2, 
  Shield, 
  User, 
  LogOut, 
  UserCheck, 
  Settings, 
  Key, 
  Smartphone, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  Building,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Camera,
  Save,
  Users,
  DollarSign
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SegurancaTab from "./seguranca-tab";

// Schema para validação do perfil
const perfilSchema = z.object({
  logoUrl: z.string().optional(),
  primeiroNome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  ultimoNome: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  razaoSocial: z.string().min(2, "Razão social é obrigatória"),
  nomeFantasia: z.string().optional(),
  tipoPessoa: z.enum(["fisica", "juridica"]),
  cpfCnpj: z.string().min(11, "CPF/CNPJ é obrigatório"),
  inscricaoEstadual: z.string().optional(),
  inscricaoMunicipal: z.string().optional(),
  cnae: z.string().optional(),
  regimeTributario: z.enum(["simples_nacional", "lucro_presumido", "lucro_real"]),
  atividadePrincipal: z.string().optional(),
  responsavelNome: z.string().min(2, "Nome do responsável é obrigatório"),
  responsavelEmail: z.string().email("Email inválido"),
  responsavelTelefone: z.string().min(10, "Telefone é obrigatório"),
  responsavelSetor: z.string().optional(),
  contadorNome: z.string().optional(),
  contadorEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  contadorTelefone: z.string().optional(),
});

type PerfilFormData = z.infer<typeof perfilSchema>;

export default function PersistentContaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Estados para controle de seções
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [show2FASection, setShow2FASection] = useState(false);

  // Estados para o formulário de perfil
  const perfilForm = useForm<PerfilFormData>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      logoUrl: "",
      primeiroNome: "",
      ultimoNome: "",
      razaoSocial: "",
      nomeFantasia: "",
      tipoPessoa: "juridica",
      cpfCnpj: "",
      inscricaoEstadual: "",
      inscricaoMunicipal: "",
      cnae: "",
      regimeTributario: "simples_nacional",
      atividadePrincipal: "",
      responsavelNome: "",
      responsavelEmail: "",
      responsavelTelefone: "",
      responsavelSetor: "administrativo",
      contadorNome: "",
      contadorEmail: "",
      contadorTelefone: "",
    },
  });

  // Query para buscar dados do perfil
  const { data: perfilData, isLoading: perfilLoading } = useQuery({
    queryKey: ['perfil'],
    queryFn: async () => {
      const response = await fetch('/api/perfil');
      if (!response.ok) throw new Error('Erro ao carregar perfil');
      return response.json();
    },
    enabled: !!user,
  });

  // Query para buscar dados da assinatura
  const { data: assinaturaData } = useQuery({
    queryKey: ['assinatura'],
    queryFn: async () => {
      const response = await fetch('/api/minha-assinatura');
      if (!response.ok) throw new Error('Erro ao carregar assinatura');
      return response.json();
    },
    enabled: !!user,
  });

  // Mutation para salvar perfil
  const savePerfilMutation = useMutation({
    mutationFn: async (data: PerfilFormData) => {
      const response = await fetch('/api/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao salvar perfil');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Perfil atualizado",
        description: "Seus dados foram salvos com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['perfil'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar perfil. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Preencher formulário com dados do perfil
  useEffect(() => {
    if (perfilData) {
      perfilForm.reset({
        logoUrl: perfilData.logoUrl || "",
        primeiroNome: perfilData.primeiroNome || "",
        ultimoNome: perfilData.ultimoNome || "",
        razaoSocial: perfilData.razaoSocial || "",
        nomeFantasia: perfilData.nomeFantasia || "",
        tipoPessoa: perfilData.tipoPessoa || "juridica",
        cpfCnpj: perfilData.cpfCnpj || "",
        inscricaoEstadual: perfilData.inscricaoEstadual || "",
        inscricaoMunicipal: perfilData.inscricaoMunicipal || "",
        cnae: perfilData.cnae || "",
        regimeTributario: perfilData.regimeTributario || "simples_nacional",
        atividadePrincipal: perfilData.atividadePrincipal || "",
        responsavelNome: perfilData.responsavelNome || "",
        responsavelEmail: perfilData.responsavelEmail || "",
        responsavelTelefone: perfilData.responsavelTelefone || "",
        responsavelSetor: perfilData.responsavelSetor || "administrativo",
        contadorNome: perfilData.contadorNome || "",
        contadorEmail: perfilData.contadorEmail || "",
        contadorTelefone: perfilData.contadorTelefone || "",
      });
    }
  }, [perfilData, perfilForm]);

  const handleSavePerfil = async (data: PerfilFormData) => {
    savePerfilMutation.mutate(data);
  };

  // Função placeholder para alteração de senha
  const alterarSenha = async (data: ChangePasswordData) => {
    // Implementação da alteração de senha
    console.log("Alterando senha:", data);
  };

  // Função placeholder para 2FA
  const iniciar2FA = async () => {
    console.log("Iniciando 2FA");
  };

  const ativar2FA = async (data: { codigo: string, secret: string }) => {
    console.log("Ativando 2FA:", data);
  };

  const desativar2FA = async () => {
    console.log("Desativando 2FA");
  };

  if (isMobileDevice()) {
    return <div>Versão mobile em desenvolvimento</div>;
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

      {/* Dados do Perfil */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Dados do Perfil
          </CardTitle>
          <CardDescription>
            Mantenha suas informações sempre atualizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {perfilLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Form {...perfilForm}>
              <form onSubmit={perfilForm.handleSubmit(handleSavePerfil)} className="space-y-6">
                {/* Logo da Empresa */}
                <div className="flex items-center space-x-4">
                  <Avatar className="w-20 h-20">
                    {perfilForm.watch("logoUrl") ? (
                      <AvatarImage src={perfilForm.watch("logoUrl")} alt="Logo" />
                    ) : (
                      <AvatarFallback className="bg-purple-100 text-purple-600 text-xl">
                        {perfilData?.primeiroNome?.charAt(0) || "U"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <Button type="button" variant="outline" size="sm">
                      <Camera className="mr-2 h-4 w-4" />
                      Alterar Logo
                    </Button>
                    <p className="text-sm text-gray-500 mt-1">
                      Formatos aceitos: JPG, PNG (máx. 2MB)
                    </p>
                  </div>
                </div>

                {/* Dados Pessoais */}
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <User className="mr-2 h-5 w-5 text-purple-600" />
                    Dados Pessoais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={perfilForm.control}
                      name="primeiroNome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primeiro Nome</FormLabel>
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
                          <FormLabel>Último Nome</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Dados da Empresa */}
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <Building className="mr-2 h-5 w-5 text-purple-600" />
                    Dados da Empresa
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={perfilForm.control}
                      name="razaoSocial"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Razão Social</FormLabel>
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
                          <FormLabel>Nome Fantasia</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={perfilForm.control}
                      name="cpfCnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF/CNPJ</FormLabel>
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
                          <FormLabel>Regime Tributário</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                              <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                              <SelectItem value="lucro_real">Lucro Real</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Dados do Responsável */}
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <UserCheck className="mr-2 h-5 w-5 text-purple-600" />
                    Responsável
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={perfilForm.control}
                      name="responsavelNome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
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
                          <FormLabel>E-mail</FormLabel>
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
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <InputMask
                              mask="(99) 99999-9999"
                              value={field.value}
                              onChange={field.onChange}
                            >
                              {(inputProps: any) => <Input {...inputProps} />}
                            </InputMask>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={savePerfilMutation.isPending}
                  >
                    {savePerfilMutation.isPending ? (
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
          )}
        </CardContent>
      </Card>

      {/* Segurança */}
      <SegurancaTab
        usuarioAtual={{ id: user?.id || 1 }}
        is2FAEnabled={false}
        qrCode2FA={null}
        secret2FA={null}
        erroSenha={null}
        sucessoSenha={false}
        carregandoSenha={false}
        erro2FA={null}
        sucesso2FA={false}
        carregando2FA={false}
        showPasswordSection={showPasswordSection}
        show2FASection={show2FASection}
        setShowPasswordSection={setShowPasswordSection}
        setShow2FASection={setShow2FASection}
        alterarSenha={alterarSenha}
        iniciar2FA={iniciar2FA}
        ativar2FA={ativar2FA}
        desativar2FA={desativar2FA}
      />

      {/* Informações da Assinatura */}
      {assinaturaData && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Assinatura Atual
            </CardTitle>
            <CardDescription>
              Informações sobre seu plano ativo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-purple-600 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Plano Atual</p>
                    <p className="font-semibold text-purple-600">
                      {assinaturaData.plano || 'Não definido'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-semibold text-green-600">Ativo</p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Usuários</p>
                    <p className="font-semibold text-blue-600">1 de 3</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}