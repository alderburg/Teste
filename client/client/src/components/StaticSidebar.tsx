import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Home, DollarSign, Tag, Calculator, History, 
  BarChart2, ClipboardList, Landmark, Percent, 
  User, Settings, HelpCircle, LogOut, BookOpen,
  Building, PackageOpen, ShoppingBag, Wrench, Gift, Box, Rocket,
  Truck, Divide
} from "lucide-react";
import LogoImage from "@/assets/images/logo/webp/Negativo.webp";
import LogoSelo from "@/assets/images/logo/webp/Selo.webp";
import { cn } from "@/lib/utils";
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
import { useAuth } from "@/hooks/use-auth";

interface SidebarProps {
  isOpen: boolean;
  isMinimized: boolean;
  toggleSidebar: () => void;
  minimizeSidebar: () => void;
  isMobile: boolean;
}

// Abordagem estática: menus não fecham sozinhos
export default function StaticSidebar({ isOpen, isMinimized, toggleSidebar, minimizeSidebar, isMobile }: SidebarProps) {
  const [location, navigate] = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const { logout, logoutMutation } = useAuth();
  
  // Esconde o sidebar inicialmente em mobile para não aparecer nem por um milissegundo
  // A ocultação inicial agora é tratada via CSS/JS no HTML antes do React

  // Determinamos qual menu deve estar aberto com base na URL atual
  const getActiveMenu = (path: string) => {
    if (path.startsWith('/precificacao/')) return 'precificacao';
    if (path.startsWith('/calculadoras/')) return 'calculadoras';
    // Removido - Aluguéis agora é um item no menu principal sem submenu
    if (path.startsWith('/cadastros/produtos/')) return 'cadastros-produtos';
    if (path.startsWith('/cadastros/servicos')) return 'cadastros-servicos';
    //if (path.startsWith('/cadastros/custos')) return 'cadastros-custos';
    if (path.startsWith('/relatorios/')) return 'relatorios';
    if (path.startsWith('/cadastros/custos/')) return 'custos';
    if (path.startsWith('/cadastros/despesas/')) return 'despesas';
    if (path.startsWith('/cadastros/taxas/')) return 'taxas';
    if (path.startsWith('/cadastros/promocoes/')) return 'promocoes';
    if (path.startsWith('/taxas/')) return 'taxas';
    if (path.startsWith('/tributacoes/')) return 'tributacoes';
    if (path.startsWith('/autenticacao/')) return 'auth-settings';
    return '';
  };

  // Estado para os menus abertos, não mais usando persistência para evitar problemas
  const [openedMenus, setOpenedMenus] = useState<string[]>(() => {
    // Sempre inicia com menu fechado e só abre o menu ativo se for necessário
    if (location === '/dashboard') {
      return [];
    }
    
    // Somente abre o menu ativo se for uma página que precisa de submenu
    const activeMenu = getActiveMenu(location);
    return activeMenu ? [activeMenu] : [];
  });

  // Verifica se o path precisa ter um submenu aberto
  const needsSubmenu = (path: string) => {
    return path.startsWith('/precificacao/') || 
           path.startsWith('/promocoes/') || 
           path.startsWith('/calculadoras/') || 
           // Removido - path.startsWith('/cadastros/alugueis/') - Aluguéis agora é um item sem submenu
           path.startsWith('/cadastros/produtos/') || 
           path.startsWith('/cadastros/servicos/') || 
           path.startsWith('/cadastros/custos/') || 
           path.startsWith('/relatorios/') || 
           path.startsWith('/cadastros/despesas/') || 
           path.startsWith('/cadastros/taxas/') || 
           path.startsWith('/cadastros/promocoes/') || 
           path.startsWith('/cadastros/tributacoes/');
  };

  // Atualiza o menu aberto quando a localização mudar, mas sem causar re-renderização desnecessária
  useEffect(() => {
    // Se não precisa de submenu aberto, fecha todos
    if (!needsSubmenu(location)) {
      setOpenedMenus([]);
      return;
    }
    
    const currentActive = getActiveMenu(location);
    if (currentActive && !openedMenus.includes(currentActive)) {
      // Usando o callback para ter acesso ao estado mais recente
      setOpenedMenus(prevOpenedMenus => {
        // Se o menu já está nos menus abertos, não faça nada para evitar re-renderização desnecessária
        if (prevOpenedMenus.includes(currentActive)) {
          return prevOpenedMenus;
        }
        // Caso contrário, abre apenas este menu, fechando todos os outros
        return [currentActive];
      });
    }
  }, [location]);

  // Função para navegar para um path, evitando navegação para o mesmo path
  // e mantendo o estado da aplicação sem recarregar a página
  const goTo = (path: string) => {
    // Para o caso especial do logout, mostramos o diálogo de confirmação
    if (path === "/logout") {
      setLogoutDialogOpen(true);
      return;
    }
    
    // Evita navegação desnecessária para a mesma página
    if (location !== path) {
      // Fecha todos os menus ao navegar para o dashboard ou página sem submenu
      if (path === '/dashboard' || !needsSubmenu(path)) {
        setOpenedMenus([]);
      }
      
      // Em dispositivos móveis, fecha o menu lateral ao navegar
      if (isMobile) {
        toggleSidebar(); // Usamos a função que recebemos como prop
      }
      
      // Usar navigate do wouter que preserva o estado e não recarrega a página
      navigate(path, { replace: false });
      
      // Scroll para o topo da página de forma suave
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
        
        // Também rolagem para o topo do container principal
        const mainElement = document.querySelector('main');
        if (mainElement) {
          mainElement.scrollTop = 0;
        }
      }, 50);
    }
  };
  
  // Função para lidar com a confirmação de logout
  const handleLogout = () => {
    // Fechar o diálogo
    setLogoutDialogOpen(false);
    
    // Usar diretamente a função de logout do contexto de autenticação
    // que já cuida de limpar os dados e fazer o redirecionamento
    logout();
  };
  
  // Removemos a persistência dos menus no localStorage para evitar comportamentos inesperados
  // useEffect(() => {
  //   localStorage.setItem('openedMenus', JSON.stringify(openedMenus));
  // }, [openedMenus]);

  // Função para alternar um menu, mantendo apenas o último aberto
  const toggleMenu = (menuId: string) => {
    setOpenedMenus(prevOpenedMenus => {
      let newState;
      if (prevOpenedMenus.includes(menuId)) {
        // Se já está aberto, fecha
        newState = prevOpenedMenus.filter(id => id !== menuId);
      } else {
        // Se está fechado, abre apenas este menu, fechando todos os outros
        newState = [menuId];
      }
      return newState;
    });
  };
  
  // Detecta quando o menu deve ser expandido
  // Adicionamos um useEffect para garantir que o estado de hover seja atualizado quando isMinimized mudar
  useEffect(() => {
    if (isMinimized) {
      setIsHovered(false);
    }
  }, [isMinimized]);
  
  const shouldExpand = !isMinimized || isMobile || isHovered;

  // Em mobile, controlamos a visibilidade apenas pelo estado isOpen
  
  // Adiciona comportamento de scroll para mostrar/esconder a scrollbar
  useEffect(() => {
    const sidebarElement = document.querySelector('.sidebar-scroll');
    if (sidebarElement) {
      let scrollTimer: number | null = null;
      
      const handleScroll = () => {
        sidebarElement.classList.add('scrolling');
        
        // Remove a classe após 1.5 segundos de inatividade
        if (scrollTimer) {
          window.clearTimeout(scrollTimer);
        }
        
        scrollTimer = window.setTimeout(() => {
          sidebarElement.classList.remove('scrolling');
        }, 1500);
      };
      
      sidebarElement.addEventListener('scroll', handleScroll);
      
      return () => {
        sidebarElement.removeEventListener('scroll', handleScroll);
        if (scrollTimer) window.clearTimeout(scrollTimer);
      };
    }
  }, []);
  
  return (
    <aside 
      className={cn(
        `sidebar fixed left-0 top-0 z-40 h-screen ${shouldExpand ? 'w-64' : 'w-20'} bg-gray-900 text-white md:translate-x-0 transition-all duration-100 ease-out`,
        (isMobile && !isOpen) ? "-translate-x-full" : "translate-x-0",
        isOpen ? "sidebar-open" : "" // Adicionamos esta classe para o CSS do HTML
      )}
      onMouseEnter={() => isMinimized && !isMobile && setIsHovered(true)}
      onMouseLeave={() => isMinimized && !isMobile && setIsHovered(false)}
    >
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <div className={`flex items-center ${(!shouldExpand) ? 'justify-center w-full' : 'space-x-2 px-4'}`}>
          {shouldExpand ? (
            <img src={LogoImage} alt="Meu Preço Certo" className="h-10" />
          ) : (
            <img src={LogoSelo} alt="Meu Preço Certo" className="h-9 w-9" />
          )}
        </div>
      </div>

      <div className="h-[calc(100vh-4rem)] overflow-y-auto py-4 sidebar-scroll hover:scrollbar-visible">
        <nav className="space-y-1 px-2">
          {/* Dashboard */}
          <div
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
              location === "/dashboard" 
                ? "bg-gray-800 text-primary" 
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
            onClick={() => goTo("/dashboard")}
          >
            <Home className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
            {shouldExpand && <span>Dashboard</span>}
          </div>

          {/* Categoria: PRECIFICADORES */}
          {shouldExpand ? (
            <div className="mt-6 px-3 text-xs font-semibold uppercase text-gray-400">
              PRECIFICADORES
            </div>
          ) : (
            <div className="mt-6 mx-auto px-3 border-t border-gray-700 w-10"></div>
          )}

          {/* Menu: Precificação */}
          <div>
            <button
              onClick={() => toggleMenu("precificacao")}
              className={cn(
                `flex w-full items-center ${!shouldExpand ? 'justify-center' : 'justify-between'} rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white`,
                openedMenus.includes("precificacao") && "bg-gray-800"
              )}
            >
              <div className="flex items-center">
                <DollarSign className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
                {shouldExpand && <span>Precificação</span>}
              </div>
              {shouldExpand && (
                <svg
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    openedMenus.includes("precificacao") ? "rotate-90 transform" : ""
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
            
            {/* Submenu estático */}
            <div className={cn(
              "ml-6 mt-1 space-y-1 transition-all duration-100 ease-in",
              openedMenus.includes("precificacao") && shouldExpand ? "block" : "hidden"
            )}>
              <div
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                  location.startsWith("/precificacao/novos") 
                    ? "bg-gray-700 text-primary" 
                    : "text-gray-400 hover:bg-gray-700 hover:text-white"
                )}
                onClick={() => goTo("/precificacao/novos")}
              >
                Novos
              </div>
              <div
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                  location.startsWith("/precificacao/usados") 
                    ? "bg-gray-700 text-primary" 
                    : "text-gray-400 hover:bg-gray-700 hover:text-white"
                )}
                onClick={() => goTo("/precificacao/usados")}
              >
                Usados
              </div>
              <div
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                  location.startsWith("/precificacao/servicos") 
                    ? "bg-gray-700 text-primary" 
                    : "text-gray-400 hover:bg-gray-700 hover:text-white"
                )}
                onClick={() => goTo("/precificacao/servicos")}
              >
                Serviços
              </div>
              <div
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                  location.startsWith("/precificacao/alugueis") 
                    ? "bg-gray-700 text-primary" 
                    : "text-gray-400 hover:bg-gray-700 hover:text-white"
                )}
                onClick={() => goTo("/precificacao/alugueis")}
              >
                Aluguéis
              </div>
            </div>
          </div>



          {/* Menu: Calculadoras */}
          <div>
            <button
              onClick={() => toggleMenu("calculadoras")}
              className={cn(
                `flex w-full items-center ${!shouldExpand ? 'justify-center' : 'justify-between'} rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white`,
                openedMenus.includes("calculadoras") && "bg-gray-800"
              )}
            >
              <div className="flex items-center">
                <Calculator className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
                {shouldExpand && <span>Calculadoras</span>}
              </div>
              {shouldExpand && (
                <svg
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    openedMenus.includes("calculadoras") ? "rotate-90 transform" : ""
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
            
            {/* Submenu */}
            <div className={cn(
              "ml-6 mt-1 space-y-1 transition-all duration-100 ease-in",
              openedMenus.includes("calculadoras") && shouldExpand ? "block" : "hidden"
            )}>
              <div
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                  location === "/calculadoras/novos" 
                    ? "bg-gray-700 text-primary" 
                    : "text-gray-400 hover:bg-gray-700 hover:text-white"
                )}
                onClick={() => goTo("/calculadoras/novos")}
              >
                Novos
              </div>
              <div
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                  location === "/calculadoras/usados" 
                    ? "bg-gray-700 text-primary" 
                    : "text-gray-400 hover:bg-gray-700 hover:text-white"
                )}
                onClick={() => goTo("/calculadoras/usados")}
              >
                Usados
              </div>
              <div
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                  location === "/calculadoras/servicos" 
                    ? "bg-gray-700 text-primary" 
                    : "text-gray-400 hover:bg-gray-700 hover:text-white"
                )}
                onClick={() => goTo("/calculadoras/servicos")}
              >
                Serviços
              </div>
            </div>
          </div>

          {/* Categoria: CADASTROS */}
          {shouldExpand ? (
            <div className="mt-6 px-3 text-xs font-semibold uppercase text-gray-400">
              CADASTROS
            </div>
          ) : (
            <div className="mt-6 mx-auto px-3 border-t border-gray-700 w-10"></div>
          )}

          {/* Menu: Aluguéis - Agora sem submenu */}
          <div
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
              location === "/cadastros/alugueis" 
                ? "bg-gray-800 text-primary" 
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
            onClick={() => goTo("/cadastros/alugueis")}
          >
            <Box className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
            {shouldExpand && <span>Aluguéis</span>}
          </div>

          {/* Menu: Produtos - Agora sem submenu */}
          <div
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
              location === "/cadastros/produtos" 
                ? "bg-gray-800 text-primary" 
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
            onClick={() => goTo("/cadastros/produtos")}
          >
            <ShoppingBag className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
            {shouldExpand && <span>Produtos</span>}
          </div>

          {/* Menu: Serviços - Agora sem submenu */}
          <div
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
              location === "/cadastros/servicos" 
                ? "bg-gray-800 text-primary" 
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
            onClick={() => goTo("/cadastros/servicos")}
          >
            <Wrench className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
            {shouldExpand && <span>Serviços</span>}
          </div>

          {/* Menu: Fornecedores */}
          <div>
            <div
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                location === "/cadastros/fornecedores" 
                  ? "bg-gray-800 text-primary" 
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
              onClick={() => goTo("/cadastros/fornecedores")}
            >
              <Truck className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
              {shouldExpand && <span>Fornecedores</span>}
            </div>
          </div>

          {/* Menu: Clientes */}
          <div>
            <div
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                location === "/cadastros/clientes" 
                  ? "bg-gray-800 text-primary" 
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
              onClick={() => goTo("/cadastros/clientes")}
            >
              <User className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
              {shouldExpand && <span>Clientes</span>}
            </div>
          </div>

          {/* Menu: Categorias */}
          <div>
            <div
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                location === "/cadastros/categorias" 
                  ? "bg-gray-800 text-primary" 
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
              onClick={() => goTo("/cadastros/categorias")}
            >
              <Tag className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
              {shouldExpand && <span>Categorias</span>}
            </div>
            

          </div>

          {/* Categoria: RELATÓRIOS */}
          {shouldExpand ? (
            <div className="mt-6 px-3 text-xs font-semibold uppercase text-gray-400">
              RELATÓRIOS
            </div>
          ) : (
            <div className="mt-6 mx-auto px-3 border-t border-gray-700 w-10"></div>
          )}

          {/* Menu: Relatórios */}
          <div>
            <button
              onClick={() => toggleMenu("relatorios")}
              className={cn(
                `flex w-full items-center ${!shouldExpand ? 'justify-center' : 'justify-between'} rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white`,
                openedMenus.includes("relatorios") && "bg-gray-800"
              )}
            >
              <div className="flex items-center">
                <History className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
                {shouldExpand && <span>Relatórios</span>}
              </div>
              {shouldExpand && (
                <svg
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    openedMenus.includes("relatorios") ? "rotate-90 transform" : ""
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
            
            {/* Submenu */}
            <div className={cn(
              "ml-6 mt-1 space-y-1 transition-all duration-100 ease-in",
              openedMenus.includes("relatorios") && shouldExpand ? "block" : "hidden"
            )}>
              <div
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                  location === "/relatorios/alugueis" 
                    ? "bg-gray-700 text-primary" 
                    : "text-gray-400 hover:bg-gray-700 hover:text-white"
                )}
                onClick={() => goTo("/relatorios/alugueis")}
              >
                Aluguéis
              </div>
              <div
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                  location === "/relatorios/produtos" 
                    ? "bg-gray-700 text-primary" 
                    : "text-gray-400 hover:bg-gray-700 hover:text-white"
                )}
                onClick={() => goTo("/relatorios/produtos")}
              >
                Produtos
              </div>
              <div
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                  location === "/relatorios/servicos" 
                    ? "bg-gray-700 text-primary" 
                    : "text-gray-400 hover:bg-gray-700 hover:text-white"
                )}
                onClick={() => goTo("/relatorios/servicos")}
              >
                Serviços
              </div>
            </div>
          </div>

          {/* Categoria: GERENCIAL */}
          {shouldExpand ? (
            <div className="mt-6 px-3 text-xs font-semibold uppercase text-gray-400">
              GERENCIAL
            </div>
          ) : (
            <div className="mt-6 mx-auto px-3 border-t border-gray-700 w-10"></div>
          )}

          {/* Menu: Custos (Sem submenu) */}
          <div
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
              location === "/cadastros/custos" 
                ? "bg-gray-800 text-primary" 
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
            onClick={() => goTo("/cadastros/custos")}
          >
            <BarChart2 className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
            {shouldExpand && <span>Custos</span>}
          </div>
          
          {/* Menu: Despesas (Sem submenu) */}
          <div
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
              location === "/cadastros/despesas" 
                ? "bg-gray-800 text-primary" 
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
            onClick={() => goTo("/cadastros/despesas")}
          >
            <ClipboardList className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
            {shouldExpand && <span>Despesas</span>}
          </div>

          {/* Menu: Taxas Diversas (Sem submenu) */}
          <div
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
              location === "/cadastros/taxas" 
                ? "bg-gray-800 text-primary" 
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
            onClick={() => goTo("/cadastros/taxas")}
          >
            <Landmark className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
            {shouldExpand && <span>Taxas Diversas</span>}
          </div>

          {/* Menu: Promoções (Sem submenu) */}
          <div
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
              location === "/cadastros/promocoes" 
                ? "bg-gray-800 text-primary" 
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
            onClick={() => navigate("/cadastros/promocoes")}
          >
            <Percent className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
            {shouldExpand && <span>Promoções</span>}
          </div>
          
          {/* Menu: Rateios */}
          <div
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
              location === "/cadastros/rateios" 
                ? "bg-gray-800 text-primary" 
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
            onClick={() => goTo("/cadastros/rateios")}
          >
            <Divide className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
            {shouldExpand && <span>Rateios</span>}
          </div>

          {/* Menu: Tributações (Sem submenu) */}
          <div
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
              location === "/cadastros/tributacoes" 
                ? "bg-gray-800 text-primary" 
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
            onClick={() => goTo("/cadastros/tributacoes")}
          >
            <Percent className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
            {shouldExpand && <span>Tributações</span>}
          </div>

          {/* Categoria: CONTA */}
          {shouldExpand ? (
            <div className="mt-6 px-3 text-xs font-semibold uppercase text-gray-400">
              CONTA
            </div>
          ) : (
            <div className="mt-6 mx-auto px-3 border-t border-gray-700 w-10"></div>
          )}

          {/* Minha Conta */}
          <div
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
              location === "/minha-conta" 
                ? "bg-gray-800 text-primary" 
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
            onClick={() => goTo("/minha-conta")}
          >
            <User className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
            {shouldExpand && <span>Minha Conta</span>}
          </div>



          {/* Planos e Upgrades */}
          <div
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
              location === "/planos-e-upgrades" 
                ? "bg-gray-800 text-primary" 
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
            onClick={() => goTo("/planos-e-upgrades")}
          >
            <Rocket className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
            {shouldExpand && <span>Planos e Upgrades</span>}
          </div>

          {/* Categoria: AJUDA */}
          {shouldExpand ? (
            <div className="mt-6 px-3 text-xs font-semibold uppercase text-gray-400">
              AJUDA
            </div>
          ) : (
            <div className="mt-6 mx-auto px-3 border-t border-gray-700 w-10"></div>
          )}

          {/* Treinamentos */}
          <div
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
              location === "/treinamentos" 
                ? "bg-gray-800 text-primary" 
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
            onClick={() => goTo("/treinamentos")}
          >
            <BookOpen className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
            {shouldExpand && <span>Treinamentos</span>}
          </div>

          {/* Suporte */}
          <div
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
              location === "/suporte" 
                ? "bg-gray-800 text-primary" 
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
            onClick={() => goTo("/suporte")}
          >
            <HelpCircle className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
            {shouldExpand && <span>Suporte</span>}
          </div>

          {/* Logout */}
          <div
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer text-gray-300 hover:bg-red-900 hover:text-white mt-4"
            )}
            onClick={() => setLogoutDialogOpen(true)}
          >
            <LogOut className={`${!shouldExpand ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
            {shouldExpand && <span>Sair</span>}
          </div>
        </nav>
      </div>
      
      {/* Diálogo de confirmação de logout */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente sair?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao confirmar, você será desconectado do sistema e redirecionado para a tela de login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}