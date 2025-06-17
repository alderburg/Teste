// Serviço para cálculos de precificação

interface CalculoProdutoParams {
  valorCusto: number;
  frete?: number;
  lucroPercentual: number;
  tipoLucro?: "BRUTO" | "LIQUIDO"; // BRUTO (padrão) ou LIQUIDO
  formaPagamento: string;
  parcelas?: number;
  custos?: number[];
  taxas?: { [key: string]: number };
}

interface CalculoServicoParams {
  valorCusto: number;
  deslocamento?: number;
  valorKm?: number;
  lucroPercentual: number;
  formaPagamento: string;
  parcelas?: number;
  custos?: number[];
  taxas?: { [key: string]: number };
}

interface CalculoAluguelParams {
  valorEquipamento: number;
  frete?: number;
  retornoInvestimentoMeses: number;
  tempoContratoMeses: number;
  lucroMensalPercentual: number;
  deslocamento?: number;
  valorKm?: number;
  formaPagamento: string;
  parcelas?: number;
  custos?: number[];
  taxas?: { [key: string]: number };
}

interface CalculoMarketplaceParams {
  valorCusto: number;
  frete?: number;
  lucroPercentual: number;
  taxaMarketplace: number;
  formaPagamento: string;
  parcelas?: number;
  custos?: number[];
  taxas?: { [key: string]: number };
}

interface ResultadoCalculo {
  valorVenda: number;
  lucroBruto: number;
  lucroLiquido: number;
  lucroPercentual: number;
  valorParcela?: number;
  custoTotal: number;
  taxaTotal: number;
}

// Calcula tarifas de pagamento com base na forma e número de parcelas
function calcularTarifaPagamento(formaPagamento: string, parcelas: number = 1): number {
  if (formaPagamento === 'a_vista') return 0;
  
  if (formaPagamento === 'cartao_credito') {
    // Taxa base de 2.5% + 0.5% por parcela acima de 1
    return 2.5 + (Math.max(0, parcelas - 1) * 0.5);
  }
  
  if (formaPagamento === 'boleto') return 1.5;
  if (formaPagamento === 'pix') return 0.9;
  if (formaPagamento === 'transferencia') return 0;
  
  return 0;
}

// Calcula o preço de venda para produtos novos e usados
export function calcularPrecoProduto(params: CalculoProdutoParams): ResultadoCalculo {
  const {
    valorCusto,
    frete = 0,
    lucroPercentual,
    tipoLucro = "BRUTO", // BRUTO é o padrão
    formaPagamento,
    parcelas = 1,
    custos = [],
    taxas = {}
  } = params;
  
  // Soma todos os custos adicionais
  const custoTotal = custos.reduce((acc, custo) => acc + custo, 0);
  
  // Calcula taxa da forma de pagamento
  const taxaPagamento = calcularTarifaPagamento(formaPagamento, parcelas);
  
  // Soma todas as taxas
  const taxaTotal = Object.values(taxas).reduce((acc, taxa) => acc + taxa, 0) + taxaPagamento;
  
  // Base para cálculo (custo + frete + outros custos)
  const custoBase = valorCusto + frete + custoTotal;
  
  let valorVenda: number;
  
  if (tipoLucro === "BRUTO") {
    // Fator de markup para atingir o lucro bruto desejado
    const fatorMarkup = (100 + lucroPercentual) / 100;
    // Preço de venda considerando apenas o lucro bruto
    valorVenda = custoBase * fatorMarkup;
    
    // Ajustar considerando as taxas
    if (taxaTotal > 0) {
      // Se tem taxas, precisamos aumentar o valor para que depois das taxas
      // o lucro ainda seja o esperado
      valorVenda = valorVenda / (1 - taxaTotal / 100);
    }
  } else { // tipoLucro === "LIQUIDO"
    // Fator de markup para atingir o lucro líquido desejado considerando as taxas
    const fatorMarkup = (100 + lucroPercentual) / (100 - taxaTotal);
    // Preço de venda
    valorVenda = custoBase * fatorMarkup;
  }
  
  // Lucro bruto (sem considerar taxas)
  const lucroBruto = valorVenda - custoBase;
  
  // Lucro líquido (considerando taxas)
  const taxaValor = valorVenda * (taxaTotal / 100);
  const lucroLiquido = lucroBruto - taxaValor;
  
  // Lucro percentual efetivo sobre o custo
  const lucroPercentualEfetivo = (lucroLiquido / custoBase) * 100;
  
  // Valor da parcela, se aplicável
  const valorParcela = parcelas > 1 ? valorVenda / parcelas : undefined;
  
  return {
    valorVenda,
    lucroBruto,
    lucroLiquido,
    lucroPercentual: lucroPercentualEfetivo,
    valorParcela,
    custoTotal,
    taxaTotal
  };
}

