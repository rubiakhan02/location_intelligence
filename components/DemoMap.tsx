
import React from 'react';

interface DemoMapProps {
  city: string;
  sector: string;
}

export const DemoMap: React.FC<DemoMapProps> = ({ city, sector }) => {
  const query = encodeURIComponent(`${sector}, ${city}`);
  const mapUrl = `https://maps.google.com/maps?q=${query}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden mb-20">
      {/* Header Info */}
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Live Locality View</span>
        </div>
        <a 
          href={`https://www.google.com/maps/search/${query}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
        >
          Open in Google Maps
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Map Embed Container */}
      <div className="relative aspect-video md:aspect-[21/9] w-full bg-slate-100">
        <iframe
          title="Locality Map"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          src={mapUrl}
          allowFullScreen
          loading="lazy"
          className="grayscale-[20%] contrast-[1.1] brightness-[1.02]"
        ></iframe>
        
        {/* Interactive Overlay Badge */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-white/20 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-none mb-1">Target Sector</p>
            <p className="text-sm font-bold text-slate-900 leading-none">{sector}</p>
          </div>
        </div>
      </div>
      
      {/* Footer Note */}
      <div className="p-4 bg-slate-900 text-center">
        <p className="text-[11px] text-slate-400 font-medium">
          <span className="text-slate-200">Intelligence Note:</span> Map data is synchronized with real-time infrastructure indices for {city}.
        </p>
      </div>
    </div>
  );
};
