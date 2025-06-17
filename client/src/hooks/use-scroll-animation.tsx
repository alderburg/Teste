import { useState, useEffect, RefObject } from 'react';

type ScrollAnimationOptions = {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
};

export function useScrollAnimation(
  ref: RefObject<HTMLElement>,
  options: ScrollAnimationOptions = {}
): boolean {
  const { threshold = 0.1, rootMargin = "0px", triggerOnce = true } = options;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Quando o elemento se torna visível
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Se triggerOnce for true, desconecta o observer após ativar
          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          // Se triggerOnce for false, redefine isVisible quando o elemento sai da viewport
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [ref, threshold, rootMargin, triggerOnce]);

  return isVisible;
}