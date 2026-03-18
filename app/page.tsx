'use client';

import dynamic from 'next/dynamic';
import { Fuel, Droplet, Moon, Sun, LocateFixed, Navigation } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import NearestSheds from '@/components/NearestSheds';
<<<<<<< Updated upstream
=======
import type { FuelType } from '@/components/NearestSheds';

type ActiveFilter = 'all' | FuelType;
>>>>>>> Stashed changes

const MapBox = dynamic(() => import('../components/MapBox'), { ssr: false });

type ActiveFilter = 'all' | 'has_92' | 'has_95' | 'has_diesel';

export default function Home() {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
<<<<<<< Updated upstream
  // CHANGED: Default isDark to false (light mode)
  const [isDark, setIsDark] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0); 
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [showNearest, setShowNearest] = useState(false);
=======
  const [isDark, setIsDark] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0); 
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  
  const [showNearest, setShowNearest] = useState(false);
  const [targetLoc, setTargetLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [targetTrigger, setTargetTrigger] = useState(0);
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
  // CHANGED: h-screen is now h-[100dvh] to fix mobile browser cutoffs
=======
  // CHANGED: Now accepts the fuelType and forces the main map filter to switch!
  const handleShowStation = (lat: number, lng: number, fuelType: FuelType) => {
    setTargetLoc({ lat, lng });
    setTargetTrigger(prev => prev + 1);
    setActiveFilter(fuelType); 
  };

>>>>>>> Stashed changes
  return (
    <main className={`flex h-[100dvh] flex-col overflow-hidden transition-colors duration-300 ${isDark ? 'bg-slate-950 text-white' : 'bg-gray-100 text-slate-900'}`}>
      
      {/* Header */}
      <header className={`flex flex-none items-center justify-between border-b p-4 shadow-md transition-colors duration-300 ${isDark ? 'bg-slate-900 border-red-900/30' : 'bg-white border-red-200'}`}>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-red-600 p-2">
            <Fuel size={24} className="text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-red-600">Full<span className={isDark ? "text-white" : "text-slate-900"}>Tank</span></h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          
          <button 
            onClick={() => setShowNearest(true)} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all ${isDark ? 'bg-blue-900/40 text-blue-400 hover:bg-blue-900/60' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
          >
            <Navigation size={16} /> <span className="text-xs">Nearby</span>
          </button>

          <Link href="/about" className={`flex items-center px-3 py-1.5 rounded-full transition-colors ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
            <span className="text-xs font-bold">About</span>
          </Link>

          <button onClick={toggleTheme} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-gray-200 text-slate-700 hover:bg-gray-300'}`}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Map Area */}
      <div className="flex-grow relative z-0">
<<<<<<< Updated upstream
        <MapBox
          activeFilter={activeFilter}
          isDark={isDark}
          recenterTrigger={recenterTrigger}
          onUserLocChange={setUserLoc}
        />
        <NearestSheds
          userLoc={userLoc}
          activeFilter={activeFilter}
          trigger={showNearest}
          onClose={() => setShowNearest(false)}
        />

        {/* Floating Bottom Navigation Bar */}
        <div className={`absolute bottom-8 sm:bottom-6 left-1/2 z-[2000] flex max-w-[95vw] -translate-x-1/2 overflow-x-auto rounded-full border p-2 shadow-2xl backdrop-blur-md transition-colors duration-300 ${isDark ? 'bg-slate-900/90 border-slate-700 shadow-black/50' : 'bg-white/90 border-gray-200 shadow-gray-400/50'}`}>
          <div className="flex w-max items-center justify-between gap-1">
          
            <button onClick={() => setActiveFilter('all')} className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${activeFilter === 'all' ? 'bg-red-600 text-white shadow-md scale-105' : (isDark ? 'text-gray-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-gray-100')}`}>
              All Fuels
            </button>
          
            <button onClick={() => setActiveFilter('has_92')} className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${activeFilter === 'has_92' ? 'bg-red-600 text-white shadow-md scale-105' : (isDark ? 'text-gray-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-gray-100')}`}>
              92 Octane
            </button>
          
            <button onClick={() => setActiveFilter('has_95')} className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${activeFilter === 'has_95' ? 'bg-red-600 text-white shadow-md scale-105' : (isDark ? 'text-gray-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-gray-100')}`}>
              95 Octane
            </button>
          
            <button onClick={() => setActiveFilter('has_diesel')} className={`flex flex-shrink-0 items-center gap-1 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${activeFilter === 'has_diesel' ? 'bg-red-600 text-white shadow-md scale-105' : (isDark ? 'text-gray-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-gray-100')}`}>
              <Droplet size={14} className="hidden sm:block" /> Diesel
            </button>

            <button
              onClick={() => setShowNearest(true)}
              disabled={!userLoc}
              className="flex-shrink-0 rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Nearest
            </button>
          
            {/* Vertical Divider */}
            <div className={`mx-1 h-6 w-px flex-shrink-0 sm:mx-2 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`}></div>

            {/* Locate Button */}
            <button onClick={() => setRecenterTrigger(prev => prev + 1)} className={`flex-shrink-0 p-2 rounded-full transition-all ${isDark ? 'text-blue-400 hover:bg-slate-800' : 'text-blue-600 hover:bg-blue-50'}`} title="Locate Me">
              <LocateFixed size={20} />
=======
        <MapBox 
          activeFilter={activeFilter} 
          isDark={isDark} 
          recenterTrigger={recenterTrigger}
          targetLoc={targetLoc}
          targetTrigger={targetTrigger}
          onUserLocChange={setUserLoc} 
        />
        
        <NearestSheds
          userLoc={userLoc}
          trigger={showNearest}
          isDark={isDark}
          onClose={() => setShowNearest(false)}
          onShowStation={handleShowStation}
        />

        {/* Floating Standalone Locate Button */}
        <button 
          onClick={() => setRecenterTrigger(prev => prev + 1)} 
          className={`absolute bottom-[5.5rem] sm:bottom-20 right-4 sm:right-6 z-[2000] p-2.5 rounded-full shadow-xl border transition-all duration-300 backdrop-blur-md ${isDark ? 'bg-slate-900/90 border-slate-700 shadow-black/50 text-blue-400 hover:bg-slate-800 hover:scale-105' : 'bg-white/90 border-gray-200 shadow-gray-400/50 text-blue-600 hover:bg-blue-50 hover:scale-105'}`} 
          title="Locate Me"
        >
          <LocateFixed size={22} />
        </button>

        {/* Floating Bottom Navigation Bar */}
        <div className={`absolute bottom-8 sm:bottom-6 left-1/2 z-[2000] flex w-[98vw] sm:w-max -translate-x-1/2 rounded-full border p-1 sm:p-2 shadow-2xl backdrop-blur-md transition-colors duration-300 ${isDark ? 'bg-slate-900/90 border-slate-700 shadow-black/50' : 'bg-white/90 border-gray-200 shadow-gray-400/50'}`}>
          <div className="flex w-full items-center justify-between gap-0.5 sm:gap-1">
          
            <button onClick={() => setActiveFilter('all')} className={`flex-1 px-1 sm:px-4 py-2 rounded-full text-[12px] sm:text-sm font-bold whitespace-nowrap text-center transition-all ${activeFilter === 'all' ? 'bg-red-600 text-white shadow-md scale-105' : (isDark ? 'text-gray-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-gray-100')}`}>
              All Fuels
            </button>
            
            <button onClick={() => setActiveFilter('has_92')} className={`flex-1 px-1 sm:px-4 py-2 rounded-full text-[12px] sm:text-sm font-bold whitespace-nowrap text-center transition-all ${activeFilter === 'has_92' ? 'bg-red-600 text-white shadow-md scale-105' : (isDark ? 'text-gray-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-gray-100')}`}>
              92 Octane
            </button>
            
            <button onClick={() => setActiveFilter('has_95')} className={`flex-1 px-1 sm:px-4 py-2 rounded-full text-[12px] sm:text-sm font-bold whitespace-nowrap text-center transition-all ${activeFilter === 'has_95' ? 'bg-red-600 text-white shadow-md scale-105' : (isDark ? 'text-gray-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-gray-100')}`}>
              95 Octane
            </button>
            
            <button onClick={() => setActiveFilter('has_diesel')} className={`flex-1 flex items-center justify-center gap-0.5 px-1 sm:px-4 py-2 rounded-full text-[12px] sm:text-sm font-bold whitespace-nowrap text-center transition-all ${activeFilter === 'has_diesel' ? 'bg-red-600 text-white shadow-md scale-105' : (isDark ? 'text-gray-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-gray-100')}`}>
              <Droplet size={12} className="hidden sm:block" /> Diesel
            </button>

            <button onClick={() => setActiveFilter('has_super_diesel')} className={`flex-1 flex items-center justify-center gap-0.5 px-1 sm:px-4 py-2 rounded-full text-[12px] sm:text-sm font-bold whitespace-nowrap text-center transition-all ${activeFilter === 'has_super_diesel' ? 'bg-red-600 text-white shadow-md scale-105' : (isDark ? 'text-gray-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-gray-100')}`}>
              <Droplet size={12} className="hidden sm:block text-yellow-500" /> Super Diesel
>>>>>>> Stashed changes
            </button>

          </div>
        </div>
      </div>
    </main>
  );
}
