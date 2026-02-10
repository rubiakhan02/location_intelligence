'use client';

import React, { useState } from 'react';

interface HeroProps {
  onAnalyze: (city: string, sector: string) => void;
  isLoading: boolean;
}

export const Hero: React.FC<HeroProps> = ({ onAnalyze, isLoading }) => {
  const [city, setCity] = useState('');
  const [sector, setSector] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic updated to require BOTH city and sector
    if (sector.trim() && city.trim()) {
      onAnalyze(city.trim(), sector.trim());
    }
  };

  // Button is disabled if loading OR if either field is empty
  const isButtonDisabled = isLoading || !sector.trim() || !city.trim();

  return (
    <section id="home" className="pt-32 pb-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
            Location <span className="text-blue-600">Intelligence</span>
          </h1>
          <p className="text-slate-500 text-lg">Calculate Market Potential Factor for locations across <span className="font-bold text-slate-700">India</span>.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-4 md:p-6 rounded-2xl shadow-2xl border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="w-full relative">
            <label className="absolute -top-2.5 left-4 bg-white px-1 text-xs font-semibold text-slate-500">City (India)</label>
            <input 
              type="text" 
              placeholder="e.g. Mumbai, Bangalore"
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>
          <div className="w-full relative">
            <label className="absolute -top-2.5 left-4 bg-white px-1 text-xs font-semibold text-slate-500">Locality</label>
            <input 
              type="text" 
              placeholder="e.g. Whitefield, Bandra West"
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit"
            disabled={isButtonDisabled}
            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-xl shadow-emerald-200 whitespace-nowrap disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Analyzing...
              </>
            ) : (
              'Generate Score'
            )}
          </button>
        </form>
      </div>
    </section>
  );
};
