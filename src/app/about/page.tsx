
"use client";

import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { ShieldCheck, Target, Users, Landmark } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-1">
        <section className="py-20 bg-primary/5">
          <div className="container px-4 mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">Our Mission</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We believe transparent investment tools and clear earnings should be accessible to everyone. Our platform is built to help you manage deposits, track performance, and grow with confidence.
            </p>
          </div>
        </section>

        <section className="py-24">
          <div className="container px-4 mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">Our story</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    We started with a simple goal: make crypto and on-chain investing easier to understand and safer to use. Investors told us they wanted one place to see plans, earnings, and withdrawals without confusion.
                  </p>
                  <p>
                    Today we focus on secure workflows, clear statements, and support when you need it—so you always know what moved in your account and why.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-card border rounded-2xl shadow-sm flex flex-col items-center text-center">
                  <Users className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-bold text-lg">150k+</h3>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
                <div className="p-6 bg-card border rounded-2xl shadow-sm flex flex-col items-center text-center">
                  <Landmark className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-bold text-lg">$2B+</h3>
                  <p className="text-sm text-muted-foreground">Assets Tracked</p>
                </div>
                <div className="p-6 bg-card border rounded-2xl shadow-sm flex flex-col items-center text-center">
                  <ShieldCheck className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-bold text-lg">100%</h3>
                  <p className="text-sm text-muted-foreground">Secure Tech</p>
                </div>
                <div className="p-6 bg-card border rounded-2xl shadow-sm flex flex-col items-center text-center">
                  <Target className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-bold text-lg">Global</h3>
                  <p className="text-sm text-muted-foreground">Market Reach</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-muted/30">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold">Our Core Values</h2>
              <p className="text-muted-foreground">The principles that drive every feature we build.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-8 bg-background rounded-3xl border shadow-sm">
                <h4 className="text-xl font-bold mb-4">Transparency</h4>
                <p className="text-muted-foreground">No hidden fees, no complex jargon. We provide clear data so you can see exactly where your money is.</p>
              </div>
              <div className="p-8 bg-background rounded-3xl border shadow-sm">
                <h4 className="text-xl font-bold mb-4">Security First</h4>
                <p className="text-muted-foreground">Your financial data is private. We use industry-leading encryption to ensure your portfolio stays yours.</p>
              </div>
              <div className="p-8 bg-background rounded-3xl border shadow-sm">
                <h4 className="text-xl font-bold mb-4">User Empowerment</h4>
                <p className="text-muted-foreground">We don't just show numbers; we give you the tools to analyze them and grow your wealth sustainably.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
