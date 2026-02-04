
import React from 'react';
import { InfrastructureItem } from '../types';

interface InfrastructureListProps {
  items: InfrastructureItem[];
}

const getCategoryIcon = (category: string) => {
  // Common pin icon as the base, or specific ones if needed
  switch (category) {
    case 'Metro':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M7 15h10M4 11h16" />
          <rect x="3" y="5" width="18" height="11" rx="2" />
          <path d="m9 16-2 3M15 16l2 3" />
        </svg>
      );
    case 'Hospital':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M12 6v12M6 12h12" />
          <rect x="2" y="4" width="20" height="16" rx="2" />
        </svg>
      );
    case 'School':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M22 10 12 5 2 10l10 5 10-5Z" />
          <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
        </svg>
      );
    case 'Mall':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18M8 10a4 4 0 0 0 8 0" />
        </svg>
      );
    case 'Office':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M9 22v-4h6v4" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
  }
};

export const InfrastructureList: React.FC<InfrastructureListProps> = ({ items }) => {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-8">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Nearby Landmarks</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, idx) => (
          <div 
            key={idx} 
            className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-5 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 cursor-pointer group"
          >
            {/* Icon Container - Matching the screenshot style */}
            <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center shrink-0 transition-all group-hover:bg-blue-50 group-hover:text-blue-600">
              {getCategoryIcon(item.category)}
            </div>

            {/* Content Container */}
            <div className="flex-grow min-w-0">
              <h4 className="font-bold text-[17px] text-slate-800 leading-tight mb-1 truncate group-hover:text-slate-900">
                {item.name}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                  LANDMARK
                </span>
                <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                  VERIFIED ASSET
                </span>
              </div>
            </div>

            {/* Hover Action Indicator */}
            <div className="opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300 px-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
