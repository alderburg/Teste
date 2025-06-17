import React, { useState, useRef, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Progress 
} from "@/components/ui/progress";
import { 
  Badge 
} from "@/components/ui/badge";
import { 
  Button 
} from "@/components/ui/button";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  PlayCircle,
  BookOpen,
  Award,
  Clock,
  Sparkles,
  Star,
  Video,
  FileText,
  CheckCheck,
  BookMarked,
  GraduationCap,
  Medal,
  Trophy,
  ChevronsRight,
  Wrench,
  Calculator,
  Users,
  UserPlus,
  BarChart3,
  Smile,
  Paperclip,
  Send,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import EmojiPicker from 'emoji-picker-react';
import { CommentItem } from "@/components/treinamentos/comment-item";

// Define training module types
type Module = {
  id: string;
  title: string;
  description: string;
  duration: string;
  type: "video";
  level: "iniciante" | "intermediário" | "avançado";
  category: string;
  completed: boolean;
  videoUrl: string;
};

type TrainingCategory = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  modules: Module[];
};

// Tipo para os comentários
type Reply = {
  id: string;
  commentId: string;
  userName: string;
  text: string;
  createdAt: string;
  isAdmin: boolean;
  imageUrl?: string; // Adicionando campo opcional para URL da imagem
};

type Comment = {
  id: string;
  moduleId: string;
  userName: string;
  text: string;
  createdAt: string;
  type: 'question' | 'feedback' | 'suggestion';
  imageUrl?: string; // URL da imagem (opcional)
  replies: Reply[];
};

