"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bitcoin, ShieldCheck, Zap, ArrowRight, TrendingUp, Users, Globe, Hash, Cpu, Star, CheckCircle, DollarSign, Lock } from 'lucide-react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { MiningVisualization } from '@/components/mining/mining-visualization';

const STATS = [
    { icon: Hash, value: "245.6 PH/s", label: "Network Hash Rate", color: "text-orange-400" },
    { icon: Bitcoin, value: "876,543", label: "Blocks Mined", color: "text-yellow-400" },
    { icon: Users, value: "12,458+", label: "Active Miners", color: "text-green-400" },
    { icon: Cpu, value: "99.9%", label: "Uptime", color: "text-blue-400" },
];

const FEATURES = [
    {
        icon: TrendingUp,
        title: "Real-time Analytics",
        desc: "Monitor your mining performance with live hash rates, earnings, and detailed statistics dashboard.",
        gradient: "from-orange-500/20 to-yellow-500/20",
        border: "border-orange-500/30",
        iconBg: "bg-orange-500/10",
        iconColor: "text-orange-400",
    },
    {
        icon: ShieldCheck,
        title: "Secure Infrastructure",
        desc: "Enterprise-grade security with cold storage and multi-sig wallets protecting every investment.",
        gradient: "from-blue-500/20 to-cyan-500/20",
        border: "border-blue-500/30",
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-400",
    },
    {
        icon: Globe,
        title: "Global Mining Farms",
        desc: "Access mining facilities worldwide with optimal electricity costs and ideal environmental conditions.",
        gradient: "from-green-500/20 to-emerald-500/20",
        border: "border-green-500/30",
        iconBg: "bg-green-500/10",
        iconColor: "text-green-400",
    },
    {
        icon: DollarSign,
        title: "Up to 60X Daily ROI",
        desc: "Earn exceptional daily ROI with our premium mining packages and automatic daily payouts.",
        gradient: "from-yellow-500/20 to-orange-500/20",
        border: "border-yellow-500/30",
        iconBg: "bg-yellow-500/10",
        iconColor: "text-yellow-400",
    },
    {
        icon: Zap,
        title: "Instant Payouts",
        desc: "Receive your mining rewards instantly — no waiting, no delays, straight to your wallet.",
        gradient: "from-purple-500/20 to-pink-500/20",
        border: "border-purple-500/30",
        iconBg: "bg-purple-500/10",
        iconColor: "text-purple-400",
    },
    {
        icon: Lock,
        title: "Locked Reserves",
        desc: "Lock your funds for higher interest rates with our Stuck Reserve program — up to 20% annually.",
        gradient: "from-rose-500/20 to-red-500/20",
        border: "border-rose-500/30",
        iconBg: "bg-rose-500/10",
        iconColor: "text-rose-400",
    },
];

const PLANS = [
    { name: "Starter", min: "$30", max: "$250", roi: "1.5%", color: "from-blue-600 to-cyan-600", glow: "shadow-blue-500/20" },
    { name: "Gold", min: "$501", max: "$1,000", roi: "2.5%", color: "from-orange-500 to-yellow-500", glow: "shadow-orange-500/30", popular: true },
    { name: "Diamond", min: "$5,000", max: "$10,000", roi: "4.0%", color: "from-purple-600 to-pink-600", glow: "shadow-purple-500/20" },
];