// Calcula o preço de venda para serviços
export function calcularPrecoServico(params: CalculoServicoParams): ResultadoCalculo {
  const {
    valorCusto,
    deslocamento = 0,
    valorKm = 1.5, // Valor padrão por km
    lucroPercentual,
    formaPagamento,
    parcelas = 1,
    custos = [],
    taxas = {}
  } = params;
  
  // Calcula custo de deslocamento
  const custoDeslocamento = deslocamento * valorKm;
  
  // Soma todos os custos adicionais incluindo deslocamento
  const custoTotal = custos.reduce((acc, custo) => acc + custo, 0) + custoDeslocamento;
  
  // Calcula taxa da forma de pagamento
  const taxaPagamento = calcularTarifaPagamento(formaPagamento, parcelas);
  
  // Soma todas as taxas
  const taxaTotal = Object.values(taxas).reduce((acc, taxa) => acc + taxa, 0) + taxaPagamento;
  
  // Base para cálculo (custo + outros custos)
  const custoBase = valorCusto + custoTotal;
  
  // Fator de markup para atingir o lucro desejado considerando as taxas
  const fatorMarkup = (100 + lucroPercentual) / (100 - taxaTotal);
  
  // Preço de venda
  const valorVenda = custoBase * fatorMarkup;
  
  // Lucro bruto (sem considerar taxas)
  const lucroBruto = valorVenda - custoBase;
  
  // Lucro líquido (considerando taxas)
  const taxaValor = valorVenda * (taxaTotal / 100);
  const lucroLiquido = lucroBruto - taxaValor;
  
  // Lucro percentual efetivo sobre o custo
  const lucroPercentualEfetivo = (lucroLiquido / custoBase) * 100;
  
  // Valor da parcela, se aplicável
  const valorParcela = parcelas > 1 ? valorVenda / parcelas : undefined;
  
  return {
    valorVenda,
    lucroBruto,
    lucroLiquido,
    lucroPercentual: lucroPercentualEfetivo,
    valorParcela,
    custoTotal,
    taxaTotal
  };
}

