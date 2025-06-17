/**
 * Sistema de preload para melhorar a performance
 * 
 * Este módulo implementa um sistema inteligente de pré-carregamento de dados
 * que ajuda a carregar recursos em segundo plano enquanto o usuário interage
 * com a aplicação, resultando em transições de página mais rápidas.
 */

// Declaração de tipo para as funcionalidades de splash screen
declare global {
  interface Window {
    hideSplashScreen?: () => void;
  }
}

import { preloadDataToCache, queryClient } from "./lib/queryClient";

// Intervalo de prioridade para preload (valores reduzidos para maior responsividade)
const PRIORITY = {
  HIGH: 0,      // Carregar imediatamente
  MEDIUM: 250,  // Carregar após 250ms
  LOW: 1000     // Carregar após 1s (antes era 2s)
};

// Lista de endpoints críticos para preload em segundo plano
const preloadEndpoints = [
  { url: "/api/assinatura", priority: PRIORITY.HIGH },
  { url: "/api/perfil", priority: PRIORITY.HIGH },
  { url: "/api/planos", priority: PRIORITY.MEDIUM },
  { url: "/api/categorias", priority: PRIORITY.MEDIUM },
  { url: "/api/financeiro/payment-methods", priority: PRIORITY.MEDIUM },
  { url: "/api/custos", priority: PRIORITY.LOW },
  { url: "/api/taxas", priority: PRIORITY.LOW }
];

// Mapa para rastrear quais endpoints já foram pré-carregados
const preloadedEndpoints = new Set<string>();

/**
 * Inicia o preload de dados comuns em segundo plano
 * Este processo é executado automaticamente após a inicialização da aplicação
 */
const startBackgroundPreload = () => {
  // Ordenar os endpoints por prioridade
  const sortedEndpoints = [...preloadEndpoints].sort((a, b) => a.priority - b.priority);
  
  // Executar o preload de acordo com a prioridade
  sortedEndpoints.forEach(({ url, priority }) => {
    setTimeout(() => {
      if (preloadedEndpoints.has(url)) return;
      
      console.log(`[Preload] Iniciando preload em segundo plano: ${url}`);
      
      preloadDataToCache(url, () => 
        fetch(url, { credentials: "include" })
          .then(res => {
            if (!res.ok) {
              // Se não for autorizado ou outros erros, apenas ignorar silenciosamente
              if (res.status === 401 || res.status === 403) {
                return null;
              }
              throw new Error(`Erro ${res.status} ao carregar ${url}`);
            }
            return res.json();
          })
          .then(data => {
            console.log(`[Preload] Dados carregados com sucesso: ${url}`);
            preloadedEndpoints.add(url);
            return data;
          })
          .catch(error => {
            console.warn(`[Preload] Erro ao preload ${url}:`, error);
            return null;
          })
      );
    }, priority);
  });
};

/**
 * Pré-carregar dados para uma determinada rota
 * Esta função deve ser chamada quando o usuário passar o mouse sobre um link
 * para pré-carregar os dados da página antes mesmo de clicar
 */
export const preloadForRoute = (route: string) => {
  let endpoints: string[] = [];
  
  // Mapear rotas para endpoints relevantes
  switch (route) {
    case '/dashboard':
      endpoints = ['/api/assinatura', '/api/perfil'];
      break;
    case '/planos-e-upgrades':
      endpoints = ['/api/assinatura', '/api/planos'];
      break;
    case '/financeiro':
      endpoints = ['/api/financeiro/payment-methods', '/api/assinatura'];
      break;
    case '/minha-conta':
      endpoints = ['/api/perfil', '/api/financeiro/payment-methods'];
      break;
    case '/precificacao/novos':
      endpoints = ['/api/categorias', '/api/custos', '/api/taxas'];
      break;
    // Adicionar outras rotas conforme necessário
  }
  
  // Iniciar preload imediato dos endpoints relevantes
  endpoints.forEach(url => {
    if (preloadedEndpoints.has(url)) return;
    
    console.log(`[Preload] Pré-carregando para rota ${route}: ${url}`);
    preloadDataToCache(url, () => 
      fetch(url, { credentials: "include" })
        .then(res => res.ok ? res.json() : null)
        .catch(() => null)
    );
  });
};

// Iniciar preload em segundo plano imediatamente para a landing page
// O atraso anterior de 2000ms foi reduzido para 200ms para garantir carregamento rápido
setTimeout(startBackgroundPreload, 200);

// Exportar o cache de endpoints pré-carregados para permitir verificação
export const getPreloadedEndpoints = () => [...preloadedEndpoints];

/**
 * Hook para verificar se estamos utilizando dados pré-carregados
 * Útil para diagnóstico de performance
 */
export const didUsePreloadedData = (url: string): boolean => {
  return preloadedEndpoints.has(url);
};

export default {
  preloadForRoute,
  getPreloadedEndpoints,
  didUsePreloadedData
};