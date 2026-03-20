'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { Fuel, Droplets, Moon, SunMedium, LocateFixed, Info, Navigation } from 'lucide-react';
import { useEffect, useState } from 'react';
import LiveFuelAlerts from '../components/LiveFuelAlerts';
import MapLegend from '../components/MapLegend';
import StationSearch from '../components/StationSearch';
import WelcomeModal from '../components/WelcomeModal';
import NearestSheds from '../components/NearestSheds';
import { supabase } from './lib/supabase';
import { coerceStation, fuelKeyToFilter, type FuelFilter, type FuelKey, type Station } from './lib/stations';

const MapBox = dynamic(() => import('../components/MapBox'), { ssr: false });

const THEME_STORAGE_KEY = 'fulltank_theme';
const WELCOME_STORAGE_KEY = 'fulltank_welcome_seen';

const filterOptions = [
  { value: 'all' as FuelFilter, label: 'All Fuels', icon: Fuel },
  { value: '92' as FuelFilter, label: 'Petrol 92', icon: Fuel },
  { value: '95' as FuelFilter, label: 'Petrol 95', icon: Fuel },
  { value: 'diesel' as FuelFilter, label: 'Diesel', icon: Droplets },
  { value: 'super_diesel' as FuelFilter, label: 'Super Diesel', icon: Droplets },
];

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
  const [targetStationId, setTargetStationId] = useState<string | null>(null);
  const [targetTrigger, setTargetTrigger] = useState(0);
  const [stationIndex, setStationIndex] = useState<Station[]>([]);

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

  useEffect(() => {
    let isCancelled = false;

    const loadStations = async () => {
      const { data, error } = await supabase.from('stations').select('*').order('name');

      if (isCancelled) return;

      if (error) {
        console.error('STATION INDEX ERROR:', error.message);
        return;
      }

      setStationIndex((data ?? []).map((station) => coerceStation(station as Record<string, unknown>)));
    };

    loadStations();

    const channel = supabase
      .channel('fulltank-station-index')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stations' }, (payload) => {
        const nextRecord = (
          payload.eventType === 'DELETE' ? payload.old : payload.new
        ) as Record<string, unknown> | null;
        if (!nextRecord) return;

        const nextStation = coerceStation(nextRecord);

        setStationIndex((current) => {
          if (payload.eventType === 'DELETE') {
            return current.filter((station) => station.id !== nextStation.id);
          }

          const exists = current.some((station) => station.id === nextStation.id);
          if (exists) {
            return current
              .map((station) => (station.id === nextStation.id ? { ...station, ...nextStation } : station))
              .sort((left, right) => left.name.localeCompare(right.name));
          }

          return [...current, nextStation].sort((left, right) => left.name.localeCompare(right.name));
        });
      })
      .subscribe();

    return () => {
      isCancelled = true;
      void supabase.removeChannel(channel);
    };
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

  const focusStation = (
    station: Pick<Station, 'id' | 'lat' | 'lng'>,
    nextFilter: FuelFilter = 'all',
  ) => {
    setTargetLoc({ lat: station.lat, lng: station.lng });
    setTargetStationId(station.id);
    setTargetTrigger(prev => prev + 1);
    setActiveFilter(nextFilter);
  };

  const handleShowStation = (
    station: Pick<Station, 'id' | 'lat' | 'lng'>,
    fuelKey: FuelKey,
  ) => {
    focusStation(station, fuelKeyToFilter[fuelKey]);
  };

  return (
    <main className={`${isDark ? 'theme-dark' : 'theme-light'} ui-page`}>
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden">
        <header className="ui-panel flex-none rounded-none border-x-0 border-t-0 px-3.5 py-3 sm:px-4.5 sm:py-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <div className="ui-brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] sm:h-12 sm:w-12 sm:rounded-[16px]">
                <Image src="/logo.svg" alt="FullTank logo" width={28} height={28} priority className="sm:w-[34px] sm:h-[34px]" />
              </div>
              <div className="min-w-0">
                <p className="ui-kicker hidden sm:block">Live Fuel Map</p>
                <h1 className="text-[1.15rem] font-bold tracking-tight sm:mt-0.5 sm:text-[1.35rem] leading-none sm:leading-tight">
                  Full<span className="text-[var(--ui-brand)]">Tank</span>
                </h1>
                <p className="ui-text-muted mt-1 max-w-[18rem] text-[13px] leading-4 hidden sm:block sm:max-w-none sm:text-sm sm:leading-5">
                  Fast community fuel updates built for quick map scanning.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setShowNearest(true)}
                className="ui-button-neutral text-[var(--ui-brand)] border-[var(--ui-brand-muted)] !px-2.5 sm:!px-3.5"
                title="Nearby sheds"
              >
                <Navigation size={18} className="sm:w-4 sm:h-4 shrink-0" />
                {/* FIX: Removed 'hidden sm:inline' so Nearby shows on mobile */}
                <span className="font-semibold text-[13px] sm:text-sm">Nearby</span>
              </button>
              <Link href="/about" className="ui-button-neutral !px-2.5 sm:!px-3.5" title="About and reports">
                <Info size={18} className="sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline font-semibold">About</span>
              </Link>
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

          <div className="pointer-events-none absolute inset-x-0 top-0 z-[2100] flex justify-center px-2.5 pt-2.5 sm:px-3 sm:pt-3">
            <div className="pointer-events-auto">
              <StationSearch
                stations={stationIndex}
                isDark={isDark}
                onSelectStation={(station) => focusStation(station, 'all')}
              />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 z-[2000] flex justify-end p-2.5 sm:p-3">
            <div className="pointer-events-auto">
              <MapLegend />
            </div>
          </div>

          <LiveFuelAlerts
            stations={stationIndex}
            isDark={isDark}
            onFocusStation={(station, fuelKey) => focusStation(station, fuelKeyToFilter[fuelKey])}
          />

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
            <div className="pointer-events-auto absolute bottom-[calc(env(safe-area-inset-bottom)+0.6rem)] left-1/2 flex max-w-[96vw] -translate-x-1/2 items-center justify-start sm:justify-center gap-1.5 overflow-x-auto no-scrollbar rounded-full p-1.5 ui-dock">
              {filterOptions.map((filter) => {
                const Icon = filter.icon;
                const isActive = activeFilter === filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value)}
                    aria-pressed={isActive}
                    className={`ui-control-button shrink-0 flex items-center justify-center px-3 py-2 text-[11px] sm:text-sm whitespace-nowrap transition-all ${isActive ? '!bg-red-600 !border-red-600 !text-white scale-[1.02] shadow-md' : ''}`}
                  >
                    <Icon size={14} className="hidden sm:block shrink-0" />
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