// Calcula o preço de aluguel mensal
export function calcularPrecoAluguel(params: CalculoAluguelParams): ResultadoCalculo {
  const {
    valorEquipamento,
    frete = 0,
    retornoInvestimentoMeses,
    tempoContratoMeses,
    lucroMensalPercentual,
    deslocamento = 0,
    valorKm = 1.5, // Valor padrão por km
    formaPagamento,
    parcelas = 1,
    custos = [],
    taxas = {}
  } = params;
  
  // Calcula custo de deslocamento
  const custoDeslocamento = deslocamento * valorKm;
  
  // Soma todos os custos adicionais incluindo deslocamento
  const custoTotal = custos.reduce((acc, custo) => acc + custo, 0) + custoDeslocamento;
  
  // Calcula taxa da forma de pagamento
  const taxaPagamento = calcularTarifaPagamento(formaPagamento, parcelas);
  
  // Soma todas as taxas
  const taxaTotal = Object.values(taxas).reduce((acc, taxa) => acc + taxa, 0) + taxaPagamento;
  
  // Valor base do equipamento incluindo frete
  const valorBaseEquipamento = valorEquipamento + frete;
  
  // Valor mensal para recuperar o investimento
  const valorMensalRecuperacao = valorBaseEquipamento / retornoInvestimentoMeses;
  
  // Definir o lucro mensal com base no período do contrato
  let lucroAjustado = lucroMensalPercentual;
  
  // Se o tempo de contrato for maior que o tempo de retorno, ajusta o lucro
  if (tempoContratoMeses > retornoInvestimentoMeses) {
    // Após o período de retorno, o lucro é 100% + percentual definido
    const mesesAposRetorno = tempoContratoMeses - retornoInvestimentoMeses;
    const lucroDuranteRetorno = valorMensalRecuperacao * (lucroMensalPercentual / 100) * retornoInvestimentoMeses;
    const lucroAposRetorno = valorMensalRecuperacao * (1 + 0.05) * mesesAposRetorno; // 100% + 5%
    
    // Lucro médio ajustado pelo período total
    lucroAjustado = ((lucroDuranteRetorno + lucroAposRetorno) / valorMensalRecuperacao / tempoContratoMeses) * 100;
  }
  
  // Base para cálculo mensal
  const custoBase = valorMensalRecuperacao + (custoTotal / tempoContratoMeses);
  
  // Fator de markup para atingir o lucro desejado considerando as taxas
  const fatorMarkup = (100 + lucroAjustado) / (100 - taxaTotal);
  
  // Preço mensal
  const valorVenda = custoBase * fatorMarkup;
  
  // Lucro bruto mensal (sem considerar taxas)
  const lucroBruto = valorVenda - custoBase;
  
  // Lucro líquido mensal (considerando taxas)
  const taxaValor = valorVenda * (taxaTotal / 100);
  const lucroLiquido = lucroBruto - taxaValor;
  
  // Lucro percentual efetivo sobre o custo
  const lucroPercentualEfetivo = (lucroLiquido / custoBase) * 100;
  
  // Valor da parcela, se aplicável
  const valorParcela = parcelas > 1 ? valorVenda / parcelas : undefined;
  
  return {
    valorVenda,
    lucroBruto,
    lucroLiquido,
    lucroPercentual: lucroPercentualEfetivo,
    valorParcela,
    custoTotal: custoTotal / tempoContratoMeses, // Proporcional por mês
    taxaTotal
  };
}

// Calcula o preço de venda para marketplace
export function calcularPrecoMarketplace(params: CalculoMarketplaceParams): ResultadoCalculo {
  const {
    valorCusto,
    frete = 0,
    lucroPercentual,
    taxaMarketplace,
    formaPagamento,
    parcelas = 1,
    custos = [],
    taxas = {}
  } = params;
  
  // Soma todos os custos adicionais
  const custoTotal = custos.reduce((acc, custo) => acc + custo, 0);
  
  // Calcula taxa da forma de pagamento
  const taxaPagamento = calcularTarifaPagamento(formaPagamento, parcelas);
  
  // Soma todas as taxas, incluindo a taxa do marketplace
  const taxaTotal = Object.values(taxas).reduce((acc, taxa) => acc + taxa, 0) + taxaPagamento + taxaMarketplace;
  
  // Base para cálculo (custo + frete + outros custos)
  const custoBase = valorCusto + frete + custoTotal;
  
  // Fator de markup para atingir o lucro desejado considerando as taxas
  const fatorMarkup = (100 + lucroPercentual) / (100 - taxaTotal);
  
  // Preço de venda
  const valorVenda = custoBase * fatorMarkup;
  
  // Lucro bruto (sem considerar taxas)
  const lucroBruto = valorVenda - custoBase;
  
  // Lucro líquido (considerando taxas)
  const taxaValor = valorVenda * (taxaTotal / 100);
  const lucroLiquido = lucroBruto - taxaValor;
  
  // Lucro percentual efetivo sobre o custo
  const lucroPercentualEfetivo = (lucroLiquido / custoBase) * 100;
  
  // Valor da parcela, se aplicável
  const valorParcela = parcelas > 1 ? valorVenda / parcelas : undefined;
  
  return {
    valorVenda,
    lucroBruto,
    lucroLiquido,
    lucroPercentual: lucroPercentualEfetivo,
    valorParcela,
    custoTotal,
    taxaTotal
  };
}

// Função para formatar valores como moeda brasileira
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(valor);
}

// Função para formatar porcentagem
export function formatarPorcentagem(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'percent', 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(valor / 100);
}