export default function TreinamentosPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("todos");
  const [openTutorial, setOpenTutorial] = useState<Module | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Estados para o sistema de comentários
  // Comentários por módulo (cada módulo tem seus próprios comentários)
  const [moduleComments, setModuleComments] = useState<{[moduleId: string]: Comment[]}>({
    "dashboard-intro": [
      {
        id: "1",
        moduleId: "dashboard-intro",
        userName: "João Silva",
        text: "Esse vídeo foi muito útil para entender os indicadores!",
        createdAt: "2023-10-10T10:30:00Z",
        type: "feedback",
        replies: [
          {
            id: "101",
            commentId: "1",
            userName: "Admin",
            text: "Obrigado pelo feedback positivo, João! Fico feliz que o conteúdo tenha sido útil.",
            createdAt: "2023-10-10T11:15:00Z",
            isAdmin: true
          }
        ]
      }
    ],
    "dashboard-filtros": [
      {
        id: "2",
        moduleId: "dashboard-filtros",
        userName: "Maria Oliveira",
        text: "Como faço para aplicar filtros em múltiplos gráficos ao mesmo tempo?",
        createdAt: "2023-10-11T09:45:00Z",
        type: "question",
        replies: [
          {
            id: "201",
            commentId: "2",
            userName: "Admin",
            text: "Olá Maria, para aplicar filtros em múltiplos gráficos, use a opção 'Aplicar a todos' no painel lateral. Também temos um tutorial específico sobre isso no módulo avançado.",
            createdAt: "2023-10-11T10:20:00Z",
            isAdmin: true
          }
        ]
      }
    ],
    "dashboard-relatorios": [
      {
        id: "3",
        moduleId: "dashboard-relatorios",
        userName: "Carlos Mendes",
        text: "Consegui gerar um relatório completo seguindo estas instruções. Muito bom!",
        createdAt: "2023-10-12T14:30:00Z",
        type: "feedback",
        replies: []
      }
    ],
    "financeiro-intro": [
      {
        id: "4",
        moduleId: "financeiro-intro",
        userName: "Ana Costa",
        text: "Este vídeo me ajudou a organizar melhor o fluxo de caixa da minha empresa.",
        createdAt: "2023-10-13T11:20:00Z",
        type: "feedback",
        replies: []
      }
    ]
  });
  
  // Comentários do módulo atual
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentType, setCommentType] = useState<'question' | 'feedback' | 'suggestion'>('feedback');
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Estado para controle de navegação entre vídeos
  const [currentModuleIndex, setCurrentModuleIndex] = useState<number>(0);

  // Função para adicionar novo comentário
  const addComment = () => {
    if (!commentText.trim() || !openTutorial) return;

    setIsSubmittingComment(true);

    // Simula uma chamada de API
    setTimeout(() => {
      const newComment: Comment = {
        id: Math.random().toString(36).substr(2, 9),
        moduleId: openTutorial.id,
        userName: user?.username || 'Usuário',
        text: commentText,
        createdAt: new Date().toISOString(),
        type: commentType,
        // Adiciona a imagem, se houver
        imageUrl: previewUrl || undefined,
        replies: []
      };

      // Atualiza os comentários do módulo atual
      setComments(prev => [newComment, ...prev]);
      
      // Atualiza também o estado global dos comentários por módulo
      setModuleComments(prev => {
        const currentModuleId = openTutorial.id;
        return {
          ...prev,
          [currentModuleId]: [newComment, ...(prev[currentModuleId] || [])]
        };
      });
      
      setCommentText('');
      setIsSubmittingComment(false);
      // Limpa a imagem após o envio
      setSelectedImage(null);
      setPreviewUrl(null);
    }, 500);
  };

  // Mock data for training categories and modules
  const trainingCategories: TrainingCategory[] = [
    {
      id: "dashboard",
      name: "Dashboard",
      description: "Aprenda a utilizar e interpretar os dados do Dashboard para tomar decisões estratégicas.",
      icon: <GraduationCap className="h-8 w-8 text-blue-500" />,
      modules: [
        {
          id: "dashboard-intro",
          title: "Introdução ao Dashboard",
          description: "Visão geral dos principais indicadores e como interpretá-los.",
          duration: "10 min",
          type: "video",
          level: "iniciante",
          category: "dashboard",
          completed: true,
          videoUrl: "https://www.youtube.com/watch?v=v7iHTjVV1r0"
        },
        {
          id: "dashboard-filtros",
          title: "Utilizando filtros e segmentações",
          description: "Aprenda a filtrar e segmentar dados para análises mais precisas.",
          duration: "12 min",
          type: "video",
          level: "intermediário",
          category: "dashboard",
          completed: false,
          videoUrl: "https://www.youtube.com/watch?v=v7iHTjVV1r0"
        },
        {
          id: "dashboard-relatorios",
          title: "Gerando relatórios personalizados",
          description: "Como criar e exportar relatórios com os dados que você precisa.",
          duration: "15 min",
          type: "video",
          level: "avançado",
          category: "dashboard",
          completed: false,
          videoUrl: "https://www.youtube.com/watch?v=Vcxhe42DSTU&t=3910s"
        }
      ]
    },
    {
      id: "faturamento",
      name: "Faturamento",
      description: "Aprenda a gerenciar faturas, notas fiscais e controle financeiro do seu negócio.",
      icon: <FileText className="h-8 w-8 text-green-500" />,
      modules: [
        {
          id: "faturamento-basico",
          title: "Emissão de notas fiscais",
          description: "Como emitir notas fiscais e gerenciar o faturamento básico.",
          duration: "20 min",
          type: "video",
          level: "iniciante",
          category: "faturamento",
          completed: true,
          videoUrl: "https://www.youtube.com/watch?v=v7iHTjVV1r0"
        },
        {
          id: "faturamento-relatorios",
          title: "Relatórios de faturamento",
          description: "Como gerar e interpretar relatórios de faturamento por período.",
          duration: "15 min",
          type: "video",
          level: "intermediário",
          category: "faturamento",
          completed: true,
          videoUrl: "https://www.youtube.com/watch?v=Vcxhe42DSTU&t=3910s"
        },
        {
          id: "faturamento-impostos",
          title: "Gestão de impostos e obrigações fiscais",
          description: "Entenda como o sistema ajuda a gerenciar impostos e obrigações fiscais.",
          duration: "25 min",
          type: "video",
          level: "avançado",
          category: "faturamento",
          completed: false,
          videoUrl: "https://example.com/videos/tax-management"
        }
      ]
    },
    {
      id: "produtos",
      name: "Produtos",
      description: "Aprenda a gerenciar seu catálogo de produtos, estoque e precificação.",
      icon: <BookMarked className="h-8 w-8 text-amber-500" />,
      modules: [
        {
          id: "produtos-cadastro",
          title: "Cadastro de produtos",
          description: "Como cadastrar produtos, categorias e informações essenciais.",
          duration: "15 min",
          type: "video",
          level: "iniciante",
          category: "produtos",
          completed: true,
          videoUrl: "https://example.com/videos/product-registration"
        },
        {
          id: "produtos-estoque",
          title: "Gerenciamento de estoque",
          description: "Como controlar entradas, saídas e acompanhar níveis de estoque.",
          duration: "18 min",
          type: "video",
          level: "intermediário",
          category: "produtos",
          completed: false,
          videoUrl: "https://example.com/videos/inventory-management"
        },
        {
          id: "produtos-precificacao",
          title: "Estratégias de precificação",
          description: "Como definir preços, descontos e promoções de forma estratégica.",
          duration: "20 min",
          type: "video",
          level: "avançado",
          category: "produtos",
          completed: false,
          videoUrl: "https://example.com/videos/pricing-strategies"
        }
      ]
    },
    {
      id: "servicos",
      name: "Serviços",
      description: "Aprenda a cadastrar e gerenciar serviços, agendamentos e ordens de serviço.",
      icon: <Wrench className="h-8 w-8 text-purple-500" />,
      modules: [
        {
          id: "servicos-cadastro",
          title: "Cadastro de serviços",
          description: "Como cadastrar serviços e definir parâmetros de cobrança.",
          duration: "12 min",
          type: "video",
          level: "iniciante",
          category: "servicos",
          completed: false,
          videoUrl: "https://example.com/videos/service-registration"
        },
        {
          id: "servicos-agendamento",
          title: "Sistema de agendamento",
          description: "Como gerenciar agendas, horários e disponibilidade.",
          duration: "18 min",
          type: "video",
          level: "intermediário",
          category: "servicos",
          completed: false,
          videoUrl: "https://example.com/videos/scheduling-system"
        }
      ]
    },
    {
      id: "custos",
      name: "Custos",
      description: "Aprenda a registrar, categorizar e analisar os custos do seu negócio.",
      icon: <Calculator className="h-8 w-8 text-red-500" />,
      modules: [
        {
          id: "custos-fixos-variaveis",
          title: "Custos fixos e variáveis",
          description: "Como diferenciar, cadastrar e analisar custos fixos e variáveis.",
          duration: "15 min",
          type: "video",
          level: "iniciante",
          category: "custos",
          completed: false,
          videoUrl: "https://example.com/videos/fixed-variable-costs"
        },
        {
          id: "custos-analise",
          title: "Análise de rentabilidade",
          description: "Como utilizar os dados de custos para analisar rentabilidade.",
          duration: "22 min",
          type: "video",
          level: "avançado",
          category: "custos",
          completed: false,
          videoUrl: "https://example.com/videos/profitability-analysis"
        }
      ]
    },
    {
      id: "clientes",
      name: "Clientes",
      description: "Aprenda a gerenciar seu cadastro de clientes e histórico de relacionamento.",
      icon: <Users className="h-8 w-8 text-indigo-500" />,
      modules: [
        {
          id: "clientes-cadastro",
          title: "Cadastro de clientes",
          description: "Como cadastrar clientes e manter informações atualizadas.",
          duration: "10 min",
          type: "video",
          level: "iniciante",
          category: "clientes",
          completed: true,
          videoUrl: "https://example.com/videos/customer-registration"
        },
        {
          id: "clientes-historico",
          title: "Histórico de clientes",
          description: "Como acessar e utilizar o histórico de transações e interações.",
          duration: "12 min",
          type: "video",
          level: "intermediário",
          category: "clientes",
          completed: false,
          videoUrl: "https://example.com/videos/customer-history"
        }
      ]
    },
    {
      id: "fornecedores",
      name: "Fornecedores",
      description: "Aprenda a cadastrar e gerenciar fornecedores e compras.",
      icon: <UserPlus className="h-8 w-8 text-orange-500" />,
      modules: [
        {
          id: "fornecedores-cadastro",
          title: "Cadastro de fornecedores",
          description: "Como cadastrar e gerenciar informações de fornecedores.",
          duration: "10 min",
          type: "video",
          level: "iniciante",
          category: "fornecedores",
          completed: false,
          videoUrl: "https://example.com/videos/supplier-registration"
        },
        {
          id: "fornecedores-cotacao",
          title: "Sistema de cotação",
          description: "Como criar e gerenciar cotações com múltiplos fornecedores.",
          duration: "18 min",
          type: "video",
          level: "intermediário",
          category: "fornecedores",
          completed: false,
          videoUrl: "https://example.com/videos/quotation-system"
        }
      ]
    },
    {
      id: "relatorios",
      name: "Relatórios",
      description: "Aprenda a gerar e interpretar relatórios gerenciais e financeiros.",
      icon: <BarChart3 className="h-8 w-8 text-cyan-500" />,
      modules: [
        {
          id: "relatorios-gerenciais",
          title: "Relatórios gerenciais",
          description: "Como gerar e interpretar relatórios gerenciais multi-período.",
          duration: "20 min",
          type: "video",
          level: "intermediário",
          category: "relatorios",
          completed: false,
          videoUrl: "https://example.com/videos/management-reports"
        },
        {
          id: "relatorios-exportacao",
          title: "Exportação de dados",
          description: "Como exportar relatórios para Excel, PDF e outros formatos.",
          duration: "10 min",
          type: "video",
          level: "iniciante",
          category: "relatorios",
          completed: false,
          videoUrl: "https://example.com/videos/data-export"
        }
      ]
    }
  ];

  // Helper function para mostrar o ícone de vídeo
  const getModuleIcon = () => {
    return <Video className="h-5 w-5 text-blue-500" />;
  };

  // Calculate progress stats
  const allModules = trainingCategories.flatMap(cat => cat.modules);
  const completedModules = allModules.filter(module => module.completed);
  const totalProgress = Math.round((completedModules.length / allModules.length) * 100);

  // Filter modules based on active tab
  const getFilteredModules = () => {
    let filteredModules = allModules;

    if (activeTab === "completos") {
      filteredModules = allModules.filter(module => module.completed);
    } else if (activeTab === "pendentes") {
      filteredModules = allModules.filter(module => !module.completed);
    } else if (activeTab === "categoria" && selectedCategory) {
      filteredModules = allModules.filter(module => module.category === selectedCategory);
    }

    // Apply search filter if query exists
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredModules = filteredModules.filter(module => 
        module.title.toLowerCase().includes(query) || 
        module.description.toLowerCase().includes(query)
      );
    }

    return filteredModules;
  };

  const getModuleLevelBadge = (level: string) => {
    switch (level) {
      case "iniciante":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Iniciante</Badge>;
      case "intermediário":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Intermediário</Badge>;
      case "avançado":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Avançado</Badge>;
      default:
        return <Badge variant="outline">Sem nível</Badge>;
    }
  };

  // Open tutorial dialog for a specific module
  const openTutorialDialog = (module: Module) => {
    setOpenTutorial(module);
    
    // Encontrar o índice do módulo atual na lista completa de módulos
    const allModulesList = allModules;
    const moduleIndex = allModulesList.findIndex(m => m.id === module.id);
    setCurrentModuleIndex(moduleIndex >= 0 ? moduleIndex : 0);

    // Carrega os comentários específicos deste módulo do estado global
    const specificComments = moduleComments[module.id] || [];
    setComments(specificComments);
    setCommentText('');
  };

  // Função para enviar um novo comentário
  const submitComment = () => {
    if (!openTutorial || !commentText.trim()) return;

    const newComment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      moduleId: openTutorial.id,
      userName: user?.name || 'Usuário',
      text: commentText,
      createdAt: new Date().toISOString(),
      type: commentType
    };

    setComments(prev => [newComment, ...prev]);
    setCommentText('');
  };

  // Get category by ID
  const getCategoryByName = (id: string) => {
    return trainingCategories.find(cat => cat.id === id) || null;
  };

  // Referências para elementos da UI
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  
  // Gerenciar cliques fora do picker para fechá-lo
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }

    // Adicionar quando o seletor está visível
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const onEmojiClick = (emojiData: any) => {
    setCommentText(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false); // Fechar o picker após seleção
  };
  
  // Funções para lidar com upload de imagem
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.');
        return;
      }
      
      // Verificar tamanho (limitar a 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter menos de 5MB.');
        return;
      }
      
      setSelectedImage(file);
      
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const removeSelectedImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Centro de Treinamento</h2>
          <p className="text-gray-500 mt-1">
            Aprenda a utilizar todas as funcionalidades do sistema de forma eficiente
          </p>
        </div>

        <Card className="w-full md:w-auto p-2">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold">{totalProgress}%</span>
              </div>
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#edf2f7"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - totalProgress / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Seu progresso</p>
              <p className="text-lg font-bold">{completedModules.length} de {allModules.length} concluídos</p>
              {totalProgress >= 100 && (
                <div className="flex items-center mt-1 text-green-600 font-medium">
                  <CheckCheck className="h-4 w-4 mr-1" /> Treinamento completo
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4">
        {totalProgress >= 25 && (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 py-1.5 px-3">
            <Award className="h-4 w-4 mr-1.5" /> Aprendiz
          </Badge>
        )}
        {totalProgress >= 50 && (
          <Badge className="bg-purple-50 text-purple-700 border-purple-200 py-1.5 px-3">
            <Medal className="h-4 w-4 mr-1.5" /> Especialista
          </Badge>
        )}
        {totalProgress >= 75 && (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 py-1.5 px-3">
            <Star className="h-4 w-4 mr-1.5" /> Avançado
          </Badge>
        )}
        {totalProgress >= 100 && (
          <Badge className="bg-green-50 text-green-700 border-green-200 py-1.5 px-3">
            <Trophy className="h-4 w-4 mr-1.5" /> Mestre
          </Badge>
        )}
      </div>

      <Card className="p-0">
        <CardHeader className="pb-0">
          <CardTitle>Categorias de Treinamento</CardTitle>
          <CardDescription>
            Escolha uma área para começar ou continuar seu aprendizado
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="flex flex-nowrap gap-4 py-4 min-w-max">
            {trainingCategories.map((category) => {
              const totalModulesInCategory = category.modules.length;
              const completedModulesInCategory = category.modules.filter(m => m.completed).length;
              const categoryProgress = Math.round((completedModulesInCategory / totalModulesInCategory) * 100);

              return (
                <div 
                  key={category.id} 
                  className={cn(
                    "relative flex flex-col w-64 rounded-lg p-4 cursor-pointer transition-all border border-gray-200 hover:shadow-md",
                    selectedCategory === category.id ? "bg-blue-50 border-blue-200" : "bg-white"
                  )}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setActiveTab("categoria");
                  }}
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 mb-3">
                    {category.icon}
                  </div>
                  <h3 className="font-medium text-lg">{category.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-3 line-clamp-2">{category.description}</p>

                  <div className="mt-auto">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{completedModulesInCategory} de {totalModulesInCategory} módulos</span>
                      <span className="font-medium">{categoryProgress}%</span>
                    </div>
                    <Progress value={categoryProgress} className="h-2" />
                  </div>

                  {categoryProgress === 100 && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-12 gap-6">
        <div className="md:col-span-12">
          <Tabs defaultValue="todos" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="todos">Todos os módulos</TabsTrigger>
                <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
                <TabsTrigger value="completos">Concluídos</TabsTrigger>
                <TabsTrigger value="categoria" disabled={!selectedCategory}>
                  {selectedCategory ? getCategoryByName(selectedCategory)?.name : "Por categoria"}
                </TabsTrigger>
              </TabsList>

              <div className="relative w-64">
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Buscar treinamentos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <TabsContent value="todos" className="mt-0">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {getFilteredModules().map((module) => (
                  <Card key={module.id} className={module.completed ? "border-green-200" : ""}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between">
                        <div className="flex items-center gap-2">
                          {getModuleIcon(module.type)}
                          {getModuleLevelBadge(module.level)}
                        </div>
                        {module.completed && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                      <CardTitle className="text-lg mt-2">{module.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{module.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{module.duration}</span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => openTutorialDialog(module)}
                      >
                        {module.completed 
                          ? <span className="flex items-center"><CheckCircle2 className="mr-2 h-4 w-4" /> Rever</span>
                          : <span className="flex items-center"><PlayCircle className="mr-2 h-4 w-4" /> Iniciar</span>
                        }
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              {getFilteredModules().length === 0 && (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium">Nenhum módulo encontrado</h3>
                  <p className="text-gray-500 mt-2">Tente ajustar os filtros ou a busca</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pendentes" className="mt-0">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {getFilteredModules().filter(m => !m.completed).map((module) => (
                  <Card key={module.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between">
                        <div className="flex items-center gap-2">
                          {getModuleIcon(module.type)}
                          {getModuleLevelBadge(module.level)}
                        </div>
                      </div>
                      <CardTitle className="text-lg mt-2">{module.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{module.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{module.duration}</span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => openTutorialDialog(module)}
                      >
                        <PlayCircle className="mr-2 h-4 w-4" /> Iniciar
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              {getFilteredModules().filter(m => !m.completed).length === 0 && (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium">Nenhum módulo pendente</h3>
                  <p className="text-gray-500 mt-2">Parabéns! Você concluiu todos os módulos desta categoria.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="completos" className="mt-0">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {getFilteredModules().filter(m => m.completed).map((module) => (
                  <Card key={module.id} className="border-green-200">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between">
                        <div className="flex items-center gap-2">
                          {getModuleIcon(module.type)}
                          {getModuleLevelBadge(module.level)}
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                      <CardTitle className="text-lg mt-2">{module.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{module.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{module.duration}</span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => openTutorialDialog(module)}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Rever
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              {getFilteredModules().filter(m => m.completed).length === 0 && (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium">Nenhum módulo concluído</h3>
                  <p className="text-gray-500 mt-2">Continue seu aprendizado completando módulos.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="categoria" className="mt-0">
              {selectedCategory && (
                <>
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100">
                        {getCategoryByName(selectedCategory)?.icon}
                      </div>
                      <h2 className="text-2xl font-bold">{getCategoryByName(selectedCategory)?.name}</h2>
                    </div>
                    <p className="text-gray-600">{getCategoryByName(selectedCategory)?.description}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {getFilteredModules().map((module) => (
                      <Card key={module.id} className={module.completed ? "border-green-200" : ""}>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between">
                            <div className="flex items-center gap-2">
                              {getModuleIcon(module.type)}
                              {getModuleLevelBadge(module.level)}
                            </div>
                            {module.completed && (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                          <CardTitle className="text-lg mt-2">{module.title}</CardTitle>
                          <CardDescription className="line-clamp-2">{module.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="pb-3">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="h-4 w-4" />
                            <span>{module.duration}</span>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => openTutorialDialog(module)}
                          >
                            {module.completed 
                              ? <span className="flex items-center"><CheckCircle2 className="mr-2 h-4 w-4" /> Rever</span>
                              : <span className="flex items-center"><PlayCircle className="mr-2 h-4 w4" /> Iniciar</span>
                            }
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>

                  {getFilteredModules().length === 0 && (
                    <div className="text-center py-12">
                      <h3 className="text-lg font-medium">Nenhum módulo encontrado</h3>
                      <p className="text-gray-500 mt-2">Tente ajustar os filtros ou a busca</p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Tutorial Dialog */}
      <Dialog open={!!openTutorial} onOpenChange={(open) => !open && setOpenTutorial(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div>
                <DialogTitle className="text-xl">{openTutorial?.title}</DialogTitle>
                <DialogDescription className="mt-1">{openTutorial?.description}</DialogDescription>
              </div>
              
              {/* Checkbox de conclusão na mesma linha, à direita */}
              {openTutorial && (
                <div 
                  className={`flex items-center cursor-pointer ${openTutorial.completed ? "text-green-600" : "text-gray-500"}`}
                  onClick={() => {
                    // Lógica para marcar como concluído
                    const updatedModule = {...openTutorial, completed: !openTutorial.completed};
                    setOpenTutorial(updatedModule);
                    
                    // Atualizar a lista de módulos concluídos (simulação)
                    const categoryOfModule = trainingCategories.find(cat => 
                      cat.modules.some(m => m.id === updatedModule.id)
                    );
                    
                    if (categoryOfModule) {
                      const updatedModules = categoryOfModule.modules.map(m => 
                        m.id === updatedModule.id ? updatedModule : m
                      );
                      // Atualiza o estado local (em um app real, isso seria feito após resposta do backend)
                      categoryOfModule.modules = updatedModules;
                    }
                  }}
                >
                  {openTutorial.completed ? (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      <span>Concluído</span>
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 border-2 border-gray-400 rounded-full mr-2 flex items-center justify-center hover:border-blue-500"></div>
                      <span>Marcar como concluído</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="py-4">

            
            {openTutorial?.type === "video" && openTutorial?.videoUrl && (
              <div className="space-y-6">
                <div 
                  ref={videoRef}
                  tabIndex={0} 
                  className="relative aspect-video bg-gray-100 rounded-lg mb-2 overflow-hidden flex justify-center items-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <iframe
                    src={openTutorial.videoUrl.includes("Vcxhe42DSTU") 
                      ? "https://www.youtube.com/embed/Vcxhe42DSTU?start=3910" 
                      : "https://www.youtube.com/embed/v7iHTjVV1r0"
                    }
                    title={openTutorial.title}
                    className="w-full h-full absolute inset-0 border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                
                {/* Controles de navegação e barra de progresso */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        if (currentModuleIndex > 0) {
                          const prevModule = allModules[currentModuleIndex - 1];
                          setOpenTutorial(prevModule);
                          setCurrentModuleIndex(currentModuleIndex - 1);
                          
                          // Carregar os comentários do módulo anterior
                          const prevModuleComments = moduleComments[prevModule.id] || [];
                          setComments(prevModuleComments);
                        }
                      }}
                      disabled={currentModuleIndex <= 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    {/* Botão de navegação apenas */}
                    
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        if (currentModuleIndex < allModules.length - 1) {
                          const nextModule = allModules[currentModuleIndex + 1];
                          setOpenTutorial(nextModule);
                          setCurrentModuleIndex(currentModuleIndex + 1);
                          
                          // Carregar os comentários do próximo módulo
                          const nextModuleComments = moduleComments[nextModule.id] || [];
                          setComments(nextModuleComments);
                        }
                      }}
                      disabled={currentModuleIndex >= allModules.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Barra de progresso do módulo */}
                  <div className="w-full">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progresso no módulo</span>
                      <span>{currentModuleIndex + 1} de {allModules.length}</span>
                    </div>
                    <Progress 
                      value={(currentModuleIndex + 1) / allModules.length * 100} 
                      className="h-1.5"
                    />
                  </div>
                </div>
                
                {/* Removido checkbox abaixo do vídeo pois já temos um no topo */}
              </div>
            )}

            {openTutorial?.type === "texto" && (
              <div className="prose prose-blue max-w-none">
                <p>Este é um tutorial em formato de texto que explica detalhadamente o tópico <strong>{openTutorial.title}</strong>.</p>

                <h3>Introdução</h3>
                <p>Esta seção introduz os conceitos básicos relacionados ao tópico.</p>

                <h3>Passo a passo</h3>
                <ol>
                  <li>Primeiro, você deve acessar a seção correspondente no sistema.</li>
                  <li>Em seguida, preencha os campos necessários com as informações solicitadas.</li>
                  <li>Verifique se todos os dados estão corretos antes de prosseguir.</li>
                  <li>Clique no botão de confirmação para salvar suas alterações.</li>
                </ol>

                <h3>Dicas importantes</h3>
                <ul>
                  <li>Mantenha seus dados sempre atualizados para garantir relatórios precisos.</li>
                  <li>Utilize os filtros disponíveis para encontrar informações específicas rapidamente.</li>
                  <li>Exporte os dados quando precisar compartilhar ou analisar em outras ferramentas.</li>
                </ul>

                <div className="bg-blue-50 p-4 rounded-md border border-blue-200 my-4">
                  <h4 className="text-blue-800 font-medium mb-2 flex items-center">
                    <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                    </svg>
                    Nota importante
                  </h4>
                  <p className="text-blue-700 text-sm">Lembre-se de sempre salvar suas alterações antes de sair da página para evitar perda de dados.</p>
                </div>

                <h3>Conclusão</h3>
                <p>Seguindo estas orientações, você será capaz de utilizar este recurso de forma eficiente e aproveitar ao máximo as funcionalidades disponíveis.</p>
              </div>
            )}

            {openTutorial?.type === "interativo" && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h3 className="font-medium text-lg mb-4">Tutorial Interativo: {openTutorial.title}</h3>

                  <p className="text-gray-600 mb-6">Este tutorial guiará você através de um exercício prático para aplicar os conceitos apresentados.</p>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="step-1">
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">1</div>
                          <span>Acessando a funcionalidade</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pl-11">
                        <div className="space-y-4">
                          <p>Para acessar a funcionalidade, navegue até o menu principal e selecione a opção correspondente.</p>
                          <div className="bg-gray-100 p-4 rounded-md">
                            <p className="text-sm text-gray-600">Experimente: Clique no botão abaixo para simular a navegação.</p>
                            <Button variant="outline" className="mt-2">
                              Simular navegação
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="step-2">
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">2</div>
                          <span>Configurando parâmetros</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pl-11">
                        <div className="space-y-4">
                          <p>Após acessar a funcionalidade, você precisará configurar os parâmetros adequados para sua necessidade.</p>
                          <div className="bg-gray-100 p-4 rounded-md">
                            <p className="text-sm text-gray-600">Experimente: Tente configurar os parâmetros abaixo.</p>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              <div>
                                <label className="text-sm font-medium">Parâmetro 1</label>
                                <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3">
                                  <option>Opção 1</option>
                                  <option>Opção 2</option>
                                  <option>Opção 3</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Parâmetro 2</label>
                                <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3" placeholder="Digite aqui" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="step-3">
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">3</div>
                          <span>Processando e analisando resultados</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pl-11">
                        <div className="space-y-4">
                          <p>Com os parâmetros configurados, agora você pode processar os dados e analisar os resultados obtidos.</p>
                          <div className="bg-gray-100 p-4 rounded-md">
                            <p className="text-sm text-gray-600">Experimente: Clique no botão abaixo para simular o processamento.</p>
                            <Button variant="outline" className="mt-2">
                              Processar dados
                            </Button>

                            <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                              <p className="text-sm font-medium">Resultados:</p>
                              <p className="text-sm text-gray-600">Os resultados serão exibidos aqui após o processamento.</p>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="font-medium text-blue-800 mb-2">Continuar praticando</h4>
                  <p className="text-sm text-blue-700">Para dominar completamente este conceito, recomendamos que você pratique regularmente aplicando o que aprendeu em situações reais do seu negócio.</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium mb-3">Comentários e Discussões</h3>

            <div className="space-y-4">
              {/* Área de novo comentário */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex gap-2 mb-3">
                  <select 
                    value={commentType}
                    onChange={(e) => setCommentType(e.target.value as 'question' | 'feedback' | 'suggestion')}
                    className="h-9 rounded-md border border-gray-200 px-3 text-sm"
                  >
                    <option value="feedback">Feedback</option>
                    <option value="question">Pergunta</option>
                    <option value="suggestion">Sugestão</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-2 relative">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Escreva seu comentário..."
                    className="flex-1 min-h-[80px] p-2 text-sm border border-gray-200 rounded-md"
                  />
                  
                  {/* Preview da imagem */}
                  {previewUrl && (
                    <div className="relative mt-2 border border-gray-200 rounded-md overflow-hidden">
                      <img 
                        src={previewUrl} 
                        alt="Preview da imagem" 
                        className="max-h-48 max-w-full object-contain"
                      />
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-70 hover:opacity-100"
                        onClick={removeSelectedImage}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex gap-2 justify-end">
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="image-upload"
                        onChange={handleImageSelect}
                      />
                      <label htmlFor="image-upload" className="cursor-pointer inline-block">
                        <div 
                          className="h-8 w-8 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                        >
                          <Paperclip className="h-4 w-4" />
                        </div>
                      </label>
                    </div>
                    <div 
                      className="h-8 w-8 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Smile className="h-4 w-4" />
                    </div>
                    <Button 
                      size="icon" 
                      onClick={addComment}
                      disabled={!commentText.trim() || isSubmittingComment}
                      className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isSubmittingComment ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Seletor de emoji */}
                  {showEmojiPicker && (
                    <div className="absolute z-50 right-14 top-20">
                      <div 
                        ref={emojiPickerRef}
                        className="bg-white border border-gray-200 shadow-lg rounded-md overflow-hidden"
                      >
                        <EmojiPicker onEmojiClick={onEmojiClick} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de comentários */}
              <div className="space-y-4">
                {comments.map((comment) => (
                  <CommentItem 
                    key={comment.id} 
                    comment={comment} 
                    onAddReply={(commentId, replyText, imageUrl) => {
                      // Função para adicionar uma nova resposta
                      if (replyText.trim()) {
                        const newReply: Reply = {
                          id: Math.random().toString(36).substr(2, 9),
                          commentId: commentId,
                          userName: user?.username || 'Usuário',
                          text: replyText,
                          createdAt: new Date().toISOString(),
                          isAdmin: false,
                          imageUrl: imageUrl // Adicionar a URL da imagem se disponível
                        };
                        
                        setComments(comments.map(c => 
                          c.id === commentId 
                            ? {...c, replies: [...(c.replies || []), newReply]} 
                            : c
                          )
                        );
                      }
                    }}
                  />
                ))}
                
                {comments.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    Nenhum comentário ainda. Seja o primeiro a comentar!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Removido footer para evitar duplicação */}
        </DialogContent>
      </Dialog>
    </div>
  );
}