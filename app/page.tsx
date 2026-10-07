'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { Fuel, Droplets, Moon, SunMedium, LocateFixed, Info, Navigation } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import MapLegend from '../components/MapLegend';
import WelcomeModal from '../components/WelcomeModal';
import NearestSheds from '../components/NearestSheds';
import { supabase } from './lib/supabase';

const MapBox = dynamic(() => import('../components/MapBox'), { ssr: false });

type FuelFilter = 'all' | '92' | '95' | 'diesel' | 'super_diesel';

const THEME_STORAGE_KEY = 'fulltank_theme';
const WELCOME_STORAGE_KEY = 'fulltank_welcome_seen';

const filterOptions = [
  { value: 'all' as FuelFilter, label: 'All Fuels', icon: Fuel },
  { value: '92' as FuelFilter, label: 'Petrol 92', icon: Fuel },
  { value: '95' as FuelFilter, label: 'Petrol 95', icon: Fuel },
  { value: 'diesel' as FuelFilter, label: 'Diesel', icon: Droplets },
  { value: 'super_diesel' as FuelFilter, label: 'Super Diesel', icon: Droplets },
];

const fuelKeyToFilter: Record<string, FuelFilter> = {
  has_92: '92',
  has_95: '95',
  has_diesel: 'diesel',
  has_super_diesel: 'super_diesel'
};

