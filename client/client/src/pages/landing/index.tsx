import React, { useState, useEffect, useRef, useCallback } from "react";
import { BadgePercent, Check, ArrowRight, Menu, HelpCircle, Clipboard, Info, Calculator, DollarSign, Percent, CreditCard, Truck, Tag, ArrowDownRight, AlertTriangle, Shield, FileText, X, CheckCircle2, Loader2, Mail, Package, TrendingUp, BarChart2, Target, Clock, RefreshCw, Star, AlertCircle, Cloud, Layers, Play, Users, BriefcaseBusiness, Building, Bell, Settings, ChevronDown, ArrowUpRight, Smartphone, Headphones, MoreHorizontal, ChevronLeft, ChevronRight, Phone, MapPin, Building2, Crown, Rocket, Database, FileSpreadsheet, ShoppingBag, MessageCircle } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import LogoDesktop from "@/assets/images/logo/webp/principal.webp";

// Interface Window global não é mais necessária, pois usamos componentes
import useEmblaCarousel from "embla-carousel-react";
import { AnimatedChartBar, AnimatedCount, AnimatedProgressBar, AnimateOnView } from "@/components/animated-chart";
import { MobileCardAnimation } from "@/components/mobile-animation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { BotaoAutenticacao } from "@/components/botoes/BotaoAutenticacao";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Minus } from "lucide-react";

// Importar as imagens do projeto
import positiveLogoPath from "@/assets/images/webp/Principal.webp";
import negativeLogoPath from "@/assets/images/webp/Negativo.webp";
import dashboardIllustration from "@/assets/images/webp/dashboard-illustration-1.webp";
import person1Image from "@/assets/images/users/webp/person1.webp";
import person2Image from "@/assets/images/users/webp/person2_new.webp";
import person3Image from "@/assets/images/users/webp/person3.webp";
import person4Image from "@/assets/images/users/webp/person4.webp";
import person5Image from "@/assets/images/users/webp/person5.webp";
import CompactAnalyticsDashboard from "@/components/dashboard-samples/compact-analytics-dashboard";
import CompactPricingDashboard from "@/components/dashboard-samples/compact-pricing-dashboard";
import CompactManagementDashboard from "@/components/dashboard-samples/compact-management-dashboard";

// Importar estilos customizados
import "./style.css";
import "./menu-fix.css";

