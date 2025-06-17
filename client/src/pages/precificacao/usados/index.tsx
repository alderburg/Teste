import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { DollarSign, Download, Upload, PlusCircle, Search, Calculator, Edit, Settings, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
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

export default function PrecificacaoUsadosPage() {
  // Versões dos módulos - increment estas quando houver atualização
  const UNITARIO_VERSION = "1.0";
  const IMPORTACAO_VERSION = "1.0";
  
  // Obter avaliações salvas e comparar versões
  const [unitarioRating, setUnitarioRating] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('usadosUnitarioRating');
      const version = localStorage.getItem('usadosUnitarioVersion');
      
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
      const saved = localStorage.getItem('usadosImportacaoRating');
      const version = localStorage.getItem('usadosImportacaoVersion');
      
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
    const unitarioOldVersion = localStorage.getItem('usadosUnitarioVersion');
    const importacaoOldVersion = localStorage.getItem('usadosImportacaoVersion');
    
    return (unitarioOldVersion && unitarioOldVersion !== UNITARIO_VERSION) || 
           (importacaoOldVersion && importacaoOldVersion !== IMPORTACAO_VERSION);
  });
  
  const { toast } = useToast();

  // Função para salvar a avaliação da Precificação Unitária
  const handleUnitarioRating = (rating: number) => {
    setUnitarioRating(rating);
    
    // Salvar no localStorage
    localStorage.setItem('usadosUnitarioRating', rating.toString());
    localStorage.setItem('usadosUnitarioVersion', UNITARIO_VERSION);
    
    toast({
      title: "Avaliação salva",
      description: `Sua avaliação de ${rating} ${rating === 1 ? 'estrela' : 'estrelas'} para o Módulo de Precificação Unitária de Usados foi registrada. Obrigado!`,
    });
    // Aqui você poderia enviar a avaliação para o backend
  };

  // Função para salvar a avaliação da Importação de Arquivo de Dados
  const handleImportacaoRating = (rating: number) => {
    setImportacaoRating(rating);
    
    // Salvar no localStorage
    localStorage.setItem('usadosImportacaoRating', rating.toString());
    localStorage.setItem('usadosImportacaoVersion', IMPORTACAO_VERSION);
    
    toast({
      title: "Avaliação salva",
      description: `Sua avaliação de ${rating} ${rating === 1 ? 'estrela' : 'estrelas'} para o Módulo de Importação de Usados foi registrada. Obrigado!`,
    });
    // Aqui você poderia enviar a avaliação para o backend
  };
  
  // Mostrar notificação de atualização quando o módulo for atualizado
  useEffect(() => {
    if (moduleUpdated) {
      toast({
        title: "Módulos atualizados!",
        description: "Os módulos de precificação foram atualizados. Por favor, avalie novamente a experiência de uso!",
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
  
  // Produtos originais
  const produtosOriginais: { 
    id: string; 
    nome: string; 
    estado: string;
    valorCompra: number; 
    precoVenda: number; 
    margem: number 
  }[] = [];
  
  // Estado para produtos filtrados
  const [produtosFiltrados, setProdutosFiltrados] = useState(produtosOriginais);
  
  // Função para lidar com a busca
  const handleBusca = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setFiltro(valor);
    setPaginaAtual(0); // Resetar para a primeira página
    
    // Filtrar produtos
    if (valor.trim() === "") {
      setProdutosFiltrados(produtosOriginais);
    } else {
      const resultados = produtosOriginais.filter(produto => 
        produto.nome.toLowerCase().includes(valor.toLowerCase()) || 
        produto.id.toLowerCase().includes(valor.toLowerCase()) ||
        produto.estado.toLowerCase().includes(valor.toLowerCase())
      );
      setProdutosFiltrados(resultados);
    }
  };
  
  // Função para mudar o número de itens por página
  const handleChangeItensPorPagina = (value: string) => {
    setItensPorPagina(parseInt(value));
    setPaginaAtual(0); // Resetar para a primeira página
  };
  
  // Calcular total de páginas
  const totalPaginas = Math.ceil(produtosFiltrados.length / itensPorPagina);
  
  // Função para página anterior
  const paginaAnterior = () => {
    setPaginaAtual(prevPage => Math.max(0, prevPage - 1));
  };
  
  // Função para próxima página
  const proximaPagina = () => {
    setPaginaAtual(prevPage => Math.min(totalPaginas - 1, prevPage + 1));
  };
  
  // Obter produtos para a página atual
  const produtosPaginados = produtosFiltrados.slice(
    paginaAtual * itensPorPagina,
    (paginaAtual + 1) * itensPorPagina
  );
  
  // Referência para o container da tabela
  const tableContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center justify-between pt-3 sm:pt-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 sm:mt-0">
            <span className="hidden sm:inline">Precificação de Produtos Usados</span>
            <span className="inline sm:hidden">Precificação - Usados</span>
          </h2>
          <p className="text-gray-500">
            <span className="hidden sm:inline">Gerencie os preços dos seus produtos usados</span>
            <span className="inline sm:hidden">Gerencie os preços dos seus<br />produtos usados</span>
          </p>
        </div>
        <div className="flex space-x-2 mt-2 sm:mt-0">
          <Link href="/cadastros/produtos">
            <Button className="flex items-center bg-orange-600 hover:bg-orange-700 text-white">
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Precificação Unitária</CardTitle>
            <CardDescription>
              Precifique seu produto de forma rápida e ágil, sem necessidade de fazer o seu cadastro.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-gray-500 mb-6">
              A precificação unitária é utilizada para precificar apenas um produto específico ou calcular um percentual de lucro para determinada venda total.
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
                    moduleType="Precificação Unitária de Usados"
                  />
                </div>
                <Link href="/precificacao/usados/unitario">
                  <Button className="flex items-center bg-orange-600 hover:bg-orange-700 text-white">
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
              Importe produtos de seu arquivo de dados
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-gray-500 mb-6">
              Importe dados dos seus produtos e ajuste os valores de todos os itens. Com a importação, você consegue ajustar todos eles de forma fácil, sem a necessidade de recadastrar.
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
                    moduleType="Importação de Usados"
                  />
                </div>
                <Link href="/precificacao/usados/importacao">
                  <Button className="flex items-center bg-orange-600 hover:bg-orange-700 text-white">
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
          <CardTitle>Produtos Cadastrados</CardTitle>
          <CardDescription>
            Lista de produtos usados com seus preços e margens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative flex pt-1">
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                id="search"
                placeholder="Buscar por nome, código ou estado do produto..."
                value={filtro}
                onChange={handleBusca}
                className="pl-8 w-full"
              />
            </div>
          </div>

          {produtosFiltrados.length === 0 ? (
            // Para estado vazio, mostrar apenas o conteúdo sem a tabela
            <div className="flex flex-col items-center justify-center py-12">
              {filtro ? (
                <>
                  <ShoppingBag className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1 text-center">
                    Nenhum produto encontrado
                  </h3>
                  <p className="text-gray-500 mb-4 text-center">
                    Nenhum produto encontrado com os critérios de busca.
                  </p>
                </>
              ) : (
                <>
                  <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h2 className="text-xl font-medium text-gray-900 mb-2 text-center">
                    Nenhum produto cadastrado
                  </h2>
                  <p className="text-gray-500 mb-5 text-center">
                    Cadastre seu primeiro produto usado.
                  </p>
                  <Link href="/cadastros/produtos">
                    <Button 
                      className="bg-orange-600 hover:bg-orange-700 h-12 px-6"
                    >
                      <PlusCircle className="mr-2 h-5 w-5" />
                      Novo Produto
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
                    <TableHead className="w-[10%]">Código</TableHead>
                    <TableHead className="w-[20%]">Produto</TableHead>
                    <TableHead className="w-[10%]">Estado</TableHead>
                    <TableHead className="w-[15%]">Valor Compra</TableHead>
                    <TableHead className="w-[15%]">Preço Venda</TableHead>
                    <TableHead className="w-[15%]">Lucro (%)</TableHead>
                    <TableHead className="w-[15%]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtosPaginados.map(produto => (
                    <TableRow key={produto.id}>
                      <TableCell className="font-medium">{produto.id}</TableCell>
                      <TableCell>{produto.nome}</TableCell>
                      <TableCell>{produto.estado}</TableCell>
                      <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.valorCompra)}</TableCell>
                      <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.precoVenda)}</TableCell>
                      <TableCell>{produto.margem}%</TableCell>
                      <TableCell className="flex space-x-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/precificacao/usados/unitario?produtoId=${produto.id}`}>
                                <Button variant="ghost" size="icon">
                                  <Calculator className="h-4 w-4 text-blue-600" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Calcular novo preço</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/cadastros/produtos?id=${produto.id}`}>
                                <Button variant="ghost" size="icon">
                                  <Edit className="h-4 w-4 text-amber-600" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar cadastro</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="flex-shrink-0">
              <Select
                value={itensPorPagina.toString()}
                onValueChange={handleChangeItensPorPagina}
              >
                <SelectTrigger className="w-16 rounded-md border shadow-sm">
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
            
            <div className="flex items-center space-x-0">
              <Button
                variant="outline"
                size="icon"
                className="rounded-md h-10 w-10 border shadow-sm"
                onClick={paginaAnterior}
                disabled={paginaAtual === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="text-sm text-muted-foreground min-w-[35px] text-center px-0">
                {produtosFiltrados.length > 0 && totalPaginas > 0
                  ? `${paginaAtual + 1}/${totalPaginas}`
                  : "0/0"
                }
              </div>
              
              <Button 
                variant="outline" 
                size="icon"
                className="rounded-md h-10 w-10 border shadow-sm"
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