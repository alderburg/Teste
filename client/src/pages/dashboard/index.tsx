// DashboardLayout removido para usar layout persistente
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { 
  BarChart, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Percent, 
  TruckIcon, 
  ShoppingBag, 
  PackageOpen, 
  BookOpen, 
  Layers,
  FileText,
  Star,
  BarChart3,
  RefreshCw,
  RotateCw,
  Calculator,
  Landmark,
  MoveIcon,
  ClipboardList,
  Package,
  FileSpreadsheet,
  Box,
  Wrench
} from "lucide-react";
import { useEffect, useState } from "react";
import { StarRating } from "@/components/StarRating";
import OnboardingChat from "@/components/onboarding/OnboardingChat";
import { useOnboarding } from "@/context/OnboardingContext";

// Definição dos boxes do dashboard
type BoxType = 'novos' | 'usados' | 'aluguel' | 'servicos';

export default function DashboardPage() {
  const [, navigate] = useLocation();
  
  // Obtém o contexto de onboarding
  const { showOnboarding, setShowOnboarding, onboardingCompleted, completeOnboarding } = useOnboarding();
  
  // Estado para gerenciar exibição compacta em dispositivos móveis
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  
  // Estado para armazenar a ordem dos boxes
  const [boxOrder, setBoxOrder] = useState<BoxType[]>(() => {
    // Tenta carregar a ordem salva do localStorage
    const savedOrder = localStorage.getItem('dashboardBoxOrder');
    return savedOrder ? JSON.parse(savedOrder) : ['novos', 'usados', 'aluguel', 'servicos'];
  });
  
  // Estado para armazenar o box que está sendo arrastado
  const [draggedBox, setDraggedBox] = useState<BoxType | null>(null);
  
  // Estado para armazenar o box que está sendo alvo do drop
  const [dropTargetBox, setDropTargetBox] = useState<BoxType | null>(null);
  
  // Estado para armazenar as notas dos boxes
  const [ratings, setRatings] = useState<Record<BoxType, number>>(() => {
    // Tenta carregar as notas salvas do localStorage
    const savedRatings = localStorage.getItem('dashboardRatings');
    return savedRatings ? JSON.parse(savedRatings) : {
      novos: 0,
      usados: 0,
      aluguel: 0,
      servicos: 0
    };
  });
  
  // Define classes CSS para tamanhos de texto desktop e mobile
  const labelClass = isMobile ? 'text-xs' : 'text-xs';
  const valueClass = isMobile ? 'text-base' : 'text-base';
  
  // Atualiza o estado de isMobile quando a janela é redimensionada
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Efeito para mostrar o popup de onboarding apenas se não foi completado
  useEffect(() => {
    console.log("Verificando se deve mostrar o onboarding...");
    console.log("onboardingCompleted:", onboardingCompleted);
    
    // Mostra o popup apenas se o onboarding não foi completado
    if (!onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [onboardingCompleted, setShowOnboarding]);

  // Função para iniciar o arrasto
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, boxId: BoxType) => {
    setDraggedBox(boxId);
    e.dataTransfer.setData('text/plain', boxId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Função para quando o arrasto entra em uma área
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, boxId: BoxType) => {
    e.preventDefault();
    if (draggedBox !== boxId) {
      setDropTargetBox(boxId);
    }
  };

  // Função para quando o arrasto sai de uma área
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDropTargetBox(null);
  };

  // Função para quando o arrasto está sobre uma área
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Função para quando o arrasto termina
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, boxId: BoxType) => {
    e.preventDefault();
    if (draggedBox === boxId) return;
    
    // Troca a posição dos boxes
    const newOrder = [...boxOrder];
    const draggedIndex = newOrder.indexOf(draggedBox!);
    const dropIndex = newOrder.indexOf(boxId);
    
    // Troca as posições
    newOrder[draggedIndex] = boxId;
    newOrder[dropIndex] = draggedBox!;
    
    // Atualiza o estado
    setBoxOrder(newOrder);
    
    // Salva a nova ordem no localStorage
    localStorage.setItem('dashboardBoxOrder', JSON.stringify(newOrder));
    
    // Reseta os estados de arrasto
    setDraggedBox(null);
    setDropTargetBox(null);
  };

  const handleDragEnd = () => {
    setDraggedBox(null);
    setDropTargetBox(null);
  };

  const navigateTo = (path: string) => {
    navigate(path);
  };
  
  // Função para atualizar a nota de um box
  const handleRating = (boxId: BoxType, rating: number) => {
    const newRatings = { ...ratings, [boxId]: rating };
    setRatings(newRatings);
    localStorage.setItem('dashboardRatings', JSON.stringify(newRatings));
  };

  // Renderiza os boxes na ordem definida pelo estado
  const renderBoxes = () => {
    const boxes = {
      novos: (
        <div 
          key="novos"
          className={`relative w-full h-full ${dropTargetBox === 'novos' ? 'border-2 border-dashed border-blue-500' : ''} ${draggedBox === 'novos' ? 'opacity-60' : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, 'novos')}
          onDragEnter={(e) => handleDragEnter(e, 'novos')}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'novos')}
          onDragEnd={handleDragEnd}
        >
          <div className="absolute right-3 top-3 z-10 cursor-move p-1 rounded-full bg-gray-100 hover:bg-gray-200">
            <MoveIcon className="h-4 w-4 text-gray-500" />
          </div>
          <Card className="p-2 shadow-md h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-6 w-6 text-blue-600" />
                  <CardTitle className={isMobile ? 'text-base' : ''}>
                    {isMobile ? 'Novos' : 'Produtos Novos'}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateTo("/cadastros/produtos/novos")}
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                >
                  Ver Todos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <div className={`bg-blue-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <BarChart className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Quantidade</p>
                    <p className={`${valueClass} font-bold`}>0</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-green-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <TrendingUp className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-green-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Faturamento</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-red-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <DollarSign className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-red-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Custo Médio</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-blue-300 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <DollarSign className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Valor Médio</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={`bg-purple-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <Percent className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-purple-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Margem Média</p>
                    <p className={`${valueClass} font-bold`}>0%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-emerald-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <DollarSign className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-emerald-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Margem em R$</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-orange-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <RefreshCw className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-orange-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>ROI Médio</p>
                    <p className={`${valueClass} font-bold`}>0,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-indigo-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <TruckIcon className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-indigo-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Frete</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
              </div>
              
              <div className="mx-2 border-t border-gray-200 pt-4 mt-4">
                <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex items-center justify-between gap-2'}`}>
                  {isMobile ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-1 whitespace-nowrap">
                          <span className="text-sm text-gray-500 mr-1">Sua nota:</span>
                          <StarRating
                            initialRating={ratings.novos}
                            onRatingChange={(rating: number) => handleRating('novos', rating)}
                            totalStars={5}
                            size={16}
                            moduleType="Dashboard de Produtos Novos"
                          />
                        </div>
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
                          size="sm"
                          onClick={() => navigateTo("/precificacao/novos")}
                        >
                          <DollarSign className="h-4 w-4" />
                          <span>Precificar</span>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-1 whitespace-nowrap">
                        <span className="text-sm text-gray-500 mr-1">Sua nota:</span>
                        <StarRating
                          initialRating={ratings.novos}
                          onRatingChange={(rating: number) => handleRating('novos', rating)}
                          totalStars={5}
                          size={18}
                          moduleType="Dashboard de Produtos Novos"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
                          size="sm"
                          onClick={() => navigateTo("/precificacao/novos")}
                        >
                          <DollarSign className="h-4 w-4" />
                          <span>Precificar</span>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
      usados: (
        <div 
          key="usados"
          className={`relative w-full h-full ${dropTargetBox === 'usados' ? 'border-2 border-dashed border-amber-500' : ''} ${draggedBox === 'usados' ? 'opacity-60' : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, 'usados')}
          onDragEnter={(e) => handleDragEnter(e, 'usados')}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'usados')}
          onDragEnd={handleDragEnd}
        >
          <div className="absolute right-3 top-3 z-10 cursor-move p-1 rounded-full bg-gray-100 hover:bg-gray-200">
            <MoveIcon className="h-4 w-4 text-gray-500" />
          </div>
          <Card className="p-2 shadow-md h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PackageOpen className="h-6 w-6 text-amber-600" />
                  <CardTitle className={isMobile ? 'text-base' : ''}>
                    {isMobile ? 'Usados' : 'Produtos Usados'}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateTo("/cadastros/produtos/usados")}
                  className="text-amber-600 hover:text-amber-800 hover:bg-amber-100"
                >
                  Ver Todos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <div className={`bg-amber-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <BarChart className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-amber-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Quantidade</p>
                    <p className={`${valueClass} font-bold`}>0</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-green-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <TrendingUp className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-green-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Faturamento</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-red-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <DollarSign className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-red-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Custo Médio</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-blue-300 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <DollarSign className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Valor Médio</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-purple-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <Percent className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-purple-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Margem Média</p>
                    <p className={`${valueClass} font-bold`}>0%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-emerald-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <DollarSign className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-emerald-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Margem em R$</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-orange-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <RefreshCw className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-orange-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>ROI Médio</p>
                    <p className={`${valueClass} font-bold`}>0,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-indigo-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <TruckIcon className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-indigo-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Frete</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
              </div>
              
              <div className="mx-2 border-t border-gray-200 pt-4 mt-4">
                <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex items-center justify-between gap-2'}`}>
                  {isMobile ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-1 whitespace-nowrap">
                          <span className="text-sm text-gray-500 mr-1">Sua nota:</span>
                          <StarRating
                            initialRating={ratings.usados}
                            onRatingChange={(rating: number) => handleRating('usados', rating)}
                            totalStars={5}
                            size={16}
                            moduleType="Dashboard de Produtos Usados"
                          />
                        </div>
                        <Button 
                          className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1"
                          size="sm"
                          onClick={() => navigateTo("/precificacao/usados")}
                        >
                          <DollarSign className="h-4 w-4" />
                          <span>Precificar</span>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-1 whitespace-nowrap">
                        <span className="text-sm text-gray-500 mr-1">Sua nota:</span>
                        <StarRating
                          initialRating={ratings.usados}
                          onRatingChange={(rating: number) => handleRating('usados', rating)}
                          totalStars={5}
                          size={18}
                          moduleType="Dashboard de Produtos Usados"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1"
                          size="sm"
                          onClick={() => navigateTo("/precificacao/usados")}
                        >
                          <DollarSign className="h-4 w-4" />
                          <span>Precificar</span>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
      aluguel: (
        <div 
          key="aluguel"
          className={`relative w-full h-full ${dropTargetBox === 'aluguel' ? 'border-2 border-dashed border-purple-500' : ''} ${draggedBox === 'aluguel' ? 'opacity-60' : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, 'aluguel')}
          onDragEnter={(e) => handleDragEnter(e, 'aluguel')}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'aluguel')}
          onDragEnd={handleDragEnd}
        >
          <div className="absolute right-3 top-3 z-10 cursor-move p-1 rounded-full bg-gray-100 hover:bg-gray-200">
            <MoveIcon className="h-4 w-4 text-gray-500" />
          </div>
          <Card className="p-2 shadow-md h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Box className="h-6 w-6 text-purple-600" />
                  <CardTitle className={isMobile ? 'text-base' : ''}>
                    {isMobile ? 'Aluguéis' : 'Itens de Aluguel'}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateTo("/cadastros/alugueis/itens")}
                  className="text-purple-600 hover:text-purple-800 hover:bg-purple-100"
                >
                  Ver Todos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <div className={`bg-purple-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <BarChart className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-purple-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Quantidade</p>
                    <p className={`${valueClass} font-bold`}>0</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-green-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <TrendingUp className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-green-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Faturamento</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-red-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <DollarSign className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-red-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Custo Médio</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-blue-300 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <DollarSign className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Valor Médio</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-purple-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <Percent className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-purple-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Margem Média</p>
                    <p className={`${valueClass} font-bold`}>0%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-emerald-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <DollarSign className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-emerald-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Margem em R$</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-orange-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <RefreshCw className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-orange-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>ROI Médio</p>
                    <p className={`${valueClass} font-bold`}>0,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-indigo-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <TruckIcon className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-indigo-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Deslocamento</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
              </div>
              
              <div className="mx-2 border-t border-gray-200 pt-4 mt-4">
                <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex items-center justify-between gap-2'}`}>
                  {isMobile ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-1 whitespace-nowrap">
                          <span className="text-sm text-gray-500 mr-1">Sua nota:</span>
                          <StarRating
                            initialRating={ratings.aluguel}
                            onRatingChange={(rating: number) => handleRating('aluguel', rating)}
                            totalStars={5}
                            size={16}
                            moduleType="Dashboard de Itens de Aluguel"
                          />
                        </div>
                        <Button 
                          className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1"
                          size="sm"
                          onClick={() => navigateTo("/precificacao/alugueis")}
                        >
                          <DollarSign className="h-4 w-4" />
                          <span>Precificar</span>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-1 whitespace-nowrap">
                        <span className="text-sm text-gray-500 mr-1">Sua nota:</span>
                        <StarRating
                          initialRating={ratings.aluguel}
                          onRatingChange={(rating: number) => handleRating('aluguel', rating)}
                          totalStars={5}
                          size={18}
                          moduleType="Dashboard de Itens de Aluguel"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1"
                          size="sm"
                          onClick={() => navigateTo("/precificacao/alugueis")}
                        >
                          <DollarSign className="h-4 w-4" />
                          <span>Precificar</span>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
      servicos: (
        <div 
          key="servicos"
          className={`relative w-full h-full ${dropTargetBox === 'servicos' ? 'border-2 border-dashed border-teal-500' : ''} ${draggedBox === 'servicos' ? 'opacity-60' : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, 'servicos')}
          onDragEnter={(e) => handleDragEnter(e, 'servicos')}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'servicos')}
          onDragEnd={handleDragEnd}
        >
          <div className="absolute right-3 top-3 z-10 cursor-move p-1 rounded-full bg-gray-100 hover:bg-gray-200">
            <MoveIcon className="h-4 w-4 text-gray-500" />
          </div>
          <Card className="p-2 shadow-md h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="h-6 w-6 text-teal-600" />
                  <CardTitle className={isMobile ? 'text-base' : ''}>
                    {isMobile ? 'Serviços' : 'Serviços'}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateTo("/cadastros/servicos")}
                  className="text-teal-600 hover:text-teal-800 hover:bg-teal-100"
                >
                  Ver Todos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <div className={`bg-teal-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <BarChart className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-teal-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Quantidade</p>
                    <p className={`${valueClass} font-bold`}>0</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-green-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <TrendingUp className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-green-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Faturamento</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-red-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <DollarSign className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-red-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Custo Médio</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-blue-300 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <DollarSign className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Valor Médio</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-purple-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <Percent className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-purple-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Margem Média</p>
                    <p className={`${valueClass} font-bold`}>0%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-emerald-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <DollarSign className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-emerald-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Margem em R$</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-orange-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <RefreshCw className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-orange-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>ROI Médio</p>
                    <p className={`${valueClass} font-bold`}>0,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`bg-indigo-100 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full`}>
                    <TruckIcon className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-indigo-600`} />
                  </div>
                  <div>
                    <p className={`${labelClass} text-gray-500`}>Deslocamento</p>
                    <p className={`${valueClass} font-bold`}>R$ 0,00</p>
                  </div>
                </div>
              </div>
              
              <div className="mx-2 border-t border-gray-200 pt-4 mt-4">
                <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex items-center justify-between gap-2'}`}>
                  {isMobile ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-1 whitespace-nowrap">
                          <span className="text-sm text-gray-500 mr-1">Sua nota:</span>
                          <StarRating
                            initialRating={ratings.servicos}
                            onRatingChange={(rating: number) => handleRating('servicos', rating)}
                            totalStars={5}
                            size={16}
                            moduleType="Dashboard de Serviços"
                          />
                        </div>
                        <Button 
                          className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1"
                          size="sm"
                          onClick={() => navigateTo("/precificacao/servicos")}
                        >
                          <DollarSign className="h-4 w-4" />
                          <span>Precificar</span>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-1 whitespace-nowrap">
                        <span className="text-sm text-gray-500 mr-1">Sua nota:</span>
                        <StarRating
                          initialRating={ratings.servicos}
                          onRatingChange={(rating: number) => handleRating('servicos', rating)}
                          totalStars={5}
                          size={18}
                          moduleType="Dashboard de Serviços"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1"
                          size="sm"
                          onClick={() => navigateTo("/precificacao/servicos")}
                        >
                          <DollarSign className="h-4 w-4" />
                          <span>Precificar</span>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    };

    // Retorna os boxes na ordem definida
    return boxOrder.map((boxId) => boxes[boxId]);
  };
  
  // Verificamos se é a primeira visita ao dashboard 
  // Se for, mostramos o chat de onboarding
  useEffect(() => {
    // Se não estiver completado, o context já vai definir showOnboarding como true
    // Essa lógica está no OnboardingContext
  }, []);

  return (
    <div className="space-y-6">
      {/* Banner clicável - versão responsiva */}
      <div 
        className={`w-full rounded-lg shadow-md mb-6 cursor-pointer overflow-visible ${isMobile ? 'mt-4' : ''}`}
        onClick={() => navigateTo("/planos-e-upgrades")}
      >
        <div className="overflow-hidden rounded-lg">
          <img 
            src="/images/webp/banner-painel-fnanceiro-desktop.webp" 
            alt="Banner Meu Preço Certo - Clique para ver Planos e Upgrades" 
            className={`w-full h-auto object-cover transition-transform hover:scale-[1.02] hover:shadow-lg ${isMobile ? 'min-h-[80px]' : ''}`}
          />
        </div>
      </div>

      {/* Grid de quadros arrastáveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderBoxes()}
      </div>

      {/* Componente do Chat de Onboarding - TEMPORARIAMENTE DESATIVADO
      {window.location.pathname === '/dashboard' && (
        <OnboardingChat 
          open={showOnboarding} 
          onComplete={(answers) => {
            completeOnboarding(answers);
          }}
        />
      )}
      */}
    </div>
  );
}