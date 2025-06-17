import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AnimatedChartBarProps {
  height: number;
  delay: number;
}

export const AnimatedChartBar: React.FC<AnimatedChartBarProps> = ({ height, delay }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [delay]);
  
  return (
    <motion.div 
      className="w-full bg-indigo-500 rounded-sm" 
      style={{ 
        height: isVisible ? `${height}%` : '0%'
      }}
      initial={{ height: '0%' }}
      animate={{ height: isVisible ? `${height}%` : '0%' }}
      transition={{ duration: 1.2, ease: "easeOut" }}
    />
  );
};

interface AnimatedValueProps {
  value: string;
  delay: number;
}

export const AnimatedValue: React.FC<AnimatedValueProps> = ({ value, delay }) => {
  const [displayValue, setDisplayValue] = useState('0');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayValue(value);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: delay / 1000 }}
    >
      {displayValue}
    </motion.span>
  );
};

interface AnimatedProgressBarProps {
  percentage: number;
  delay: number;
  color?: string;
  onVisibilityChange?: (isVisible: boolean) => void;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({ 
  percentage, 
  delay, 
  color,
  onVisibilityChange 
}) => {
  // Esse componente usa CSS puro para animações sem framer-motion
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    // Função para ativar animação após o delay
    const timer = setTimeout(() => {
      setIsAnimating(true);
      if (onVisibilityChange) {
        onVisibilityChange(true);
      }
    }, delay);
    
    // Limpar timeout quando componente desmontar
    return () => clearTimeout(timer);
  }, [delay, onVisibilityChange]);
  
  // Cores predefinidas para diferentes tipos de barras
  const getBackground = () => {
    if (color === 'purple') return 'linear-gradient(to right, #a855f7, #8b5cf6)';
    if (color === 'blue') return 'linear-gradient(to right, #3b82f6, #60a5fa)';
    if (color === 'red') return 'linear-gradient(to right, #ef4444, #f87171)';
    if (color === 'amber') return 'linear-gradient(to right, #f59e0b, #fbbf24)';
    if (color === 'green') return 'linear-gradient(to right, #10b981, #34d399)';
    // Gradiente padrão se nenhuma cor for especificada
    return 'linear-gradient(to right, #8b5cf6, #6366f1)';
  };
  
  return (
    <div 
      className="h-full rounded-full"
      style={{
        background: getBackground(),
        width: isAnimating ? `${percentage}%` : '0%',
        transition: 'width 1s linear'
      }}
    />
  );
};

interface AnimatedCountProps {
  from: number;
  to: number;
  duration?: number;
  delay?: number;
  formatter?: (value: number) => string;
}

export const AnimatedCount: React.FC<AnimatedCountProps> = ({ 
  from, 
  to, 
  duration = 2, 
  delay = 0,
  formatter = (value: number) => value.toString() 
}) => {
  const [count, setCount] = useState(from);
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      setCount(from + Math.floor(progress * (to - from)));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    const handle = setTimeout(() => {
      window.requestAnimationFrame(step);
    }, delay);

    return () => clearTimeout(handle);
  }, [from, to, duration, delay]);

  return <span ref={nodeRef}>{formatter(count)}</span>;
};

export const useInView = (options: { threshold?: number; once?: boolean } = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const hasSeenRef = useRef(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentElement = elementRef.current;
    if (!currentElement) return;

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      const isCurrentlyVisible = entry.isIntersecting;
      
      // Se configurado para persistir após primeira visualização
      if (options.once) {
        if (isCurrentlyVisible) {
          hasSeenRef.current = true;
          setIsVisible(true);
        } else {
          // Se já viu antes, mantém visível
          setIsVisible(hasSeenRef.current);
        }
      } else {
        // Comportamento padrão - segue o estado atual
        setIsVisible(isCurrentlyVisible);
      }
    };

    const observer = new IntersectionObserver(
      observerCallback,
      { threshold: options.threshold || 0.2 }
    );
    
    observer.observe(currentElement);
    
    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [options.threshold, options.once]);

  return { ref: elementRef, isInView: isVisible };
};

interface AnimateOnViewProps {
  children: React.ReactNode;
  delay?: number;
  threshold?: number;
  once?: boolean; // Nova propriedade para controlar se a animação ocorre apenas uma vez
}

export const AnimateOnView: React.FC<AnimateOnViewProps> = ({ 
  children, 
  delay = 0, 
  threshold,
  once = true // Por padrão, agora animamos apenas uma vez
}) => {
  const { ref, isInView } = useInView({ threshold, once });

  return (
    <div ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, delay: delay / 1000 }}
      >
        {children}
      </motion.div>
    </div>
  );
};

// Componente para animações móveis individuais
export const MobileCardAnimation: React.FC<{
  children: React.ReactNode;
  index: number;
  once?: boolean;
}> = ({ children, index, once = true }) => {
  const [isMobile, setIsMobile] = useState(false);
  const { ref, isInView } = useInView({ threshold: 0.1, once });
  
  // Detectar se estamos em um dispositivo móvel
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Em dispositivos móveis, animar cada card individualmente
  // Em desktops, mostrar tudo de uma vez
  if (isMobile) {
    return (
      <div ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
          transition={{ 
            duration: 0.5, 
            delay: 0.1, 
            ease: "easeOut" 
          }}
        >
          {children}
        </motion.div>
      </div>
    );
  }
  
  // Versão desktop - sem animação especial
  return <>{children}</>;
};