import React from "react";

// Componentes simplificados para substituir os originais
export const AnimatedChartBar = ({ value, color, label }: { value: number, color?: string, label?: string }) => {
  return (
    <div className="w-full bg-gray-100 rounded-full h-4 mb-2">
      <div 
        className={`h-full rounded-full ${color || 'bg-primary'}`} 
        style={{ width: `${value}%` }}
      >
      </div>
      {label && <div className="text-xs mt-1">{label}</div>}
    </div>
  );
};

export const AnimatedCount = ({ value, duration = 2000 }: { value: number, duration?: number }) => {
  return <span>{value}</span>;
};

export const AnimatedProgressBar = ({ progress }: { progress: number }) => {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div 
        className="bg-primary h-full rounded-full" 
        style={{ width: `${progress}%` }}
      >
      </div>
    </div>
  );
};

export const AnimateOnView = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};