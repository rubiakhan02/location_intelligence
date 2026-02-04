import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">MPF</span>
              </div>
              <span className="text-xl font-bold text-slate-900">RealEstate MPF</span>
            </div>
            <p className="text-slate-500 max-w-sm mb-6">
              Empowering real estate decisions through advanced location intelligence and data-driven scoring.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-wider text-xs">Platform</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="text-slate-500 hover:text-blue-600 transition-colors">Resources</a></li>
              <li><a href="#" className="text-slate-500 hover:text-blue-600 transition-colors">API Access</a></li>
              <li><a href="#" className="text-slate-500 hover:text-blue-600 transition-colors">Documentation</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-wider text-xs">Company</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="text-slate-500 hover:text-blue-600 transition-colors">About Us</a></li>
              <li><a href="#" className="text-slate-500 hover:text-blue-600 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-slate-500 hover:text-blue-600 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
            <p className="text-slate-400 text-sm">
              &copy; 2024 RealEstate MPF Intelligence. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};