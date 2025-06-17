import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { usePerfil } from "@/hooks/use-perfil";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Save } from "lucide-react";

// Esquema de validação para o perfil
const perfilSchema = z.object({
  logoUrl: z.string().optional(),
  primeiroNome: z.string().min(1, { message: "Nome é obrigatório" }),
  ultimoNome: z.string().min(1, { message: "Sobrenome é obrigatório" }),
  razaoSocial: z.string().optional(),
  nomeFantasia: z.string().optional(),
  tipoPessoa: z.string(),
  cpfCnpj: z.string().min(1, { message: "CPF/CNPJ é obrigatório" }),
  inscricaoEstadual: z.string().optional(),
  inscricaoMunicipal: z.string().optional(),
  cnae: z.string().optional(),
  regimeTributario: z.string().optional(),
  atividadePrincipal: z.string().optional(),
  responsavelNome: z.string().min(1, { message: "Nome do responsável é obrigatório" }),
  responsavelEmail: z.string().email({ message: "Email inválido" }),
  responsavelTelefone: z.string().min(1, { message: "Telefone do responsável é obrigatório" }),
  responsavelSetor: z.string(),
  contadorNome: z.string().optional(),
  contadorEmail: z.string().optional(),
  contadorTelefone: z.string().optional(),
});

type PerfilFormValues = z.infer<typeof perfilSchema>;

