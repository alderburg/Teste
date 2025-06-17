import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';

/**
 * Componente para verificação de código 2FA
 * Usado quando um usuário com 2FA ativado tenta acessar uma página protegida
 */
const VerificacaoTwoFactor: React.FC = () => {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Verificar status da sessão
  useEffect(() => {
    const verificarStatus = async () => {
      try {
        const response = await fetch('/api/auth/2fa-session-status');
        const data = await response.json();
        
        // Se já estiver verificado, redirecionar para dashboard
        if (data.authenticated && (!data.twoFactorEnabled || data.twoFactorVerified)) {
          setLocation('/dashboard');
        }
        // Se não estiver autenticado, redirecionar para login
        else if (!data.authenticated) {
          setLocation('/login');
        }
      } catch (error) {
        console.error('Erro ao verificar status 2FA:', error);
      }
    };
    
    verificarStatus();
  }, [setLocation]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    
    try {
      // Enviar código para verificação
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: codigo }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSucesso(true);
        toast({
          title: "Verificação concluída",
          description: "Autenticação de dois fatores verificada com sucesso.",
          variant: "default",
        });
        
        // Redirecionar para dashboard após verificação bem-sucedida
        setTimeout(() => {
          setLocation('/dashboard');
        }, 1500);
      } else {
        setErro(data.message || 'Código inválido. Por favor, tente novamente.');
      }
    } catch (error) {
      console.error('Erro durante verificação 2FA:', error);
      setErro('Ocorreu um erro durante a verificação. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Card className="w-full max-w-md shadow-lg border-gray-200">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Verificação de Segurança</CardTitle>
          <CardDescription className="text-center">
            Digite o código do seu aplicativo autenticador para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {erro && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}
          
          {sucesso ? (
            <Alert className="mb-4 bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Verificação concluída</AlertTitle>
              <AlertDescription>Você será redirecionado em instantes...</AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código de verificação</Label>
                  <Input
                    id="codigo"
                    type="text"
                    placeholder="Exemplo: 123456"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    className="text-center text-lg tracking-widest"
                    maxLength={6}
                    required
                    autoComplete="off"
                    disabled={loading}
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full mt-4" 
                disabled={loading || codigo.length < 6}
              >
                {loading ? "Verificando..." : "Verificar"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-gray-500">
          <p>
            Esta verificação adicional ajuda a proteger sua conta.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default VerificacaoTwoFactor;