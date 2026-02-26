import React from 'react';
import { LayoutDashboard, Twitter, Linkedin, Facebook, Github } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-blue-800 p-1 rounded-md text-white">
                <LayoutDashboard size={20} />
              </div>
              <span className="font-bold text-lg text-blue-900">AscendFolio</span>
            </div>
            <p className="text-slate-500 text-sm mb-6">
              Empowering the next generation of investors with tools to grow their wealth smarter and faster.
            </p>
            <div className="flex gap-4">
              <Twitter className="text-slate-400 hover:text-blue-500 cursor-pointer transition-colors" size={20} />
              <Linkedin className="text-slate-400 hover:text-blue-700 cursor-pointer transition-colors" size={20} />
              <Facebook className="text-slate-400 hover:text-blue-600 cursor-pointer transition-colors" size={20} />
              <Github className="text-slate-400 hover:text-slate-900 cursor-pointer transition-colors" size={20} />
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-slate-900 mb-6">Platform</h4>
            <ul className="space-y-4 text-sm text-slate-500">
              <li className="hover:text-blue-700 cursor-pointer">Dashboard</li>
              <li className="hover:text-blue-700 cursor-pointer">Asset Tracker</li>
              <li className="hover:text-blue-700 cursor-pointer">Market Data</li>
              <li className="hover:text-blue-700 cursor-pointer">Security</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-slate-500">
              <li className="hover:text-blue-700 cursor-pointer">About Us</li>
              <li className="hover:text-blue-700 cursor-pointer">Careers</li>
              <li className="hover:text-blue-700 cursor-pointer">Legal</li>
              <li className="hover:text-blue-700 cursor-pointer">Contact</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6">Resources</h4>
            <ul className="space-y-4 text-sm text-slate-500">
              <li className="hover:text-blue-700 cursor-pointer">Help Center</li>
              <li className="hover:text-blue-700 cursor-pointer">API Reference</li>
              <li className="hover:text-blue-700 cursor-pointer">Community</li>
              <li className="hover:text-blue-700 cursor-pointer">Blog</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400">© 2024 AscendFolio. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-slate-400">
            <span className="hover:text-blue-700 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-blue-700 cursor-pointer">Terms of Service</span>
            <span className="hover:text-blue-700 cursor-pointer">Cookies</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
