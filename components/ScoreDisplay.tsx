import React from "react";
import { LocationAnalysis } from "../types";

interface ScoreDisplayProps {
  data: LocationAnalysis;
}

const getGradeClass = (grade: string) => {
  if (grade === "A+" || grade === "A") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (grade === "B+" || grade === "B") return "text-blue-700 bg-blue-50 border-blue-200";
  if (grade === "C+" || grade === "C") return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-rose-700 bg-rose-50 border-rose-200";
};

const getCodeBadge = (code: string) => {
  if (code === "L") return "bg-slate-900 text-white";
  if (code === "O") return "bg-blue-700 text-white";
  if (code === "C") return "bg-indigo-700 text-white";
  if (code === "A") return "bg-cyan-700 text-white";
  if (code === "T") return "bg-emerald-700 text-white";
  return "bg-amber-600 text-white";
};

const PIE_COLOR: Record<string, string> = {
  L: "#0f172a",
  O: "#1d4ed8",
  C: "#4338ca",
  A: "#0e7490",
  T: "#047857",
  E: "#d97706",
};

const getCoordinatesForPercent = (percent: number) => {
  const x = Math.cos(2 * Math.PI * percent);
  const y = Math.sin(2 * Math.PI * percent);
  return [x, y] as const;
};

const LandmarkIcon: React.FC<{ category: string }> = ({ category }) => {
  const c = category.toLowerCase();
  const baseClass = "w-5 h-5";

  if (c.includes("metro")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={baseClass}>
        <rect x="4" y="3" width="16" height="14" rx="2" />
        <path d="M8 17l-2 4M16 17l2 4M7 11h10M9 7h1M14 7h1" />
      </svg>
    );
  }
  if (c.includes("hospital")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={baseClass}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    );
  }
  if (c.includes("school") || c.includes("university")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={baseClass}>
        <path d="M2 10l10-5 10 5-10 5-10-5z" />
        <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
      </svg>
    );
  }
  if (c.includes("mall")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={baseClass}>
        <path d="M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 116 0v2" />
      </svg>
    );
  }
  if (c.includes("airport")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={baseClass}>
        <path d="M2 19h20M10 19l2-7M12 12l9-4-1-2-8 2-2-5-2 1 1 5-6 2 1 2 7-1" />
      </svg>
    );
  }
  if (c.includes("park")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={baseClass}>
        <path d="M12 22V12M7 12a5 5 0 0110 0M9 8a3 3 0 116 0" />
      </svg>
    );
  }
  if (c.includes("railway")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={baseClass}>
        <rect x="5" y="3" width="14" height="14" rx="2" />
        <path d="M8 17l-2 4M16 17l2 4M8 8h.01M16 8h.01M8 12h8" />
      </svg>
    );
  }
  if (c.includes("it")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={baseClass}>
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M8 20h8M10 18v2M14 18v2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={baseClass}>
      <path d="M12 22s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
};

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ data }) => {
  const pct = Math.max(0, Math.min(100, (data.summary.totalScore / 1000) * 100));
  const pieData = data.categories.map((c) => ({
    code: c.code,
    value: c.score,
    color: PIE_COLOR[c.code] || "#64748b",
  }));
  const pieTotal = pieData.reduce((sum, item) => sum + item.value, 0) || 1;
  const getLandmarkNote = (name: string, category: string) => {
    const locality = data.localityName;
    const city = data.cityName;
    const c = category.toLowerCase();

    if (c.includes("metro")) {
      return `${name} improves daily commute efficiency for residents and office users in ${locality}. It supports stronger tenant preference for transit-connected addresses.`;
    }
    if (c.includes("hospital")) {
      return `${name} strengthens healthcare access for households in and around ${locality}. Reliable medical infrastructure improves long-term livability and occupancy confidence.`;
    }
    if (c.includes("university") || c.includes("school")) {
      return `${name} enhances the education ecosystem linked to ${locality}, ${city}. This supports sustained demand from family and student-driven housing catchments.`;
    }
    if (c.includes("mall")) {
      return `${name} acts as a major retail and leisure anchor for ${locality}. Strong footfall around such assets usually supports commercial activity and rental liquidity.`;
    }
    if (c.includes("airport")) {
      return `${name} improves inter-city and global accessibility from ${locality}. Airport proximity generally supports business travel demand and premium occupier interest.`;
    }
    if (c.includes("park")) {
      return `${name} contributes to open-space and recreational quality near ${locality}. Better public realm characteristics typically improve end-user appeal over time.`;
    }
    if (c.includes("railway")) {
      return `${name} supports regional commuter movement connected to ${locality}. Rail-linked mobility often improves location depth and tenant accessibility.`;
    }
    if (c.includes("it")) {
      return `${name} reinforces employment-led demand influence in ${locality}. Proximity to job nodes can improve leasing velocity for both residential and commercial stock.`;
    }
    return `${name} is a relevant urban anchor for ${locality}, ${city}. It supports day-to-day convenience and contributes to overall micro-market usability.`;
  };

  return (
    <div className="space-y-8 mb-12">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="min-w-0 max-w-3xl">
            <p className="text-xs font-black tracking-[0.2em] text-slate-400 uppercase">LOCATE Score</p>
            <h3 className="text-5xl font-black tracking-tight text-slate-900 mt-2">
              {data.summary.totalScore}
              <span className="text-2xl text-slate-400"> / 1000</span>
            </h3>
            <p className="text-slate-600 mt-3 max-w-3xl">{data.summary.headlineVerdict}</p>
            <div className={`mt-4 inline-flex px-5 py-2 rounded-full border text-sm font-black tracking-widest uppercase ${getGradeClass(data.summary.grade)}`}>
              {data.summary.grade} - {data.summary.gradeLabel}
            </div>
          </div>

          <div className="w-full lg:w-[360px] shrink-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <svg className="w-32 h-32 -rotate-90" viewBox="-1 -1 2 2" aria-label="LOCATE category distribution">
                {(() => {
                  let cumulativePercent = 0;
                  return pieData.map((slice) => {
                    const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                    cumulativePercent += slice.value / pieTotal;
                    const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                    const largeArcFlag = slice.value / pieTotal > 0.5 ? 1 : 0;
                    const pathData = [
                      `M ${startX} ${startY}`,
                      `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                      "L 0 0",
                    ].join(" ");

                    return (
                      <path key={slice.code} d={pathData} fill={slice.color}>
                        <title>{`${slice.code}: ${slice.value} (${Math.round((slice.value / pieTotal) * 100)}%)`}</title>
                      </path>
                    );
                  });
                })()}
                  <circle cx="0" cy="0" r="0.56" fill="#ffffff" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-black tracking-widest text-slate-500">LOCATE</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {data.categories.map((cat) => (
                  <div key={`legend-${cat.code}`} className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLOR[cat.code] || "#64748b" }}></span>
                    <span className="text-[11px] font-bold text-slate-600">
                      {cat.code} {cat.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full mt-6 overflow-hidden">
          <div className="h-full bg-slate-900 rounded-full" style={{ width: `${pct}%` }}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.categories.map((category) => {
          const categoryPct = Math.max(0, Math.min(100, (category.score / category.maxScore) * 100));
          return (
            <div key={category.code} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black tracking-wider ${getCodeBadge(category.code)}`}>
                    {category.code}
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mt-3">{category.name}</h4>
                </div>
                <p className="text-right text-slate-700 font-bold text-sm">
                  {category.score} / {category.maxScore}
                </p>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-5">
                <div className="h-full bg-slate-900 rounded-full" style={{ width: `${categoryPct}%` }}></div>
              </div>

              <div className="space-y-4">
                {category.sections.map((section, index) => (
                  <div key={`${category.code}-${section.title}-${index}`}>
                    <h5 className="text-sm font-black uppercase tracking-wide text-slate-700">{section.title}</h5>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{section.body}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div>
          <h4 className="text-lg font-bold text-slate-900">Nearby Landmarks</h4>
          {data.nearbyLandmarks && data.nearbyLandmarks.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
              {data.nearbyLandmarks.map((item, idx) => (
                <div key={`landmark-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-9 h-9 rounded-lg bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-sm">
                      <LandmarkIcon category={item.category} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-600 mt-1">{item.category}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {getLandmarkNote(item.name, item.category)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 mt-3">
              Accurate nearby landmarks are currently unavailable for this exact locality.
            </p>
          )}
        </div>

        <div>
          <h4 className="text-lg font-bold text-slate-900">Interpretation</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <div>
              <h5 className="text-sm font-black uppercase tracking-wide text-slate-700">Strengths</h5>
              <ul className="mt-2 space-y-2 text-sm text-slate-600">
                {data.interpretation.strengths.map((item, idx) => (
                  <li key={`strength-${idx}`}>- {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-sm font-black uppercase tracking-wide text-slate-700">WatchOuts</h5>
              <ul className="mt-2 space-y-2 text-sm text-slate-600">
                {data.interpretation.watchOuts.map((item, idx) => (
                  <li key={`watch-${idx}`}>- {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-bold text-slate-900">Recommendations</h4>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p><span className="font-bold text-slate-700">MicroMarketStrategy:</span> {data.recommendations.microMarketStrategy.join(" ")}</p>
            <p><span className="font-bold text-slate-700">DeveloperAndInfra:</span> {data.recommendations.developerAndInfra.join(" ")}</p>
            <p><span className="font-bold text-slate-700">AssetType:</span> {data.recommendations.assetType.join(" ")}</p>
            <p><span className="font-bold text-slate-700">HoldingHorizon:</span> {data.recommendations.holdingHorizon}</p>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-bold text-slate-900">Verdict</h4>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{data.verdictText}</p>
        </div>
      </div>
    </div>
  );
};
