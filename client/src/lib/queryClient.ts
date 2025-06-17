import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Verifica se a resposta da requisição é válida (status 2xx)
 * @param res Objeto de resposta da API
 * @throws Error se o status não for 2xx
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Tentar obter uma resposta JSON para verificar se é um erro de verificação 2FA
    let errorData: any;
    let text = res.statusText;
    
    try {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const clonedRes = res.clone(); // Clone para não consumir o corpo original
        errorData = await clonedRes.json();
        text = JSON.stringify(errorData);
        
        // Verificar se é um erro de 2FA (status 403 com flag requiresTwoFactor)
        if (res.status === 403 && errorData.requiresTwoFactor === true) {
          console.log("🔒 Interceptada tentativa de acesso a rota protegida sem verificação 2FA");
          
          // Redirecionar para a página de verificação 2FA
          if (typeof window !== 'undefined') {
            window.location.href = errorData.redirectTo || "/verificar-2fa";
          }
          throw new Error("Verificação 2FA necessária. Redirecionando...");
        }
      } else {
        text = await res.text() || res.statusText;
      }
    } catch (parseError) {
      // Se falhar ao fazer parse do JSON, pegar o texto bruto da resposta
      try {
        text = await res.text() || res.statusText;
      } catch (e) {
        text = res.statusText;
      }
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Função para realizar requisições à API
 * @param url URL da requisição
 * @param method Método HTTP (GET, POST, PUT, DELETE, etc)
 * @param data Dados para o corpo da requisição (para POST, PUT, etc)
 * @returns Promise com a resposta processada
 */
export async function apiRequest(
  url: string,
  method: string = "GET",
  data?: unknown | undefined,
): Promise<any> {
  // Corrigir caso a ordem dos parâmetros esteja invertida (url e method trocados)
  if (method.startsWith('/') && !url.startsWith('/')) {
    // Os parâmetros estão invertidos, corrigir
    const tempUrl = url;
    url = method;
    method = tempUrl;
  }
  
  // Verificar se o método é válido
  const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  if (!validMethods.includes(method.toUpperCase())) {
    method = 'GET'; // Definir GET como método padrão se inválido
  }
  
  const res = await fetch(url, {
    method: method.toUpperCase(),
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }
  
  // Para respostas que não são JSON, ainda retornamos um objeto no formato JSON
  // evitando o erro "res.json is not a function"
  return {
    status: res.status,
    ok: res.ok,
    statusText: res.statusText,
    message: "Operação concluída com sucesso"
  };
}

type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Factory para criar funções de query usadas pelo React Query
 */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Garantir que a chave da query é uma URL válida
    let url = "";
    if (Array.isArray(queryKey) && queryKey.length > 0) {
      if (typeof queryKey[0] === 'string') {
        url = queryKey[0];
      }
    }
    
    if (!url) {
      throw new Error("URL de consulta inválida");
    }
    
    // Executar o fetch com método GET explícito
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    // Tratamento de resposta não autorizada
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }
    
    // Verificar se é um erro de verificação 2FA
    if (res.status === 403) {
      try {
        const errorData = await res.clone().json();
        if (errorData.requiresTwoFactor === true) {
          console.log("🔒 Query interceptada: redirecionando para verificação 2FA");
          
          // Redirecionar para a página de verificação 2FA
          if (typeof window !== 'undefined') {
            window.location.href = errorData.redirectTo || "/verificar-2fa";
            return null; // Retornar null para evitar erros de renderização
          }
        }
      } catch (e) {
        // Ignorar erros de parsing
      }
    }

    // Verificar se a resposta é válida
    await throwIfResNotOk(res);
    
    // Processar os dados da resposta
    return await res.json();
  };

