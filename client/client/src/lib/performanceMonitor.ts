/**
 * Sistema de monitoramento de performance de carregamento
 * 
 * Este módulo implementa um sistema completo de métricas para analisar
 * o tempo de carregamento de cada componente e requisição na aplicação.
 * As métricas são exibidas no console e podem ser usadas para identificar
 * gargalos de performance.
 */

// Interface para armazenar os tempos de carregamento
interface LoadTimes {
  [key: string]: {
    start: number;
    end?: number;
    duration?: number;
  };
}

// Armazenamento global de métricas
const loadTimes: LoadTimes = {};

// Recursos agrupados por tipo
const resourcesByType: {
  [key: string]: Array<{ url: string; duration: number; size?: number }>
} = {
  script: [],
  style: [],
  image: [],
  font: [],
  fetch: [],
  xhr: [],
  other: []
};

/**
 * Inicia a medição de um processo específico
 * @param name Nome do processo a ser monitorado
 */
export const startMeasure = (name: string): void => {
  loadTimes[name] = {
    start: performance.now()
  };
  console.log(`[⏱️ Performance] Iniciando medição: ${name}`);
};

/**
 * Encerra a medição de um processo específico
 * @param name Nome do processo sendo monitorado
 * @returns Duração do processo em milissegundos
 */
export const endMeasure = (name: string): number | undefined => {
  if (!loadTimes[name]) {
    console.warn(`[⏱️ Performance] Medição "${name}" não foi iniciada`);
    return undefined;
  }

  const end = performance.now();
  const duration = end - loadTimes[name].start;
  
  loadTimes[name].end = end;
  loadTimes[name].duration = duration;
  
  console.log(`[⏱️ Performance] ${name}: ${duration.toFixed(2)}ms`);
  return duration;
};

/**
 * Registra o tempo de carregamento de um recurso externo
 * @param url URL do recurso
 * @param type Tipo do recurso (script, style, image, etc)
 * @param duration Tempo de carregamento em ms
 * @param size Tamanho do recurso em bytes (opcional)
 */
export const recordResourceTiming = (
  url: string, 
  type: string, 
  duration: number,
  size?: number
): void => {
  const resourceType = type in resourcesByType ? type : 'other';
  resourcesByType[resourceType].push({ url, duration, size });
};

/**
 * Inicializa o monitoramento de performance da página
 * Deve ser chamado uma vez no carregamento inicial
 */
export const initPerformanceMonitoring = (): void => {
  // Registrar tempo de inicialização da aplicação
  startMeasure('app_initialization');
  
  // Verificar se a API Performance está disponível
  if (typeof window !== 'undefined' && 'performance' in window) {
    // Observar métricas de carregamento usando PerformanceObserver
    if ('PerformanceObserver' in window) {
      try {
        // Observar recursos carregados
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming;
              recordResourceTiming(
                resourceEntry.name,
                resourceEntry.initiatorType,
                resourceEntry.duration,
                resourceEntry.transferSize
              );
            }
          }
        });
        
        // Observar as métricas principais do Web Vitals
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            console.log(`[⏱️ Performance] ${entry.name}: ${entry.startTime.toFixed(2)}ms`);
          }
        });
        
        // Iniciar observação
        resourceObserver.observe({ entryTypes: ['resource'] });
        paintObserver.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
        
        // Registrar eventos do ciclo de vida da página
        window.addEventListener('DOMContentLoaded', () => {
          console.log(`[⏱️ Performance] DOMContentLoaded: ${performance.now().toFixed(2)}ms`);
        });
        
        window.addEventListener('load', () => {
          endMeasure('app_initialization');
          console.log(`[⏱️ Performance] WindowLoaded: ${performance.now().toFixed(2)}ms`);
          
          // Registrar métricas de navegação
          const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navEntry) {
            console.log(`[⏱️ Performance] Navegação:
              • DNS: ${navEntry.domainLookupEnd - navEntry.domainLookupStart}ms
              • Conexão: ${navEntry.connectEnd - navEntry.connectStart}ms
              • Resposta: ${navEntry.responseEnd - navEntry.responseStart}ms
              • DOM carregado: ${navEntry.domComplete - navEntry.domInteractive}ms
              • Total: ${navEntry.loadEventEnd - navEntry.startTime}ms
            `);
          }
          
          // Relatório de recursos
          setTimeout(() => {
            printResourceSummary();
          }, 1000);
        });
        
      } catch (error) {
        console.warn('[⏱️ Performance] Erro ao configurar monitoramento:', error);
      }
    }
  }
};

/**
 * Imprime um resumo dos recursos carregados agrupados por tipo
 */
export const printResourceSummary = (): void => {
  console.group('[⏱️ Performance] Resumo de recursos carregados:');
  
  // Para cada tipo de recurso
  Object.entries(resourcesByType).forEach(([type, resources]) => {
    if (resources.length === 0) return;
    
    // Calcular estatísticas
    const count = resources.length;
    const totalDuration = resources.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = totalDuration / count;
    const slowestResource = [...resources].sort((a, b) => b.duration - a.duration)[0];
    
    console.group(`${type.toUpperCase()} (${count})`);
    console.log(`• Tempo total: ${totalDuration.toFixed(2)}ms`);
    console.log(`• Tempo médio: ${avgDuration.toFixed(2)}ms`);
    console.log(`• Recurso mais lento: ${slowestResource.url} (${slowestResource.duration.toFixed(2)}ms)`);
    
    // Listar os 3 recursos mais lentos
    console.group('Top 3 mais lentos:');
    [...resources]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 3)
      .forEach((r, i) => {
        console.log(`${i+1}. ${r.url.split('/').pop() || r.url} - ${r.duration.toFixed(2)}ms`);
      });
    console.groupEnd();
    
    console.groupEnd(); // Tipo de recurso
  });
  
  console.groupEnd(); // Resumo
};

/**
 * Retorna um snapshot das métricas atuais
 */
export const getPerformanceMetrics = (): object => {
  return {
    loadTimes,
    resourcesByType,
    navigationTiming: performance.getEntriesByType('navigation')[0],
    paintMetrics: performance.getEntriesByType('paint')
  };
};

export default {
  startMeasure,
  endMeasure,
  initPerformanceMonitoring,
  printResourceSummary,
  getPerformanceMetrics
};