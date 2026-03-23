import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/sonner';
import { Menu, X } from 'lucide-react';

export const DashboardLayout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Desktop */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar Mobile */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:hidden
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setMobileMenuOpen(false)} />
      </div>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 bg-slate-900 p-4 flex items-center justify-between">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-white hover:bg-slate-800 rounded-lg"
            data-testid="mobile-menu-button"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <img 
              src={`${process.env.PUBLIC_URL}/icone-cipolatti.png`}
              alt="Cipolatti" 
              className="w-8 h-8 object-contain bg-white rounded-md p-1"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <span className="text-white font-bold">Cipolatti</span>
          </div>
          <div className="w-10"></div>
        </div>
        
        {/* Page Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
};
