'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { Fuel, Droplets, Moon, SunMedium, LocateFixed, Info, Navigation } from 'lucide-react';
import { useEffect, useState } from 'react';
import MapLegend from '../components/MapLegend';
import WelcomeModal from '../components/WelcomeModal';
import NearestSheds from '../components/NearestSheds';

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

// Mapper to translate NearestSheds output to the new UI filter state
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
  
  // Map control states
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  
  // Nearby Sheds states
  const [showNearest, setShowNearest] = useState(false);
  const [targetLoc, setTargetLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [targetTrigger, setTargetTrigger] = useState(0);

  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem(WELCOME_STORAGE_KEY);
  });

  useEffect(() => {
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', isDark ? '#07111a' : '#f4efe8');
    }
  }, [isDark]);

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
    setTargetTrigger(prev => prev + 1);
    setActiveFilter(fuelKeyToFilter[fuelKey]); 
  };

  return (
    <main className={`${isDark ? 'theme-dark' : 'theme-light'} ui-page`}>
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden">
        <header className="ui-panel flex-none rounded-none border-x-0 border-t-0 px-3.5 py-3 sm:px-4.5 sm:py-3.5">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <div className="ui-brand-mark h-11 w-11 shrink-0 rounded-[16px] sm:h-12 sm:w-12">
                <Image src="/logo.svg" alt="FullTank logo" width={34} height={34} priority />
              </div>

              <div className="min-w-0">
                <p className="ui-kicker">Live Fuel Map</p>
                <h1 className="mt-0.5 text-[1.1rem] font-semibold tracking-tight sm:text-[1.35rem]">
                  Full<span className="text-[var(--ui-brand)]">Tank</span>
                </h1>
                <p className="ui-text-muted mt-1 max-w-[18rem] text-[13px] leading-4 sm:max-w-none sm:text-sm sm:leading-5">
                  Fast community fuel updates built for quick map scanning.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {/* RESTORED: Nearby Button styled with the new UI system */}
              <button onClick={() => setShowNearest(true)} className="ui-button-neutral hidden sm:inline-flex text-[var(--ui-brand)] border-[var(--ui-brand-muted)]">
                <Navigation size={16} />
                Nearby
              </button>
              <button onClick={() => setShowNearest(true)} aria-label="Nearby sheds" className="ui-button-icon sm:hidden text-[var(--ui-brand)]">
                <Navigation size={18} />
              </button>

              <Link href="/about" className="ui-button-neutral hidden sm:inline-flex">
                <Info size={16} />
                About
              </Link>
              <Link href="/about" aria-label="About and reports" className="ui-button-icon sm:hidden">
                <Info size={18} />
              </Link>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                className="ui-button-icon"
              >
                {isDark ? <SunMedium size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>
        </header>

        <section className="relative min-h-0 flex-1 overflow-hidden">
          {/* RESTORED: TargetLoc and userLoc props */}
          <MapBox 
            activeFilter={activeFilter} 
            isDark={isDark} 
            recenterTrigger={recenterTrigger} 
            targetLoc={targetLoc}
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

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2000]">
            <div className="pointer-events-auto absolute bottom-[calc(env(safe-area-inset-bottom)+0.6rem)] left-1/2 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1.5 overflow-x-auto no-scrollbar rounded-full p-1.5 sm:max-w-[calc(100vw-1.5rem)] ui-dock">
              {filterOptions.map((filter) => {
                const Icon = filter.icon;
                const isActive = activeFilter === filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value)}
                    aria-pressed={isActive}
                    className={`ui-control-button ${isActive ? 'ui-control-button-active' : ''}`}
                  >
                    <Icon size={15} />
                    <span>{filter.label}</span>
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