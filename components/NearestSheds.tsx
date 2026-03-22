'use client';

import { useEffect, useState } from 'react';
import { useI18n } from './LanguageProvider';
import { supabase } from '../app/lib/supabase';

export type FuelType = 'has_92' | 'has_95' | 'has_diesel' | 'has_super_diesel';

type Station = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  has_92: boolean;
  has_95: boolean;
  has_diesel: boolean;
  has_super_diesel: boolean;
  queue_length: string | null;
  confirms: number | null;
};

type RankedStation = Omit<Station, 'confirms'> & {
  confirms: number;
  distanceKm: number;
  score: number;
};

type NearestShedsProps = {
  userLoc: { lat: number; lng: number } | null;
  trigger: boolean;
  isDark: boolean;
  onClose: () => void;
  // CHANGED: Now passes the fuel type so the main map can update its filter
  onShowStation: (lat: number, lng: number, fuel: FuelType) => void; 
};

const FUEL_OPTIONS: { id: FuelType; label: string }[] = [
  { id: 'has_92', label: '92 Octane' },
  { id: 'has_95', label: '95 Octane' },
  { id: 'has_diesel', label: 'Diesel' },
  { id: 'has_super_diesel', label: 'Super Diesel' },
];

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getQueuePenalty(queueLength: string | null) {
  const normalized = queueLength?.toLowerCase().trim() ?? '';
  if (normalized.includes('short')) return 0;
  if (normalized.includes('medium')) return 20;
  if (normalized.includes('long')) return 50;
  return 10;
}

export default function NearestSheds({ userLoc, trigger, isDark, onClose, onShowStation }: NearestShedsProps) {
  const { t } = useI18n();
  const [selectedFuel, setSelectedFuel] = useState<FuelType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<RankedStation[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(trigger);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (trigger) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsMounted(true);
      const frame = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setIsVisible(false);
    const timeout = window.setTimeout(() => setIsMounted(false), 180);
    return () => window.clearTimeout(timeout);
  }, [trigger]);

  useEffect(() => {
    let isCancelled = false;

    const loadNearestStations = async () => {
      if (!trigger) return;
      if (!selectedFuel) {
        setResults([]);
        setMessage(t('nearestSheds.selectFuel'));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setMessage(null);

      if (!userLoc) {
        setMessage(t('nearestSheds.locationNotAvailable'));
        setIsLoading(false);
        return;
      }

      // This fetches ALL stations globally, ignoring the bottom bar filter
      const { data, error } = await supabase.from('stations').select('*');

      if (isCancelled) return;

      if (error || !data) {
        setMessage(t('nearestSheds.unable'));
        setIsLoading(false);
        return;
      }

      const rankedStations = (data as Station[])
        .filter((station) => Boolean(station[selectedFuel]))
        .map((station) => {
          const lat = Number(station.lat);
          const lng = Number(station.lng);
          const confirms = Number(station.confirms ?? 0);

          if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

          const distanceKm = calculateDistance(userLoc.lat, userLoc.lng, lat, lng);
          const queuePenalty = getQueuePenalty(station.queue_length);
          const unverifiedPenalty = confirms < 3 ? 8 : 0;

          return {
            ...station,
            lat,
            lng,
            confirms,
            distanceKm,
            score: distanceKm * 10 + queuePenalty + unverifiedPenalty,
          };
        })
        .filter((station): station is RankedStation => station !== null)
        .sort((a, b) => a.score - b.score)
        .slice(0, 3);

      setResults(rankedStations);
      if (rankedStations.length === 0) setMessage(t('nearestSheds.noneFound'));
      setIsLoading(false);
    };

    loadNearestStations();

    return () => {
      isCancelled = true;
    };
  }, [trigger, userLoc, selectedFuel]);

  if (!isMounted) return null;

  return (
    <>
      <button type="button" onClick={onClose} data-state={isVisible ? 'open' : 'closed'} className="ui-backdrop fixed inset-0 z-[3990] bg-slate-950/30 sm:backdrop-blur-[1px]" />

      <div className="fixed left-1/2 bottom-8 sm:bottom-24 z-[4000] w-[min(94vw,28rem)] translate-x-[-50%]">
        <div data-state={isVisible ? 'open' : 'closed'} className={`ui-presence rounded-2xl border p-4 sm:p-5 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('nearestSheds.headline')}</h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t('nearestSheds.subline')}</p>
          </div>
          <button onClick={onClose} className={`ui-pressable rounded-full px-3 py-1 text-xs font-bold ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            {t('nearestSheds.close')}
          </button>
        </div>

        <div className="flex items-center w-full justify-between gap-1 sm:gap-1.5 mb-5">
          {FUEL_OPTIONS.map((fuel) => {
            const isSelected = selectedFuel === fuel.id;
            return (
              <button
                key={fuel.id}
                onClick={() => setSelectedFuel(fuel.id)}
                className={`ui-pressable flex-1 py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold text-center whitespace-nowrap shadow-sm ${
                  isSelected 
                    ? 'bg-red-600 text-white' 
                    : isDark 
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700' 
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {fuel.label}
              </button>
            );
          })}
        </div>

        <div className="min-h-[150px]">
          {isLoading && (
             <div className={`flex items-center justify-center h-full rounded-xl py-8 ${isDark ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
               <span className="text-sm font-semibold">{t('nearestSheds.searching')}</span>
             </div>
          )}

          {!isLoading && message && (
            <div className={`flex items-center justify-center h-full rounded-xl py-8 text-center px-4 ${isDark ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
               <span className="text-sm font-semibold">{message}</span>
            </div>
          )}

          {!isLoading && !message && (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {results.map((station, index) => (
                <div key={station.id} className={`ui-card-hover rounded-xl border p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">#{index + 1} Match</span>
                      <h3 className={`text-sm font-bold leading-tight mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{station.name}</h3>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap shadow-sm ${isDark ? 'bg-slate-900 text-blue-400' : 'bg-white text-blue-600'}`}>
                      {station.distanceKm.toFixed(1)} km
                    </span>
                  </div>

                  <div className={`flex items-center gap-4 text-xs font-medium mb-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <p><span className={isDark ? 'text-slate-500' : 'text-slate-500'}>{t('nearestSheds.queueLabel')}</span> {station.queue_length || t('nearestSheds.queueUnknown')}</p>
                    <p><span className={isDark ? 'text-slate-500' : 'text-slate-500'}>{t('nearestSheds.confirmsLabel')}</span> {station.confirms ?? 0}</p>
                  </div>

                  <button
                    onClick={() => {
                      if (selectedFuel) {
                        // CHANGED: Pass the selected fuel back out
                        onShowStation(station.lat, station.lng, selectedFuel);
                      }
                      onClose();
                    }}
                    className={`ui-pressable w-full py-2.5 rounded-lg text-sm font-bold shadow-sm ${isDark ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    Show on Map
                  </button>

                </div>
              ))}
            </div>
          )}
        </div>

        </div>
      </div>
    </>
  );
}
