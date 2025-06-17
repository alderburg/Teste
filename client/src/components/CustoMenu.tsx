import React, { useState } from "react";
import { Link } from "wouter";
import {
  Menu as MenuIcon,
  Home,
  FileText,
  DollarSign,
  BarChart3,
  ShoppingCart,
  Settings,
  User
} from "lucide-react";

export default function CustoMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <Home className="h-4 w-4 mr-2" />
    },
    {
      href: "/cadastros/custos",
      label: "Custos",
      icon: <FileText className="h-4 w-4 mr-2" />
    },
    {
      href: "/vendas",
      label: "Vendas",
      icon: <ShoppingCart className="h-4 w-4 mr-2" />
    },
    {
      href: "/financeiro",
      label: "Financeiro",
      icon: <DollarSign className="h-4 w-4 mr-2" />
    },
    {
      href: "/relatorios",
      label: "Relatórios",
      icon: <BarChart3 className="h-4 w-4 mr-2" />
    },
    {
      href: "/configuracoes",
      label: "Configurações",
      icon: <Settings className="h-4 w-4 mr-2" />
    }
  ];

  return (
    <div className="bg-white shadow-sm">
      {/* Desktop Navigation */}
      <div className="container mx-auto hidden md:block">
        <div className="flex items-center h-16">
          <div className="mr-6">
            <Link href="/">
              <span className="flex items-center">
                <span className="h-8 w-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-sm">SF</span>
                <span className="ml-2 font-semibold text-gray-900">Sistema Financeiro</span>
              </span>
            </Link>
          </div>
          <nav className="flex space-x-4">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <a className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center">
                  {item.icon}
                  {item.label}
                </a>
              </Link>
            ))}
          </nav>
          <div className="ml-auto">
            <Link href="/conta">
              <a className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-700" />
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700">Minha Conta</span>
              </a>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="container mx-auto md:hidden">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/">
            <span className="flex items-center">
              <span className="h-8 w-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-sm">SF</span>
            </span>
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
        </div>
        
        {isOpen && (
          <div className="px-2 pt-2 pb-3 space-y-1">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <a className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center">
                  {item.icon}
                  {item.label}
                </a>
              </Link>
            ))}
            <Link href="/conta">
              <a className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Minha Conta
              </a>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}