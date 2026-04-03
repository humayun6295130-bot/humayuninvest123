"use client";

import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { DEFAULT_REFERRAL_SETTINGS } from "@/lib/referral-system";
import {
    RATES_ARE_DEFAULTS_DISCLAIMER,
    REFERRAL_DAILY_CLAIM_SUMMARY,
} from "@/lib/public-platform-copy";

export default function TermsOfService() {
    return (
        <div className="flex flex-col min-h-screen bg-[#050505]">
            <PublicHeader />
            <main className="flex-1 py-12 md:py-24">
                <div className="max-w-4xl mx-auto px-4">
                    <h1 className="text-4xl font-bold mb-8 text-orange-400">Terms of Service</h1>
                    <div className="prose prose-lg max-w-none text-slate-300">
                        <p className="text-slate-400 mb-6">Last updated: March 24, 2026</p>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">1. Acceptance of Terms</h2>
                            <p className="text-slate-400">Welcome to BTCMine 2026 ("Platform", "we", "our", or "us"). By accessing or using our Bitcoin mining investment platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">2. Eligibility</h2>
                            <p className="text-slate-400 mb-4">To use our Platform, you must:</p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400">
                                <li>Be at least 18 years of age</li>
                                <li>Have full legal capacity to enter into binding contracts</li>
                                <li>Complete identity verification (KYC) as required</li>
                                <li>Not be a resident of restricted jurisdictions</li>
                                <li>Not be listed on any sanctions or watch lists</li>
                                <li>Have a valid cryptocurrency wallet compatible with BEP20 tokens</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">3. Account Registration</h2>
                            <p className="text-slate-400 mb-4">When creating an account, you agree to:</p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400">
                                <li>Provide accurate and complete information</li>
                                <li>Maintain the security of your account credentials</li>
                                <li>Promptly update any changes to your information</li>
                                <li>Accept responsibility for all activities under your account</li>
                                <li>Notify us immediately of any unauthorized access</li>
                                <li>Not share your account credentials with third parties</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">4. Investment Services</h2>
                            <p className="text-slate-400 mb-4">Our investment plans provide opportunities to earn returns based on BTC mining activities. By participating, you acknowledge that:</p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400">
                                <li>Returns are variable and not guaranteed</li>
                                <li>Past performance does not guarantee future results</li>
                                <li>All investments carry risk of partial or total loss</li>
                                <li>Minimum and maximum investment amounts apply per plan</li>
                                <li>Investment terms and durations are specified per plan</li>
                                <li>Daily earnings are calculated based on your investment level</li>
                                <li>Principal deposits may be locked based on plan type</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">5. Referral Program</h2>
                            <p className="text-slate-400 mb-4">Our referral program allows you to earn commissions by inviting others. By participating, you agree to:</p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400">
                                <li>Only refer individuals who have consented to be referred</li>
                                <li>Not engage in fraudulent referral activities</li>
                                <li>Not create multiple accounts to earn referral bonuses</li>
                                <li>Comply with applicable laws regarding referral marketing</li>
                                <li>Referral commissions are subject to verification of referred user's deposit</li>
                            </ul>
                            <p className="text-slate-400 mt-4">
                                <strong className="text-slate-300">Per-deposit lifetime commission (3 levels):</strong> commissions are calculated on each qualifying investment (plan) activation by the referred user, not on simple wallet top-ups that do not activate a plan. Each new qualifying deposit can generate payouts to up to three uplines again.
                            </p>
                            <p className="text-slate-400 mt-4">Default commission structure (percent of that activation amount; configurable in platform settings):</p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400">
                                <li>Level 1 (direct referrer): {DEFAULT_REFERRAL_SETTINGS.level1_percent}%</li>
                                <li>Level 2 (next upline): {DEFAULT_REFERRAL_SETTINGS.level2_percent}%</li>
                                <li>Level 3 (third upline): {DEFAULT_REFERRAL_SETTINGS.level3_percent}%</li>
                            </ul>
                            <p className="text-slate-400 mt-4">
                                <strong className="text-slate-300">Daily profit claim (optional second stream):</strong>{" "}
                                {REFERRAL_DAILY_CLAIM_SUMMARY}
                            </p>
                            <p className="text-slate-500 text-sm mt-3">{RATES_ARE_DEFAULTS_DISCLAIMER}</p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">6. Deposits and Withdrawals</h2>
                            <p className="text-slate-400 mb-4">All transactions are conducted via cryptocurrency on the BNB Smart Chain (BEP20):</p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400">
                                <li>Only USDT (BEP20) deposits are accepted</li>
                                <li>Minimum deposit and withdrawal amounts apply</li>
                                <li>All withdrawals require admin approval</li>
                                <li>Withdrawal processing time: 24-72 hours</li>
                                <li>8% withdrawal fee applies to all withdrawals</li>
                                <li>Minimum withdrawal amount: $50</li>
                                <li>Principal deposits may be locked based on investment level</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">7. Risk Disclosure</h2>
                            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                                <p className="text-red-400 font-semibold mb-2">IMPORTANT RISK WARNING:</p>
                                <ul className="list-disc pl-6 space-y-2 text-slate-300">
                                    <li>All investments carry risk of loss</li>
                                    <li>Cryptocurrency investments are highly volatile</li>
                                    <li>Returns are not guaranteed</li>
                                    <li>Your entire investment could be lost</li>
                                    <li>Past performance does not guarantee future results</li>
                                    <li>You should only invest what you can afford to lose</li>
                                    <li>We are not a financial advisor - seek independent advice</li>
                                </ul>
                            </div>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">8. Prohibited Activities</h2>
                            <p className="text-slate-400 mb-4">You agree not to:</p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400">
                                <li>Engage in money laundering or terrorist financing</li>
                                <li>Use the Platform for illegal purposes</li>
                                <li>Attempt to hack, reverse engineer, or compromise the Platform</li>
                                <li>Create multiple accounts to abuse referral programs</li>
                                <li>Engage in fraudulent transactions</li>
                                <li>Harass, threaten, or abuse other users or staff</li>
                                <li>Violate any applicable laws or regulations</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">9. KYC and Compliance</h2>
                            <p className="text-slate-400 mb-4">To comply with anti-money laundering (AML) regulations:</p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400">
                                <li>All users must complete KYC verification</li>
                                <li>We may request additional documentation at any time</li>
                                <li>We may freeze or terminate accounts that fail KYC</li>
                                <li>Account verification is required for withdrawals</li>
                                <li>We report suspicious activities to relevant authorities</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">10. Limitation of Liability</h2>
                            <p className="text-slate-400">To the maximum extent permitted by law:</p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400 mt-2">
                                <li>The Platform is provided "as is" without warranties</li>
                                <li>We do not guarantee uninterrupted service</li>
                                <li>We are not liable for any losses arising from Platform use</li>
                                <li>We are not liable for third-party actions or omissions</li>
                                <li>Liability is limited to the amount you have invested</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">11. Intellectual Property</h2>
                            <p className="text-slate-400">All content, designs, logos, and materials on this Platform are our intellectual property. You may not copy, reproduce, or distribute our materials without explicit permission.</p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">12. Termination</h2>
                            <p className="text-slate-400 mb-4">We may terminate or suspend your account if:</p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-400">
                                <li>You violate these Terms of Service</li>
                                <li>You engage in fraudulent activity</li>
                                <li>You fail to complete KYC verification</li>
                                <li>Law enforcement requests termination</li>
                                <li>You request account closure (subject to verification)</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">13. Dispute Resolution</h2>
                            <p className="text-slate-400">Any disputes arising from these terms will be resolved through:</p>
                            <ol className="list-decimal pl-6 space-y-2 text-slate-400 mt-2">
                                <li>Good faith negotiation between parties</li>
                                <li>Mediation by a mutually agreed mediator</li>
                                <li>Binding arbitration under applicable laws</li>
                            </ol>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">14. Changes to Terms</h2>
                            <p className="text-slate-400">We reserve the right to modify these terms at any time. Significant changes will be notified via email or platform notification. Continued use after changes constitutes acceptance.</p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold mb-4 text-white">15. Contact Information</h2>
                            <p className="text-slate-400 mb-2">For questions about these Terms of Service, contact us:</p>
                            <p className="text-orange-400">Email: legal@btcmine2026.com</p>
                            <p className="text-orange-400">Support: support@btcmine2026.com</p>
                            <p className="text-orange-400">Address: 123 Financial District, Suite 500, New York, NY 10004</p>
                        </section>
                    </div>
                </div>
            </main>
            <PublicFooter />
        </div>
    );
}
