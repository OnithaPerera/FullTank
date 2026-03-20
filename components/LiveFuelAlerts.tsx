'use client';

import { BellRing, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../app/lib/supabase';
import {
  getFallbackVerifiedAlertCandidates,
  getVerifiedAlertCandidatesFromReports,
  VERIFIED_ALERT_COOLDOWN_MINUTES,
  VERIFIED_ALERT_RECENCY_MINUTES,
  VERIFIED_ALERT_VISIBLE_MS,
  type VerifiedAlertCandidate,
} from '../app/lib/live-alerts';
import {
  ALERT_COOLDOWN_STORAGE_KEY,
  coerceReport,
  pruneRecentReports,
  REPORTS_QUERY_COLUMNS,
  type FuelKey,
  type Station,
  type StationReport,
} from '../app/lib/stations';

type LiveFuelAlertsProps = {
  stations: Station[];
  isDark: boolean;
  onFocusStation?: (station: Station, fuelKey: FuelKey) => void;
};

type QueuedAlert = VerifiedAlertCandidate & {
  message: string;
};

function readCooldowns() {
  if (typeof window === 'undefined') return {} as Record<string, number>;

  try {
    const raw = localStorage.getItem(ALERT_COOLDOWN_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeCooldowns(cooldowns: Record<string, number>) {
  if (typeof window === 'undefined') return;

  const nowMs = Date.now();
  const maxAgeMs = VERIFIED_ALERT_COOLDOWN_MINUTES * 60 * 1000 * 4;
  const nextEntries = Object.entries(cooldowns).filter(([, value]) => nowMs - value <= maxAgeMs);

  try {
    localStorage.setItem(ALERT_COOLDOWN_STORAGE_KEY, JSON.stringify(Object.fromEntries(nextEntries)));
  } catch {
    // Ignore storage write failures.
  }
}

export default function LiveFuelAlerts({ stations, isDark, onFocusStation }: LiveFuelAlertsProps) {
  const [reports, setReports] = useState<StationReport[]>([]);
  const [useFallbackCounts, setUseFallbackCounts] = useState(false);
  const [alerts, setAlerts] = useState<QueuedAlert[]>([]);
  const initializedRef = useRef(false);
  const previousEligibleKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let isCancelled = false;
    const sinceIso = new Date(
      Date.now() - VERIFIED_ALERT_RECENCY_MINUTES * 60 * 1000,
    ).toISOString();

    const loadRecentReports = async () => {
      const { data, error } = await supabase
        .from('reports')
        .select(REPORTS_QUERY_COLUMNS)
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false });

      if (isCancelled) return;

      if (error) {
        console.warn('REPORT FETCH ERROR:', error.message);
        setUseFallbackCounts(true);
        return;
      }

      setReports((data ?? []).map((report) => coerceReport(report as Record<string, unknown>)));
      setUseFallbackCounts(false);
    };

    loadRecentReports();

    const channel = supabase
      .channel('fulltank-live-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
        if (!payload.new) return;

        const nextReport = coerceReport(payload.new as Record<string, unknown>);
        setReports((current) =>
          pruneRecentReports([nextReport, ...current], VERIFIED_ALERT_RECENCY_MINUTES),
        );
      })
      .subscribe();

    const pruneTimer = window.setInterval(() => {
      setReports((current) => pruneRecentReports(current, VERIFIED_ALERT_RECENCY_MINUTES));
    }, 60_000);

    return () => {
      isCancelled = true;
      window.clearInterval(pruneTimer);
      void supabase.removeChannel(channel);
    };
  }, []);

  const candidates = useFallbackCounts
    ? getFallbackVerifiedAlertCandidates(stations)
    : getVerifiedAlertCandidatesFromReports(stations, reports);

  useEffect(() => {
    const eligibleKeys = new Set(candidates.map((candidate) => candidate.key));

    if (!initializedRef.current) {
      previousEligibleKeysRef.current = eligibleKeys;
      initializedRef.current = true;
      return;
    }

    const cooldowns = readCooldowns();
    const nowMs = Date.now();
    const nextAlerts = candidates
      .filter((candidate) => !previousEligibleKeysRef.current.has(candidate.key))
      .filter((candidate) => nowMs - (cooldowns[candidate.key] ?? 0) >= VERIFIED_ALERT_COOLDOWN_MINUTES * 60 * 1000)
      .map<QueuedAlert>((candidate) => ({
        ...candidate,
        message: `${candidate.fuelLabel} available at ${candidate.station.name} — verified by ${candidate.uniqueCount} users`,
      }));

    if (nextAlerts.length > 0) {
      for (const alert of nextAlerts) {
        cooldowns[alert.key] = nowMs;
      }

      writeCooldowns(cooldowns);

      setAlerts((current) => {
        const knownKeys = new Set(current.map((item) => item.key));

        return [
          ...current,
          ...nextAlerts.filter((alert) => !knownKeys.has(alert.key)),
        ];
      });
    }

    previousEligibleKeysRef.current = eligibleKeys;
  }, [candidates]);

  const currentAlert = alerts[0] ?? null;

  useEffect(() => {
    if (!currentAlert) return;

    const timerId = window.setTimeout(() => {
      setAlerts((current) => (current[0]?.key === currentAlert.key ? current.slice(1) : current));
    }, VERIFIED_ALERT_VISIBLE_MS);

    return () => window.clearTimeout(timerId);
  }, [currentAlert]);

  if (!currentAlert) return null;

  const onOpenAlert = () => {
    onFocusStation?.(currentAlert.station, currentAlert.fuelKey);
    setAlerts((current) => current.slice(1));
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[4.75rem] z-[2050] flex justify-center px-3 sm:top-[5.25rem]">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-[24px] border px-4 py-3 shadow-[var(--ui-shadow)] backdrop-blur-xl ${
          isDark
            ? 'border-slate-700/80 bg-slate-900/92 text-slate-100'
            : 'border-slate-200 bg-white/95 text-slate-900'
        }`}
      >
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-500">
          <BellRing size={18} />
        </div>

        <button type="button" onClick={onOpenAlert} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-500">
            <ShieldCheck size={14} />
            Verified Live
          </div>
          <p className="mt-1 text-sm font-semibold leading-5">{currentAlert.message}</p>
        </button>

        <button
          type="button"
          onClick={() => setAlerts((current) => current.slice(1))}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
            isDark
              ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
              : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
          aria-label="Dismiss live alert"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
