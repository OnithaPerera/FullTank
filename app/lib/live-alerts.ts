import {
  alertLabelByFuelKey,
  type FuelKey,
  pruneRecentReports,
  reportFuelKeyByStationFuelKey,
  type Station,
  type StationReport,
} from './stations';

export const VERIFIED_ALERT_THRESHOLD = 3;
export const VERIFIED_ALERT_RECENCY_MINUTES = 45;
export const VERIFIED_ALERT_COOLDOWN_MINUTES = 20;
export const VERIFIED_ALERT_VISIBLE_MS = 4800;

export type VerifiedAlertCandidate = {
  key: string;
  station: Station;
  fuelKey: FuelKey;
  fuelLabel: string;
  uniqueCount: number;
  latestReportAt: string | null;
};

type AlertOptions = {
  threshold?: number;
  recencyMinutes?: number;
  nowMs?: number;
};

function getRecentUniqueReporterKey(report: StationReport) {
  if (typeof report.reporter_fingerprint === 'string' && report.reporter_fingerprint.trim()) {
    return report.reporter_fingerprint.trim();
  }

  if (report.id) return `report:${report.id}`;
  if (report.created_at) return `time:${report.created_at}`;
  return 'unknown';
}

function isRecentTimestamp(timestamp: string | null | undefined, recencyMinutes: number, nowMs: number) {
  const parsed = Date.parse(timestamp ?? '');
  if (!Number.isFinite(parsed)) return false;
  return nowMs - parsed <= recencyMinutes * 60 * 1000;
}

export function getVerifiedAlertCandidatesFromReports(
  stations: Station[],
  reports: StationReport[],
  options: AlertOptions = {},
) {
  const threshold = options.threshold ?? VERIFIED_ALERT_THRESHOLD;
  const recencyMinutes = options.recencyMinutes ?? VERIFIED_ALERT_RECENCY_MINUTES;
  const nowMs = options.nowMs ?? Date.now();
  const stationById = new Map(stations.map((station) => [station.id, station]));
  const recentReports = pruneRecentReports(reports, recencyMinutes, nowMs);
  const counts = new Map<
    string,
    {
      station: Station;
      fuelKey: FuelKey;
      reporters: Set<string>;
      latestReportAt: string | null;
      latestReportMs: number;
    }
  >();

  for (const report of recentReports) {
    const station = stationById.get(report.station_id);
    if (!station) continue;

    const createdAtMs = Date.parse(report.created_at ?? '');
    if (!Number.isFinite(createdAtMs)) continue;

    for (const [stationFuelKey, reportFuelKey] of Object.entries(
      reportFuelKeyByStationFuelKey,
    ) as [FuelKey, keyof StationReport][]) {
      if (!station[stationFuelKey] || !report[reportFuelKey]) continue;

      const key = `${station.id}:${stationFuelKey}`;
      const current =
        counts.get(key) ??
        {
          station,
          fuelKey: stationFuelKey,
          reporters: new Set<string>(),
          latestReportAt: null,
          latestReportMs: 0,
        };

      current.reporters.add(getRecentUniqueReporterKey(report));

      if (createdAtMs >= current.latestReportMs) {
        current.latestReportMs = createdAtMs;
        current.latestReportAt = report.created_at ?? null;
      }

      counts.set(key, current);
    }
  }

  return Array.from(counts.values())
    .filter((entry) => entry.reporters.size >= threshold)
    .sort((a, b) => b.latestReportMs - a.latestReportMs)
    .map<VerifiedAlertCandidate>((entry) => ({
      key: `${entry.station.id}:${entry.fuelKey}`,
      station: entry.station,
      fuelKey: entry.fuelKey,
      fuelLabel: alertLabelByFuelKey[entry.fuelKey],
      uniqueCount: entry.reporters.size,
      latestReportAt: entry.latestReportAt,
    }));
}

export function getFallbackVerifiedAlertCandidates(
  stations: Station[],
  options: AlertOptions = {},
) {
  const threshold = options.threshold ?? VERIFIED_ALERT_THRESHOLD;
  const recencyMinutes = options.recencyMinutes ?? VERIFIED_ALERT_RECENCY_MINUTES;
  const nowMs = options.nowMs ?? Date.now();

  return stations
    .flatMap<VerifiedAlertCandidate>((station) => {
      if ((station.confirms ?? 0) < threshold) return [];
      if (!isRecentTimestamp(station.last_updated, recencyMinutes, nowMs)) return [];

      return (Object.keys(alertLabelByFuelKey) as FuelKey[])
        .filter((fuelKey) => Boolean(station[fuelKey]))
        .map((fuelKey) => ({
          key: `${station.id}:${fuelKey}`,
          station,
          fuelKey,
          fuelLabel: alertLabelByFuelKey[fuelKey],
          uniqueCount: station.confirms ?? threshold,
          latestReportAt: station.last_updated,
        }));
    })
    .sort((a, b) => Date.parse(b.latestReportAt ?? '') - Date.parse(a.latestReportAt ?? ''));
}
