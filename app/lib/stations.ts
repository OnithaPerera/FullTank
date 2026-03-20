export type FuelKey = 'has_92' | 'has_95' | 'has_diesel' | 'has_super_diesel';
export type ReportFuelKey = 'fuel_92' | 'fuel_95' | 'diesel' | 'super_diesel';
export type FuelFilter = 'all' | '92' | '95' | 'diesel' | 'super_diesel';

export type Station = {
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
  last_updated: string | null;
  [key: string]: unknown;
};

export type StationReport = {
  id?: string;
  station_id: string;
  fuel_92?: boolean | null;
  fuel_95?: boolean | null;
  diesel?: boolean | null;
  super_diesel?: boolean | null;
  queue_level?: string | null;
  reporter_fingerprint?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

export const REPORTER_STORAGE_KEY = 'fulltank_reporter_id';
export const ALERT_COOLDOWN_STORAGE_KEY = 'fulltank_alert_cooldowns';
export const REPORTS_QUERY_COLUMNS =
  'id, station_id, fuel_92, fuel_95, diesel, super_diesel, queue_level, reporter_fingerprint, created_at';

export const fuelKeyToFilter: Record<FuelKey, FuelFilter> = {
  has_92: '92',
  has_95: '95',
  has_diesel: 'diesel',
  has_super_diesel: 'super_diesel',
};

export const alertLabelByFuelKey: Record<FuelKey, string> = {
  has_92: '92',
  has_95: '95',
  has_diesel: 'Diesel',
  has_super_diesel: 'Super Diesel',
};

export const reportFuelKeyByStationFuelKey: Record<FuelKey, ReportFuelKey> = {
  has_92: 'fuel_92',
  has_95: 'fuel_95',
  has_diesel: 'diesel',
  has_super_diesel: 'super_diesel',
};

const SEARCH_FIELD_EXCLUDES = new Set(['id', 'created_at', 'updated_at', 'last_updated']);
const LOCATION_LABEL_FIELDS = ['area', 'location', 'address', 'city', 'district', 'region'];

function toFiniteNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

export function coerceStation(record: Record<string, unknown>): Station {
  return {
    ...record,
    id: String(record.id ?? ''),
    name: typeof record.name === 'string' && record.name.trim() ? record.name.trim() : 'Unnamed station',
    lat: toFiniteNumber(record.lat),
    lng: toFiniteNumber(record.lng),
    has_92: Boolean(record.has_92),
    has_95: Boolean(record.has_95),
    has_diesel: Boolean(record.has_diesel),
    has_super_diesel: Boolean(record.has_super_diesel),
    queue_length: typeof record.queue_length === 'string' ? record.queue_length : null,
    confirms:
      record.confirms === null || record.confirms === undefined || Number.isNaN(Number(record.confirms))
        ? null
        : Number(record.confirms),
    last_updated: typeof record.last_updated === 'string' ? record.last_updated : null,
  };
}

export function coerceReport(record: Record<string, unknown>): StationReport {
  return {
    ...record,
    id: record.id ? String(record.id) : undefined,
    station_id: String(record.station_id ?? ''),
    fuel_92: record.fuel_92 === null || record.fuel_92 === undefined ? null : Boolean(record.fuel_92),
    fuel_95: record.fuel_95 === null || record.fuel_95 === undefined ? null : Boolean(record.fuel_95),
    diesel: record.diesel === null || record.diesel === undefined ? null : Boolean(record.diesel),
    super_diesel:
      record.super_diesel === null || record.super_diesel === undefined ? null : Boolean(record.super_diesel),
    queue_level: typeof record.queue_level === 'string' ? record.queue_level : null,
    reporter_fingerprint:
      typeof record.reporter_fingerprint === 'string' ? record.reporter_fingerprint : null,
    created_at: typeof record.created_at === 'string' ? record.created_at : null,
  };
}

export function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function getStationSearchText(station: Partial<Station>) {
  const values = Object.entries(station)
    .filter(([key, value]) => typeof value === 'string' && !SEARCH_FIELD_EXCLUDES.has(key))
    .map(([, value]) => String(value).trim())
    .filter(Boolean);

  if (typeof station.lat === 'number' && Number.isFinite(station.lat)) {
    values.push(station.lat.toFixed(4));
  }

  if (typeof station.lng === 'number' && Number.isFinite(station.lng)) {
    values.push(station.lng.toFixed(4));
  }

  return normalizeSearchText(values.join(' '));
}

export function getStationLocationLabel(station: Partial<Station>) {
  for (const field of LOCATION_LABEL_FIELDS) {
    const value = station[field];
    if (typeof value === 'string' && value.trim() && value.trim() !== station.name) {
      return value.trim();
    }
  }

  if (typeof station.lat === 'number' && typeof station.lng === 'number') {
    return `${station.lat.toFixed(4)}, ${station.lng.toFixed(4)}`;
  }

  return null;
}

function generateReporterFingerprint() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `ft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getReporterFingerprint() {
  if (typeof window === 'undefined') {
    return 'server';
  }

  try {
    const existing = localStorage.getItem(REPORTER_STORAGE_KEY);
    if (existing) return existing;

    const next = generateReporterFingerprint();
    localStorage.setItem(REPORTER_STORAGE_KEY, next);
    return next;
  } catch {
    return generateReporterFingerprint();
  }
}

export function buildStationReportPayload(
  station: Pick<Station, 'id' | FuelKey | 'queue_length'>,
  reporterFingerprint: string,
  overrides: Partial<Pick<Station, FuelKey | 'queue_length'>> = {},
): StationReport {
  const source = { ...station, ...overrides };

  return {
    station_id: station.id,
    fuel_92: Boolean(source.has_92),
    fuel_95: Boolean(source.has_95),
    diesel: Boolean(source.has_diesel),
    super_diesel: Boolean(source.has_super_diesel),
    queue_level: source.queue_length ?? 'Unknown',
    reporter_fingerprint: reporterFingerprint,
  };
}

export function pruneRecentReports(
  reports: StationReport[],
  recencyMinutes: number,
  nowMs = Date.now(),
) {
  const recencyWindowMs = recencyMinutes * 60 * 1000;

  return reports.filter((report) => {
    const createdAtMs = Date.parse(report.created_at ?? '');
    return Number.isFinite(createdAtMs) && nowMs - createdAtMs <= recencyWindowMs;
  });
}
