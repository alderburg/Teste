/**
 * Script dedicado para prevenir piscadas e recarregamentos na tela de cadastro mobile
 * Este script é carregado antes do React e controla o comportamento de verificações periódicas
 * VERSÃO CORRIGIDA: Não afeta mais animações globais em outras páginas
 */

(function() {
  // Verificar se estamos na página de cadastro mobile
  const isMobileSignupPage = window.location.pathname === '/m/signup' || window.location.pathname === '/cadastre-se';
  
  if (isMobileSignupPage) {
    console.log('Otimizações para página de cadastro mobile ativadas');
    
    // 1. Controlar os intervalos e timeouts existentes apenas para esta página
    const originalSetInterval = window.setInterval;
    const originalSetTimeout = window.setTimeout;
    const originalClearInterval = window.clearInterval;
    const originalClearTimeout = window.clearTimeout;
    
    // Desativar verificações do splash para esta página
    if (window.sessionStorage) {
      sessionStorage.setItem('skipSplashCheck', 'true');
      sessionStorage.setItem('skipContentDetection', 'true');
      sessionStorage.setItem('disablePeriodicChecks', 'true');
    }
    
    // 2. Não vamos mais sobrescrever as funções de timer globalmente
    // Isso estava causando problemas em animações por toda a aplicação
    
    // Vamos apenas criar um helper para uso específico nesta página se necessário
    const mobileSignupTimers = {
      safeSetInterval: function(fn, delay, ...args) {
        // Forçar intervalos a serem menos frequentes para evitar consumo excessivo
        if (delay < 500) delay = 500; // Valor mínimo para intervalos nesta página
        return originalSetInterval(fn, delay, ...args);
      },
      
      safeSetTimeout: function(fn, delay, ...args) {
        // Impedir timeouts muito curtos que possam causar piscadas
        if (delay < 50) delay = 50; // Valor mínimo para timeouts nesta página
        return originalSetTimeout(fn, delay, ...args);
      }
    };
    
    // NÃO sobrescrever as funções globais de timer - isso afeta todas as animações!
    
    // 3. Observar e interromper qualquer animação que possa causar problemas
    // Usar o MutationObserver para detectar mudanças no DOM que possam causar piscadas
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          // Verificar se a mudança está causando uma pisca (opacity ou display alternando rapidamente)
          const el = mutation.target;
          if (el && el.style && (el.style.opacity === '0' || el.style.display === 'none')) {
            // Forçar estabilidade visual
            el.style.transition = 'none';
          }
        }
      });
    });
    
    // Iniciar observação apenas nos elementos do formulário de cadastro
    document.addEventListener('DOMContentLoaded', () => {
      // Localizar apenas o container do formulário específico para observar
      const formContainer = document.querySelector('.form-container, .signup-form, .mobile-form');
      
      if (formContainer) {
        // Observar apenas o container do formulário, não todo o body
        observer.observe(formContainer, { 
          attributes: true, 
          childList: true, 
          subtree: true,
          attributeFilter: ['style']
        });
        
        // Adicionar classe para identificação
        document.body.classList.add('cadastro-page');
        
        // IMPORTANTE: NÃO usar regras CSS globais que afetam todas as animações
        // Em vez disso, criar regras muito específicas apenas para os elementos problemáticos
        const style = document.createElement('style');
        style.innerHTML = `
          /* Regras CSS muito específicas para evitar piscadas apenas nos campos do formulário */
          body.cadastro-page .form-container input,
          body.cadastro-page .form-container label,
          body.cadastro-page .form-container button:not(.loading),
          body.cadastro-page .signup-form input,
          body.cadastro-page .signup-form label,
          body.cadastro-page .signup-form button:not(.loading),
          body.cadastro-page .mobile-form input,
          body.cadastro-page .mobile-form label,
          body.cadastro-page .mobile-form button:not(.loading) {
            transition: none !important;
          }
        `;
        document.head.appendChild(style);
      } else {
        console.log('Form container não encontrado para observar');
      }
      
      // Adicionar classe para identificar a página
      document.body.classList.add('cadastro-page');
    });
    
    // 4. Limpar o splash screen assim que possível
    window.addEventListener('load', () => {
      const splash = document.getElementById('splash-screen');
      if (splash) {
        splash.style.display = 'none';
      }
      
      // Se o corpo do documento tiver piscadas, estabilizá-lo
      document.body.style.opacity = '1';
      document.body.style.visibility = 'visible';
    });
  }
})();