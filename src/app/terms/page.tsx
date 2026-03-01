export default function TermsOfService() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4">
            <h1 className="text-4xl font-bold mb-8 text-[#334C99]">Terms of Service</h1>
            <div className="prose prose-lg max-w-none">
                <p className="text-muted-foreground mb-6">Last updated: March 1, 2026</p>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
                    <p>By accessing or using AscendFolio ("Platform"), you agree to be bound by these Terms of Service. If you do not agree, you may not use our services.</p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">2. Eligibility</h2>
                    <p className="mb-4">To use our Platform, you must:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Be at least 18 years old</li>
                        <li>Have legal capacity to enter into contracts</li>
                        <li>Complete identity verification (KYC)</li>
                        <li>Not be a resident of restricted jurisdictions</li>
                        <li>Not be on any sanctions or watch lists</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
                    <p className="mb-4">When creating an account, you agree to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Provide accurate and complete information</li>
                        <li>Maintain the security of your account credentials</li>
                        <li>Promptly update any changes to your information</li>
                        <li>Accept responsibility for all activities under your account</li>
                        <li>Notify us immediately of any unauthorized access</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">4. Investment Services</h2>
                    <p className="mb-4">Our investment plans are subject to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Returns are not guaranteed and past performance does not guarantee future results</li>
                        <li>All investments carry risk of loss</li>
                        <li>Minimum and maximum investment amounts apply</li>
                        <li>Investment terms and durations are specified per plan</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">5. Risk Disclaimer</h2>
                    <p className="mb-4 font-medium">INVESTMENT RISKS:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>All investments carry risk of loss</li>
                        <li>Returns are not guaranteed</li>
                        <li>Your capital is at risk</li>
                        <li>Invest only what you can afford to lose</li>
                        <li>Seek independent financial advice if needed</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">6. Contact Information</h2>
                    <p>For questions about these Terms of Service, contact us at:</p>
                    <p className="mt-2">Email: legal@ascendfolio.com</p>
                </section>
            </div>
        </div>
    );
}
