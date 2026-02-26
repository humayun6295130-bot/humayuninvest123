
"use client";

import Link from 'next/link';
import { DollarSign } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="w-full border-t py-12 bg-muted/20">
      <div className="container px-4 md:px-6 mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start gap-4">
          <Link className="flex items-center gap-2" href="/">
            <div className="bg-primary p-1 rounded text-primary-foreground">
              <DollarSign className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold">AscendFolio</span>
          </Link>
          <p className="text-sm text-muted-foreground text-center md:text-left">
            © 2024 AscendFolio Inc. All rights reserved.<br />
            Empowering investors worldwide with secure tracking tools.
          </p>
        </div>
        <div className="flex gap-12">
          <div className="flex flex-col gap-2">
            <h5 className="font-semibold text-sm">Company</h5>
            <Link className="text-sm text-muted-foreground hover:text-primary transition-colors" href="/about">About Us</Link>
            <Link className="text-sm text-muted-foreground hover:text-primary transition-colors" href="/contact">Contact</Link>
            <Link className="text-sm text-muted-foreground hover:text-primary transition-colors" href="#">Careers</Link>
          </div>
          <div className="flex flex-col gap-2">
            <h5 className="font-semibold text-sm">Product</h5>
            <Link className="text-sm text-muted-foreground hover:text-primary transition-colors" href="/#features">Features</Link>
            <Link className="text-sm text-muted-foreground hover:text-primary transition-colors" href="/invest">Pricing</Link>
            <Link className="text-sm text-muted-foreground hover:text-primary transition-colors" href="#">Security</Link>
          </div>
          <div className="flex flex-col gap-2">
            <h5 className="font-semibold text-sm">Support</h5>
            <Link className="text-sm text-muted-foreground hover:text-primary transition-colors" href="#">Help Center</Link>
            <Link className="text-sm text-muted-foreground hover:text-primary transition-colors" href="#">API Docs</Link>
            <Link className="text-sm text-muted-foreground hover:text-primary transition-colors" href="#">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
