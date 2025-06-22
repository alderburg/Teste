// Removido o import do módulo auth-redirect - toda a lógica está no index.html

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/global.css";
import "./fix-animations.css"; // Importando o fix para as animações de spinners

import { queryClient, preloadDataToCache } from "./lib/queryClient";
import "./preload"; // Importando o novo módulo de pré-carregamento
import { initPerformanceMonitoring } from "./lib/performanceMonitor"; // Importando o monitor de performance

// Declaração de tipo para as funcionalidades de splash screen
declare global {
  interface Window {
    hideSplashScreen?: () => void;
  }
}

// Inicializar o monitoramento de performance
if (process.env.NODE_ENV === 'development') {
  console.log("Iniciando monitoramento de performance");
  initPerformanceMonitoring();
}

// WebSocket será inicializado pelo WebSocketProvider

// Registrar tempo inicial da aplicação
const appStartTime = performance.now();

// Iniciar carregamento imediato de dados críticos antes mesmo da renderização
// Isso permite que os dados estejam disponíveis quando os componentes são montados
const preloadCriticalData = async () => {
  try {
    // Iniciar medição de tempo para o preload
    const preloadStartTime = performance.now();
    
    // Carregar dados de usuário - necessário para a maioria das páginas
    preloadDataToCache("/api/auth/user", () => 
      fetch("/api/auth/user", { credentials: "include" }).then(res => 
        res.ok ? res.json() : null
      )
    );
    
    // Não esperamos a conclusão do pré-carregamento - ele ocorre em paralelo
    console.log("Pré-carregamento de dados críticos iniciado");
    console.log(`[⏱️ Performance] Tempo para iniciar preload: ${(performance.now() - preloadStartTime).toFixed(2)}ms`);
  } catch (error) {
    console.warn("Erro ao pré-carregar dados críticos:", error);
    // Não bloquear a renderização se o pré-carregamento falhar
  }
};

// Iniciar pré-carregamento imediatamente
preloadCriticalData();

// Registrar tempo antes da renderização
const beforeRenderTime = performance.now();
console.log(`[⏱️ Performance] Tempo de inicialização até render: ${(beforeRenderTime - appStartTime).toFixed(2)}ms`);

// Renderizar a aplicação mais rapidamente sem esperar pelo carregamento de dados
// Adicionado evento para notificar quando o componente principal for montado
const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

// Iniciar renderização
root.render(<App />);

// Notificar quando o primeiro render ocorrer para ajudar na detecção do splash screen
console.log(`[⏱️ Performance] App começou a renderizar em: ${(performance.now() - appStartTime).toFixed(2)}ms`);

// Verificar em intervalos se o header já foi renderizado
const checkHeaderRendered = setInterval(() => {
  const header = document.querySelector('header');
  if (header) {
    console.log(`[⏱️ Performance] Header detectado em: ${(performance.now() - appStartTime).toFixed(2)}ms`);
    clearInterval(checkHeaderRendered);
    
    // Mostrar o conteúdo principal primeiro (estava oculto via CSS)
    const rootElement = document.getElementById('root');
    if (rootElement) {
      console.log(`[⏱️ Performance] Tornando o conteúdo principal visível`);
      rootElement.style.opacity = '1';
    }
    
    // Notificar que o header está pronto
    console.log(`[⏱️ Performance] Header encontrado, removendo splash definitivamente`);
  }
}, 50); // Verificar a cada 50ms

// Registrar tempo após iniciar renderização
console.log(`[⏱️ Performance] Tempo de renderização inicial: ${(performance.now() - beforeRenderTime).toFixed(2)}ms`);
console.log(`[⏱️ Performance] Tempo total até render: ${(performance.now() - appStartTime).toFixed(2)}ms`);
