"use client";

import React, { useState, useRef } from "react";
import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { ScoreDisplay } from "../components/ScoreDisplay";
import { DemoMap } from "../components/DemoMap";
import { HowItWorks, UseCases } from "../components/Features";
import { Footer } from "../components/Footer";
import { LocationAnalysis } from "../types";
import { analyzeLocation, getCityMatches, validateLocationInput } from "../services/locationService";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<LocationAnalysis | null>(null);
  const [ambiguousCities, setAmbiguousCities] = useState<string[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<{ city: string; locality: string } | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = async (city: string, locality: string) => {
    setLoading(true);
    setAmbiguousCities(null);
    setAnalysis(null);
    setErrorMessage(null);
    setLastQuery({ city, locality });

    try {
      const [validationResult, matchesResult] = await Promise.allSettled([
        validateLocationInput(city, locality),
        getCityMatches(city, locality),
      ]);

      if (validationResult.status === "rejected") throw validationResult.reason;

      const validation = validationResult.value;
      if (!validation.isValid) {
        setErrorMessage(validation.reason || "Invalid input. Enter a valid city and locality.");
        setLoading(false);
        return;
      }

      if (matchesResult.status === "rejected") throw matchesResult.reason;

      const { isAmbiguous, suggestedCities } = matchesResult.value;
      if (isAmbiguous && suggestedCities.length > 1) {
        setAmbiguousCities(suggestedCities);
        setLoading(false);
        return;
      }

      const result = await analyzeLocation(city, locality);
      setAnalysis(result);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (error) {
      console.error("Failed to analyze location", error);
      setErrorMessage(error instanceof Error ? error.message : "Unable to process input right now. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCitySelection = (selectedCity: string) => {
    if (lastQuery) handleAnalyze(selectedCity, lastQuery.locality);
  };

  const getLocalitySummary = (report: LocationAnalysis) => {
    const localityLabel = `${report.cityName} ${report.localityName}`.replace(/\s+/g, " ").trim();
    const focusText = report.focus?.toLowerCase() || "a resilient mixed-use micro-market";
    const coreStrength =
      report.interpretation.strengths?.[0] || "Demand is supported by jobs access and established social infrastructure.";
    const coreConnectivity =
      report.categories.find((c) => c.code === "C")?.sections?.[0]?.body ||
      "Connectivity and commute profile remain a key demand driver.";
    const coreDemand =
      report.categories.find((c) => c.code === "E")?.sections?.[2]?.body ||
      "Absorption is healthy in correctly priced, well-located stock.";
    const watchout =
      report.interpretation.watchOuts?.[0] || "localized congestion and infrastructure execution risk require monitoring.";
    const horizon = report.recommendations.holdingHorizon || "medium-term";

    const lines = [
      `${localityLabel} is ${focusText}.`,
      `${coreStrength}`,
      `${coreConnectivity}`,
      `${coreDemand}`,
      `${report.summary.gradeLabel} profile overall; monitor ${watchout.charAt(0).toLowerCase()}${watchout.slice(1)}. Recommended horizon: ${horizon}.`,
    ];
    return lines.join("\n");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto">
        <Hero onAnalyze={handleAnalyze} isLoading={loading} />
        {errorMessage && (
          <div className="max-w-4xl mx-auto px-4 pt-4">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {errorMessage}
            </div>
          </div>
        )}

        {ambiguousCities && !loading && (
          <div className="max-w-4xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-10 rounded-[32px] border border-blue-100 shadow-2xl shadow-blue-50 text-center">
              <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Select City</h2>
              <p className="text-slate-500 mb-10 text-lg">
                We found multiple locations for <strong>{lastQuery?.locality || lastQuery?.city}</strong>. Which city did you mean?
              </p>
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
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                LOCATE Score for {analysis.localityName}, <span className="text-blue-600">{analysis.cityName}</span>
              </h2>
              <p className="text-slate-500 italic max-w-3xl whitespace-pre-line">{getLocalitySummary(analysis)}</p>
            </div>

            <ScoreDisplay data={analysis} />
            <DemoMap city={analysis.cityName} sector={analysis.localityName} />
          </div>
        )}

        <HowItWorks />
        <UseCases />
      </main>

      <Footer />
    </div>
  );
}
