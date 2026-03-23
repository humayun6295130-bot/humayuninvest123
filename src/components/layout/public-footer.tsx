"use client";

import Link from 'next/link';
import { Bitcoin, Pickaxe, Shield, Globe, Mail } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="w-full border-t border-orange-500/20 py-8 sm:py-12 bg-slate-900">
      <div className="container px-3 sm:px-4 md:px-6 mx-auto">
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8 mb-8">
          <div className="flex flex-col items-center md:items-start gap-3 sm:gap-4 w-full md:w-auto">
            <Link className="flex items-center gap-2" href="/">
              <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-1 rounded-lg shadow-lg">
                <Bitcoin className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                BTC<span className="text-orange-400">Mine</span>
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-slate-400 text-center md:text-left max-w-xs">
              Professional BTC mining investment platform.
              Start mining BTC with our advanced mining technology.
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap justify-center md:justify-start">
              <div className="flex items-center gap-1.5 text-xs text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Mining Active
              </div>
              <div className="w-px h-3 bg-slate-600 hidden sm:block" />
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Shield className="w-3 h-3" />
                Secure Platform
              </div>
            </div>
          </div>

          {/* Footer Links - Mobile Responsive Grid */}
          <div className="flex flex-wrap gap-6 sm:gap-8 justify-center">
            <div className="flex flex-col gap-2 min-w-[80px]">
              <h5 className="font-semibold text-sm text-white">Platform</h5>
              <Link className="text-xs sm:text-sm text-slate-400 hover:text-orange-400 transition-colors" href="/#mining">Live Mining</Link>
              <Link className="text-xs sm:text-sm text-slate-400 hover:text-orange-400 transition-colors" href="/invest">Plans</Link>
              <Link className="text-xs sm:text-sm text-slate-400 hover:text-orange-400 transition-colors" href="/#features">Features</Link>
            </div>
            <div className="flex flex-col gap-2 min-w-[80px]">
              <h5 className="font-semibold text-sm text-white">Company</h5>
              <Link className="text-xs sm:text-sm text-slate-400 hover:text-orange-400 transition-colors" href="/about">About Us</Link>
              <Link className="text-xs sm:text-sm text-slate-400 hover:text-orange-400 transition-colors" href="/contact">Contact</Link>
              <Link className="text-xs sm:text-sm text-slate-400 hover:text-orange-400 transition-colors" href="/terms">Terms</Link>
            </div>
            <div className="flex flex-col gap-2 min-w-[80px]">
              <h5 className="font-semibold text-sm text-white">Support</h5>
              <Link className="text-xs sm:text-sm text-slate-400 hover:text-orange-400 transition-colors" href="/faq">FAQ</Link>
              <Link className="text-xs sm:text-sm text-slate-400 hover:text-orange-400 transition-colors" href="/support">Help Center</Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-orange-500/10 pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4">
          <p className="text-xs sm:text-sm text-slate-500 text-center">
            © 2026 BTCMine. All rights reserved.
          </p>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-400">
              <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Global Mining Network</span>
              <span className="sm:hidden">Global</span>
            </div>
          </div>
        </div>

        {/* Mining Stats Strip */}
        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-orange-500/10">
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs">
            <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400">
              <Pickaxe className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
              <span>Hash: 245.6 PH/s</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400">
              <Bitcoin className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
              <span>Blocks: 876,543</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400">
              <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
              <span>Miners: 12,458</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
