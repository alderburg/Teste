import React, { useState, useEffect, useRef, ChangeEvent } from "react";
// Removido DashboardLayout para usar layout persistente
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ArrowLeft, Calculator, Check, FileSpreadsheet, FileUp, FileText, Plus, Upload, Save, Search, ChevronLeft, ChevronRight, FileInput, Edit, Download, Loader2, Trash, Trophy, PartyPopper, ThumbsUp, Star } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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

// Interface para item de aluguel importado
interface ItemAluguel {
  codigo: string;
  descricao: string;
  quantidade: number;
  valorAquisicao: number;
  valorAluguel: number;
  tempoContrato: number;
  margem: number | string; // Pode ser número ou string vazia
  calculado: boolean;
  salvo: boolean;
}

export default function PrecificacaoAlugueisImportacaoPage() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [descricaoArquivo, setDescricaoArquivo] = useState("");
  const [importando, setImportando] = useState(false);
  const [itensImportados, setItensImportados] = useState<ItemAluguel[]>([]);
  const [mostrarImportacao, setMostrarImportacao] = useState(true);
  
  // Estados para paginação e filtragem de itens
  const [filtro, setFiltro] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [itensPorPagina, setItensPorPagina] = useState(5);
  const [itensFiltrados, setItensFiltrados] = useState<ItemAluguel[]>([]);
  // Removido estado mostrarConfirmacao que não é mais utilizado
  const [mostrarSalvarConfirmacao, setMostrarSalvarConfirmacao] = useState(false);
  const [mostrarConfirmacaoParcial, setMostrarConfirmacaoParcial] = useState(false);
  const [itensNaoCalculadosCount, setItensNaoCalculadosCount] = useState(0);
  const [salvando, setSalvando] = useState(false);
  
  // Estados para a tabela de arquivos de dados
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>([]);
  const [filtroNF, setFiltroNF] = useState("");
  const [paginaAtualNF, setPaginaAtualNF] = useState(0);
  const [itensPorPaginaNF, setItensPorPaginaNF] = useState(5);
  const [notasFiscaisFiltradas, setNotasFiscaisFiltradas] = useState<NotaFiscal[]>([]);
  const [notaAtual, setNotaAtual] = useState<NotaFiscal | null>(null);
  
  // Estado para controlar a visibilidade do box de importação
  const [mostrarBoxImportacao, setMostrarBoxImportacao] = useState(false);
  
  // Estado para controlar a visibilidade do botão de importar
  const [mostrarBotaoImportar, setMostrarBotaoImportar] = useState(true);
  
  // Estado para controlar o carregamento de notas fiscais
  const [carregando, setCarregando] = useState(false);
  
  // Estados para o diálogo de margem padrão
  const [mostrarDialogoMargemPadrao, setMostrarDialogoMargemPadrao] = useState(false);
  const [margemPadrao, setMargemPadrao] = useState("30");
  const [itensSemMargem, setItensSemMargem] = useState(0);
  
  // Referência para o input de arquivo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descricaoInputRef = useRef<HTMLInputElement>(null);

  const handleArquivoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setArquivo(e.target.files[0]);
    }
  };

  // Inicialização - carregar notas fiscais simuladas ao montar o componente
  useEffect(() => {
    // Simular notas fiscais importadas
    const notasSimuladas: NotaFiscal[] = [
      {
        id: 1,
        numero: "NF-123456",
        dataEmissao: "2025-01-15",
        dataImportacao: "2025-01-16",
        fornecedor: "Tech Solutions Inc.",
        valorTotal: 15780.50,
        status: 'totalmente_precificada'
      },
      {
        id: 2,
        numero: "NF-654321",
        dataEmissao: "2025-02-03",
        dataImportacao: "2025-02-04",
        fornecedor: "Global Electronics",
        valorTotal: 8320.75,
        status: 'parcialmente_precificada'
      },
      {
        id: 3,
        numero: "NF-789456",
        dataEmissao: "2025-03-10",
        dataImportacao: "2025-03-11",
        fornecedor: "Digital Imports",
        valorTotal: 22450.00,
        status: 'nao_precificada'
      },
      {
        id: 4,
        numero: "NF-456789",
        dataEmissao: "2025-04-05",
        dataImportacao: "2025-04-06",
        fornecedor: "Tech Solutions Inc.",
        valorTotal: 11275.30,
        status: 'totalmente_precificada'
      },
      {
        id: 5,
        numero: "NF-987654",
        dataEmissao: "2025-04-12",
        dataImportacao: "2025-04-13",
        fornecedor: "Global Electronics",
        valorTotal: 9650.25,
        status: 'parcialmente_precificada'
      }
    ];
    
    setNotasFiscais(notasSimuladas);
    setNotasFiscaisFiltradas(notasSimuladas);
  }, []);
  
  // Efeitos para atualizar itens filtrados quando o filtro ou itens mudam
  useEffect(() => {
    if (itensImportados.length > 0) {
      const filtered = itensImportados.filter(item => 
        item.descricao.toLowerCase().includes(filtro.toLowerCase()) ||
        item.codigo.toLowerCase().includes(filtro.toLowerCase())
      );
      setItensFiltrados(filtered);
    }
  }, [filtro, itensImportados]);
  
  // Efeito para atualizar notas fiscais filtradas quando o filtro muda
  useEffect(() => {
    if (notasFiscais.length > 0) {
      const filtered = notasFiscais.filter(nf => 
        nf.numero.toLowerCase().includes(filtroNF.toLowerCase()) ||
        nf.fornecedor.toLowerCase().includes(filtroNF.toLowerCase())
      );
      setNotasFiscaisFiltradas(filtered);
    }
  }, [filtroNF, notasFiscais]);
  
  // Cálculo dos itens para a página atual com base na paginação
  const itensPaginaAtual = itensFiltrados.slice(
    paginaAtual * itensPorPagina, 
    (paginaAtual + 1) * itensPorPagina
  );
  
  // Cálculo dos itens para a página atual das notas fiscais
  const itensPaginaAtualNF = notasFiscaisFiltradas.slice(
    paginaAtualNF * itensPorPaginaNF, 
    (paginaAtualNF + 1) * itensPorPaginaNF
  );
  
  const handleClickImportBox = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setArquivo(e.target.files[0]);
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
      // Cria um novo arquivo de dados com base nos dados fornecidos
      const novaNotaFiscal: NotaFiscal = {
        id: notasFiscais.length + 1, // Gera um novo ID baseado no total de notas existentes
        numero: `NF-${Math.floor(100000 + Math.random() * 900000)}`, // Gera um número aleatório
        dataEmissao: new Date().toISOString().split('T')[0], // Data atual como data de emissão
        dataImportacao: new Date().toISOString().split('T')[0], // Data atual como data de importação
        fornecedor: descricaoArquivo, // Usa a descrição fornecida como fornecedor
        valorTotal: Math.floor(5000 + Math.random() * 20000), // Valor total aleatório entre 5000 e 25000
        status: 'nao_precificada' // Status inicial como não precificada
      };
      
      // Adiciona o novo arquivo de dados à lista de arquivos
      const notasFiscaisAtualizadas = [...notasFiscais, novaNotaFiscal];
      // Atualiza ambos os estados de uma vez
      setNotasFiscais(notasFiscaisAtualizadas);
      setNotasFiscaisFiltradas(notasFiscaisAtualizadas);
      
      // Limpa e reset
      setArquivo(null);
      setDescricaoArquivo('');
      setImportando(false);
      // Mantém a visualização da tabela de arquivos de dados
      setMostrarImportacao(true);
      setMostrarBoxImportacao(false);
      setMostrarBotaoImportar(true); // Reativar o botão de importar
      
      toast({
        title: "Importação concluída",
        description: "Arquivo importado com sucesso! O arquivo de dados foi adicionado à lista com status 'Pendente'.",
      });
    }, 1500);
  };

  // Função para aplicar margem padrão e calcular todos os itens
  const aplicarMargemPadraoECalcular = () => {
    const margemPadraoNumerica = parseFloat(margemPadrao);
    
    if (isNaN(margemPadraoNumerica)) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor numérico válido para a margem padrão.",
        variant: "destructive"
      });
      return;
    }
    
    // Atualizar itens sem margem com a margem padrão
    const itensAtualizados = itensImportados.map(item => {
      // Se o item já tem margem definida, mantém a margem original
      if (item.margem !== "" && item.margem !== undefined) {
        const margemNumerica = typeof item.margem === 'string' 
          ? parseFloat(item.margem) 
          : item.margem;
          
        return {
          ...item,
          valorAluguel: item.valorAquisicao * (1 + margemNumerica / 100) / (item.tempoContrato || 12), // Se não tiver tempo de contrato, assume 12 meses
          calculado: true,
          salvo: false // Sempre resetar o status de salvo ao calcular
        };
      } 
      // Se não tem margem, aplica a margem padrão
      else {
        return {
          ...item,
          margem: margemPadraoNumerica,
          valorAluguel: item.valorAquisicao * (1 + margemPadraoNumerica / 100) / (item.tempoContrato || 12), // Se não tiver tempo de contrato, assume 12 meses
          calculado: true,
          salvo: false
        };
      }
    });
    
    setItensImportados(itensAtualizados);
    setItensFiltrados(itensAtualizados);
    setMostrarDialogoMargemPadrao(false);
    
    toast({
      title: "Cálculo em massa concluído",
      description: `Valores de aluguel calculados para ${itensAtualizados.length} itens com margem padrão aplicada.`,
    });
  };

  const handleCalcularTodos = () => {
    // Verificar se todos os itens têm margem preenchida
    const semMargem = itensImportados.filter(
      item => item.margem === "" || item.margem === undefined
    );
    
    if (semMargem.length > 0) {
      // Em vez de mostrar toast de erro, exibir diálogo para definir margem padrão
      setItensSemMargem(semMargem.length);
      setMostrarDialogoMargemPadrao(true);
      return;
    }
    
    // Se todos os itens já têm margem, calcular normalmente
    // Em um caso real, chamaria a API para calcular todos os preços
    // Simulando atualização de todos os itens
    const itensAtualizados = itensImportados.map(item => {
      const margemNumerica = typeof item.margem === 'string' 
        ? parseFloat(item.margem) 
        : item.margem;
        
      return {
        ...item,
        valorAluguel: item.valorAquisicao * (1 + margemNumerica / 100) / (item.tempoContrato || 12), // Se não tiver tempo de contrato, assume 12 meses
        calculado: true,
        salvo: false // Sempre resetar o status de salvo ao calcular
      };
    });
    
    setItensImportados(itensAtualizados);
    setItensFiltrados(itensAtualizados);
    
    toast({
      title: "Cálculo em massa concluído",
      description: `Valores de aluguel calculados para ${itensAtualizados.length} itens.`,
    });
  };

  const handleSalvarTodos = () => {
    setSalvando(true);
    
    // Verificar se todos os itens foram calculados
    const itensNaoCalculados = itensImportados.filter(item => !item.calculado);
    
    if (itensNaoCalculados.length > 0) {
      setSalvando(false);
      toast({
        title: "Ação incompleta",
        description: `${itensNaoCalculados.length} itens ainda não foram calculados. Calcule todos os valores de aluguel antes de salvar.`,
        variant: "destructive"
      });
      return;
    }
    
    // Em um caso real, chamaria a API para salvar todos os itens
    // Simulando atualização de todos os itens
    const itensAtualizados = itensImportados.map(item => ({
      ...item,
      salvo: true
    }));
    
    // Simulando um delay para salvar
    setTimeout(() => {
      setItensImportados(itensAtualizados);
      setItensFiltrados(itensAtualizados);
      
      // Atualizar o status da arquivo de dados atual para "totalmente_precificada"
      if (notaAtual) {
        // Criar uma cópia atualizada da arquivo de dados atual
        const notaAtualizada = {
          ...notaAtual,
          status: 'totalmente_precificada' as const
        };
        
        // Atualizar a nota atual
        setNotaAtual(notaAtualizada);
        
        // Atualizar a nota na lista de notas fiscais
        const notasFiscaisAtualizadas = notasFiscais.map(nf => 
          nf.id === notaAtual.id ? notaAtualizada : nf
        );
        
        // Atualizar a lista de notas fiscais
        setNotasFiscais(notasFiscaisAtualizadas);
        setNotasFiscaisFiltradas(notasFiscaisAtualizadas);
      }
      
      setSalvando(false);
      
      toast({
        title: "Itens salvos",
        description: `${itensAtualizados.length} itens foram precificados e salvos com sucesso!`,
      });
      
      // Fechar qualquer diálogo que esteja aberto
      setMostrarSalvarConfirmacao(false);
    }, 1000);
  };
  
  // Função específica para salvar e iniciar nova importação
  const handleSalvarEIniciarNova = () => {
    setSalvando(true);
    
    // Verificar se todos os itens foram calculados
    const itensNaoCalculados = itensImportados.filter(item => !item.calculado);
    
    if (itensNaoCalculados.length > 0) {
      setSalvando(false);
      setItensNaoCalculadosCount(itensNaoCalculados.length);
      setMostrarConfirmacaoParcial(true);
      return;
    }
    
    // Se todos os itens foram calculados, prosseguir com o salvamento total
    handleSalvamentoCompleto();
  };
  
  // Função para realizar salvamento completo (todos os itens calculados)
  const handleSalvamentoCompleto = () => {
    // Em um caso real, chamaria a API para salvar todos os itens
    // Simulando atualização de todos os itens
    const itensAtualizados = itensImportados.map(item => ({
      ...item,
      salvo: true
    }));
    
    // Simulando um delay para salvar
    setTimeout(() => {
      // Atualizar o status da arquivo de dados atual para "totalmente_precificada"
      if (notaAtual) {
        // Criar uma cópia atualizada da arquivo de dados atual
        const notaAtualizada = {
          ...notaAtual,
          status: 'totalmente_precificada' as const
        };
        
        // Atualizar a nota na lista de notas fiscais
        const notasFiscaisAtualizadas = notasFiscais.map(nf => 
          nf.id === notaAtual.id ? notaAtualizada : nf
        );
        
        // Atualizar a lista de notas fiscais
        setNotasFiscais(notasFiscaisAtualizadas);
        setNotasFiscaisFiltradas(notasFiscaisAtualizadas);
      }
      
      setItensImportados([]);
      setItensFiltrados([]);
      setSalvando(false);
      
      toast({
        title: "Itens salvos",
        description: `Todos os itens foram precificados e salvos com sucesso!`,
      });
      
      // Fechar qualquer diálogo que esteja aberto
      setMostrarSalvarConfirmacao(false);
      setMostrarConfirmacaoParcial(false);
      
      // Limpar os dados e mostrar a tabela de arquivos de dados
      setArquivo(null);
      setMostrarImportacao(true);
    }, 1000);
  };
  
  // Função para realizar salvamento parcial (apenas itens calculados)
  const handleSalvamentoParcial = () => {
    // Filtrar apenas os itens que foram calculados
    const itensCalculados = itensImportados.filter(item => item.calculado);
    
    // Em um caso real, chamaria a API para salvar os itens calculados
    const itensAtualizados = itensImportados.map(item => ({
      ...item,
      salvo: item.calculado ? true : false
    }));
    
    // Simulando um delay para salvar
    setTimeout(() => {
      // Atualizar o status da arquivo de dados atual para "parcialmente_precificada"
      if (notaAtual) {
        // Criar uma cópia atualizada da arquivo de dados atual
        const notaAtualizada = {
          ...notaAtual,
          status: 'parcialmente_precificada' as const
        };
        
        // Atualizar a nota atual
        setNotaAtual(notaAtualizada);
        
        // Atualizar a nota na lista de notas fiscais
        const notasFiscaisAtualizadas = notasFiscais.map(nf => 
          nf.id === notaAtual.id ? notaAtualizada : nf
        );
        
        // Atualizar a lista de notas fiscais
        setNotasFiscais(notasFiscaisAtualizadas);
        setNotasFiscaisFiltradas(notasFiscaisAtualizadas);
      }
      
      setItensImportados([]);
      setItensFiltrados([]);
      setSalvando(false);
      
      toast({
        title: "Itens parcialmente salvos",
        description: `${itensCalculados.length} itens calculados foram salvos com sucesso!`,
      });
      
      // Fechar qualquer diálogo que esteja aberto
      setMostrarSalvarConfirmacao(false);
      setMostrarConfirmacaoParcial(false);
      
      // Limpar os dados e mostrar a tabela de arquivos de dados
      setArquivo(null);
      setMostrarImportacao(true);
    }, 1000);
  };
  
  // Função para limpar e iniciar nova importação (descartar alterações)
  const limparEIniciarNovaImportacao = (mostrarToast = true) => {
    // Limpar todos os dados
    setItensImportados([]);
    setItensFiltrados([]);
    
    // Fechar qualquer diálogo que esteja aberto
    setMostrarSalvarConfirmacao(false);
    
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
  
  // Manipuladores para paginação
  const proximaPagina = () => {
    if ((paginaAtual + 1) * itensPorPagina < itensFiltrados.length) {
      setPaginaAtual(paginaAtual + 1);
    }
  };
  
  const paginaAnterior = () => {
    if (paginaAtual > 0) {
      setPaginaAtual(paginaAtual - 1);
    }
  };
  
  // Manipuladores para paginação de notas fiscais
  const proximaPaginaNF = () => {
    if ((paginaAtualNF + 1) * itensPorPaginaNF < notasFiscaisFiltradas.length) {
      setPaginaAtualNF(paginaAtualNF + 1);
    }
  };
  
  const paginaAnteriorNF = () => {
    if (paginaAtualNF > 0) {
      setPaginaAtualNF(paginaAtualNF - 1);
    }
  };
  
  // Manipuladores para filtros
  const handleBusca = (e: ChangeEvent<HTMLInputElement>) => {
    setFiltro(e.target.value);
    setPaginaAtual(0); // Voltar para a primeira página ao filtrar
  };
  
  const handleBuscaNF = (e: ChangeEvent<HTMLInputElement>) => {
    setFiltroNF(e.target.value);
    setPaginaAtualNF(0); // Voltar para a primeira página ao filtrar
  };
  
  // Manipuladores para itens por página
  const handleChangeItensPorPagina = (valor: string) => {
    setItensPorPagina(parseInt(valor));
    setPaginaAtual(0); // Voltar para a primeira página
  };
  
  const handleChangeItensPorPaginaNF = (valor: string) => {
    setItensPorPaginaNF(parseInt(valor));
    setPaginaAtualNF(0); // Voltar para a primeira página
  };
  
  // Função para voltar para importação ou painel
  const handleVoltar = () => {
    // Se estiver mostrando o box de importação, fechar e mostrar a tabela de NFs
    if (mostrarBoxImportacao) {
      // Limpar o arquivo selecionado e a descrição
      setArquivo(null);
      setDescricaoArquivo('');
      
      // Fechar box de importação e mostrar tabela de NFs
      setMostrarBoxImportacao(false);
      setMostrarImportacao(true);
      setMostrarBotaoImportar(true); // Reativa o botão quando voltar
      return;
    }
    
    // Se estiver mostrando itens importados (e não a tabela)
    if (itensImportados.length > 0 && !mostrarImportacao) {
      // Verificar se há itens não salvos
      const itensNaoSalvos = itensImportados.filter(item => item.calculado && !item.salvo);
      
      if (itensNaoSalvos.length > 0) {
        // Mostrar diálogo de confirmação para salvar
        setMostrarSalvarConfirmacao(true);
      } else {
        // Se não houver itens não salvos, voltar para a tabela de NFs
        limparEIniciarNovaImportacao(false);
      }
    } else {
      // Se estiver na tabela de NFs, volta para a página anterior
      setLocation("/precificacao/alugueis");
    }
  };
  
  // Função para baixar PDF da arquivo de dados
  const handleDownloadPDF = (nf: NotaFiscal) => {
    // Simulando download de PDF
    toast({
      title: "Download iniciado",
      description: `Iniciando download do PDF do Arquivo ${nf.numero}...`,
    });
    
    // Em produção, isso redirecionaria para um endpoint real de download
  };
  
  // Função para editar uma arquivo de dados
  const handleEditarNota = (nf: NotaFiscal) => {
    // Mostrar tela de carregamento
    setCarregando(true);
    
    // Simular carregamento de itens da arquivo de dados selecionada
    setImportando(true);
    setMostrarImportacao(false);
    
    // Armazenar a arquivo de dados atual sendo editada
    setNotaAtual(nf);
    
    // Simulando um delay de processamento
    setTimeout(() => {
      // Simulando itens de aluguel da arquivo de dados selecionada
      const itensSimulados = [
        { codigo: `${nf.numero}-001`, descricao: "Notebook Dell Latitude", quantidade: 1, valorAquisicao: 5500.00, tempoContrato: 12 },
        { codigo: `${nf.numero}-002`, descricao: "Projetor Epson", quantidade: 1, valorAquisicao: 3200.00, tempoContrato: 24 },
        { codigo: `${nf.numero}-003`, descricao: "Mac Mini", quantidade: 2, valorAquisicao: 8800.00, tempoContrato: 36 },
        { codigo: `${nf.numero}-004`, descricao: "Servidor Dell PowerEdge", quantidade: 1, valorAquisicao: 12500.00, tempoContrato: 48 },
      ];
      
      // Adicionando campo margem (vazia), valor de aluguel (zerado), calculado e salvo para cada item
      const itensComMargem = itensSimulados.map(item => ({
        ...item,
        margem: "", // Margem vazia, o usuário deve preencher
        valorAluguel: 0, // Valor de aluguel inicialmente zerado
        calculado: false, // Indica se o preço já foi calculado
        salvo: false // Indica se o item já foi salvo
      }));
      
      setItensImportados(itensComMargem);
      setItensFiltrados(itensComMargem);
      setImportando(false);
      setCarregando(false); // Esconder tela de carregamento depois que terminar
      
      toast({
        title: "Arquivo de dados carregado",
        description: `${itensSimulados.length} bens do arquivo "${nf.fornecedor}" foram carregados para edição.`,
      });
    }, 1500);
  };
  
  // Função para importar produtos de uma arquivo de dados para o sistema
  const [importacaoProgresso, setImportacaoProgresso] = useState(0);
  const [mostrarProgressoImportacao, setMostrarProgressoImportacao] = useState(false);
  const [mostrarImportacaoConcluida, setMostrarImportacaoConcluida] = useState(false);
  
  const handleImportarParaSistema = (nf: NotaFiscal) => {
    // Verifica se o arquivo de dados está completamente precificado
    if (nf.status !== 'totalmente_precificada') {
      toast({
        title: "Operação não permitida",
        description: "Apenas arquivos de dados completamente precificados podem ser importados para o sistema.",
        variant: "destructive"
      });
      return;
    }
    
    // Simulando uma verificação de itens
    const temErros = false; // Em um caso real, isso seria determinado após validação
    
    if (temErros) {
      toast({
        title: "Erro na importação",
        description: "Existem bens com problemas de precificação. Verifique e corrija antes de importar.",
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
        
        // Atualizar o status da nota para "importado"
        const notasFiscaisAtualizadas = notasFiscais.map(nota => {
          if (nota.id === nf.id) {
            return {
              ...nota,
              status: 'importado' as const // Garantindo que o tipo seja correto
            };
          }
          return nota;
        });
        
        setNotasFiscais(notasFiscaisAtualizadas);
        setNotasFiscaisFiltradas(notasFiscaisAtualizadas);
        
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
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 sm:mt-0">Importação do Bem para Aluguel</h2>
          <p className="text-gray-500">Importe e precifique bens de aluguel a partir de arquivo de dados</p>
        </div>
        <div className="mt-2 lg:mt-0">
          {itensImportados.length > 0 && !mostrarImportacao ? (
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
                  className="flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => {
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
            <CardTitle>Arquivos de dados Importados</CardTitle>
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
                  value={filtroNF}
                  onChange={handleBuscaNF}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
              <div className="min-w-[600px] w-full">
                <Table className="w-full table-auto">
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
                  {notasFiscaisFiltradas.length > 0 
                    ? itensPaginaAtualNF.map((nf) => {
                        // Definir as classes e rótulos com base no status
                        let rowColorClass = '';
                        let statusBadgeClass = '';
                        let statusLabel = '';
                        
                        if (nf.status === 'nao_precificada') {
                          rowColorClass = 'bg-red-50 hover:bg-red-100';
                          statusBadgeClass = 'bg-red-100 text-red-800';
                          statusLabel = 'Pendente';
                        } else if (nf.status === 'parcialmente_precificada') {
                          rowColorClass = 'bg-yellow-50 hover:bg-yellow-100';
                          statusBadgeClass = 'bg-yellow-100 text-yellow-800';
                          statusLabel = 'Parcial';
                        } else if (nf.status === 'totalmente_precificada') {
                          rowColorClass = 'bg-green-50 hover:bg-green-100';
                          statusBadgeClass = 'bg-green-100 text-green-800';
                          statusLabel = 'Completa';
                        } else if (nf.status === 'importado') {
                          rowColorClass = 'bg-blue-50 hover:bg-blue-100';
                          statusBadgeClass = 'bg-blue-100 text-blue-800';
                          statusLabel = 'Importado';
                        }
                        
                        return (
                          <TableRow key={nf.id} className={rowColorClass}>
                            <TableCell className="font-medium">{nf.numero}</TableCell>
                            <TableCell>{nf.dataImportacao}</TableCell>
                            <TableCell>{nf.fornecedor}</TableCell>
                            <TableCell>
                              {nf.valorTotal.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}
                            </TableCell>
                            <TableCell>
                              {nf.status === 'importado' ? (
                                <div className="relative inline-block group">
                                  <span className={`text-xs px-2 py-1 rounded-full ${statusBadgeClass} flex items-center`}>
                                    <Check className="h-3 w-3 mr-1" />
                                    {statusLabel}
                                  </span>
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                    Bens importados
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
                                  onClick={() => handleDownloadPDF(nf)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  title={nf.status === 'importado' ? "Arquivo já importado" : "Editar importação"}
                                  onClick={() => handleEditarNota(nf)}
                                  disabled={nf.status === 'importado'}
                                  className={nf.status === 'importado' ? "text-gray-400 cursor-not-allowed" : ""}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  title={nf.status === 'importado' ? "Bens já importados" : "Importar para sistema"}
                                  onClick={() => handleImportarParaSistema(nf)}
                                  disabled={nf.status !== 'totalmente_precificada'}
                                  className={
                                    nf.status === 'importado' 
                                      ? 'text-gray-400 cursor-not-allowed' 
                                      : nf.status === 'totalmente_precificada' 
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
                          {filtroNF
                            ? "Nenhum arquivo de dados encontrado com este termo. Tente outra busca."
                            : "Nenhum arquivo de dados importado ainda."}
                        </TableCell>
                      </TableRow>
                  }
                </TableBody>
              </Table>
              </div>
            </div>
            
            {/* Paginação para arquivos de dados */}
            {notasFiscaisFiltradas.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-2">
                  <Select
                    value={String(itensPorPaginaNF)}
                    onValueChange={handleChangeItensPorPaginaNF}
                  >
                    <SelectTrigger className="h-8 w-16">
                      <SelectValue placeholder={itensPorPaginaNF} />
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
                    onClick={paginaAnteriorNF}
                    disabled={paginaAtualNF === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="mx-2">
                    {notasFiscaisFiltradas.length > 0 
                      ? `${paginaAtualNF + 1}/${Math.ceil(notasFiscaisFiltradas.length / itensPorPaginaNF)}`
                      : "0/0"
                    }
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={proximaPaginaNF}
                    disabled={(paginaAtualNF + 1) * itensPorPaginaNF >= notasFiscaisFiltradas.length}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Box de Importação de Arquivo */}
      {mostrarBoxImportacao && (
        <Card className="my-6">
          <CardHeader>
            <div>
              <CardTitle className="text-xl mb-3">Importar Arquivo de Dados</CardTitle>
              <CardDescription>
                Importe o arquivo de dados dos seus produtos e ajuste os valores de todos os produtos ao mesmo tempo. Com a importação do arquivo, você consegue ajustar todos eles de forma fácil, sem a necessidade de recadastrar.
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
                      ref={descricaoInputRef}
                      id="descricaoArquivo"
                      placeholder="Ex: Arquivo 12345, Produtos de Março/2025, etc."
                      className="mt-1"
                      value={descricaoArquivo}
                      onChange={(e) => setDescricaoArquivo(e.target.value)}
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
                      className="w-full md:w-2/3 bg-purple-600 hover:bg-purple-700 text-white"
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
      
      {/* Tabela de Itens de Aluguel Importados */}
      {itensImportados.length > 0 && !mostrarImportacao && !mostrarBoxImportacao && (
        <Card className="max-w-[1200px] mx-auto overflow-hidden">
          <CardHeader className="px-2 sm:px-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <CardTitle className="text-lg md:text-xl">Bens Para Aluguel Importados{notaAtual && `: ${notaAtual.fornecedor}`}</CardTitle>
                <CardDescription>
                  Lista de bens para aluguel importados do arquivo de dados
                </CardDescription>
              </div>
              <div className="flex flex-row space-x-1">
                <Button 
                  variant="outline" 
                  onClick={handleCalcularTodos} 
                  className="flex items-center justify-center"
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Calcular Todos
                </Button>
                <Button 
                  onClick={handleSalvarTodos} 
                  disabled={salvando}
                  className="flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {salvando ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Todos
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-1 sm:px-6 overflow-hidden">
            {/* Campo de busca para itens de aluguel */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou descrição..."
                  value={filtro}
                  onChange={handleBusca}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
              <div className="min-w-[600px] w-full">
                <Table className="w-full table-auto">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead className="whitespace-nowrap">Descrição</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Qtd</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Unidade</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Valor do Bem (R$)</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Frete (R$)</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Contrato</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Retorno</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Lucro Mensal (%)</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Valor Aluguel (R$)</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Lucro (R$)</TableHead>
                    <TableHead className="whitespace-nowrap">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensFiltrados.length > 0 ? (
                    itensPaginaAtual.map((item, index) => {
                      const handleCalcular = () => {
                        // Verificar se a margem está preenchida
                        if (item.margem === "" || item.margem === undefined) {
                          toast({
                            title: "Lucro mensal não preenchido",
                            description: "Por favor, preencha o percentual de lucro mensal antes de calcular.",
                            variant: "destructive"
                          });
                          return;
                        }
                        
                        // Calcular o valor de aluguel com base na margem
                        const margemNumerica = typeof item.margem === 'string' ? parseFloat(item.margem) : item.margem;
                        
                        if (!isNaN(margemNumerica)) {
                          const valorAluguelCalculado = item.valorAquisicao * (1 + margemNumerica / 100) / (item.tempoContrato || 12);
                          
                          const itensAtualizados = [...itensImportados];
                          const itemIndex = itensPaginaAtual.indexOf(item) + paginaAtual * itensPorPagina;
                          
                          itensAtualizados[itemIndex] = {
                            ...item,
                            valorAluguel: valorAluguelCalculado,
                            calculado: true
                          };
                          
                          setItensImportados(itensAtualizados);
                          
                          // Atualizando também o array filtrado
                          const itensFiltradosAtualizados = [...itensFiltrados];
                          const itemFiltradoIndex = itensFiltradosAtualizados.findIndex(i => i.codigo === item.codigo);
                          
                          if (itemFiltradoIndex !== -1) {
                            itensFiltradosAtualizados[itemFiltradoIndex] = itensAtualizados[itemIndex];
                            setItensFiltrados(itensFiltradosAtualizados);
                          }
                          
                          toast({
                            title: "Cálculo realizado",
                            description: `Valor de aluguel calculado para o bem ${item.descricao}.`,
                          });
                        }
                      };
                      
                      const handleSalvar = () => {
                        // Verificar se o item está calculado
                        if (!item.calculado) {
                          toast({
                            title: "Cálculo necessário",
                            description: "Por favor, calcule o valor de aluguel antes de salvar.",
                            variant: "destructive"
                          });
                          return;
                        }
                        
                        // Simular salvamento do item
                        const itensAtualizados = [...itensImportados];
                        const itemIndex = itensAtualizados.findIndex(i => i.codigo === item.codigo);
                        
                        if (itemIndex !== -1) {
                          itensAtualizados[itemIndex] = {
                            ...itensAtualizados[itemIndex],
                            salvo: true
                          };
                          
                          setItensImportados(itensAtualizados);
                          
                          // Atualizando também o array filtrado
                          const itensFiltradosAtualizados = [...itensFiltrados];
                          const itemFiltradoIndex = itensFiltradosAtualizados.findIndex(i => i.codigo === item.codigo);
                          
                          if (itemFiltradoIndex !== -1) {
                            itensFiltradosAtualizados[itemFiltradoIndex] = itensAtualizados[itemIndex];
                            setItensFiltrados(itensFiltradosAtualizados);
                          }
                          
                          toast({
                            title: "Item salvo",
                            description: `Bem ${item.descricao} salvo com sucesso.`,
                          });
                          
                          // Verificar se todos os itens estão salvos
                          const todosSalvos = itensAtualizados.every(i => i.salvo);
                          if (todosSalvos && notaAtual) {
                            // Atualizar o status da nota fiscal para "totalmente_precificada"
                            const notaAtualizada = {
                              ...notaAtual,
                              status: 'totalmente_precificada' as const
                            };
                            
                            // Atualizar a nota na lista de notas fiscais
                            const notasFiscaisAtualizadas = notasFiscais.map(nf => 
                              nf.id === notaAtual.id ? notaAtualizada : nf
                            );
                            
                            setNotaAtual(notaAtualizada);
                            setNotasFiscais(notasFiscaisAtualizadas);
                            setNotasFiscaisFiltradas(notasFiscaisAtualizadas);
                          }
                        }
                      };
                      
                      const handleMargemChange = (e: ChangeEvent<HTMLInputElement>) => {
                        // Permita campo vazio ou número
                        const valor = e.target.value;
                        const novoValor = valor === "" ? "" : (parseFloat(valor) || 0);
                        
                        // Limitando a margem entre 0 e 100 se for número
                        const margemFinal = valor === "" ? 
                          "" : 
                          Math.min(100, Math.max(0, typeof novoValor === 'number' ? novoValor : 0));
                        
                        // Atualizando o item
                        const itensAtualizados = [...itensImportados];
                        const itemIndex = itensAtualizados.findIndex(i => i.codigo === item.codigo);
                        
                        if (itemIndex !== -1) {
                          itensAtualizados[itemIndex] = {
                            ...itensAtualizados[itemIndex],
                            margem: margemFinal,
                            calculado: false // Resetar status de calculado quando a margem muda
                          };
                          
                          setItensImportados(itensAtualizados);
                          
                          // Atualizando também o array filtrado
                          const itensFiltradosAtualizados = [...itensFiltrados];
                          const itemFiltradoIndex = itensFiltradosAtualizados.findIndex(i => i.codigo === item.codigo);
                          
                          if (itemFiltradoIndex !== -1) {
                            itensFiltradosAtualizados[itemFiltradoIndex] = itensAtualizados[itemIndex];
                            setItensFiltrados(itensFiltradosAtualizados);
                          }
                        }
                      };
                      
                      const lucroEmReais = item.calculado 
                        ? item.valorAluguel * (item.tempoContrato || 12) - item.valorAquisicao 
                        : 0;
                      
                      return (
                        <TableRow key={item.codigo} className={item.salvo ? "bg-green-50" : ""}>
                          <TableCell className="font-medium">{item.codigo}</TableCell>
                          <TableCell>{item.descricao}</TableCell>
                          <TableCell className="text-center">{item.quantidade}</TableCell>
                          <TableCell className="text-center">UN</TableCell>
                          <TableCell className="text-center">
                            {item.valorAquisicao.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </TableCell>
                          <TableCell className="text-center">
                            {'R$ 0,00'}
                          </TableCell>
                          <TableCell className="text-center">{item.tempoContrato} meses</TableCell>
                          <TableCell className="text-center">
                            {'24 meses'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={item.margem.toString()}
                              onChange={handleMargemChange}
                              className="w-20 mx-auto text-center"
                              placeholder="0"
                              title="Percentual de lucro mensal"
                              disabled={item.salvo}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            {item.calculado
                              ? item.valorAluguel.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                })
                              : 'R$ 0,00'}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.calculado 
                              ? lucroEmReais.toLocaleString('pt-BR', {
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
                                onClick={handleCalcular}
                                title="Calcular valor de aluguel"
                                disabled={item.salvo}
                              >
                                <Calculator className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="default" 
                                size="icon"
                                onClick={handleSalvar}
                                disabled={!item.calculado || item.salvo}
                                className="bg-purple-600 hover:bg-purple-700"
                                title={item.salvo ? "Item já salvo" : "Salvar item"}
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
                      <TableCell colSpan={12} className="text-center py-6 text-gray-500">
                        {filtro
                          ? "Nenhum item encontrado com este termo. Tente outra busca."
                          : "Nenhum item importado ainda."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </div>
            
            {/* Paginação para itens */}
            {itensFiltrados.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0 mt-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Select
                      value={String(itensPorPagina)}
                      onValueChange={handleChangeItensPorPagina}
                    >
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue placeholder={itensPorPagina} />
                      </SelectTrigger>
                      <SelectContent side="top">
                        {[5, 10, 20, 50].map((pageSize) => (
                          <SelectItem key={pageSize} value={`${pageSize}`}>
                            {pageSize}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm font-medium">itens por página</p>
                  </div>
                  
                  <span className="text-sm text-muted-foreground">
                    Mostrando {itensFiltrados.length > 0 ? paginaAtual * itensPorPagina + 1 : 0}-{
                      Math.min((paginaAtual + 1) * itensPorPagina, itensFiltrados.length)
                    } de {itensFiltrados.length} itens
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={paginaAnterior}
                    disabled={paginaAtual === 0}
                    className="h-8 w-8 p-0"
                  >
                    <span className="sr-only">Página anterior</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Página {paginaAtual + 1} de {Math.max(1, Math.ceil(itensFiltrados.length / itensPorPagina))}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={proximaPagina}
                    disabled={(paginaAtual + 1) * itensPorPagina >= itensFiltrados.length}
                    className="h-8 w-8 p-0"
                  >
                    <span className="sr-only">Próxima página</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Diálogo para confirmar salvar */}
      <Dialog open={mostrarSalvarConfirmacao} onOpenChange={setMostrarSalvarConfirmacao}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Itens não salvos</DialogTitle>
            <DialogDescription>
              Você tem itens de aluguel que foram calculados, mas ainda não foram salvos. O que deseja fazer?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-2">
            <Button 
              variant="default" 
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleSalvarTodos}
              disabled={salvando}
            >
              {salvando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar todos os itens calculados
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => {
                limparEIniciarNovaImportacao();
                setMostrarSalvarConfirmacao(false);
              }}
              disabled={salvando}
            >
              <Trash className="mr-2 h-4 w-4" />
              Descartar alterações
            </Button>
            <Button 
              variant="outline"
              onClick={() => setMostrarSalvarConfirmacao(false)}
              disabled={salvando}
            >
              Continuar editando
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Margem Padrão */}
      <Dialog open={mostrarDialogoMargemPadrao} onOpenChange={setMostrarDialogoMargemPadrao}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center text-purple-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Lucro Mensal (%) Não Definido
            </DialogTitle>
            <DialogDescription className="pt-2">
              <div className="bg-purple-50 p-3 rounded-md border border-purple-200 mb-3">
                <p className="text-sm text-gray-600">
                  <strong>{itensSemMargem}</strong> itens estão sem percentual de lucro mensal definido. Você deseja usar um lucro mensal padrão para todos esses itens?
                </p>
              </div>
              
              <div className="mt-4 mb-2">
                <Label htmlFor="margemPadrao">Lucro Mensal Padrão (%)</Label>
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
              className="bg-purple-600 hover:bg-purple-700 w-full"
              onClick={aplicarMargemPadraoECalcular}
            >
              <Calculator className="mr-2 h-4 w-4" />
              Aplicar lucro mensal padrão e calcular todos
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
      
      {/* Diálogo de confirmação de salvamento parcial */}
      <Dialog open={mostrarConfirmacaoParcial} onOpenChange={setMostrarConfirmacaoParcial}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Itens não calculados</DialogTitle>
            <DialogDescription>
              Existem {itensNaoCalculadosCount} itens que ainda não foram calculados. O que deseja fazer?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-2">
            <Button 
              variant="default" 
              className="bg-yellow-600 hover:bg-yellow-700"
              onClick={handleSalvamentoParcial}
              disabled={salvando}
            >
              {salvando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar apenas os itens calculados
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={() => setMostrarConfirmacaoParcial(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de progresso de importação */}
      <Dialog open={mostrarProgressoImportacao} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center text-purple-600">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Importando Bens para o Sistema
            </DialogTitle>
            <DialogDescription className="pt-2">
              <div className="bg-purple-50 p-3 rounded-md border border-purple-200 mb-3">
                <p className="text-sm text-gray-600">
                  Aguarde enquanto os bens são importados para o sistema. Este processo pode levar alguns instantes.
                </p>
              </div>
              
              <div className="mt-4 mb-2">
                <p className="text-sm font-medium mb-2">Progresso da importação</p>
                <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-600 transition-all duration-300 ease-in-out"
                    style={{ width: `${importacaoProgresso}%` }}
                  />
                </div>
                <p className="text-right text-xs text-gray-500 mt-1">{importacaoProgresso}%</p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de importação concluída */}
      <Dialog open={mostrarImportacaoConcluida} onOpenChange={setMostrarImportacaoConcluida}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center text-purple-600">
              <Check className="h-5 w-5 mr-2" />
              Importação Concluída
            </DialogTitle>
            <DialogDescription>
              Todos os bens do arquivo de dados foram importados com sucesso para o sistema!
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-purple-50 p-3 rounded-md border border-purple-200 mb-3 mt-4">
            <span className="text-sm text-gray-600">
              Todos os bens do arquivo de dados foram importados e agora estão disponíveis no sistema.
            </span>
          </div>
          
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="bg-purple-100 p-5 rounded-lg border-2 border-purple-300 w-28 h-28 flex items-center justify-center relative mb-2">
              <Trophy className="h-16 w-16 text-purple-600" />
              <div className="absolute -top-3 -right-3">
                <PartyPopper className="h-8 w-8 text-amber-500" />
              </div>
              <div className="absolute -bottom-3 -left-3">
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            <span className="text-center font-semibold text-purple-700 mt-1">Parabéns! Importação concluída com sucesso!</span>
          </div>
          
          <Button 
            variant="default" 
            className="bg-purple-600 hover:bg-purple-700 w-full"
            onClick={() => {
              setMostrarImportacaoConcluida(false);
              // Redirecionar para a página de cadastro de alugueis
              setLocation("/precificacao/alugueis");
            }}
          >
            Ir para cadastro de bens para aluguel
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}