/**
 * Tipo global para garantir funções de visibilidade injetadas no window
 */
interface Window {
  ensureBackgroundVisibility?: () => void;
  hideSplashScreen?: () => void;
}