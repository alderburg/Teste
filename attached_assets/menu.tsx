import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "./layout/sidebar-nav";
import { UserNav } from "./layout/user-nav";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  DollarSign,
  Package,
  ClipboardList,
  Building,
  Plus,
  BarChart3,
  Settings,
  ArrowUp,
  ArrowDown,
  Calendar,
} from "lucide-react";

export function Menu() {
  const [location] = useLocation();
  
  // Principal navigation items
  const principalItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      active: location === "/dashboard",
    },
    {
      title: "Custos",
      href: "/custos",
      icon: <DollarSign className="h-5 w-5" />,
      active: location.startsWith("/custos"),
    },
    {
      title: "Produtos",
      href: "/produtos",
      icon: <Package className="h-5 w-5" />,
      active: location.startsWith("/produtos"),
    },
    {
      title: "Serviços",
      href: "/servicos",
      icon: <ClipboardList className="h-5 w-5" />,
      active: location.startsWith("/servicos"),
    },
    {
      title: "Aluguéis",
      href: "/alugueis",
      icon: <Building className="h-5 w-5" />,
      active: location.startsWith("/alugueis"),
    },
  ];

  // Categorias de custos items
  const categoriasItems = [
    {
      title: "Novos",
      href: "/custos/categoria/novos",
      icon: <span className="h-2 w-2 rounded-full bg-green-500" />,
      active: location === "/custos/categoria/novos",
      count: 15,
    },
    {
      title: "Usados",
      href: "/custos/categoria/usados",
      icon: <span className="h-2 w-2 rounded-full bg-blue-500" />,
      active: location === "/custos/categoria/usados",
      count: 8,
    },
    {
      title: "Aluguéis",
      href: "/custos/categoria/alugueis",
      icon: <span className="h-2 w-2 rounded-full bg-purple-500" />,
      active: location === "/custos/categoria/alugueis",
      count: 3,
    },
    {
      title: "Serviços",
      href: "/custos/categoria/servicos",
      icon: <span className="h-2 w-2 rounded-full bg-orange-500" />,
      active: location === "/custos/categoria/servicos",
      count: 12,
    },
  ];

  // Acesso rápido items
  const acessoRapidoItems = [
    {
      title: "Novo Custo",
      href: "/custos/novo",
      icon: <Plus className="h-5 w-5" />,
      active: location === "/custos/novo",
    },
    {
      title: "Relatórios",
      href: "/relatorios",
      icon: <BarChart3 className="h-5 w-5" />,
      active: location.startsWith("/relatorios"),
    },
    {
      title: "Configurações",
      href: "/configuracoes",
      icon: <Settings className="h-5 w-5" />,
      active: location.startsWith("/configuracoes"),
    },
  ];

  // Filtros rápidos
  const filtros = [
    {
      label: "Maior valor",
      icon: <ArrowUp className="h-4 w-4" />,
      active: true,
    },
    {
      label: "Menor valor",
      icon: <ArrowDown className="h-4 w-4" />,
      active: false,
    },
    {
      label: "Mais recentes",
      icon: <Calendar className="h-4 w-4" />,
      active: false,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 shadow-sm">
      <div className="p-4 border-b">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 text-white p-1.5 rounded">
            <DollarSign className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold">Finance Control</h1>
        </div>
      </div>
      
      <ScrollArea className="flex-1 py-2">
        <div className="flex flex-col gap-6">
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Principal
            </h2>
            <SidebarNav items={principalItems} />
          </div>
          
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Categorias de Custos
            </h2>
            <SidebarNav items={categoriasItems} showCount />
          </div>
          
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Acesso Rápido
            </h2>
            <SidebarNav items={acessoRapidoItems} />
          </div>
          
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Filtros Rápidos
            </h2>
            <div className="px-4 space-y-2">
              {filtros.map((filtro, index) => (
                <Button
                  key={index}
                  variant={filtro.active ? "outline" : "outline"}
                  className={cn(
                    "w-full flex items-center justify-between text-sm px-3 py-1.5 rounded h-auto",
                    filtro.active ? "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100" : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <span className="flex items-center">
                    {React.cloneElement(filtro.icon as React.ReactElement, { className: "mr-2" })}
                    {filtro.label}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <UserNav />
      </div>
    </div>
  );
}