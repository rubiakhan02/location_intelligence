'use client';

import React, { useState, useRef } from 'react';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { ScoreDisplay } from '../components/ScoreDisplay';
import { InfrastructureList } from '../components/InfrastructureList';
import { DemoMap } from '../components/DemoMap';
import { HowItWorks, UseCases } from '../components/Features';
import { Footer } from '../components/Footer';
import { LocationAnalysis } from '../types';
import { analyzeLocation, getCityMatches } from '../services/locationService';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<LocationAnalysis | null>(null);
  const [ambiguousCities, setAmbiguousCities] = useState<string[] | null>(null);
  const [lastQuery, setLastQuery] = useState<{ city: string; sector: string } | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = async (city: string, sector: string) => {
    setLoading(true);
    setAmbiguousCities(null);
    setAnalysis(null);
    setLastQuery({ city, sector });

    try {
      // Step 1: Detect ambiguity
      const { isAmbiguous, suggestedCities } = await getCityMatches(city, sector);

      if (isAmbiguous && suggestedCities.length > 1) {
        setAmbiguousCities(suggestedCities);
        setLoading(false);
        return;
      }

      // Step 2: Proceed with analysis if specific enough
      const result = await analyzeLocation(city, sector);
      setAnalysis(result);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error("Failed to analyze location", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCitySelection = (selectedCity: string) => {
    if (lastQuery) {
      handleAnalyze(selectedCity, lastQuery.sector);
    }
  };

  const getResultHeading = () => {
    if (!analysis) return null;
    if (analysis.sector && analysis.city && analysis.sector !== 'Metropolitan Area') {
      return (
        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          Analysis for {analysis.sector}, <span className="text-blue-600">{analysis.city}</span>
        </h2>
      );
    }
    return (
      <h2 className="text-3xl font-bold text-slate-900 mb-2">
        Analysis for <span className="text-blue-600">{analysis.city || analysis.sector}</span>
      </h2>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto">
        <Hero onAnalyze={handleAnalyze} isLoading={loading} />

        {/* Ambiguity Confirmation Prompt */}
        {ambiguousCities && !loading && (
          <div className="max-w-4xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-10 rounded-[32px] border border-blue-100 shadow-2xl shadow-blue-50 text-center">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Select City</h2>
              <p className="text-slate-500 mb-10 text-lg">We found multiple locations for <strong>{lastQuery?.sector || lastQuery?.city}</strong>. Which city did you mean?</p>
              <div className="flex flex-wrap justify-center gap-4">
                {ambiguousCities.map((cityName) => (
                  <button
                    key={cityName}
                    onClick={() => handleCitySelection(cityName)}
                    className="px-8 py-4 bg-slate-50 border border-slate-200 hover:border-blue-600 hover:bg-blue-50 text-slate-900 font-bold rounded-2xl transition-all shadow-sm active:scale-95 text-lg"
                  >
                    {cityName}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setAmbiguousCities(null)}
                className="mt-8 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors underline"
              >
                Go back
              </button>
            </div>
          </div>
        )}

        {analysis && (
          <div ref={resultsRef} className="px-4 py-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="mb-10">
              {getResultHeading()}
              <p className="text-slate-500 italic max-w-3xl">
                {analysis.summary}
              </p>
            </div>

            <ScoreDisplay data={analysis} />
            <InfrastructureList items={analysis.infrastructure} />
            <DemoMap city={analysis.city} sector={analysis.sector} />
          </div>
        )}

        <HowItWorks />
        <UseCases />
      </main>

      <Footer />
    </div>
  );
}