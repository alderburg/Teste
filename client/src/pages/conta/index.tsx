import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { isMobileDevice } from "@/lib/utils";
import MobileContaPage from "./mobile-conta";
import { Loader2 } from "lucide-react";

export default function MinhaContaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [perfilData, setPerfilData] = useState<any>(null);

  // Verificar se é mobile
  if (isMobileDevice()) {
    return <MobileContaPage />;
  }

  // Carregar dados do perfil
  useEffect(() => {
    const loadPerfilData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/auth/user', {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setPerfilData(data);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do perfil:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar dados do perfil",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadPerfilData();
    }
  }, [user, toast]);

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Minha Conta</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais e configurações da conta
          </p>
        </div>

        <Tabs defaultValue="perfil" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
            <TabsTrigger value="enderecos">Endereços</TabsTrigger>
            <TabsTrigger value="contatos">Contatos</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Perfil</CardTitle>
                <CardDescription>
                  Gerencie as informações da sua empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Carregando dados do perfil...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Razão Social</label>
                      <Input 
                        value={perfilData?.razaoSocial || perfilData?.nome || ''} 
                        placeholder="Digite a razão social"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Nome Fantasia</label>
                      <Input 
                        value={perfilData?.nomeFantasia || perfilData?.email || ''} 
                        placeholder="Digite o nome fantasia"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <Input 
                        value={perfilData?.email || ''} 
                        placeholder="Email"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <Input 
                        value={perfilData?.ativo ? "Ativo" : "Inativo"} 
                        readOnly
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enderecos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Endereços</CardTitle>
                <CardDescription>
                  Gerencie os endereços da sua empresa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground">
                  Funcionalidade de endereços em desenvolvimento
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contatos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contatos</CardTitle>
                <CardDescription>
                  Gerencie os contatos da sua empresa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground">
                  Funcionalidade de contatos em desenvolvimento
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usuarios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Usuários</CardTitle>
                <CardDescription>
                  Gerencie os usuários da sua empresa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground">
                  Funcionalidade de usuários em desenvolvimento
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}