/**
 * Cliente de query configurado para a aplicação
 * OTIMIZAÇÃO EXTREMA para reduzir número de requisições ao mínimo absoluto
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      // Configurações extremamente agressivas para minimizar requisições
      refetchInterval: false, // Nunca revalidar automaticamente
      refetchIntervalInBackground: false, // Nunca revalidar em background
      refetchOnWindowFocus: false, // Nunca revalidar quando a janela ganhar foco
      refetchOnReconnect: false, // Nunca revalidar ao reconectar
      refetchOnMount: false, // Nunca buscar dados frescos ao montar o componente
      staleTime: Infinity, // Dados NUNCA ficam obsoletos sem ação explícita
      gcTime: Infinity, // Dados NUNCA são removidos do cache sem ação explícita
      retry: false, // Não tentar novamente em caso de falha
      retryOnMount: false, // Não tentar novamente ao montar
      networkMode: "offlineFirst", // Priorizar dados em cache
    },
    mutations: {
      retry: false, // Não tentar novamente em caso de falha
      // Configuração para atualização 100% otimista
      onMutate: (variables) => {
        // Preparar contexto para potencial rollback
        console.log("Iniciando mutação otimista:", variables);
        return { variables };
      },
      onError: (error, variables, context) => {
        // Log de erro detalhado para debugar problemas
        console.error("Erro na mutação:", error, "Variáveis:", variables);
      },
      onSettled: (_data, _error, _variables, _context) => {
        // Nada aqui - operações de cache são gerenciadas manualmente
        // Sem invalidação global automática de quaisquer consultas
      }
    },
  },
});

// Funções utilitárias para manipulação do cache - RADICALMENTE OTIMIZADAS
// Estas funções minimizam o número de requisições ao servidor manipulando os
// dados diretamente no cache do cliente, com sincronização periódica opcional

// Mapa global para acompanhar atualizações pendentes e evitar requisições redundantes
const pendingCacheUpdates = new Map<string, NodeJS.Timeout>();

/**
 * Atualiza um item no cache e opcionalmente programa uma sincronização
 * @param queryKey Chave de consulta para o cache
 * @param updatedItem Item atualizado
 * @param options Opções adicionais
 */
export function updateCacheItem<T extends { id?: number | string }>(
  queryKey: string | string[],
  updatedItem: T,
  options?: {
    syncWithServer?: boolean;  // Se deve sincronizar com o servidor após um tempo
    delay?: number;           // Atraso para sincronização (ms)
    silent?: boolean;         // Se deve evitar logs
  }
) {
  const opts = {
    syncWithServer: false,
    delay: 3000,
    silent: false,
    ...options
  };
  
  const key = Array.isArray(queryKey) ? queryKey : [queryKey];
  const keyString = JSON.stringify(key);
  
  // Limpar qualquer sincronização pendente para esta chave
  if (pendingCacheUpdates.has(keyString)) {
    clearTimeout(pendingCacheUpdates.get(keyString));
    pendingCacheUpdates.delete(keyString);
  }
  
  // Atualizar o cache imediatamente
  if (!opts.silent) console.log("Atualizando item no cache para", keyString, updatedItem);
  
  queryClient.setQueryData(key, (oldData: T[] | undefined) => {
    if (!oldData) return [updatedItem];
    
    return oldData.map(item => 
      // @ts-ignore - Ignorar erro de tipo aqui porque estamos comparando IDs
      item.id === updatedItem.id ? { ...item, ...updatedItem } : item
    );
  });
  
  // Opcionalmente programar uma sincronização futura
  if (opts.syncWithServer) {
    const timeout = setTimeout(() => {
      if (!opts.silent) console.log("Sincronizando com servidor após delay:", keyString);
      queryClient.invalidateQueries({ queryKey: key });
      pendingCacheUpdates.delete(keyString);
    }, opts.delay);
    
    pendingCacheUpdates.set(keyString, timeout);
  }
}

/**
 * Adiciona um item ao cache e opcionalmente programa uma sincronização
 */
export function addCacheItem<T>(
  queryKey: string | string[],
  newItem: T,
  options?: {
    syncWithServer?: boolean;
    delay?: number;
    silent?: boolean;
  }
) {
  const opts = {
    syncWithServer: false,
    delay: 3000,
    silent: false,
    ...options
  };
  
  const key = Array.isArray(queryKey) ? queryKey : [queryKey];
  const keyString = JSON.stringify(key);
  
  // Limpar qualquer sincronização pendente para esta chave
  if (pendingCacheUpdates.has(keyString)) {
    clearTimeout(pendingCacheUpdates.get(keyString));
    pendingCacheUpdates.delete(keyString);
  }
  
  // Atualizar o cache imediatamente
  if (!opts.silent) console.log("Adicionando item ao cache para", keyString, newItem);
  
  queryClient.setQueryData(key, (oldData: T[] | undefined) => {
    if (!oldData) return [newItem];
    return [...oldData, newItem];
  });
  
  // Opcionalmente programar uma sincronização futura
  if (opts.syncWithServer) {
    const timeout = setTimeout(() => {
      if (!opts.silent) console.log("Sincronizando com servidor após adicionar:", keyString);
      queryClient.invalidateQueries({ queryKey: key });
      pendingCacheUpdates.delete(keyString);
    }, opts.delay);
    
    pendingCacheUpdates.set(keyString, timeout);
  }
}

