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
import { useWebSocketData } from "@/hooks/useWebSocketData";
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

export default function MinhaContaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Buscar dados do perfil via WebSocket
  const { data: perfilArray, loading: isLoadingPerfil } = useWebSocketData({
    endpoint: '/api/auth/user',
    resource: 'perfil',
    autoFetch: true
  });
  
  // Extrair primeiro item do array (perfil é único)
  const perfilData = perfilArray && perfilArray.length > 0 ? perfilArray[0] : null;

  // Função para salvar perfil via WebSocket
  const handleSavePerfilWebSocket = async (data: any) => {
    try {
      websocketService.send({
        type: 'SALVAR_PERFIL',
        data: data
      });
      
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar perfil",
        variant: "destructive",
      });
    }
  };

  // Verificar se é mobile
  if (isMobileDevice()) {
    return <MobileContaPage />;
  }

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
                {isLoadingPerfil ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Carregando dados do perfil...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Razão Social</label>
                      <Input 
                        value={perfilData?.razaoSocial || ''} 
                        placeholder="Digite a razão social"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Nome Fantasia</label>
                      <Input 
                        value={perfilData?.nomeFantasia || ''} 
                        placeholder="Digite o nome fantasia"
                        disabled
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
                  Funcionalidade de endereços será implementada via WebSocket
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
                  Funcionalidade de contatos será implementada via WebSocket
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
                  Funcionalidade de usuários será implementada via WebSocket
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}