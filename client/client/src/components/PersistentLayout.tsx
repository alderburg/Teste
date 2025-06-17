
import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import StaticSidebar from './StaticSidebar';
import Header from './Header';

interface PersistentLayoutProps {
  children: React.ReactNode;
}

export default function PersistentLayout({ children }: PersistentLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const savedMinimized = localStorage.getItem('sidebarMinimized');
    if (savedMinimized !== null) {
      setSidebarMinimized(JSON.parse(savedMinimized));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(sidebarMinimized));
  }, [sidebarMinimized]);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTop = 0;
    }
  }, [location]);

  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarMinimized(!sidebarMinimized);
    }
  };

  const minimizeSidebar = () => {
    setSidebarMinimized(!sidebarMinimized);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <StaticSidebar 
        isOpen={sidebarOpen} 
        isMinimized={sidebarMinimized} 
        toggleSidebar={toggleSidebar}
        minimizeSidebar={minimizeSidebar}
        isMobile={isMobile}
      />

      <div 
        className={`flex-1 flex flex-col transition-all duration-100 ease-out ${
          isMobile && sidebarOpen ? 'opacity-50' : ''
        }`}
        style={{ 
          marginLeft: !isMobile ? (sidebarMinimized ? '5rem' : '16rem') : '0',
          height: '100vh',
          overflow: 'hidden'
        }}
      >
        <Header toggleSidebar={toggleSidebar} isMinimized={sidebarMinimized} />
        
        <main 
          className="flex-1 overflow-auto"
          style={{
            padding: '1rem',
            paddingTop: '5rem',
            height: 'calc(100vh - 4rem)',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}
        >
          {children}
        </main>
      </div>

      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
}
