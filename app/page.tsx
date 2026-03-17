'use client';

import dynamic from 'next/dynamic';
import { Fuel, Droplet, Moon, Sun, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const MapBox = dynamic(() => import('../components/MapBox'), { ssr: false });

export default function Home() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [isDark, setIsDark] = useState(true);

  // 1. Load the saved theme when the app starts
  useEffect(() => {
    const savedTheme = localStorage.getItem('fulltank_theme');
    if (savedTheme === 'light') setIsDark(false);
  }, []);

  // 2. Save the theme whenever the user clicks the toggle
  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('fulltank_theme', newTheme ? 'dark' : 'light');
  };

  return (
    <main className={`flex h-screen flex-col overflow-hidden transition-colors duration-300 ${isDark ? 'bg-slate-950 text-white' : 'bg-gray-100 text-slate-900'}`}>
      
      {/* Header */}
      <header className={`flex flex-col gap-4 p-4 shadow-md border-b flex-none transition-colors duration-300 ${isDark ? 'bg-slate-900 border-red-900/30' : 'bg-white border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-red-600 p-2">
              <Fuel size={24} className="text-white" />
            </div>
            {/* Hidden on very small screens to make room, visible on normal mobile */}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-red-600 hidden xs:block">Full<span className={isDark ? "text-white" : "text-slate-900"}>Tank</span></h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Fixed Live Indicator */}
            <div className={`text-xs sm:text-sm flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Live
            </div>
            
            {/* Improved About Button with Text */}
            <Link href="/about" className={`flex items-center px-3 py-1.5 rounded-full transition-colors ${isDark ? 'bg-slate-800 text-blue-400 hover:bg-slate-700' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}>
              <Info size={16} className="mr-1" />
              <span className="text-xs font-bold">About</span>
            </Link>

            {/* Theme Toggle Button */}
            <button onClick={toggleTheme} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-gray-200 text-slate-700 hover:bg-gray-300'}`}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => setActiveFilter('all')} className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${activeFilter === 'all' ? 'bg-red-600 text-white' : (isDark ? 'bg-slate-800 text-gray-300' : 'bg-gray-200 text-slate-700')}`}>All Fuels</button>
          <button onClick={() => setActiveFilter('92')} className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${activeFilter === '92' ? 'bg-red-600 text-white' : (isDark ? 'bg-slate-800 text-gray-300' : 'bg-gray-200 text-slate-700')}`}>92 Octane</button>
          <button onClick={() => setActiveFilter('95')} className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${activeFilter === '95' ? 'bg-red-600 text-white' : (isDark ? 'bg-slate-800 text-gray-300' : 'bg-gray-200 text-slate-700')}`}>95 Octane</button>
          <button onClick={() => setActiveFilter('diesel')} className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${activeFilter === 'diesel' ? 'bg-red-600 text-white' : (isDark ? 'bg-slate-800 text-gray-300' : 'bg-gray-200 text-slate-700')}`}><Droplet size={14} /> Diesel</button>
        </div>
      </header>

      {/* Map Area */}
      <div className="flex-grow relative z-0">
        <MapBox activeFilter={activeFilter} isDark={isDark} />
      </div>
    </main>
  );
}