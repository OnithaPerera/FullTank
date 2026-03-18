'use client';

import dynamic from 'next/dynamic';
import { Fuel, Droplet, Moon, Sun, LocateFixed } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const MapBox = dynamic(() => import('../components/MapBox'), { ssr: false });

export default function Home() {
  const [activeFilter, setActiveFilter] = useState('all');
  // CHANGED: Default isDark to false (light mode)
  const [isDark, setIsDark] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0); 

  useEffect(() => {
    // CHANGED: Only set to dark if they previously saved 'dark'
    const savedTheme = localStorage.getItem('fulltank_theme');
    if (savedTheme === 'dark') setIsDark(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('fulltank_theme', newTheme ? 'dark' : 'light');
  };

  return (
    <main className={`flex h-[100dvh] flex-col overflow-hidden transition-colors duration-300 ${isDark ? 'bg-slate-950 text-white' : 'bg-gray-100 text-slate-900'}`}>
      
      {/* Header */}
      <header className={`flex items-center justify-between p-4 shadow-md border-b flex-none transition-colors duration-300 ${isDark ? 'bg-slate-900 border-red-900/30' : 'bg-white border-red-200'}`}>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-red-600 p-2">
            <Fuel size={24} className="text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-red-600">Full<span className={isDark ? "text-white" : "text-slate-900"}>Tank</span></h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/about" className={`flex items-center px-3 py-1.5 rounded-full transition-colors ${isDark ? 'bg-slate-800 text-blue-400 hover:bg-slate-700' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}>
            <span className="text-xs font-bold">About</span>
          </Link>

          <button onClick={toggleTheme} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-gray-200 text-slate-700 hover:bg-gray-300'}`}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Map Area */}
      <div className="flex-grow relative z-0">
        <MapBox activeFilter={activeFilter} isDark={isDark} recenterTrigger={recenterTrigger} />

        {/* Floating Bottom Navigation Bar */}
        <div className={`absolute bottom-8 sm:bottom-6 left-1/2 -translate-x-1/2 z-[2000] w-max max-w-[95vw] flex items-center justify-between gap-1 p-2 rounded-full shadow-2xl transition-colors duration-300 border backdrop-blur-md ${isDark ? 'bg-slate-900/90 border-slate-700 shadow-black/50' : 'bg-white/90 border-gray-200 shadow-gray-400/50'}`}>
          
          <button onClick={() => setActiveFilter('all')} className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${activeFilter === 'all' ? 'bg-red-600 text-white shadow-md scale-105' : (isDark ? 'text-gray-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-gray-100')}`}>
            All Fuels
          </button>
          
          <button onClick={() => setActiveFilter('92')} className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${activeFilter === '92' ? 'bg-red-600 text-white shadow-md scale-105' : (isDark ? 'text-gray-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-gray-100')}`}>
            92 Octane
          </button>
          
          <button onClick={() => setActiveFilter('95')} className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${activeFilter === '95' ? 'bg-red-600 text-white shadow-md scale-105' : (isDark ? 'text-gray-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-gray-100')}`}>
            95 Octane
          </button>
          
          <button onClick={() => setActiveFilter('diesel')} className={`flex items-center gap-1 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${activeFilter === 'diesel' ? 'bg-red-600 text-white shadow-md scale-105' : (isDark ? 'text-gray-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-gray-100')}`}>
            <Droplet size={14} className="hidden sm:block" /> Diesel
          </button>
          
          {/* Vertical Divider */}
          <div className={`w-px h-6 mx-1 sm:mx-2 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`}></div>

          {/* Locate Button */}
          <button onClick={() => setRecenterTrigger(prev => prev + 1)} className={`p-2 rounded-full transition-all ${isDark ? 'text-blue-400 hover:bg-slate-800' : 'text-blue-600 hover:bg-blue-50'}`} title="Locate Me">
            <LocateFixed size={20} />
          </button>

        </div>
      </div>
    </main>
  );
}