"use client";

import Link from 'next/link';
import { Bitcoin, Pickaxe, Shield, Globe, Mail } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="w-full border-t border-orange-500/20 py-12 bg-slate-900">
      <div className="container px-4 md:px-6 mx-auto">
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <Link className="flex items-center gap-2" href="/">
              <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-1 rounded-lg shadow-lg">
                <Bitcoin className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                BTC<span className="text-orange-400">Mine</span> 2026
              </span>
            </Link>
            <p className="text-sm text-slate-400 text-center md:text-left max-w-xs">
              Professional Bitcoin mining investment platform.
              Start mining BTC with our advanced 2026 mining technology.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Mining Active
              </div>
              <div className="w-px h-3 bg-slate-600" />
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Shield className="w-3 h-3" />
                Secure Platform
              </div>
            </div>
          </div>

          <div className="flex gap-12">
            <div className="flex flex-col gap-2">
              <h5 className="font-semibold text-sm text-white">Platform</h5>
              <Link className="text-sm text-slate-400 hover:text-orange-400 transition-colors" href="/#mining">Live Mining</Link>
              <Link className="text-sm text-slate-400 hover:text-orange-400 transition-colors" href="/invest">Plans</Link>
              <Link className="text-sm text-slate-400 hover:text-orange-400 transition-colors" href="/#features">Features</Link>
              <Link className="text-sm text-slate-400 hover:text-orange-400 transition-colors" href="/#roi">ROI</Link>
            </div>
            <div className="flex flex-col gap-2">
              <h5 className="font-semibold text-sm text-white">Company</h5>
              <Link className="text-sm text-slate-400 hover:text-orange-400 transition-colors" href="/about">About Us</Link>
              <Link className="text-sm text-slate-400 hover:text-orange-400 transition-colors" href="/contact">Contact</Link>
              <Link className="text-sm text-slate-400 hover:text-orange-400 transition-colors" href="/terms">Terms</Link>
              <Link className="text-sm text-slate-400 hover:text-orange-400 transition-colors" href="/privacy">Privacy</Link>
            </div>
            <div className="flex flex-col gap-2">
              <h5 className="font-semibold text-sm text-white">Support</h5>
              <Link className="text-sm text-slate-400 hover:text-orange-400 transition-colors" href="/#faq">FAQ</Link>
              <Link className="text-sm text-slate-400 hover:text-orange-400 transition-colors" href="/support">Help Center</Link>
              <Link className="text-sm text-slate-400 hover:text-orange-400 transition-colors" href="/#security">Security</Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-orange-500/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">
            © 2026 BTCMine. All rights reserved. Powered by advanced mining technology.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Globe className="w-4 h-4" />
              <span>Global Mining Network</span>
            </div>
          </div>
        </div>

        {/* Mining Stats Strip */}
        <div className="mt-8 pt-6 border-t border-orange-500/10">
          <div className="flex flex-wrap justify-center gap-8 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Pickaxe className="w-4 h-4 text-orange-400" />
              <span>Total Hash Rate: 245.6 PH/s</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Bitcoin className="w-4 h-4 text-orange-400" />
              <span>Blocks Mined: 876,543</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Globe className="w-4 h-4 text-orange-400" />
              <span>Miners: 12,458</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