const COMMISSION_LEVELS = [
    { level: 1, label: "Level 1 (Direct)", percent: "5%", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
    { level: 2, label: "Level 2", percent: "3%", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
    { level: 3, label: "Level 3", percent: "2%", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
    { level: 4, label: "Level 4", percent: "1%", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
    { level: 5, label: "Level 5", percent: "1%", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
];

const PERKS = [
    "No hidden fees or commissions",
    "24/7 live mining monitoring",
    "Instant referral rewards",
    "Multi-level commission system",
    "Secure USDT withdrawals",
    "Dedicated account manager",
];

export default function LandingPage() {
    return (
        <div className="flex flex-col min-h-screen bg-[#050505] text-white">
            <PublicHeader />

            <main className="flex-1 overflow-x-hidden">

                {/* ── Hero ── */}
                <section className="relative w-full py-16 md:py-24 overflow-hidden">
                    {/* Background glow */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-500/8 rounded-full blur-3xl" />
                        <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-yellow-500/5 rounded-full blur-3xl" />
                    </div>

                    <div className="container px-4 md:px-6 mx-auto relative">
                        <div className="flex flex-col items-center space-y-6 text-center">
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-400 backdrop-blur">
                                <Zap className="h-3.5 w-3.5 animate-pulse" />
                                Professional BTC Mining Platform
                            </div>

                            {/* Heading */}
                            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-tight max-w-4xl">
                                Mine{" "}
                                <span className="bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500 bg-clip-text text-transparent">
                                    BTC
                                </span>{" "}
                                with{" "}
                                <span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
                                    Advanced Technology
                                </span>
                            </h1>

                            <p className="max-w-2xl text-base sm:text-lg text-slate-400 leading-relaxed">
                                Get up to <span className="text-orange-400 font-semibold">60X daily ROI</span> on your investments. Join the most advanced BTC mining investment platform with real-time monitoring, instant payouts, and world-class security.
                            </p>

                            {/* CTAs */}
                            <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full max-w-md sm:max-w-none justify-center">
                                <Button size="lg" className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black font-bold shadow-xl shadow-orange-500/25 border-0 px-8" asChild>
                                    <Link href="/register">Start Mining Now <ArrowRight className="ml-2 h-4 w-4" /></Link>
                                </Button>
                                <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white px-8" asChild>
                                    <Link href="/#mining">View Live Demo</Link>
                                </Button>
                            </div>

                            {/* Trust indicators */}
                            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-400" /> No hidden fees</span>
                                <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-400" /> Instant withdrawals</span>
                                <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-400" /> 24/7 Support</span>
                            </div>
                        </div>

                        {/* Mining Visualization */}
                        <div className="mt-12 sm:mt-16" id="mining">
                            <MiningVisualization />
                        </div>
                    </div>
                </section>

                {/* ── Live Stats ── */}
                <section className="w-full py-10 border-y border-slate-800/60 bg-[#080808]">
                    <div className="container px-4 mx-auto">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {STATS.map((stat) => (
                                <div key={stat.label} className="flex flex-col items-center p-5 sm:p-6 bg-slate-900/80 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors text-center">
                                    <stat.icon className={`w-7 h-7 ${stat.color} mb-3`} />
                                    <div className="text-xl sm:text-2xl font-bold text-white">{stat.value}</div>
                                    <div className="text-xs sm:text-sm text-slate-500 mt-1">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Features ── */}
                <section id="features" className="w-full py-16 md:py-24 bg-[#050505]">
                    <div className="container px-4 md:px-6 mx-auto">
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-sm text-slate-400 mb-4">
                                <Star className="h-3.5 w-3.5 text-yellow-400" />
                                Why Choose Us
                            </div>
                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
                                Everything You Need to
                                <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent"> Earn More</span>
                            </h2>
                            <p className="text-slate-400 max-w-xl mx-auto text-base sm:text-lg">
                                Professional-grade BTC mining infrastructure with real-time monitoring and instant rewards.
                            </p>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {FEATURES.map((f) => (
                                <div key={f.title} className={`group relative p-6 rounded-2xl bg-gradient-to-br ${f.gradient} border ${f.border} hover:scale-[1.02] transition-all duration-300 cursor-default`}>
                                    <div className={`inline-flex p-3 rounded-xl ${f.iconBg} mb-4`}>
                                        <f.icon className={`h-6 w-6 ${f.iconColor}`} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Plans ── */}
                <section className="w-full py-16 md:py-24 bg-[#080808] border-t border-slate-800/60">
                    <div className="container px-4 md:px-6 mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                                Choose Your Mining Plan
                            </h2>
                            <p className="text-slate-400 max-w-lg mx-auto">
                                Select the plan that fits your investment goals and start earning today.
                            </p>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-3 max-w-5xl mx-auto">
                            {PLANS.map((plan) => (
                                <div
                                    key={plan.name}
                                    className={`relative flex flex-col p-6 rounded-2xl bg-slate-900 border ${plan.popular ? 'border-orange-500/60 shadow-2xl ' + plan.glow : 'border-slate-800'} hover:border-slate-600 transition-all duration-300`}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                                            <Star className="h-3 w-3" /> MOST POPULAR
                                        </div>
                                    )}
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4 shadow-lg`}>
                                        <Bitcoin className="h-6 w-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                                    <div className="text-3xl font-black text-white my-2">
                                        {plan.roi}
                                        <span className="text-sm text-slate-400 font-normal"> / day</span>
                                    </div>
                                    <div className="space-y-2 text-sm text-slate-400 mb-6 flex-1">
                                        <div className="flex justify-between"><span>Investment Range</span><span className="text-white font-medium">{plan.min} – {plan.max}</span></div>
                                        <div className="flex justify-between"><span>Duration</span><span className="text-green-400 font-medium">Open-ended</span></div>
                                        <div className="flex justify-between"><span>Payout</span><span className="text-white font-medium">Daily Claim</span></div>
                                    </div>
                                    <Button className={`w-full bg-gradient-to-r ${plan.color} text-white border-0 font-semibold hover:opacity-90`} asChild>
                                        <Link href="/register">Get Started</Link>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Perks List ── */}
                <section className="w-full py-16 md:py-20 bg-[#050505] border-t border-slate-800/60">
                    <div className="container px-4 mx-auto">
                        <div className="flex flex-col lg:flex-row items-center gap-12 max-w-5xl mx-auto">
                            <div className="flex-1">
                                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                                    Everything Included —
                                    <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent"> No Surprises</span>
                                </h2>
                                <p className="text-slate-400 mb-8">
                                    We believe in full transparency. Every plan comes with all features included from day one.
                                </p>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    {PERKS.map((perk) => (
                                        <div key={perk} className="flex items-center gap-3 bg-slate-900 rounded-xl px-4 py-3 border border-slate-800">
                                            <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                                            <span className="text-sm text-slate-300">{perk}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 flex justify-center">
                                <div className="relative w-64 h-64 sm:w-80 sm:h-80">
                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-yellow-500/10 rounded-3xl blur-3xl" />
                                    <div className="relative flex flex-col items-center justify-center h-full bg-slate-900 rounded-3xl border border-orange-500/30 p-8 text-center shadow-2xl">
                                        <div className="text-6xl font-black bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">60X</div>
                                        <div className="text-lg font-semibold text-white mt-2">Daily ROI</div>
                                        <div className="text-sm text-slate-400 mt-1">on your investment</div>
                                        <div className="mt-4 flex items-center gap-1 text-green-400 text-sm">
                                            <TrendingUp className="h-4 w-4" />
                                            Proven track record
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Referral Commission ── */}
                <section className="w-full py-16 md:py-20 bg-[#080808] border-t border-slate-800/60">
                    <div className="container px-4 md:px-6 mx-auto max-w-4xl">
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-400 mb-4">
                                <Users className="h-3.5 w-3.5" />
                                5-Level Referral Commission
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                                Earn While Others{" "}
                                <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">Mine</span>
                            </h2>
                            <p className="text-slate-400 max-w-lg mx-auto">
                                Invite friends and earn commission from their investments — up to 5 levels deep. The more you refer, the more you earn.
                            </p>
                        </div>
                        <div className="grid grid-cols-5 gap-3">
                            {COMMISSION_LEVELS.map((lvl) => (
                                <div key={lvl.level} className={`flex flex-col items-center p-4 rounded-2xl border ${lvl.bg}`}>
                                    <div className={`text-2xl sm:text-3xl font-black ${lvl.color} mb-1`}>{lvl.percent}</div>
                                    <div className="text-xs text-slate-400 text-center leading-tight">{lvl.label}</div>
                                </div>
                            ))}
                        </div>
                        <p className="text-center text-xs text-slate-500 mt-4">
                            Commission is earned on every deposit made by your referrals, credited instantly.
                        </p>
                    </div>
                </section>

                {/* ── CTA ── */}
                <section className="w-full py-16 md:py-20 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="container px-4 mx-auto text-center space-y-6 relative">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white">
                            Start Mining BTC Today!
                        </h2>
                        <p className="text-orange-100 text-base sm:text-lg max-w-2xl mx-auto">
                            Join 12,000+ miners already earning BTC with our professional mining infrastructure. Setup takes less than 2 minutes.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button size="lg" variant="secondary" className="bg-black text-white hover:bg-slate-900 font-bold px-10 border-0 shadow-xl" asChild>
                                <Link href="/register">Create Free Account</Link>
                            </Button>
                            <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/10 px-10" asChild>
                                <Link href="/invest">View All Plans</Link>
                            </Button>
                        </div>
                    </div>
                </section>

            </main>

            <PublicFooter />
        </div>
    );
}
