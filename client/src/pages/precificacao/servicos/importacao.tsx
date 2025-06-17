import React, { useState, useEffect, useRef, ChangeEvent } from "react";
// Removido DashboardLayout para usar layout persistente
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ArrowLeft, Calculator, Check, FileSpreadsheet, FileUp, FileText, Plus, Upload, Save, Search, ChevronLeft, ChevronRight, FileInput, Edit, Download, Loader2, Trash, DollarSign, Trophy, PartyPopper, ThumbsUp, Star, Clock } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

// Interface para arquivo de dados
interface NotaFiscal {
  id: number;
  numero: string;
  dataEmissao: string;
  dataImportacao: string;
  fornecedor: string;
  valorTotal: number;
  status: 'nao_precificada' | 'parcialmente_precificada' | 'totalmente_precificada' | 'importado';
}

// Interface para arquivo de dados
interface ArquivoDados {
  id: number;
  codigo: string;
  dataEmissao: string;
  dataImportacao: string;
  descricao: string;
  valorTotal: number;
  status: 'nao_precificada' | 'parcialmente_precificada' | 'totalmente_precificada' | 'importado';
}

// Interface para serviço importado
interface ServicoImportado {
  codigo: string;
  descricao: string;
  quantidade: number;
  valorCompra: number;
  valorVenda: number;
  margem: number | string; // Pode ser número ou string vazia
  calculado: boolean;
  salvo: boolean;
  duracao: string; // Duração do serviço em formato de texto (ex: "2h", "1h30")
}

