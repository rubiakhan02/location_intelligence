
import React from 'react';

export const HowItWorks: React.FC = () => {
  const steps = [
    { title: "Input Location", desc: "Enter any city and locality to begin the analysis." },
    { title: "Data Processing", desc: "Our engine analyzes thousands of data points for infra & connectivity." },
    { title: "Get Insights", desc: "Instantly receive a Market Potential Factor (MPF) score and report." }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-slate-900 text-white rounded-3xl mx-4 my-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-slate-400 max-w-xl mx-auto">Three simple steps to unlock deep location intelligence for your property needs.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {steps.map((step, idx) => (
            <div key={idx} className="relative text-center group">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl font-black mx-auto mb-6 group-hover:rotate-6 transition-transform">
                {idx + 1}
              </div>
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-slate-400 leading-relaxed">{step.desc}</p>
              {idx < 2 && <div className="hidden lg:block absolute top-8 -right-6 w-12 h-px bg-slate-700"></div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const UseCases: React.FC = () => {
  const cases = [
    { title: "Developers", icon: "🏗️", desc: "Evaluate site potential before acquisition or project planning." },
    { title: "Investors", icon: "💰", desc: "Identify high-growth corridors for maximum ROI on capital." },
    { title: "Brokers", icon: "🤝", desc: "Back your sales pitch with data-backed infrastructure reports." },
    { title: "Home Buyers", icon: "🏡", desc: "Ensure your future home is surrounded by top-tier amenities." },
    { title: "Channel Partners", icon: "📈", desc: "Communicate market potential factors effectively to clients." }
  ];

  return (
    <section id="use-cases" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Empowering the Ecosystem</h2>
            <p className="text-slate-600">Built for every stakeholder in the real estate lifecycle, providing transparency and data-driven confidence.</p>
          </div>
          <button className="text-blue-600 font-bold hover:underline flex items-center gap-2">
            View All Insights
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {cases.map((c, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-50 transition-all cursor-default">
              <span className="text-4xl block mb-6">{c.icon}</span>
              <h3 className="font-bold text-slate-900 mb-2">{c.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