export default function ProfileSimples() {
  const { user } = useAuth();
  const userId = user?.id || parseInt(localStorage.getItem('userId') || '0');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dados");
  const [formaPessoaSelecionada, setFormaPessoaSelecionada] = useState<string>("fisica");
  
  // Usar hook personalizado para dados do perfil
  const { perfil, isLoading, fetchPerfil, updatePerfil } = usePerfil(userId);
  
  // Configurar formulário com React Hook Form
  const form = useForm<PerfilFormValues>({
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
  
  // Carregar dados do perfil ao montar o componente
  useEffect(() => {
    if (userId > 0) {
      const loadData = async () => {
        const data = await fetchPerfil(true);
        if (data) {
          await form.reset({
            logoUrl: data.logoUrl || "",
            primeiroNome: data.primeiroNome || "",
            ultimoNome: data.ultimoNome || "",
            razaoSocial: data.razaoSocial || "",
            nomeFantasia: data.nomeFantasia || "",
            tipoPessoa: data.tipoPessoa || "fisica",
            cpfCnpj: data.cpfCnpj || "",
            inscricaoEstadual: data.inscricaoEstadual || "",
            inscricaoMunicipal: data.inscricaoMunicipal || "",
            cnae: data.cnae || "",
            regimeTributario: data.regimeTributario || "",
            atividadePrincipal: data.atividadePrincipal || "",
            responsavelNome: data.responsavelNome || "",
            responsavelEmail: data.responsavelEmail || "",
            responsavelTelefone: data.responsavelTelefone || "",
            responsavelSetor: data.responsavelSetor || "Administrativa",
            contadorNome: data.contadorNome || "",
            contadorEmail: data.contadorEmail || "",
            contadorTelefone: data.contadorTelefone || "",
          });
          
          console.log("Formulário atualizado com dados do perfil");
          
          // Manter a forma de pessoa selecionada atualizada
          if (data.tipoPessoa) {
            setFormaPessoaSelecionada(data.tipoPessoa);
          }
        }
      };
      
      loadData();
    }
  }, [userId]);
  
  // Atualizar dados quando mudamos o tipo de pessoa
  const handleTipoPessoaChange = (value: string) => {
    setFormaPessoaSelecionada(value);
    form.setValue("tipoPessoa", value);
  };
  
  // Salvar formulário
  const onSubmit = async (data: PerfilFormValues) => {
    console.log("Enviando dados do formulário:", data);
    
    // Se for pessoa física, garantir que campos de empresa estejam vazios
    if (data.tipoPessoa === "fisica") {
      data.razaoSocial = "";
      data.nomeFantasia = "";
      data.inscricaoEstadual = "";
      data.inscricaoMunicipal = "";
      data.regimeTributario = "";
    }
    
    // Enviar dados para atualização
    await updatePerfil(data);
    
    // Invalidar cache de consultas relacionadas
    queryClient.invalidateQueries({ queryKey: ["/api/minha-conta/perfil"] });
    
    // Notificar sucesso
    toast({
      title: "Perfil atualizado",
      description: "Seus dados foram atualizados com sucesso",
      variant: "default",
      className: "bg-white border-gray-200",
    });
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Minha Conta (Simplificada)</h1>
      
      <Tabs defaultValue="dados" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="dados">Dados de Cadastro</TabsTrigger>
          <TabsTrigger value="enderecos">Endereços</TabsTrigger>
          <TabsTrigger value="contatos">Contatos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dados">
          <Card>
            <CardHeader>
              <CardTitle>Dados de Cadastro</CardTitle>
              <CardDescription>Informações básicas do seu perfil</CardDescription>
            </CardHeader>
            
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Carregando dados...</span>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="space-y-4">
                      {/* Tipo de Pessoa */}
                      <div className="flex space-x-4 mb-6">
                        <Button
                          type="button"
                          variant={formaPessoaSelecionada === "fisica" ? "default" : "outline"}
                          onClick={() => handleTipoPessoaChange("fisica")}
                          className="flex-1"
                        >
                          Pessoa Física
                        </Button>
                        <Button
                          type="button"
                          variant={formaPessoaSelecionada === "juridica" ? "default" : "outline"}
                          onClick={() => handleTipoPessoaChange("juridica")}
                          className="flex-1"
                        >
                          Pessoa Jurídica
                        </Button>
                      </div>
                      
                      {/* Campos para pessoa física */}
                      {formaPessoaSelecionada === "fisica" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="primeiroNome"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome*</FormLabel>
                                <FormControl>
                                  <Input placeholder="Seu nome" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="ultimoNome"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sobrenome*</FormLabel>
                                <FormControl>
                                  <Input placeholder="Seu sobrenome" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="cpfCnpj"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CPF*</FormLabel>
                                <FormControl>
                                  <Input placeholder="000.000.000-00" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                      
                      {/* Campos para pessoa jurídica */}
                      {formaPessoaSelecionada === "juridica" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="razaoSocial"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Razão Social*</FormLabel>
                                <FormControl>
                                  <Input placeholder="Razão Social" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="nomeFantasia"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome Fantasia</FormLabel>
                                <FormControl>
                                  <Input placeholder="Nome Fantasia" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="cpfCnpj"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CNPJ*</FormLabel>
                                <FormControl>
                                  <Input placeholder="00.000.000/0000-00" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="inscricaoEstadual"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Inscrição Estadual</FormLabel>
                                <FormControl>
                                  <Input placeholder="Inscrição Estadual" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                      
                      {/* Campos comuns para ambos os tipos */}
                      <h3 className="text-lg font-semibold mt-6 mb-2">Dados do Responsável</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="responsavelNome"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome do Responsável*</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome completo" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="responsavelEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email do Responsável*</FormLabel>
                              <FormControl>
                                <Input placeholder="email@exemplo.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="responsavelTelefone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone do Responsável*</FormLabel>
                              <FormControl>
                                <Input placeholder="(00) 00000-0000" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-6">
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Salvar Dados
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <p className="text-sm text-muted-foreground">
                * Campos obrigatórios
              </p>
              <Button variant="outline" onClick={() => fetchPerfil(true)}>Recarregar Dados</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="enderecos">
          <Card>
            <CardHeader>
              <CardTitle>Endereços</CardTitle>
              <CardDescription>Gerencie seus endereços</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Funcionalidade de endereços será implementada em breve.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="contatos">
          <Card>
            <CardHeader>
              <CardTitle>Contatos</CardTitle>
              <CardDescription>Gerencie seus contatos</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Funcionalidade de contatos será implementada em breve.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}