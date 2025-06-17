import { Bell, Menu, User, Settings, LogOut, Search, X, Package, FileText, DollarSign, MapPin, Phone, Users, CreditCard, Shield } from "lucide-react";
import { WebSocketStatusIndicator } from "./WebSocketStatusIndicator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useLocation } from "wouter";
import { useState, useEffect, useRef, createContext, useContext } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/context/NotificationContext";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";

// Criando um contexto para o estado da pesquisa
export const SearchContext = createContext<{
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: any[];
}>({
  searchTerm: "",
  setSearchTerm: () => {},
  searchResults: [],
});

interface HeaderProps {
  toggleSidebar: () => void;
  isMinimized?: boolean;
}

// Hook para usar o contexto de pesquisa
export function useSearch() {
  return useContext(SearchContext);
}

// Provedor do contexto de pesquisa
export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Mock de dados para pesquisa
  const mockData = [
    { id: 1, type: 'produto', title: 'Smartphone Galaxy S23', path: '/precificacao/novos/unitario?produtoId=001' },
    { id: 2, type: 'produto', title: 'Notebook Dell Inspiron', path: '/precificacao/novos/unitario?produtoId=002' },
    { id: 3, type: 'produto', title: 'Smart TV LG 55"', path: '/precificacao/novos/unitario?produtoId=003' },
    { id: 4, type: 'produto', title: 'Smartphone Galaxy S23 Usado', path: '/precificacao/usados/unitario?produtoId=001' },
    { id: 5, type: 'produto', title: 'Notebook Dell Inspiron Usado', path: '/precificacao/usados/unitario?produtoId=002' },
    { id: 6, type: 'página', title: 'Precificação de Produtos Novos', path: '/precificacao/novos' },
    { id: 7, type: 'página', title: 'Precificação de Produtos Usados', path: '/precificacao/usados' },
    { id: 8, type: 'página', title: 'Precificação de Serviços', path: '/precificacao/servicos' },
    { id: 9, type: 'página', title: 'Precificação de Marketplaces', path: '/precificacao/marketplaces' },
    { id: 10, type: 'página', title: 'Precificação de Aluguéis', path: '/precificacao/alugueis' },
  ];

  // Efeito para filtrar resultados com base no termo de pesquisa
  useEffect(() => {
    if (searchTerm.trim().length > 2) {
      const filteredResults = mockData.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filteredResults);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  return (
    <SearchContext.Provider value={{ searchTerm, setSearchTerm, searchResults }}>
      {children}
    </SearchContext.Provider>
  );
}

export default function Header({ toggleSidebar, isMinimized }: HeaderProps) {
  const [location, navigate] = useLocation();
  const { searchTerm, setSearchTerm, searchResults } = useSearch();
  const { hasUnreadNotifications, setHasUnreadNotifications, unreadCount, setUnreadCount, markAllAsRead } = useNotification();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [notificationsOpened, setNotificationsOpened] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isSearchExpandedDesktop, setIsSearchExpandedDesktop] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { logout, logoutMutation } = useAuth();
  
  // Atualiza o estado de isMobile quando a janela é redimensionada
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsSearchExpanded(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Marcar notificações como lidas quando abrimos o dropdown
  const handleOpenNotifications = (open: boolean) => {
    // Definimos o estado com base no parâmetro 'open'
    setNotificationsOpened(open);
    
    // Quando abrir, marcar as notificações como lidas após 2s
    if (open) {
      setTimeout(() => {
        setHasUnreadNotifications(false);
        setUnreadCount(0);
      }, 2000);
    }
  };
  
  // Navegar para a página de todas as notificações e fechar o dropdown
  const goToAllNotifications = () => {
    navigate("/notificacoes");
    setNotificationsOpened(false);
  };

  // Fechar os resultados de pesquisa quando clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
        if (isMobile) {
          // Fechamos imediatamente sem animação
          setIsSearchExpanded(false);
        } else {
          // Fechamos o campo de pesquisa expandido na versão desktop
          setIsSearchExpandedDesktop(false);
        }
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobile]);
  
  // Toggle para expandir/recolher o campo de pesquisa no mobile
  const toggleSearchExpand = () => {
    if (isMobile) {
      setIsSearchExpanded(!isSearchExpanded);
      if (!isSearchExpanded) {
        // Quando expandir, também focar no input
        setTimeout(() => {
          const input = searchRef.current?.querySelector('input');
          if (input) {
            input.focus();
          }
        }, 300); // Pequeno delay para dar tempo à animação
      }
    }
  };

  // Mostrar diálogo de confirmação de logout
  const showLogoutConfirmation = () => {
    setLogoutDialogOpen(true);
  };

  // Executar o logout após confirmar
  const handleLogout = () => {
    // Fechar o diálogo
    setLogoutDialogOpen(false);
    
    // Usar diretamente a função de logout do contexto de autenticação
    // que já cuida de limpar os dados e fazer o redirecionamento
    logout();
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-30 flex h-16 items-center bg-white px-4 shadow-sm transition-all duration-300 ${!isMobile && isMinimized ? 'md:left-20' : 'md:left-64'}`}>
        <button
          onClick={toggleSidebar}
          className="mr-4 rounded-md p-2 text-gray-500 hover:bg-gray-100"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex-1 flex items-center justify-center md:justify-end">
          <div className="relative max-w-xs sm:max-w-md w-full px-2 md:ml-auto md:mr-4" ref={searchRef}>
            <div className="flex items-center w-full justify-end">
              {isMobile ? (
                <AnimatePresence initial={false}>
                  {isSearchExpanded ? (
                    <motion.div 
                      className="relative w-full"
                      initial={{ width: 40, opacity: 0.5 }}
                      animate={{ width: "100%", opacity: 1 }}
                      exit={{ width: 40, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <input
                        type="text"
                        placeholder="Pesquisar..."
                        className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 pl-10 text-sm focus:border-primary focus:outline-none focus:ring-0"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-4 w-4 text-gray-500" />
                      </div>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </motion.div>
                  ) : (
                    <motion.button
                      className="rounded-full p-2 hover:bg-gray-100 transition-colors"
                      onClick={toggleSearchExpand}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Search className="h-5 w-5 text-gray-600" />
                    </motion.button>
                  )}
                </AnimatePresence>
              ) : (
                <AnimatePresence initial={false}>
                  {isSearchExpandedDesktop ? (
                    <motion.div 
                      className="relative w-full max-w-[240px] mx-auto md:ml-auto md:mr-0"
                      initial={{ width: 40, opacity: 0.8 }}
                      animate={{ width: "240px", opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <input
                        type="text"
                        placeholder="Pesquisar..."
                        className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 pl-10 text-sm focus:border-primary focus:outline-none focus:ring-0"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        autoFocus
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="h-4 w-4 text-gray-500" />
                      </div>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </motion.div>
                  ) : (
                    <motion.button
                      className="rounded-full p-2 hover:bg-gray-100 transition-colors ml-auto"
                      onClick={() => setIsSearchExpandedDesktop(true)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Search className="h-5 w-5 text-gray-600" />
                    </motion.button>
                  )}
                </AnimatePresence>
              )}
            </div>
            
            {/* Resultados da pesquisa */}
            {isSearchFocused && searchResults.length > 0 && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 md:right-0 md:left-auto md:transform-none mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-80 overflow-y-auto z-50 w-72">
                <div className="p-2 border-b border-gray-200 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700">
                    {searchResults.length} resultados para "{searchTerm}"
                  </p>
                </div>
                <div className="py-1">
                  {searchResults.map((result) => (
                    <Link
                      key={result.id}
                      href={result.path}
                      onClick={() => {
                        // Fechamos a barra de pesquisa
                        setIsSearchFocused(false);
                        setSearchTerm('');
                        if (isMobile) {
                          setIsSearchExpanded(false);
                        } else {
                          setIsSearchExpandedDesktop(false);
                        }
                        
                        // Scroll suave para o topo
                        setTimeout(() => {
                          window.scrollTo({
                            top: 0,
                            behavior: 'smooth'
                          });
                        }, 50);
                      }}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                      {result.type === 'produto' ? (
                        <Package className="h-4 w-4 mr-2 text-blue-500" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2 text-green-500" />
                      )}
                      <div>
                        <p className="font-medium">{result.title}</p>
                        <p className="text-xs text-gray-500">
                          {result.type === 'produto' ? 'Produto' : 'Página'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* Mensagem quando não há resultados */}
            {isSearchFocused && searchTerm.trim().length > 2 && searchResults.length === 0 && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 md:right-0 md:left-auto md:transform-none mt-1 bg-white rounded-md shadow-lg border border-gray-200 z-50 w-72">
                <div className="p-4 text-center text-gray-500">
                  Nenhum resultado encontrado para "{searchTerm}"
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Indicador de status WebSocket */}
          <WebSocketStatusIndicator className="hidden md:flex" />
          {/* Menu de notificações */}
          <DropdownMenu modal={false} open={notificationsOpened} onOpenChange={handleOpenNotifications}>
            <DropdownMenuTrigger asChild>
              <div className="relative w-10 h-10 flex items-center justify-center">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none">
                    <div className="flex items-center justify-center w-5 h-5">
                      <Bell className="h-5 w-5" />
                    </div>
                  </Button>
                  <span className={`absolute -top-2 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-blue-500 ${unreadCount > 0 ? 'notification-badge-visible' : 'notification-badge-hidden'}`}>
                    {unreadCount || '0'}
                  </span>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={5} className="w-80 md:right-0 notifications-dropdown">
              <div className="p-2 border-b border-gray-200 bg-gray-50">
                <p className="text-sm font-medium text-gray-700">Notificações</p>
              </div>
              <div className="py-1 max-h-[calc(70vh-100px)] overflow-y-auto">
                {/* Notificação 1 */}
                <div onClick={goToAllNotifications} className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3 mt-1">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
                        <Package className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Novo produto cadastrado</p>
                      <p className="text-xs text-gray-500 mt-0.5">Smartphone Galaxy S23 foi adicionado ao sistema</p>
                      <p className="text-xs text-gray-400 mt-1">Há 2 horas</p>
                    </div>
                  </div>
                </div>
                
                {/* Notificação 2 */}
                <div onClick={goToAllNotifications} className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3 mt-1">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-500">
                        <DollarSign className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Precificação concluída</p>
                      <p className="text-xs text-gray-500 mt-0.5">Notebook Dell Inspiron foi precificado com sucesso</p>
                      <p className="text-xs text-gray-400 mt-1">Há 5 horas</p>
                    </div>
                  </div>
                </div>
                
                {/* Notificação 3 */}
                <div onClick={goToAllNotifications} className="px-4 py-3 hover:bg-gray-100 cursor-pointer">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3 mt-1">
                      <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-500">
                        <FileText className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Importação realizada</p>
                      <p className="text-xs text-gray-500 mt-0.5">15 produtos novos foram importados com sucesso</p>
                      <p className="text-xs text-gray-400 mt-1">Há 1 dia</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-2 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={goToAllNotifications}
                  className="w-full rounded-md py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-primary"
                >
                  Ver todas as notificações
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Menu de perfil do usuário */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="relative w-10 h-10 flex items-center justify-center">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full border border-gray-200 p-1 text-gray-500 hover:bg-gray-100 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                  >
                    <div className="flex items-center justify-center w-5 h-5">
                      <User className="h-5 w-5" />
                    </div>
                  </Button>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={5} className="w-56 md:right-0 user-dropdown">
              <DropdownMenuItem onClick={() => {
                navigate("/minha-conta");
                // Forçar navegação sem recarregar a página
                const event = new CustomEvent('tab-change', { detail: 'dados' });
                window.dispatchEvent(event);
              }}>
                <User className="mr-2 h-4 w-4" />
                <span>Meu Perfil</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => {
                navigate("/minha-conta?tab=enderecos");
                // Forçar navegação sem recarregar a página
                const event = new CustomEvent('tab-change', { detail: 'enderecos' });
                window.dispatchEvent(event);
              }}>
                <MapPin className="mr-2 h-4 w-4" />
                <span>Endereços</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => {
                navigate("/minha-conta?tab=contatos");
                // Forçar navegação sem recarregar a página
                const event = new CustomEvent('tab-change', { detail: 'contatos' });
                window.dispatchEvent(event);
              }}>
                <Phone className="mr-2 h-4 w-4" />
                <span>Contatos</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => {
                navigate("/minha-conta?tab=usuarios");
                // Forçar navegação sem recarregar a página
                const event = new CustomEvent('tab-change', { detail: 'usuarios' });
                window.dispatchEvent(event);
              }}>
                <Users className="mr-2 h-4 w-4" />
                <span>Usuários</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => {
                navigate("/minha-conta?tab=financeiro");
                // Forçar navegação sem recarregar a página
                const event = new CustomEvent('tab-change', { detail: 'financeiro' });
                window.dispatchEvent(event);
              }}>
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Financeiro</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => {
                navigate("/minha-conta?tab=seguranca");
                // Forçar navegação sem recarregar a página
                const event = new CustomEvent('tab-change', { detail: 'seguranca' });
                window.dispatchEvent(event);
              }}>
                <Shield className="mr-2 h-4 w-4" />
                <span>Segurança da Conta</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={showLogoutConfirmation}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Diálogo de confirmação de logout */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmação de Saída</AlertDialogTitle>
            <AlertDialogDescription>
              Você realmente deseja sair do sistema?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Sim, sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}