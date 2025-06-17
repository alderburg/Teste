/**
 * Este módulo exporta funções para resolver o problema crítico
 * de elementos desaparecendo (ficando com fundo branco/vazio)
 * quando modais são abertos na aplicação.
 * 
 * O problema ocorre por causa de otimizações de performance
 * que ocultam elementos de fundo quando modais são apresentados.
 */

/**
 * Garante que elementos críticos permaneçam visíveis quando dialogs são abertos
 * 
 * @param root O elemento raiz da aplicação (geralmente document.getElementById('root'))
 */
export function ensureRootVisibility(root: HTMLElement | null = null): void {
  if (!root) {
    root = document.getElementById('root');
  }
  
  if (root) {
    // Forçar visibilidade do root
    root.style.display = 'block';
    root.style.visibility = 'visible';
    root.style.opacity = '1';
    root.style.position = 'relative';
    root.style.zIndex = '1';
    
    // Adicionar classe para CSS saber que estamos em modo de correção
    document.body.classList.add('dialog-open');
  }
}

/**
 * Garante que elementos de layout específicos permaneçam visíveis
 * quando modais são abertos
 */
export function ensureLayoutVisibility(): void {
  // Forçar visibilidade de elementos principais
  const criticalElements = document.querySelectorAll('#root, main, .app, .container, .layout, .page-content, .content-area, .main-content, section');
  criticalElements.forEach(el => {
    if (el instanceof HTMLElement) {
      el.style.display = 'block';
      el.style.visibility = 'visible';
      el.style.opacity = '1';
    }
  });
  
  // Garantir que elementos flex continuem como flex
  const flexElements = document.querySelectorAll('header, nav, .flex, .sidebar, .navbar, .topbar, .flex-row, .flex-col');
  flexElements.forEach(el => {
    if (el instanceof HTMLElement) {
      el.style.display = 'flex';
      el.style.visibility = 'visible';
      el.style.opacity = '1';
    }
  });
  
  // Garantir que elementos grid continuem como grid
  const gridElements = document.querySelectorAll('.grid, [class*="grid-"]');
  gridElements.forEach(el => {
    if (el instanceof HTMLElement) {
      el.style.display = 'grid';
      el.style.visibility = 'visible';
      el.style.opacity = '1';
    }
  });
}

/**
 * Configura um MutationObserver para detectar quando modais são abertos
 * e garantir que elementos críticos permaneçam visíveis
 */
export function setupModalVisibilityObserver(): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        const target = mutation.target as HTMLElement;
        
        // Detectar se um modal foi aberto verificando os atributos
        if (target.getAttribute('role') === 'dialog' || 
            target.getAttribute('role') === 'alertdialog' || 
            target.getAttribute('aria-modal') === 'true') {
          
          // Verificar se o estado do modal é "aberto"
          if (target.getAttribute('data-state') === 'open') {
            // Aplicar correções de visibilidade
            ensureRootVisibility();
            ensureLayoutVisibility();
            
            // Adicionar classe na página para CSS poder aplicar ajustes
            document.body.classList.add('dialog-open');
          } else if (target.getAttribute('data-state') === 'closed') {
            // Remover classe quando o modal é fechado
            document.body.classList.remove('dialog-open');
          }
        }
      } else if (mutation.type === 'childList') {
        // Verificar se algum dos novos nós adicionados é um modal
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (node.getAttribute('role') === 'dialog' || 
                node.getAttribute('role') === 'alertdialog' || 
                node.getAttribute('aria-modal') === 'true' ||
                node.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal="true"]')) {
              
              // Aplicar correções de visibilidade
              ensureRootVisibility();
              ensureLayoutVisibility();
              
              // Adicionar classe na página para CSS poder aplicar ajustes
              document.body.classList.add('dialog-open');
            }
          }
        });
        
        // Verificar se todos os modais foram removidos
        const anyModalOpen = document.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal="true"]');
        if (!anyModalOpen) {
          // Remover classe quando não há mais modais
          document.body.classList.remove('dialog-open');
        }
      }
    });
  });
  
  // Observar mudanças nos atributos e na árvore DOM do documento
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['role', 'aria-modal', 'data-state'],
    childList: true,
    subtree: true
  });
  
  return observer;
}

// Utilitário para garantir visibilidade dos elementos
export function initVisibilityProtection() {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    body, #root, main, [role="dialog"] {
      visibility: visible !important;
      opacity: 1 !important;
      display: block !important;
    }
    .modal-backdrop {
      z-index: 1040 !important;
    }
    .modal-open {
      overflow: auto !important;
      padding-right: 0 !important;
    }
  `;
  document.head.appendChild(styleEl);
}

/**
 * Inicializa todas as proteções para garantir que elementos não sumam
 * quando modais são abertos
 */
/*export function initVisibilityProtection(): void {
  // Inicializar o observer para detectar modais
  const observer = setupModalVisibilityObserver();
  
  // Sobrescrever funções nativas que podem causar problemas de visibilidade
  const originalSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    // Se estiver tentando esconder elementos críticos, não permitir
    if (name === 'aria-hidden' && value === 'true') {
      // Checar se é um elemento crítico (root, main, etc)
      if (this.id === 'root' || 
          this === document.querySelector('main') ||
          this.classList.contains('app') || 
          this.classList.contains('container')) {
        console.log('Bloqueando tentativa de esconder elemento crítico:', this);
        return; // Não executa a operação
      }
    }
    
    // Permitir a operação normalmente para outros casos
    return originalSetAttribute.call(this, name, value);
  };
  
  // Adicionar a função ao objeto window para que possa ser acessada de qualquer lugar
  if (typeof window !== 'undefined') {
    window.ensureBackgroundVisibility = () => {
      ensureRootVisibility();
      ensureLayoutVisibility();
    };
  }
}*/