import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LucideHome, 
  ShoppingCart, 
  Settings, 
  Users, 
  Package, 
  Truck, 
  Tags, 
  DollarSign,
  BarChart2,
  Menu,
  X,
  Calculator,
  FileText,
  Briefcase,
  Building2,
  BarChart,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ href, icon, label, active, onClick }) => {
  return (
    <Link href={href}>
      <a
        className={cn(
          "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
        onClick={onClick}
      >
        <span className="mr-3 h-5 w-5">{icon}</span>
        <span>{label}</span>
      </a>
    </Link>
  );
};

const SidebarSection: React.FC<SidebarSectionProps> = ({ title, children }) => {
  return (
    <div className="mb-6">
      <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
};

const Sidebar: React.FC = () => {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-primary text-primary-foreground"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-background border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-center h-16 border-b">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            Meu Preço Certo
          </h1>
        </div>

        <div className="p-4 overflow-y-auto h-[calc(100vh-4rem)]">
          <SidebarSection title="Principal">
            <SidebarItem
              href="/dashboard"
              icon={<LucideHome className="h-5 w-5" />}
              label="Dashboard"
              active={location === "/dashboard"}
              onClick={() => setIsOpen(false)}
            />
            <SidebarItem
              href="/notificacoes"
              icon={<BarChart className="h-5 w-5" />}
              label="Indicadores"
              active={location === "/notificacoes"}
              onClick={() => setIsOpen(false)}
            />
          </SidebarSection>

          <SidebarSection title="Precificação">
            <SidebarItem
              href="/precificacao/novos"
              icon={<Package className="h-5 w-5" />}
              label="Produtos Novos"
              active={location.includes("/precificacao/novos")}
              onClick={() => setIsOpen(false)}
            />
            <SidebarItem
              href="/precificacao/usados"
              icon={<Briefcase className="h-5 w-5" />}
              label="Produtos Usados"
              active={location.includes("/precificacao/usados")}
              onClick={() => setIsOpen(false)}
            />
            <SidebarItem
              href="/precificacao/servicos"
              icon={<FileText className="h-5 w-5" />}
              label="Serviços"
              active={location.includes("/precificacao/servicos")}
              onClick={() => setIsOpen(false)}
            />
            <SidebarItem
              href="/precificacao/alugueis"
              icon={<Building2 className="h-5 w-5" />}
              label="Aluguéis"
              active={location.includes("/precificacao/alugueis")}
              onClick={() => setIsOpen(false)}
            />
          </SidebarSection>

          <SidebarSection title="Cadastros">
            <SidebarItem
              href="/cadastros/produtos"
              icon={<ShoppingCart className="h-5 w-5" />}
              label="Produtos"
              active={location === "/cadastros/produtos"}
              onClick={() => setIsOpen(false)}
            />
            <SidebarItem
              href="/cadastros/servicos"
              icon={<FileText className="h-5 w-5" />}
              label="Serviços"
              active={location === "/cadastros/servicos"}
              onClick={() => setIsOpen(false)}
            />
            <SidebarItem
              href="/cadastros/alugueis"
              icon={<Building2 className="h-5 w-5" />}
              label="Itens de Aluguel"
              active={location === "/cadastros/alugueis"}
              onClick={() => setIsOpen(false)}
            />
            <SidebarItem
              href="/cadastros/fornecedores"
              icon={<Truck className="h-5 w-5" />}
              label="Fornecedores"
              active={location === "/cadastros/fornecedores"}
              onClick={() => setIsOpen(false)}
            />
            <SidebarItem
              href="/cadastros/categorias"
              icon={<Tags className="h-5 w-5" />}
              label="Categorias"
              active={location === "/cadastros/categorias"}
              onClick={() => setIsOpen(false)}
            />
            <SidebarItem
              href="/cadastros/custos"
              icon={<Calculator className="h-5 w-5" />}
              label="Custos"
              active={location === "/cadastros/custos"}
              onClick={() => setIsOpen(false)}
            />
            <SidebarItem
              href="/cadastros/despesas"
              icon={<DollarSign className="h-5 w-5" />}
              label="Despesas"
              active={location === "/cadastros/despesas"}
              onClick={() => setIsOpen(false)}
            />
            <SidebarItem
              href="/cadastros/clientes"
              icon={<Users className="h-5 w-5" />}
              label="Clientes"
              active={location === "/cadastros/clientes"}
              onClick={() => setIsOpen(false)}
            />
          </SidebarSection>

          <SidebarSection title="Configurações">
            <SidebarItem
              href="/minha-conta"
              icon={<Settings className="h-5 w-5" />}
              label="Minha Conta"
              active={location === "/minha-conta"}
              onClick={() => setIsOpen(false)}
            />
            <SidebarItem
              href="/planos-e-upgrades"
              icon={<BarChart2 className="h-5 w-5" />}
              label="Planos e Upgrades"
              active={location === "/planos-e-upgrades"}
              onClick={() => setIsOpen(false)}
            />
            <SidebarItem
              href="/suporte"
              icon={<HelpCircle className="h-5 w-5" />}
              label="Suporte"
              active={location === "/suporte"}
              onClick={() => setIsOpen(false)}
            />
          </SidebarSection>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
};

export default Sidebar;