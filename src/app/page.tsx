"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bitcoin, ShieldCheck, Zap, ArrowRight, TrendingUp, Users, Globe, Hash, Cpu } from 'lucide-react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { MiningVisualization } from '@/components/mining/mining-visualization';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-foreground">
      <PublicHeader />

      <main className="flex-1 overflow-x-hidden">
        {/* Hero Section with 3D Mining */}
        <section className="w-full py-6 md:py-12 lg:py-16 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
          <div className="container px-2 sm:px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 sm:space-y-6">
              <div className="inline-flex items-center rounded-full border border-orange-500/30 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-semibold transition-colors bg-slate-800/50 text-orange-400 mb-1 sm:mb-2">
                <Zap className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4 animate-pulse" />
                Professional BTC Mining
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-center text-white px-2">
                Mine BTC with <span className="text-orange-400">Advanced Technology</span>
              </h1>
              <p className="mx-auto max-w-[90%] sm:max-w-[700px] text-sm sm:text-base md:text-lg text-slate-400 leading-relaxed text-center px-2">
                Get up to 60% profit on your investments. Join the most advanced BTC mining investment platform.
                Real-time mining visualization, instant payouts, and professional mining infrastructure.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-2 sm:mt-4 w-full px-2 sm:px-0 max-w-md sm:max-w-none">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-none shadow-lg shadow-orange-500/25" asChild>
                  <Link href="/register">Start Mining Now <ArrowRight className="ml-1.5 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" /></Link>
                </Button>
                <Button variant="outline" size="lg" className="w-full sm:w-auto border-orange-500/30 text-orange-400 hover:bg-orange-500/10" asChild>
                  <Link href="/#mining">View Live Demo</Link>
                </Button>
              </div>
            </div>

            {/* 3D Mining Visualization */}
            <div className="mt-8 sm:mt-12" id="mining">
              <MiningVisualization />
            </div>
          </div>
        </section>

        {/* Live Mining Stats */}
        <section className="w-full py-8 sm:py-12 bg-slate-900/50 border-y border-orange-500/10 overflow-hidden">
          <div className="container px-2 sm:px-4 mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
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
        <section id="features" className="w-full py-12 md:py-16 lg:py-24 bg-slate-950 overflow-hidden">
          <div className="container px-2 sm:px-4 md:px-6 mx-auto">
            <div className="text-center mb-8 sm:mb-10 lg:mb-12">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4 px-2">
                Why Choose Our Mining Platform?
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto px-2">
                Professional-grade BTC mining infrastructure with real-time monitoring and instant rewards.
              </p>
            </div>
            <div className="grid gap-4 sm:gap-6 lg:gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-3 sm:space-y-4 text-center p-4 sm:p-6 lg:p-8 bg-slate-900 rounded-xl sm:rounded-2xl border border-orange-500/20 group hover:border-orange-500/50 transition-colors">
                <div className="p-3 sm:p-4 bg-orange-500/10 rounded-full group-hover:bg-orange-500/20 transition-colors">
                  <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-orange-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Real-time Analytics</h3>
                <p className="text-sm sm:text-base text-slate-400">Monitor your mining performance with live hash rates, earnings, and detailed statistics dashboard.</p>
              </div>
              <div className="flex flex-col items-center space-y-3 sm:space-y-4 text-center p-4 sm:p-6 lg:p-8 bg-slate-900 rounded-xl sm:rounded-2xl border border-orange-500/20 group hover:border-orange-500/50 transition-colors">
                <div className="p-3 sm:p-4 bg-orange-500/10 rounded-full group-hover:bg-orange-500/20 transition-colors">
                  <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-orange-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Secure Infrastructure</h3>
                <p className="text-sm sm:text-base text-slate-400">Your investments are protected by enterprise-grade security with cold storage and multi-sig wallets.</p>
              </div>
              <div className="flex flex-col items-center space-y-3 sm:space-y-4 text-center p-4 sm:p-6 lg:p-8 bg-slate-900 rounded-xl sm:rounded-2xl border border-orange-500/20 group hover:border-orange-500/50 transition-colors sm:col-span-2 lg:col-span-1">
                <div className="p-3 sm:p-4 bg-orange-500/10 rounded-full group-hover:bg-orange-500/20 transition-colors">
                  <Globe className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-orange-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Global Mining Farms</h3>
                <p className="text-sm sm:text-base text-slate-400">Access mining facilities worldwide with optimal electricity costs and environmental conditions.</p>
              </div>
            </div>
          </div>
        </section>


        <section className="w-full py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-orange-600 to-orange-700">
          <div className="container px-2 sm:px-4 mx-auto text-center space-y-6 sm:space-y-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white px-2">
              Start Mining BTC Today!
            </h2>
            <p className="text-orange-100 text-sm sm:text-base md:text-lg max-w-xl lg:max-w-2xl mx-auto px-2">
              Join 12,000+ miners already earning BTC with our professional mining infrastructure.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2 sm:px-0">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto sm:px-10 lg:px-12 text-orange-600 font-bold" asChild>
                <Link href="/register">Create Free Account</Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto sm:px-10 lg:px-12 border-white text-white hover:bg-white/10" asChild>
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
