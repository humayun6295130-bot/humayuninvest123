"use client";

import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    UserPlus,
    Wallet,
    Bitcoin,
    TrendingUp,
    Users,
    Shield,
    Clock,
    Zap,
    ArrowRight,
    CheckCircle,
    Server,
    Activity,
    Globe
} from "lucide-react";
import Link from "next/link";
import {
    DEPOSIT_TIERS_FOR_DISPLAY,
    EARNINGS_AND_REFERRAL_CREDIT_SUMMARY,
    PLATFORM_MIN_INVESTMENT_USD,
    RATES_ARE_DEFAULTS_DISCLAIMER,
    REFERRAL_PROGRAM_COMBINED_PARAGRAPH,
} from "@/lib/public-platform-copy";

const steps = [
    {
        number: 1,
        title: "Create Account",
        description: "Sign up for free with your email. It only takes 2 minutes to get started.",
        icon: UserPlus,
        color: "from-blue-500 to-blue-600"
    },
    {
        number: 2,
        title: "Choose Investment Plan",
        description: `Pick a deposit size that fits your budget. Active plans start from $${PLATFORM_MIN_INVESTMENT_USD.toLocaleString("en-US")} USD; daily income % depends on the tier shown on Invest and in your dashboard.`,
        icon: Wallet,
        color: "from-purple-500 to-purple-600"
    },
    {
        number: 3,
        title: "Make Deposit",
        description: "Fund your account with USDT using the network and address shown in the deposit / invest flow (e.g. QR in the app). Always match the network the screen asks for.",
        icon: Bitcoin,
        color: "from-orange-500 to-orange-600"
    },
    {
        number: 4,
        title: "Start Mining",
        description: "After your plan is activated, your position runs in the app. Track balance and claim daily profit once per UTC day on active investments.",
        icon: Server,
        color: "from-green-500 to-green-600"
    },
    {
        number: 5,
        title: "Claim & Earn",
        description: EARNINGS_AND_REFERRAL_CREDIT_SUMMARY,
        icon: TrendingUp,
        color: "from-yellow-500 to-yellow-600"
    },
    {
        number: 6,
        title: "Refer & team commission",
        description: `${REFERRAL_PROGRAM_COMBINED_PARAGRAPH} ${RATES_ARE_DEFAULTS_DISCLAIMER}`,
        icon: Users,
        color: "from-pink-500 to-pink-600"
    }
];

const features = [
    {
        icon: Shield,
        title: "Secure Infrastructure",
        description: "Enterprise-grade security with cold storage, multi-sig wallets, and 24/7 monitoring"
    },
    {
        icon: Activity,
        title: "Real-time Analytics",
        description: "Monitor your mining performance with live hash rates and detailed statistics"
    },
    {
        icon: Globe,
        title: "Global Mining Farms",
        description: "Access mining facilities in optimal locations worldwide for maximum efficiency"
    },
    {
        icon: Clock,
        title: "Withdrawals",
        description: "Request payouts from your Wallet when you have available balance; processing time and fees follow the live rules shown in the app."
    },
    {
        icon: Zap,
        title: "Advanced Technology",
        description: "Latest 2026 mining hardware with cutting-edge ASIC chips"
    },
    {
        icon: Users,
        title: "24/7 Support",
        description: "Our expert support team is available around the clock to assist you"
    }
];

const stats = [
    { value: "245.6 PH/s", label: "Total Hash Rate" },
    { value: "12,458+", label: "Active Miners" },
    { value: "$2.5M+", label: "Total Paid" },
    { value: "99.9%", label: "Uptime" }
];

