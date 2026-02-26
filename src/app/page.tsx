
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DollarSign, ShieldCheck, TrendingUp, Zap, ArrowRight, Briefcase, PieChart } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <Link className="flex items-center justify-center gap-2" href="/">
          <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
            <DollarSign className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">AscendFolio</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:text-primary transition-colors py-2" href="/login">
            Login
          </Link>
          <Button asChild size="sm">
            <Link href="/register">Get Started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-primary/5 via-background to-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
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
                <Button variant="outline" size="lg" className="px-8">
                  View Demo
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
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

        {/* Stats Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 border-t">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="space-y-2">
                <h4 className="text-4xl font-bold">$2B+</h4>
                <p className="text-sm text-muted-foreground uppercase tracking-widest">Assets Managed</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-4xl font-bold">150k+</h4>
                <p className="text-sm text-muted-foreground uppercase tracking-widest">Active Users</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-4xl font-bold">99.9%</h4>
                <p className="text-sm text-muted-foreground uppercase tracking-widest">Uptime</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-4xl font-bold">24/7</h4>
                <p className="text-sm text-muted-foreground uppercase tracking-widest">Expert Support</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
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
              Investing involves risk. Please trade responsibly.
            </p>
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col gap-2">
              <h5 className="font-semibold text-sm">Product</h5>
              <Link className="text-sm text-muted-foreground hover:text-primary transition-colors" href="#">Features</Link>
              <Link className="text-sm text-muted-foreground hover:text-primary transition-colors" href="#">Pricing</Link>
              <Link className="text-sm text-muted-foreground hover:text-primary transition-colors" href="#">Security</Link>
            </div>
            <div className="flex flex-col gap-2">
              <h5 className="font-semibold text-sm">Support</h5>
              <Link className="text-sm text-muted-foreground hover:text-primary transition-colors" href="#">Help Center</Link>
              <Link className="text-sm text-muted-foreground hover:text-primary transition-colors" href="#">API Docs</Link>
              <Link className="text-sm text-muted-foreground hover:text-primary transition-colors" href="#">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
