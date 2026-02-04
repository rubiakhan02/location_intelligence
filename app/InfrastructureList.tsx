
import React from 'react';
import { InfrastructureItem } from '../types';

interface InfrastructureListProps {
  items: InfrastructureItem[];
}

const getCategoryDisplay = (category: string) => {
  const map: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
    'Metro': { 
      label: 'CONNECTIVITY', 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 animate-soft-float">
          <path d="M7 15h10M4 11h16" />
          <rect x="3" y="5" width="18" height="11" rx="2" />
          <path d="m9 16-2 3M15 16l2 3" />
          <circle cx="12" cy="10" r="1.5" />
        </svg>
      )
    },
    'Hospital': { 
      label: 'HEALTHCARE', 
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 animate-soft-float">
          <path d="M12 6v12M6 12h12" />
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M10 2v2M14 2v2" />
        </svg>
      )
    },
    'School': { 
      label: 'EDUCATION', 
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 animate-soft-float">
          <path d="M22 10 12 5 2 10l10 5 10-5Z" />
          <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
        </svg>
      )
    },
    'Mall': { 
      label: 'RETAIL', 
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 animate-soft-float">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18M8 10a4 4 0 0 0 8 0" />
        </svg>
      )
    },
    'Office': { 
      label: 'EMPLOYMENT', 
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 animate-soft-float">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
        </svg>
      )
    },
    'Park': { 
      label: 'LIFESTYLE', 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 animate-soft-float">
          <path d="M12 2v8M12 22v-4M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h8M14 12h8M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    }
  };
  return map[category] || { 
    label: 'LANDMARK', 
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>, 
    color: 'text-slate-600', 
    bgColor: 'bg-slate-50' 
  };
};

export const InfrastructureList: React.FC<InfrastructureListProps> = ({ items }) => {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-8">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Nearby Landmarks</h2>
        <div className="h-px flex-grow bg-slate-200"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
        {items.map((item, idx) => {
          const display = getCategoryDisplay(item.category);
          return (
            <div 
              key={idx} 
              className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-5 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 cursor-default group"
            >
              {/* Animated Icon Container */}
              <div className={`relative w-14 h-14 ${display.bgColor} ${display.color} rounded-2xl flex items-center justify-center shrink-0 transition-all group-hover:scale-105 group-hover:-translate-y-1 shadow-sm icon-container-glow`}>
                {/* Subtle Pulse Background */}
                <div className={`absolute inset-0 rounded-2xl ${display.bgColor} opacity-0 group-hover:opacity-100 group-hover:animate-subtle-pulse`}></div>
                
                {/* Refined SVG Icon */}
                <div className="relative z-10">
                  {display.icon}
                </div>
              </div>

              {/* Landmark Details */}
              <div className="flex-grow min-w-0">
                <h4 className="font-bold text-[18px] text-slate-900 leading-tight mb-1 truncate group-hover:text-blue-700 transition-colors">
                  {item.name}
                </h4>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-black tracking-[0.12em] uppercase ${display.color} opacity-80 group-hover:opacity-100 transition-opacity`}>
                    {display.label}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Verified Asset</span>
                </div>
              </div>

              {/* Enhanced Action Indicator */}
              <div className="opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
