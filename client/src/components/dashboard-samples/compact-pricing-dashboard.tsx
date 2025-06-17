import React, { useState, useEffect } from 'react';
import { Calculator, ArrowUpRight, TrendingUp, Package, CreditCard, Check } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const CompactPricingDashboard: React.FC = () => {
  // Estados para controlar as animações e valores
  const [productName, setProductName] = useState("Monitor 24\" LED");
  const [productCost, setProductCost] = useState("R$ 499,90");
  const [marginPercent, setMarginPercent] = useState("30%");
  const [resultActive, setResultActive] = useState(true);
  const [salePrice, setSalePrice] = useState("R$ 699,90");
  const [installmentPrice, setInstallmentPrice] = useState("R$ 233,30");
  const [grossProfit, setGrossProfit] = useState("R$ 200,00");
  const [netProfit, setNetProfit] = useState("R$ 175,00");
  const [cardTax, setCardTax] = useState("-R$ 25,00");
  const [pricingHistory, setPricingHistory] = useState([
    { name: "Monitor 24\"", value: "R$ 699,90", change: "+2%" },
    { name: "Processador i7", value: "R$ 2.349,00", change: "+5%" },
  ]);
  const [productOptions] = useState([
    "Monitor 24\" LED",
    "Notebook Gamer",
    "Processador i7",
    "Placa Mãe Z690",
    "Memória RAM 16GB",
    "SSD 1TB NVMe"
  ]);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("Produtos");

  // Atualiza os preços sem efeito de carregamento
  const handleCalculate = () => {
    // Atualiza os valores baseados no produto atual
    if (productName.includes("Monitor")) {
      setSalePrice("R$ 699,90");
      setInstallmentPrice("R$ 233,30");
      setGrossProfit("R$ 200,00");
      setNetProfit("R$ 175,00");
      setCardTax("-R$ 25,00");
    } else if (productName.includes("Notebook")) {
      setSalePrice("R$ 5.999,90");
      setInstallmentPrice("R$ 999,98");
      setGrossProfit("R$ 1.500,00");
      setNetProfit("R$ 1.320,00");
      setCardTax("-R$ 180,00");
    } else if (productName.includes("Processador")) {
      setSalePrice("R$ 2.349,00");
      setInstallmentPrice("R$ 783,00");
      setGrossProfit("R$ 547,00");
      setNetProfit("R$ 492,30");
      setCardTax("-R$ 54,70");
    } else {
      // Valores padrão para outros produtos
      setSalePrice("R$ 1.299,90");
      setInstallmentPrice("R$ 433,30");
      setGrossProfit("R$ 300,00");
      setNetProfit("R$ 260,00");
      setCardTax("-R$ 40,00");
    }
    
    setResultActive(true);
  };

  // Função para simular a mudança de produtos a cada intervalo
  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentProductIndex + 1) % productOptions.length;
      setCurrentProductIndex(nextIndex);
      setProductName(productOptions[nextIndex]);
      
      // Atualiza o custo do produto baseado no nome
      if (productOptions[nextIndex].includes("Monitor")) {
        setProductCost("R$ 499,90");
      } else if (productOptions[nextIndex].includes("Notebook")) {
        setProductCost("R$ 4.499,90");
      } else if (productOptions[nextIndex].includes("Processador")) {
        setProductCost("R$ 1.799,00");
      } else if (productOptions[nextIndex].includes("Placa Mãe")) {
        setProductCost("R$ 1.299,00");
      } else if (productOptions[nextIndex].includes("Memória")) {
        setProductCost("R$ 399,90");
      } else {
        setProductCost("R$ 799,90");
      }
      
      handleCalculate();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [currentProductIndex, productOptions]);

  // Efeito para atualizar itens do histórico sem efeito de carregamento
  useEffect(() => {
    const interval = setInterval(() => {
      // Adiciona um novo item ao topo do histórico
      const newItem = {
        name: productOptions[Math.floor(Math.random() * productOptions.length)],
        value: `R$ ${(Math.random() * 3000 + 500).toFixed(2).replace('.', ',')}`,
        change: `+${Math.floor(Math.random() * 10) + 1}%`
      };
      
      // Mantém apenas os primeiros dois itens
      setPricingHistory(prev => [newItem, ...prev.slice(0, 1)]);
    }, 7000);
    
    return () => clearInterval(interval);
  }, [productOptions]);

  // Efeito para alternar entre os tipos (Produtos/Serviços)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab(prev => prev === "Produtos" ? "Serviços" : "Produtos");
    }, 8000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-purple-600" />
          <h3 className="text-sm font-medium text-purple-800">Precificação</h3>
        </div>
        <div className="flex gap-1.5">
          <Badge 
            className={`text-xs cursor-pointer transition-all duration-200 ${
              activeTab === 'Produtos' 
                ? 'bg-purple-50 text-purple-600 border-purple-200' 
                : 'bg-gray-50 text-gray-500 border-gray-200'
            }`}
            onClick={() => setActiveTab('Produtos')}
          >
            Produtos
          </Badge>
          <Badge 
            className={`text-xs cursor-pointer transition-all duration-200 ${
              activeTab === 'Serviços' 
                ? 'bg-purple-50 text-purple-600 border-purple-200' 
                : 'bg-gray-50 text-gray-500 border-gray-200'
            }`}
            onClick={() => setActiveTab('Serviços')}
          >
            Serviços
          </Badge>
        </div>
      </div>

      {/* Formulário de cálculo compacto com animação */}
      <Card className="mb-3 p-2 border-purple-100 relative overflow-hidden">
        <motion.div 
          className="grid grid-cols-2 gap-x-2 gap-y-1.5 mb-2 text-xs"
          animate={{ opacity: 1 }}
          initial={{ opacity: 1 }}
          key={productName} // Re-renderiza a animação quando o produto muda
          transition={{ duration: 0.5 }}
        >
          <div>
            <p className="text-gray-500 mb-0.5">Produto</p>
            <motion.div 
              className="h-6 bg-gray-50 rounded border border-gray-200 px-2 flex items-center text-gray-700 overflow-hidden"
              initial={{ backgroundColor: "rgba(243, 244, 246, 1)" }}
              animate={{ 
                backgroundColor: currentProductIndex % 3 === 0 
                  ? "rgba(237, 233, 254, 0.5)" 
                  : "rgba(243, 244, 246, 1)"
              }}
              transition={{ duration: 1 }}
            >
              <motion.span 
                key={productName}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {productName}
              </motion.span>
            </motion.div>
          </div>
          
          <div>
            <p className="text-gray-500 mb-0.5">Custo</p>
            <motion.div 
              className="h-6 bg-gray-50 rounded border border-gray-200 px-2 flex items-center text-gray-700 overflow-hidden"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.span
                key={productCost}
                className="metric-value-changing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {productCost}
              </motion.span>
            </motion.div>
          </div>
        </motion.div>
        
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mb-2 text-xs">
          <div>
            <p className="text-gray-500 mb-0.5">Margem de Lucro</p>
            <div className="h-6 bg-purple-50 rounded border border-purple-200 px-2 flex items-center font-medium text-purple-700">
              {marginPercent}
            </div>
          </div>
          
          <div>
            <p className="text-gray-500 mb-0.5">Forma de Pagamento</p>
            <div className="h-6 bg-gray-50 rounded border border-gray-200 px-2 flex items-center text-gray-700">
              Cartão - 3x
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-1">
          <span className="text-[10px] text-gray-500 flex items-center">
            <Package className="h-3 w-3 mr-0.5" />
            Estado: Novo
          </span>
          <motion.button 
            className="bg-purple-600 text-white text-[10px] px-2 py-1 rounded flex items-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCalculate}
          >
            <Calculator className="h-3 w-3 mr-1" />
            Calcular
          </motion.button>
        </div>
      </Card>
      
      {/* Resultado do cálculo com animação */}
      <Card 
        className={`mb-3 p-2 border-green-100 transition-all duration-300 ${
          resultActive ? 'bg-green-50/30' : 'bg-gray-50/30'
        }`}
      >
        <div className="flex justify-between items-center mb-1.5">
          <p className="text-xs font-medium text-gray-700">Resultado</p>
          <Badge className={`text-[9px] py-0 h-4 ${
            resultActive 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-700'
          }`}>
            {resultActive ? (
              <span className="flex items-center">
                <Check className="h-2.5 w-2.5 mr-0.5" />
                Completo
              </span>
            ) : 'Aguardando'}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Preço de Venda</p>
            <motion.p 
              className="text-lg font-bold text-gray-900"
              key={salePrice}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {salePrice}
            </motion.p>
            <div className="flex items-center mt-0.5 text-[9px] text-green-600">
              <ArrowUpRight className="h-2 w-2 mr-0.5" />
              <span>Margem {marginPercent}</span>
            </div>
          </div>
          
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Parcela (3x)</p>
            <motion.p 
              className="text-lg font-bold text-gray-900"
              key={installmentPrice}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {installmentPrice}
            </motion.p>
            <div className="flex items-center mt-0.5 text-[9px] text-gray-500">
              <CreditCard className="h-2 w-2 mr-0.5" />
              <span>Sem juros</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <motion.div 
            className="bg-white py-1 px-1.5 rounded border border-gray-100"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <p className="text-[9px] text-gray-500">Lucro Bruto</p>
            <motion.p 
              className="text-xs font-semibold text-gray-900"
              key={grossProfit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {grossProfit}
            </motion.p>
          </motion.div>
          <motion.div 
            className="bg-white py-1 px-1.5 rounded border border-gray-100"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <p className="text-[9px] text-gray-500">Lucro Líquido</p>
            <motion.p 
              className="text-xs font-semibold text-gray-900"
              key={netProfit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {netProfit}
            </motion.p>
          </motion.div>
          <motion.div 
            className="bg-white py-1 px-1.5 rounded border border-gray-100"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <p className="text-[9px] text-gray-500">Taxa Cartão</p>
            <motion.p 
              className="text-xs font-semibold text-red-600"
              key={cardTax}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {cardTax}
            </motion.p>
          </motion.div>
        </div>
      </Card>
      
      {/* Histórico de precificações simplificado */}
      <div className="border-t border-gray-100 pt-1.5 relative">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-gray-700">Últimas precificações</p>
          <span className="text-[10px] text-purple-600 cursor-pointer">Ver todas</span>
        </div>
        

        
        <div className="space-y-1">
          {pricingHistory.map((item, index) => (
            <motion.div 
              key={`${item.name}-${index}`} 
              className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 transition-colors cursor-pointer"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <span className="text-xs text-gray-800">{item.name}</span>
              <div className="text-right">
                <span className="text-xs font-medium block">{item.value}</span>
                <span className="text-[9px] text-green-600 flex items-center justify-end">
                  {item.change}
                  <TrendingUp className="h-2 w-2 ml-0.5" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CompactPricingDashboard;