import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';
import { cn } from '@/lib/utils';

type AnimatedSectionProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'left' | 'right' | 'up' | 'down' | 'none';
  duration?: number;
  threshold?: number;
};

export function AnimatedSection({
  children,
  className,
  delay = 0,
  direction = 'up',
  duration = 0.5,
  threshold = 0.1,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useScrollAnimation(ref, { threshold });

  // Configurações de animação baseadas na direção
  const getAnimationVariants = () => {
    const distance = 50;
    
    const variants = {
      hidden: {},
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        transition: {
          duration: duration,
          delay: delay,
          ease: [0.22, 1, 0.36, 1], // custom easing
        },
      },
    };

    switch (direction) {
      case 'left':
        variants.hidden = { opacity: 0, x: -distance };
        break;
      case 'right':
        variants.hidden = { opacity: 0, x: distance };
        break;
      case 'up':
        variants.hidden = { opacity: 0, y: distance };
        break;
      case 'down':
        variants.hidden = { opacity: 0, y: -distance };
        break;
      case 'none':
        variants.hidden = { opacity: 0 };
        break;
    }

    return variants;
  };

  return (
    <div ref={ref} className={cn(className)}>
      <motion.div
        variants={getAnimationVariants()}
        initial="hidden"
        animate={isVisible ? 'visible' : 'hidden'}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function AnimatedImage({
  children,
  className,
  delay = 0.2,
  direction = 'none',
  duration = 0.7,
  threshold = 0.1,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useScrollAnimation(ref, { threshold });

  return (
    <div ref={ref} className={cn(className)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }}
        transition={{
          duration: duration,
          delay: delay,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function AnimatedFeatureSection({
  children,
  className,
  isReversed = false,
}: AnimatedSectionProps & { isReversed?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useScrollAnimation(ref, { threshold: 0.1 });

  return (
    <div ref={ref} className={cn("flex flex-col md:flex-row gap-12 items-center", isReversed && "md:flex-row-reverse", className)}>
      {children}
    </div>
  );
}

export function StaggeredFeatureList({ 
  items, 
  color = "indigo",
  className 
}: { 
  items: { title?: string; subtitle?: string; text: string }[];
  color?: "indigo" | "purple" | "emerald" | "rose" | "teal" | "blue";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useScrollAnimation(ref, { threshold: 0.1 });
  
  const colorClasses = {
    indigo: "bg-indigo-100 text-indigo-600",
    purple: "bg-purple-100 text-purple-600",
    emerald: "bg-emerald-100 text-emerald-600",
    rose: "bg-rose-100 text-rose-600",
    teal: "bg-teal-100 text-teal-600",
    blue: "bg-blue-100 text-blue-600",
  };
  
  return (
    <div ref={ref} className={cn("grid grid-cols-2 gap-6", className)}>
      {items.map((item, index) => (
        <motion.div 
          key={index}
          className="flex items-start"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{
            duration: 0.5,
            delay: 0.15 * index,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div className={cn("mt-1 mr-3 flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full", colorClasses[color])}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          
          {(item.title || item.subtitle) ? (
            <div>
              {item.title && <p className="text-gray-700 font-medium">{item.title}</p>}
              {item.subtitle && <p className="text-gray-500 text-sm">{item.subtitle}</p>}
            </div>
          ) : (
            <p className="text-gray-700">{item.text}</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}