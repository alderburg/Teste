// Arquivo de declaração para todos os componentes tipados
declare module '@/components/layout' {
  import React, { ReactNode } from 'react';
  
  interface LayoutProps {
    children: ReactNode;
    title?: string;
  }
  
  export function Layout(props: LayoutProps): JSX.Element;
  
  // Exportação padrão 
  const LayoutComponent: React.FC<LayoutProps>;
  export default LayoutComponent;
}