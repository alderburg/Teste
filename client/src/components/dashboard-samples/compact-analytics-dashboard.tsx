import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const CompactAnalyticsDashboard: React.FC = () => {
  const [revenueData, setRevenueData] = useState([45, 58, 37, 61, 58, 75, 68]);
  const [costsData, setCostsData] = useState([42, 35, 48, 38, 41, 30, 35]);
  const [revenueValue, setRevenueValue] = useState("R$ 34.578");
  const [costValue, setCostValue] = useState("R$ 14.230");
  const [revenueChange, setRevenueChange] = useState("+12%");
  const [activeFilter, setActiveFilter] = useState("Hoje");
  const [metricsData, setMetricsData] = useState([
    { title: "Clientes", value: "93", change: "+5%", up: true },
    { title: "Vendas", value: "48", change: "+12%", up: true },
    { title: "Custos", value: "R$296", change: "-3%", up: false },
    { title: "Lucro", value: "58%", change: "+8%", up: true }
  ]);
  const [updateTime, setUpdateTime] = useState("14:30");
  const [highlightId, setHighlightId] = useState<number | null>(null);

  // Função para gerar valores aleatórios de gráfico
  const generateRandomData = (min: number, max: number, length: number) => {
    return Array.from({ length }, () => Math.floor(Math.random() * (max - min + 1) + min));
  };

  // Função para atualizar dados sem efeitos de carregamento
  const refreshData = () => {
    // Atualiza os gráficos de barras
    setRevenueData(generateRandomData(35, 78, 7));
    setCostsData(generateRandomData(30, 50, 7));
    
    // Atualiza os valores de faturamento e custo
    const newRevenueValue = Math.floor(Math.random() * (39000 - 33000) + 33000);
    const newCostValue = Math.floor(Math.random() * (16000 - 13000) + 13000);
    
    setRevenueValue(`R$ ${newRevenueValue.toLocaleString('pt-BR')}`);
    setCostValue(`R$ ${newCostValue.toLocaleString('pt-BR')}`);
    
    // Atualiza as variações percentuais
    const revenueChangeValue = Math.floor(Math.random() * 15) + 5;
    setRevenueChange(`+${revenueChangeValue}%`);
    
    // Atualiza os indicadores
    setMetricsData([
      { 
        title: "Clientes", 
        value: String(Math.floor(Math.random() * 20) + 90), 
        change: `+${Math.floor(Math.random() * 10)}%`, 
        up: true 
      },
      { 
        title: "Vendas", 
        value: String(Math.floor(Math.random() * 20) + 40), 
        change: `+${Math.floor(Math.random() * 15)}%`, 
        up: true 
      },
      { 
        title: "Custos", 
        value: `R$${Math.floor(Math.random() * 100) + 250}`, 
        change: `-${Math.floor(Math.random() * 5)}%`, 
        up: false 
      },
      { 
        title: "Lucro", 
        value: `${Math.floor(Math.random() * 10) + 55}%`, 
        change: `+${Math.floor(Math.random() * 10)}%`, 
        up: true 
      }
    ]);
    
    // Atualiza o horário
    const now = new Date();
    setUpdateTime(`${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`);
  };

  // Efeito para alternar a aba ativa periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFilter((prev) => {
        if (prev === "Hoje") return "7 dias";
        if (prev === "7 dias") return "30 dias"; 
        return "Hoje";
      });
      refreshData();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Efeito para destacar barras alternadamente
  useEffect(() => {
    const interval = setInterval(() => {
      const randomId = Math.floor(Math.random() * 7);
      setHighlightId(randomId);
      setTimeout(() => setHighlightId(null), 500);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden p-3">
      {/* Header com navegação por abas */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-medium text-indigo-800">Dashboard</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {["Hoje", "7 dias", "30 dias"].map((period) => (
            <Badge 
              key={period}
              className={`text-xs cursor-pointer transition-all duration-200 ${
                activeFilter === period 
                  ? "bg-indigo-50 text-indigo-600 border-indigo-200" 
                  : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
              }`}
              onClick={() => {
                setActiveFilter(period);
                refreshData();
              }}
            >
              {period}
            </Badge>
          ))}
        </div>
      </div>

      {/* Gráficos principais em formato compacto */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-50 p-2 rounded-md border border-gray-100 relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Faturamento</span>
            <span className="text-xs text-green-600 flex items-center">
              {revenueChange} <TrendingUp className="h-3 w-3 ml-0.5" />
            </span>
          </div>
          <p className="text-lg font-semibold">{revenueValue}</p>
          
          {/* Mini gráfico de barras */}
          <div className="flex items-end h-10 gap-0.5 mt-1">
            {revenueData.map((height, index) => (
              <div 
                key={index} 
                className="flex-1"
              >
                <motion.div 
                  className={`w-full rounded-sm cursor-pointer transition-colors duration-200 ${
                    highlightId === index ? 'bg-indigo-400' : 'bg-indigo-500'
                  }`}
                  style={{ height: `${height}%` }}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5 }}
                ></motion.div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 p-2 rounded-md border border-gray-100 relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Custos</span>
            <span className="text-xs text-red-600 flex items-center">
              +3% <TrendingUp className="h-3 w-3 ml-0.5" />
            </span>
          </div>
          <p className="text-lg font-semibold">{costValue}</p>
          
          {/* Mini gráfico de barras */}
          <div className="flex items-end h-10 gap-0.5 mt-1">
            {costsData.map((height, index) => (
              <div 
                key={index} 
                className="flex-1"
              >
                <motion.div 
                  className={`w-full rounded-sm cursor-pointer transition-colors duration-200 ${
                    highlightId === index ? 'bg-red-300' : 'bg-red-400'
                  }`}
                  style={{ height: `${height}%` }}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5 }}
                ></motion.div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Indicadores pequenos */}
      <div className="grid grid-cols-4 gap-1.5 mb-2">
        {metricsData.map((item, index) => (
          <Card 
            key={index} 
            className="p-1.5 flex flex-col cursor-pointer transition-all duration-200 hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">{item.title}</span>
              <span className={`text-[9px] ${item.up ? 'text-green-600' : 'text-red-600'} flex items-center`}>
                {item.change}
                {item.up ? 
                  <ArrowUpRight className="h-2 w-2 ml-0.5" /> : 
                  <ArrowDownRight className="h-2 w-2 ml-0.5" />
                }
              </span>
            </div>
            <motion.span 
              className="text-sm font-medium mt-0.5"
              key={item.value} // Forçar a animação para cada mudança de valor
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {item.value}
            </motion.span>
          </Card>
        ))}
      </div>

      {/* Gráfico principal (animado) */}
      <div className="relative h-16 mb-2 border border-gray-100 rounded-md p-1 bg-gray-50">
        <div className="absolute inset-0">
          <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
            {/* Linha de produtos com animação */}
            <motion.path 
              d="M0,30 L14,25 L28,20 L42,18 L56,15 L70,10 L84,12 L100,8" 
              fill="none" 
              stroke="#6366f1" 
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, repeat: 0 }}
            />
            
            {/* Linha de serviços com animação */}
            <motion.path 
              d="M0,35 L14,32 L28,30 L42,25 L56,20 L70,18 L84,15 L100,17" 
              fill="none" 
              stroke="#a855f7" 
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: 0.3, repeat: 0 }}
            />
          </svg>
        </div>
        
        <div className="absolute bottom-0 left-0 w-full flex justify-between text-[8px] text-gray-400 px-1">
          <span>Jan</span>
          <span>Fev</span>
          <span>Mar</span>
          <span>Abr</span>
          <span>Mai</span>
          <span>Jun</span>
          <span>Jul</span>
        </div>
      </div>
      
      {/* Legenda com atualização */}
      <div className="flex justify-between items-center text-[10px] text-gray-500">
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-indigo-500 mr-1"></div>
            <span>Produtos</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-purple-500 mr-1"></div>
            <span>Serviços</span>
          </div>
        </div>
        <div className="flex items-center">
          <Download className="h-2.5 w-2.5 mr-1 cursor-pointer hover:text-indigo-600 transition-colors" />
          <span>
            Atualizado às {updateTime}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CompactAnalyticsDashboard;