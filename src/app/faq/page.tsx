"use client";

import { useState } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Search, Bitcoin, Wallet, Shield, Users, Zap, Clock, TrendingUp } from "lucide-react";

const faqCategories = [
    {
        name: "Getting Started",
        icon: Zap,
        questions: [
            {
                q: "What is BTCMine 2026?",
                a: "BTCMine 2026 is a professional Bitcoin mining investment platform that allows users to invest in our advanced mining infrastructure and earn daily BTC rewards. We operate state-of-the-art mining facilities with the latest 2026 mining technology."
            },
            {
                q: "How do I start mining?",
                a: "Simply create an account, choose an investment plan that suits your budget, and make a deposit in USDT (BEP-20 on BNB Smart Chain). Our mining infrastructure will start generating Bitcoin rewards immediately after your payment is confirmed."
            },
            {
                q: "What is the minimum investment amount?",
                a: "The minimum investment starts at $100 USDT for our Starter plan. We offer various plans ranging from $100 to $10,000+ to accommodate different investment levels."
            }
        ]
    },
    {
        name: "Payments & Wallets",
        icon: Wallet,
        questions: [
            {
                q: "Which cryptocurrencies do you accept?",
                a: "We primarily accept USDT (BEP-20 on BNB Smart Chain) for all deposits and withdrawals. This ensures fast transaction times and low fees. All payments are processed securely through our automated system."
            },
            {
                q: "How long do deposits take to confirm?",
                a: "USDT deposits are typically confirmed within 5-15 minutes on the BNB Smart Chain. Once confirmed, your mining plan activates automatically and you start earning rewards."
            },
            {
                q: "How do I withdraw my earnings?",
                a: "You can withdraw your accumulated Bitcoin earnings at any time. Go to your wallet section, click withdraw, enter your BEP-20 wallet address (BNB Smart Chain), and confirm. Withdrawals are processed within 24-48 hours."
            },
            {
                q: "Are there any deposit or withdrawal fees?",
                a: "We don't charge any deposit fees. Withdrawal fees are minimal and cover only the blockchain network transaction costs. All fee information is transparently displayed before confirming any transaction."
            }
        ]
    },
    {
        name: "Mining & Rewards",
        icon: TrendingUp,
        questions: [
            {
                q: "How are daily rewards calculated?",
                a: "Daily rewards are calculated based on your mining hash rate and the current Bitcoin network difficulty. Our automated system calculates and distributes rewards every 24 hours directly to your account balance."
            },
            {
                q: "What is the daily return rate?",
                a: "Return rates vary by investment level: Starter ($30-$250): 1.5% daily, Silver ($251-$500): 2% daily, Gold ($501-$1000): 2.5% daily, Platinum ($1001-$2500): 3.1% daily, Diamond ($5000+): 4% daily. Returns are accumulated daily and can be withdrawn as profit."
            },
            {
                q: "How does the mining pool work?",
                a: "We operate a collective mining pool where all investors combine their hash power. This increases efficiency and provides more consistent rewards compared to solo mining. Your share is proportional to your investment."
            },
            {
                q: "Can I reinvest my earnings?",
                a: "Yes! You can reinvest your accumulated earnings to increase your hash rate and earn more. This compounds your returns over time."
            }
        ]
    },
    {
        name: "Security",
        icon: Shield,
        questions: [
            {
                q: "Is my investment safe?",
                a: "We implement enterprise-grade security measures including cold storage for funds, multi-signature wallets, SSL encryption, and regular security audits. Your investments are protected by our secure infrastructure."
            },
            {
                q: "How is my personal information protected?",
                a: "We use bank-level encryption and follow strict data protection protocols. Your personal and financial information is never shared with third parties without your consent."
            },
            {
                q: "Do you offer two-factor authentication?",
                a: "Yes, we highly recommend enabling 2FA for your account. You can set up 2FA using Google Authenticator or similar apps for an extra layer of security."
            },
            {
                q: "What happens if there's a security breach?",
                a: "We maintain a security reserve fund to cover any unlikely security incidents. Our team works around the clock to monitor and protect our systems."
            }
        ]
    },
    {
        name: "Referral Program",
        icon: Users,
        questions: [
            {
                q: "How does the referral program work?",
                a: "Share your unique referral link with friends and earn commissions on their investments. You earn 5% on level 1 referrals, 4% on level 2, and 3% on level 3. The more you refer, the more you earn!"
            },
            {
                q: "When do I receive referral commissions?",
                a: "Commissions are credited to your account immediately when your referral makes a deposit. You can withdraw these earnings anytime."
            },
            {
                q: "Is there a limit on referrals?",
                a: "There's no limit on how many people you can refer. The more active referrals you have, the higher your potential earnings. Plus, reach certain milestones to unlock higher commission tiers!"
            }
        ]
    },
    {
        name: "Support",
        icon: Clock,
        questions: [
            {
                q: "How can I contact support?",
                a: "You can reach our support team via email at support@btcmine2026.com, through the contact form on our website, or through live chat. We typically respond within 24 hours."
            },
            {
                q: "What are your support hours?",
                a: "Our support team is available 24/7 to assist you with any questions or issues. For urgent matters, we have priority support for Enterprise plan members."
            },
            {
                q: "Is there a mobile app?",
                a: "Currently, we offer a fully responsive web platform that works seamlessly on mobile devices through your browser. A dedicated mobile app is coming soon!"
            }
        ]
    }
];