/**
 * Remove um item do cache e opcionalmente programa uma sincronização
 */
export function removeCacheItem<T extends { id?: number | string }>(
  queryKey: string | string[],
  itemId: number | string,
  options?: {
    syncWithServer?: boolean;
    delay?: number;
    silent?: boolean;
  }
) {
  const opts = {
    syncWithServer: false,
    delay: 3000,
    silent: false,
    ...options
  };
  
  const key = Array.isArray(queryKey) ? queryKey : [queryKey];
  const keyString = JSON.stringify(key);
  
  // Limpar qualquer sincronização pendente para esta chave
  if (pendingCacheUpdates.has(keyString)) {
    clearTimeout(pendingCacheUpdates.get(keyString));
    pendingCacheUpdates.delete(keyString);
  }
  
  // Atualizar o cache imediatamente
  if (!opts.silent) console.log("Removendo item do cache para", keyString, "ID:", itemId);
  
  queryClient.setQueryData(key, (oldData: T[] | undefined) => {
    if (!oldData) return [];
    // @ts-ignore - Ignorar erro de tipo aqui porque estamos comparando IDs
    return oldData.filter(item => item.id !== itemId);
  });
  
  // Opcionalmente programar uma sincronização futura
  if (opts.syncWithServer) {
    const timeout = setTimeout(() => {
      if (!opts.silent) console.log("Sincronizando com servidor após remover:", keyString);
      queryClient.invalidateQueries({ queryKey: key });
      pendingCacheUpdates.delete(keyString);
    }, opts.delay);
    
    pendingCacheUpdates.set(keyString, timeout);
  }
}

/**
 * Atualiza todos os itens do cache com uma função de transformação
 */
export function updateAllCacheItems<T>(
  queryKey: string | string[],
  fieldUpdater: (item: T) => T,
  options?: {
    syncWithServer?: boolean;
    delay?: number;
    silent?: boolean;
  }
) {
  const opts = {
    syncWithServer: false,
    delay: 3000,
    silent: false,
    ...options
  };
  
  const key = Array.isArray(queryKey) ? queryKey : [queryKey];
  const keyString = JSON.stringify(key);
  
  // Limpar qualquer sincronização pendente para esta chave
  if (pendingCacheUpdates.has(keyString)) {
    clearTimeout(pendingCacheUpdates.get(keyString));
    pendingCacheUpdates.delete(keyString);
  }
  
  // Atualizar o cache imediatamente
  if (!opts.silent) console.log("Atualizando todos os itens no cache para", keyString);
  
  queryClient.setQueryData(key, (oldData: T[] | undefined) => {
    if (!oldData) return [];
    return oldData.map(item => fieldUpdater(item));
  });
  
  // Opcionalmente programar uma sincronização futura
  if (opts.syncWithServer) {
    const timeout = setTimeout(() => {
      if (!opts.silent) console.log("Sincronizando com servidor após atualização em massa:", keyString);
      queryClient.invalidateQueries({ queryKey: key });
      pendingCacheUpdates.delete(keyString);
    }, opts.delay);
    
    pendingCacheUpdates.set(keyString, timeout);
  }
}

/**
 * Pré-carrega e armazena dados no cache sem acionar recarregamentos
 * Útil para carregar dados uma única vez e depois trabalhar apenas com o cache
 */
export function preloadDataToCache<T>(
  queryKey: string | string[],
  dataFetcher: () => Promise<T[]>
): Promise<T[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const key = Array.isArray(queryKey) ? queryKey : [queryKey];
      
      // Verificar se já existe no cache
      const existingData = queryClient.getQueryData<T[]>(key);
      if (existingData && existingData.length > 0) {
        console.log("Usando dados pré-carregados do cache para", key);
        return resolve(existingData);
      }
      
      // Buscar e armazenar no cache
      console.log("Pré-carregando dados para", key);
      const data = await dataFetcher();
      
      // Definir os dados no cache com staleTime Infinity
      queryClient.setQueryData(key, data);
      
      resolve(data);
    } catch (error) {
      console.error("Erro ao pré-carregar dados:", error);
      reject(error);
    }
  });
}
