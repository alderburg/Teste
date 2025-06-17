import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CreditCard, Plus, Star, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import InteractiveCardForm from "./InteractiveCardForm";

// Interface para definição da estrutura do método de pagamento
interface PaymentMethod {
  id: number;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

// Componente de spinner para indicar carregamento
const Spinner = ({ className }: { className?: string }) => (
  <div className={`animate-spin rounded-full h-5 w-5 border-b-2 border-primary ${className || ''}`}></div>
);

// Interface para as props do componente de lista de métodos de pagamento
interface SimplePaymentMethodListProps {
  onUpdateCardCount?: (count: number) => void;
}

// Componente simplificado para exibir a lista de métodos de pagamento
function SimplePaymentMethodList({ onUpdateCardCount }: SimplePaymentMethodListProps) {
  const { toast } = useToast();
  
  // Estados para gerenciar os dados e o status da requisição
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isError, setIsError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  const [cardToDelete, setCardToDelete] = React.useState<number | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isSettingDefault, setIsSettingDefault] = React.useState(false);

  // Atualiza a contagem de cartões quando a lista muda
  React.useEffect(() => {
    if (onUpdateCardCount && paymentMethods) {
      onUpdateCardCount(paymentMethods.length);
    }
  }, [paymentMethods, onUpdateCardCount]);

  // Carregar os métodos de pagamento ao montar o componente
  React.useEffect(() => {
    // Como a página já está protegida pelo sistema de autenticação,
    // podemos simplesmente buscar os métodos de pagamento diretamente
    console.log('Iniciando busca de métodos de pagamento');
    fetchPaymentMethods();
  }, []);

