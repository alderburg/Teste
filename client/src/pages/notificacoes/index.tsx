import { useState, useEffect } from "react";
import { Bell, Package, DollarSign, FileText, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNotification } from "@/context/NotificationContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Tipos para os dados de notificação
type NotificationType = "produto" | "precificacao" | "importacao" | "sistema";
type NotificationPriority = "baixa" | "media" | "alta";

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  description: string;
  date: string;
  read: boolean;
  priority: NotificationPriority;
}

// Dados iniciais de notificações
const initialNotifications: Notification[] = [
  {
    id: 1,
    type: "produto",
    title: "Novo produto cadastrado",
    description: "Smartphone Galaxy S23 foi adicionado ao sistema",
    date: "2025-04-22T10:30:00",
    read: false,
    priority: "media"
  },
  {
    id: 2,
    type: "precificacao",
    title: "Precificação concluída",
    description: "Notebook Dell Inspiron foi precificado com sucesso",
    date: "2025-04-22T08:15:00",
    read: false,
    priority: "media"
  },
  {
    id: 3,
    type: "importacao",
    title: "Importação realizada",
    description: "15 produtos novos foram importados com sucesso",
    date: "2025-04-21T15:45:00",
    read: true,
    priority: "baixa"
  },
  {
    id: 4,
    type: "sistema",
    title: "Atualização do sistema",
    description: "O sistema foi atualizado para a versão 2.5.0",
    date: "2025-04-20T09:00:00",
    read: true,
    priority: "alta"
  },
  {
    id: 5,
    type: "produto",
    title: "Produto removido",
    description: "TV Samsung 4K foi removida do catálogo",
    date: "2025-04-19T14:30:00",
    read: true,
    priority: "media"
  },
  {
    id: 6,
    type: "precificacao",
    title: "Atualização de preço",
    description: "Preços de 5 produtos foram atualizados devido à mudança na taxa de câmbio",
    date: "2025-04-18T11:15:00",
    read: true,
    priority: "alta"
  },
  {
    id: 7,
    type: "importacao",
    title: "Erro na importação",
    description: "A importação de produtos usados falhou. Verifique o formato do arquivo.",
    date: "2025-04-18T10:00:00",
    read: false,
    priority: "alta"
  },
  {
    id: 8,
    type: "sistema",
    title: "Manutenção programada",
    description: "O sistema estará indisponível para manutenção no dia 30/04/2025 das 00:00 às 03:00",
    date: "2025-04-17T16:45:00",
    read: true,
    priority: "media"
  },
  {
    id: 9,
    type: "produto",
    title: "Novo fornecedor adicionado",
    description: "TechSupply foi adicionado como novo fornecedor de produtos eletrônicos",
    date: "2025-04-16T13:20:00",
    read: true,
    priority: "baixa"
  },
  {
    id: 10,
    type: "precificacao",
    title: "Nova fórmula de precificação",
    description: "A fórmula para cálculo de produtos usados foi atualizada",
    date: "2025-04-15T09:30:00",
    read: true,
    priority: "media"
  },
];

