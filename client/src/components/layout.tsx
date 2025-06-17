import React, { ReactNode } from 'react';
import { Helmet } from 'react-helmet';

export interface LayoutProps {
  children: ReactNode;
  title?: string;
}

function Layout({ children, title = 'Financeiro - Meu Preço Certo' }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
      </Helmet>
      
      <main className="flex-1 p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}

export default Layout;