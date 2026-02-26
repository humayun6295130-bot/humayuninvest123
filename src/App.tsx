import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Dashboard from './components/Dashboard';
import InvestmentPlans from './components/InvestmentPlans';
import Footer from './components/Footer';

function App() {
  const [view, setView] = useState<'home' | 'dashboard' | 'plans'>('home');

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar setView={setView} currentView={view} />
      
      <main className="flex-grow pt-16">
        {view === 'home' && (
          <>
            <Hero setView={setView} />
            <section className="py-16 px-4 max-w-7xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">The Smarter Way to Grow Wealth</h2>
              <p className="text-slate-600 max-w-2xl mx-auto mb-12">
                Join thousands of users who trust AscendFolio to manage their assets, track real-time performance, and discover new opportunities.
              </p>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { title: "Real-time Tracking", desc: "Monitor your stocks and crypto with live price updates.", icon: "📈" },
                  { title: "Smart Analytics", desc: "Analyze your portfolio's performance with intuitive charts.", icon: "📊" },
                  { title: "Bank-Grade Security", desc: "Your data is encrypted and protected with top-tier security.", icon: "🛡️" }
                ].map((feature, i) => (
                  <div key={i} className="p-8 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-4xl mb-4">{feature.icon}</div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-slate-500">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {view === 'dashboard' && <Dashboard />}
        {view === 'plans' && <InvestmentPlans />}
      </main>

      <Footer />
    </div>
  );
}

export default App;
