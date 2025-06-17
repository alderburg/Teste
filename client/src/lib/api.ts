// API utility functions for interacting with the server
import { apiRequest, queryClient } from "./queryClient";

// Placeholder for the api object, assuming it's an axios instance or similar
const api = {
  interceptors: {
    response: {
      use: (
        success: (response: any) => any,
        error: (error: any) => any
      ) => { },
    },
    request: {
      use: (
        success: (config: any) => any,
        error: (error: any) => any
      ) => { },
    },
  },
};

// Função para verificar se modal de sessão encerrada está aberto
function isSessionTerminated(): boolean {
  const sessionModal = document.querySelector('[data-session-terminated="true"]');
  return !!sessionModal;
}

// Adicionar interceptador de resposta para lidar com erros de autenticação
api.interceptors.response.use(
  (response) => {
    // Verificar se há um modal de sessão encerrada aberto
    const sessionModal = document.querySelector('[data-session-terminated="true"]');
    if (sessionModal) {
      console.log('🚫 RESPOSTA BLOQUEADA - modal de sessão encerrada está aberto');
      throw new Error('SESSÃO ENCERRADA - Acesso negado');
    }
    return response;
  },
  async (error) => {
    // Verificar se há um modal de sessão encerrada aberto
    const sessionModal = document.querySelector('[data-session-terminated="true"]');
    if (sessionModal) {
      console.log('🚫 ERRO BLOQUEADO - modal de sessão encerrada está aberto');
      return Promise.reject(new Error('SESSÃO ENCERRADA - Acesso negado'));
    }

    if (error.response?.status === 401) {
      console.log('🔒 Erro 401 detectado - removendo dados de autenticação');

      // Remover dados de autenticação
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('token');

      // Redirecionar para login apenas se não há modal de sessão encerrada
      window.location.href = '/acessar';
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

// Adicionar interceptador de requisição para verificar sessão encerrada
api.interceptors.request.use(
  (config) => {
    // Verificar se há um modal de sessão encerrada aberto
    const sessionModal = document.querySelector('[data-session-terminated="true"]');
    if (sessionModal) {
      console.log('🚫 REQUISIÇÃO BLOQUEADA - modal de sessão encerrada está aberto');
      throw new Error('SESSÃO ENCERRADA - Acesso negado');
    }
    return config;
  },
  (error) => {
    // Verificar se há um modal de sessão encerrada aberto
    const sessionModal = document.querySelector('[data-session-terminated="true"]');
    if (sessionModal) {
      console.log('🚫 ERRO DE REQUISIÇÃO BLOQUEADO - modal de sessão encerrada está aberto');
      return Promise.reject(new Error('SESSÃO ENCERRADA - Acesso negado'));
    }
    return Promise.reject(error);
  }
);

// Sobrescrever apiRequest para verificar sessão encerrada
const originalApiRequest = apiRequest;
const apiRequestWithSessionCheck = async (method: string, url: string, data?: any) => {
  if (isSessionTerminated()) {
    console.log('🚫 ApiRequest bloqueada - modal de sessão encerrada está aberto');
    throw new Error('Sessão encerrada - apiRequest bloqueada');
  }
  return originalApiRequest(method, url, data);
};

// Assinaturas API
export async function criarAssinatura(dados: any) {
  try {
    console.log("API - Enviando dados para criar assinatura:", dados);
    const res = await apiRequestWithSessionCheck("POST", "/api/assinaturas", dados);
    const resultado = await res.json();
    console.log("API - Resposta da criação de assinatura:", resultado);
    return resultado;
  } catch (error) {
    console.error("API - Erro ao criar assinatura:", error);
    throw error;
  }
}

export async function cancelarAssinatura(id: number) {
  const res = await apiRequestWithSessionCheck("POST", `/api/assinaturas/cancelar`, { id });
  return await res.json();
}

export async function getMinhaAssinatura() {
  const res = await apiRequestWithSessionCheck("GET", "/api/minha-assinatura");
  return await res.json();
}

export function invalidateAssinaturas() {
  // Primeiro, invalidar o cache para forçar busca de dados frescos
  queryClient.invalidateQueries({ queryKey: ['/api/minha-assinatura'] });

  // Forçar uma recarga imediata para atualizar os valores na UI
  queryClient.refetchQueries({ queryKey: ['/api/minha-assinatura'] });

  // Para garantir que os dados sejam atualizados mesmo com delays no servidor,
  // programar uma segunda recarga após um pequeno intervalo
  setTimeout(() => {
    queryClient.refetchQueries({ queryKey: ['/api/minha-assinatura'] });
    console.log("Recarregando dados da assinatura após timeout");
  }, 1000);
}

// User API
export async function registerUser(userData: any) {
  const res = await apiRequestWithSessionCheck("POST", "/api/register", userData);
  return await res.json();
}

export async function loginUser(credentials: any) {
  const res = await apiRequestWithSessionCheck("POST", "/api/login", credentials);
  return await res.json();
}

export async function verifyEmail(email: string) {
  const res = await apiRequestWithSessionCheck("POST", "/api/verify-email", { email });
  return await res.json();
}

// Produtos API
export async function getProdutos(userId: number, tipo?: string) {
  const queryParams = new URLSearchParams();
  queryParams.append("userId", userId.toString());
  if (tipo) queryParams.append("tipo", tipo);

  const res = await apiRequestWithSessionCheck("GET", `/api/produtos?${queryParams.toString()}`);
  return await res.json();
}

export async function getProduto(id: number) {
  const res = await apiRequestWithSessionCheck("GET", `/api/produtos/${id}`);
  return await res.json();
}

export async function createProduto(produtoData: any) {
  const res = await apiRequestWithSessionCheck("POST", "/api/produtos", produtoData);
  return await res.json();
}

export async function updateProduto(id: number, produtoData: any) {
  const res = await apiRequestWithSessionCheck("PUT", `/api/produtos/${id}`, produtoData);
  return await res.json();
}

export async function deleteProduto(id: number) {
  const res = await apiRequestWithSessionCheck("DELETE", `/api/produtos/${id}`);
  return await res.json();
}

// Serviços API
export async function getServicos(userId: number) {
  const queryParams = new URLSearchParams();
  queryParams.append("userId", userId.toString());

  const res = await apiRequestWithSessionCheck("GET", `/api/servicos?${queryParams.toString()}`);
  return await res.json();
}

export async function getServico(id: number) {
  const res = await apiRequestWithSessionCheck("GET", `/api/servicos/${id}`);
  return await res.json();
}

export async function createServico(servicoData: any) {
  const res = await apiRequestWithSessionCheck("POST", "/api/servicos", servicoData);
  return await res.json();
}

export async function updateServico(id: number, servicoData: any) {
  const res = await apiRequestWithSessionCheck("PUT", `/api/servicos/${id}`, servicoData);
  return await res.json();
}

export async function deleteServico(id: number) {
  const res = await apiRequestWithSessionCheck("DELETE", `/api/servicos/${id}`);
  return await res.json();
}

// Itens para Aluguel API
export async function getItensAluguel(userId: number) {
  const queryParams = new URLSearchParams();
  queryParams.append("userId", userId.toString());

  const res = await apiRequestWithSessionCheck("GET", `/api/itens-aluguel?${queryParams.toString()}`);
  return await res.json();
}

export async function getItemAluguel(id: number) {
  const res = await apiRequestWithSessionCheck("GET", `/api/itens-aluguel/${id}`);
  return await res.json();
}

export async function createItemAluguel(itemData: any) {
  const res = await apiRequestWithSessionCheck("POST", "/api/itens-aluguel", itemData);
  return await res.json();
}

export async function updateItemAluguel(id: number, itemData: any) {
  const res = await apiRequestWithSessionCheck("PUT", `/api/itens-aluguel/${id}`, itemData);
  return await res.json();
}

export async function deleteItemAluguel(id: number) {
  const res = await apiRequestWithSessionCheck("DELETE", `/api/itens-aluguel/${id}`);
  return await res.json();
}

// Marketplaces API
export async function getMarketplaces(userId: number) {
  const queryParams = new URLSearchParams();
  queryParams.append("userId", userId.toString());

  const res = await apiRequestWithSessionCheck("GET", `/api/marketplaces?${queryParams.toString()}`);
  return await res.json();
}

export async function getMarketplace(id: number) {
  const res = await apiRequestWithSessionCheck("GET", `/api/marketplaces/${id}`);
  return await res.json();
}

export async function createMarketplace(marketplaceData: any) {
  const res = await apiRequestWithSessionCheck("POST", "/api/marketplaces", marketplaceData);
  return await res.json();
}

export async function updateMarketplace(id: number, marketplaceData: any) {
  const res = await apiRequestWithSessionCheck("PUT", `/api/marketplaces/${id}`, marketplaceData);
  return await res.json();
}

export async function deleteMarketplace(id: number) {
  const res = await apiRequestWithSessionCheck("DELETE", `/api/marketplaces/${id}`);
  return await res.json();
}

// Cálculos de Precificação
export async function calcularPrecoProduto(params: any) {
  const res = await apiRequestWithSessionCheck("POST", "/api/calculos/produto", params);
  return await res.json();
}

export async function calcularPrecoServico(params: any) {
  const res = await apiRequestWithSessionCheck("POST", "/api/calculos/servico", params);
  return await res.json();
}

export async function calcularPrecoAluguel(params: any) {
  const res = await apiRequestWithSessionCheck("POST", "/api/calculos/aluguel", params);
  return await res.json();
}

export async function calcularPrecoMarketplace(params: any) {
  const res = await apiRequestWithSessionCheck("POST", "/api/calculos/marketplace", params);
  return await res.json();
}

// Invalidação de cache
export function invalidateProdutos() {
  queryClient.invalidateQueries({ queryKey: ['/api/produtos'] });
}

export function invalidateServicos() {
  queryClient.invalidateQueries({ queryKey: ['/api/servicos'] });
}

export function invalidateItensAluguel() {
  queryClient.invalidateQueries({ queryKey: ['/api/itens-aluguel'] });
}

export function invalidateMarketplaces() {
  queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
}