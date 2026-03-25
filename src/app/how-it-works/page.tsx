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
        description: "Select a mining plan that fits your budget. Plans start from just $100.",
        icon: Wallet,
        color: "from-purple-500 to-purple-600"
    },
    {
        number: 3,
        title: "Make Deposit",
        description: "Send USDT (TRC-20) to our secure wallet address. QR code available for easy payment.",
        icon: Bitcoin,
        color: "from-orange-500 to-orange-600"
    },
    {
        number: 4,
        title: "Start Mining",
        description: "Your hash rate activates immediately. Watch your Bitcoin balance grow daily!",
        icon: Server,
        color: "from-green-500 to-green-600"
    },
    {
        number: 5,
        title: "Earn Rewards",
        description: "Receive daily BTC rewards directly to your wallet. Withdraw anytime.",
        icon: TrendingUp,
        color: "from-yellow-500 to-yellow-600"
    },
    {
        number: 6,
        title: "Refer & Earn More",
        description: "Invite friends and earn additional commissions up to 5% on their investments.",
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
        title: "Instant Payouts",
        description: "Withdraw your earnings anytime with fast processing within 24-48 hours"
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

                {/* Investment Plans */}
                <section className="py-20">
                    <div className="container px-4 mx-auto">
                        <h2 className="text-3xl font-bold text-white text-center mb-4">
                            Investment Plans
                        </h2>
                        <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
                            Choose the plan that fits your investment goals
                        </p>

                        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                            <Card className="bg-slate-900 border-slate-800">
                                <CardContent className="p-6 text-center">
                                    <div className="text-2xl mb-2">⛏️</div>
                                    <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
                                    <div className="text-3xl font-bold text-orange-400 mb-2">$100</div>
                                    <p className="text-slate-400 text-sm mb-4">Minimum</p>
                                    <ul className="space-y-2 text-sm text-slate-400 mb-6">
                                        <li className="flex items-center justify-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-400" /> 10 TH/s Hash Rate
                                        </li>
                                        <li className="flex items-center justify-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-400" /> 1% Daily Returns
                                        </li>
                                        <li className="flex items-center justify-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-400" /> 30 Days Duration
                                        </li>
                                    </ul>
                                    <Button asChild className="w-full bg-orange-500 hover:bg-orange-600">
                                        <Link href="/register">Get Started</Link>
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-b from-orange-500/20 to-slate-900 border-orange-500">
                                <CardContent className="p-6 text-center">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs px-3 py-1 rounded-full">
                                        Popular
                                    </div>
                                    <div className="text-2xl mb-2">💰</div>
                                    <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
                                    <div className="text-3xl font-bold text-orange-400 mb-2">$1,000</div>
                                    <p className="text-slate-400 text-sm mb-4">Best Value</p>
                                    <ul className="space-y-2 text-sm text-slate-400 mb-6">
                                        <li className="flex items-center justify-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-400" /> 100 TH/s Hash Rate
                                        </li>
                                        <li className="flex items-center justify-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-400" /> 1.5% Daily Returns
                                        </li>
                                        <li className="flex items-center justify-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-400" /> 60 Days Duration
                                        </li>
                                    </ul>
                                    <Button asChild className="w-full bg-orange-500 hover:bg-orange-600">
                                        <Link href="/register">Get Started</Link>
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-900 border-slate-800">
                                <CardContent className="p-6 text-center">
                                    <div className="text-2xl mb-2">👑</div>
                                    <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
                                    <div className="text-3xl font-bold text-orange-400 mb-2">$10,000</div>
                                    <p className="text-slate-400 text-sm mb-4">Maximum Returns</p>
                                    <ul className="space-y-2 text-sm text-slate-400 mb-6">
                                        <li className="flex items-center justify-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-400" /> 1 PH/s Hash Rate
                                        </li>
                                        <li className="flex items-center justify-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-400" /> 2% Daily Returns
                                        </li>
                                        <li className="flex items-center justify-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-400" /> 90 Days Duration
                                        </li>
                                    </ul>
                                    <Button asChild className="w-full bg-orange-500 hover:bg-orange-600">
                                        <Link href="/register">Get Started</Link>
                                    </Button>
                                </CardContent>
                            </Card>
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
