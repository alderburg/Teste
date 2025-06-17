
// API utility functions for interacting with the server
import { apiRequest, queryClient } from "./queryClient";

// Estado global para controlar se a sessão foi encerrada
let sessionTerminated = false;

// Função para marcar sessão como encerrada
export function markSessionAsTerminated() {
  sessionTerminated = true;
  console.log('🔒 Sessão marcada como encerrada globalmente');
}

// Função para limpar estado de sessão encerrada (para permitir novo login)
export function clearSessionTerminated() {
  sessionTerminated = false;
  console.log('✅ Estado de sessão encerrada limpo - login permitido');
}

// Função para verificar se sessão está encerrada
function isSessionTerminated(): boolean {
  // Se estivermos na página de login, não bloquear
  const currentPath = window.location.pathname;
  if (currentPath === '/acessar' || currentPath === '/login' || currentPath === '/cadastre-se' || currentPath === '/recuperar') {
    return false;
  }

  if (sessionTerminated) {
    console.log('🚫 Sessão encerrada globalmente - bloqueando requisição');
    return true;
  }

  const sessionModal = document.querySelector('[data-session-terminated="true"]');
  const blockOverlay = document.getElementById('session-terminated-block');
  
  return !!(sessionModal || blockOverlay);
}

// Função para rejeitar requisições quando sessão encerrada
function rejectRequest(operation: string): Promise<never> {
  console.log(`🚫 ${operation} BLOQUEADA - sessão encerrada`);
  return Promise.reject(new Error('SESSÃO ENCERRADA - Acesso negado'));
}

// Função para verificar se a URL é de autenticação
function isAuthRequest(url: string): boolean {
  const authUrls = ['/api/login', '/api/register', '/api/logout', '/api/verify-email', '/api/forgot-password', '/api/reset-password'];
  return authUrls.some(authUrl => url.includes(authUrl));
}

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

// Adicionar interceptador de resposta para lidar com erros de autenticação
api.interceptors.response.use(
  (response) => {
    if (isSessionTerminated()) {
      console.log('🚫 RESPOSTA BLOQUEADA - sessão encerrada');
      throw new Error('SESSÃO ENCERRADA - Acesso negado');
    }
    return response;
  },
  async (error) => {
    if (isSessionTerminated()) {
      console.log('🚫 ERRO BLOQUEADO - sessão encerrada');
      return Promise.reject(new Error('SESSÃO ENCERRADA - Acesso negado'));
    }

    if (error.response?.status === 401) {
      console.log('🔒 Erro 401 detectado - marcando sessão como encerrada');
      markSessionAsTerminated();
      
      // Disparar evento para ativar proteção
      window.dispatchEvent(new CustomEvent('session-terminated', {
        detail: {
          sessionToken: localStorage.getItem('sessionToken') || localStorage.getItem('token'),
          message: 'Sessão expirada ou inválida'
        }
      }));

      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

// Adicionar interceptador de requisição para verificar sessão encerrada
api.interceptors.request.use(
  (config) => {
    if (isSessionTerminated()) {
      console.log('🚫 REQUISIÇÃO BLOQUEADA - sessão encerrada');
      throw new Error('SESSÃO ENCERRADA - Acesso negado');
    }
    return config;
  },
  (error) => {
    if (isSessionTerminated()) {
      console.log('🚫 ERRO DE REQUISIÇÃO BLOQUEADO - sessão encerrada');
      return Promise.reject(new Error('SESSÃO ENCERRADA - Acesso negado'));
    }
    return Promise.reject(error);
  }
);

// Sobrescrever apiRequest para verificar sessão encerrada
const originalApiRequest = apiRequest;
const apiRequestWithSessionCheck = async (method: string, url: string, data?: any) => {
  // Permitir requisições de autenticação mesmo com sessão encerrada
  if (isSessionTerminated() && !isAuthRequest(url)) {
    return rejectRequest(`ApiRequest ${method} ${url}`);
  }
  
  try {
    const response = await originalApiRequest(method, url, data);
    
    // Se for login bem-sucedido, limpar estado de sessão encerrada
    if (url.includes('/api/login') && response.ok) {
      clearSessionTerminated();
      console.log('✅ Login bem-sucedido - limpando estado de sessão encerrada');
    }
    
    // Verificar novamente após a resposta (só para não-auth requests)
    if (isSessionTerminated() && !isAuthRequest(url)) {
      throw new Error('Sessão encerrada durante a requisição');
    }
    
    return response;
  } catch (error: any) {
    // Se receber 401 em requisições não-auth, marcar sessão como encerrada
    if ((error.status === 401 || (error.response && error.response.status === 401)) && !isAuthRequest(url)) {
      console.log('🔒 Status 401 em apiRequest - marcando sessão como encerrada');
      markSessionAsTerminated();
      
      window.dispatchEvent(new CustomEvent('session-terminated', {
        detail: {
          sessionToken: localStorage.getItem('sessionToken') || localStorage.getItem('token'),
          message: 'Sessão expirada ou inválida'
        }
      }));
    }
    
    throw error;
  }
};

// Sobrescrever fetch global para verificar sessão encerrada
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const url = args[0] as string;
  
  // Permitir requisições de autenticação mesmo com sessão encerrada
  if (isSessionTerminated() && !isAuthRequest(url)) {
    console.log('🚫 Fetch global BLOQUEADO - sessão encerrada:', url);
    throw new Error('SESSÃO ENCERRADA - Todas as requisições foram bloqueadas');
  }
  
  try {
    const response = await originalFetch(...args);
    
    // Se for login bem-sucedido, limpar estado de sessão encerrada
    if (url.includes('/api/login') && response.ok) {
      clearSessionTerminated();
      console.log('✅ Login bem-sucedido via fetch - limpando estado de sessão encerrada');
    }
    
    // Só marcar como encerrada se não for requisição de auth
    if (response.status === 401 && !isAuthRequest(url)) {
      console.log('🔒 Status 401 em fetch global - marcando sessão como encerrada');
      markSessionAsTerminated();
      
      window.dispatchEvent(new CustomEvent('session-terminated', {
        detail: {
          sessionToken: localStorage.getItem('sessionToken') || localStorage.getItem('token'),
          message: 'Sessão expirada ou inválida'
        }
      }));
    }
    
    return response;
  } catch (error) {
    throw error;
  }
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
  if (isSessionTerminated()) {
    console.log('🚫 Invalidação de assinaturas bloqueada - sessão encerrada');
    return;
  }
  
  queryClient.invalidateQueries({ queryKey: ['/api/minha-assinatura'] });
  queryClient.refetchQueries({ queryKey: ['/api/minha-assinatura'] });

  setTimeout(() => {
    if (!isSessionTerminated()) {
      queryClient.refetchQueries({ queryKey: ['/api/minha-assinatura'] });
      console.log("Recarregando dados da assinatura após timeout");
    }
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
  if (isSessionTerminated()) return;
  queryClient.invalidateQueries({ queryKey: ['/api/produtos'] });
}

export function invalidateServicos() {
  if (isSessionTerminated()) return;
  queryClient.invalidateQueries({ queryKey: ['/api/servicos'] });
}

export function invalidateItensAluguel() {
  if (isSessionTerminated()) return;
  queryClient.invalidateQueries({ queryKey: ['/api/itens-aluguel'] });
}

export function invalidateMarketplaces() {
  if (isSessionTerminated()) return;
  queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
}
