"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bitcoin, ShieldCheck, Zap, ArrowRight, Pickaxe, TrendingUp, Users, Globe, Hash, Cpu } from 'lucide-react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { MiningVisualization } from '@/components/mining/mining-visualization';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-foreground">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero Section with 3D Mining */}
        <section className="w-full py-8 md:py-12 lg:py-16 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-6">
              <div className="inline-flex items-center rounded-full border border-orange-500/30 px-3 py-1.5 text-sm font-semibold transition-colors bg-slate-800/50 text-orange-400 mb-2">
                <Zap className="mr-2 h-4 w-4 animate-pulse" />
                Professional Bitcoin Mining - 2026 Edition
              </div>
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl max-w-3xl text-center text-white">
                Mine Bitcoin with <span className="text-orange-400">Advanced Technology</span>
              </h1>
              <p className="mx-auto max-w-[700px] text-slate-400 md:text-lg leading-relaxed text-center">
                Join the most advanced Bitcoin mining investment platform.
                Real-time mining visualization, instant payouts, and professional mining infrastructure.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <Button asChild size="lg" className="px-8 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-none shadow-lg shadow-orange-500/25">
                  <Link href="/register">Start Mining Now <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button variant="outline" size="lg" className="px-8 border-orange-500/30 text-orange-400 hover:bg-orange-500/10" asChild>
                  <Link href="/#mining">View Live Demo</Link>
                </Button>
              </div>
            </div>

            {/* 3D Mining Visualization */}
            <div className="mt-12" id="mining">
              <MiningVisualization />
            </div>
          </div>
        </section>

        {/* Live Mining Stats */}
        <section className="w-full py-12 bg-slate-900/50 border-y border-orange-500/10">
          <div className="container px-4 mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex flex-col items-center p-6 bg-slate-800/50 rounded-xl border border-orange-500/20">
                <Hash className="w-8 h-8 text-orange-400 mb-2" />
                <div className="text-2xl font-bold text-white">245.6 PH/s</div>
                <div className="text-sm text-slate-400">Network Hash Rate</div>
              </div>
              <div className="flex flex-col items-center p-6 bg-slate-800/50 rounded-xl border border-orange-500/20">
                <Bitcoin className="w-8 h-8 text-orange-400 mb-2" />
                <div className="text-2xl font-bold text-white">876,543</div>
                <div className="text-sm text-slate-400">Blocks Mined</div>
              </div>
              <div className="flex flex-col items-center p-6 bg-slate-800/50 rounded-xl border border-orange-500/20">
                <Users className="w-8 h-8 text-orange-400 mb-2" />
                <div className="text-2xl font-bold text-white">12,458</div>
                <div className="text-sm text-slate-400">Active Miners</div>
              </div>
              <div className="flex flex-col items-center p-6 bg-slate-800/50 rounded-xl border border-orange-500/20">
                <Cpu className="w-8 h-8 text-orange-400 mb-2" />
                <div className="text-2xl font-bold text-white">99.9%</div>
                <div className="text-sm text-slate-400">Uptime</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-16 md:py-24 bg-slate-950">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
                Why Choose Our Mining Platform?
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Professional-grade Bitcoin mining infrastructure with real-time monitoring and instant rewards.
              </p>
            </div>
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 text-center p-8 bg-slate-900 rounded-2xl border border-orange-500/20 group hover:border-orange-500/50 transition-colors">
                <div className="p-4 bg-orange-500/10 rounded-full group-hover:bg-orange-500/20 transition-colors">
                  <TrendingUp className="h-8 w-8 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Real-time Analytics</h3>
                <p className="text-slate-400">Monitor your mining performance with live hash rates, earnings, and detailed statistics dashboard.</p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center p-8 bg-slate-900 rounded-2xl border border-orange-500/20 group hover:border-orange-500/50 transition-colors">
                <div className="p-4 bg-orange-500/10 rounded-full group-hover:bg-orange-500/20 transition-colors">
                  <ShieldCheck className="h-8 w-8 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Secure Infrastructure</h3>
                <p className="text-slate-400">Your investments are protected by enterprise-grade security with cold storage and multi-sig wallets.</p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center p-8 bg-slate-900 rounded-2xl border border-orange-500/20 group hover:border-orange-500/50 transition-colors">
                <div className="p-4 bg-orange-500/10 rounded-full group-hover:bg-orange-500/20 transition-colors">
                  <Globe className="h-8 w-8 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Global Mining Farms</h3>
                <p className="text-slate-400">Access mining facilities worldwide with optimal electricity costs and environmental conditions.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Mining Plans Preview */}
        <section id="plans" className="w-full py-16 bg-slate-900/50 border-y border-orange-500/10">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
                Mining Investment Plans
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Choose a plan that fits your investment goals and start earning BTC immediately.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {/* Starter Plan */}
              <div className="p-6 bg-slate-800/50 rounded-xl border border-orange-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <Pickaxe className="w-6 h-6 text-orange-400" />
                  <h3 className="text-lg font-bold text-white">Starter</h3>
                </div>
                <div className="text-3xl font-bold text-orange-400 mb-2">$100</div>
                <div className="text-sm text-slate-400 mb-4">Minimum investment</div>
                <ul className="space-y-2 text-sm text-slate-300 mb-6">
                  <li className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-400" /> 10 TH/s Hash Rate
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-400" /> 1% Daily Returns
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-400" /> 30 Days Duration
                  </li>
                </ul>
                <Button className="w-full bg-orange-500 hover:bg-orange-600" asChild>
                  <Link href="/register">Get Started</Link>
                </Button>
              </div>

              {/* Pro Plan */}
              <div className="p-6 bg-gradient-to-b from-orange-500/20 to-slate-800/50 rounded-xl border border-orange-500/50 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs px-3 py-1 rounded-full">
                  Popular
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <Bitcoin className="w-6 h-6 text-orange-400" />
                  <h3 className="text-lg font-bold text-white">Pro</h3>
                </div>
                <div className="text-3xl font-bold text-orange-400 mb-2">$1,000</div>
                <div className="text-sm text-slate-400 mb-4">Best value plan</div>
                <ul className="space-y-2 text-sm text-slate-300 mb-6">
                  <li className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-400" /> 100 TH/s Hash Rate
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-400" /> 1.5% Daily Returns
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-400" /> 60 Days Duration
                  </li>
                </ul>
                <Button className="w-full bg-orange-500 hover:bg-orange-600" asChild>
                  <Link href="/register">Get Started</Link>
                </Button>
              </div>

              {/* Enterprise Plan */}
              <div className="p-6 bg-slate-800/50 rounded-xl border border-orange-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-6 h-6 text-orange-400" />
                  <h3 className="text-lg font-bold text-white">Enterprise</h3>
                </div>
                <div className="text-3xl font-bold text-orange-400 mb-2">$10,000</div>
                <div className="text-sm text-slate-400 mb-4">Maximum returns</div>
                <ul className="space-y-2 text-sm text-slate-300 mb-6">
                  <li className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-400" /> 1 PH/s Hash Rate
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-400" /> 2% Daily Returns
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-400" /> 90 Days Duration
                  </li>
                </ul>
                <Button className="w-full bg-orange-500 hover:bg-orange-600" asChild>
                  <Link href="/register">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-20 bg-gradient-to-r from-orange-600 to-orange-700">
          <div className="container px-4 mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold text-white">
              Start Mining Bitcoin Today!
            </h2>
            <p className="text-orange-100 text-lg max-w-2xl mx-auto">
              Join 12,000+ miners already earning Bitcoin with our professional mining infrastructure.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" className="px-12 text-orange-600 font-bold" asChild>
                <Link href="/register">Create Free Account</Link>
              </Button>
              <Button size="lg" variant="outline" className="px-12 border-white text-white hover:bg-white/10" asChild>
                <Link href="/invest">View Plans</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
