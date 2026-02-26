
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DollarSign } from 'lucide-react';

export function PublicHeader() {
  return (
    <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <Link className="flex items-center justify-center gap-2" href="/">
          <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
            <DollarSign className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">AscendFolio</span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:text-primary transition-colors py-2" href="/about">
            About
          </Link>
          <Link className="text-sm font-medium hover:text-primary transition-colors py-2" href="/contact">
            Contact
          </Link>
          <div className="w-px h-4 bg-border hidden sm:block" />
          <Link className="text-sm font-medium hover:text-primary transition-colors py-2" href="/login">
            Login
          </Link>
          <Button asChild size="sm">
            <Link href="/register">Get Started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