export default function PrecificacaoServicosImportacaoPage() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [descricaoArquivo, setDescricaoArquivo] = useState("");
  const [importando, setImportando] = useState(false);
  const [servicosImportados, setServicosImportados] = useState<ServicoImportado[]>([]);
  const [mostrarImportacao, setMostrarImportacao] = useState(true);
  
  // Duraçãos para paginação e filtragem de serviços
  const [filtro, setFiltro] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [itensPorPagina, setItensPorPagina] = useState(5);
  const [servicosFiltrados, setServicosFiltrados] = useState<ServicoImportado[]>([]);
  // Removido duração mostrarConfirmacao que não é mais utilizado
  const [mostrarSalvarConfirmacao, setMostrarSalvarConfirmacao] = useState(false);
  const [mostrarConfirmacaoParcial, setMostrarConfirmacaoParcial] = useState(false);
  const [servicosNaoCalculadosCount, setServicosNaoCalculadosCount] = useState(0);
  const [salvando, setSalvando] = useState(false);
  
  // Duraçãos para a tabela de arquivos de dados
  const [arquivosDados, setArquivosDados] = useState<ArquivoDados[]>([]);
  const [filtroArquivo, setFiltroArquivo] = useState("");
  const [paginaAtualArquivo, setPaginaAtualArquivo] = useState(0);
  const [itensPorPaginaArquivo, setItensPorPaginaArquivo] = useState(5);
  const [arquivosFiltrados, setArquivosFiltrados] = useState<ArquivoDados[]>([]);
  const [arquivoAtual, setArquivoAtual] = useState<ArquivoDados | null>(null);
  
  // Duração para controlar a visibilidade do box de importação
  const [mostrarBoxImportacao, setMostrarBoxImportacao] = useState(false);
  
  // Duração para controlar a visibilidade do botão de importar
  const [mostrarBotaoImportar, setMostrarBotaoImportar] = useState(true);
  
  // Duração para controlar o carregamento de arquivos de dados
  const [carregando, setCarregando] = useState(false);
  
  // Duraçãos para o diálogo de margem padrão
  const [mostrarDialogoMargemPadrao, setMostrarDialogoMargemPadrao] = useState(false);
  const [margemPadrao, setMargemPadrao] = useState("30");
  const [servicosSemMargem, setServicosSemMargem] = useState(0);
  
  // Referência para o input de arquivo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descricaoInputRef = useRef<HTMLInputElement>(null);

  const handleArquivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setArquivo(e.target.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setArquivo(e.target.files[0]);
    }
  };

  const handleClickImportBox = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImportar = () => {
    if (!arquivo) {
      toast({
        title: "Arquivo não selecionado",
        description: "Por favor, selecione um arquivo para importar",
        variant: "destructive"
      });
      return;
    }
    
    if (!descricaoArquivo.trim()) {
      toast({
        title: "Descrição obrigatória",
        description: "Por favor, adicione uma descrição para o arquivo",
        variant: "destructive"
      });
      
      // Dar foco ao campo de descrição após um pequeno delay (quando o toast aparecer)
      setTimeout(() => {
        if (descricaoInputRef.current) {
          descricaoInputRef.current.focus();
        }
      }, 100);
      
      return;
    }

    setImportando(true);
    
    // Simulando um delay de processamento
    setTimeout(() => {
      // Simulando serviços importados (em produção, isso viria da API)
      const servicosSimulados = [
        { codigo: "S001", descricao: "Consultoria em Marketing Digital", quantidade: 1, valorCompra: 180.00, duracao: "2h" },
        { codigo: "S002", descricao: "Manutenção de Computador", quantidade: 1, valorCompra: 60.00, duracao: "1h30" },
        { codigo: "S003", descricao: "Treinamento em Excel Avançado", quantidade: 1, valorCompra: 240.00, duracao: "4h" },
        { codigo: "S004", descricao: "Design de Logotipo", quantidade: 1, valorCompra: 350.00, duracao: "5h" },
        { codigo: "S005", descricao: "Suporte Técnico Remoto", quantidade: 1, valorCompra: 50.00, duracao: "1h" },
        { codigo: "S006", descricao: "Desenvolvimento de Website", quantidade: 1, valorCompra: 1200.00, duracao: "40h" },
        { codigo: "S007", descricao: "Consultoria Financeira", quantidade: 1, valorCompra: 300.00, duracao: "3h" },
        { codigo: "S008", descricao: "Tradução de Documento", quantidade: 1, valorCompra: 120.00, duracao: "2h" },
        { codigo: "S009", descricao: "Edição de Vídeo", quantidade: 1, valorCompra: 180.00, duracao: "4h" },
        { codigo: "S010", descricao: "Aula de Inglês", quantidade: 1, valorCompra: 80.00, duracao: "1h" },
        { codigo: "S011", descricao: "Consultoria Jurídica", quantidade: 1, valorCompra: 250.00, duracao: "1h30" },
        { codigo: "S012", descricao: "Fotografia Profissional", quantidade: 1, valorCompra: 350.00, duracao: "3h" },
      ];
      
      // Adicionando campo margem (vazia), valor de venda (zerado), calculado e salvo para cada serviço
      const servicosComMargem = servicosSimulados.map(serviço => ({
        ...serviço,
        margem: "", // Margem vazia, o usuário deve preencher
        valorVenda: 0, // Valor de venda inicialmente zerado
        calculado: false, // Indica se o preço já foi calculado
        salvo: false // Indica se o serviço já foi salvo
      }));
      
      // Criar um novo arquivo de dados
      const novoArquivo: ArquivoDados = {
        id: arquivosDados.length + 1,
        codigo: `ARQ-${(arquivosDados.length + 1).toString().padStart(3, '0')}`,
        dataEmissao: new Date().toLocaleDateString('pt-BR'),
        dataImportacao: new Date().toLocaleDateString('pt-BR'),
        descricao: descricaoArquivo.trim(),
        valorTotal: servicosSimulados.reduce((acc, p) => acc + p.valorCompra * p.quantidade, 0),
        status: 'nao_precificada' as const
      };
      
      // Atualizar a lista de arquivos de dados
      const novosArquivos = [...arquivosDados, novoArquivo];
      setArquivosDados(novosArquivos);
      setArquivosFiltrados(novosArquivos);
      
      // Limpar formulário e exibir tabela de arquivos
      setArquivo(null);
      setDescricaoArquivo('');
      setImportando(false);
      setMostrarImportacao(true); // Mostrar a tabela de arquivos de dados
      setMostrarBoxImportacao(false); // Fechar o box de importação
      setMostrarBotaoImportar(true); // Mostrar o botão de importar
      
      toast({
        title: "Importação concluída",
        description: "Arquivo importado com sucesso! O arquivo de dados foi adicionado à lista com status 'Pendente'.",
      });
    }, 1500);
  };

  const handleCalcularTodos = () => {
    // Verificar serviços sem margem preenchida
    const semMargem = servicosImportados.filter(
      serviço => serviço.margem === "" || serviço.margem === undefined
    );
    
    if (semMargem.length > 0) {
      // Salvar o número de serviços sem margem e mostrar o diálogo
      setServicosSemMargem(semMargem.length);
      setMostrarDialogoMargemPadrao(true);
      return;
    }
    
    // Se todos os serviços já têm margem, calcular diretamente
    calcularTodosOsServicos();
  };
  
  // Função para aplicar a margem padrão e calcular todos os serviços
  const aplicarMargemPadraoECalcular = () => {
    const margemPadraoNum = parseFloat(margemPadrao);
    
    if (isNaN(margemPadraoNum)) {
      toast({
        title: "Margem inválida",
        description: "A margem padrão precisa ser um número válido.",
        variant: "destructive"
      });
      return;
    }
    
    // Atualizar os serviços com a margem padrão para os que não têm margem
    const serviçosAtualizados = servicosImportados.map(serviço => {
      // Se o serviço já tem margem, mantém a que tem
      if (serviço.margem !== "" && serviço.margem !== undefined) {
        return serviço;
      }
      
      // Senão, aplica a margem padrão
      return {
        ...serviço,
        margem: margemPadraoNum
      };
    });
    
    // Atualizar os serviços antes de calcular
    setServicosImportados(serviçosAtualizados);
    setServicosFiltrados(serviçosAtualizados);
    
    // Fechar o diálogo
    setMostrarDialogoMargemPadrao(false);
    
    // Calcular os preços de todos os serviços
    calcularTodosOsServicos(serviçosAtualizados);
  };
  
  // Função para calcular todos os serviços
  const calcularTodosOsServicos = (serviços = servicosImportados) => {
    // Calcular os preços com base nas margens
    const serviçosCalculados = serviços.map(serviço => {
      const margemNumerica = typeof serviço.margem === 'string' 
        ? parseFloat(serviço.margem) 
        : serviço.margem;
        
      return {
        ...serviço,
        valorVenda: serviço.valorCompra * (1 + margemNumerica / 100),
        calculado: true,
        salvo: false // Sempre resetar o status de salvo ao calcular
      };
    });
    
    setServicosImportados(serviçosCalculados);
    setServicosFiltrados(serviçosCalculados);
    
    toast({
      title: "Cálculo em massa concluído",
      description: `Preços calculados para ${serviçosCalculados.length} serviços.`,
    });
  };

  const handleSalvarTodos = () => {
    setSalvando(true);
    
    // Verificar se todos os serviços foram calculados
    const servicosNaoCalculados = servicosImportados.filter(serviço => !serviço.calculado);
    
    if (servicosNaoCalculados.length > 0) {
      setSalvando(false);
      toast({
        title: "Ação incompleta",
        description: `${servicosNaoCalculados.length} serviços ainda não foram calculados. Calcule todos os preços antes de salvar.`,
        variant: "destructive"
      });
      return;
    }
    
    // Em um caso real, chamaria a API para salvar todos os serviços
    // Simulando atualização de todos os serviços
    const serviçosAtualizados = servicosImportados.map(serviço => ({
      ...serviço,
      salvo: true
    }));
    
    // Simulando um delay para salvar
    setTimeout(() => {
      setServicosImportados(serviçosAtualizados);
      setServicosFiltrados(serviçosAtualizados);
      
      // Atualizar o status do arquivo de dados atual para "totalmente_precificada"
      if (arquivoAtual) {
        // Criar uma cópia atualizada do arquivo atual
        const arquivoAtualizado = {
          ...arquivoAtual,
          status: 'totalmente_precificada' as const
        };
        
        // Atualizar o arquivo atual
        setArquivoAtual(arquivoAtualizado);
        
        // Atualizar o arquivo na lista de arquivos de dados
        const arquivosAtualizados = arquivosDados.map(arq => 
          arq.id === arquivoAtual.id ? arquivoAtualizado : arq
        );
        
        // Atualizar a lista de arquivos de dados
        setArquivosDados(arquivosAtualizados);
        setArquivosFiltrados(arquivosAtualizados);
      }
      
      setSalvando(false);
      
      toast({
        title: "Serviços salvos",
        description: `${serviçosAtualizados.length} serviços foram precificados e salvos com sucesso!`,
      });
      
      // Fechar qualquer diálogo que esteja aberto
      setMostrarSalvarConfirmacao(false);
    }, 1000);
  };
  
  // Função específica para salvar e iniciar nova importação
  const handleSalvarEIniciarNova = () => {
    setSalvando(true);
    
    // Verificar se todos os serviços foram calculados
    const servicosNaoCalculados = servicosImportados.filter(serviço => !serviço.calculado);
    
    if (servicosNaoCalculados.length > 0) {
      setSalvando(false);
      setServicosNaoCalculadosCount(servicosNaoCalculados.length);
      setMostrarConfirmacaoParcial(true);
      return;
    }
    
    // Se todos os serviços foram calculados, prosseguir com o salvamento total
    handleSalvamentoCompleto();
  };
  
  // Função para realizar salvamento completo (todos os serviços calculados)
  const handleSalvamentoCompleto = () => {
    // Em um caso real, chamaria a API para salvar todos os serviços
    // Simulando atualização de todos os serviços
    const serviçosAtualizados = servicosImportados.map(serviço => ({
      ...serviço,
      salvo: true
    }));
    
    // Simulando um delay para salvar
    setTimeout(() => {
      // Atualizar o status do arquivo de dados atual para "totalmente_precificada"
      if (arquivoAtual) {
        // Criar uma cópia atualizada do arquivo atual
        const arquivoAtualizado = {
          ...arquivoAtual,
          status: 'totalmente_precificada' as const
        };
        
        // Atualizar o arquivo na lista de arquivos de dados
        const arquivosAtualizados = arquivosDados.map(arq => 
          arq.id === arquivoAtual.id ? arquivoAtualizado : arq
        );
        
        // Atualizar a lista de arquivos de dados
        setArquivosDados(arquivosAtualizados);
        setArquivosFiltrados(arquivosAtualizados);
      }
      
      setServicosImportados([]);
      setServicosFiltrados([]);
      setSalvando(false);
      
      toast({
        title: "Serviços salvos",
        description: `Todos os serviços foram precificados e salvos com sucesso!`,
      });
      
      // Fechar qualquer diálogo que esteja aberto
      setMostrarSalvarConfirmacao(false);
      setMostrarConfirmacaoParcial(false);
      
      // Limpar os dados e mostrar a tabela de notas fiscais
      setArquivo(null);
      setMostrarImportacao(true);
    }, 1000);
  };
  
  // Função para realizar salvamento parcial (apenas serviços calculados)
  const handleSalvamentoParcial = () => {
    // Filtrar apenas os serviços que foram calculados
    const serviçosCalculados = servicosImportados.filter(serviço => serviço.calculado);
    
    // Atualizar status de "salvo" apenas para serviços calculados
    const serviçosAtualizados = servicosImportados.map(serviço => ({
      ...serviço,
      salvo: serviço.calculado ? true : false
    }));
    
    // Simulando um delay para salvar
    setTimeout(() => {
      // Atualizar o status do arquivo de dados atual para "parcialmente_precificada"
      if (arquivoAtual) {
        // Criar uma cópia atualizada do arquivo atual
        const arquivoAtualizado = {
          ...arquivoAtual,
          status: 'parcialmente_precificada' as const
        };
        
        // Atualizar o arquivo na lista de arquivos de dados
        const arquivosAtualizados = arquivosDados.map(arq => 
          arq.id === arquivoAtual.id ? arquivoAtualizado : arq
        );
        
        // Atualizar a lista de arquivos de dados
        setArquivosDados(arquivosAtualizados);
        setArquivosFiltrados(arquivosAtualizados);
      }
      
      setServicosImportados([]);
      setServicosFiltrados([]);
      setSalvando(false);
      
      toast({
        title: "Serviços salvos parcialmente",
        description: `${serviçosCalculados.length} serviços foram precificados e salvos. Os demais ficarão pendentes.`,
      });
      
      // Fechar qualquer diálogo que esteja aberto
      setMostrarConfirmacaoParcial(false);
      
      // Limpar os dados e mostrar a tabela de notas fiscais
      setArquivo(null);
      setMostrarImportacao(true);
    }, 1000);
  };
  
  // Função para calcular o preço de um único serviço
  const handleCalcular = (index: number) => {
    // Verificar se a margem está preenchida
    const serviço = servicosImportados[index];
    
    if (serviço.margem === "" || serviço.margem === undefined) {
      toast({
        title: "Lucro não preenchido",
        description: "Por favor, informe o percentual de lucro para este serviço.",
        variant: "destructive"
      });
      return;
    }
    
    // Converter margem para número
    const margemNumerica = typeof serviço.margem === 'string' 
      ? parseFloat(serviço.margem) 
      : serviço.margem;
    
    // Verificar se é um número válido
    if (isNaN(margemNumerica)) {
      toast({
        title: "Lucro inválido",
        description: "O percentual de lucro deve ser um número válido.",
        variant: "destructive"
      });
      return;
    }
    
    // Calcular o preço de venda
    const valorVenda = serviço.valorCompra * (1 + margemNumerica / 100);
    
    // Atualizar o serviço
    const serviçosAtualizados = [...servicosImportados];
    serviçosAtualizados[index] = {
      ...serviço,
      valorVenda: valorVenda,
      calculado: true,
      salvo: false // Sempre resetar o status de salvo ao calcular
    };
    
    setServicosImportados(serviçosAtualizados);
    setServicosFiltrados(serviçosAtualizados);
    
    toast({
      title: "Preço calculado",
      description: `O preço de venda foi calculado com sucesso.`,
    });
  };
  
  // Função para lidar com mudança da margem de um serviço
  const handleMargemChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const novoValor = e.target.value;
    
    // Atualizar o serviço
    const serviçosAtualizados = [...servicosImportados];
    serviçosAtualizados[index] = {
      ...serviçosAtualizados[index],
      margem: novoValor,
      calculado: false, // Resetar o status de calculado quando a margem muda
      salvo: false // Resetar o status de salvo quando a margem muda
    };
    
    setServicosImportados(serviçosAtualizados);
    setServicosFiltrados(serviçosAtualizados);
  };
  
  // Função para lidar com a busca de serviços
  const handleBusca = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setFiltro(valor);
    setPaginaAtual(0); // Resetar paginação
    
    if (valor.trim() === "") {
      setServicosFiltrados(servicosImportados);
    } else {
      const resultados = servicosImportados.filter(serviço => 
        serviço.descricao.toLowerCase().includes(valor.toLowerCase()) ||
        serviço.codigo.toLowerCase().includes(valor.toLowerCase())
      );
      setServicosFiltrados(resultados);
    }
  };
  
  // Função para lidar com a busca de notas fiscais
  const handleBuscaArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setFiltroArquivo(valor);
    setPaginaAtualArquivo(0); // Resetar paginação
    
    if (valor.trim() === "") {
      setArquivosFiltrados(arquivosDados);
    } else {
      const resultados = arquivosDados.filter(arquivo => 
        arquivo.codigo.toLowerCase().includes(valor.toLowerCase()) ||
        arquivo.descricao.toLowerCase().includes(valor.toLowerCase())
      );
      setArquivosFiltrados(resultados);
    }
  };
  
  // Funções para paginação de serviços
  const proximaPagina = () => {
    const totalPaginas = Math.ceil(servicosFiltrados.length / itensPorPagina);
    if (paginaAtual < totalPaginas - 1) {
      setPaginaAtual(paginaAtual + 1);
    }
  };
  
  const paginaAnterior = () => {
    if (paginaAtual > 0) {
      setPaginaAtual(paginaAtual - 1);
    }
  };
  
  // Funções para paginação de arquivos de dados
  const proximaPaginaArquivo = () => {
    const totalPaginas = Math.ceil(arquivosFiltrados.length / itensPorPaginaArquivo);
    if (paginaAtualArquivo < totalPaginas - 1) {
      setPaginaAtualArquivo(paginaAtualArquivo + 1);
    }
  };
  
  const paginaAnteriorArquivo = () => {
    if (paginaAtualArquivo > 0) {
      setPaginaAtualArquivo(paginaAtualArquivo - 1);
    }
  };
  
  // Função para mudar o número de itens por página
  const handleChangeItensPorPagina = (value: string) => {
    setItensPorPagina(parseInt(value));
    setPaginaAtual(0); // Resetar paginação
  };
  
  // Função para mudar o número de itens por página (Arquivos de dados)
  const handleChangeItensPorPaginaArquivo = (value: string) => {
    setItensPorPaginaArquivo(parseInt(value));
    setPaginaAtualArquivo(0); // Resetar paginação
  };
  
  // Obter serviços para a página atual
  const itensPaginaAtual = servicosFiltrados.slice(
    paginaAtual * itensPorPagina,
    (paginaAtual + 1) * itensPorPagina
  );
  
  // Obter arquivos de dados para a página atual
  const itensPaginaAtualArquivo = arquivosFiltrados.slice(
    paginaAtualArquivo * itensPorPaginaArquivo,
    (paginaAtualArquivo + 1) * itensPorPaginaArquivo
  );
  
  // Carregar arquivos de dados ao montar o componente
  useEffect(() => {
    // Simulando dados do backend
    const arquivosSimulados: ArquivoDados[] = [
      { id: 1, codigo: 'ARQ-001', dataEmissao: '10/04/2023', dataImportacao: '11/04/2023', descricao: 'Lote Smartphones', valorTotal: 15000.00, status: 'totalmente_precificada' },
      { id: 2, codigo: 'ARQ-002', dataEmissao: '15/04/2023', dataImportacao: '17/04/2023', descricao: 'Lote Notebooks', valorTotal: 8500.00, status: 'parcialmente_precificada' },
      { id: 3, codigo: 'ARQ-003', dataEmissao: '20/04/2023', dataImportacao: '21/04/2023', descricao: 'Lote Tablets', valorTotal: 12300.00, status: 'nao_precificada' },
      { id: 4, codigo: 'ARQ-004', dataEmissao: '25/04/2023', dataImportacao: '26/04/2023', descricao: 'Lote Monitores', valorTotal: 7800.00, status: 'totalmente_precificada' },
      { id: 5, codigo: 'ARQ-005', dataEmissao: '01/05/2023', dataImportacao: '02/05/2023', descricao: 'Lote Periféricos', valorTotal: 9200.00, status: 'parcialmente_precificada' },
      { id: 6, codigo: 'ARQ-006', dataEmissao: '05/05/2023', dataImportacao: '06/05/2023', descricao: 'Lote Impressoras', valorTotal: 11500.00, status: 'nao_precificada' },
      { id: 7, codigo: 'ARQ-007', dataEmissao: '10/05/2023', dataImportacao: '12/05/2023', descricao: 'Lote Acessórios', valorTotal: 13800.00, status: 'totalmente_precificada' },
    ];
    
    // Simulando delay de carregamento
    setTimeout(() => {
      setArquivosDados(arquivosSimulados);
      setArquivosFiltrados(arquivosSimulados);
    }, 800); // Simulando um delay de 0.8 segundos para carregamento
  }, []);

  // Função para lidar com o botão voltar
  const handleVoltar = () => {
    // Se estiver mostrando o box de importação, fechar e mostrar a tabela de arquivos de dados
    if (mostrarBoxImportacao) {
      // Limpar o arquivo selecionado e a descrição
      setArquivo(null);
      setDescricaoArquivo('');
      
      // Fechar box de importação e mostrar tabela
      setMostrarBoxImportacao(false);
      setMostrarImportacao(true);
      setMostrarBotaoImportar(true); // Reativa o botão quando voltar
      return;
    }
    
    // Se estiver mostrando serviços importados (e não a tabela)
    if (servicosImportados.length > 0 && !mostrarImportacao) {
      // Verificar se há serviços não salvos
      const serviçosNaoSalvos = servicosImportados.filter(p => p.calculado && !p.salvo);
      
      if (serviçosNaoSalvos.length > 0) {
        // Mostrar diálogo de confirmação para salvar
        setMostrarSalvarConfirmacao(true);
      } else {
        // Se não houver serviços não salvos, voltar para a tabela de arquivos
        limparEIniciarNovaImportacao(false);
      }
    } else {
      // Se estiver na tabela de arquivos, volta para a página anterior
      setLocation("/precificacao/servicos");
    }
  };
  
  // Função para ir para a página de serviços usados
  const handleIrParaPrecificacao = () => {
    setLocation("/precificacao/servicos");
  };

  // Função para iniciar nova importação com verificação de salvamento
  const handleNovaImportacao = () => {
    // Sempre mostrar o diálogo de salvamento se houver serviços importados
    if (servicosImportados.length > 0 && !mostrarImportacao) {
      // Verificar se há serviços calculados e não calculados
      const servicosNaoCalculados = servicosImportados.filter(serviço => !serviço.calculado);
      const serviçosCalculados = servicosImportados.filter(serviço => serviço.calculado);
      
      // Se existem serviços calculados e não calculados, mostrar diálogo de salvamento parcial
      if (serviçosCalculados.length > 0 && servicosNaoCalculados.length > 0) {
        setServicosNaoCalculadosCount(servicosNaoCalculados.length);
        setMostrarConfirmacaoParcial(true);
      } 
      // Se todos os serviços estão calculados ou nenhum está calculado, mostrar diálogo de salvamento normal
      else {
        setMostrarSalvarConfirmacao(true);
      }
    } else {
      limparEIniciarNovaImportacao();
    }
  };
  
  // Função para limpar os dados e exibir o box de importação novamente
  const limparEIniciarNovaImportacao = (mostrarToast = true) => {
    // Limpar todos os dados
    setServicosImportados([]);
    setServicosFiltrados([]);
    
    // Fechar qualquer diálogo que esteja aberto
    setMostrarSalvarConfirmacao(false);
    setMostrarConfirmacaoParcial(false);
    
    // Limpar arquivo e mostrar a tabela de arquivos de dados
    setArquivo(null);
    setMostrarImportacao(true);
    setMostrarBotaoImportar(true);
    
    if (mostrarToast) {
      toast({
        title: "Alterações descartadas",
        description: "Todas as alterações foram descartadas.",
      });
    }
  };
  
  // Função para fazer o download do PDF do arquivo de dados
  const handleDownloadPDF = (arquivo: ArquivoDados) => {
    toast({
      title: "Iniciando download",
      description: `O download do arquivo ${arquivo.codigo} será iniciado em instantes.`,
    });
    
    // Simulando um delay para o download
    setTimeout(() => {
      toast({
        title: "Download concluído",
        description: "O arquivo PDF foi baixado com sucesso.",
      });
    }, 1000);
  };
  
  // Função para editar um arquivo de dados
  const handleEditarArquivo = (arquivo: ArquivoDados) => {
    // Mostrar tela de carregamento
    setCarregando(true);
    
    // Simular carregamento de serviços do arquivo de dados selecionado
    setImportando(true);
    setMostrarImportacao(false);
    
    // Armazenar o arquivo atual sendo editado
    setArquivoAtual(arquivo);
    
    // Simulando um delay de processamento
    setTimeout(() => {
      // Simulando serviços do arquivo de dados selecionado
      const servicosSimulados = [
        { codigo: `${arquivo.codigo}-001`, descricao: "Consultoria em Marketing Digital", quantidade: 1, valorCompra: 180.00, duracao: "2h" },
        { codigo: `${arquivo.codigo}-002`, descricao: "Manutenção de Computador", quantidade: 1, valorCompra: 60.00, duracao: "1h30" },
        { codigo: `${arquivo.codigo}-003`, descricao: "Treinamento em Excel Avançado", quantidade: 1, valorCompra: 240.00, duracao: "4h" },
        { codigo: `${arquivo.codigo}-004`, descricao: "Design de Logotipo", quantidade: 1, valorCompra: 350.00, duracao: "5h" },
      ];
      
      // Adicionando campo margem (vazia), valor de venda (zerado), calculado e salvo para cada serviço
      const servicosComMargem = servicosSimulados.map(serviço => ({
        ...serviço,
        margem: "", // Margem vazia, o usuário deve preencher
        valorVenda: 0, // Valor de venda inicialmente zerado
        calculado: false, // Indica se o preço já foi calculado
        salvo: false // Indica se o serviço já foi salvo
      }));
      
      setServicosImportados(servicosComMargem);
      setServicosFiltrados(servicosComMargem);
      setImportando(false);
      setCarregando(false); // Esconder tela de carregamento depois que terminar
      
      toast({
        title: "Arquivo de dados carregado",
        description: `${servicosSimulados.length} serviços do arquivo "${arquivo.descricao}" foram carregados para edição.`,
      });
    }, 1500);
  };
  
  // Função para importar serviços de um arquivo de dados para o sistema
  const [importacaoProgresso, setImportacaoProgresso] = useState(0);
  const [mostrarProgressoImportacao, setMostrarProgressoImportacao] = useState(false);
  const [mostrarImportacaoConcluida, setMostrarImportacaoConcluida] = useState(false);
  
  const handleImportarParaSistema = (arquivo: ArquivoDados) => {
    // Verifica se o arquivo de dados está completamente precificado
    if (arquivo.status !== 'totalmente_precificada') {
      toast({
        title: "Operação não permitida",
        description: "Apenas arquivos de dados completamente precificados podem ser importados para o sistema.",
        variant: "destructive"
      });
      return;
    }
    
    // Simulando uma verificação de serviços
    const temErros = false; // Em um caso real, isso seria determinado após validação
    
    if (temErros) {
      toast({
        title: "Erro na importação",
        description: "Existem serviços com problemas de precificação. Verifique e corrija antes de importar.",
        variant: "destructive"
      });
      return;
    }
    
    // Mostrar diálogo de progresso
    setImportacaoProgresso(0);
    setMostrarProgressoImportacao(true);
    
    // Simulando o progresso da importação
    let progressoAtual = 0;
    const intervaloProgresso = setInterval(() => {
      progressoAtual += 10;
      setImportacaoProgresso(progressoAtual);
      
      if (progressoAtual >= 100) {
        clearInterval(intervaloProgresso);
        
        // Atualizar o status do arquivo para "importado"
        const arquivosAtualizados = arquivosDados.map(arq => {
          if (arq.id === arquivo.id) {
            return { ...arq, status: 'importado' as const };
          }
          return arq;
        });
        
        setArquivosDados(arquivosAtualizados);
        setArquivosFiltrados(
          arquivosAtualizados.filter(arq => 
            arq.codigo.toLowerCase().includes(filtroArquivo.toLowerCase()) ||
            arq.descricao.toLowerCase().includes(filtroArquivo.toLowerCase())
          )
        );
        
        setMostrarProgressoImportacao(false);
        setMostrarImportacaoConcluida(true);
      }
    }, 250);
  };

  return carregando ? (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="text-center mb-4">
        <h2 className="text-3xl font-bold tracking-tight mb-2">Meu Preço Certo</h2>
        <p className="text-gray-500">Carregando itens do arquivo de dados...</p>
      </div>
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
    </div>
  ) : (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center justify-between pt-3 sm:pt-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 sm:mt-0">Importação de Serviços</h2>
          <p className="text-gray-500">Importe e precifique serviços usados a partir de arquivo de dados</p>
        </div>
        <div className="mt-2 lg:mt-0">
          {servicosImportados.length > 0 && !mostrarImportacao ? (
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                className="flex items-center"
                onClick={handleVoltar}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </div>
          ) : (
            <div className="flex flex-row space-x-1">
              {mostrarBotaoImportar && (
                <Button 
                  variant="default" 
                  className="flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={() => {
                    // Comportamento similar à página de novos serviços
                    // Ao invés de abrir o box de importação, apenas mostrar a tabela com botão para importação
                    setMostrarImportacao(false);
                    setMostrarBoxImportacao(true);
                    setMostrarBotaoImportar(false);
                  }}
                >
                  <FileUp className="sm:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Importar Arquivo de Dados</span>
                </Button>
              )}
              <Button 
                variant="outline" 
                className="flex items-center justify-center"
                onClick={handleVoltar}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabela de Arquivos de Dados Importados */}
      {mostrarImportacao && (
        <Card>
          <CardHeader>
            <CardTitle>Arquivos de Dados Importados</CardTitle>
            <CardDescription>
              Todos os arquivos de dados previamente importados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Campo de busca para arquivos de dados */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou descrição..."
                  value={filtroArquivo}
                  onChange={handleBuscaArquivo}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <Table>

                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Data Importação</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arquivosFiltrados.length > 0 
                    ? itensPaginaAtualArquivo.map((arquivo) => {
                        // Definir as classes e rótulos com base no status
                        let rowColorClass = '';
                        let statusBadgeClass = '';
                        let statusLabel = '';
                        
                        if (arquivo.status === 'nao_precificada') {
                          rowColorClass = 'bg-red-50 hover:bg-red-100';
                          statusBadgeClass = 'bg-red-100 text-red-800';
                          statusLabel = 'Pendente';
                        } else if (arquivo.status === 'parcialmente_precificada') {
                          rowColorClass = 'bg-yellow-50 hover:bg-yellow-100';
                          statusBadgeClass = 'bg-yellow-100 text-yellow-800';
                          statusLabel = 'Parcial';
                        } else if (arquivo.status === 'totalmente_precificada') {
                          rowColorClass = 'bg-green-50 hover:bg-green-100';
                          statusBadgeClass = 'bg-green-100 text-green-800';
                          statusLabel = 'Completo';
                        } else if (arquivo.status === 'importado') {
                          rowColorClass = 'bg-blue-50 hover:bg-blue-100';
                          statusBadgeClass = 'bg-blue-100 text-blue-800';
                          statusLabel = 'Importado';
                        }
                        
                        return (
                          <TableRow key={arquivo.id} className={rowColorClass}>
                            <TableCell className="font-medium">{arquivo.codigo}</TableCell>
                            <TableCell>{arquivo.dataImportacao}</TableCell>
                            <TableCell>{arquivo.descricao}</TableCell>
                            <TableCell>
                              {arquivo.valorTotal.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}
                            </TableCell>
                            <TableCell>
                              {arquivo.status === 'importado' ? (
                                <div className="relative inline-block group">
                                  <span className={`text-xs px-2 py-1 rounded-full ${statusBadgeClass} flex items-center`}>
                                    <Check className="h-3 w-3 mr-1" />
                                    {statusLabel}
                                  </span>
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                    Serviços importados
                                  </div>
                                </div>
                              ) : (
                                <span className={`text-xs px-2 py-1 rounded-full ${statusBadgeClass}`}>
                                  {statusLabel}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  title="Download PDF"
                                  onClick={() => handleDownloadPDF(arquivo)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  title={arquivo.status === 'importado' ? "Arquivo já importado" : "Editar importação"}
                                  onClick={() => handleEditarArquivo(arquivo)}
                                  disabled={arquivo.status === 'importado'}
                                  className={arquivo.status === 'importado' ? "text-gray-400 cursor-not-allowed" : ""}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  title={arquivo.status === 'importado' ? "Serviços já importados" : "Importar para sistema"}
                                  onClick={() => handleImportarParaSistema(arquivo)}
                                  disabled={arquivo.status === 'nao_precificada' || arquivo.status === 'parcialmente_precificada' || arquivo.status === 'importado'}
                                  className={
                                    arquivo.status === 'importado' 
                                      ? 'text-gray-400 cursor-not-allowed' 
                                      : arquivo.status === 'totalmente_precificada' 
                                        ? 'text-green-600 hover:text-green-700' 
                                        : 'text-gray-400'
                                  }
                                >
                                  <FileUp className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    : <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                          {filtroArquivo
                            ? "Nenhum arquivo de dados encontrado com este termo. Tente outra busca."
                            : "Nenhum arquivo de dados importado ainda."}
                        </TableCell>
                      </TableRow>
                  }
                </TableBody>
              </Table>
            </div>
            
            {/* Paginação para arquivos de dados */}
            {arquivosFiltrados.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-2">
                  <Select
                    value={String(itensPorPaginaArquivo)}
                    onValueChange={handleChangeItensPorPaginaArquivo}
                  >
                    <SelectTrigger className="h-8 w-16">
                      <SelectValue placeholder={itensPorPaginaArquivo} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={paginaAnteriorArquivo}
                    disabled={paginaAtualArquivo === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="mx-2">
                    {arquivosFiltrados.length > 0 
                      ? `${paginaAtualArquivo + 1}/${Math.ceil(arquivosFiltrados.length / itensPorPaginaArquivo)}`
                      : "0/0"
                    }
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={proximaPaginaArquivo}
                    disabled={(paginaAtualArquivo + 1) * itensPorPaginaArquivo >= arquivosFiltrados.length}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Box de importação de arquivo de dados */}
      {mostrarBoxImportacao && (
        <Card className="my-6">
          <CardHeader>
            <div>
              <CardTitle className="text-xl mb-3">Importar Arquivo de Dados</CardTitle>
              <CardDescription>
                Importe o arquivo de dados dos seus serviços e ajuste os valores de todos os serviços ao mesmo tempo. Com a importação do arquivo, você consegue ajustar todos eles de forma fácil, sem a necessidade de recadastrar.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="formato">Formatos suportados</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <div className="flex items-center p-2 border rounded">
                        <FileSpreadsheet className="h-5 w-5 text-green-600 mr-2" />
                        <span className="text-sm">Excel (.xlsx, .xls)</span>
                      </div>
                      <div className="flex items-center p-2 border rounded">
                        <FileText className="h-5 w-5 text-blue-600 mr-2" />
                        <span className="text-sm">CSV (.csv)</span>
                      </div>
                      <div className="flex items-center p-2 border rounded">
                        <FileText className="h-5 w-5 text-yellow-600 mr-2" />
                        <span className="text-sm">XML (.xml)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="modeloBase">Modelos Base de arquivos</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <div className="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                        <FileSpreadsheet className="h-5 w-5 text-green-600 mr-2" />
                        <span className="text-sm">Modelo Excel</span>
                      </div>
                      <div className="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                        <FileText className="h-5 w-5 text-blue-600 mr-2" />
                        <span className="text-sm">Modelo CSV</span>
                      </div>
                      <div className="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                        <FileText className="h-5 w-5 text-yellow-600 mr-2" />
                        <span className="text-sm">Modelo XML</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col">
                  <Label htmlFor="arquivo">Selecione o arquivo</Label>
                  <div 
                    className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-md mt-2 hover:bg-gray-50 cursor-pointer h-40"
                    onClick={handleClickImportBox}
                  >
                    {arquivo ? (
                      <>
                        <FileText className="h-10 w-10 text-green-600 mb-2" />
                        <p className="text-sm font-medium">{arquivo.name}</p>
                        <p className="text-xs text-gray-500">
                          {(arquivo.size / 1024).toFixed(2)} KB • Clique para alterar
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-gray-400 mb-2" />
                        <p className="text-sm font-medium">Clique para selecionar um arquivo</p>
                        <p className="text-xs text-gray-500">ou arraste e solte aqui</p>
                      </>
                    )}
                    <input
                      id="fileUpload"
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      accept=".xlsx,.xls,.csv,.xml"
                    />
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor="descricaoArquivo">Descrição do arquivo</Label>
                    <Input
                      id="descricaoArquivo"
                      placeholder="Ex: Serviços do Fornecedor X, Serviços para reparo, etc."
                      className="mt-1"
                      value={descricaoArquivo}
                      onChange={(e) => setDescricaoArquivo(e.target.value)}
                      ref={descricaoInputRef}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Adicione uma descrição para identificar facilmente este arquivo no futuro
                    </p>
                  </div>
                  
                  <div className="flex justify-center mt-5">
                    <Button 
                      onClick={handleImportar} 
                      disabled={importando} 
                      className="w-full md:w-2/3 bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      {importando ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Importar Arquivo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de serviços importados */}
      {servicosImportados.length > 0 && !mostrarImportacao && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Serviços Importados{arquivoAtual && `: ${arquivoAtual.descricao}`}</CardTitle>
                <CardDescription>
                  Lista de serviços usados importados do arquivo de dados
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleCalcularTodos} variant="outline" className="flex items-center">
                  <Calculator className="mr-2 h-4 w-4" />
                  Calcular Todos
                </Button>
                <Button onClick={handleSalvarTodos} className="flex items-center bg-teal-600 hover:bg-teal-700 text-white">
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Todos
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Campo de busca para serviços */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou descrição do serviço..."
                  value={filtro}
                  onChange={handleBusca}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead className="whitespace-nowrap">Descrição</TableHead>
                    <TableHead className="whitespace-nowrap">Duração</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Qtd</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Unidade</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Valor Compra</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Lucro (%)</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Valor Venda</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Lucro (R$)</TableHead>
                    <TableHead className="whitespace-nowrap">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servicosFiltrados.length > 0 ? (
                    itensPaginaAtual.map((serviço, index) => {
                      const originalIndex = servicosImportados.findIndex(p => p.codigo === serviço.codigo);
                      
                      return (
                        <TableRow key={serviço.codigo} className={serviço.calculado ? 'bg-green-50' : ''}>
                          <TableCell className="font-medium">{serviço.codigo}</TableCell>
                          <TableCell>{serviço.descricao}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1 text-amber-500" />
                              {serviço.duracao}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{serviço.quantidade}</TableCell>
                          <TableCell className="text-center">
                            <Select defaultValue="UN">
                              <SelectTrigger className="w-20 h-8 mx-auto">
                                <SelectValue placeholder="UN" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="UN">UN</SelectItem>
                                <SelectItem value="KG">KG</SelectItem>
                                <SelectItem value="M">M</SelectItem>
                                <SelectItem value="L">L</SelectItem>
                                <SelectItem value="CX">CX</SelectItem>
                                <SelectItem value="PCT">PCT</SelectItem>
                                <SelectItem value="PAR">PAR</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center">
                            {serviço.valorCompra.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={serviço.margem.toString()}
                              onChange={(e) => handleMargemChange(e, originalIndex)}
                              className="w-20 mx-auto text-center"
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            {serviço.calculado 
                              ? serviço.valorVenda.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                })
                              : 'R$ 0,00'}
                          </TableCell>
                          <TableCell className="text-center">
                            {serviço.calculado 
                              ? (serviço.valorVenda - serviço.valorCompra).toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                })
                              : 'R$ 0,00'}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button 
                                variant="outline"  
                                size="icon"
                                onClick={() => handleCalcular(originalIndex)}
                                title="Calcular preço"
                              >
                                <Calculator className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="default" 
                                size="icon"
                                onClick={() => {}} 
                                disabled={!serviço.calculado || serviço.salvo}
                                className="bg-teal-600 hover:bg-teal-700"
                                title={serviço.salvo ? "Serviço já salvo" : "Salvar serviço"}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-6 text-gray-500">
                        {filtro
                          ? "Nenhum serviço encontrado com este termo. Tente outra busca."
                          : "Nenhum serviço importado ainda."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Paginação */}
            {servicosFiltrados.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-2">
                  <Select
                    value={String(itensPorPagina)}
                    onValueChange={handleChangeItensPorPagina}
                  >
                    <SelectTrigger className="h-8 w-16">
                      <SelectValue placeholder={itensPorPagina} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={paginaAnterior}
                    disabled={paginaAtual === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="mx-2">
                    {servicosFiltrados.length > 0 
                      ? `${paginaAtual + 1}/${Math.ceil(servicosFiltrados.length / itensPorPagina)}`
                      : "0/0"
                    }
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={proximaPagina}
                    disabled={(paginaAtual + 1) * itensPorPagina >= servicosFiltrados.length}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Diálogo de Confirmação para Salvar */}
      <Dialog open={mostrarSalvarConfirmacao} onOpenChange={setMostrarSalvarConfirmacao}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Salvar Alterações</DialogTitle>
            <DialogDescription className="pt-2">
              <div className="bg-blue-50 p-3 rounded-md border border-blue-200 mb-3">
                <p className="text-sm text-gray-600">
                  Você tem alterações não salvas neste arquivo de dados. 
                  Deseja salvar antes de retornar à lista de importações?
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-3 pt-2">
            <Button 
              variant="default" 
              className="bg-teal-600 hover:bg-teal-700 w-full"
              onClick={handleSalvarEIniciarNova}
              disabled={salvando}
            >
              <Save className="mr-2 h-4 w-4" />
              {salvando ? "Salvando..." : "Salvar alterações e voltar para lista"}
            </Button>
            <Button 
              variant="default" 
              className="bg-red-600 hover:bg-red-700 w-full"
              onClick={() => limparEIniciarNovaImportacao()}
            >
              <Trash className="mr-2 h-4 w-4" />
              Descartar alterações e voltar para lista
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setMostrarSalvarConfirmacao(false)}
            >
              Cancelar (continuar editando)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Confirmação para Salvamento Parcial */}
      <Dialog open={mostrarConfirmacaoParcial} onOpenChange={setMostrarConfirmacaoParcial}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center text-teal-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Salvamento Parcial do Arquivo de Dados
            </DialogTitle>
            <DialogDescription className="pt-2">
              <div className="bg-teal-50 p-3 rounded-md border border-teal-200 mb-3">
                <p className="font-medium text-teal-800 mb-1">Atenção: Importação incompleta</p>
                <p className="text-sm text-gray-600">
                  Nem todos os serviços deste arquivo de dados foram calculados.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-green-50 p-2 rounded border border-green-200">
                  <p className="text-xs text-gray-500">Serviços calculados</p>
                  <p className="font-medium text-green-700 text-lg">
                    {servicosImportados.filter(p => p.calculado).length}
                  </p>
                </div>
                <div className="bg-red-50 p-2 rounded border border-red-200">
                  <p className="text-xs text-gray-500">Serviços não calculados</p>
                  <p className="font-medium text-red-700 text-lg">
                    {servicosNaoCalculadosCount}
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-1">
                Deseja salvar apenas os serviços que já foram calculados?
              </p>
              <p className="text-xs text-gray-500">
                O arquivo de dados ficará com status "Parcial" (amarelo) na lista.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-3 pt-2">
            <Button 
              variant="default" 
              className="bg-teal-600 hover:bg-teal-700 w-full"
              onClick={handleSalvamentoParcial}
              disabled={salvando}
            >
              <Save className="mr-2 h-4 w-4" />
              {salvando ? "Salvando..." : "Salvar serviços calculados (Parcial)"}
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setMostrarConfirmacaoParcial(false)}
            >
              Cancelar (continuar calculando serviços)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Progresso de Importação */}
      <Dialog open={mostrarProgressoImportacao} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center text-teal-600">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Importando Serviços para o Sistema
            </DialogTitle>
            <DialogDescription className="pt-2">
              <div className="bg-teal-50 p-3 rounded-md border border-teal-200 mb-3">
                <p className="text-sm text-gray-600">
                  Aguarde enquanto os serviços são importados para o sistema. Este processo pode levar alguns instantes.
                </p>
              </div>
              
              <div className="mt-4 mb-2">
                <p className="text-sm font-medium mb-2">Progresso da importação</p>
                <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-teal-600 transition-all duration-300 ease-in-out"
                    style={{ width: `${importacaoProgresso}%` }}
                  />
                </div>
                <p className="text-right text-xs text-gray-500 mt-1">{importacaoProgresso}%</p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Importação Concluída */}
      <Dialog open={mostrarImportacaoConcluida} onOpenChange={setMostrarImportacaoConcluida}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center text-teal-600">
              <Check className="h-5 w-5 mr-2" />
              Importação Concluída
            </DialogTitle>
            <DialogDescription className="pt-2">
              <div className="bg-teal-50 p-3 rounded-md border border-teal-200 mb-3">
                <p className="text-sm text-gray-600">
                  Todos os serviços do arquivo de dados foram importados com sucesso para o sistema!
                </p>
              </div>
              
              <div className="flex flex-col items-center justify-center mb-2">
                <div className="bg-teal-100 p-5 rounded-lg border-2 border-teal-300 w-28 h-28 flex items-center justify-center relative mb-2">
                  <Trophy className="h-16 w-16 text-teal-600" />
                  <div className="absolute -top-3 -right-3">
                    <PartyPopper className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="absolute -bottom-3 -left-3">
                    <Star className="h-8 w-8 text-yellow-500" />
                  </div>
                </div>
                <p className="text-center font-semibold text-teal-700 mt-1">Parabéns! Importação concluída com sucesso!</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <Button 
            variant="default" 
            className="bg-teal-600 hover:bg-teal-700 w-full mt-2"
            onClick={() => {
              setMostrarImportacaoConcluida(false);
              // Redirecionar para a página de cadastro de serviços usados
              setLocation("/precificacao/servicos");
            }}
          >
            Ir para cadastro de serviços
          </Button>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Margem Padrão */}
      <Dialog open={mostrarDialogoMargemPadrao} onOpenChange={setMostrarDialogoMargemPadrao}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center text-teal-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Lucro (%) Não Definido
            </DialogTitle>
            <DialogDescription className="pt-2">
              <div className="bg-teal-50 p-3 rounded-md border border-teal-200 mb-3">
                <p className="text-sm text-gray-600">
                  <strong>{servicosSemMargem}</strong> serviços estão sem percentual de lucro definido. Você deseja usar um lucro padrão para todos esses serviços?
                </p>
              </div>
              
              <div className="mt-4 mb-2">
                <Label htmlFor="margemPadrao">Lucro Padrão (%)</Label>
                <Input
                  id="margemPadrao"
                  value={margemPadrao}
                  onChange={(e) => setMargemPadrao(e.target.value)}
                  type="text"
                  inputMode="decimal"
                  placeholder="30"
                  className="mt-1"
                />
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-2 mt-4">
            <Button 
              variant="default" 
              className="bg-teal-600 hover:bg-teal-700 w-full"
              onClick={aplicarMargemPadraoECalcular}
            >
              <Calculator className="mr-2 h-4 w-4" />
              Aplicar lucro padrão e calcular todos
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setMostrarDialogoMargemPadrao(false)}
            >
              Cancelar (preencher lucros manualmente)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}