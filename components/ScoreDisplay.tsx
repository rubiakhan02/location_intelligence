
import React from 'react';
import { LocationAnalysis, ScoreBreakdown } from '../types';

interface ScoreDisplayProps {
  data: LocationAnalysis;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ data }) => {
  const getLabelColor = (label: string, score: number) => {
    const l = label.toLowerCase();
    if (score >= 90 || l.includes('excellent')) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 75 || l.includes('growth') || l.includes('good')) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 60 || l.includes('emerging') || l.includes('average')) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  const getMeterColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 75) return 'text-blue-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-slate-400';
  };

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (data.overallScore / 100) * circumference;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
      {/* Circular Meter */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
        <h3 className="text-slate-400 font-bold mb-6 uppercase tracking-[0.15em] text-[11px]">Market Potential Factor</h3>
        <div className="relative w-56 h-56 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle 
              cx="50" 
              cy="50" 
              r={radius} 
              fill="transparent" 
              stroke="currentColor" 
              strokeWidth="10" 
              className="text-slate-50" 
            />
            {/* Progress Bar */}
            <circle 
              cx="50" 
              cy="50" 
              r={radius} 
              fill="transparent" 
              stroke="currentColor" 
              strokeWidth="10" 
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className={`${getMeterColor(data.overallScore)} transition-all duration-1000 ease-out`}
            />
          </svg>
          
          {/* Centered Score Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="flex items-baseline gap-0.5">
              <span className={`text-6xl font-black tracking-tighter ${data.overallScore >= 90 ? 'animate-pulse' : ''} text-slate-900`}>
                {Math.round(data.overallScore * 10) / 10}
              </span>
            </div>
            <span className="text-slate-400 font-bold text-sm mt-1 uppercase tracking-widest">/ 100</span>
          </div>
        </div>

        <div className={`mt-8 px-6 py-2 rounded-full border text-xs font-black tracking-widest uppercase shadow-sm ${getLabelColor(data.label, data.overallScore)}`}>
          {data.label.toUpperCase().replace(' POTENTIAL', '')} POTENTIAL
        </div>
      </div>

      {/* Breakdown Cards Grid */}
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <BreakdownCard label="Connectivity" score={data.breakdown.connectivity} icon="🚇" color="bg-blue-600" />
        <BreakdownCard label="Healthcare" score={data.breakdown.healthcare} icon="🏥" color="bg-rose-500" />
        <BreakdownCard label="Education" score={data.breakdown.education} icon="🏫" color="bg-indigo-600" />
        <BreakdownCard label="Retail & Lifestyle" score={data.breakdown.retail} icon="🛍" color="bg-amber-500" />
        <BreakdownCard label="Employment" score={data.breakdown.employment} icon="🏢" color="bg-slate-700" />
        {/* Environment/AQI removed */}
        
        {/* Market Composition Pie Chart */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl sm:col-span-2 lg:col-span-3 flex items-center justify-between">
          <div className="max-w-[180px]">
            <h4 className="text-[10px] font-black opacity-50 mb-2 uppercase tracking-[0.2em]">Market Composition</h4>
            <p className="text-[10px] text-slate-400 leading-tight">Weighted factor distribution across infrastructure pillars.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <PieChart breakdown={data.breakdown} />
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-xl font-black">MPF</span>
              </div>
            </div>
            <div className="hidden sm:grid grid-cols-2 gap-x-4 gap-y-1">
              <LegendItem label="Conn" color="bg-blue-600" />
              <LegendItem label="Health" color="bg-rose-500" />
              <LegendItem label="Edu" color="bg-indigo-600" />
              <LegendItem label="Retail" color="bg-amber-500" />
              <LegendItem label="Job" color="bg-slate-700" />
              {/* Env removed */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LegendItem: React.FC<{ label: string, color: string }> = ({ label, color }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-2 h-2 rounded-full ${color}`}></div>
    <span className="text-[8px] uppercase font-bold text-slate-500">{label}</span>
  </div>
);

const BreakdownCard: React.FC<{ label: string, score: number, icon: string, color: string }> = ({ label, score, icon, color }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-100 transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 group-hover:bg-blue-50 transition-all">
        {icon}
      </div>
      <span className="text-xl font-black text-slate-900">{Math.round(score)}</span>
    </div>
    <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-3">{label}</p>
    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
      <div 
        className={`${color} h-full rounded-full transition-all duration-1000 ease-out`} 
        style={{ width: `${score}%` }}
      ></div>
    </div>
  </div>
);

const PieChart: React.FC<{ breakdown: ScoreBreakdown }> = ({ breakdown }) => {
  const data = [
    { label: 'Connectivity', value: breakdown.connectivity, color: '#2563eb' },
    { label: 'Healthcare', value: breakdown.healthcare, color: '#f43f5e' },
    { label: 'Education', value: breakdown.education, color: '#4f46e5' },
    { label: 'Retail', value: breakdown.retail, color: '#f59e0b' },
    { label: 'Employment', value: breakdown.employment, color: '#334155' },
    // Environment slice removed
  ];

  const total = data.reduce((acc, item) => acc + item.value, 0);
  let cumulativePercent = 0;

  function getCoordinatesForPercent(percent: number) {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  }

  return (
    <svg className="w-24 h-24 -rotate-90 drop-shadow-lg" viewBox="-1 -1 2 2">
      {data.map((slice, i) => {
        const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
        cumulativePercent += slice.value / total;
        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
        const largeArcFlag = slice.value / total > 0.5 ? 1 : 0;
        const pathData = [
          `M ${startX} ${startY}`,
          `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
          `L 0 0`,
        ].join(' ');

        return (
          <path 
            key={i} 
            d={pathData} 
            fill={slice.color} 
            className="transition-all duration-500 hover:opacity-80 cursor-pointer"
          >
            <title>{slice.label}: {Math.round((slice.value / total) * 100)}%</title>
          </path>
        );
      })}
      {/* Hole for Donut Style */}
      <circle cx="0" cy="0" r="0.6" fill="#0f172a" />
    </svg>
  );
};