// Componente de navegação para a landing page
const LandingNav: React.FC<{scrolled: boolean}> = ({ scrolled }) => {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Função helper para determinar o destino com base na autenticação
  // Aceita 'cadastro' e 'login' para dar um tratamento especial (redirecionamento para dashboard)
  // E também aceita outras seções do site para navegação interna
  const getDestinationUrl = (destino: string): string => {
    if ((destino === 'cadastro' || destino === 'login') && isAuthenticated) {
      console.log("Usuário já autenticado, destino será dashboard");
      return "/dashboard";
    } else {
      // Mapeamento de destinos
      switch (destino) {
        case 'cadastro': return "/cadastre-se";
        case 'login': return "/acessar";
        case 'home': return "#home";
        case 'calculadora': return "#calculadora";
        case 'prejuizo': return "#prejuizo";
        case 'planos': return "#planos";
        case 'depoimentos': return "#depoimentos";
        default: return `#${destino}`;
      }
    }
  };
  
  // Função para navegar considerando autenticação
  const handleNavigate = (e: React.MouseEvent, destino: string) => {
    e.preventDefault();
    const url = getDestinationUrl(destino);
    console.log(`Navegando para: ${url}`);
    
    // Se for link interno (#), navigate pelo comportamento padrão com scroll suave
    if (url.startsWith('#')) {
      const targetId = url.substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        const yOffset = -90; // Ajuste para o header fixo
        const y = targetElement.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({
          top: y,
          behavior: 'smooth'
        });
        
        // Fecha o menu mobile se estiver aberto
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        }
      }
    } else {
      // Se for link externo, use navigate para rotas internas
      navigate(url);
    }
  };
  
  // Removidas funções handleNavigateToCadastro e handleNavigateToLogin
  // Agora usando o componente BotaoAutenticacao para todos os botões que precisam verificar autenticação

  // Efeito para fechar o menu quando clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuOpen && 
          menuRef.current && 
          !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && 
          !buttonRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  // Função para controlar os links do menu interno (âncoras)
  const handleMenuScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    
    // Fechar o menu mobile se estiver aberto
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
    
    // Rolar até a seção
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -100;
      const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({top: y, behavior: 'smooth'});
      
      // Atualizar a URL com o novo hash, sem recarregar a página
      window.history.pushState(null, '', `#${id}`);
    }
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white shadow-md' : 'bg-black/20 backdrop-blur-sm'
    } py-4`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between w-full">
          {/* Logo - Completamente à esquerda */}
          <div className="flex-shrink-0">
            <img 
              src={scrolled ? positiveLogoPath : negativeLogoPath} 
              alt="Meu Preço Certo" 
              className="h-10 w-auto transition-all duration-300"
            />
          </div>
          
          {/* Espaço entre os elementos para garantir separação */}
          <div className="flex-grow"></div>
          
          {/* Desktop Navigation - Completamente à direita */}
          <div className="hidden md:flex items-center gap-6">
            <a 
              href="#home" 
              className={`text-sm font-medium transition-colors ${
                scrolled ? 'text-gray-700 hover:text-purple-700' : 'text-white hover:text-purple-200'
              }`}
              onClick={(e) => handleNavigate(e, 'home')}
            >
              Home
            </a>
            <a 
              href="#calculadora" 
              className={`text-sm font-medium transition-colors ${
                scrolled ? 'text-gray-700 hover:text-purple-700' : 'text-white hover:text-purple-200'
              }`}
              onClick={(e) => handleNavigate(e, 'calculadora')}
            >
              Calculadora
            </a>
            <a 
              href="#prejuizo" 
              className={`text-sm font-medium transition-colors ${
                scrolled ? 'text-gray-700 hover:text-purple-700' : 'text-white hover:text-purple-200'
              }`}
              onClick={(e) => handleNavigate(e, 'prejuizo')}
            >
              Funcionalidades
            </a>
            <a 
              href="#planos" 
              className={`text-sm font-medium transition-colors ${
                scrolled ? 'text-gray-700 hover:text-purple-700' : 'text-white hover:text-purple-200'
              }`}
              onClick={(e) => handleNavigate(e, 'planos')}
            >
              Planos
            </a>
            <a 
              href="#depoimentos" 
              className={`text-sm font-medium transition-colors ${
                scrolled ? 'text-gray-700 hover:text-purple-700' : 'text-white hover:text-purple-200'
              }`}
              onClick={(e) => handleNavigate(e, 'depoimentos')}
            >
              Depoimentos
            </a>
            <div className="flex space-x-2">
              <BotaoAutenticacao
                tipo="cadastro"
                className="bg-purple-200 hover:bg-purple-300 text-purple-900 rounded-md"
              >
                Cadastre-se
              </BotaoAutenticacao>
              <BotaoAutenticacao
                tipo="login" 
                className="bg-cyan-400 hover:bg-cyan-500 text-white rounded-md"
              >
                Entrar
              </BotaoAutenticacao>
            </div>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="flex justify-end items-center md:hidden">
            <button 
              ref={buttonRef}
              className="text-gray-500 focus:outline-none"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className={`h-6 w-6 ${scrolled ? 'text-gray-700' : 'text-white'}`} />
            </button>
          </div>
        </div>
        
        {/* Mobile Menu - Fixed Positioning */}
        {mobileMenuOpen && (
          <div 
            ref={menuRef}
            className="mobile-menu fixed right-4 top-16 md:hidden bg-white rounded-lg shadow-lg py-4 px-4 z-50 w-64"
            style={{maxWidth: "calc(100vw - 2rem)"}}
          >
            <a 
              href="#home" 
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              onClick={(e) => {handleNavigate(e, 'home'); setMobileMenuOpen(false);}}
            >
              Home
            </a>
            <a 
              href="#calculadora" 
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              onClick={(e) => {handleNavigate(e, 'calculadora'); setMobileMenuOpen(false);}}
            >
              Calculadora
            </a>
            <a 
              href="#prejuizo" 
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              onClick={(e) => {handleNavigate(e, 'prejuizo'); setMobileMenuOpen(false);}}
            >
              Funcionalidades
            </a>
            <a 
              href="#planos" 
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              onClick={(e) => {handleNavigate(e, 'planos'); setMobileMenuOpen(false);}}
            >
              Planos
            </a>
            <a 
              href="#depoimentos" 
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              onClick={(e) => {handleNavigate(e, 'depoimentos'); setMobileMenuOpen(false);}}
            >
              Depoimentos
            </a>
            <div className="mt-3 space-y-2 pt-3 border-t border-gray-200">
              <BotaoAutenticacao
                tipo="cadastro"
                className="w-full justify-center bg-purple-200 text-purple-900"
                onClick={() => setMobileMenuOpen(false)}
              >
                Cadastre-se
              </BotaoAutenticacao>
              <BotaoAutenticacao
                tipo="login"
                className="w-full justify-center bg-cyan-400 text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Entrar
              </BotaoAutenticacao>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

// Hook de interseção é importado de "@/components/animated-chart"

// Vamos simplificar o componente SyncedProgressWithDot
const SyncedProgressWithDot: React.FC<{
  percentage: number;
  delay: number;
  color?: string;
}> = ({ percentage, delay, color }) => {
  const [isBarVisible, setIsBarVisible] = useState(false);
  
  return (
    <div className="relative w-full h-3">
      <div className="absolute inset-0">
        <AnimatedProgressBar 
          percentage={percentage} 
          delay={delay} 
          color={color} 
          onVisibilityChange={(isVisible: boolean) => setIsBarVisible(isVisible)}
        />
      </div>
      <div 
        className="absolute h-4 w-4 bg-white rounded-full top-1/2 -translate-y-1/2 border-2 border-green-500 shadow-sm z-10"
        style={{ 
          left: isBarVisible ? `${percentage * 0.98}%` : "0%",
          transition: "left 1s linear"
        }}
      />
    </div>
  );
};

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [dashboardsInView, setDashboardsInView] = useState(false);
  const [startAnimations, setStartAnimations] = useState(false); // Começar com animações desativadas - importante!
  const [periodoPlanos, setPeriodoPlanos] = useState<"mensal" | "anual">("anual"); // Estado para controlar o período dos planos
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  // Funções de navegação movidas para o componente LandingNav
  
  // Função para navegar diretamente para as seções quando carregadas com fragmentos
  const navegarParaSecaoPorHash = () => {
    // Medir o tempo de navegação para âncoras
    const inicioNavegacao = performance.now();
    console.log(`[⏱️ Performance] Início da navegação para âncora: ${inicioNavegacao.toFixed(2)}ms`);

    // Se tiver hash na URL
    if (window.location.hash) {
      const targetId = window.location.hash.substring(1);
      console.log(`[⏱️ Performance] Navegando para âncora: #${targetId}`);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        // Adicionar um pequeno delay para garantir que todos os componentes foram renderizados
        setTimeout(() => {
          const preScrollTime = performance.now();
          console.log(`[⏱️ Performance] Pré-scroll para âncora #${targetId}: ${(preScrollTime - inicioNavegacao).toFixed(2)}ms`);
          
          const yOffset = -90; // Ajustar conforme a altura do seu header
          const y = targetElement.getBoundingClientRect().top + window.scrollY + yOffset;
          
          window.scrollTo({
            top: y,
            behavior: 'smooth'
          });
          
          // Registrar tempo após scroll
          const posScrollTime = performance.now();
          console.log(`[⏱️ Performance] Scroll para âncora #${targetId} iniciado: ${(posScrollTime - inicioNavegacao).toFixed(2)}ms`);
        }, 500);
      } else {
        console.log(`[⏱️ Performance] Erro: âncora #${targetId} não encontrada`);
      }
    } else {
      console.log(`[⏱️ Performance] Sem âncora para navegar`);
    }
  };
  
  // Usar o hook para detectar quando o dashboard está visível
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !dashboardsInView) {
          setDashboardsInView(true);
          setStartAnimations(true); // Iniciar animações imediatamente
        }
      },
      { threshold: 0.1 } // Reduzir threshold para detectar mais cedo
    );
    
    const currentRef = dashboardRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }
    
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [dashboardsInView]);
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    custoProduto: '',
    frete: '',
    valorVenda: '',
    formaPagamento: 'Dinheiro',
    quantidadeParcelas: '1X',
    regimeTributario: 'MEI',
    lucroPercentual: '30',
    tipoLucro: 'BRUTO'
  });
  const [calculoResultado, setCalculoResultado] = useState<{
    valorFinal: number;
    lucro: number;
    margemLucro: number;
    valorParcela?: number;
  } | null>(null);
  const [calculoEnviado, setCalculoEnviado] = useState(false);
  const [concordaTermos, setConcordaTermos] = useState(false);
  const [showTermosModal, setShowTermosModal] = useState(false);
  const [showPrivacidadeModal, setShowPrivacidadeModal] = useState(false);
  const [camposValidados, setCamposValidados] = useState({
    nome: true,
    email: true,
    telefone: true
  });
  
  // Estado para armazenar a data e hora atual
  const [dataHoraAtual, setDataHoraAtual] = useState(new Date());
  
  // Estados para o popup de simulação de cálculo
  const [showCalculoPopup, setShowCalculoPopup] = useState(false);
  const [etapaCalculo, setEtapaCalculo] = useState(0);
  const [progressoCalculo, setProgressoCalculo] = useState(0);
  
  // Estados para o carrossel de depoimentos - substituído por versão mock
  const emblaRef = useRef(null);
  const emblaApi = null;
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);
  
  // Função para validar formato de email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Função para validar formato de telefone
  const isValidPhone = (phone: string): boolean => {
    // Verifica se tem formato (XX) XXXXX-XXXX ou pelo menos (XX) XXXX-XXXX
    const phoneRegex = /^\(\d{2}\) \d{4,5}\-\d{4}$/;
    return phoneRegex.test(phone.trim());
  };

  // Função para verificar se formulário está válido para cálculo
  const isFormValid = () => {
    return (
      formData.nome.trim() !== "" && 
      isValidEmail(formData.email) && 
      isValidPhone(formData.telefone) && 
      concordaTermos
    );
  };

  // Pré-carregar imagens com alta prioridade para logos
  useEffect(() => {
    const preloadImages = async () => {
      // Primeiro, carregamos as logos com alta prioridade para garantir transição suave
      const logoPromises = [
        new Promise((resolve) => {
          const img = new Image();
          img.src = positiveLogoPath;
          img.fetchPriority = 'high';
          img.onload = resolve;
        }),
        new Promise((resolve) => {
          const img = new Image();
          img.src = negativeLogoPath;
          img.fetchPriority = 'high';
          img.onload = resolve;
        })
      ];
      
      // Carregar logos primeiro
      await Promise.all(logoPromises);
      
      // Em seguida, carregamos outras imagens
      const otherImagePromises = [
        new Promise((resolve) => {
          const img = new Image();
          img.src = dashboardIllustration;
          img.onload = resolve;
        })
      ];

      // Aguardar todas as imagens carregarem
      await Promise.all(otherImagePromises);
      setImagesLoaded(true);
      
      // Verificar hash após imagens carregadas
      navegarParaSecaoPorHash();
    };

    preloadImages();
  }, []);
  
  // Efeito para detectar rolagem da página
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [scrolled]);
  
  // Efeito para navegar até a seção correta quando a URL contém uma âncora (#)
  useEffect(() => {
    const checkHashAndScroll = () => {
      if (window.location.hash) {
        const id = window.location.hash.substring(1);
        
        // Aumentar o timeout para garantir que todos os elementos estejam carregados
        setTimeout(() => {
          const element = document.getElementById(id);
          if (element) {
            // Definindo um offset para considerar o header fixo
            const yOffset = -100; 
            const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
            
            // Usar scroll.IntoView para compatibilidade adicional
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // E também scrollTo para garantir o offset
            setTimeout(() => {
              window.scrollTo({
                top: y,
                behavior: 'smooth'
              });
            }, 100);
          } else {
            console.log(`Elemento com ID "${id}" não encontrado`);
          }
        }, 500); // Aumento do timeout para 500ms
      }
    };
    
    // Verificar quando a página carrega
    if (document.readyState === 'complete') {
      checkHashAndScroll();
    } else {
      window.addEventListener('load', checkHashAndScroll);
    }
    
    // Adicionar um event listener para mudanças de hash
    window.addEventListener('hashchange', checkHashAndScroll);
    
    return () => {
      window.removeEventListener('hashchange', checkHashAndScroll);
      window.removeEventListener('load', checkHashAndScroll);
    };
  }, []);
  
  // Atualizar data e hora a cada minuto
  useEffect(() => {
    // Atualizar imediatamente
    setDataHoraAtual(new Date());
    
    // Configurar atualização a cada minuto
    const intervalId = setInterval(() => {
      setDataHoraAtual(new Date());
    }, 60000); // 60000 ms = 1 minuto
    
    // Limpar intervalo ao desmontar o componente
    return () => clearInterval(intervalId);
  }, []);
  
  // Versão simplificada do carrossel para evitar erros
  useEffect(() => {
    // Configuração simplificada que não depende do emblaCarousel
    const autoplayInterval = setInterval(() => {
      // Lógica simplificada para evitar erros
      console.log("Rotação do carrossel simulada");
    }, 5000); // Muda a cada 5 segundos
    
    return () => {
      clearInterval(autoplayInterval);
    };
  }, []);

  // Função para formatar números de telefone
  const formatPhoneNumber = (value: string): string => {
    // Remove todos os caracteres não numéricos
    const numbersOnly = value.replace(/\D/g, '');
    
    // Aplica a formatação de acordo com a quantidade de dígitos
    if (numbersOnly.length <= 2) {
      return numbersOnly;
    } else if (numbersOnly.length <= 6) {
      return `(${numbersOnly.slice(0, 2)}) ${numbersOnly.slice(2)}`;
    } else if (numbersOnly.length <= 10) {
      return `(${numbersOnly.slice(0, 2)}) ${numbersOnly.slice(2, 6)}-${numbersOnly.slice(6)}`;
    } else {
      return `(${numbersOnly.slice(0, 2)}) ${numbersOnly.slice(2, 7)}-${numbersOnly.slice(7, 11)}`;
    }
  };
  
  // Função para formatar valores monetários
  const formatCurrency = (value: string): string => {
    // Remove todos os caracteres não numéricos e pontos
    let numbersOnly = value.replace(/[^\d]/g, '');
    
    // Converte para número e formata como moeda
    const amount = parseFloat(numbersOnly) / 100;
    
    // Se for um número válido, retorna formatado
    if (!isNaN(amount)) {
      return amount.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    
    return numbersOnly ? formatCurrency(numbersOnly) : "";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Aplica máscara de acordo com o campo
    let formattedValue = value;
    
    if (name === 'telefone') {
      formattedValue = formatPhoneNumber(value);
    } else if (['custoProduto', 'frete', 'valorVenda'].includes(name)) {
      formattedValue = formatCurrency(value);
    }
    
    setFormData({
      ...formData,
      [name]: formattedValue
    });
  };
  
  // Função para validar os campos quando o usuário sai do input
  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'nome') {
      setCamposValidados(prev => ({
        ...prev,
        nome: value.trim() !== ''
      }));
    } else if (name === 'email') {
      setCamposValidados(prev => ({
        ...prev,
        email: value.trim() === '' || isValidEmail(value)
      }));
    } else if (name === 'telefone') {
      setCamposValidados(prev => ({
        ...prev,
        telefone: value.trim() === '' || isValidPhone(value)
      }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Função para mostrar informações sobre cada campo via toast
  const mostrarAjuda = (campo: string) => {
    const mensagens: Record<string, { titulo: string; descricao: string }> = {
      custoProduto: {
        titulo: "Custo do Produto",
        descricao: "Informe quanto você paga pelo produto, incluindo impostos na compra."
      },
      frete: {
        titulo: "Frete",
        descricao: "Valor do frete para receber o produto do fornecedor ou enviar ao cliente."
      },
      valorVenda: {
        titulo: "Valor de Venda",
        descricao: "O preço que você cobra pelo produto ao cliente final."
      },
      formaPagamento: {
        titulo: "Forma de Pagamento",
        descricao: "Cada forma de pagamento tem taxas diferentes que impactam seu lucro final."
      },
      quantidadeParcelas: {
        titulo: "Quantidade de Parcelas",
        descricao: "Quanto mais parcelas, maior a taxa cobrada pelas operadoras de cartão."
      },
      regimeTributario: {
        titulo: "Regime Tributário",
        descricao: "Seu regime tributário afeta os impostos a pagar sobre a venda."
      }
    };

    const info = mensagens[campo];
    if (info) {
      toast({
        title: info.titulo,
        description: info.descricao,
        variant: "default",
        duration: 5000,
      });
    }
  };

  // Função para copiar valor para a área de transferência
  const copiarValor = (valor: string, tipo: string) => {
    navigator.clipboard.writeText(valor).then(() => {
      toast({
        title: "Valor copiado!",
        description: `${tipo} copiado para a área de transferência.`,
        variant: "default",
        duration: 3000,
      });
    }).catch(() => {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o valor. Tente novamente.",
        variant: "destructive",
        duration: 3000,
      });
    });
  };

  // Função para simular o cálculo com etapas e tempos aleatórios
  const simularEtapaCalculo = () => {
    // Garantir que a página permaneça visível durante o cálculo
    document.body.classList.add('calculando-ativo');

    // Resetar etapas
    setEtapaCalculo(0);
    setProgressoCalculo(0);
    setShowCalculoPopup(true);
    
    // Configurar tempos aleatórios mais longos para cada etapa para simular processamento complexo
    const temposEtapas = [
      { min: 2000, max: 3500 },   // Analisando custo (2.0-3.5s)
      { min: 3000, max: 4500 },   // Calculando frete (3.0-4.5s)
      { min: 2200, max: 3800 },   // Aplicando margem (2.2-3.8s)
      { min: 3500, max: 5000 },   // Verificando taxas (3.5-5.0s)
      { min: 2500, max: 4000 },   // Calculando impostos (2.5-4.0s)
      { min: 2800, max: 3900 },   // Ajustando valor (2.8-3.9s)
      { min: 3200, max: 4700 }    // Gerando relatório (3.2-4.7s)
    ];
    
    // Função para obter um tempo aleatório dentro do intervalo
    const getTempoAleatorio = (min: number, max: number) => {
      return Math.floor(Math.random() * (max - min + 1) + min);
    };
    
    // Função recursiva para processar as etapas com tempos variados
    const processarEtapa = (indice: number) => {
      if (indice >= temposEtapas.length) {
        // Todas as etapas concluídas
        setTimeout(() => {
          setShowCalculoPopup(false);
          setCalculoEnviado(true);
          
          // Remover a classe que mantém a página visível
          document.body.classList.remove('calculando-ativo');
          
          // Mostrar toast de sucesso
          toast({
            title: "Cálculo enviado para seu email!",
            description: "Em breve você receberá um email com os resultados detalhados da sua precificação.",
            variant: "default",
            duration: 5000,
          });
        }, 1000);
        return;
      }
      
      // Calcular tempo para esta etapa
      const tempoEtapa = getTempoAleatorio(temposEtapas[indice].min, temposEtapas[indice].max);
      
      // Atualizar para a próxima etapa após o tempo aleatório
      setTimeout(() => {
        setEtapaCalculo(indice + 1);
        setProgressoCalculo(Math.round(((indice + 1) / temposEtapas.length) * 100));
        
        // Processar a próxima etapa
        processarEtapa(indice + 1);
      }, tempoEtapa);
    };
    
    // Iniciar o processamento com a primeira etapa
    processarEtapa(0);
  };

  const handleCalcular = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Converter strings formatadas para números - apenas para validação
      const custoProduto = parseFloat(formData.custoProduto.replace(/\./g, '').replace(',', '.')) || 0;
      const valorVenda = parseFloat(formData.valorVenda.replace(/\./g, '').replace(',', '.')) || 0;
      
      // Validar entradas
      if (custoProduto <= 0 || valorVenda <= 0) {
        toast({
          title: "Valores inválidos",
          description: "Os valores de custo e venda devem ser maiores que zero.",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }
      
      // Iniciar simulação do cálculo
      simularEtapaCalculo();
    } catch (error) {
      toast({
        title: "Erro ao calcular",
        description: "Ocorreu um erro ao processar os valores. Verifique e tente novamente.",
        variant: "destructive",
        duration: 5000,
      });
      console.error(error);
    }
  };

  // Efeito para garantir navegação por âncora no carregamento da página
  useEffect(() => {
    // Verificar se há ancoragem na URL ao carregar a página
    if (window.location.hash && imagesLoaded) {
      const id = window.location.hash.substring(1);
      const element = document.getElementById(id);
      
      if (element) {
        setTimeout(() => {
          const yOffset = -100;
          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
          window.scrollTo({ top: y, behavior: 'auto' });
        }, 100);
      }
    }
  }, [imagesLoaded]);

  // Remova completamente a condição de verificação de imagens carregadas
  // para evitar um segundo preloader

  return (
    <div className="min-h-screen">
      {/* Navegação */}
      <LandingNav scrolled={scrolled} />
      
      {/* Hero Section */}
      <section id="home" className="relative text-white pt-24 scroll-mt-24">
        {/* Background gradiente semelhante ao da tela de login */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-purple-600 to-blue-600 z-0"></div>
        <div className="absolute inset-0 z-0" style={{ 
          backgroundImage: "radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.2) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.15) 0%, transparent 45%)" 
        }}></div>
        <div className="absolute inset-0 opacity-20 z-0" style={{ 
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" 
        }}></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-sm uppercase tracking-wider mb-2">TENHA LUCRO COM O MEU PREÇO CERTO</p>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Trabalha muito mas o<br />
                <span className="text-cyan-400">DINHEIRO SOME?</span>
              </h1>
              <p className="text-lg text-white mb-8">
                Você trabalha, trabalha e o dinheiro nunca sobra? O problema pode estar no preço que você 
                cobra — e nem percebe. Com o Meu Preço Certo, você precifica do jeito certo e transforma 
                esforço em lucro de verdade. Chega de trabalhar só pra sobreviver. Comece a lucrar de 
                verdade agora mesmo!
              </p>
              
              <div className="mt-8">
                <BotaoAutenticacao
                  tipo="cadastro"
                  size="lg" 
                  className="bg-cyan-400 hover:bg-cyan-500 text-white rounded-full px-8"
                >
                  Quero Meu Preço Certo
                </BotaoAutenticacao>
              </div>
            </div>
            
            <div className="hidden lg:flex justify-center relative">
              <img 
                src={dashboardIllustration} 
                alt="Análise de preços" 
                className="w-full max-w-md object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Calculadora moderna de preços */}
      <section id="calculadora" className="py-16 bg-gradient-to-b from-white to-purple-50 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-2 bg-purple-100 rounded-lg mb-4">
              <Calculator className="text-purple-600 mr-2" size={20} />
              <span className="text-sm font-medium text-purple-700">Meu Preço Certo</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Você está tendo lucro com seu produto?</h2>
            <p className="mt-3 text-xl text-gray-600 max-w-3xl mx-auto">
              Simule rápido e descubra se esta tendo lucro ou prejuízo com seu produto.
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="grid md:grid-cols-12 gap-0">
              {/* Dados do usuário */}
              <div className="md:col-span-4 bg-gradient-to-br from-purple-600 to-purple-800 md:p-8 px-5 py-6 text-white">
                <h3 className="text-xl font-medium mb-6">Seus Dados</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-100 mb-1">
                      Nome Completo
                    </label>
                    <Input
                      type="text"
                      id="nome"
                      name="nome"
                      value={formData.nome}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      className={`w-full border-0 bg-white/20 text-white placeholder:text-purple-200 focus:ring-2 focus:ring-white ${!camposValidados.nome ? 'ring-2 ring-red-500' : ''}`}
                      placeholder="Seu nome"
                      required
                    />
                    {!camposValidados.nome && (
                      <p className="mt-1 text-red-300 text-xs flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Nome não pode estar vazio
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-purple-100 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      className={`w-full border-0 bg-white/20 text-white placeholder:text-purple-200 focus:ring-2 focus:ring-white ${!camposValidados.email ? 'ring-2 ring-red-500' : ''}`}
                      placeholder="seu@email.com"
                      required
                    />
                    {!camposValidados.email && (
                      <p className="mt-1 text-red-300 text-xs flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Formato de e-mail inválido
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-purple-100 mb-1">
                      Telefone
                    </label>
                    <Input
                      type="tel"
                      id="telefone"
                      name="telefone"
                      value={formData.telefone}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      className={`w-full border-0 bg-white/20 text-white placeholder:text-purple-200 focus:ring-2 focus:ring-white ${!camposValidados.telefone ? 'ring-2 ring-red-500' : ''}`}
                      placeholder="(00) 00000-0000"
                      required
                    />
                    {!camposValidados.telefone && (
                      <p className="mt-1 text-red-300 text-xs flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Formato inválido, use (XX) XXXXX-XXXX
                      </p>
                    )}
                  </div>
                  
                  <div className="pt-4 mt-6">
                    <div className="flex items-center">
                      <Checkbox
                        id="termos"
                        checked={concordaTermos}
                        onCheckedChange={(checked) => setConcordaTermos(checked as boolean)}
                        className="mr-2 text-white bg-white/20 border-0 data-[state=checked]:bg-white data-[state=checked]:text-purple-700"
                      />
                      <label htmlFor="termos" className="text-sm text-purple-100">
                        Concordo com os <button type="button" onClick={() => setShowTermosModal(true)} className="text-white underline hover:text-purple-200 focus:outline-none">termos</button> e a <button type="button" onClick={() => setShowPrivacidadeModal(true)} className="text-white underline hover:text-purple-200 focus:outline-none">política de privacidade</button>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 pt-4 border-t border-purple-400/30">
                  <p className="text-sm text-purple-200">
                    <Info className="inline-block mr-2" size={16} />
                    Esta é uma simulação gratuita com funções limitadas. Para acessar todos os recursos e ferramentas avançadas de precificação, crie sua conta.                    
                  </p>
                  <BotaoAutenticacao 
                    tipo="cadastro"
                    variant="outline" 
                    className="mt-4 w-full bg-transparent text-white border-white hover:bg-white hover:text-purple-700"
                  >
                    Crie sua conta grátis
                  </BotaoAutenticacao>
                </div>
              </div>
              
              {/* Calculadora */}
              <div className="md:col-span-8 md:px-8 md:py-8 px-5 py-6">
                {!calculoEnviado ? (
                  <>
                    <div className="mb-6 flex justify-between items-center">
                      <h3 className="text-xl font-medium text-gray-900 flex items-center">
                        <Tag className="mr-2 text-purple-600" size={20} />
                        Calculadora de Preços
                      </h3>
                      
                      <div className="text-sm text-gray-500 flex items-center">
                        <span>Preencha os campos e obtenha o preço ideal</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Coluna 1: Informações Gerais */}
                      <div className="space-y-5">
                        {/* Custo do Produto */}
                        <div>
                          <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                            <DollarSign className="mr-1 w-4 h-4 text-purple-500" />
                            Custo do Produto
                            <button 
                              type="button" 
                              className="ml-1 text-gray-400 hover:text-purple-600" 
                              onClick={() => mostrarAjuda('custoProduto')}
                            >
                              <HelpCircle size={14} />
                            </button>
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">R$</span>
                            <Input
                              type="text"
                              id="custoProduto"
                              name="custoProduto"
                              value={formData.custoProduto}
                              onChange={handleInputChange}
                              className="w-full pl-10 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                              placeholder="0,00"
                              required
                            />
                          </div>
                        </div>
                        
                        {/* Frete */}
                        <div>
                          <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                            <Truck className="mr-1 w-4 h-4 text-purple-500" />
                            Frete
                            <button 
                              type="button" 
                              className="ml-1 text-gray-400 hover:text-purple-600" 
                              onClick={() => mostrarAjuda('frete')}
                            >
                              <HelpCircle size={14} />
                            </button>
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">R$</span>
                            <Input
                              type="text"
                              id="frete"
                              name="frete"
                              value={formData.frete}
                              onChange={handleInputChange}
                              className="w-full pl-10 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                              placeholder="0,00"
                            />
                          </div>
                        </div>
                        
                        {/* Margem de Lucro */}
                        <div>
                          <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                            <Percent className="mr-1 w-4 h-4 text-purple-500" />
                            Margem de Lucro
                            <button 
                              type="button" 
                              className="ml-1 text-gray-400 hover:text-purple-600" 
                              onClick={() => toast({
                                title: "Margem de Lucro",
                                description: "Defina a porcentagem de lucro que deseja obter sobre o valor de venda.",
                                variant: "default",
                                duration: 5000,
                              })}
                            >
                              <HelpCircle size={14} />
                            </button>
                          </label>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="relative col-span-1">
                              <Input
                                type="text"
                                value={formData.lucroPercentual}
                                onChange={(e) => {
                                  // Permitir apenas números
                                  const value = e.target.value.replace(/\D/g, '');
                                  setFormData({
                                    ...formData,
                                    lucroPercentual: value
                                  });
                                }}
                                className="w-full pr-8 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                placeholder="30"
                              />
                              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">%</span>
                            </div>
                            <div className="col-span-2">
                              <Select 
                                value={formData.tipoLucro}
                                onValueChange={(value) => {
                                  setFormData({
                                    ...formData,
                                    tipoLucro: value
                                  });
                                }}
                              >
                                <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                                  <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="BRUTO">Sobre o preço bruto</SelectItem>
                                  <SelectItem value="LIQUIDO">Sobre o preço líquido</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Coluna 2: Informações de Pagamento */}
                      <div className="space-y-5">
                        {/* Forma de Pagamento */}
                        <div>
                          <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                            <CreditCard className="mr-1 w-4 h-4 text-purple-500" />
                            Forma de Pagamento
                            <button 
                              type="button" 
                              className="ml-1 text-gray-400 hover:text-purple-600" 
                              onClick={() => mostrarAjuda('formaPagamento')}
                            >
                              <HelpCircle size={14} />
                            </button>
                          </label>
                          <Select
                            value={formData.formaPagamento}
                            onValueChange={(value) => handleSelectChange("formaPagamento", value)}
                          >
                            <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                              <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                              <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                              <SelectItem value="Pix">Pix</SelectItem>
                              <SelectItem value="Boleto">Boleto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Parcelas (condicional) */}
                        {formData.formaPagamento === "Cartão de Crédito" && (
                          <div>
                            <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                              <ArrowDownRight className="mr-1 w-4 h-4 text-purple-500" />
                              Parcelas
                              <button 
                                type="button" 
                                className="ml-1 text-gray-400 hover:text-purple-600" 
                                onClick={() => mostrarAjuda('quantidadeParcelas')}
                              >
                                <HelpCircle size={14} />
                              </button>
                            </label>
                            <Select
                              value={formData.quantidadeParcelas}
                              onValueChange={(value) => handleSelectChange("quantidadeParcelas", value)}
                            >
                              <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                                <SelectValue placeholder="Número de parcelas" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1X">1x sem juros</SelectItem>
                                <SelectItem value="2X">2x sem juros</SelectItem>
                                <SelectItem value="3X">3x sem juros</SelectItem>
                                <SelectItem value="4X">4x sem juros</SelectItem>
                                <SelectItem value="5X">5x sem juros</SelectItem>
                                <SelectItem value="6X">6x sem juros</SelectItem>
                                <SelectItem value="7X">7x com juros</SelectItem>
                                <SelectItem value="8X">8x com juros</SelectItem>
                                <SelectItem value="9X">9x com juros</SelectItem>
                                <SelectItem value="10X">10x com juros</SelectItem>
                                <SelectItem value="11X">11x com juros</SelectItem>
                                <SelectItem value="12X">12x com juros</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        {/* Valor de Venda */}
                        <div>
                          <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                            <Tag className="mr-1 w-4 h-4 text-purple-500" />
                            Valor de Venda
                            <button 
                              type="button" 
                              className="ml-1 text-gray-400 hover:text-purple-600" 
                              onClick={() => mostrarAjuda('valorVenda')}
                            >
                              <HelpCircle size={14} />
                            </button>
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">R$</span>
                            <Input
                              type="text"
                              id="valorVenda"
                              name="valorVenda"
                              value={formData.valorVenda}
                              onChange={handleInputChange}
                              className="w-full pl-10 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                              placeholder="0,00"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Botão de cálculo */}
                    <div className="mt-6">
                      <Button 
                        onClick={handleCalcular}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 rounded-lg shadow-md transition-all transform hover:translate-y-[-2px] text-lg font-medium"
                        disabled={!isFormValid()}
                      >
                        CALCULAR MEU PREÇO IDEAL
                        <Calculator className="ml-2" size={18} />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="mt-4">
                      {/* Versão mobile - sem o box contendo tudo */}
                      <div className="sm:hidden">
                        <div className="flex flex-col mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-md">
                          <div className="bg-green-500 rounded-full p-2 flex-shrink-0 mr-4 mb-3 self-start">
                            <Check className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-gray-800 mb-2">
                              Cálculo enviado com sucesso!
                            </h4>
                            <p className="text-gray-600 mb-1 text-sm">
                              Enviamos o cálculo detalhado do seu <span className="font-semibold text-purple-600">preço ideal</span> para o email:
                            </p>
                            <p className="text-purple-600 font-medium mb-0 text-sm break-all">
                              {formData.email}
                            </p>
                          </div>
                        </div>
                        
                        {/* Seção de benefícios */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                          <h4 className="font-medium text-lg mb-4 flex items-center text-gray-800">
                            <Package className="mr-2 text-purple-600" size={20} />
                            Seu pacote de precificação avançada:
                          </h4>
                          <div className="grid grid-cols-1 gap-3">
                            <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                              <div className="flex items-center mb-2">
                                <div className="bg-purple-100 p-1.5 rounded-full mr-2">
                                  <TrendingUp className="h-4 w-4 text-purple-600" />
                                </div>
                                <h5 className="font-semibold text-gray-800 text-sm">Preço Competitivo</h5>
                              </div>
                              <p className="text-xs text-gray-600">Cálculo do valor de venda mais lucrativo para seu produto no mercado atual</p>
                            </div>
                            
                            <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                              <div className="flex items-center mb-2">
                                <div className="bg-blue-100 p-1.5 rounded-full mr-2">
                                  <BarChart2 className="h-4 w-4 text-blue-600" />
                                </div>
                                <h5 className="font-semibold text-gray-800 text-sm">Análise de Lucro</h5>
                              </div>
                              <p className="text-xs text-gray-600">Comparativo entre sua margem atual e a ideal para maximizar os resultados</p>
                            </div>
                            
                            <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                              <div className="flex items-center mb-2">
                                <div className="bg-green-100 p-1.5 rounded-full mr-2">
                                  <Target className="h-4 w-4 text-green-600" />
                                </div>
                                <h5 className="font-semibold text-gray-800 text-sm">Estratégia</h5>
                              </div>
                              <p className="text-xs text-gray-600">Recomendações estratégicas exclusivas para aumentar seus lucros</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Contador de escassez */}
                        <div className="bg-blue-50 p-3 rounded-lg mb-6 border border-blue-100">
                          <div className="flex items-center text-blue-700">
                            <Clock className="mr-2 h-4 w-4 animate-pulse flex-shrink-0" />
                            <span className="font-medium text-sm">Oferta por tempo limitado</span>
                          </div>
                          <p className="text-xs mt-1 text-gray-600 ml-6">Contrate o plano anual e ganhe 2 meses de acesso totalmente grátis!</p>
                        </div>
                        
                        {/* CTA */}
                        <div className="flex flex-col gap-3 mt-6">
                          <BotaoAutenticacao
                            tipo="cadastro"
                            className="flex-1 bg-purple-600 hover:bg-purple-700 
                                      text-white py-4 rounded-lg shadow-md transition-all border-0 text-sm"
                          >
                            <span className="font-bold">Crie sua conta gratuita</span>
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </BotaoAutenticacao>
                          <Button 
                            variant="outline" 
                            className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm"
                            onClick={() => {
                              setCalculoEnviado(false);
                              setCalculoResultado(null);
                              setFormData({
                                nome: '',
                                email: '',
                                telefone: '',
                                custoProduto: '',
                                frete: '',
                                valorVenda: '',
                                formaPagamento: 'Dinheiro',
                                quantidadeParcelas: '1X',
                                regimeTributario: 'MEI',
                                lucroPercentual: '30',
                                tipoLucro: 'BRUTO'
                              });
                              setCamposValidados({
                                nome: true,
                                email: true,
                                telefone: true
                              });
                              setConcordaTermos(false);
                            }}
                          >
                            <span>Iniciar novo cálculo</span>
                            <RefreshCw className="ml-2 h-3 w-3" />
                          </Button>
                        </div>
                        
                        {/* Social proof */}
                        <div className="mt-6 py-3 px-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-center">
                            <div className="flex flex-shrink-0 mr-2">
                              <Star className="h-3.5 w-3.5 text-yellow-500 mr-0.5" fill="#F59E0B" />
                              <Star className="h-3.5 w-3.5 text-yellow-500 mr-0.5" fill="#F59E0B" />
                              <Star className="h-3.5 w-3.5 text-yellow-500 mr-0.5" fill="#F59E0B" />
                              <Star className="h-3.5 w-3.5 text-yellow-500 mr-0.5" fill="#F59E0B" />
                              <Star className="h-3.5 w-3.5 text-yellow-500 mr-0.5" fill="#F59E0B" />
                            </div>
                            <span className="text-gray-600 text-xs font-medium whitespace-nowrap">+20 mil empreendedores aprovam</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Versão desktop - com o box contendo tudo */}
                      <div className="hidden sm:block">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
                          <div className="flex flex-row items-start mb-4">
                            <div className="bg-green-500 rounded-full p-2 flex-shrink-0 mr-4 self-start">
                              <Check className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <h4 className="text-xl font-bold text-gray-800 mb-2">
                                Cálculo enviado com sucesso!
                              </h4>
                              <p className="text-gray-600 mb-1 text-base">
                                Enviamos o cálculo detalhado do seu <span className="font-semibold text-purple-600">preço ideal</span> para o email:
                              </p>
                              <p className="text-purple-600 font-medium mb-4 text-base break-all">
                                {formData.email}
                              </p>
                            </div>
                          </div>
                          
                          {/* Seção de benefícios com design limpo */}
                          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mb-6">
                            <h4 className="font-medium text-xl mb-4 flex items-center text-gray-800">
                              <Package className="mr-3 text-purple-600" size={20} />
                              Seu pacote de precificação avançada:
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm hover:shadow transition-shadow">
                                <div className="flex items-center mb-2">
                                  <div className="bg-purple-100 p-2 rounded-full mr-3">
                                    <TrendingUp className="h-5 w-5 text-purple-600" />
                                  </div>
                                  <h5 className="font-semibold text-gray-800 text-base">Preço Competitivo</h5>
                                </div>
                                <p className="text-sm text-gray-600">Cálculo do valor de venda mais lucrativo para seu produto no mercado atual</p>
                              </div>
                              
                              <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm hover:shadow transition-shadow">
                                <div className="flex items-center mb-2">
                                  <div className="bg-blue-100 p-2 rounded-full mr-3">
                                    <BarChart2 className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <h5 className="font-semibold text-gray-800 text-base">Análise de Lucro</h5>
                                </div>
                                <p className="text-sm text-gray-600">Comparativo entre sua margem atual e a ideal para maximizar os resultados</p>
                              </div>
                              
                              <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm hover:shadow transition-shadow">
                                <div className="flex items-center mb-2">
                                  <div className="bg-green-100 p-2 rounded-full mr-3">
                                    <Target className="h-5 w-5 text-green-600" />
                                  </div>
                                  <h5 className="font-semibold text-gray-800 text-base">Estratégia</h5>
                                </div>
                                <p className="text-sm text-gray-600">Recomendações estratégicas exclusivas para aumentar seus lucros</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Contador de escassez com design limpo */}
                          <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
                            <div className="flex items-center text-blue-700">
                              <Clock className="mr-2 h-5 w-5 animate-pulse flex-shrink-0" />
                              <span className="font-medium text-base">Oferta por tempo limitado</span>
                            </div>
                            <p className="text-sm mt-1 text-gray-600 ml-6">Contrate o plano anual e ganhe 2 meses de acesso totalmente grátis!</p>
                          </div>
                          
                          {/* CTA com design limpo e melhor contraste */}
                          <div className="flex flex-row gap-4 mt-6">
                            <BotaoAutenticacao
                              tipo="cadastro"
                              className="flex-1 bg-purple-600 hover:bg-purple-700 
                                        text-white py-5 rounded-lg shadow-md transition-all border-0 text-base"
                            >
                              <span className="font-bold">Crie sua conta gratuita</span>
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </BotaoAutenticacao>
                            <Button 
                              variant="outline" 
                              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-base"
                              onClick={() => {
                                setCalculoEnviado(false);
                                setCalculoResultado(null);
                                setFormData({
                                  nome: '',
                                  email: '',
                                  telefone: '',
                                  custoProduto: '',
                                  frete: '',
                                  valorVenda: '',
                                  formaPagamento: 'Dinheiro',
                                  quantidadeParcelas: '1X',
                                  regimeTributario: 'MEI',
                                  lucroPercentual: '30',
                                  tipoLucro: 'BRUTO'
                                });
                                setCamposValidados({
                                  nome: true,
                                  email: true,
                                  telefone: true
                                });
                                setConcordaTermos(false);
                              }}
                            >
                              <span>Iniciar novo cálculo</span>
                              <RefreshCw className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Social proof com design limpo */}
                          <div className="mt-6 py-3 px-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex flex-row items-center justify-center">
                              <div className="flex flex-shrink-0">
                                <Star className="h-4 w-4 text-yellow-500 mr-0.5" fill="#F59E0B" />
                                <Star className="h-4 w-4 text-yellow-500 mr-0.5" fill="#F59E0B" />
                                <Star className="h-4 w-4 text-yellow-500 mr-0.5" fill="#F59E0B" />
                                <Star className="h-4 w-4 text-yellow-500 mr-0.5" fill="#F59E0B" />
                                <Star className="h-4 w-4 text-yellow-500 mr-0.5" fill="#F59E0B" />
                              </div>
                              <span className="ml-2 text-gray-600 text-sm font-medium whitespace-nowrap">+20 mil empreendedores aprovam</span>
                            </div>
                          </div>
                        </div>
                      </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 3 - Nova Dashboard no Estilo da Tela de Login */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-indigo-50 relative scroll-mt-24" ref={dashboardRef}>
        {/* Fundo com padrão de grade sutíl */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.7))] bg-[length:32px_32px]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Cabeçalho da seção */}
          <div className="text-center mb-16">
            <h2 className="text-sm font-medium tracking-wider text-emerald-500 uppercase mb-2">INTERFACE MODERNA E INTUITIVA</h2>
            <h3 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              Acompanhe seu desempenho em tempo real
            </h3>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Nossa plataforma oferece dashboards intuitivos e poderosos para que você possa monitorar e otimizar 
              todos os aspectos do seu negócio em tempo real.
            </p>
          </div>
          
          {/* Grid de dashboards no estilo da tela de login */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-16">
            {/* Dashboard 1 - Métricas de Vendas */}
            <MobileCardAnimation index={0}>
              <div className="bg-white rounded-lg overflow-hidden shadow-xl border border-gray-200 h-[550px]">
                <div className="p-4">
                {/* Header da dashboard */}
                <div className="flex justify-between items-center mb-4 border-b border-gray-300 pb-3">
                  <div className="flex items-center">
                    <div className="h-9 w-9 rounded-md bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center mr-3 shadow-sm">
                      <BarChart2 className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="text-gray-900 font-semibold">Métricas de Vendas</h4>
                  </div>
                  <div className="flex space-x-2">
                    <div className="h-7 w-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer">
                      <Bell className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                    <div className="h-7 w-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer">
                      <Settings className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                    <div className="h-7 w-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer">
                      <MoreHorizontal className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                  </div>
                </div>
                
                {/* Cards de métricas */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg bg-gradient-to-b from-white to-gray-50 p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-600">Vendas do Mês</p>
                      <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center">
                        <TrendingUp className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    <p className="text-gray-900 text-xl font-bold">R$ 45,8k</p>
                    <div className="flex items-center mt-1 text-xs">
                      <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                      <span className="text-green-600 font-medium">18%</span>
                      <span className="text-gray-500 ml-1">vs anterior</span>
                    </div>
                  </div>
                  
                  <div className="rounded-lg bg-gradient-to-b from-white to-gray-50 p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-600">Margem Média</p>
                      <div className="h-6 w-6 rounded-full bg-cyan-600 flex items-center justify-center">
                        <Percent className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    <p className="text-gray-900 text-xl font-bold">38.5%</p>
                    <div className="flex items-center mt-1 text-xs">
                      <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                      <span className="text-green-600 font-medium">5.2%</span>
                      <span className="text-gray-500 ml-1">vs anterior</span>
                    </div>
                  </div>
                </div>
                
                {/* Gráfico de desempenho */}
                <div className="rounded-lg bg-gray-100 border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-700 text-xs font-medium">Vendas Mensais</p>
                    <div className="flex items-center space-x-2">
                      <div className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-600 text-xs">2023/2024</div>
                    </div>
                  </div>
                  
                  {/* Mini gráfico simulado com animação */}
                  <div className="h-14 flex items-end justify-between space-x-1">
                    {[35, 55, 40, 65, 50, 70, 60, 75, 65, 80, 70, 90].map((height, i) => (
                      <AnimatedChartBar 
                        key={i} 
                        height={height} 
                        delay={i * 100 + (dashboardsInView ? 0 : 3000)}
                      />
                    ))}
                  </div>
                  
                  {/* Lista de produtos */}
                  <div className="mt-3 border-t border-gray-200 pt-2">
                    <div className="flex justify-between items-center text-xs font-medium text-gray-600 mb-1">
                      <span>Produtos</span>
                      <span>Vendas</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-1.5"></div>
                          <span className="text-[10px] text-gray-700">Smartphone X Pro</span>
                        </div>
                        <span className="text-[10px] font-medium text-gray-700">32 un.</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-1.5"></div>
                          <span className="text-[10px] text-gray-700">Fone Bluetooth</span>
                        </div>
                        <span className="text-[10px] font-medium text-gray-700">28 un.</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-1.5"></div>
                          <span className="text-[10px] text-gray-700">Carregador USB-C</span>
                        </div>
                        <span className="text-[10px] font-medium text-gray-700">24 un.</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full mr-1.5"></div>
                          <span className="text-[10px] text-gray-700">Smartwatch Pro</span>
                        </div>
                        <span className="text-[10px] font-medium text-gray-700">21 un.</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full mr-1.5"></div>
                          <span className="text-[10px] text-gray-700">Tablet Ultra</span>
                        </div>
                        <span className="text-[10px] font-medium text-gray-700">19 un.</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1.5"></div>
                          <span className="text-[10px] text-gray-700">Caixa de Som BT</span>
                        </div>
                        <span className="text-[10px] font-medium text-gray-700">17 un.</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1.5"></div>
                          <span className="text-[10px] text-gray-700">Mouse Gamer</span>
                        </div>
                        <span className="text-[10px] font-medium text-gray-700">15 un.</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></div>
                          <span className="text-[10px] text-gray-700">Notebook Slim</span>
                        </div>
                        <span className="text-[10px] font-medium text-gray-700">12 un.</span>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
            </MobileCardAnimation>
            
            {/* Dashboard 2 - Análise de Produtos */}
            <MobileCardAnimation index={1}>
              <div className="bg-white rounded-lg overflow-hidden shadow-xl border border-gray-200 h-[550px]">
                <div className="p-4">
                  {/* Header da dashboard */}
                  <div className="flex justify-between items-center mb-4 border-b border-gray-300 pb-3">
                    <div className="flex items-center">
                      <div className="h-9 w-9 rounded-md bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mr-3 shadow-sm">
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="text-gray-900 font-semibold">Análise de Produtos</h4>
                    </div>
                    <div className="flex space-x-2">
                      <div className="h-7 w-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer">
                        <Bell className="h-3.5 w-3.5 text-gray-600" />
                      </div>
                      <div className="h-7 w-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer">
                        <Settings className="h-3.5 w-3.5 text-gray-600" />
                      </div>
                      <div className="h-7 w-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer">
                        <MoreHorizontal className="h-3.5 w-3.5 text-gray-600" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Produtos mais lucrativos */}
                  <div className="rounded-lg bg-gradient-to-b from-white to-gray-50 border border-gray-200 p-4 shadow-sm mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="h-5 w-5 rounded-md bg-blue-500 flex items-center justify-center mr-2">
                          <Star className="h-3 w-3 text-white" />
                        </div>
                        <p className="text-gray-700 text-xs font-medium">Produtos Mais Lucrativos</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="px-1.5 py-0.5 rounded text-blue-600 text-[10px] cursor-pointer hover:underline">Ver todos</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-1">
                      <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center">
                            <div className="h-7 w-7 rounded-md bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mr-2 shadow-sm">
                              <Smartphone className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div>
                              <p className="text-gray-800 text-xs font-medium">Smartphone X Pro</p>
                              <p className="text-gray-500 text-[10px]">Eletrônicos</p>
                            </div>
                          </div>
                          <div className="bg-blue-50 text-blue-600 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-blue-100">
                            +82%
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-[10px]">Preço</span>
                            <span className="text-gray-800 text-xs font-medium">R$ 899,00</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-[10px]">Lucro</span>
                            <span className="text-green-600 text-xs font-medium">R$ 315,00</span>
                          </div>
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <AnimatedProgressBar percentage={82} delay={dashboardsInView ? 500 : 3500} color="blue" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center">
                            <div className="h-7 w-7 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mr-2 shadow-sm">
                              <Headphones className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div>
                              <p className="text-gray-800 text-xs font-medium">Fone Bluetooth</p>
                              <p className="text-gray-500 text-[10px]">Acessórios</p>
                            </div>
                          </div>
                          <div className="bg-purple-50 text-purple-600 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-purple-100">
                            +65%
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-[10px]">Preço</span>
                            <span className="text-gray-800 text-xs font-medium">R$ 299,00</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-[10px]">Lucro</span>
                            <span className="text-green-600 text-xs font-medium">R$ 120,00</span>
                          </div>
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <AnimatedProgressBar percentage={65} delay={dashboardsInView ? 700 : 3700} color="purple" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Distribuição por categoria */}
                  <div className="rounded-lg bg-gray-100 border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-gray-700 text-xs font-medium">Distribuição por Categoria</p>
                    </div>
                    
                    <div className="flex h-20 mb-1 items-end space-x-1">
                      <AnimatedChartBar height={70} delay={dashboardsInView ? 600 : 3600} />
                      <AnimatedChartBar height={45} delay={dashboardsInView ? 700 : 3700} />
                      <AnimatedChartBar height={90} delay={dashboardsInView ? 800 : 3800} />
                      <AnimatedChartBar height={30} delay={dashboardsInView ? 900 : 3900} />
                      <AnimatedChartBar height={60} delay={dashboardsInView ? 1000 : 4000} />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-1 mt-2">
                      <div className="flex items-center">
                        <div className="h-2 w-2 bg-blue-500 rounded-full mr-1"></div>
                        <p className="text-xs text-gray-600">Eletrônicos</p>
                      </div>
                      <div className="flex items-center">
                        <div className="h-2 w-2 bg-cyan-500 rounded-full mr-1"></div>
                        <p className="text-xs text-gray-600">Informática</p>
                      </div>
                      <div className="flex items-center">
                        <div className="h-2 w-2 bg-purple-500 rounded-full mr-1"></div>
                        <p className="text-xs text-gray-600">Celulares</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </MobileCardAnimation>
            
            {/* Dashboard 3 - Otimização de Preços */}
            <MobileCardAnimation index={2}>
              <div className="bg-white rounded-lg overflow-hidden shadow-xl border border-gray-200 h-[550px]">
                <div className="p-4">
                {/* Header da dashboard */}
                <div className="flex justify-between items-center mb-4 border-b border-gray-300 pb-3">
                  <div className="flex items-center">
                    <div className="h-9 w-9 rounded-md bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center mr-3 shadow-sm">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="text-gray-900 font-semibold">Otimização de Preços</h4>
                  </div>
                  <div className="flex space-x-2">
                    <div className="h-7 w-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer">
                      <Bell className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                    <div className="h-7 w-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer">
                      <Settings className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                    <div className="h-7 w-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer">
                      <MoreHorizontal className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                  </div>
                </div>
                
                {/* Cards principais */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-600 mb-1">Preço Atual</p>
                    <div className="flex items-end">
                      <p className="text-gray-900 text-lg font-bold">R$ 499,90</p>
                      <span className="text-red-500 text-xs ml-2 mb-1">-9%</span>
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-600 mb-1">Preço Sugerido</p>
                    <div className="flex items-end">
                      <p className="text-green-600 text-lg font-bold">R$ 549,90</p>
                      <span className="text-green-500 text-xs ml-2 mb-1">+10%</span>
                    </div>
                  </div>
                </div>
                
                {/* Slider de precificação */}
                <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm mb-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-600 font-medium">Mínimo</span>
                    <span className="text-purple-600 font-medium">Ideal</span>
                    <span className="text-gray-600 font-medium">Máximo</span>
                  </div>
                  <div className="relative h-2.5 bg-gray-200 rounded-full mb-2">
                    <SyncedProgressWithDot 
                      percentage={65} 
                      delay={startAnimations ? 0 : 3600} 
                      color="green" 
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">R$ 429,90</span>
                    <span className="text-green-600 font-medium">R$ 549,90</span>
                    <span className="text-gray-600">R$ 599,90</span>
                  </div>
                </div>
                
                {/* Fatores de influência */}
                <div className="rounded-lg bg-gradient-to-b from-white to-gray-50 border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="h-5 w-5 rounded-md bg-indigo-500 flex items-center justify-center mr-2">
                        <Percent className="h-3 w-3 text-white" />
                      </div>
                      <p className="text-gray-700 text-xs font-medium">Fatores de Precificação</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm space-y-3">
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <div className="flex items-center">
                          <div className="w-2.5 h-2.5 rounded-sm bg-purple-500 mr-1.5"></div>
                          <span className="text-gray-700 font-medium">Custo do Produto</span>
                        </div>
                        <span className="text-purple-600 font-medium bg-purple-50 px-1.5 py-0.5 rounded-full border border-purple-100 text-[10px]">25%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <AnimatedProgressBar percentage={25} delay={startAnimations ? 0 : 3800} color="purple" />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <div className="flex items-center">
                          <div className="w-2.5 h-2.5 rounded-sm bg-blue-500 mr-1.5"></div>
                          <span className="text-gray-700 font-medium">Margem de Lucro</span>
                        </div>
                        <span className="text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100 text-[10px]">45%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <AnimatedProgressBar percentage={45} delay={startAnimations ? 0 : 3900} color="blue" />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <div className="flex items-center">
                          <div className="w-2.5 h-2.5 rounded-sm bg-red-500 mr-1.5"></div>
                          <span className="text-gray-700 font-medium">Impostos</span>
                        </div>
                        <span className="text-red-600 font-medium bg-red-50 px-1.5 py-0.5 rounded-full border border-red-100 text-[10px]">18%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <AnimatedProgressBar percentage={18} delay={startAnimations ? 0 : 4000} color="red" />
                      </div>
                      

                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <div className="flex items-center">
                          <div className="w-2.5 h-2.5 rounded-sm bg-amber-500 mr-1.5"></div>
                          <span className="text-gray-700 font-medium">Outros Custos</span>
                        </div>
                        <span className="text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100 text-[10px]">12%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <AnimatedProgressBar percentage={12} delay={startAnimations ? 0 : 4100} color="amber" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </MobileCardAnimation>
          </div>
          
          {/* CTA Central */}
          <div className="text-center">
            <div className="inline-block py-1 px-3 mb-6 bg-purple-100 rounded-full">
              <h2 className="text-sm font-medium text-purple-700">EXPERIMENTE AGORA</h2>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Veja como nossos dashboards podem otimizar suas decisões
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto mb-8">
              Registre-se hoje mesmo e tenha acesso a todos os recursos da plataforma Meu Preço Certo,
              incluindo todos os nossos dashboards e ferramentas de análise.
            </p>
            <BotaoAutenticacao 
              tipo="cadastro"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-4 rounded-lg shadow-lg text-lg font-medium"
            >
              Começar a lucrar agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </BotaoAutenticacao>
            <p className="text-sm text-gray-500 mt-4">
              Invista na qualidade da sua precificação. Planos a partir de R$ 73,25/mês com garantia de 7 dias.
            </p>
          </div>
        </div>
      </section>
      {/* Popup de Simulação de Cálculo - Sem botão de fechar e sem X */}
      <Dialog 
        open={showCalculoPopup} 
        onOpenChange={() => {}} // Impede que o diálogo feche quando clicado fora
      >
        <DialogContent className="sm:max-w-md px-4 py-8 sm:px-6 sm:py-10 max-w-[92vw] mx-auto rounded-xl shadow-lg border border-gray-100 [&>button]:hidden">
          <div className="flex flex-col">
            <DialogTitle className="text-xl font-semibold mb-2 text-center">
              {etapaCalculo < 7 ? "Calculando seu preço ideal..." : "Cálculo concluído!"}
            </DialogTitle>
            
            <DialogDescription className="mb-4 text-center">
              {etapaCalculo < 7 
                ? "Por favor, aguarde enquanto processamos sua precificação" 
                : "Seu cálculo foi finalizado e enviado para seu email!"}
            </DialogDescription>
            
            <div className="w-full mb-4">
              <Progress value={progressoCalculo} className="h-2 w-full" />
              <p className="text-xs text-gray-500 mt-1 text-right">{progressoCalculo}%</p>
            </div>
            
            <div className="space-y-3 mt-2">
              {/* Lista de etapas de cálculo */}
              <div className="flex items-center">
                {etapaCalculo >= 1 ? (
                  <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                ) : etapaCalculo === 0 ? (
                  <div className="relative h-6 w-6 mr-3">
                    <div className="absolute inset-0 rounded-full border-2 border-purple-600 border-l-transparent animate-spin"></div>
                  </div>
                ) : (
                  <div className="h-6 w-6 border-2 border-gray-200 rounded-full mr-3"></div>
                )}
                <span className={`text-xs sm:text-sm ${etapaCalculo >= 1 ? 'text-gray-700 font-medium' : etapaCalculo === 0 ? 'text-purple-700 font-medium' : 'text-gray-400'}`}>
                  Analisando custo do produto
                </span>
              </div>
              
              <div className="flex items-center">
                {etapaCalculo >= 2 ? (
                  <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                ) : etapaCalculo === 1 ? (
                  <div className="relative h-6 w-6 mr-3">
                    <div className="absolute inset-0 rounded-full border-2 border-purple-600 border-l-transparent animate-spin"></div>
                  </div>
                ) : (
                  <div className="h-6 w-6 border-2 border-gray-200 rounded-full mr-3"></div>
                )}
                <span className={`text-xs sm:text-sm ${etapaCalculo >= 2 ? 'text-gray-700 font-medium' : etapaCalculo === 1 ? 'text-purple-700 font-medium' : 'text-gray-400'}`}>
                  Calculando valor do frete
                </span>
              </div>
              
              <div className="flex items-center">
                {etapaCalculo >= 3 ? (
                  <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                ) : etapaCalculo === 2 ? (
                  <div className="relative h-6 w-6 mr-3">
                    <div className="absolute inset-0 rounded-full border-2 border-purple-600 border-l-transparent animate-spin"></div>
                  </div>
                ) : (
                  <div className="h-6 w-6 border-2 border-gray-200 rounded-full mr-3"></div>
                )}
                <span className={`text-sm ${etapaCalculo >= 3 ? 'text-gray-700 font-medium' : etapaCalculo === 2 ? 'text-purple-700 font-medium' : 'text-gray-400'}`}>
                  Aplicando margem de lucro
                </span>
              </div>
              
              <div className="flex items-center">
                {etapaCalculo >= 4 ? (
                  <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                ) : etapaCalculo === 3 ? (
                  <div className="relative h-6 w-6 mr-3">
                    <div className="absolute inset-0 rounded-full border-2 border-purple-600 border-l-transparent animate-spin"></div>
                  </div>
                ) : (
                  <div className="h-6 w-6 border-2 border-gray-200 rounded-full mr-3"></div>
                )}
                <span className={`text-sm ${etapaCalculo >= 4 ? 'text-gray-700 font-medium' : etapaCalculo === 3 ? 'text-purple-700 font-medium' : 'text-gray-400'}`}>
                  Verificando taxas de pagamento
                </span>
              </div>
              
              <div className="flex items-center">
                {etapaCalculo >= 5 ? (
                  <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                ) : etapaCalculo === 4 ? (
                  <div className="relative h-6 w-6 mr-3">
                    <div className="absolute inset-0 rounded-full border-2 border-purple-600 border-l-transparent animate-spin"></div>
                  </div>
                ) : (
                  <div className="h-6 w-6 border-2 border-gray-200 rounded-full mr-3"></div>
                )}
                <span className={`text-sm ${etapaCalculo >= 5 ? 'text-gray-700 font-medium' : etapaCalculo === 4 ? 'text-purple-700 font-medium' : 'text-gray-400'}`}>
                  Calculando impostos
                </span>
              </div>
              
              <div className="flex items-center">
                {etapaCalculo >= 6 ? (
                  <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                ) : etapaCalculo === 5 ? (
                  <div className="relative h-6 w-6 mr-3">
                    <div className="absolute inset-0 rounded-full border-2 border-purple-600 border-l-transparent animate-spin"></div>
                  </div>
                ) : (
                  <div className="h-6 w-6 border-2 border-gray-200 rounded-full mr-3"></div>
                )}
                <span className={`text-sm ${etapaCalculo >= 6 ? 'text-gray-700 font-medium' : etapaCalculo === 5 ? 'text-purple-700 font-medium' : 'text-gray-400'}`}>
                  Ajustando o valor final
                </span>
              </div>
              
              <div className="flex items-center">
                {etapaCalculo >= 7 ? (
                  <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                ) : etapaCalculo === 6 ? (
                  <div className="relative h-6 w-6 mr-3">
                    <div className="absolute inset-0 rounded-full border-2 border-purple-600 border-l-transparent animate-spin"></div>
                  </div>
                ) : (
                  <div className="h-6 w-6 border-2 border-gray-200 rounded-full mr-3"></div>
                )}
                <span className={`text-sm ${etapaCalculo >= 7 ? 'text-gray-700 font-medium' : etapaCalculo === 6 ? 'text-purple-700 font-medium' : 'text-gray-400'}`}>
                  Gerando relatório de precificação
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nova Seção - Design Interativo com Animações */}
      <section id="suporte" className="relative py-28 overflow-hidden scroll-mt-24">
        {/* Fundo com efeito de gradiente */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 opacity-95"></div>
        
        {/* Elementos decorativos */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-96 -right-24 w-96 h-96 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-24 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        
        {/* Grade de linhas */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[length:40px_40px]"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Cabeçalho com animação */}
          <div className="text-center mb-20">
            <div className="inline-block py-1 px-3 mb-4 bg-white/10 backdrop-blur-sm rounded-full">
              <h2 className="text-sm font-medium tracking-wider text-cyan-300 uppercase">
                Revolucione sua precificação
              </h2>
            </div>
            <h3 className="text-4xl md:text-5xl font-extrabold text-white mb-6 drop-shadow-lg">
              Transformando a maneira como<br />
              <span className="bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                você precifica seus produtos
              </span>
            </h3>
            <p className="text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed opacity-90">
              Nossa plataforma oferece as ferramentas mais avançadas para você maximizar seus lucros e 
              escalar seu negócio com confiança e precisão.
            </p>
          </div>
          
          {/* Destaque principal com imagem e estatísticas */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            {/* Coluna da dashboard interativa no estilo da tela de login */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-black/20 backdrop-blur-sm p-1">
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 rounded-2xl"></div>
              
              {/* Dashboard simulada */}
              <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-indigo-950 p-4">
                {/* Header da dashboard */}
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center mr-2">
                      <Package className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="text-white font-semibold">Dashboard de Precificação</h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center">
                      <Bell className="h-3 w-3 text-blue-300" />
                    </div>
                    <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center">
                      <Settings className="h-3 w-3 text-gray-300" />
                    </div>
                    <div className="h-6 w-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                      U
                    </div>
                  </div>
                </div>
                
                {/* Cards de métricas */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg bg-white/5 p-3 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-400">Produtos</p>
                      <div className="h-5 w-5 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <Package className="h-3 w-3 text-indigo-400" />
                      </div>
                    </div>
                    <p className="text-white text-lg font-bold">84</p>
                    <div className="flex items-center mt-1 text-xs">
                      <ArrowUpRight className="h-3 w-3 text-green-400 mr-1" />
                      <span className="text-green-400">12%</span>
                      <span className="text-gray-500 ml-1">este mês</span>
                    </div>
                  </div>
                  
                  <div className="rounded-lg bg-white/5 p-3 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-400">Lucro Médio</p>
                      <div className="h-5 w-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <DollarSign className="h-3 w-3 text-cyan-400" />
                      </div>
                    </div>
                    <p className="text-white text-lg font-bold">43%</p>
                    <div className="flex items-center mt-1 text-xs">
                      <ArrowUpRight className="h-3 w-3 text-green-400 mr-1" />
                      <span className="text-green-400">7%</span>
                      <span className="text-gray-500 ml-1">vs anterior</span>
                    </div>
                  </div>
                  
                  <div className="rounded-lg bg-white/5 p-3 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-400">Faturamento</p>
                      <div className="h-5 w-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <BarChart2 className="h-3 w-3 text-purple-400" />
                      </div>
                    </div>
                    <p className="text-white text-lg font-bold">R$18.5k</p>
                    <div className="flex items-center mt-1 text-xs">
                      <ArrowUpRight className="h-3 w-3 text-green-400 mr-1" />
                      <span className="text-green-400">24%</span>
                      <span className="text-gray-500 ml-1">vs anterior</span>
                    </div>
                  </div>
                </div>
                
                {/* Gráfico de desempenho */}
                <div className="rounded-lg bg-white/5 border border-white/10 p-3 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white text-sm font-medium">Análise de Desempenho</p>
                    <div className="flex items-center space-x-2">
                      <div className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs">Mensal</div>
                      <ChevronDown className="h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                  
                  {/* Mini gráfico simulado */}
                  <div className="h-24 flex items-end justify-between space-x-1">
                    {[35, 55, 40, 65, 50, 70, 60, 75, 65, 80, 70, 90].map((height, i) => (
                      <div 
                        key={i} 
                        className="w-full bg-gradient-to-t from-indigo-600 to-purple-600 rounded-sm" 
                        style={{ height: `${height}%` }}
                      ></div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>Jan</span>
                    <span>Fev</span>
                    <span>Mar</span>
                    <span>Abr</span>
                    <span>Mai</span>
                    <span>Jun</span>
                    <span>Jul</span>
                    <span>Ago</span>
                    <span>Set</span>
                    <span>Out</span>
                    <span>Nov</span>
                    <span>Dez</span>
                  </div>
                </div>
                
                {/* Produtos recentes */}
                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white text-sm font-medium">Produtos Recentes</p>
                    <div className="text-indigo-400 text-xs">Ver todos</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded bg-white/5">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center mr-2">
                          <Smartphone className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-white text-xs font-medium">Smartphone X Pro</p>
                          <p className="text-gray-500 text-xs">Eletrônicos</p>
                        </div>
                      </div>
                      <span className="text-white text-xs font-medium">R$ 2.499,00</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 rounded bg-white/5">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mr-2">
                          <Headphones className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-white text-xs font-medium">Fone Bluetooth Pro</p>
                          <p className="text-gray-500 text-xs">Acessórios</p>
                        </div>
                      </div>
                      <span className="text-white text-xs font-medium">R$ 349,90</span>
                    </div>
                  </div>
                </div>
                
                <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                  {`Atualizado: ${dataHoraAtual.toLocaleDateString('pt-BR')} - ${dataHoraAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                </div>
              </div>
              
              {/* Estatísticas flutuantes */}
              <div className="absolute top-1 right-1 bg-gradient-to-br from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg shadow-xl">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-yellow-300" />
                  <span className="font-bold">Até 45% mais rentabilidade</span>
                </div>
              </div>
              

              
              {/* Elemento adicional dentro do dashboard */}
              <div className="mt-4 bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-xl mx-4 mb-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg mr-3">
                    <BarChart2 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">Painel de controle intuitivo</p>
                    <p className="text-xs text-gray-400">Monitoramento em tempo real</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Coluna de recursos */}
            <div className="relative">
              {/* Título animado */}
              <div className="relative mb-8 pl-4 border-l-4 border-cyan-400">
                <h4 className="text-3xl font-bold text-white">
                  Seja o mestre da<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 italic">
                    sua precificação
                  </span>
                </h4>
                <p className="mt-4 text-gray-300 text-lg">
                  Elimine as incertezas e maximize seus lucros com tecnologia de ponta em precificação estratégica.
                </p>
              </div>
              
              {/* Lista de recursos premium */}
              <div className="space-y-6">
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 shadow-xl transform transition-all duration-300 hover:bg-white/10 hover:scale-105">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                        <Cloud className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-5">
                      <h5 className="text-xl font-bold text-white mb-2">Acesso em Nuvem</h5>
                      <p className="text-gray-300">
                        Gerencie sua empresa de qualquer lugar, a qualquer momento, com acesso total aos seus dados.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-900 text-cyan-300">
                          Multi-dispositivo
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-300">
                          Sincronização em tempo real
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 shadow-xl transform transition-all duration-300 hover:bg-white/10 hover:scale-105">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                        <Layers className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-5">
                      <h5 className="text-xl font-bold text-white mb-2">Algoritmos Avançados</h5>
                      <p className="text-gray-300">
                        Nossa tecnologia de cálculo recursivo analisa camada por camada todos os fatores de custo para determinar o preço ideal de forma precisa.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900 text-purple-300">
                          Análise de mercado
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-900 text-pink-300">
                          Otimização de margem
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 shadow-xl transform transition-all duration-300 hover:bg-white/10 hover:scale-105">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                        <RefreshCw className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-5">
                      <h5 className="text-xl font-bold text-white mb-2">Evolução Contínua</h5>
                      <p className="text-gray-300">
                        Plataforma em constante evolução com novas funcionalidades e melhorias lançadas semanalmente.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-900 text-amber-300">
                          Atualizações automáticas
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-900 text-orange-300">
                          Recursos exclusivos
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Seção de testimoniais - Carrossel Rotativo */}
          <div id="depoimentos" className="relative bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 shadow-xl mb-16 scroll-mt-24">
            <div className="absolute top-0 right-0 -mt-4 -mr-4">
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-full p-2 shadow-lg">
                <Star className="h-6 w-6 text-white" fill="white" />
              </div>
            </div>
            
            <h4 className="text-2xl font-bold text-white mb-6 text-center">O que nossos clientes dizem</h4>
            
            <div className="embla overflow-hidden">
              <div className="embla__viewport rounded-xl" ref={emblaRef}>
                <div className="embla__container flex">
                  {/* Card 1 */}
                  <div className="embla__slide flex-[0_0_100%] min-w-0 px-2 md:flex-[0_0_33.33%]">
                    <div className="bg-white/10 rounded-lg p-5 relative h-full flex flex-col">
                      <div className="absolute -top-3 -left-3 text-4xl text-gray-400 opacity-30">"</div>
                      <div className="flex-1">
                        <p className="text-gray-200 relative z-10">
                          Aumentei minha margem de lucro em 35% no primeiro mês usando o Meu Preço Certo. Ferramenta incrível!
                        </p>
                      </div>
                      <div className="flex items-center mt-4">
                        <img src={person2Image} alt="Avatar de Marcos Silva" className="w-10 h-10 rounded-full object-cover" />
                        <div className="ml-3">
                          <p className="text-white font-medium">Marcos Silva</p>
                          <p className="text-gray-400 text-xs">Loja de Eletrônicos</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Card 2 */}
                  <div className="embla__slide flex-[0_0_100%] min-w-0 px-2 md:flex-[0_0_33.33%]">
                    <div className="bg-white/10 rounded-lg p-5 relative h-full flex flex-col">
                      <div className="absolute -top-3 -left-3 text-4xl text-gray-400 opacity-30">"</div>
                      <div className="flex-1">
                        <p className="text-gray-200 relative z-10">
                          Finalmente um sistema que entende como funciona a precificação no varejo. Recomendo para todos!
                        </p>
                      </div>
                      <div className="flex items-center mt-4">
                        <img src={person1Image} alt="Avatar de Ana Oliveira" className="w-10 h-10 rounded-full object-cover" />
                        <div className="ml-3">
                          <p className="text-white font-medium">Ana Oliveira</p>
                          <p className="text-gray-400 text-xs">Boutique de Roupas</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Card 3 */}
                  <div className="embla__slide flex-[0_0_100%] min-w-0 px-2 md:flex-[0_0_33.33%]">
                    <div className="bg-white/10 rounded-lg p-5 relative h-full flex flex-col">
                      <div className="absolute -top-3 -left-3 text-4xl text-gray-400 opacity-30">"</div>
                      <div className="flex-1">
                        <p className="text-gray-200 relative z-10">
                          O suporte é incrível e a plataforma é super intuitiva. Mudou completamente meu negócio!
                        </p>
                      </div>
                      <div className="flex items-center mt-4">
                        <img src={person4Image} alt="Avatar de Roberto Mendes" className="w-10 h-10 rounded-full object-cover" />
                        <div className="ml-3">
                          <p className="text-white font-medium">Roberto Mendes</p>
                          <p className="text-gray-400 text-xs">Distribuidora</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Card 4 */}
                  <div className="embla__slide flex-[0_0_100%] min-w-0 px-2 md:flex-[0_0_33.33%]">
                    <div className="bg-white/10 rounded-lg p-5 relative h-full flex flex-col">
                      <div className="absolute -top-3 -left-3 text-4xl text-gray-400 opacity-30">"</div>
                      <div className="flex-1">
                        <p className="text-gray-200 relative z-10">
                          Consegui calcular o preço ideal e aumentar a rentabilidade do meu negócio em 40%. Recomendo muito!
                        </p>
                      </div>
                      <div className="flex items-center mt-4">
                        <img src={person3Image} alt="Avatar de Paula Santos" className="w-10 h-10 rounded-full object-cover" />
                        <div className="ml-3">
                          <p className="text-white font-medium">Paula Santos</p>
                          <p className="text-gray-400 text-xs">Mercearia</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Card 5 */}
                  <div className="embla__slide flex-[0_0_100%] min-w-0 px-2 md:flex-[0_0_33.33%]">
                    <div className="bg-white/10 rounded-lg p-5 relative h-full flex flex-col">
                      <div className="absolute -top-3 -left-3 text-4xl text-gray-400 opacity-30">"</div>
                      <div className="flex-1">
                        <p className="text-gray-200 relative z-10">
                          Comecei a ter lucro real depois que organizei minha precificação com este sistema. Fantástico!
                        </p>
                      </div>
                      <div className="flex items-center mt-4">
                        <img src={person5Image} alt="Avatar de Luciana Costa" className="w-10 h-10 rounded-full object-cover" />
                        <div className="ml-3">
                          <p className="text-white font-medium">Luciana Costa</p>
                          <p className="text-gray-400 text-xs">Perfumaria</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Controles do carrossel */}
              <div className="flex justify-center mt-6 gap-2">
                <button 
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30"
                  onClick={() => console.log("Anterior")}
                  disabled={false}
                >
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
                <button 
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30"
                  onClick={() => console.log("Próximo")}
                  disabled={false}
                >
                  <ChevronRight className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          </div>
          
          {/* CTA Final Impactante */}
          <div className="relative bg-gradient-to-r from-indigo-600/80 to-purple-600/80 rounded-2xl p-8 md:p-12 overflow-hidden backdrop-blur-sm border border-white/10 shadow-2xl">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                <h3 className="text-3xl font-extrabold text-white mb-4">
                  Pronto para transformar seu negócio?
                </h3>
                <p className="text-gray-100 text-lg max-w-xl">
                  Junte-se a milhares de empreendedores que estão maximizando seus lucros com precificação estratégica.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Garantia de 7 dias
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Planos a partir de R$ 73,25/mês
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/90 text-white">
                    <BadgePercent className="h-4 w-4 mr-1" />
                    2 meses GRÁTIS no plano anual
                  </span>
                </div>
              </div>
              <div>
                <BotaoAutenticacao 
                  tipo="cadastro"
                  className="w-full md:w-auto px-8 py-5 text-lg bg-white text-indigo-600 font-semibold hover:bg-gray-100 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  Começar a lucrar agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </BotaoAutenticacao>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nova seção de funcionalidades - Abordagem com Hexágonos e Ícones */}
      <section id="prejuizo" className="py-20 bg-white overflow-hidden relative scroll-mt-24">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <pattern id="pattern-hex" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
                <path d="M10-5.77l8.66 5v10l-8.66 5L1.34 9.23v-10L10-5.77z" fill="none" stroke="currentColor" strokeOpacity="0.05" />
              </pattern>
              <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-hex)" />
            </svg>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center bg-purple-100 px-4 py-2 rounded-lg mb-6">
              <Calculator className="h-5 w-5 text-purple-700 mr-2" />
              <span className="text-purple-800 font-medium">Meu Preço Certo</span>
            </div>
          </div>
          
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 mb-3">
              Pare de trabalhar no prejuízo!
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transforme seu negócio de prejuízo em lucro com o <span className="font-bold text-purple-700">Meu Preço Certo</span>. 
              Descubra quanto realmente deveria cobrar pelos seus produtos e serviços!
            </p>
          </div>

          {/* Seção de funcionalidades com imagens atraentes */}
          <div className="flex flex-col items-center bg-gradient-to-b from-white to-purple-50 rounded-2xl py-10 px-4 relative overflow-hidden mb-16">
            {/* Elementos decorativos já iniciam aqui, removemos o cabeçalho duplicado */}
            
            {/* Elementos decorativos - Gradient blobs */}
            <div className="absolute inset-0 overflow-hidden opacity-20">
              <div className="absolute top-0 right-0 h-64 w-64 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full blur-3xl transform translate-x-1/4 -translate-y-1/2"></div>
              <div className="absolute bottom-0 left-0 h-64 w-64 bg-gradient-to-tr from-blue-400 to-cyan-300 rounded-full blur-3xl transform -translate-x-1/4 translate-y-1/2"></div>
              <div className="absolute top-1/3 left-1/4 h-48 w-48 bg-gradient-to-bl from-emerald-400 to-teal-300 rounded-full blur-3xl opacity-20"></div>
              <div className="absolute bottom-1/3 right-1/4 h-48 w-48 bg-gradient-to-tl from-purple-300 to-pink-200 rounded-full blur-3xl opacity-20"></div>
            </div>
            
            {/* Padrão de grade */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none"></div>
            
            {/* Elementos flutuantes */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Formas geométricas */}
              <div className="absolute top-1/3 right-[30%] h-12 w-12 border-2 border-indigo-300 rounded-lg opacity-10 rotate-12"></div>
              <div className="absolute bottom-1/3 left-[25%] h-10 w-10 border-2 border-purple-300 rounded-lg opacity-10 -rotate-12"></div>
              <div className="absolute top-2/3 right-[5%] h-8 w-8 border-2 border-teal-300 rounded-full opacity-10"></div>
              <div className="absolute top-1/4 left-[40%] h-16 w-16 border border-purple-300 rounded-lg opacity-5 rotate-45"></div>
              <div className="absolute bottom-1/5 right-[35%] h-20 w-20 border border-indigo-300 rounded-lg opacity-5 -rotate-12"></div>
            </div>
            
            {/* Seção 1: Dashboard e Analytics */}
            <div className="w-full py-10 px-4">
              <AnimateOnView>
                <div className="flex flex-col md:flex-row gap-12 items-center">
                  {/* Dashboard Preview */}
                  <motion.div 
                    className="w-full md:w-1/2 rounded-2xl shadow-xl overflow-hidden border border-gray-100"
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{ 
                      boxShadow: ["0px 4px 12px rgba(0, 0, 0, 0.05)", "0px 8px 24px rgba(0, 0, 0, 0.12)", "0px 4px 12px rgba(0, 0, 0, 0.05)"]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      repeatType: "reverse" 
                    }}
                  >
                    <CompactAnalyticsDashboard />
                  </motion.div>
                  
                  {/* Feature Description */}
                  <motion.div 
                    className="w-full md:w-1/2"
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                  >
                    <div className="flex items-center mb-6">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-indigo-100 mr-4">
                        <BarChart2 className="h-8 w-8 text-indigo-600" />
                      </div>
                      <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500">
                        Dashboard Personalizada
                      </h3>
                    </div>
                    
                    <p className="text-lg text-gray-600 mb-8">
                      Acompanhe todos os seus indicadores em tempo real com dashboards interativos e personalizáveis que oferecem uma visão clara do seu negócio.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-6">
                      {[
                        "Faturamento e custos em tempo real",
                        "Gráficos interativos de desempenho",
                        "Análise de despesas por categoria",
                        "Relatórios exportáveis em PDF"
                      ].map((feature, index) => (
                        <motion.div 
                          key={index}
                          className="flex items-start"
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.4, delay: 0.4 + (index * 0.1) }}
                        >
                          <div className="mt-1 mr-3 flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-indigo-100">
                            <Check className="h-4 w-4 text-indigo-600" />
                          </div>
                          <p className="text-gray-700">{feature}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </AnimateOnView>
            </div>
            
            {/* Separador com gradiente */}
            <div className="w-full max-w-5xl h-px bg-gradient-to-r from-transparent via-purple-100 to-transparent my-8"></div>
            
            {/* Seção 2: Precificação Inteligente */}
            <div className="w-full py-10 px-4">
              <AnimateOnView delay={100}>
                <div className="flex flex-col-reverse md:flex-row gap-12 items-center">
                  {/* Feature Description */}
                  <motion.div 
                    className="w-full md:w-1/2"
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                  >
                    <div className="flex items-center mb-6">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-purple-100 mr-4">
                        <Calculator className="h-8 w-8 text-purple-600" />
                      </div>
                      <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500">
                        Precificação Inteligente
                      </h3>
                    </div>
                    
                    <p className="text-lg text-gray-600 mb-4">
                      Calcule o preço ideal para seus produtos e serviços de forma estratégica, considerando todos os custos, impostos e margens de lucro desejadas.
                    </p>
                    
                    <p className="text-lg text-gray-600 mb-4">
                      Nossa ferramenta de <span className="font-semibold text-purple-700">precificação recursiva</span> permite simular diferentes cenários e descobrir o preço perfeito para maximizar seus lucros. Considere impostos, taxas de cartão, comissões e outros custos operacionais automaticamente!
                    </p>
                    
                    <p className="text-lg text-gray-600 mb-8">
                      O sistema inteligente sugere preços otimizados baseados no histórico de vendas e comportamento do mercado, ajustando-se às tendências sazonais.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-6">
                      {[
                        "Produtos novos e usados",
                        "Serviços por hora ou projeto",
                        "Equipamentos para aluguel",
                        "Importação de planilhas e XML",
                        "Precificação recursiva",
                        "Simulador de margens"
                      ].map((feature, index) => (
                        <motion.div 
                          key={index}
                          className="flex items-start"
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.4, delay: 0.4 + (index * 0.1) }}
                        >
                          <div className="mt-1 mr-3 flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-purple-100">
                            <Check className="h-4 w-4 text-purple-600" />
                          </div>
                          <p className="text-gray-700">{feature}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                  
                  {/* Pricing Interface Preview */}
                  <motion.div 
                    className="w-full md:w-1/2 rounded-2xl shadow-xl overflow-hidden border border-gray-100"
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{ 
                      boxShadow: ["0px 4px 12px rgba(0, 0, 0, 0.05)", "0px 8px 24px rgba(147, 51, 234, 0.15)", "0px 4px 12px rgba(0, 0, 0, 0.05)"]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      repeatType: "reverse",
                      delay: 1
                    }}
                  >
                    <CompactPricingDashboard />
                  </motion.div>
                </div>
              </AnimateOnView>
            </div>
            
            {/* Separador com gradiente */}
            <div className="w-full max-w-5xl h-px bg-gradient-to-r from-transparent via-purple-100 to-transparent my-8"></div>
            
            {/* Seção 3: Cadastros e Gerenciamento */}
            <div className="w-full py-10 px-4">
              <AnimateOnView delay={200}>
                <div className="flex flex-col md:flex-row gap-12 items-center">
                  {/* Management Interface Preview */}
                  <motion.div 
                    className="w-full md:w-1/2 rounded-2xl shadow-xl overflow-hidden border border-gray-100"
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{ 
                      boxShadow: ["0px 4px 12px rgba(0, 0, 0, 0.05)", "0px 8px 24px rgba(16, 185, 129, 0.15)", "0px 4px 12px rgba(0, 0, 0, 0.05)"]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      repeatType: "reverse",
                      delay: 2
                    }}
                  >
                    <CompactManagementDashboard />
                  </motion.div>
                  
                  {/* Feature Description */}
                  <motion.div 
                    className="w-full md:w-1/2"
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                  >
                    <div className="flex items-center mb-6">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-emerald-100 mr-4">
                        <Clipboard className="h-8 w-8 text-emerald-600" />
                      </div>
                      <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-green-500">
                        Cadastros Completos
                      </h3>
                    </div>
                    
                    <p className="text-lg text-gray-600 mb-8">
                      Organize todos os seus dados em um único local com cadastros completos para produtos, serviços, clientes e fornecedores.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {[
                        { title: "Produtos", subtitle: "Novos, usados e para aluguel" },
                        { title: "Serviços", subtitle: "Por hora, projeto ou contrato" },
                        { title: "Clientes", subtitle: "Pessoas físicas e jurídicas" },
                        { title: "Fornecedores", subtitle: "Nacionais e internacionais" }
                      ].map((item, index) => (
                        <motion.div 
                          key={index}
                          className="flex items-start"
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.4, delay: 0.4 + (index * 0.1) }}
                        >
                          <div className="mt-1 mr-3 flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100">
                            <Check className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-gray-700 font-medium">{item.title}</p>
                            <p className="text-gray-500 text-sm">{item.subtitle}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </AnimateOnView>
            </div>
                        
            {/* Separador com gradiente */}
            <div className="w-full max-w-5xl h-px bg-gradient-to-r from-transparent via-purple-100 to-transparent my-8"></div>
            
            {/* Seção 4: Funcionalidades adicionais */}
            <div className="w-full py-8 px-4">
              <AnimateOnView>
                <div className="text-center mb-12">
                  <motion.h3 
                    className="text-2xl md:text-3xl font-bold text-gray-900 mb-4"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                  >
                    E muito mais
                  </motion.h3>
                  <motion.p 
                    className="text-lg text-gray-600 max-w-3xl mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.1 }}
                  >
                    Nosso sistema oferece um conjunto completo de ferramentas para gerenciar todos os aspectos do seu negócio
                  </motion.p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    {
                      icon: <DollarSign className="h-6 w-6 text-rose-600" />,
                      title: "Gestão Financeira",
                      description: "Controle completo das finanças com análise de custos, despesas, taxas e tributos.",
                      items: ["Relatórios gerenciais", "Análise de rentabilidade"],
                      color: "rose"
                    },
                    {
                      icon: <Package className="h-6 w-6 text-blue-600" />,
                      title: "Aluguel de Equipamentos",
                      description: "Gestão completa para empresas que trabalham com locação de equipamentos.",
                      items: ["Controle de disponibilidade", "Cálculo de retorno sobre investimento"],
                      color: "blue"
                    },
                    {
                      icon: <HelpCircle className="h-6 w-6 text-blue-600" />,
                      title: "Central de Treinamento",
                      description: "Tutoriais, vídeos e documentação completa para você aproveitar ao máximo o sistema.",
                      items: ["Vídeos tutoriais", "Suporte técnico especializado"],
                      color: "blue"
                    }
                  ].map((card, index) => (
                    <motion.div 
                      key={index}
                      className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 transition-all duration-300 hover:shadow-xl"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.2 + (index * 0.15) }}
                    >
                      <div className="flex items-center mb-4">
                        {card.color === "rose" && (
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-rose-100">
                            {card.icon}
                          </div>
                        )}
                        {card.color === "teal" && (
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                            {card.icon}
                          </div>
                        )}
                        {card.color === "blue" && (
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                            {card.icon}
                          </div>
                        )}
                        <h4 className="text-xl font-bold text-gray-900 ml-4">{card.title}</h4>
                      </div>
                      <p className="text-gray-600 mb-4">{card.description}</p>
                      <ul className="space-y-2">
                        {card.items.map((item, itemIndex) => (
                          <motion.li 
                            key={itemIndex}
                            className="flex items-center text-gray-600"
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.3, delay: 0.4 + (index * 0.1) + (itemIndex * 0.1) }}
                          >
                            {card.color === "rose" && (
                              <Check className="h-4 w-4 text-rose-500 mr-2" />
                            )}
                            {card.color === "teal" && (
                              <Check className="h-4 w-4 text-blue-500 mr-2" />
                            )}
                            {card.color === "blue" && (
                              <Check className="h-4 w-4 text-blue-500 mr-2" />
                            )}
                            <span>{item}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </div>
                
                <motion.div 
                  className="text-center mt-6"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  <div className="relative mb-2">
                    <div className="bg-amber-500 text-xs font-bold text-yellow-900 px-4 py-1 rounded-full shadow-md animate-pulse mx-auto mb-2 inline-block">
                      OFERTA LIMITADA!
                    </div>
                    <div className="w-full text-center">
                      <BotaoAutenticacao
                        tipo="cadastro"
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 rounded-full px-6 sm:px-8 group shadow-lg hover:shadow-xl transition-all duration-300 mx-auto max-w-[90%] sm:max-w-none"
                      >
                        <span className="flex items-center text-sm sm:text-base">
                          <span className="hidden sm:inline">ASSINE AGORA E GANHE 2 MESES GRÁTIS!</span>
                          <span className="sm:hidden">ASSINE AGORA E GANHE 2 MESES!</span>
                          <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform duration-200" />
                        </span>
                      </BotaoAutenticacao>
                    </div>
                  </div>
                </motion.div>
              </AnimateOnView>
            </div>
          </div>

          {/* Seção de História - Storytelling - Ocupa Toda a Largura */}
          <section id="destaques" className="relative overflow-hidden scroll-mt-20 w-[100vw] ml-[calc(-50vw+50%)] py-8 storytelling-bg">
            {/* Fundo principal com gradiente suave */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900"></div>
            
            {/* Formas abstratas animadas em fundo */}
            <div className="absolute top-0 left-0 w-[50%] h-[50%] rounded-full bg-indigo-700/20 blur-[80px] -translate-x-1/4 -translate-y-1/4 pulse-effect"></div>
            <div className="absolute bottom-0 right-0 w-[60%] h-[60%] rounded-full bg-purple-600/20 blur-[100px] translate-x-1/4 translate-y-1/4 pulse-effect" style={{ animationDelay: "2s" }}></div>
            <div className="absolute top-1/2 right-1/3 w-[30%] h-[30%] rounded-full bg-purple-500/10 blur-[50px] -translate-y-1/2 pulse-effect" style={{ animationDelay: "4s" }}></div>
            
            {/* Elemento decorativo girando lentamente */}
            <div className="absolute inset-0 opacity-10 spin-effect">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65%] h-[65%] border border-white/10 rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[45%] h-[45%] border border-white/5 rounded-full"></div>
            </div>
            
            {/* Grade de fundo do gráfico */}
            <div className="absolute inset-0 overflow-hidden opacity-30">
              {/* Linhas horizontais */}
              <div className="absolute top-[20%] left-0 right-0 chart-grid-line chart-grid-line-horizontal"></div>
              <div className="absolute top-[40%] left-0 right-0 chart-grid-line chart-grid-line-horizontal"></div>
              <div className="absolute top-[60%] left-0 right-0 chart-grid-line chart-grid-line-horizontal"></div>
              <div className="absolute top-[80%] left-0 right-0 chart-grid-line chart-grid-line-horizontal"></div>
              
              {/* Linhas verticais */}
              <div className="absolute top-0 bottom-0 left-[20%] chart-grid-line chart-grid-line-vertical"></div>
              <div className="absolute top-0 bottom-0 left-[40%] chart-grid-line chart-grid-line-vertical"></div>
              <div className="absolute top-0 bottom-0 left-[60%] chart-grid-line chart-grid-line-vertical"></div>
              <div className="absolute top-0 bottom-0 left-[80%] chart-grid-line chart-grid-line-vertical"></div>
            </div>
            
            {/* Linhas de gráfico de crescimento */}
            <div className="absolute inset-0 overflow-hidden">
              {/* História do crescimento financeiro representada em gráfico */}
              
              {/* Linha inicial negativa - queda */}
              <div className="absolute bottom-[35%] left-[5%] w-[15%] chart-line chart-line-danger" style={{ 
                transform: 'rotate(-20deg)', 
                transformOrigin: 'left bottom',
                animationDuration: '12s',
                animationDelay: '0s'
              }}></div>
              <div className="absolute bottom-[35%] left-[5%] chart-dot chart-dot-danger" style={{ 
                animation: 'chart-dot-continuous 12s infinite ease-out',
                animationDelay: '0.2s' 
              }}></div>
              <div className="absolute bottom-[30%] left-[10%] chart-dot chart-dot-danger" style={{ 
                animation: 'chart-dot-continuous 12s infinite ease-out',
                animationDelay: '0.6s' 
              }}></div>
              <div className="absolute bottom-[25%] left-[15%] chart-dot chart-dot-danger" style={{ 
                animation: 'chart-dot-continuous 12s infinite ease-out',
                animationDelay: '1.0s' 
              }}></div>
              
              {/* Linha de estabilização horizontal */}
              <div className="absolute bottom-[25%] left-[20%] w-[10%] chart-line" style={{ 
                animationDuration: '12s',
                animationDelay: '1.5s' 
              }}></div>
              <div className="absolute bottom-[25%] left-[20%] chart-dot" style={{ 
                animation: 'chart-dot-continuous 12s infinite ease-out',
                animationDelay: '1.8s' 
              }}></div>
              <div className="absolute bottom-[25%] left-[25%] chart-dot" style={{ 
                animation: 'chart-dot-continuous 12s infinite ease-out',
                animationDelay: '2.1s' 
              }}></div>
              <div className="absolute bottom-[25%] left-[30%] chart-dot" style={{ 
                animation: 'chart-dot-continuous 12s infinite ease-out',
                animationDelay: '2.4s' 
              }}></div>
              
              {/* Primeira linha de crescimento suave */}
              <div className="absolute bottom-[25%] left-[30%] w-[15%] chart-line chart-line-success" style={{ 
                transform: 'rotate(15deg)', 
                transformOrigin: 'left bottom',
                animationDuration: '12s',
                animationDelay: '2.8s' 
              }}></div>
              <div className="absolute bottom-[28%] left-[35%] chart-dot chart-dot-success" style={{ 
                animation: 'chart-dot-continuous 12s infinite ease-out',
                animationDelay: '3.2s' 
              }}></div>
              <div className="absolute bottom-[32%] left-[40%] chart-dot chart-dot-success" style={{ 
                animation: 'chart-dot-continuous 12s infinite ease-out',
                animationDelay: '3.6s' 
              }}></div>
              
              {/* Segunda linha de crescimento mais íngreme */}
              <div className="absolute bottom-[32%] left-[45%] w-[15%] chart-line chart-line-success" style={{ 
                transform: 'rotate(30deg)', 
                transformOrigin: 'left bottom',
                animationDuration: '12s',
                animationDelay: '4.0s' 
              }}></div>
              <div className="absolute bottom-[32%] left-[45%] chart-dot chart-dot-success" style={{ 
                animation: 'chart-dot-continuous 12s infinite ease-out',
                animationDelay: '4.4s' 
              }}></div>
              <div className="absolute bottom-[40%] left-[50%] chart-dot chart-dot-success" style={{ 
                animation: 'chart-dot-continuous 12s infinite ease-out',
                animationDelay: '4.8s'
              }}></div>
              <div className="absolute bottom-[48%] left-[55%] chart-dot chart-dot-success" style={{ 
                animation: 'chart-dot-continuous 12s infinite ease-out',
                animationDelay: '5.2s'
              }}></div>
              
              {/* Crescimento explosivo */}
              <div className="absolute bottom-[48%] left-[60%] w-[20%] chart-line chart-line-success" style={{ 
                transform: 'rotate(60deg)', 
                transformOrigin: 'left bottom',
                animationDuration: '12s',
                animationDelay: '5.6s' 
              }}></div>
              <div className="absolute bottom-[48%] left-[60%] chart-dot chart-dot-success" style={{ 
                animation: 'chart-dot-continuous 12s infinite ease-out',
                animationDelay: '6.0s'
              }}></div>
              <div className="absolute bottom-[60%] left-[65%] chart-dot chart-dot-success" style={{ 
                animation: 'chart-dot-continuous 12s infinite ease-out',
                animationDelay: '6.4s'
              }}></div>
              <div className="absolute bottom-[75%] left-[70%] chart-dot chart-dot-success" style={{ 
                animation: 'chart-dot-continuous 12s infinite ease-out',
                animationDelay: '6.8s'
              }}></div>
              <div className="absolute bottom-[85%] left-[75%] chart-dot chart-dot-success" style={{ 
                animation: 'chart-dot-continuous 12s infinite ease-out',
                animationDelay: '7.2s'
              }}></div>
              
              {/* Indicador de valor monetário final - sucesso */}
              <div className="absolute bottom-[85%] left-[80%] chart-dot chart-dot-success" style={{ 
                width: '8px', 
                height: '8px', 
                animation: 'chart-dot-continuous 12s infinite ease-out',
                animationDelay: '7.6s',
                boxShadow: '0 0 15px rgba(50, 205, 50, 0.8)'
              }}></div>
              
              {/* Rótulos de valores financeiros */}
              <div className="absolute bottom-[35%] left-[5%] text-white text-xs opacity-0 animate-fadeInOut" 
                style={{ animationDelay: '0.7s' }}>
                <div className="bg-red-500/30 px-2 py-0.5 rounded-sm backdrop-blur-sm text-[10px] whitespace-nowrap">
                  -R$ 200 mil
                </div>
              </div>
              
              <div className="absolute bottom-[25%] left-[30%] text-white text-xs opacity-0 animate-fadeInOut"
                style={{ animationDelay: '2.2s' }}>
                <div className="bg-amber-500/30 px-2 py-0.5 rounded-sm backdrop-blur-sm text-[10px] whitespace-nowrap">
                  R$ 0
                </div>
              </div>
              
              <div className="absolute bottom-[85%] left-[80%] text-white text-xs opacity-0 animate-fadeInOut"
                style={{ animationDelay: '4.8s' }}>
                <div className="bg-green-500/30 px-2 py-0.5 rounded-sm backdrop-blur-sm text-[10px] whitespace-nowrap">
                  +R$ 1,5 mi
                </div>
              </div>
            </div>
            
            {/* Pontos de luz com efeito flutuante */}
            <div className="absolute top-[15%] left-[20%] w-2 h-2 bg-white/30 rounded-full float-effect"></div>
            <div className="absolute top-[75%] right-[30%] w-1.5 h-1.5 bg-white/20 rounded-full float-effect" style={{ animationDelay: "3s" }}></div>
            <div className="absolute top-[35%] right-[25%] w-1 h-1 bg-white/15 rounded-full float-effect" style={{ animationDelay: "6s" }}></div>
            <div className="absolute top-[60%] left-[30%] w-1.5 h-1.5 bg-white/25 rounded-full float-effect" style={{ animationDelay: "9s" }}></div>
            
            {/* Partículas brilhantes animadas */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="particle"></div>
              <div className="particle"></div>
              <div className="particle"></div>
              <div className="particle"></div>
              <div className="particle" style={{ 
                width: '18px', 
                height: '18px', 
                top: '45%', 
                left: '85%', 
                opacity: '0.15', 
                animation: 'floating-particles 25s infinite ease-in-out',
                animationDelay: '3s'
              }}></div>
              <div className="particle" style={{ 
                width: '12px', 
                height: '12px', 
                top: '15%', 
                left: '35%', 
                opacity: '0.1', 
                animation: 'floating-particles 28s infinite ease-in-out reverse',
                animationDelay: '8s'
              }}></div>
            </div>
            
            <div className="container mx-auto px-4 relative z-10">
              {/* Título da seção */}
              <div className="text-center mb-4 pt-4">
                <Badge className="mb-4 mt-2 bg-purple-100 text-purple-700 rounded-full py-1 px-4 text-xs font-medium">
                  Meu Preço Certo
                </Badge>
                <h2 
                  className="text-2xl md:text-3xl font-bold text-white mb-2"
                >
                  De Endividado a Milionário com Precificação
                </h2>
                <div className="mb-1"></div>
                <motion.p
                  className="text-sm md:text-base text-white/80 mx-auto max-w-2xl mb-6 md:mb-10"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  Como saí de uma dívida de R$ 200 mil para uma empresa avaliada em mais de R$ 1,5 milhão
                </motion.p>
              </div>
              
              {/* Layout para Desktop */}
              <div className="hidden md:flex md:flex-row max-w-5xl mx-auto">
                {/* Coluna esquerda - Conteúdo do storytelling */}
                <div className="md:w-3/5 md:pr-6">
                  {/* Caixa translúcida para o texto */}
                  <motion.div
                    className="bg-purple-950/70 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-purple-700/30 h-full flex flex-col justify-between"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="space-y-3 text-white">
                      <p className="leading-relaxed text-sm">
                        <span className="text-lg font-semibold text-yellow-300">"</span>
                        Eu estava afundado em dívidas. Literalmente. Meu nome estava sujo, o banco me ligava todos os dias, e eu devia mais de 
                        <span className="font-bold text-yellow-300"> R$ 200.000,00</span>.
                        Trabalhava de domingo a domingo, vendia bem, mas o dinheiro simplesmente sumia.
                      </p>
                      
                      <p className="leading-relaxed text-sm">
                        Foi só quando parei e encarei a verdade que tudo começou a mudar: 
                        <span className="font-bold text-yellow-300"> meu problema não era falta de vendas, era a precificação errada</span>.
                      </p>
                      
                      <p className="leading-relaxed text-sm">
                        Eu vendia produtos e serviços com prejuízo sem saber. Não calculava impostos direito, não incluía despesas fixas, e o pior: nem salário eu tirava.
                      </p>
                      
                      <p className="leading-relaxed text-sm">
                        Foi aí que desenvolvi meu próprio sistema de precificação e gerenciamento financeiro.
                        <span className="font-bold text-yellow-300"> Uma ferramenta simples que mostrasse com clareza o preço certo para lucrar de verdade</span>.
                      </p>
                      
                      <p className="leading-relaxed text-sm mb-4">
                        Em menos de 1 ano, saí do vermelho, fiz novos investimentos e hoje minha empresa está avaliada em mais de 
                        <span className="font-bold text-yellow-300"> R$ 1.500.000,00</span>.
                        <span className="font-bold text-red-400"> Precificar errado é a forma mais silenciosa de quebrar uma empresa</span>.
                      </p>
                      
                      <div className="pt-1">
                        <p className="leading-relaxed text-sm mb-4">
                          <span className="font-bold">Você não precisa passar pelo que eu passei</span>.
                          Comece agora, com as ferramentas certas.
                          <span className="font-bold text-yellow-300"> Você merece uma empresa saudável — e um dono bem pago."</span>
                        </p>
                        
                        {/* Assinatura */}
                        <div className="mt-3 mb-3 text-right pr-2">
                          <p className="font-handwriting text-base text-yellow-200 italic">Ritiele M Aldeburg</p>
                          <p className="text-xs text-yellow-100 italic mt-1 pr-2">CEO e Fundador</p>
                        </div>
                        
                        {/* Linha decorativa com efeito de brilho */}
                        <motion.div 
                          className="w-full h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent my-4"
                          animate={{ 
                            opacity: [0.6, 1, 0.6],
                            backgroundImage: [
                              "linear-gradient(90deg, transparent, rgba(250, 204, 21, 0.2), transparent)",
                              "linear-gradient(90deg, transparent, rgba(250, 204, 21, 0.4), transparent)",
                              "linear-gradient(90deg, transparent, rgba(250, 204, 21, 0.2), transparent)"
                            ]
                          }}
                          transition={{ 
                            duration: 3, 
                            repeat: Infinity 
                          }}
                        ></motion.div>
                        
                        {/* Botão centralizado com efeito de pulsação */}
                        <div className="flex justify-center mt-3">
                          <motion.div
                            animate={{ 
                              scale: [1, 1.03, 1],
                              boxShadow: [
                                "0px 4px 6px rgba(234, 179, 8, 0.1)",
                                "0px 4px 12px rgba(234, 179, 8, 0.25)",
                                "0px 4px 6px rgba(234, 179, 8, 0.1)"
                              ]
                            }}
                            transition={{ 
                              duration: 2, 
                              repeat: Infinity,
                              repeatType: "reverse"
                            }}
                            className="rounded-full"
                          >
                            <BotaoAutenticacao
                              tipo="cadastro"
                              className="bg-yellow-400 hover:bg-amber-500 text-purple-900 font-bold py-2 px-6 rounded-full text-sm transition-transform hover:scale-105 shadow-lg mx-auto"
                            >
                              Quero precificar certo e lucrar de verdade
                              <ChevronRight className="ml-1 h-3 w-3" />
                            </BotaoAutenticacao>
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
                
                {/* Coluna direita - Foto do empresário */}
                <div className="md:w-2/5 mt-0 md:-mt-2 flex flex-col items-center justify-center">
                  <div className="flex items-center flex-col">
                    {/* Foto do empresário centralizada (mesmo estilo do mobile) */}
                    <motion.div 
                      className="w-48 h-48 relative mb-2"
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6 }}
                    >
                      <div className="w-full h-full rounded-full overflow-hidden border-4 border-yellow-300/30 shadow-xl">
                        <img 
                          src={person2Image} 
                          alt="Ritiele Aldeburg - CEO e Fundador" 
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Overlay com gradiente */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-indigo-900/50 to-transparent"></div>
                      </div>
                      
                      {/* Emblema decorativo */}
                      <motion.div 
                        className="absolute -bottom-2 -right-2 bg-yellow-400 rounded-full p-2 shadow-lg border-2 border-purple-900"
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                      >
                        <DollarSign className="h-5 w-5 text-purple-900" />
                      </motion.div>
                    </motion.div>
                    
                    {/* Nome e cargo */}
                    <motion.div 
                      className="text-center mb-4"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      <p className="font-handwriting text-xl text-yellow-200 italic">Ritiele M Aldeburg</p>
                      <p className="text-xs text-yellow-100 italic">CEO e Fundador</p>
                    </motion.div>
                  </div>
                  
                  {/* Cards de storytelling alinhados com o texto */}
                  <div className="space-y-2 w-full max-w-xs">
                    <motion.div 
                      className="bg-indigo-800/50 backdrop-blur-sm rounded-lg p-3 border border-indigo-700"
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{
                        y: { duration: 0.4, delay: 0.1 },
                        opacity: { duration: 0.4, delay: 0.1 }
                      }}
                    >
                      <div className="flex items-start mb-1">
                        <motion.div>
                          <AlertTriangle className="h-4 w-4 text-yellow-300 mr-2 flex-shrink-0 mt-0.5" />
                        </motion.div>
                        <p className="text-xs text-white">
                          <span className="text-yellow-300 font-semibold">R$ 200.000,00 em dívidas</span> - 
                          Meu nome estava sujo, o banco me ligava todos os dias.
                        </p>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="bg-indigo-800/50 backdrop-blur-sm rounded-lg p-3 border border-indigo-700"
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{
                        y: { duration: 0.4, delay: 0.2 },
                        opacity: { duration: 0.4, delay: 0.2 }
                      }}
                    >
                      <div className="flex items-start mb-1">
                        <motion.div>
                          <Info className="h-4 w-4 text-yellow-300 mr-2 flex-shrink-0 mt-0.5" />
                        </motion.div>
                        <p className="text-xs text-white">
                          A grande descoberta: <span className="text-yellow-300 font-semibold">meu problema era precificação errada</span>.
                        </p>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="bg-indigo-800/50 backdrop-blur-sm rounded-lg p-3 border border-indigo-700"
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{
                        y: { duration: 0.4, delay: 0.3 },
                        opacity: { duration: 0.4, delay: 0.3 }
                      }}
                    >
                      <div className="flex items-start mb-1">
                        <motion.div>
                          <Calculator className="h-4 w-4 text-yellow-300 mr-2 flex-shrink-0 mt-0.5" />
                        </motion.div>
                        <p className="text-xs text-white">
                          Desenvolvi um sistema de precificação que me mostrava com clareza
                          o <span className="text-yellow-300 font-semibold">preço certo para lucrar de verdade</span>.
                        </p>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="bg-indigo-800/50 backdrop-blur-sm rounded-lg p-3 border border-indigo-700"
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{
                        opacity: { duration: 0.4, delay: 0.4 },
                        y: { duration: 0.4, delay: 0.4 }
                      }}
                    >
                      <div className="flex items-start mb-1">
                        <motion.div>
                          <TrendingUp className="h-4 w-4 text-yellow-300 mr-2 flex-shrink-0 mt-0.5" />
                        </motion.div>
                        <p className="text-xs text-white">
                          <span className="text-yellow-300 font-semibold">Em menos de 1 ano:</span> Saí do vermelho,
                          investí e hoje minha empresa está avaliada em 
                          <span className="text-yellow-300 font-semibold"> R$ 1.500.000,00</span>.
                        </p>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="bg-red-900/30 backdrop-blur-sm rounded-lg p-3 border border-red-800/50"
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{
                        opacity: { duration: 0.4, delay: 0.5 },
                        y: { duration: 0.4, delay: 0.5 }
                      }}
                    >
                      <div className="flex items-start mb-1">
                        <motion.div>
                          <AlertCircle className="h-4 w-4 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                        </motion.div>
                        <p className="text-xs text-white font-medium">
                          <span className="text-red-400 font-bold">
                            Precificar errado é a forma mais silenciosa de quebrar uma empresa
                          </span>
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
              
              {/* Layout para Mobile (mantemos para compatibilidade) */}
              <div className="md:hidden max-w-5xl mx-auto">
                {/* Foto do empresário centralizada */}
                <div className="flex justify-center mb-5">
                  <motion.div 
                    className="w-48 h-48 relative"
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden border-4 border-yellow-300/30 shadow-xl">
                      <img 
                        src={person2Image} 
                        alt="Ritiele Aldeburg - CEO e Fundador" 
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Overlay com gradiente */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-t from-indigo-900/50 to-transparent"></div>
                    </div>
                    
                    {/* Emblema decorativo */}
                    <motion.div 
                      className="absolute -bottom-2 -right-2 bg-yellow-400 rounded-full p-2 shadow-lg border-2 border-purple-900"
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                    >
                      <DollarSign className="h-5 w-5 text-purple-900" />
                    </motion.div>
                  </motion.div>
                </div>
                
                {/* Nome e cargo */}
                <motion.div 
                  className="text-center mb-4"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <p className="font-handwriting text-xl text-yellow-200 italic">Ritiele M Aldeburg</p>
                  <p className="text-xs text-yellow-100 italic">CEO e Fundador</p>
                </motion.div>
                
                {/* Cards de storytelling */}
                <div className="space-y-3 mb-6">
                  <motion.div 
                    className="bg-indigo-800/50 backdrop-blur-sm rounded-lg p-3 border border-indigo-700"
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    animate={{
                      boxShadow: ["0px 0px 0px rgba(255, 195, 0, 0)", "0px 0px 8px rgba(255, 195, 0, 0.3)", "0px 0px 0px rgba(255, 195, 0, 0)"],
                    }}
                    transition={{
                      y: { duration: 0.4, delay: 0.1 },
                      opacity: { duration: 0.4, delay: 0.1 },
                      boxShadow: {
                        duration: 2,
                        repeat: Infinity,
                        repeatType: "reverse",
                      }
                    }}
                  >
                    <div className="flex items-start mb-1">
                      <motion.div
                        animate={{ 
                          rotate: [-5, 5, -5],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ 
                          duration: 1.5, 
                          repeat: Infinity,
                          repeatType: "reverse"
                        }}
                      >
                        <AlertTriangle className="h-4 w-4 text-yellow-300 mr-2 flex-shrink-0 mt-0.5" />
                      </motion.div>
                      <p className="text-xs text-white">
                        <span className="text-yellow-300 font-semibold">R$ 200.000,00 em dívidas</span> - 
                        Meu nome estava sujo, o banco me ligava todos os dias.
                      </p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="bg-indigo-800/50 backdrop-blur-sm rounded-lg p-3 border border-indigo-700"
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    animate={{
                      borderLeft: [
                        "1px solid rgba(79, 70, 229, 0.7)",
                        "3px solid rgba(251, 191, 36, 0.7)",
                        "1px solid rgba(79, 70, 229, 0.7)"
                      ]
                    }}
                    transition={{
                      y: { duration: 0.4, delay: 0.2 },
                      opacity: { duration: 0.4, delay: 0.2 },
                      borderLeft: {
                        duration: 2.2,
                        repeat: Infinity,
                        repeatType: "reverse",
                      }
                    }}
                  >
                    <div className="flex items-start mb-1">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.2, 1],
                          opacity: [1, 0.8, 1]
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity 
                        }}
                      >
                        <Info className="h-4 w-4 text-yellow-300 mr-2 flex-shrink-0 mt-0.5" />
                      </motion.div>
                      <p className="text-xs text-white">
                        A grande descoberta: <span className="text-yellow-300 font-semibold">meu problema era precificação errada</span>.
                      </p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="bg-indigo-800/50 backdrop-blur-sm rounded-lg p-3 border border-indigo-700"
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    animate={{
                      background: [
                        "linear-gradient(90deg, rgba(49, 46, 129, 0.5) 0%, rgba(67, 56, 202, 0.5) 100%)",
                        "linear-gradient(90deg, rgba(67, 56, 202, 0.5) 0%, rgba(49, 46, 129, 0.5) 100%)",
                        "linear-gradient(90deg, rgba(49, 46, 129, 0.5) 0%, rgba(67, 56, 202, 0.5) 100%)"
                      ],
                    }}
                    transition={{
                      y: { duration: 0.4, delay: 0.3 },
                      opacity: { duration: 0.4, delay: 0.3 },
                      background: {
                        duration: 3,
                        repeat: Infinity,
                        repeatType: "reverse",
                      }
                    }}
                  >
                    <div className="flex items-start mb-1">
                      <motion.div
                        animate={{ 
                          rotate: [0, 360],
                        }}
                        transition={{ 
                          duration: 4, 
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      >
                        <Calculator className="h-4 w-4 text-yellow-300 mr-2 flex-shrink-0 mt-0.5" />
                      </motion.div>
                      <p className="text-xs text-white">
                        Desenvolvi um sistema de precificação que me mostrava com clareza
                        o <span className="text-yellow-300 font-semibold">preço certo para lucrar de verdade</span>.
                      </p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="bg-indigo-800/50 backdrop-blur-sm rounded-lg p-3 border border-indigo-700"
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    animate={{
                      y: [0, -3, 0]
                    }}
                    transition={{
                      opacity: { duration: 0.4, delay: 0.4 },
                      y: {
                        duration: 2.5,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }
                    }}
                  >
                    <div className="flex items-start mb-1">
                      <motion.div
                        animate={{ 
                          y: [0, 3, 0, -3, 0],
                        }}
                        transition={{ 
                          duration: 1.5, 
                          repeat: Infinity 
                        }}
                      >
                        <TrendingUp className="h-4 w-4 text-yellow-300 mr-2 flex-shrink-0 mt-0.5" />
                      </motion.div>
                      <p className="text-xs text-white">
                        <span className="text-yellow-300 font-semibold">Em menos de 1 ano:</span> Saí do vermelho,
                        investí e hoje minha empresa está avaliada em 
                        <span className="text-yellow-300 font-semibold"> R$ 1.500.000,00</span>.
                      </p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="bg-red-900/30 backdrop-blur-sm rounded-lg p-3 border border-red-800/50"
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    animate={{
                      boxShadow: [
                        "0px 0px 0px rgba(239, 68, 68, 0)",
                        "0px 0px 10px rgba(239, 68, 68, 0.5)",
                        "0px 0px 0px rgba(239, 68, 68, 0)"
                      ]
                    }}
                    transition={{
                      opacity: { duration: 0.4, delay: 0.5 },
                      y: { duration: 0.4, delay: 0.5 },
                      boxShadow: {
                        duration: 2,
                        repeat: Infinity,
                      }
                    }}
                  >
                    <div className="flex items-start mb-1">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.3, 1],
                        }}
                        transition={{ 
                          duration: 1.2, 
                          repeat: Infinity,
                          repeatType: "reverse"
                        }}
                      >
                        <AlertCircle className="h-4 w-4 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                      </motion.div>
                      <p className="text-xs text-white font-medium">
                        <span className="text-red-400 font-bold">
                          Precificar errado é a forma mais silenciosa de quebrar uma empresa
                        </span>
                      </p>
                    </div>
                  </motion.div>
                </div>
                
                {/* Conclusão */}
                <motion.div 
                  className="text-center text-white mb-4"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <p className="text-xs mb-1">
                    <span className="font-bold">Você não precisa passar pelo que eu passei</span>.
                  </p>
                  <p className="text-xs font-medium text-yellow-300">
                    Você merece uma empresa saudável — e um dono bem pago.
                  </p>
                </motion.div>
                
                {/* Botão para mobile */}
                <motion.div 
                  className="flex justify-center mb-2"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  <BotaoAutenticacao
                    tipo="cadastro"
                    className="bg-yellow-400 hover:bg-amber-500 text-purple-900 font-bold py-2 px-4 rounded-full text-sm shadow-lg w-full mx-3 flex items-center justify-center"
                  >
                    Quero precificar certo
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </BotaoAutenticacao>
                </motion.div>
              </div>
            </div>
          </section>


          {/* Seção de Planos */}
          <section className="mt-0 pb-16 pt-10 scroll-mt-24" id="planos">
            <div className="text-center mb-12">
              <motion.h2 
                className="text-4xl font-bold text-purple-900 mb-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                +20.000 usuários já escolheram
                <br />um plano ideal. Escolha o seu também!
              </motion.h2>
              
              <motion.p 
                className="text-lg text-gray-600 max-w-2xl mx-auto mb-8"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Junte-se aos milhares de empresários que economizam tempo e maximizam seus lucros com nossos planos personalizados.
              </motion.p>
              
              {/* Seletor de período */}
              <div className="flex justify-center items-center mb-6">
                <div className="bg-gray-100 p-1 rounded-full inline-flex">
                  <button
                    type="button"
                    onClick={() => setPeriodoPlanos("mensal")}
                    className={`inline-flex items-center justify-center rounded-full px-6 py-1.5 text-sm font-medium transition-all duration-200 focus:outline-none ${
                      periodoPlanos === "mensal" 
                        ? "bg-purple-600 text-white shadow-sm" 
                        : "bg-transparent text-gray-700 hover:bg-gray-200"}`}
                  >
                    Mensal
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setPeriodoPlanos("anual")}
                    className={`inline-flex items-center justify-center rounded-full px-6 py-1.5 text-sm font-medium transition-all duration-200 focus:outline-none ${
                      periodoPlanos === "anual" 
                        ? "bg-purple-600 text-white shadow-sm" 
                        : "bg-transparent text-gray-700 hover:bg-gray-200"}`}
                  >
                    Anual
                  </button>
                </div>
              </div>
              
              <Badge className="bg-purple-900 text-white rounded-full py-1 px-4">
                {periodoPlanos === "anual" ? 
                  "Assine o plano anual e ganhe 2 meses grátis!" : 
                  "Parcele em até 6x sem juros"}
              </Badge>
            </div>
            
            {/* Cards de Planos - Desktop */}
            <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
              {/* Coluna vazia para alinhamento com a tabela */}
              <div className="hidden lg:block"></div>
              {/* Plano Essencial */}
              <Card className="overflow-hidden flex flex-col h-full border border-blue-500 transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                <CardContent className="p-0 bg-blue-50 flex flex-col flex-grow">
                  <div className="px-4 py-6 text-center text-gray-900 flex flex-col h-full">
                    <div>
                      <div className="flex items-center justify-center mb-1">
                        <Package className="h-5 w-5 text-blue-500 mr-2" />
                        <h3 className="text-lg font-medium">Essencial</h3>
                      </div>
                      {periodoPlanos === "anual" ? (
                        <p className="text-sm line-through opacity-70 mb-1">R$ 87,90/mês</p>
                      ) : (
                        <p className="text-sm opacity-0 mb-1">_</p>
                      )}
                      <div className="flex items-baseline justify-center">
                        <span className="text-3xl font-bold">R$ {periodoPlanos === "anual" ? "73,25" : "87,90"}</span>
                        <span className="text-sm ml-1">/mês</span>
                      </div>
                      
                      {/* Características */}
                      <div className="mt-4 text-sm font-medium">
                        <div className="flex items-center justify-center mb-2">
                          <Users className="h-4 w-4 text-blue-500 mr-2" />
                          <p>Autônomos</p>
                        </div>
                        <div className="flex items-center justify-center">
                          <Star className="h-4 w-4 text-blue-500 mr-2" />
                          <p>Iniciantes</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-grow mt-4"></div>
                    
                    <BotaoAutenticacao
                      tipo="cadastro"
                      className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium"
                    >
                      Criar minha conta
                    </BotaoAutenticacao>
                  </div>
                </CardContent>
              </Card>
              
              {/* Plano Profissional (Destaque) */}
              <Card className="overflow-hidden flex flex-col h-full ring-2 ring-purple-600 transition-transform duration-300 hover:scale-105 hover:shadow-xl relative">
                <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold py-1 px-3 transform rotate-0 origin-right z-10 rounded-bl-md shine-effect">
                  MAIS VENDIDO
                </div>
                <CardContent className="p-0 bg-purple-900 flex flex-col flex-grow">
                  <div className="px-4 py-6 text-center text-white flex flex-col h-full">
                    <div>
                      <div className="flex items-center justify-center mb-1">
                        <Rocket className="h-5 w-5 text-purple-500 mr-2" />
                        <h3 className="text-lg font-medium">Profissional</h3>
                      </div>
                      {periodoPlanos === "anual" ? (
                        <p className="text-sm line-through opacity-70 mb-1">R$ 197,90/mês</p>
                      ) : (
                        <p className="text-sm opacity-0 mb-1">_</p>
                      )}
                      <div className="flex items-baseline justify-center">
                        <span className="text-3xl font-bold">R$ {periodoPlanos === "anual" ? "164,92" : "197,90"}</span>
                        <span className="text-sm ml-1">/mês</span>
                      </div>
                      
                      {/* Características */}
                      <div className="mt-4 text-sm font-medium">
                        <div className="flex items-center justify-center mb-2">
                          <Building className="h-4 w-4 text-purple-500 mr-2" />
                          <p>Pequenas Empresas</p>
                        </div>
                        <div className="flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-purple-500 mr-2" />
                          <p>Uso Profissional</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-grow mt-4"></div>
                    
                    <BotaoAutenticacao
                      tipo="cadastro"
                      className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium"
                    >
                      Criar minha conta
                    </BotaoAutenticacao>
                  </div>
                </CardContent>
              </Card>
              
              {/* Plano Empresarial */}
              <Card className="overflow-hidden flex flex-col h-full border border-teal-600 transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                <CardContent className="p-0 bg-teal-50 flex flex-col flex-grow">
                  <div className="px-4 py-6 text-center text-gray-900 flex flex-col h-full">
                    <div>
                      <div className="flex items-center justify-center mb-1">
                        <Building2 className="h-5 w-5 text-teal-600 mr-2" />
                        <h3 className="text-lg font-medium">Empresarial</h3>
                      </div>
                      {periodoPlanos === "anual" ? (
                        <p className="text-sm line-through opacity-70 mb-1">R$ 397,90/mês</p>
                      ) : (
                        <p className="text-sm opacity-0 mb-1">_</p>
                      )}
                      <div className="flex items-baseline justify-center">
                        <span className="text-3xl font-bold">R$ {periodoPlanos === "anual" ? "331,58" : "397,90"}</span>
                        <span className="text-sm ml-1">/mês</span>
                      </div>
                      
                      {/* Características */}
                      <div className="mt-4 text-sm font-medium">
                        <div className="flex items-center justify-center mb-2">
                          <Building2 className="h-4 w-4 text-teal-600 mr-2" />
                          <p>Empresas Médias</p>
                        </div>
                        <div className="flex items-center justify-center">
                          <BarChart2 className="h-4 w-4 text-teal-600 mr-2" />
                          <p>Gestão Empresarial</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-grow mt-4"></div>
                    
                    <BotaoAutenticacao 
                      tipo="cadastro"
                      className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-medium"
                    >
                      Criar minha conta
                    </BotaoAutenticacao>
                  </div>
                </CardContent>
              </Card>
              
              {/* Plano Premium */}
              <Card className="overflow-hidden flex flex-col h-full border border-amber-500 transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                <CardContent className="p-0 bg-amber-50 flex flex-col flex-grow">
                  <div className="px-4 py-6 text-center text-gray-900 flex flex-col h-full">
                    <div>
                      <div className="flex items-center justify-center mb-1">
                        <Crown className="h-5 w-5 text-amber-500 mr-2" />
                        <h3 className="text-lg font-medium">Premium</h3>
                      </div>
                      {periodoPlanos === "anual" ? (
                        <p className="text-sm line-through opacity-70 mb-1">R$ 697,90/mês</p>
                      ) : (
                        <p className="text-sm opacity-0 mb-1">_</p>
                      )}
                      <div className="flex items-baseline justify-center">
                        <span className="text-3xl font-bold">R$ {periodoPlanos === "anual" ? "581,58" : "697,90"}</span>
                        <span className="text-sm ml-1">/mês</span>
                      </div>
                      
                      {/* Características */}
                      <div className="mt-4 text-sm font-medium">
                        <div className="flex items-center justify-center mb-2">
                          <Crown className="h-4 w-4 text-yellow-600 mr-2" />
                          <p>Corporações</p>
                        </div>
                        <div className="flex items-center justify-center">
                          <Crown className="h-4 w-4 text-yellow-600 mr-2" />
                          <p>Escala Premium</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-grow mt-4"></div>
                    
                    <BotaoAutenticacao 
                      tipo="cadastro"
                      className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-medium"
                    >
                      Criar minha conta
                    </BotaoAutenticacao>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Cards de Planos - Mobile */}
            <div className="block md:hidden mb-8">
              {/* Plano Essencial */}
              <div className="mb-6">
                <Card className="overflow-hidden border border-gray-200 shadow-md">
                  <CardContent className="p-0 bg-white">
                    <div className="px-4 py-5 text-center text-gray-900">
                      <div className="flex items-center justify-center mb-1">
                        <Package className="h-5 w-5 text-blue-500 mr-2" />
                        <h3 className="text-lg font-medium">Essencial</h3>
                      </div>
                      {periodoPlanos === "anual" ? (
                        <p className="text-sm line-through opacity-70 mb-1">R$ 87,90/mês</p>
                      ) : (
                        <p className="text-sm opacity-0 mb-1">_</p>
                      )}
                      <div className="flex items-baseline justify-center">
                        <span className="text-3xl font-bold">R$ {periodoPlanos === "anual" ? "73,25" : "87,90"}</span>
                        <span className="text-sm ml-1">/mês</span>
                      </div>
                      
                      <div className="mt-3 text-sm font-medium">
                        <div className="flex items-center justify-center mb-2">
                          <Users className="h-4 w-4 text-blue-500 mr-2" />
                          <p>Autônomos</p>
                        </div>
                        <div className="flex items-center justify-center">
                          <Star className="h-4 w-4 text-blue-500 mr-2" />
                          <p>Iniciantes</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Acordeão do Plano Essencial */}
                <Accordion type="single" collapsible className="w-full mt-2">
                  <AccordionItem value="essencial-details" className="border border-gray-200 rounded-md overflow-hidden">
                    <AccordionTrigger className="p-3 hover:no-underline bg-gray-50 text-sm font-medium text-gray-700">
                      Ver detalhes do plano
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-2 border-t border-gray-200">
                      <ul className="space-y-3 mt-2">
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Dashboard: Básica</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Precificação: Apenas produtos novos</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Precificação unitária sem cadastro: Sim</span>
                        </li>
                        <li className="flex items-center">
                          <X className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Importação (Excel / XML / API): Não</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Cadastro de produtos, serviços e aluguéis: Até 50 itens</span>
                        </li>
                        <li className="flex items-center">
                          <X className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Cadastro de clientes e fornecedores: X</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Relatórios personalizados: Básicos</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Gerenciamento de custos e despesas: <X className="h-4 w-4 text-red-500 inline-block mr-1" /></span>
                        </li>
                        <li className="flex items-center">
                          <X className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Gerenciamento de taxas e promoções: Não</span>
                        </li>
                        <li className="flex items-center">
                          <X className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Gerenciamento de tributações e rateios: Não</span>
                        </li>
                        <li className="flex items-center">
                          <X className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Central de treinamento: Essencial</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Suporte: E-mail</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Usuários permitidos: 1</span>
                        </li>

                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <BotaoAutenticacao
  tipo="cadastro"
  className="w-full mt-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium py-6"
>
  Escolher Plano
</BotaoAutenticacao>

              </div>
              
              {/* Plano Profissional (Destaque) */}
              <div className="mb-6 relative">
                <Card className="overflow-hidden border-2 border-purple-500 shadow-md relative">
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold py-1 px-3 transform rotate-0 origin-right z-10 rounded-bl-md shine-effect">
                    MAIS VENDIDO
                  </div>
                  <CardContent className="p-0 bg-purple-900">
                    <div className="px-4 py-5 text-center text-white">
                      <div className="flex items-center justify-center mb-1">
                        <Rocket className="h-5 w-5 text-purple-500 mr-2" />
                        <h3 className="text-lg font-medium">Profissional</h3>
                      </div>
                      {periodoPlanos === "anual" ? (
                        <p className="text-sm line-through opacity-70 mb-1">R$ 197,90/mês</p>
                      ) : (
                        <p className="text-sm opacity-0 mb-1">_</p>
                      )}
                      <div className="flex items-baseline justify-center">
                        <span className="text-3xl font-bold">R$ {periodoPlanos === "anual" ? "164,92" : "197,90"}</span>
                        <span className="text-sm ml-1">/mês</span>
                      </div>
                      
                      <div className="mt-3 text-sm font-medium">
                        <div className="flex items-center justify-center mb-2">
                          <Building className="h-4 w-4 text-purple-500 mr-2" />
                          <p>Pequenas Empresas</p>
                        </div>
                        <div className="flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-purple-500 mr-2" />
                          <p>Uso Profissional</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Acordeão do Plano Profissional */}
                <Accordion type="single" collapsible className="w-full mt-2" defaultValue="profissional-details">
                  <AccordionItem value="profissional-details" className="border-2 border-purple-500 rounded-md overflow-hidden">
                    <AccordionTrigger className="p-3 hover:no-underline bg-purple-50 text-sm font-medium text-purple-800">
                      Ver detalhes do plano
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-2 border-t border-purple-100">
                      <ul className="space-y-3 mt-2">
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Dashboard: Intermediária</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Precificação: Novos, usados e serviços</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Precificação unitária sem cadastro: Sim</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Importação: Excel</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Cadastro de produtos, serviços e aluguéis: Até 250 itens</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Cadastro de clientes e fornecedores: 250</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Relatórios personalizados: Intermediários</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Gerenciamento de custos e despesas: <Check className="h-4 w-4 text-green-500 inline-block mr-1" /></span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Gerenciamento de taxas e promoções: Sim</span>
                        </li>
                        <li className="flex items-center">
                          <X className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Gerenciamento de tributações e rateios: Não</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Integração com Marketplaces: Sim</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Central de treinamento: Profissional</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Suporte: Chat</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Usuários permitidos: Até 3</span>
                        </li>

                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <BotaoAutenticacao 
                  tipo="cadastro"
                  className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium py-6"
                >
                  Escolher Plano
                </BotaoAutenticacao>
              </div>
              
              {/* Plano Empresarial */}
              <div className="mb-6">
                <Card className="overflow-hidden border border-gray-200 shadow-md">
                  <CardContent className="p-0 bg-white">
                    <div className="px-4 py-5 text-center text-gray-900">
                      <div className="flex items-center justify-center mb-1">
                        <Building2 className="h-5 w-5 text-teal-600 mr-2" />
                        <h3 className="text-lg font-medium">Empresarial</h3>
                      </div>
                      {periodoPlanos === "anual" ? (
                        <p className="text-sm line-through opacity-70 mb-1">R$ 397,90/mês</p>
                      ) : (
                        <p className="text-sm opacity-0 mb-1">_</p>
                      )}
                      <div className="flex items-baseline justify-center">
                        <span className="text-3xl font-bold">R$ {periodoPlanos === "anual" ? "331,58" : "397,90"}</span>
                        <span className="text-sm ml-1">/mês</span>
                      </div>
                      
                      <div className="mt-3 text-sm font-medium">
                        <div className="flex items-center justify-center mb-2">
                          <Building2 className="h-4 w-4 text-teal-600 mr-2" />
                          <p>Empresas Médias</p>
                        </div>
                        <div className="flex items-center justify-center">
                          <BarChart2 className="h-4 w-4 text-teal-600 mr-2" />
                          <p>Gestão Empresarial</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Acordeão do Plano Empresarial */}
                <Accordion type="single" collapsible className="w-full mt-2">
                  <AccordionItem value="empresarial-details" className="border-2 border-teal-600 rounded-md overflow-hidden">
                    <AccordionTrigger className="p-3 hover:no-underline bg-teal-50 text-sm font-medium text-teal-800">
                      Ver detalhes do plano
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-2 border-t border-teal-100">
                      <ul className="space-y-3 mt-2">
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-teal-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Dashboard: Completa</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-teal-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Precificação: Novos, usados, serviços e aluguéis</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-teal-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Precificação unitária sem cadastro: Sim</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-teal-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Importação: Excel + XML</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-teal-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Cadastro de produtos, serviços e aluguéis: Até 500 itens</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-teal-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Cadastro de clientes e fornecedores: 500</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-teal-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Relatórios personalizados: Avançados</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-teal-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Gerenciamento de custos e despesas: <Check className="h-4 w-4 text-green-500 inline-block mr-1" /></span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-teal-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Gerenciamento de taxas e promoções: Sim</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-teal-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Gerenciamento de tributações e rateios: Sim</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-teal-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Central de treinamento: Empresarial</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-teal-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Suporte: Prioritário</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-teal-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Usuários permitidos: Até 5</span>
                        </li>

                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <BotaoAutenticacao 
                  tipo="cadastro"
                  className="w-full mt-3 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-medium py-6"
                >
                  Escolher Plano
                </BotaoAutenticacao>
              </div>
              
              {/* Plano Premium */}
              <div className="mb-6">
                <Card className="overflow-hidden border border-gray-200 shadow-md">
                  <CardContent className="p-0 bg-white">
                    <div className="px-4 py-5 text-center text-gray-900">
                      <div className="flex items-center justify-center mb-1">
                        <Crown className="h-5 w-5 text-yellow-600 mr-2" />
                        <h3 className="text-lg font-medium">Premium</h3>
                      </div>
                      {periodoPlanos === "anual" ? (
                        <p className="text-sm line-through opacity-70 mb-1">R$ 697,90/mês</p>
                      ) : (
                        <p className="text-sm opacity-0 mb-1">_</p>
                      )}
                      <div className="flex items-baseline justify-center">
                        <span className="text-3xl font-bold">R$ {periodoPlanos === "anual" ? "581,58" : "697,90"}</span>
                        <span className="text-sm ml-1">/mês</span>
                      </div>
                      
                      <div className="mt-3 text-sm font-medium">
                        <div className="flex items-center justify-center mb-2">
                          <Crown className="h-4 w-4 text-yellow-600 mr-2" />
                          <p>Corporações</p>
                        </div>
                        <div className="flex items-center justify-center">
                          <Crown className="h-4 w-4 text-yellow-600 mr-2" />
                          <p>Escala Premium</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Acordeão do Plano Premium */}
                <Accordion type="single" collapsible className="w-full mt-2">
                  <AccordionItem value="premium-details" className="border-2 border-yellow-600 rounded-md overflow-hidden">
                    <AccordionTrigger className="p-3 hover:no-underline bg-amber-50 text-sm font-medium text-yellow-800">
                      Ver detalhes do plano
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-2 border-t border-yellow-100">
                      <ul className="space-y-3 mt-2">
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Dashboard: Avançada com filtros</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Precificação: Todos + API</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Precificação unitária sem cadastro: Sim</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Importação: Excel + XML + API</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Cadastro de produtos, serviços e aluguéis: Ilimitado</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Cadastro de clientes e fornecedores: Ilimitado</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Relatórios personalizados: Com exportação</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Gerenciamento de custos e despesas: <Check className="h-4 w-4 text-green-500 inline-block mr-1" /></span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Gerenciamento de taxas e promoções: Sim</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Gerenciamento de tributações e rateios: Sim</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Central de treinamento: Premium</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Suporte: WhatsApp</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">Usuários permitidos: Ilimitado</span>
                        </li>

                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <BotaoAutenticacao 
                  tipo="cadastro"
                  className="w-full mt-3 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-medium py-6"
                >
                  Escolher Plano
                </BotaoAutenticacao>
              </div>
            </div>
            
            {/* Tabela Comparativa - Visível apenas em desktop */}
            <div className="hidden md:block bg-white rounded-lg shadow-lg overflow-hidden mt-8">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-1/5" />
                    <col className="w-1/5 bg-blue-50" />
                    <col className="w-1/5 bg-purple-50" />
                    <col className="w-1/5 bg-teal-50" />
                    <col className="w-1/5 bg-amber-50" />
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="py-4 px-6 text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                        Funcionalidades
                      </th>
                      <th className="text-center py-4 px-2 text-sm font-medium text-white bg-blue-500 border-b border-gray-200">
                        Essencial
                      </th>
                      <th className="text-center py-4 px-2 text-sm font-medium bg-purple-600 text-white border-b border-gray-200">
                        Profissional
                      </th>
                      <th className="text-center py-4 px-2 text-sm font-medium text-white bg-teal-600 border-b border-gray-200">
                        Empresarial
                      </th>
                      <th className="text-center py-4 px-2 text-sm font-medium text-white bg-amber-500 border-b border-gray-200">
                        Premium
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="py-3 px-6 text-sm text-gray-500 border-b border-gray-200">
                        Dashboard
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Básica</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Intermediária</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Completa</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Avançada com filtros</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="py-3 px-6 text-sm text-gray-500 border-b border-gray-200">
                        Precificação
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Apenas produtos novos</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Novos, usados e serviços</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Novos, usados, serviços e aluguéis</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Todos + API</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="py-3 px-6 text-sm text-gray-500 border-b border-gray-200">
                        Precificação unitária sem cadastro
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center">
                          <Check className="h-5 w-5 text-blue-500" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center">
                          <Check className="h-5 w-5 text-blue-500" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center">
                          <Check className="h-5 w-5 text-blue-500" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center">
                          <Check className="h-5 w-5 text-blue-500" />
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="py-3 px-6 text-sm text-gray-500 border-b border-gray-200">
                        Importação (Excel / XML / API)
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center">
                          <X className="h-5 w-5 text-red-500" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Excel</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Excel + XML</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Excel + XML + API</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="py-3 px-6 text-sm text-gray-500 border-b border-gray-200">
                        Cadastro de produtos, serviços e aluguéis
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Até 50 itens</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Até 250 itens</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Até 500 itens</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Ilimitado</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="py-3 px-6 text-sm text-gray-500 border-b border-gray-200">
                        Cadastro de clientes e fornecedores
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center">
                          <X className="h-5 w-5 text-red-500" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Até 250 itens</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Até 500 itens</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Ilimitado</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="py-3 px-6 text-sm text-gray-500 border-b border-gray-200">
                        Relatórios personalizados
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Básicos</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Intermediários</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Avançados</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Com exportação</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="py-3 px-6 text-sm text-gray-500 border-b border-gray-200">
                        Gerenciamento de custos e despesas
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Parcial</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Completo</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Completo</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Completo</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="py-3 px-6 text-sm text-gray-500 border-b border-gray-200">
                        Gerenciamento de taxas e promoções
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center">
                          <X className="h-5 w-5 text-red-500" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center">
                          <Check className="h-5 w-5 text-blue-500" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center">
                          <Check className="h-5 w-5 text-blue-500" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center">
                          <Check className="h-5 w-5 text-blue-500" />
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="py-3 px-6 text-sm text-gray-500 border-b border-gray-200">
                        Gerenciamento de tributações e rateios
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center">
                          <X className="h-5 w-5 text-red-500" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center">
                          <X className="h-5 w-5 text-red-500" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center">
                          <Check className="h-5 w-5 text-blue-500" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center">
                          <Check className="h-5 w-5 text-blue-500" />
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="py-3 px-6 text-sm text-gray-500 border-b border-gray-200">
                        Integração com Marketplaces
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center">
                          <X className="h-5 w-5 text-red-500" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center">
                          <Check className="h-5 w-5 text-blue-500" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center">
                          <Check className="h-5 w-5 text-blue-500" />
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center">
                          <Check className="h-5 w-5 text-blue-500" />
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="py-3 px-6 text-sm text-gray-500 border-b border-gray-200">
                        Central de treinamento
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Essencial</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Profissional</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Empresarial</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Premium</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="py-3 px-6 text-sm text-gray-500 border-b border-gray-200">
                        Suporte
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>E-mail</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Chat</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Prioritário</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>WhatsApp</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="py-3 px-6 text-sm text-gray-500 border-b border-gray-200">
                        Usuários permitidos
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>1</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Até 3</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Até 5</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2 text-sm border-b border-gray-200">
                        <div className="flex justify-center items-center">
                          <span>Ilimitado</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot></tfoot>
                </table>
              </div>
            </div>
            

          </section>
          
          {/* CTA Final */}
          <div className="mt-13 text-center">
            <div className="inline-block bg-gradient-to-r from-purple-100 to-indigo-100 p-1 rounded-full mb-5">
              <div className="bg-white px-8 py-2 rounded-full">
                <span className="text-sm font-medium text-purple-600">Comece em menos de 5 minutos</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Uma solução completa para controlar suas finanças</h3>
            <BotaoAutenticacao 
              tipo="cadastro"
              className="relative overflow-hidden group bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-10 py-5 rounded-lg text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all group-hover:opacity-0"></span>
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 transition-all group-hover:opacity-100"></span>
              <span className="relative z-10 flex items-center">
                Começar Agora
                <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
              </span>
            </BotaoAutenticacao>
          </div>
        </div>
      </section>
      
      {/* Seção de Perguntas Frequentes (FAQ) */}
      <section id="faq" className="py-20 bg-gradient-to-br from-purple-50 to-indigo-50 relative">
        {/* Fundo com padrão de grade sutíl como na seção dos dashboards */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.7))] bg-[length:32px_32px]"></div>
        
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="text-center mb-16">
            <div className="inline-block bg-gradient-to-r from-purple-200 to-indigo-200 p-1 rounded-full mb-4">
              <div className="bg-white px-6 py-1 rounded-full">
                <Button
                  className="text-sm font-medium text-purple-700 bg-transparent hover:bg-transparent p-0"
                  onClick={() => navigate("/suporte")}
                >
                  Suporte
                </Button>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Perguntas Frequentes</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Compartilhamos algumas das perguntas mais frequentes para ajudá-lo.
            </p>
          </div>
          
          {/* Grid de 2 colunas para FAQ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coluna Esquerda */}
            <div className="space-y-6">
              {/* FAQ 1 */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200">
                <div className="flex justify-between items-center cursor-pointer group p-5" 
                   onClick={() => {
                     const el = document.getElementById('faq-1');
                     const icon = document.getElementById('faq-icon-1');
                     if (el) {
                       el.classList.toggle('hidden');
                       if (icon) {
                         if (el.classList.contains('hidden')) {
                           icon.classList.remove('bg-purple-600', 'text-white');
                           icon.classList.add('bg-white', 'border', 'border-gray-200', 'text-purple-600');
                           icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>';
                         } else {
                           icon.classList.remove('bg-white', 'border', 'border-gray-200', 'text-purple-600');
                           icon.classList.add('bg-purple-600', 'text-white');
                           icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M5 12h14"></path></svg>';
                         }
                       }
                     }
                   }}>
                  <h3 className="text-lg font-medium text-purple-900">
                    Porque usar a Meu Preço Certo é importante?
                  </h3>
                  <div id="faq-icon-1" className="flex-shrink-0 flex justify-center items-center w-8 h-8 rounded-full bg-purple-600 text-white">
                    <Minus className="h-5 w-5" />
                  </div>
                </div>
                <div id="faq-1" className="px-5 pb-5 text-gray-700 border-t border-gray-100">
                  <p>Se você não sabe exatamente o quanto ganha, seu negócio vai quebrar. Após um tempo atendendo empresas no setor de suporte a sistemas e equipamentos, percebemos que 90% das empresas quebram, fecham as portas, por não saberem como precificar corretamente os produtos que vendem. Muitas delas apenas giram seu capital e acabam ficando estagnadas, até que um concorrente que saiba fazer a precificação correta tome o lugar da empresa.</p>
                </div>
              </div>
              
              {/* FAQ 3 */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200">
                <div className="flex justify-between items-center cursor-pointer group p-5" 
                   onClick={() => {
                     const el = document.getElementById('faq-3');
                     const icon = document.getElementById('faq-icon-3');
                     if (el) {
                       el.classList.toggle('hidden');
                       if (icon) {
                         if (el.classList.contains('hidden')) {
                           icon.classList.remove('bg-purple-600', 'text-white');
                           icon.classList.add('bg-white', 'border', 'border-gray-200', 'text-purple-600');
                           icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>';
                         } else {
                           icon.classList.remove('bg-white', 'border', 'border-gray-200', 'text-purple-600');
                           icon.classList.add('bg-purple-600', 'text-white');
                           icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M5 12h14"></path></svg>';
                         }
                       }
                     }
                   }}>
                  <h3 className="text-lg font-medium text-purple-900">
                    Como é feita a precificação?
                  </h3>
                  <div id="faq-icon-3" className="flex-shrink-0 flex justify-center items-center w-8 h-8 rounded-full bg-white border border-gray-200 text-purple-600">
                    <Plus className="h-5 w-5" />
                  </div>
                </div>
                <div id="faq-3" className="px-5 pb-5 text-gray-700 border-t border-gray-100 hidden">
                  <p>Nossa plataforma analisa todos os custos envolvidos (matéria-prima, mão de obra, frete, impostos, etc.) e aplica algoritmos que consideram sua margem de lucro desejada para calcular o preço ideal. O sistema automatiza esse processo, considerando inclusive custos operacionais e impostos específicos do seu negócio.</p>
                </div>
              </div>
              
              {/* FAQ 5 */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200">
                <div className="flex justify-between items-center cursor-pointer group p-5" 
                   onClick={() => {
                     const el = document.getElementById('faq-5');
                     const icon = document.getElementById('faq-icon-5');
                     if (el) {
                       el.classList.toggle('hidden');
                       if (icon) {
                         if (el.classList.contains('hidden')) {
                           icon.classList.remove('bg-purple-600', 'text-white');
                           icon.classList.add('bg-white', 'border', 'border-gray-200', 'text-purple-600');
                           icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>';
                         } else {
                           icon.classList.remove('bg-white', 'border', 'border-gray-200', 'text-purple-600');
                           icon.classList.add('bg-purple-600', 'text-white');
                           icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M5 12h14"></path></svg>';
                         }
                       }
                     }
                   }}>
                  <h3 className="text-lg font-medium text-purple-900">
                    Eu consigo saber quanto ganho em 12x no crédito?
                  </h3>
                  <div id="faq-icon-5" className="flex-shrink-0 flex justify-center items-center w-8 h-8 rounded-full bg-white border border-gray-200 text-purple-600">
                    <Plus className="h-5 w-5" />
                  </div>
                </div>
                <div id="faq-5" className="px-5 pb-5 text-gray-700 border-t border-gray-100 hidden">
                  <p>Sim! Nossa plataforma calcula exatamente quanto você ganha em cada modalidade de pagamento, incluindo cartão de crédito parcelado de 1x até 12x. Você verá claramente como as taxas de cada parcela afetam seu lucro final, permitindo definir quais opções de pagamento são mais vantajosas para seu negócio.</p>
                </div>
              </div>
            </div>
            
            {/* Coluna Direita */}
            <div className="space-y-6">
              {/* FAQ 2 */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200">
                <div className="flex justify-between items-center cursor-pointer group p-5" 
                   onClick={() => {
                     const el = document.getElementById('faq-2');
                     const icon = document.getElementById('faq-icon-2');
                     if (el) {
                       el.classList.toggle('hidden');
                       if (icon) {
                         if (el.classList.contains('hidden')) {
                           icon.classList.remove('bg-purple-600', 'text-white');
                           icon.classList.add('bg-white', 'border', 'border-gray-200', 'text-purple-600');
                           icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>';
                         } else {
                           icon.classList.remove('bg-white', 'border', 'border-gray-200', 'text-purple-600');
                           icon.classList.add('bg-purple-600', 'text-white');
                           icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M5 12h14"></path></svg>';
                         }
                       }
                     }
                   }}>
                  <h3 className="text-lg font-medium text-purple-900">
                    É possível calcular comissão de vendedores?
                  </h3>
                  <div id="faq-icon-2" className="flex-shrink-0 flex justify-center items-center w-8 h-8 rounded-full bg-white border border-gray-200 text-purple-600">
                    <Plus className="h-5 w-5" />
                  </div>
                </div>
                <div id="faq-2" className="px-5 pb-5 text-gray-700 border-t border-gray-100 hidden">
                  <p>Sim! Você pode configurar diferentes níveis de comissão para seus vendedores, e o sistema calculará automaticamente o impacto dessas comissões no preço final do produto ou no seu lucro. Também oferecemos relatórios detalhados para acompanhar o desempenho de vendas e comissões pagas.</p>
                </div>
              </div>
              
              {/* FAQ 4 */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200">
                <div className="flex justify-between items-center cursor-pointer group p-5" 
                   onClick={() => {
                     const el = document.getElementById('faq-4');
                     const icon = document.getElementById('faq-icon-4');
                     if (el) {
                       el.classList.toggle('hidden');
                       if (icon) {
                         if (el.classList.contains('hidden')) {
                           icon.classList.remove('bg-purple-600', 'text-white');
                           icon.classList.add('bg-white', 'border', 'border-gray-200', 'text-purple-600');
                           icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>';
                         } else {
                           icon.classList.remove('bg-white', 'border', 'border-gray-200', 'text-purple-600');
                           icon.classList.add('bg-purple-600', 'text-white');
                           icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M5 12h14"></path></svg>';
                         }
                       }
                     }
                   }}>
                  <h3 className="text-lg font-medium text-purple-900">
                    Consigo configurar minhas tributações e taxas?
                  </h3>
                  <div id="faq-icon-4" className="flex-shrink-0 flex justify-center items-center w-8 h-8 rounded-full bg-white border border-gray-200 text-purple-600">
                    <Plus className="h-5 w-5" />
                  </div>
                </div>
                <div id="faq-4" className="px-5 pb-5 text-gray-700 border-t border-gray-100 hidden">
                  <p>Sim, nossa plataforma permite configurar todas as suas tributações específicas, incluindo diferentes regimes tributários (Simples Nacional, Lucro Presumido, Lucro Real), além de taxas de cartão, marketplace e outros custos operacionais. O sistema se adapta completamente à realidade fiscal do seu negócio.</p>
                </div>
              </div>
              
              {/* FAQ 6 */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200">
                <div className="flex justify-between items-center cursor-pointer group p-5" 
                   onClick={() => {
                     const el = document.getElementById('faq-6');
                     const icon = document.getElementById('faq-icon-6');
                     if (el) {
                       el.classList.toggle('hidden');
                       if (icon) {
                         if (el.classList.contains('hidden')) {
                           icon.classList.remove('bg-purple-600', 'text-white');
                           icon.classList.add('bg-white', 'border', 'border-gray-200', 'text-purple-600');
                           icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>';
                         } else {
                           icon.classList.remove('bg-white', 'border', 'border-gray-200', 'text-purple-600');
                           icon.classList.add('bg-purple-600', 'text-white');
                           icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M5 12h14"></path></svg>';
                         }
                       }
                     }
                   }}>
                  <h3 className="text-lg font-medium text-purple-900">
                    Como vou saber se estou precificando corretamente?
                  </h3>
                  <div id="faq-icon-6" className="flex-shrink-0 flex justify-center items-center w-8 h-8 rounded-full bg-purple-600 text-white">
                    <Minus className="h-5 w-5" />
                  </div>
                </div>
                <div id="faq-6" className="px-5 pb-5 text-gray-700 border-t border-gray-100">
                  <p>Na Meu Preço Certo você verá de forma fácil o valor necessário que deve colocar. Utilizando nosso sistema de gerenciamento de preços, você preencherá algumas informações e seu preço será calculado com base em suas tributações e outras taxas inseridas. Com uma interface fácil de usar, você informará o valor do custo do produto, clicará em calcular, e o sistema indicará precisamente o valor correto com base na margem de lucro desejada.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-14 text-center">
            <div className="max-w-3xl mx-auto mb-8">
              <h3 className="text-2xl font-bold text-purple-900 mb-2">
                Não perca mais tempo e dinheiro
              </h3>
              <p className="text-lg font-medium text-gray-700">
                com precificações incorretas.<br /> 
                <span className="text-purple-600 font-semibold">Comece a lucrar mais hoje mesmo!</span>
              </p>
            </div>
            <BotaoAutenticacao 
              tipo="cadastro"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-4 rounded-lg shadow-lg text-lg font-medium"
            >
              Comece a lucrar agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </BotaoAutenticacao>
            <p className="text-sm text-gray-500 mt-4">
              Planos a partir de R$ 73,25/mês. 7 dias de garantia.
            </p>
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="bg-gradient-to-br from-purple-900 to-indigo-900 text-white pt-16 pb-6">
        <div className="container mx-auto px-4">
          {/* Layout do rodapé principal */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* Coluna 1 - Sobre - Sempre fica em toda a largura no mobile */}
            <div className="col-span-1 md:col-span-1 mb-8 md:mb-0">
              <div className="mb-6">
                <img 
                  src={negativeLogoPath}
                  alt="Meu Preço Certo" 
                  className="h-12 w-auto mb-4"
                />
              </div>
              <p className="text-gray-200 mb-6">
                Software inteligente para precificação de produtos, serviços e aluguéis. 
                Maximize seus lucros com análises estratégicas e decisões embasadas 
                para todas as suas operações.
              </p>
              <div className="flex space-x-5">
                <a href="#" className="text-purple-300 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd"></path>
                  </svg>
                </a>
                <a href="#" className="text-purple-300 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd"></path>
                  </svg>
                </a>
                <a href="#" className="text-purple-300 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                  </svg>
                </a>
                <a href="#" className="text-purple-300 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path>
                  </svg>
                </a>
                <a href="#" className="text-purple-300 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Container para Links Rápidos e Soluções - 2 cols no mobile, 2 cols no desktop */}
            <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-6 md:gap-8">
              {/* Coluna 2 - Links Rápidos */}
              <div>
                <h4 className="text-xl font-bold mb-6 text-white">Links Rápidos</h4>
                <ul className="space-y-3">
                  <li>
                    <a 
                      href="#calculadora" 
                      onClick={(e) => {
                        e.preventDefault();
                        const element = document.getElementById('calculadora');
                        if (element) {
                          const yOffset = -100;
                          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
                          window.scrollTo({top: y, behavior: 'smooth'});
                        }
                      }}
                      className="text-purple-200 hover:text-white transition-colors flex items-center"
                    >
                      <span className="bg-purple-500 rounded-full w-1.5 h-1.5 mr-2"></span>
                      Calculadora
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#prejuizo" 
                      onClick={(e) => {
                        e.preventDefault();
                        const element = document.getElementById('prejuizo');
                        if (element) {
                          const yOffset = -100;
                          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
                          window.scrollTo({top: y, behavior: 'smooth'});
                        }
                      }}
                      className="text-purple-200 hover:text-white transition-colors flex items-center"
                    >
                      <span className="bg-purple-500 rounded-full w-1.5 h-1.5 mr-2"></span>
                      Funcionalidades
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#planos" 
                      onClick={(e) => {
                        e.preventDefault();
                        const element = document.getElementById('planos');
                        if (element) {
                          const yOffset = -100;
                          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
                          window.scrollTo({top: y, behavior: 'smooth'});
                        }
                      }}
                      className="text-purple-200 hover:text-white transition-colors flex items-center"
                    >
                      <span className="bg-purple-500 rounded-full w-1.5 h-1.5 mr-2"></span>
                      Planos
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#depoimentos" 
                      onClick={(e) => {
                        e.preventDefault();
                        const element = document.getElementById('depoimentos');
                        if (element) {
                          const yOffset = -100;
                          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
                          window.scrollTo({top: y, behavior: 'smooth'});
                        }
                      }}
                      className="text-purple-200 hover:text-white transition-colors flex items-center"
                    >
                      <span className="bg-purple-500 rounded-full w-1.5 h-1.5 mr-2"></span>
                      Depoimentos
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#faq" 
                      onClick={(e) => {
                        e.preventDefault();
                        const element = document.getElementById('faq');
                        if (element) {
                          const yOffset = -100;
                          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
                          window.scrollTo({top: y, behavior: 'smooth'});
                        }
                      }}
                      className="text-purple-200 hover:text-white transition-colors flex items-center"
                    >
                      <span className="bg-purple-500 rounded-full w-1.5 h-1.5 mr-2"></span>
                      FAQ
                    </a>
                  </li>
                </ul>
              </div>
              
              {/* Coluna 3 - Soluções */}
              <div>
                <h4 className="text-xl font-bold mb-6 text-white">Soluções</h4>
                <ul className="space-y-3">
                  <li>
                    <a 
                      href="#prejuizo" 
                      onClick={(e) => {
                        e.preventDefault();
                        const element = document.getElementById('prejuizo');
                        if (element) {
                          const yOffset = -100;
                          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
                          window.scrollTo({top: y, behavior: 'smooth'});
                        }
                      }}
                      className="text-purple-200 hover:text-white transition-colors flex items-center"
                    >
                      <span className="bg-purple-500 rounded-full w-1.5 h-1.5 mr-2"></span>
                      Dashboards
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#prejuizo" 
                      onClick={(e) => {
                        e.preventDefault();
                        const element = document.getElementById('prejuizo');
                        if (element) {
                          const yOffset = -100;
                          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
                          window.scrollTo({top: y, behavior: 'smooth'});
                        }
                      }}
                      className="text-purple-200 hover:text-white transition-colors flex items-center"
                    >
                      <span className="bg-purple-500 rounded-full w-1.5 h-1.5 mr-2"></span>
                      Precificação
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#prejuizo" 
                      onClick={(e) => {
                        e.preventDefault();
                        const element = document.getElementById('prejuizo');
                        if (element) {
                          const yOffset = -100;
                          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
                          window.scrollTo({top: y, behavior: 'smooth'});
                        }
                      }}
                      className="text-purple-200 hover:text-white transition-colors flex items-center"
                    >
                      <span className="bg-purple-500 rounded-full w-1.5 h-1.5 mr-2"></span>
                      Vendas e Aluguéis
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#prejuizo" 
                      onClick={(e) => {
                        e.preventDefault();
                        const element = document.getElementById('prejuizo');
                        if (element) {
                          const yOffset = -100;
                          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
                          window.scrollTo({top: y, behavior: 'smooth'});
                        }
                      }}
                      className="text-purple-200 hover:text-white transition-colors flex items-center"
                    >
                      <span className="bg-purple-500 rounded-full w-1.5 h-1.5 mr-2"></span>
                      Cálculo Recursivo
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#prejuizo" 
                      onClick={(e) => {
                        e.preventDefault();
                        const element = document.getElementById('prejuizo');
                        if (element) {
                          const yOffset = -100;
                          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
                          window.scrollTo({top: y, behavior: 'smooth'});
                        }
                      }}
                      className="text-purple-200 hover:text-white transition-colors flex items-center"
                    >
                      <span className="bg-purple-500 rounded-full w-1.5 h-1.5 mr-2"></span>
                      Relatórios
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Coluna 4 - Contato */}
            <div className="col-span-1 md:col-span-1">
              <h4 className="text-xl font-bold mb-6 text-white">Contato</h4>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Mail className="w-5 h-5 text-purple-300 mr-3 mt-0.5" />
                  <span className="text-purple-100">contato@meuprecocerto.com.br</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-purple-300 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-purple-100">Av. dos Búzios, 1400 - Jurerê Internacional<br/>Florianópolis - SC, 88053-300</span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Linha Divisória */}
          <div className="border-t border-purple-700/50 pt-8 mt-8">
            <div className="flex flex-col md:flex-row md:justify-between items-center">
              <p className="text-sm text-purple-200">
                &copy; {new Date().getFullYear()} Meu Preço Certo. Todos os direitos reservados.
              </p>
              <div className="mt-6 md:mt-0 flex space-x-8">
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTermosModal(true);
                  }}
                  className="text-sm text-purple-200 hover:text-white transition-colors"
                >
                  Termos de Uso
                </a>
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPrivacidadeModal(true);
                  }}
                  className="text-sm text-purple-200 hover:text-white transition-colors"
                >
                  Política de Privacidade
                </a>
                <a href="#" className="text-sm text-purple-200 hover:text-white transition-colors">
                  Cookies
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Os estilos foram movidos para o arquivo index.css */}
      
      {/* Componente Toaster para exibir notificações */}
      <Toaster />
      
      {/* Modal de Termos de Uso */}
      <Dialog open={showTermosModal} onOpenChange={setShowTermosModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl font-semibold text-gray-900">
              <FileText className="mr-2 text-purple-600" size={22} />
              Termos de Uso
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Leia com atenção os termos de uso da plataforma Meu Preço Certo
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4 text-gray-700">
            <h3 className="text-lg font-semibold text-gray-900">1. Aceitação dos Termos</h3>
            <p>
              Ao acessar e utilizar a plataforma Meu Preço Certo, você concorda em cumprir e ficar vinculado aos presentes Termos 
              de Uso. Se você não concordar com algum dos termos, não utilize nossos serviços.
            </p>
            
            <h3 className="text-lg font-semibold text-gray-900">2. Descrição do Serviço</h3>
            <p>
              O Meu Preço Certo é uma plataforma online que fornece ferramentas para cálculo de preços de produtos e serviços, 
              auxílio na precificação, e gestão de custos para pequenos e médios empreendedores.
            </p>
            
            <h3 className="text-lg font-semibold text-gray-900">3. Cadastro e Conta</h3>
            <p>
              3.1. Para acessar todas as funcionalidades da plataforma, é necessário criar uma conta fornecendo informações precisas e atualizadas.<br />
              3.2. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades realizadas com sua conta.<br />
              3.3. Você concorda em notificar imediatamente qualquer uso não autorizado de sua conta.
            </p>
            
            <h3 className="text-lg font-semibold text-gray-900">4. Uso da Plataforma</h3>
            <p>
              4.1. Você concorda em não usar a plataforma para fins ilegais ou não autorizados.<br />
              4.2. Você não pode tentar obter acesso não autorizado a outros sistemas ou redes conectados à plataforma.<br />
              4.3. A plataforma é para uso pessoal ou empresarial, conforme o plano contratado.
            </p>
            
            <h3 className="text-lg font-semibold text-gray-900">5. Propriedade Intelectual</h3>
            <p>
              5.1. Todo o conteúdo disponibilizado na plataforma, como textos, gráficos, logotipos, imagens, bem como a compilação de todo o conteúdo, 
              são propriedade do Meu Preço Certo ou de seus fornecedores de conteúdo e protegidos por leis de direitos autorais.<br />
              5.2. Você não está autorizado a modificar, reproduzir, publicar, licenciar, criar trabalhos derivados ou vender qualquer informação obtida a partir da plataforma.
            </p>
            
            <h3 className="text-lg font-semibold text-gray-900">6. Limitação de Responsabilidade</h3>
            <p>
              6.1. A plataforma é fornecida "como está" e "conforme disponível", sem garantias de qualquer tipo.<br />
              6.2. Em nenhuma circunstância, o Meu Preço Certo será responsável por danos diretos, indiretos, incidentais, especiais ou consequentes resultantes do uso da plataforma.
            </p>
            
            <h3 className="text-lg font-semibold text-gray-900">7. Alterações nos Termos</h3>
            <p>
              Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entrarão em vigor após a publicação dos termos atualizados na plataforma. 
              O uso contínuo da plataforma após tais alterações constitui sua aceitação dos novos termos.
            </p>
            
            <h3 className="text-lg font-semibold text-gray-900">8. Rescisão</h3>
            <p>
              Podemos encerrar ou suspender o acesso à nossa plataforma imediatamente, sem aviso prévio, por qualquer motivo, incluindo, sem limitação, 
              se você violar os Termos de Uso.
            </p>
            
            <p className="text-sm text-gray-500 mt-6">
              Última atualização: 2 de maio de 2025
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => {
                setShowTermosModal(false);
                setConcordaTermos(true);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Entendi e Concordo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Política de Privacidade */}
      <Dialog open={showPrivacidadeModal} onOpenChange={setShowPrivacidadeModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl font-semibold text-gray-900">
              <Shield className="mr-2 text-purple-600" size={22} />
              Política de Privacidade
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Como utilizamos e protegemos seus dados
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4 text-gray-700">
            <h3 className="text-lg font-semibold text-gray-900">1. Informações Coletadas</h3>
            <p>
              1.1. <strong>Informações de cadastro:</strong> ao criar uma conta, coletamos seu nome, e-mail e telefone para identificação e contato.<br />
              1.2. <strong>Dados de uso:</strong> coletamos informações sobre como você utiliza nossa plataforma, incluindo produtos cadastrados, 
              cálculos realizados e configurações de preferência.<br />
              1.3. <strong>Informações financeiras:</strong> para fins de precificação, você pode inserir dados como custos de produtos, serviços 
              e outras informações financeiras relevantes.
            </p>
            
            <h3 className="text-lg font-semibold text-gray-900">2. Uso das Informações</h3>
            <p>
              2.1. Utilizamos suas informações para:<br />
              - Fornecer, manter e melhorar nossos serviços<br />
              - Personalizar sua experiência na plataforma<br />
              - Processar transações e enviar notificações relacionadas<br />
              - Responder a suas solicitações e fornecer suporte<br />
              - Enviar atualizações, alertas e informativos (com sua permissão)
            </p>
            
            <h3 className="text-lg font-semibold text-gray-900">3. Compartilhamento de Informações</h3>
            <p>
              3.1. Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para fins de marketing.<br />
              3.2. Podemos compartilhar informações nas seguintes circunstâncias:<br />
              - Com provedores de serviços que trabalham em nosso nome<br />
              - Para cumprir obrigações legais<br />
              - Para proteger e defender nossos direitos e propriedade<br />
              - Com sua permissão ou conforme indicado no momento da coleta
            </p>
            
            <h3 className="text-lg font-semibold text-gray-900">4. Segurança das Informações</h3>
            <p>
              4.1. Implementamos medidas técnicas e organizacionais adequadas para proteger suas informações pessoais contra acesso não autorizado, 
              uso indevido, divulgação, alteração e destruição.<br />
              4.2. Criptografamos dados sensíveis e mantemos regularmente atualizadas nossas práticas de segurança.
            </p>
            
            <h3 className="text-lg font-semibold text-gray-900">5. Seus Direitos</h3>
            <p>
              5.1. Você tem o direito de:<br />
              - Acessar, corrigir ou excluir seus dados pessoais<br />
              - Restringir ou opor-se a certos processamentos de seus dados<br />
              - Solicitar a portabilidade de seus dados<br />
              - Retirar seu consentimento a qualquer momento
            </p>
            
            <h3 className="text-lg font-semibold text-gray-900">6. Política de Cookies</h3>
            <p>
              6.1. Utilizamos cookies e tecnologias semelhantes para melhorar sua experiência, personalizar conteúdo e anúncios, 
              e analisar como nossos sites são utilizados.<br />
              6.2. Você pode configurar seu navegador para recusar todos ou alguns cookies do navegador, ou para alertá-lo quando os sites definem ou acessam cookies.
            </p>
            
            <h3 className="text-lg font-semibold text-gray-900">7. Alterações na Política de Privacidade</h3>
            <p>
              7.1. Podemos atualizar esta política periodicamente publicando uma nova versão em nosso site.<br />
              7.2. Recomendamos que você verifique esta página ocasionalmente para garantir que está satisfeito com quaisquer alterações.
            </p>
            
            <p className="text-sm text-gray-500 mt-6">
              Última atualização: 2 de maio de 2025
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => {
                setShowPrivacidadeModal(false);
                setConcordaTermos(true);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Entendi e Concordo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}