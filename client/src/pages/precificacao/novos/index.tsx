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

export default function PrecificacaoNovosPage() {
  // Versões dos módulos - increment estas quando houver atualização
  const UNITARIO_VERSION = "1.1"; // Atualizado para simular um update do módulo
  const IMPORTACAO_VERSION = "1.0";

  // Obter avaliações salvas e comparar versões
  const [unitarioRating, setUnitarioRating] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('unitarioRating');
      const version = localStorage.getItem('unitarioVersion');

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
      const saved = localStorage.getItem('importacaoRating');
      const version = localStorage.getItem('importacaoVersion');

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
    const unitarioOldVersion = localStorage.getItem('unitarioVersion');
    const importacaoOldVersion = localStorage.getItem('importacaoVersion');

    return (unitarioOldVersion && unitarioOldVersion !== UNITARIO_VERSION) || 
           (importacaoOldVersion && importacaoOldVersion !== IMPORTACAO_VERSION);
  });

  const { toast } = useToast();

  // Função para salvar a avaliação da Precificação Unitária
  const handleUnitarioRating = (rating: number) => {
    setUnitarioRating(rating);

    // Salvar no localStorage
    localStorage.setItem('unitarioRating', rating.toString());
    localStorage.setItem('unitarioVersion', UNITARIO_VERSION);

    toast({
      title: "Avaliação salva",
      description: `Sua avaliação de ${rating} ${rating === 1 ? 'estrela' : 'estrelas'} para o Módulo de Precificação Unitária de Novos foi registrada. Obrigado!`,
    });
    // Aqui você poderia enviar a avaliação para o backend
  };

  // Função para salvar a avaliação da Importação de Arquivo de Dados
  const handleImportacaoRating = (rating: number) => {
    setImportacaoRating(rating);

    // Salvar no localStorage
    localStorage.setItem('importacaoRating', rating.toString());
    localStorage.setItem('importacaoVersion', IMPORTACAO_VERSION);

    toast({
      title: "Avaliação salva",
      description: `Sua avaliação de ${rating} ${rating === 1 ? 'estrela' : 'estrelas'} para o Módulo de Importação de Novos foi registrada. Obrigado!`,
    });
    // Aqui você poderia enviar a avaliação para o backend
  };

  // Mostrar notificação de atualização quando o módulo for atualizado
  // useEffect para exibir mensagem de atualização quando necessário
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
    custo: number; 
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
        produto.id.toLowerCase().includes(valor.toLowerCase())
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

  // Centralizar scroll da tabela na versão mobile
  useEffect(() => {
    // Verificar se a tabela está vazia
    const isTabelaVazia = produtosFiltrados.length === 0;

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
  }, [produtosFiltrados.length]);

  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center justify-between pt-3 sm:pt-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 sm:mt-0">
            <span className="hidden sm:inline">Precificação de Produtos Novos</span>
            <span className="inline sm:hidden">Precificação - Novos</span>
          </h2>
          <p className="text-gray-500">Gerencie os preços dos seus produtos novos</p>
        </div>
        <div className="flex space-x-2 mt-2 sm:mt-0">
          <Link href="/cadastros/produtos">
            <Button className="flex items-center bg-blue-600 hover:bg-blue-700 text-white">
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
              A precificação unitária é utilizada para precificar apenas um produto específico ou calcular uma margem de lucro para determinada venda total.
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
                    moduleType="Precificação Unitária de Novos"
                  />
                </div>
                <Link href="/precificacao/novos/unitario">
                  <Button className="flex items-center bg-blue-600 hover:bg-blue-700 text-white">
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
                    moduleType="Importação de Novos"
                  />
                </div>
                <Link href="/precificacao/novos/importacao">
                  <Button className="flex items-center bg-blue-600 hover:bg-blue-700 text-white">
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
            Lista de produtos com seus preços e margens
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
                placeholder="Buscar por nome ou código do produto..."
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
                    Cadastre seu primeiro produto.
                  </p>
                  <Link href="/cadastros/produtos">
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 h-12 px-6"
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
                    <TableHead className="w-[15%]">Código</TableHead>
                    <TableHead className="w-[25%]">Produto</TableHead>
                    <TableHead className="w-[15%]">Custo</TableHead>
                    <TableHead className="w-[15%]">Preço Venda</TableHead>
                    <TableHead className="w-[15%]">Margem</TableHead>
                    <TableHead className="w-[15%]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtosPaginados.map(produto => (
                    <TableRow key={produto.id}>
                      <TableCell className="font-medium">{produto.id}</TableCell>
                      <TableCell>{produto.nome}</TableCell>
                      <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.custo)}</TableCell>
                      <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.precoVenda)}</TableCell>
                      <TableCell>{produto.margem}%</TableCell>
                      <TableCell className="flex space-x-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/precificacao/novos/unitario?produtoId=${produto.id}`}>
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
            <div>
              <Select
                value={itensPorPagina.toString()}
                onValueChange={handleChangeItensPorPagina}
              >
                <SelectTrigger className="h-10 w-[70px]">
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

            <div className="flex items-center space-x-0.5">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-md"
                onClick={paginaAnterior}
                disabled={paginaAtual === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="text-sm px-1">
                {produtosFiltrados.length > 0 && totalPaginas > 0
                  ? `${paginaAtual + 1}/${totalPaginas}`
                  : "0/0"
                }
              </span>

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