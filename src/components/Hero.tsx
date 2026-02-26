import React from 'react';
import { TrendingUp, ArrowRight, BarChart3, ShieldCheck } from 'lucide-react';

interface HeroProps {
  setView: (view: 'home' | 'dashboard' | 'plans') => void;
}

const Hero: React.FC<HeroProps> = ({ setView }) => {
  return (
    <section className="relative overflow-hidden py-20 px-4">
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-sky-100 rounded-full blur-3xl opacity-50" />
      
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div className="relative z-10 text-left">
          <div className="flex items-center gap-2 text-blue-700 font-semibold mb-4 bg-blue-50 w-fit px-3 py-1 rounded-full text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            Live Market Updates
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-[1.1] mb-6">
            Invest Smarter,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-800 to-sky-500">Grow Faster.</span>
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-lg">
            Track all your investments in one place. Real-time data, expert analytics, and a seamless experience designed for your financial freedom.
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => setView('dashboard')}
              className="bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition-all flex items-center gap-2 shadow-lg"
            >
              Start Investing <ArrowRight size={20} />
            </button>
            <button 
              onClick={() => setView('plans')}
              className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all"
            >
              View Plans
            </button>
          </div>
          
          <div className="mt-10 flex items-center gap-8 opacity-70 grayscale contrast-125">
            <div className="flex items-center gap-2 font-semibold"><ShieldCheck /> SECURED</div>
            <div className="flex items-center gap-2 font-semibold"><BarChart3 /> ANALYTICS</div>
            <div className="flex items-center gap-2 font-semibold"><TrendingUp /> PROFITS</div>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div className="relative bg-white rounded-3xl shadow-2xl p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-xl">My Portfolio</h3>
              <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">+12.5%</div>
            </div>
            <div className="space-y-4">
              {[
                { name: 'Apple Inc.', sym: 'AAPL', price: '$189.45', change: '+1.2%' },
                { name: 'Bitcoin', sym: 'BTC', price: '$68,432.10', change: '+3.4%' },
                { name: 'Ethereum', sym: 'ETH', price: '$3,541.25', change: '-0.8%' },
              ].map((stock, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600">
                      {stock.sym[0]}
                    </div>
                    <div>
                      <div className="font-bold">{stock.name}</div>
                      <div className="text-xs text-slate-400">{stock.sym}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{stock.price}</div>
                    <div className={`text-xs ${stock.change.includes('+') ? 'text-green-500' : 'text-red-500'}`}>
                      {stock.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Decorative floating card */}
          <div className="absolute -bottom-6 -left-6 bg-blue-700 text-white p-6 rounded-2xl shadow-xl animate-bounce-slow">
            <div className="text-sm opacity-80 mb-1">Weekly Profit</div>
            <div className="text-2xl font-bold">+$2,450.00</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
