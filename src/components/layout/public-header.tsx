"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bitcoin, Pickaxe, BarChart3, Wallet, Users, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function PublicHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="px-2 sm:px-4 h-auto min-h-16 flex items-center border-b border-slate-800/50 bg-[#050505]/95 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between w-full">
        <Link className="flex items-center justify-center gap-2 flex-shrink-0" href="/">
          <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-1.5 rounded-lg shadow-lg shadow-orange-500/30">
            <Bitcoin className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-white">
            BTC<span className="text-orange-400">Mine</span>
          </span>
        </Link>

        {/* Mobile Menu Button */}
        <button
          className="sm:hidden p-2 text-slate-300 hover:text-orange-400"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden sm:flex items-center gap-3 lg:gap-6">
          <Link className="text-xs lg:text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors py-2 flex items-center gap-1.5" href="/#mining">
            <Pickaxe className="h-4 w-4" />
            Mining
          </Link>
          <Link className="text-xs lg:text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors py-2 flex items-center gap-1.5" href="/invest">
            <BarChart3 className="h-4 w-4" />
            Plans
          </Link>
          <Link className="text-xs lg:text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors py-2" href="/about">
            About
          </Link>
          <Link className="text-xs lg:text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors py-2" href="/contact">
            Contact
          </Link>
          <div className="w-px h-4 bg-slate-600" />
          <Link className="text-xs lg:text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors py-2" href="/login">
            Login
          </Link>
          <Button asChild size="sm" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-none shadow-lg shadow-orange-500/25">
            <Link href="/register">Get Started</Link>
          </Button>
        </nav>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-[#050505] border-b border-slate-800/50 sm:hidden">
          <nav className="flex flex-col p-4 gap-2">
            <Link
              className="text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors py-3 px-4 flex items-center gap-2 bg-[#111] border border-slate-800 rounded-lg"
              href="/#mining"
              onClick={() => setIsMenuOpen(false)}
            >
              <Pickaxe className="h-4 w-4" />
              Mining
            </Link>
            <Link
              className="text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors py-3 px-4 flex items-center gap-2 bg-[#111] border border-slate-800 rounded-lg"
              href="/invest"
              onClick={() => setIsMenuOpen(false)}
            >
              <BarChart3 className="h-4 w-4" />
              Plans
            </Link>
            <Link
              className="text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors py-3 px-4 bg-[#111] border border-slate-800 rounded-lg"
              href="/about"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <Link
              className="text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors py-3 px-4 bg-[#111] border border-slate-800 rounded-lg"
              href="/contact"
              onClick={() => setIsMenuOpen(false)}
            >
              Contact
            </Link>
            <div className="flex gap-2 mt-2">
              <Link
                className="flex-1 text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors py-3 text-center bg-[#111] border border-slate-800 rounded-lg"
                href="/login"
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link>
              <Button asChild size="sm" className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-none">
                <Link href="/register" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
