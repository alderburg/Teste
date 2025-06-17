import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { DollarSign, Download, Upload, PlusCircle, Search, Calculator, Edit, Settings, ChevronLeft, ChevronRight, ShoppingBag, Building, Box } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { StarRating } from "@/components/StarRating";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PrecificacaoAlugueisPage() {
  // Versões dos módulos - increment estas quando houver atualização
  const UNITARIO_VERSION = "1.0"; 
  const IMPORTACAO_VERSION = "1.0";
  
  // Obter avaliações salvas e comparar versões
  const [unitarioRating, setUnitarioRating] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('aluguelUnitarioRating');
      const version = localStorage.getItem('aluguelUnitarioVersion');
      
      if (saved && version === UNITARIO_VERSION) {
        return parseInt(saved);
      }
      return null; // Começar sem estrelas marcadas ou se houver nova versão
    } catch (e) {
      return null;
    }
  });
  
  const [importacaoRating, setImportacaoRating] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('aluguelImportacaoRating');
      const version = localStorage.getItem('aluguelImportacaoVersion');
      
      if (saved && version === IMPORTACAO_VERSION) {
        return parseInt(saved);
      }
      return null; // Começar sem estrelas marcadas ou se houver nova versão
    } catch (e) {
      return null;
    }
  });
  
  // Verificar se houve atualização nos módulos
  const [moduleUpdated, setModuleUpdated] = useState(() => {
    const unitarioOldVersion = localStorage.getItem('aluguelUnitarioVersion');
    const importacaoOldVersion = localStorage.getItem('aluguelImportacaoVersion');
    
    return (unitarioOldVersion && unitarioOldVersion !== UNITARIO_VERSION) || 
           (importacaoOldVersion && importacaoOldVersion !== IMPORTACAO_VERSION);
  });
  
  const { toast } = useToast();

  // Função para salvar a avaliação da Precificação Unitária
  const handleUnitarioRating = (rating: number) => {
    setUnitarioRating(rating);
    
    // Salvar no localStorage
    localStorage.setItem('aluguelUnitarioRating', rating.toString());
    localStorage.setItem('aluguelUnitarioVersion', UNITARIO_VERSION);
    
    toast({
      title: "Avaliação salva",
      description: `Sua avaliação de ${rating} ${rating === 1 ? 'estrela' : 'estrelas'} para o Módulo de Precificação Unitária de Aluguéis foi registrada. Obrigado!`,
    });
    // Aqui você poderia enviar a avaliação para o backend
  };

  // Função para salvar a avaliação da Importação de Arquivo de Dados
  const handleImportacaoRating = (rating: number) => {
    setImportacaoRating(rating);
    
    // Salvar no localStorage
    localStorage.setItem('aluguelImportacaoRating', rating.toString());
    localStorage.setItem('aluguelImportacaoVersion', IMPORTACAO_VERSION);
    
    toast({
      title: "Avaliação salva",
      description: `Sua avaliação de ${rating} ${rating === 1 ? 'estrela' : 'estrelas'} para o Módulo de Importação de Aluguéis foi registrada. Obrigado!`,
    });
    // Aqui você poderia enviar a avaliação para o backend
  };
  
  // useEffect para exibir mensagem de atualização quando necessário
  useEffect(() => {
    if (moduleUpdated) {
      toast({
        title: "Módulos atualizados!",
        description: "Os módulos de precificação de aluguéis foram atualizados. Por favor, avalie novamente a experiência de uso!",
        variant: "default",
        duration: 5000,
      });
      
      // Resetar os states
      setUnitarioRating(null);
      setImportacaoRating(null);
      setModuleUpdated(false);
    }
  }, [moduleUpdated, toast]);

  // Estado para o filtro de busca
  const [filtro, setFiltro] = useState("");
  
  // Estados para paginação
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [itensPorPagina, setItensPorPagina] = useState(5);
  
  // Aluguéis originais - array vazio para demonstrar o estado vazio
  const alugueisOriginais: Array<{ 
    id: string; 
    nome: string; 
    valorAquisicao: number; 
    precoAluguel: number; 
    roiMensal: number 
  }> = [];
  
  // Estado para itens filtrados
  const [itensFiltrados, setItensFiltrados] = useState(alugueisOriginais);
  
  // Função para lidar com a busca
  const handleBusca = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setFiltro(valor);
    setPaginaAtual(0); // Resetar para a primeira página
    
    // Filtrar itens
    if (valor.trim() === "") {
      setItensFiltrados(alugueisOriginais);
    } else {
      const resultados = alugueisOriginais.filter(item => 
        item.nome.toLowerCase().includes(valor.toLowerCase()) || 
        item.id.toLowerCase().includes(valor.toLowerCase())
      );
      setItensFiltrados(resultados);
    }
  };
  
  // Função para mudar o número de itens por página
  const handleChangeItensPorPagina = (value: string) => {
    setItensPorPagina(parseInt(value));
    setPaginaAtual(0); // Resetar para a primeira página
  };
  
  // Calcular total de páginas
  const totalPaginas = Math.ceil(itensFiltrados.length / itensPorPagina);
  
  // Função para página anterior
  const paginaAnterior = () => {
    setPaginaAtual(prevPage => Math.max(0, prevPage - 1));
  };
  
  // Função para próxima página
  const proximaPagina = () => {
    setPaginaAtual(prevPage => Math.min(totalPaginas - 1, prevPage + 1));
  };
  
  // Obter itens para a página atual
  const itensPaginados = itensFiltrados.slice(
    paginaAtual * itensPorPagina,
    (paginaAtual + 1) * itensPorPagina
  );
  
  // Referência para o container da tabela
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // Centralizar scroll da tabela na versão mobile
  useEffect(() => {
    // Verificar se a tabela está vazia
    const isTabelaVazia = itensFiltrados.length === 0;
    
    // Centralizar a tabela, principalmente quando estiver vazia
    if (tableContainerRef.current) {
      const container = tableContainerRef.current;
      
      // Aguardar o próximo ciclo de renderização para garantir que a tabela foi renderizada
      setTimeout(() => {
        const tableWidth = container.scrollWidth;
        const containerWidth = container.clientWidth;
        
        // Sempre centralizar o scroll, independente do tamanho da tela
        if (tableWidth > containerWidth) {
          container.scrollLeft = 0; // Resetar para o início para visualização adequada
        }
        
        // Forçar centralização mesmo se o conteúdo não for maior que o container
        if (isTabelaVazia) {
          container.scrollLeft = 0; // Garantir que o scroll está totalmente à esquerda para visualização correta
        }
      }, 800); // Aumentado para dar mais tempo para renderização completa
    }
  }, [itensFiltrados.length]);

  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center justify-between pt-3 sm:pt-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 sm:mt-0">
            <span className="hidden sm:inline">Precificação de Aluguéis</span>
            <span className="inline sm:hidden">Precificação - Aluguéis</span>
          </h2>
          <p className="text-gray-500">Gerencie os preços dos seus aluguéis de equipamentos</p>
        </div>
        <div className="flex space-x-2 mt-2 sm:mt-0">
          <Link href="/cadastros/alugueis">
            <Button className="flex items-center bg-purple-600 hover:bg-purple-700 text-white">
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Aluguel
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Precificação Unitária</CardTitle>
            <CardDescription>
              Precifique seu aluguel de forma rápida e ágil, sem necessidade de fazer o seu cadastro.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-gray-500 mb-6">
              A precificação unitária de aluguéis é utilizada para calcular o valor mensal ideal de um equipamento específico considerando seu valor de aquisição e ROI desejado.
            </p>
            
            <div className="mx-2 border-t border-gray-200 pt-4 mt-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500">Sua nota:</span>
                  <StarRating
                    totalStars={5}
                    initialRating={unitarioRating || 0}
                    onRatingChange={handleUnitarioRating}
                    size={16}
                    moduleType="Precificação Unitária de Aluguéis"
                  />
                </div>
                <Link href="/precificacao/alugueis/unitario">
                  <Button className="flex items-center bg-purple-600 hover:bg-purple-700 text-white">
                    <DollarSign className="mr-2 h-4 w-4" />
                    <span>Precificar</span>
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Importar Arquivo de Dados</CardTitle>
            <CardDescription>
              Importe equipamentos de seu arquivo de dados
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-gray-500 mb-6">
              Importe dados dos seus equipamentos para aluguel e ajuste os valores de todos os itens. Com a importação, você consegue ajustar todos eles de forma fácil, sem a necessidade de recadastrar.
            </p>
            
            <div className="mx-2 border-t border-gray-200 pt-4 mt-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500">Sua nota:</span>
                  <StarRating
                    totalStars={5}
                    initialRating={importacaoRating || 0}
                    onRatingChange={handleImportacaoRating}
                    size={16}
                    moduleType="Importação de Aluguéis"
                  />
                </div>
                <Link href="/precificacao/alugueis/importacao">
                  <Button className="flex items-center bg-purple-600 hover:bg-purple-700 text-white">
                    <Upload className="mr-2 h-4 w-4" />
                    Importar
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aluguéis Cadastrados</CardTitle>
          <CardDescription>
            Lista de equipamentos com seus valores e ROI mensal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 mt-2">
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                id="search"
                placeholder="Buscar por nome ou código do aluguel..."
                value={filtro}
                onChange={handleBusca}
                className="pl-9 w-full border-gray-200 rounded-md h-10"
              />
            </div>
          </div>

          {itensFiltrados.length === 0 ? (
            // Para estado vazio, mostrar apenas o conteúdo sem a tabela
            <div className="flex flex-col items-center justify-center py-12">
              {filtro ? (
                <>
                  <Box className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1 text-center">
                    Nenhum aluguel encontrado
                  </h3>
                  <p className="text-gray-500 mb-4 text-center">
                    Nenhum aluguel encontrado com os critérios de busca.
                  </p>
                </>
              ) : (
                <>
                  <div className="h-16 w-16 mx-auto text-gray-300 mb-4">
                    <Box className="h-16 w-16" />
                  </div>
                  <h2 className="text-xl font-medium text-gray-900 mb-2 text-center">
                    Nenhum aluguel cadastrado
                  </h2>
                  <p className="text-gray-500 mb-5 text-center">
                    Cadastre seu primeiro aluguel.
                  </p>
                  <Link href="/cadastros/alugueis">
                    <Button 
                      className="bg-purple-600 hover:bg-purple-700 h-[42px] px-6 rounded-md"
                    >
                      <PlusCircle className="mr-2 h-5 w-5" />
                      Novo Aluguel
                    </Button>
                  </Link>
                </>
              )}
            </div>
          ) : (
            // Somente mostrar a tabela quando houver dados
            <div className="overflow-visible" ref={tableContainerRef}>
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[15%]">Código</TableHead>
                    <TableHead className="w-[25%]">Item</TableHead>
                    <TableHead className="w-[15%]">Valor Aquisição</TableHead>
                    <TableHead className="w-[15%]">Preço Aluguel</TableHead>
                    <TableHead className="w-[15%]">ROI Mensal</TableHead>
                    <TableHead className="w-[15%]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensPaginados.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>{item.nome}</TableCell>
                      <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorAquisicao)}</TableCell>
                      <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.precoAluguel)}</TableCell>
                      <TableCell>{item.roiMensal}%</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Link href={`/precificacao/alugueis/unitario?id=${item.id}`}>
                                    <Calculator className="h-4 w-4 text-purple-600" />
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Calcular preço</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Link href={`/cadastros/alugueis?id=${item.id}`}>
                                    <Edit className="h-4 w-4 text-purple-600" />
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Editar aluguel</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-4">
            <div>
              <Select
                value={itensPorPagina.toString()}
                onValueChange={handleChangeItensPorPagina}
              >
                <SelectTrigger className="h-10 w-[80px]">
                  <SelectValue placeholder="5" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-1">
              <Button
                variant="outline" 
                size="icon"
                className="h-10 w-10 rounded-md"
                onClick={paginaAnterior}
                disabled={paginaAtual === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <p className="text-sm text-gray-500 min-w-[30px] text-center px-0">
                {itensFiltrados.length > 0 
                  ? `${paginaAtual}/${totalPaginas-1}`
                  : "0/0"
                }
              </p>
              
              <Button 
                variant="outline" 
                size="icon"
                className="h-10 w-10 rounded-md"
                onClick={proximaPagina}
                disabled={paginaAtual >= totalPaginas - 1 || totalPaginas === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}