  // Função separada para buscar os cartões
  async function fetchPaymentMethods() {
    try {
      console.log('Fazendo requisição direta para /api/payment-methods');
      setIsLoading(true);
      setError(null); // Limpar erros anteriores

      // Primeiro tentar corrigir cartões com stripe_customer_id em branco
      try {
        await fetch('/api/fix-payment-methods-customer-id', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
      } catch (fixError) {
        // Continuar mesmo se a correção falhar
        console.log('Correção de stripe_customer_id não foi necessária ou falhou:', fixError);
      }
            
      // Usando fetch diretamente para evitar problemas de configuração com o React Query
      console.log('Iniciando fetch para payment-methods');
      const response = await fetch('/api/payment-methods', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      console.log('Resposta recebida com status:', response.status);
      
      if (!response.ok) {
        console.error('Erro na resposta da API:', response.status, response.statusText);
        
        // Em vez de lançar erro, vamos apenas exibir um log e continuar
        // Isso vai fazer com que o componente mostre "Você ainda não tem cartões cadastrados"
        console.log('Tratando como lista vazia de cartões');
        setPaymentMethods([]);
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('Resposta da API payment-methods (dados):', data);
      console.log('Tipo da resposta da API:', typeof data, Array.isArray(data));
      
      if (Array.isArray(data)) {
        console.log('Número de cartões:', data.length);
        data.forEach((item, index) => {
          console.log(`Cartão ${index}:`, item);
        });
        
        setPaymentMethods(data);
      } else {
        console.error('A resposta não é um array:', data);
        setPaymentMethods([]);
      }
      
      setIsError(false);
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar métodos de pagamento:', err);
      setIsError(true);
      setError(err instanceof Error ? err : new Error(String(err)));
      setPaymentMethods([]);
    } finally {
      setIsLoading(false);
    }
  }
  
  // Função para excluir um cartão
  async function handleDeleteCard(id: number) {
    try {
      setIsDeleting(true);
      console.log('Excluindo cartão:', id);
      
      const response = await fetch(`/api/payment-methods/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao excluir cartão: ${response.status} - ${errorText || response.statusText}`);
      }
      
      // Atualizar lista local removendo o cartão excluído
      setPaymentMethods(prev => prev.filter(card => card.id !== id));
      
      toast({
        title: "Cartão excluído",
        description: "O cartão foi removido com sucesso.",
        variant: "default",
      });
      
    } catch (err) {
      console.error('Erro ao excluir cartão:', err);
      toast({
        title: "Erro ao excluir cartão",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setCardToDelete(null);
    }
  }
  
  // Função para definir um cartão como padrão
  async function handleSetDefaultCard(id: number) {
    try {
      setIsSettingDefault(true);
      console.log('Definindo cartão como padrão:', id);
      
      const response = await fetch(`/api/payment-methods/${id}/default`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao definir cartão como padrão: ${response.status} - ${errorText || response.statusText}`);
      }
      
      // Atualizar lista local e garantir que o cartão padrão aparecerá primeiro
      const updatedCards = (prevCards: PaymentMethod[]): PaymentMethod[] => {
        // Primeiro atualiza o status de cada cartão
        const updated = prevCards.map((card: PaymentMethod): PaymentMethod => ({
          ...card,
          isDefault: card.id === id
        }));
        
        // Depois reorganiza para que o cartão padrão apareça primeiro
        return updated.sort((a: PaymentMethod, b: PaymentMethod): number => 
          (a.isDefault === b.isDefault) ? 0 : a.isDefault ? -1 : 1
        );
      };
      
      setPaymentMethods(updatedCards);
      
      toast({
        title: "Cartão padrão atualizado",
        description: "O cartão foi definido como padrão com sucesso.",
        variant: "default",
      });
      
    } catch (err) {
      console.error('Erro ao definir cartão como padrão:', err);
      toast({
        title: "Erro ao definir cartão padrão",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setIsSettingDefault(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="h-10 w-10 rounded-full border-4 border-gray-200 border-t-purple-600 animate-spin mb-2"></div>
        <p className="text-gray-500">
          Carregando métodos de pagamento...
        </p>
      </div>
    );
  }

  if (isError) {
    console.error('Erro na query de métodos de pagamento:', error);
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Erro ao carregar métodos de pagamento</h3>
        <p className="text-sm text-red-500 mb-4">{String(error)}</p>
      </div>
    );
  }
  
  if (!paymentMethods || paymentMethods.length === 0) {
    console.log('Nenhum método de pagamento encontrado');
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <CreditCard className="h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum cartão cadastrado</h3>
        <p className="text-gray-500 mb-4">Adicione seu primeiro cartão para facilitar seus pagamentos.</p>
      </div>
    );
  }
  
  // Função para formatar mês/ano de expiração
  const formatExpiry = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  try {
    return (
      <>
        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
          {/* Ordenar para que o cartão padrão apareça primeiro na lista */}
          {paymentMethods
            .sort((a, b) => (a.isDefault === b.isDefault) ? 0 : a.isDefault ? -1 : 1)
            .map((method: PaymentMethod) => (
            <div
              key={method.id}
              className={`border rounded-lg p-3 flex justify-between items-center ${
                method.isDefault ? 'bg-primary/5 border-primary/20' : ''
              } hover:bg-muted/30 transition-all relative group`}
            >
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-primary/70" />
                <div>
                  <div className="font-medium flex items-center text-base">
                    {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last4}
                    {method.isDefault && (
                      <Badge variant="outline" className="ml-2 bg-primary/10 text-primary text-xs">
                        Padrão
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Expira em {formatExpiry(method.expMonth, method.expYear)}
                  </div>
                </div>
              </div>
              
              {/* Ações na lateral direita */}
              <div className="flex space-x-2">
                {!method.isDefault && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleSetDefaultCard(method.id)}
                    disabled={isSettingDefault}
                  >
                    {isSettingDefault ? <Spinner className="h-3 w-3" /> : <Star className="h-3 w-3 mr-1" />}
                    Padrão
                  </Button>
                )}
                
                {/* Substituir AlertDialog por um botão que verifica se é padrão primeiro */}
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 px-2 text-xs hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                  onClick={() => {
                    if (method.isDefault) {
                      // Mostrar toaster avisando que não pode excluir o cartão padrão
                      toast({
                        title: "Operação não permitida",
                        description: "Não é possível excluir seu cartão padrão. Defina outro cartão como padrão antes de excluir este.",
                        variant: "destructive",
                      });
                    } else {
                      // Somente mostrar AlertDialog se não for o cartão padrão
                      setCardToDelete(method.id);
                      // Abre o dialog - simulando um clique no trigger
                      document.getElementById(`delete-card-dialog-${method.id}`)?.click();
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                
                {/* AlertDialog separado, só acionado para cartões não-padrão */}
                {!method.isDefault && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button id={`delete-card-dialog-${method.id}`} className="hidden"></button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir cartão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir este cartão?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteCard(method.id);
                          }}
                          disabled={isDeleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : null}
                          {isDeleting ? "Excluindo..." : "Sim, excluir"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  } catch (error) {
    console.error('Erro ao renderizar cartões:', error);
    return (
      <div className="text-center py-6">
        <p className="text-red-500">Erro ao renderizar métodos de pagamento: {String(error)}</p>
      </div>
    );
  }
}

// Componente principal simplificado
export function PaymentMethodsManager() {
  const { toast } = useToast();
  const [showAddCard, setShowAddCard] = useState(false);
  const [paymentMethodsCount, setPaymentMethodsCount] = useState(0);
  
  // Função para verificar o número de cartões antes de permitir adicionar um novo
  const handleAddCardClick = () => {
    if (paymentMethodsCount >= 5) {
      toast({
        title: "Limite atingido",
        description: "Número máximo de métodos de pagamentos permitidos: 5. Exclua um outro método para conseguir adicionar um novo.",
        variant: "destructive",
      });
    } else {
      setShowAddCard(true);
    }
  };
  
  const handleCloseAddCard = () => {
    setShowAddCard(false);
  };

  const handleCardAdded = () => {
    setShowAddCard(false);
  };

  // Função para atualizar a contagem de cartões
  const updateCardCount = (count: number) => {
    setPaymentMethodsCount(count);
  };

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-2">
        {!showAddCard ? (
          <>
            <div className="md:flex md:justify-between md:items-start">
              <div>
                <CardTitle>Métodos de Pagamento</CardTitle>
                <CardDescription className="mt-1">
                  Seus cartões de crédito salvos {paymentMethodsCount > 0 && `(${paymentMethodsCount}/5)`}
                </CardDescription>
              </div>
              <div className="max-md:w-full max-md:mt-3">
                <Button
                  className="bg-purple-600 hover:bg-purple-700 max-md:w-full"
                  onClick={handleAddCardClick}
                  disabled={paymentMethodsCount >= 5}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Adicionar Cartão
                </Button>
              </div>
            </div>
            <div className="mt-3 border-b border-gray-200"></div>
          </>
        ) : (
          <div className="border-b border-gray-200 pb-3">
            <InteractiveCardForm onClose={handleCloseAddCard} onSuccess={handleCardAdded} />
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-grow">
        {!showAddCard ? (
          <SimplePaymentMethodList onUpdateCardCount={updateCardCount} />
        ) : null}
        
        {/* Mensagem quando atingir o limite de cartões */}
        {paymentMethodsCount >= 5 && !showAddCard && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700 text-sm">
            <p>Número máximo de métodos de pagamentos permitidos: 5, exclua um outro método para conseguir adicionar um novo.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}