export default function FAQPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [openQuestions, setOpenQuestions] = useState<Set<string>>(new Set());

    const toggleQuestion = (id: string) => {
        const newOpen = new Set(openQuestions);
        if (newOpen.has(id)) {
            newOpen.delete(id);
        } else {
            newOpen.add(id);
        }
        setOpenQuestions(newOpen);
    };

    const filteredFAQs = faqCategories.map(category => ({
        ...category,
        questions: category.questions.filter(
            q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                q.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(category => category.questions.length > 0);

    return (
        <div className="flex flex-col min-h-screen bg-[#050505]">
            <PublicHeader />
            <main className="flex-1 py-12 md:py-24">
                <div className="container px-4 mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                            Frequently Asked <span className="text-orange-400">Questions</span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                            Find answers to common questions about our Bitcoin mining platform
                        </p>
                    </div>

                    {/* Search */}
                    <div className="max-w-xl mx-auto mb-12">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search for answers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                            />
                        </div>
                    </div>

                    {/* FAQ Categories */}
                    <div className="space-y-8 max-w-4xl mx-auto">
                        {filteredFAQs.map((category, catIndex) => (
                            <div key={catIndex}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-orange-500/20 rounded-lg">
                                        <category.icon className="h-5 w-5 text-orange-400" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-white">{category.name}</h2>
                                </div>
                                <div className="space-y-3">
                                    {category.questions.map((q, qIndex) => {
                                        const id = `${catIndex}-${qIndex}`;
                                        const isOpen = openQuestions.has(id);
                                        return (
                                            <Card key={qIndex} className="bg-slate-900 border-slate-800">
                                                <CardContent className="p-0">
                                                    <button
                                                        onClick={() => toggleQuestion(id)}
                                                        className="w-full p-4 flex items-center justify-between text-left"
                                                    >
                                                        <span className="font-medium text-white pr-4">{q.q}</span>
                                                        {isOpen ? (
                                                            <ChevronUp className="h-5 w-5 text-orange-400 flex-shrink-0" />
                                                        ) : (
                                                            <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                                        )}
                                                    </button>
                                                    {isOpen && (
                                                        <div className="px-4 pb-4 pt-0">
                                                            <p className="text-slate-400 leading-relaxed">{q.a}</p>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredFAQs.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-slate-400">No results found for "{searchQuery}"</p>
                        </div>
                    )}

                    {/* Contact CTA */}
                    <div className="mt-16 text-center">
                        <div className="inline-block p-8 bg-gradient-to-br from-orange-500/20 to-slate-900 rounded-2xl border border-orange-500/20">
                            <h3 className="text-xl font-semibold text-white mb-2">Still have questions?</h3>
                            <p className="text-slate-400 mb-4">Can't find the answer you're looking for? Our support team is here to help.</p>
                            <a
                                href="/contact"
                                className="inline-flex items-center justify-center px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Contact Support
                            </a>
                        </div>
                    </div>
                </div>
            </main>
            <PublicFooter />
        </div>
    );
}
