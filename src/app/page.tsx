
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DollarSign, ShieldCheck, TrendingUp, Zap, ArrowRight, Briefcase } from 'lucide-react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-primary/5 via-background to-background">
          <div className="container px-4 md:px-6 mx-auto text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary mb-4">
                <Zap className="mr-1 h-3 w-3" />
                Empowering Your Financial Future
              </div>
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl max-w-3xl">
                Master Your Investments with <span className="text-primary">Precision</span>
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl leading-relaxed">
                Track assets, analyze performance, and grow your wealth with the world's most intuitive investment management platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button asChild size="lg" className="px-8">
                  <Link href="/register">Start Growing Now <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button variant="outline" size="lg" className="px-8" asChild>
                  <Link href="/about">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-12 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 text-center p-6 bg-background rounded-2xl shadow-sm border group hover:border-primary transition-colors">
                <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <TrendingUp className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold">Real-time Analytics</h3>
                <p className="text-muted-foreground">Monitor your portfolio performance with live market data and advanced charting tools.</p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center p-6 bg-background rounded-2xl shadow-sm border group hover:border-primary transition-colors">
                <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold">Secure Infrastructure</h3>
                <p className="text-muted-foreground">Your financial data is protected by industry-leading security protocols and Firestore encryption.</p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center p-6 bg-background rounded-2xl shadow-sm border group hover:border-primary transition-colors">
                <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Briefcase className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold">Smart Diversification</h3>
                <p className="text-muted-foreground">Balance your risk with our visual asset allocation tools for crypto, stocks, and more.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-20 border-t bg-primary text-primary-foreground">
          <div className="container px-4 mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold">Ready to take control of your wealth?</h2>
            <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto">
              Join 150,000+ investors who use AscendFolio to master their financial future.
            </p>
            <Button size="lg" variant="secondary" className="px-12" asChild>
              <Link href="/register">Join Now for Free</Link>
            </Button>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