export default function Home() {
  const [activeFilter, setActiveFilter] = useState<FuelFilter>('all');
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
  });

  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  const [showNearest, setShowNearest] = useState(false);
  const [targetLoc, setTargetLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [targetTrigger, setTargetTrigger] = useState(0);
  const [targetStationId, setTargetStationId] = useState<string | null>(null);

  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem(WELCOME_STORAGE_KEY);
  });

  const filterButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });

  useLayoutEffect(() => {
    const activeBtn = filterButtonRefs.current[activeFilter];
    if (activeBtn) {
      setPillStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
        opacity: 1,
      });
    }
  }, [activeFilter]);

  useEffect(() => {
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', isDark ? '#07111a' : '#f4efe8');
    }
  }, [isDark]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stationId = new URLSearchParams(window.location.search).get('station')?.trim();
    if (!stationId) return;

    const fetchStationLocation = async () => {
      const { data, error } = await supabase
        .from('stations')
        .select('lat, lng')
        .eq('id', stationId)
        .single();

      if (data && !error) {
        setActiveFilter('all');
        setTargetStationId(stationId);
        setTargetLoc({ lat: data.lat, lng: data.lng });
        setTargetTrigger((prev) => prev + 1);
      }
    };

    fetchStationLocation();
  }, []);

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme ? 'dark' : 'light');
  };

  const dismissWelcome = () => {
    localStorage.setItem(WELCOME_STORAGE_KEY, '1');
    setShowWelcome(false);
  };

  const handleShowStation = (lat: number, lng: number, fuelKey: string) => {
    setTargetLoc({ lat, lng });
    setTargetStationId(null);
    setTargetTrigger(prev => prev + 1);
    setActiveFilter(fuelKeyToFilter[fuelKey]);
  };

  return (
    <main className={`${isDark ? 'theme-dark' : 'theme-light'} ui-page`}>
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden">
        
        {/* --- REFACTORED HEADER --- */}
        <header className="ui-panel flex-none rounded-none border-x-0 border-t-0 px-3.5 py-3 sm:px-4.5 sm:py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            
            {/* Left Side: Logo & Title */}
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <div className="ui-brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] sm:h-12 sm:w-12 sm:rounded-[16px]">
                <Image src="/logo.svg" alt="FullTank logo" width={28} height={28} priority className="sm:w-[34px] sm:h-[34px]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="text-[1.15rem] font-bold tracking-tight sm:mt-0.5 sm:text-[1.35rem] leading-none sm:leading-tight">
                    Full<span className="text-[var(--ui-brand)]">Tank</span>
                  </h1>
                  {/* Badges - Hidden on mobile to save space, flex on larger screens */}
                  <div className="hidden lg:flex flex-wrap gap-1.5">
                    <span className="ui-badge">Reliable community signals</span>
                    <span className="ui-badge">Lightweight on mobile</span>
                    <span className="ui-badge">Tap markers to confirm or update</span>
                  </div>
                </div>
                {/* Hidden on mobile to prevent cramping */}
                <p className="ui-text-muted mt-1 max-w-[18rem] text-[13px] leading-4 hidden sm:block sm:max-w-none sm:text-sm sm:leading-5">
                  Fast community fuel updates built for quick map scanning.
                </p>
              </div>
            </div>

            {/* Right Side: Actions */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              
              {/* Nearby Button (Combined DOM element to prevent duplicates) */}
              <button 
                onClick={() => setShowNearest(true)} 
                className="ui-button-neutral text-[var(--ui-brand)] border-[var(--ui-brand-muted)] !px-2.5 sm:!px-3.5"
                title="Nearby sheds"
              >
                <Navigation size={18} className="sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline font-semibold">Nearby</span>
              </button>

              {/* About Button (Combined DOM element) */}
              <Link href="/about" className="ui-button-neutral !px-2.5 sm:!px-3.5" title="About and reports">
                <Info size={18} className="sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline font-semibold">About</span>
              </Link>

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                className="ui-button-icon shrink-0"
              >
                {isDark ? <SunMedium size={18} /> : <Moon size={18} />}
              </button>

            </div>
          </div>
          <div className="mt-2.5 hidden sm:flex flex-wrap gap-1.5">
            <span className="ui-badge">Reliable community signals</span>
            <span className="ui-badge">Lightweight on mobile</span>
            <span className="ui-badge">Tap markers to confirm or update</span>
          </div>
        </header>

        {/* --- MAP AREA --- */}
        <section className="relative min-h-0 flex-1 overflow-hidden">
          <MapBox 
            activeFilter={activeFilter} 
            isDark={isDark} 
            recenterTrigger={recenterTrigger} 
            targetLoc={targetLoc}
            targetStationId={targetStationId}
            targetTrigger={targetTrigger}
            onUserLocChange={setUserLoc}
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 z-[2000] flex justify-end p-2.5 sm:p-3">
            <div className="pointer-events-auto">
              <MapLegend />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setRecenterTrigger((value) => value + 1)}
            className="ui-button-icon absolute bottom-[calc(env(safe-area-inset-bottom)+5.15rem)] right-3 z-[2000] h-11 w-11 shadow-lg sm:bottom-[5.15rem] sm:right-3.5"
            title="Locate me"
            aria-label="Locate me"
          >
            <LocateFixed size={18} />
          </button>

          {/* --- BOTTOM FILTER BAR --- */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2000]">
            <div className="pointer-events-auto absolute bottom-[calc(env(safe-area-inset-bottom)+0.6rem)] left-1/2 flex w-[98vw] sm:w-max -translate-x-1/2 items-center justify-between gap-0 sm:gap-1.5 rounded-full p-1 sm:p-1.5 ui-dock">
              {filterOptions.map((filter) => {
                const Icon = filter.icon;
                const isActive = activeFilter === filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value)}
                    aria-pressed={isActive}
                    // The ! overrides the thick padding from ui-control-button
                    className={`ui-control-button flex-1 flex items-center justify-center !px-0.5 py-2 sm:!px-3 text-[9.5px] min-[370px]:text-[10.5px] sm:text-sm whitespace-nowrap transition-all ${isActive ? 'ui-control-button-active scale-[1.02] shadow-sm' : ''}`}
                  >
                    <Icon size={14} className="hidden sm:block shrink-0" />
                    <span className="truncate">{filter.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <NearestSheds
        userLoc={userLoc}
        trigger={showNearest}
        isDark={isDark}
        onClose={() => setShowNearest(false)}
        onShowStation={handleShowStation}
      />
      <WelcomeModal open={showWelcome} onClose={dismissWelcome} />
    </main>
  );
}