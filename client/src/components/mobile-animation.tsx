import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// Hook para detectar quando um elemento está visível na tela
export const useInView = (options: { threshold?: number } = {}) => {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: options.threshold || 0.2 }
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
  }, [options.threshold]);

  return { ref, isInView };
};

// Componente para animar cards em dispositivos móveis
export const MobileCardAnimation: React.FC<{
  children: React.ReactNode;
  index: number;
}> = ({ children, index }) => {
  const [isMobile, setIsMobile] = useState(false);
  const { ref, isInView } = useInView({ threshold: 0.1 });
  
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
  
  return (
    <div ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
        transition={{ 
          duration: 0.8, 
          delay: 0.15 * index,
          ease: "easeOut" 
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};