'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

type ActiveFilter = 'all' | 'has_92' | 'has_95' | 'has_diesel';

type Station = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  has_92: boolean;
  has_95: boolean;
  has_diesel: boolean;
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
  activeFilter: ActiveFilter;
  trigger: boolean;
  onClose: () => void;
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
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

function matchesActiveFilter(station: Station, activeFilter: ActiveFilter) {
  if (activeFilter === 'all') {
    return station.has_92 || station.has_95 || station.has_diesel;
  }

  return Boolean(station[activeFilter]);
}

export default function NearestSheds({ userLoc, activeFilter, trigger, onClose }: NearestShedsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<RankedStation[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const closePanel = () => {
    onClose();
  };

  useEffect(() => {
    let isCancelled = false;

    const loadNearestStations = async () => {
      if (!trigger) return;

      setIsLoading(true);
      setMessage(null);
      setResults([]);

      if (!userLoc) {
        setMessage('No stations found');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.from('stations').select('*');

      if (isCancelled) return;

      if (error || !data) {
        setMessage('No stations found');
        setIsLoading(false);
        return;
      }

      const rankedStations = (data as Station[])
        .filter((station) => matchesActiveFilter(station, activeFilter))
        .map((station) => {
          const lat = Number(station.lat);
          const lng = Number(station.lng);
          const confirms = Number(station.confirms ?? 0);

          if (Number.isNaN(lat) || Number.isNaN(lng)) {
            return null;
          }

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
      setMessage(rankedStations.length === 0 ? 'No stations found' : null);
      setIsLoading(false);
    };

    loadNearestStations();

    return () => {
      isCancelled = true;
    };
  }, [trigger, userLoc, activeFilter]);

  if (!trigger) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close nearest sheds panel"
        onClick={closePanel}
        className="fixed inset-0 z-[3990] bg-slate-950/35"
      />

      <div className="fixed left-1/2 bottom-24 z-[4000] w-[min(92vw,28rem)] translate-x-[-50%] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Nearest Fuel Sheds</h2>
            <p className="text-sm text-slate-500">Top 3 ranked by distance, queue, and verification.</p>
          </div>

          <button
            type="button"
            onClick={closePanel}
            className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Close
          </button>
        </div>

        {isLoading && (
          <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-600">
            Finding the best nearby stations...
          </p>
        )}

        {!isLoading && message && (
          <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-600">
            {message}
          </p>
        )}

        {!isLoading && !message && (
          <div className="space-y-3">
            {results.map((station, index) => (
              <div key={station.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                      #{index + 1} Match
                    </p>
                    <h3 className="text-base font-bold text-slate-900">{station.name}</h3>
                  </div>

                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                    {station.distanceKm.toFixed(1)} km
                  </span>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                  <p>Queue: {station.queue_length || 'Unknown'}</p>
                  <p>Confirms: {station.confirms ?? 0}</p>
                </div>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Navigate
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
