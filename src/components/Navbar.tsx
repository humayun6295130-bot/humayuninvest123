import React from 'react';
import { LayoutDashboard, Wallet, PieChart, LogIn, Menu } from 'lucide-react';

interface NavbarProps {
  setView: (view: 'home' | 'dashboard' | 'plans') => void;
  currentView: string;
}

const Navbar: React.FC<NavbarProps> = ({ setView, currentView }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => setView('home')}
        >
          <div className="bg-blue-800 p-1.5 rounded-lg text-white">
            <LayoutDashboard size={24} />
          </div>
          <span className="font-bold text-xl text-blue-900 tracking-tight">AscendFolio</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <button 
            onClick={() => setView('home')}
            className={`text-sm font-medium transition-colors hover:text-blue-600 ${currentView === 'home' ? 'text-blue-700' : 'text-slate-600'}`}
          >
            Home
          </button>
          <button 
            onClick={() => setView('dashboard')}
            className={`text-sm font-medium transition-colors hover:text-blue-600 ${currentView === 'dashboard' ? 'text-blue-700' : 'text-slate-600'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setView('plans')}
            className={`text-sm font-medium transition-colors hover:text-blue-600 ${currentView === 'plans' ? 'text-blue-700' : 'text-slate-600'}`}
          >
            Pricing
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button className="hidden sm:block text-sm font-medium text-slate-600 hover:text-blue-700">Log In</button>
          <button className="bg-blue-700 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-blue-800 transition-all shadow-md active:scale-95">
            Get Started
          </button>
          <Menu className="md:hidden text-slate-600" />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
