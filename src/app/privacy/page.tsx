"use client";

import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

export default function PrivacyPolicy() {
    return (
        <div className="flex flex-col min-h-screen bg-[#050505]">
            <PublicHeader />
            <main className="flex-1 py-12 md:py-24">
                <div className="max-w-4xl mx-auto px-4">
                    <h1 className="text-4xl font-bold mb-8 text-orange-400">Privacy Policy</h1>
                    <div className="prose prose-lg max-w-none text-slate-300">
                        <p className="text-slate-400 mb-6">Last updated: March 11, 2026</p>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">1. Introduction</h2>
                            <p className="text-slate-400">BTCMine 2026 ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Bitcoin mining investment platform.</p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">2. Information We Collect</h2>
                            <h3 className="text-xl font-medium mb-2 text-white">2.1 Personal Information</h3>
                            <ul className="list-disc pl-6 mb-4 space-y-2 text-slate-400">
                                <li>Name, email address, and contact information</li>
                                <li>Account credentials and authentication data</li>
                                <li>Financial information for transactions</li>
                                <li>KYC documents (ID, passport, etc.)</li>
                                <li>IP address and device information</li>
                                <li>Wallet addresses for cryptocurrency transactions</li>
                            </ul>

                            <h3 className="text-xl font-medium mb-2 text-white">2.2 Usage Data</h3>
                            <ul className="list-disc pl-6 mb-4 space-y-2 text-slate-400">
                                <li>Mining activity and investment data</li>
                                <li>Transaction history</li>
                                <li>Platform usage patterns</li>
                                <li>Communication records</li>
                                <li>Referral network data</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">3. How We Use Your Information</h2>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400">
                                <li>Provide and maintain our Bitcoin mining services</li>
                                <li>Process transactions and mining investments</li>
                                <li>Verify identity and comply with KYC/AML regulations</li>
                                <li>Calculate and distribute mining rewards</li>
                                <li>Manage referral program and commissions</li>
                                <li>Communicate with you about your account</li>
                                <li>Improve our platform and user experience</li>
                                <li>Detect and prevent fraud or illegal activities</li>
                                <li>Comply with legal obligations</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">4. Information Sharing</h2>
                            <p className="mb-4 text-slate-400">We may share your information with:</p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400">
                                <li><strong className="text-white">Service Providers:</strong> Payment processors, cloud storage, and security services</li>
                                <li><strong className="text-white">Blockchain Networks:</strong> For transaction verification on BNB Smart Chain (BEP20)</li>
                                <li><strong className="text-white">Legal Authorities:</strong> When required by law or to protect our rights</li>
                                <li><strong className="text-white">Business Partners:</strong> With your consent for specific services</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">5. Cryptocurrency Transactions</h2>
                            <p className="text-slate-400 mb-4">By using our platform, you acknowledge that:</p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400">
                                <li>All cryptocurrency transactions are recorded on respective blockchain networks</li>
                                <li>Transaction hashes are stored for verification purposes</li>
                                <li>Wallet addresses are stored for payment processing</li>
                                <li>Once confirmed, transactions cannot be reversed</li>
                                <li>You are responsible for verifying wallet addresses before sending funds</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">6. Data Security</h2>
                            <p className="text-slate-400">We implement industry-standard security measures including:</p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400 mt-2">
                                <li>SSL/TLS encryption for all data transmission</li>
                                <li>Cold storage for cryptocurrency funds</li>
                                <li>Multi-signature wallet security</li>
                                <li>Two-factor authentication (2FA)</li>
                                <li>Regular security audits</li>
                                <li>Secure cloud infrastructure</li>
                            </ul>
                            <p className="text-slate-400 mt-4">However, no internet transmission is 100% secure, and we cannot guarantee absolute security.</p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">7. Your Rights</h2>
                            <p className="mb-4 text-slate-400">You have the right to:</p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400">
                                <li>Access your personal information</li>
                                <li>Request correction of inaccurate data</li>
                                <li>Request deletion of your data</li>
                                <li>Export your data in a portable format</li>
                                <li>Opt-out of marketing communications</li>
                                <li>Withdraw consent where applicable</li>
                                <li>Request account closure</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">8. Data Retention</h2>
                            <p className="text-slate-400">We retain your information for as long as necessary to provide services and comply with legal obligations. Financial records are retained for 7 years as required by law. Account data is retained until you request deletion.</p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">9. Cookies and Tracking</h2>
                            <p className="text-slate-400">We use cookies and similar tracking technologies to:</p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400 mt-2">
                                <li>Keep you logged in</li>
                                <li>Remember your preferences</li>
                                <li>Analyze platform traffic</li>
                                <li>Improve our services</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">10. Third-Party Links</h2>
                            <p className="text-slate-400">Our platform may contain links to third-party websites. We are not responsible for the privacy practices of these external sites.</p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">11. Changes to This Policy</h2>
                            <p className="text-slate-400">We may update this Privacy Policy periodically. We will notify you of significant changes via email or platform notifications.</p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">12. Contact Us</h2>
                            <p className="text-slate-400 mb-2">If you have questions about this Privacy Policy, please contact us at:</p>
                            <p className="mt-2 text-orange-400">Email: privacy@btcmine2026.com</p>
                            <p className="text-orange-400">Support: support@btcmine2026.com</p>
                        </section>
                    </div>
                </div>
            </main>
            <PublicFooter />
        </div>
    );
}