export default function HowItWorksPage() {
    return (
        <div className="flex flex-col min-h-screen bg-[#050505]">
            <PublicHeader />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-950">
                    <div className="container px-4 mx-auto text-center">
                        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                            How <span className="text-orange-400">BTC Mining</span> Works
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
                            Start earning Bitcoin in 6 simple steps. Our platform makes mining accessible to everyone.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600">
                                <Link href="/register">Start Mining Now <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="border-orange-500/30 text-orange-400">
                                <Link href="/faq">View FAQ</Link>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Live Stats */}
                <section className="py-12 bg-slate-900/50 border-y border-orange-500/10">
                    <div className="container px-4 mx-auto">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {stats.map((stat, index) => (
                                <div key={index} className="text-center">
                                    <div className="text-3xl font-bold text-orange-400">{stat.value}</div>
                                    <div className="text-sm text-slate-400">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Steps */}
                <section className="py-20">
                    <div className="container px-4 mx-auto">
                        <h2 className="text-3xl font-bold text-white text-center mb-4">
                            Start Mining in 6 Easy Steps
                        </h2>
                        <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
                            From registration to earning Bitcoin, we've made the process simple and straightforward
                        </p>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {steps.map((step, index) => (
                                <Card key={index} className="bg-slate-900 border-slate-800 hover:border-orange-500/30 transition-colors group">
                                    <CardContent className="p-6">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4`}>
                                            <step.icon className="h-6 w-6 text-white" />
                                        </div>
                                        <div className="text-sm text-orange-400 font-medium mb-2">Step {step.number}</div>
                                        <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                                        <p className="text-slate-400 text-sm">{step.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="py-20 bg-slate-900/50">
                    <div className="container px-4 mx-auto">
                        <h2 className="text-3xl font-bold text-white text-center mb-4">
                            Why Choose Our Platform
                        </h2>
                        <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
                            Professional mining infrastructure with industry-leading features
                        </p>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {features.map((feature, index) => (
                                <Card key={index} className="bg-[#050505] border-slate-800">
                                    <CardContent className="p-6">
                                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
                                            <feature.icon className="h-6 w-6 text-orange-400" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                                        <p className="text-slate-400 text-sm">{feature.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Deposit tiers — same table as claims / activation (defaults; admin may override in app). */}
                <section className="py-20">
                    <div className="container px-4 mx-auto">
                        <h2 className="text-3xl font-bold text-white text-center mb-4">
                            Deposit tiers &amp; daily income %
                        </h2>
                        <p className="text-slate-400 text-center mb-4 max-w-2xl mx-auto">
                            Daily rate is a percentage of your principal in the active position. You claim once per UTC day. Same bands power the Invest page and earnings logic.
                        </p>
                        <p className="text-slate-500 text-center text-xs mb-10 max-w-xl mx-auto">
                            {RATES_ARE_DEFAULTS_DISCLAIMER.replace("Referrals page", "Invest or Settings")}
                        </p>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 max-w-7xl mx-auto">
                            {DEPOSIT_TIERS_FOR_DISPLAY.map((tier, idx) => {
                                const popular = idx === 2;
                                return (
                                    <Card
                                        key={tier.level}
                                        className={`relative bg-slate-900 border-slate-800 ${popular ? "border-orange-500/70 ring-1 ring-orange-500/30" : ""}`}
                                    >
                                        {popular && (
                                            <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 bg-orange-500 text-white text-xs px-3 py-1 rounded-full whitespace-nowrap">
                                                Popular band
                                            </div>
                                        )}
                                        <CardContent className="p-5 text-center pt-6">
                                            <div className="text-2xl mb-2">⛏️</div>
                                            <h3 className="text-lg font-bold text-white mb-1">Tier {tier.level}</h3>
                                            <div className="text-2xl font-bold text-orange-400 mb-1">
                                                ${tier.min.toLocaleString("en-US")} – ${tier.max.toLocaleString("en-US")}
                                            </div>
                                            <p className="text-slate-400 text-xs mb-4">USD principal range</p>
                                            <ul className="space-y-2 text-sm text-slate-400 mb-6 text-left">
                                                <li className="flex items-start gap-2">
                                                    <CheckCircle className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                                                    <span>{tier.incomePercent}% of principal per day (before claim)</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <CheckCircle className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                                                    <span>Daily claim on active investments</span>
                                                </li>
                                            </ul>
                                            <Button asChild className="w-full bg-orange-500 hover:bg-orange-600">
                                                <Link href="/invest">Open Invest</Link>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-20 bg-gradient-to-r from-orange-600 to-orange-700">
                    <div className="container px-4 mx-auto text-center">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Ready to Start Mining?
                        </h2>
                        <p className="text-orange-100 text-lg max-w-2xl mx-auto mb-8">
                            Join thousands of miners already earning Bitcoin with our professional platform.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button size="lg" variant="secondary" className="px-12 text-orange-600 font-bold" asChild>
                                <Link href="/register">Create Free Account</Link>
                            </Button>
                            <Button size="lg" variant="outline" className="px-12 border-white text-white hover:bg-white/10" asChild>
                                <Link href="/contact">Contact Us</Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </main>
            <PublicFooter />
        </div>
    );
}
