import React, { useState, useEffect } from 'react';
import { Clipboard, Search, Package, Truck, Star, Clock, Plus, Filter, Tag, ArrowUpRight } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const CompactManagementDashboard: React.FC = () => {
  // Estados para controlar as animações e valores
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Produtos");
  const [isSearching, setIsSearching] = useState(false);
  const [products, setProducts] = useState([
    { 
      name: "Monitor 24\" LED Full HD", 
      status: "Em estoque",
      statusColor: "green",
      cost: "R$ 499,90", 
      price: "R$ 699,90", 
      starred: true,
      lastUpdate: "3h"
    },
    { 
      name: "SSD 480GB", 
      status: "Em estoque",
      statusColor: "green",
      cost: "R$ 230,00", 
      price: "R$ 349,90", 
      starred: false,
      lastUpdate: "1h" 
    },
    { 
      name: "Memória RAM 16GB DDR4", 
      status: "Baixo estoque",
      statusColor: "yellow",
      cost: "R$ 345,50", 
      price: "R$ 499,90", 
      starred: false,
      lastUpdate: "5h"
    }
  ]);
  const [totalProducts, setTotalProducts] = useState("124");
  const [totalIncrement, setTotalIncrement] = useState("+38");
  const [averageMargin, setAverageMargin] = useState("32.4%");
  const [marginIncrement, setMarginIncrement] = useState("+2.1%");
  const [stockValue, setStockValue] = useState("R$ 78.4k");
  const [updateTime, setUpdateTime] = useState("14:35");
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [productPool] = useState([
    { 
      name: "Monitor 24\" LED Full HD", 
      status: "Em estoque",
      statusColor: "green",
      cost: "R$ 499,90", 
      price: "R$ 699,90"
    },
    { 
      name: "SSD 480GB", 
      status: "Em estoque",
      statusColor: "green",
      cost: "R$ 230,00", 
      price: "R$ 349,90"
    },
    { 
      name: "Memória RAM 16GB DDR4", 
      status: "Baixo estoque",
      statusColor: "yellow",
      cost: "R$ 345,50", 
      price: "R$ 499,90"
    },
    { 
      name: "Notebook Gamer 15\"", 
      status: "Em estoque",
      statusColor: "green",
      cost: "R$ 4.299,00", 
      price: "R$ 5.999,00"
    },
    { 
      name: "Teclado Mecânico RGB", 
      status: "Em estoque",
      statusColor: "green",
      cost: "R$ 189,90", 
      price: "R$ 299,90"
    },
    { 
      name: "Placa de Vídeo RTX 3060", 
      status: "Baixo estoque",
      statusColor: "yellow",
      cost: "R$ 1.899,00", 
      price: "R$ 2.499,00"
    },
    { 
      name: "Gabinete Gamer ATX", 
      status: "Esgotado",
      statusColor: "red",
      cost: "R$ 299,90", 
      price: "R$ 449,90"
    }
  ]);

  // Função para simular favoritar um produto
  const toggleStar = (index: number) => {
    const updatedProducts = [...products];
    updatedProducts[index].starred = !updatedProducts[index].starred;
    setProducts(updatedProducts);
  };

  // Efeito para alternar entre produtos e serviços
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab(prev => prev === "Produtos" ? "Serviços" : "Produtos");
      
      // Atualiza o totalizador de acordo com a tab
      if (activeTab === "Produtos") {
        setTotalProducts("78");
        setTotalIncrement("+12");
      } else {
        setTotalProducts("124");
        setTotalIncrement("+38");
      }
    }, 6000);
    
    return () => clearInterval(interval);
  }, [activeTab]);

  // Efeito para atualizar produtos periodicamente sem efeitos de carregamento
  useEffect(() => {
    const interval = setInterval(() => {
      // Seleciona um produto aleatório do pool para adicionar
      const randomProduct = productPool[Math.floor(Math.random() * productPool.length)];
      
      // Cria uma cópia com dados levemente diferentes
      const newProduct = {
        ...randomProduct,
        starred: Math.random() > 0.8, // 20% de chance de ser favorito
        lastUpdate: `${Math.floor(Math.random() * 5) + 1}h`
      };
      
      // Atualiza a lista de produtos (mantém limite de 3 itens)
      setProducts(prev => [newProduct, ...prev.slice(0, 2)]);
      
      // Atualiza outras estatísticas
      const newTotalValue = parseInt(totalProducts.replace(/\D/g, '')) + 1;
      setTotalProducts(newTotalValue.toString());
      
      const newMargin = (Math.random() * 5 + 30).toFixed(1);
      setAverageMargin(`${newMargin}%`);
      
      const newMarginIncrement = (Math.random() * 4 - 2).toFixed(1);
      const prefix = newMarginIncrement.startsWith("-") ? "" : "+";
      setMarginIncrement(`${prefix}${newMarginIncrement}%`);
      
      const newStockValue = (Math.random() * 20 + 70).toFixed(1);
      setStockValue(`R$ ${newStockValue}k`);
      
      // Atualiza o horário
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setUpdateTime(`${hours}:${minutes}`);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [productPool, totalProducts]);

  // Efeito para destacar um item aleatoriamente
  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * products.length);
      setHighlightIndex(randomIndex);
      
      setTimeout(() => setHighlightIndex(null), 500);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [products]);

  // Simula a busca quando o usuário digita
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length > 0) {
      setIsSearching(true);
      
      setTimeout(() => {
        setIsSearching(false);
      }, 500);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clipboard className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-medium text-emerald-800">Cadastros</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.05 }}
          >
            <Search className={`h-3 w-3 absolute left-1.5 top-1/2 transform -translate-y-1/2 ${isSearching ? 'text-emerald-500 animate-pulse' : 'text-gray-400'}`} />
            <input 
              type="text" 
              placeholder="Buscar"
              value={searchQuery}
              onChange={handleSearch}
              className="bg-gray-50 border border-gray-200 rounded-md pl-6 py-1 text-xs pr-2 w-24 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all duration-200"
            />
          </motion.div>
          
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="h-5 w-5 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
          >
            <Filter className="h-3 w-3" />
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="h-5 w-5 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
          >
            <Plus className="h-3 w-3" />
          </motion.button>
        </div>
      </div>

      {/* Abas de navegação com animação */}
      <div className="flex border-b border-gray-200 mb-2 text-xs">
        <motion.div 
          className={`flex items-center py-1 px-2.5 cursor-pointer transition-colors duration-200 ${activeTab === 'Produtos' ? 'border-b-2 border-emerald-600 text-emerald-600 font-medium' : 'text-gray-500'}`}
          onClick={() => setActiveTab('Produtos')}
          whileHover={{ backgroundColor: "rgba(16, 185, 129, 0.05)" }}
        >
          <Package className="h-3 w-3 mr-1" />
          Produtos
        </motion.div>
        <motion.div 
          className={`flex items-center py-1 px-2.5 cursor-pointer transition-colors duration-200 ${activeTab === 'Serviços' ? 'border-b-2 border-emerald-600 text-emerald-600 font-medium' : 'text-gray-500'}`}
          onClick={() => setActiveTab('Serviços')}
          whileHover={{ backgroundColor: "rgba(16, 185, 129, 0.05)" }}
        >
          <Truck className="h-3 w-3 mr-1" />
          Serviços
        </motion.div>
      </div>

      {/* Tabela de produtos com animação */}
      <div className="mb-3 relative">
        <div className="bg-gray-50 border-y border-gray-200 py-1 px-2">
          <div className="grid grid-cols-8 text-[9px] font-medium text-gray-500">
            <div className="col-span-4">Produto</div>
            <div className="col-span-2 text-right">Custo</div>
            <div className="col-span-2 text-right">Venda</div>
          </div>
        </div>
        

        
        <div className="divide-y divide-gray-100">
          {products.map((item, index) => (
            <motion.div 
              key={`${item.name}-${index}`}
              className={`grid grid-cols-8 items-center text-xs py-1.5 px-2 hover:bg-gray-50 transition-colors cursor-pointer ${highlightIndex === index ? 'bg-emerald-50/50' : ''}`}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="col-span-4 flex items-center">
                <motion.button 
                  className={`mr-1.5 text-${item.starred ? 'yellow-500' : 'gray-300'} hover:text-yellow-500 transition-colors`}
                  onClick={() => toggleStar(index)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Star className="h-3 w-3" fill={item.starred ? "#EAB308" : "none"} />
                </motion.button>
                <div>
                  <p className="font-medium text-gray-900 text-xs line-clamp-1">{item.name}</p>
                  <div className="flex items-center mt-0.5">
                    <Badge 
                      className={`text-[9px] py-0 px-1 h-3.5 ${
                        item.statusColor === 'green' ? 'bg-green-50 text-green-700' :
                        item.statusColor === 'yellow' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-red-50 text-red-700'
                      }`}
                    >
                      {item.status}
                    </Badge>
                    <motion.span 
                      className="ml-1.5 text-[9px] text-gray-500 flex items-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Clock className="h-2 w-2 mr-0.5" />
                      {item.lastUpdate}
                    </motion.span>
                  </div>
                </div>
              </div>
              <div className="col-span-2 text-right text-xs font-medium">{item.cost}</div>
              <div className="col-span-2 text-right text-xs font-medium text-emerald-600">{item.price}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Estatísticas com animação */}
      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        <motion.div 
          className="bg-gray-50 rounded border border-gray-100 p-1.5 relative overflow-hidden"
          whileHover={{ backgroundColor: "rgba(16, 185, 129, 0.05)" }}
        >
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-gray-600">Total {activeTab}</span>
          </div>
          <div className="flex items-center justify-between">
            <motion.span 
              className="text-sm font-semibold"
              key={totalProducts}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {totalProducts}
            </motion.span>
            <motion.span 
              className="text-[9px] text-blue-600 flex items-center"
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ArrowUpRight className="h-2 w-2 mr-0.5" />
              {totalIncrement}
            </motion.span>
          </div>
          
          {/* Barra de progresso decorativa */}
          <motion.div 
            className="absolute bottom-0 left-0 h-0.5 bg-blue-500/30"
            initial={{ width: 0 }}
            animate={{ width: `${Math.random() * 60 + 40}%` }}
            transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
          />
        </motion.div>
        
        <motion.div 
          className="bg-gray-50 rounded border border-gray-100 p-1.5 relative overflow-hidden"
          whileHover={{ backgroundColor: "rgba(16, 185, 129, 0.05)" }}
        >
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-gray-600">Margem Média</span>
          </div>
          <div className="flex items-center justify-between">
            <motion.span 
              className="text-sm font-semibold"
              key={averageMargin}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {averageMargin}
            </motion.span>
            <motion.span 
              className={`text-[9px] ${
                marginIncrement.startsWith('+') ? 'text-emerald-600' : 'text-red-500'
              } flex items-center`}
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ArrowUpRight className="h-2 w-2 mr-0.5" />
              {marginIncrement}
            </motion.span>
          </div>
          
          {/* Barra de progresso decorativa */}
          <motion.div 
            className="absolute bottom-0 left-0 h-0.5 bg-emerald-500/30"
            initial={{ width: 0 }}
            animate={{ width: `${Math.random() * 40 + 60}%` }}
            transition={{ duration: 1.8, repeat: Infinity, repeatType: "reverse" }}
          />
        </motion.div>
        
        <motion.div 
          className="bg-gray-50 rounded border border-gray-100 p-1.5 relative overflow-hidden"
          whileHover={{ backgroundColor: "rgba(16, 185, 129, 0.05)" }}
        >
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-gray-600">Valor Estoque</span>
          </div>
          <div className="flex items-center justify-between">
            <motion.span 
              className="text-sm font-semibold"
              key={stockValue}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {stockValue}
            </motion.span>
            <Badge className="text-[8px] py-0 h-3.5 bg-purple-50 text-purple-700">
              Ativo
            </Badge>
          </div>
          
          {/* Barra de progresso decorativa */}
          <motion.div 
            className="absolute bottom-0 left-0 h-0.5 bg-purple-500/30"
            initial={{ width: 0 }}
            animate={{ width: `${Math.random() * 50 + 50}%` }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
          />
        </motion.div>
      </div>

      {/* Rodapé com ações */}
      <div className="flex justify-between text-[9px] text-gray-500 border-t border-gray-100 pt-1.5">
        <div className="flex items-center">
          <Package className="h-2.5 w-2.5 mr-0.5" />
          <span>{totalProducts} produtos • 78 serviços</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button 
            className="flex items-center text-emerald-600 hover:text-emerald-700 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Tag className="h-2.5 w-2.5 mr-0.5" />
            <span>Categorias</span>
          </motion.button>
          <span>Atualizado: {updateTime}</span>
        </div>
      </div>
    </div>
  );
};

export default CompactManagementDashboard;