export default function NotificacoesPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const { setUnreadCount } = useNotification();
  
  // Estados para paginação
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [itensPorPagina, setItensPorPagina] = useState(5);

  // Função para formatar a data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Hoje às ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Ontem às ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Função para renderizar o ícone baseado no tipo de notificação
  const renderIcon = (type: NotificationType) => {
    switch (type) {
      case "produto":
        return <Package className="h-5 w-5 text-blue-500" />;
      case "precificacao":
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case "importacao":
        return <FileText className="h-5 w-5 text-yellow-500" />;
      case "sistema":
        return <Bell className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  // Função para obter a cor de fundo do ícone baseada no tipo
  const getIconBgColor = (type: NotificationType) => {
    switch (type) {
      case "produto":
        return "bg-blue-100";
      case "precificacao":
        return "bg-green-100";
      case "importacao":
        return "bg-yellow-100";
      case "sistema":
        return "bg-red-100";
      default:
        return "bg-gray-100";
    }
  };

  // Função para marcar uma notificação como lida
  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };
  
  // Função para marcar todas as notificações como lidas
  const { markAllAsRead: globalMarkAllAsRead } = useNotification();
  
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
    
    // Atualiza o estado global e mostra a mensagem
    globalMarkAllAsRead();
  };
  
  // Calcular total de páginas
  const totalPaginas = Math.ceil(notifications.length / itensPorPagina);
  
  // Função para página anterior
  const paginaAnterior = () => {
    setPaginaAtual(prevPage => Math.max(0, prevPage - 1));
  };
  
  // Função para próxima página
  const proximaPagina = () => {
    setPaginaAtual(prevPage => Math.min(totalPaginas - 1, prevPage + 1));
  };
  
  // Função para mudar o número de itens por página
  const handleChangeItensPorPagina = (value: string) => {
    setItensPorPagina(parseInt(value));
    setPaginaAtual(0); // Resetar para a primeira página
  };
  
  // Obter notificações para a página atual
  const notificacoesPaginadas = notifications.slice(
    paginaAtual * itensPorPagina,
    (paginaAtual + 1) * itensPorPagina
  );
  
  // Atualiza a contagem de notificações não lidas no contexto global
  useEffect(() => {
    const unreadCount = notifications.filter(notif => !notif.read).length;
    setUnreadCount(unreadCount);
  }, [notifications, setUnreadCount]);

  // Hook para verificar se está em um dispositivo móvel
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Verificar uma vez no início
    checkIsMobile();
    
    // Adicionar event listener para resize
    window.addEventListener('resize', checkIsMobile);
    
    // Limpar na desmontagem
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 mt-2">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Notificações</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Visualize e gerencie todas as suas notificações
          </p>
        </div>
        
        <div className="mt-3 sm:mt-0 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={markAllAsRead} 
            className="w-full sm:w-auto text-sm focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
          >
            Marcar todas como lidas
          </Button>
        </div>
      </div>

      {/* Lista de notificações */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-200">
          {notificacoesPaginadas.map((notification) => (
            <div 
              key={notification.id} 
              className={`p-3 sm:p-4 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : 'bg-white'}`}
              onClick={() => !notification.read && markAsRead(notification.id)}
            >
              <div className="flex items-start">
                <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full ${getIconBgColor(notification.type)} flex items-center justify-center flex-shrink-0 mr-3 sm:mr-4`}>
                  {renderIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm sm:text-base font-medium truncate ${!notification.read ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                        {!notification.read && <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mr-1.5"></span>}
                        {notification.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2 sm:line-clamp-none">
                        {notification.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center mt-1 sm:mt-0 sm:ml-4">
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{formatDate(notification.date)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                      notification.priority === 'alta' 
                        ? 'bg-red-100 text-red-800' 
                        : notification.priority === 'media' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                    }`}>
                      Prioridade {notification.priority}
                    </span>
                    
                    <span className="inline-flex items-center text-xs text-gray-500">
                      <span className={`inline-block h-2 w-2 rounded-full mr-1 ${
                        notification.type === 'produto' 
                          ? 'bg-blue-500' 
                          : notification.type === 'precificacao' 
                            ? 'bg-green-500' 
                            : notification.type === 'importacao'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                      }`}></span>
                      {notification.type === 'produto' 
                        ? 'Produto' 
                        : notification.type === 'precificacao' 
                          ? 'Precificação' 
                          : notification.type === 'importacao'
                            ? 'Importação'
                            : 'Sistema'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Paginação - versão responsiva */}
      {notifications.length > 0 && (
        <div className="mt-4 sm:mt-6 flex justify-between items-center">
          <div className="flex-1 flex justify-start">
            <Select
              value={itensPorPagina.toString()}
              onValueChange={handleChangeItensPorPagina}
            >
              <SelectTrigger id="itens-por-pagina" className="h-10 w-16 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none">
                <SelectValue placeholder="5" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="20">20</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1"></div>
          
          <div className="flex-1 flex justify-end items-center">
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={paginaAnterior}
                disabled={paginaAtual === 0}
                className="h-10 w-10 p-0 rounded-md focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="text-sm px-1">
                {totalPaginas > 0 
                  ? `${paginaAtual + 1}/${totalPaginas}`
                  : "0/0"
                }
              </span>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={proximaPagina}
                disabled={paginaAtual >= totalPaginas - 1 || totalPaginas === 0}
                className="h-10 w-10 p-0 rounded-md focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}