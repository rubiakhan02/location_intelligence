import React, { useState, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ScoreDisplay } from './components/ScoreDisplay';
import { InfrastructureList } from './components/InfrastructureList';
import { DemoMap } from './components/DemoMap';
import { HowItWorks, UseCases } from './components/Features';
import { Footer } from './components/Footer';
import { LocationAnalysis } from './types';
import { analyzeLocation, getCityMatches } from './services/locationService';

function App() {
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
      // First, check for ambiguity
      const { isAmbiguous, suggestedCities } = await getCityMatches(city, sector);

      if (isAmbiguous && suggestedCities.length > 1) {
        setAmbiguousCities(suggestedCities);
        setLoading(false);
        return;
      }

      // Proceed if not ambiguous
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

  const downloadAnalysisJSON = () => {
    if (!analysis) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(analysis, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    const fileName = `MPF_Report_${(analysis.city || 'City').replace(/\s+/g, '_')}_${(analysis.sector || 'Area').replace(/\s+/g, '_')}.json`;
    downloadAnchorNode.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const getResultHeading = () => {
    if (!analysis) return null;
    if (analysis.sector && analysis.city) {
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

        {/* City Disambiguation UI */}
        {ambiguousCities && !loading && (
          <div className="max-w-4xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-xl shadow-blue-50 text-center">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Multiple Cities Found</h2>
              <p className="text-slate-500 mb-8">Please confirm which city you are referring to for <strong>{lastQuery?.sector}</strong>:</p>
              <div className="flex flex-wrap justify-center gap-3">
                {ambiguousCities.map((cityName) => (
                  <button
                    key={cityName}
                    onClick={() => handleCitySelection(cityName)}
                    className="px-6 py-3 bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 font-bold rounded-2xl transition-all shadow-sm active:scale-95"
                  >
                    {cityName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {analysis && (
          <div ref={resultsRef} className="px-4 py-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="max-w-3xl">
                {getResultHeading()}
                <p className="text-slate-500 italic">
                  {analysis.summary}
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button 
                  onClick={downloadAnalysisJSON}
                  className="flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all group"
                >
                  <svg className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export JSON
                </button>
              </div>
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

export default App;