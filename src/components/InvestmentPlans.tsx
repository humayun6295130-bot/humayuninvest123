import React from 'react';
import { Check, Shield, Zap, Award } from 'lucide-react';

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "Begin your investment journey.",
    features: ["Track up to 5 assets", "Basic market analysis", "Daily updates", "Email support"],
    icon: <Shield className="text-blue-600" size={24} />,
    color: "bg-blue-50",
    button: "Get Started"
  },
  {
    name: "Growth",
    price: "$19",
    period: "/mo",
    description: "For active investors seeking growth.",
    features: ["Unlimited assets", "Real-time alerts", "Custom portfolios", "Priority support", "Tax reporting"],
    icon: <Zap className="text-sky-500" size={24} />,
    color: "bg-sky-50",
    button: "Start Free Trial",
    popular: true
  },
  {
    name: "Elite",
    price: "$49",
    period: "/mo",
    description: "Maximum tools for maximum returns.",
    features: ["Everything in Growth", "AI Insights engine", "Dedicated manager", "Early access features", "Institutional data"],
    icon: <Award className="text-indigo-600" size={24} />,
    color: "bg-indigo-50",
    button: "Go Pro"
  }
];

const InvestmentPlans = () => {
  return (
    <div className="bg-[#EBEFF6] min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-blue-900 mb-4">Choose Your Path to Wealth</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Select the plan that best fits your financial goals. Upgrade or downgrade at any time.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`relative bg-white rounded-3xl p-8 shadow-sm border-2 ${plan.popular ? 'border-blue-600' : 'border-transparent'} transition-transform hover:-translate-y-2`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                  MOST POPULAR
                </div>
              )}
              
              <div className={`${plan.color} w-12 h-12 rounded-xl flex items-center justify-center mb-6`}>
                {plan.icon}
              </div>
              
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
              <p className="text-slate-500 mb-6 text-sm">{plan.description}</p>
              
              <div className="flex items-baseline mb-8">
                <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                <span className="text-slate-500 ml-1">{plan.period}</span>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex} className="flex items-center gap-3 text-slate-600 text-sm">
                    <div className="bg-green-100 p-0.5 rounded-full text-green-600">
                      <Check size={14} />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              <button className={`w-full py-4 rounded-xl font-bold transition-all ${plan.popular ? 'bg-blue-700 text-white shadow-lg hover:bg-blue-800' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}>
                {plan.button}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InvestmentPlans;
