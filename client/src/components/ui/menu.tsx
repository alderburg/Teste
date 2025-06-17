import React, { useState } from "react";
import { Link } from "wouter";
import { 
  BarChart, 
  DollarSign, 
  FileText, 
  Home, 
  Menu as MenuIcon, 
  ShoppingCart, 
  User 
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

export function Menu() {
  const [isOpen, setIsOpen] = useState(false);
  
  const menuItems: MenuItem[] = [
    { 
      href: "/dashboard", 
      label: "Dashboard", 
      icon: <Home className="h-5 w-5" />, 
      active: false
    },
    { 
      href: "/cadastros/custos", 
      label: "Cadastro de Custos", 
      icon: <FileText className="h-5 w-5" />, 
      active: true
    },
    { 
      href: "/vendas", 
      label: "Vendas", 
      icon: <ShoppingCart className="h-5 w-5" />, 
      active: false
    },
    { 
      href: "/financeiro", 
      label: "Financeiro", 
      icon: <DollarSign className="h-5 w-5" />, 
      active: false
    },
    { 
      href: "/relatorios", 
      label: "Relatórios", 
      icon: <BarChart className="h-5 w-5" />, 
      active: false
    },
    { 
      href: "/conta", 
      label: "Minha Conta", 
      icon: <User className="h-5 w-5" />, 
      active: false
    },
  ];

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-16 px-4">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <span className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold">SF</span>
                <span className="ml-2 text-lg font-semibold hidden md:block">Sistema Financeiro</span>
              </div>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              {menuItems.map((item) => (
                <Link 
                  key={item.href}
                  href={item.href}
                >
                  <div className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium cursor-pointer",
                    item.active 
                      ? "bg-blue-600 text-white" 
                      : "text-gray-600 hover:bg-blue-100 hover:text-blue-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  )}>
                    <span className="mr-2">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="sr-only">Abrir menu principal</span>
              <MenuIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white dark:bg-gray-800 shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {menuItems.map((item) => (
              <Link 
                key={item.href}
                href={item.href}
              >
                <div className={cn(
                  "flex items-center px-3 py-2 rounded-md text-base font-medium cursor-pointer",
                  item.active 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-600 hover:bg-blue-100 hover:text-blue-800 dark:text-gray-200 dark:hover:bg-gray-700"
                )}>
                  <span className="mr-3">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}