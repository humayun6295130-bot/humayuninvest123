"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bitcoin, Pickaxe, BarChart3, Wallet, Users } from 'lucide-react';

export function PublicHeader() {
  return (
    <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <Link className="flex items-center justify-center gap-2" href="/">
          <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-1.5 rounded-lg shadow-lg shadow-orange-500/30">
            <Bitcoin className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            BTC<span className="text-orange-400">Mine</span> 2026
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 sm:gap-6">
          <Link className="text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors py-2 flex items-center gap-1.5" href="/#mining">
            <Pickaxe className="h-4 w-4" />
            Mining
          </Link>
          <Link className="text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors py-2 flex items-center gap-1.5" href="/invest">
            <BarChart3 className="h-4 w-4" />
            Plans
          </Link>
          <Link className="text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors py-2 flex items-center gap-1.5" href="/#about">
            About
          </Link>
          <Link className="text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors py-2 flex items-center gap-1.5" href="/contact">
            Contact
          </Link>
          <div className="w-px h-4 bg-slate-600 hidden sm:block" />
          <Link className="text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors py-2" href="/login">
            Login
          </Link>
          <Button asChild size="sm" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-none shadow-lg shadow-orange-500/25">
            <Link href="/register">Get Started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
