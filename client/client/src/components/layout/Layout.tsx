import { ReactNode, useState } from "react";
import { Navigation } from "./Navigation";
import { Menu, X } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-gray-50">
      {/* Mobile menu button */}
      <div className="md:hidden flex justify-between items-center p-4 bg-white border-b">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          GestãoCustos
        </h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
          {mobileMenuOpen ? (
            <X className="h-6 w-6 text-gray-600" />
          ) : (
            <Menu className="h-6 w-6 text-gray-600" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`
          bg-white border-r w-full md:w-64 flex-shrink-0 transition-all duration-300 ease-in-out
          ${mobileMenuOpen ? "block fixed inset-0 z-50" : "hidden md:block"}
        `}
      >
        {/* Logo area */}
        <div className="p-6 hidden md:block">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            GestãoCustos
          </h1>
        </div>

        {/* Mobile close button */}
        {mobileMenuOpen && (
          <div className="flex justify-end p-4 md:hidden">
            <button onClick={() => setMobileMenuOpen(false)}>
              <X className="h-6 w-6 text-gray-600" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6">
          <Navigation />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 md:p-8">{children}</div>
    </div>
  );
}