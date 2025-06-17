import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  DollarSign, 
  ArrowLeftRight, 
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/custos",
      label: "Custos",
      icon: DollarSign,
    },
    {
      href: "/transacoes",
      label: "Transações",
      icon: ArrowLeftRight,
    },
    {
      href: "/relatorios",
      label: "Relatórios",
      icon: BarChart3,
    },
  ];

  return (
    <nav className="space-y-1 px-2">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href}>
          <a
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              location === item.href
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </a>
        </Link>
      ))}
    </nav>
  );
}