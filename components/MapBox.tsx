'use client';

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState, type Dispatch, type MouseEvent, type SetStateAction } from 'react';
import { supabase } from '../app/lib/supabase';
import {
  buildStationReportPayload,
  coerceStation,
  getReporterFingerprint,
  type FuelKey,
  type Station,
} from '../app/lib/stations';
import { Map, MapPin, Clock, Edit3, ShieldCheck, Fuel, Droplets, X, type LucideIcon } from 'lucide-react';

// --- ICONS ---
const greenIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', iconSize: [25, 41], iconAnchor: [12, 41] });
const redIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', iconSize: [25, 41], iconAnchor: [12, 41] });
const yellowIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png', iconSize: [25, 41], iconAnchor: [12, 41] });
const blueIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', iconSize: [25, 41], iconAnchor: [12, 41] });
const staleIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png', iconSize: [25, 41], iconAnchor: [12, 41] });

// --- TYPES & DATA ---
const queueOptions = ['Unknown', 'Short (0-15m)', 'Medium (15-45m)', 'Long (45m+)'];
type FuelType = { key: FuelKey; filterValue: string; label: string; icon: LucideIcon; };
type EditFormState = { has_92: boolean; has_95: boolean; has_diesel: boolean; has_super_diesel: boolean; queue_length: string; };

const fuelTypes: FuelType[] = [
  { key: 'has_92', filterValue: '92', label: '92 Octane', icon: Fuel },
  { key: 'has_95', filterValue: '95', label: '95 Octane', icon: Fuel },
  { key: 'has_diesel', filterValue: 'diesel', label: 'Diesel', icon: Droplets },
  { key: 'has_super_diesel', filterValue: 'super_diesel', label: 'Super Diesel', icon: Droplets },
];

// --- HELPER FUNCTIONS ---
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radiusKm = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (radiusKm * c).toFixed(1);
}

function timeAgo(dateString: string | null | undefined) {
  if (!dateString) return 'No updates';
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHrs = Math.round(diffMins / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.round(diffHrs / 24)}d ago`;
}

function isStaleTimestamp(dateString: string | null | undefined) {
  if (!dateString) return false;
  const past = new Date(dateString);
  if (Number.isNaN(past.getTime())) return false;
  const diffMs = Date.now() - past.getTime();
  const threeHoursMs = 3 * 60 * 60 * 1000;
  return diffMs > threeHoursMs;
}

// --- MAP COMPONENTS ---
function LocationCenterer({ userLoc, recenterTrigger }: { userLoc: { lat: number; lng: number } | null; recenterTrigger: number; }) {
  const map = useMap();
  const hasCenteredRef = useRef(false);
  useEffect(() => {
    if (userLoc && !hasCenteredRef.current) {
      map.flyTo([userLoc.lat, userLoc.lng], 14, { animate: true, duration: 1.25 });
      hasCenteredRef.current = true;
    }
  }, [userLoc, map]);
  useEffect(() => {
    if (userLoc && recenterTrigger > 0) {
      map.flyTo([userLoc.lat, userLoc.lng], 15, { animate: true, duration: 0.95 });
    }
  }, [recenterTrigger, userLoc, map]);
  return null;
}

function TargetCenterer({ targetLoc, targetTrigger }: { targetLoc: { lat: number, lng: number } | null, targetTrigger: number }) {
  const map = useMap();
  useEffect(() => {
    if (targetLoc && targetTrigger > 0) {
      map.flyTo([targetLoc.lat, targetLoc.lng], 16, { animate: true, duration: 1.2 });
    }
  }, [targetLoc, targetTrigger, map]);
  return null;
}

function mergeStation(existingStations: Station[], nextStation: Station) {
  const hasStation = existingStations.some((station) => station.id === nextStation.id);
  if (!hasStation) return [...existingStations, nextStation];
  return existingStations.map((station) => (station.id === nextStation.id ? { ...station, ...nextStation } : station));
}

function StableBoundsTracker({ setStations, pauseBoundsUpdates, onMapClick }: { setStations: Dispatch<SetStateAction<Station[]>>; pauseBoundsUpdates: boolean; onMapClick: () => void; }) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cachedBoundsRef = useRef<L.LatLngBounds | null>(null);

  const map = useMapEvents({
    moveend: () => {
      if (pauseBoundsUpdates) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      
      timerRef.current = setTimeout(async () => {
        const currentBounds = map.getBounds();
        if (cachedBoundsRef.current && cachedBoundsRef.current.contains(currentBounds)) return; 
        
        const fetchBounds = currentBounds.pad(0.5);
        const { data, error } = await supabase.from('stations').select('*')
          .gte('lat', fetchBounds.getSouth()).lte('lat', fetchBounds.getNorth())
          .gte('lng', fetchBounds.getWest()).lte('lng', fetchBounds.getEast());
        
        if (error) {
          console.error("SUPABASE ERROR:", error.message);
        } else if (data) {
          cachedBoundsRef.current = fetchBounds;
          setStations((prev) => {
            return data.reduce(
              (current, station) => mergeStation(current, coerceStation(station as Record<string, unknown>)),
              prev,
            );
          });
        }
      }, 800);
    },
    click: () => onMapClick(),
  });

  useEffect(() => {
    if (!pauseBoundsUpdates) map.fire('moveend');
  }, [map, pauseBoundsUpdates]);

  return null;
}

// --- MAIN EXPORT ---
export default function MapBox({
  activeFilter,
  isDark,
  recenterTrigger,
  targetLoc,
  targetStationId,
  targetTrigger,
  onUserLocChange,
}: {
  activeFilter: string;
  isDark: boolean;
  recenterTrigger: number;
  targetLoc: { lat: number; lng: number } | null;
  targetStationId: string | null;
  targetTrigger: number;
  onUserLocChange?: (loc: { lat: number, lng: number }) => void;
}) {
  const [stations, setStations] = useState<Station[]>([]);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [interactedStations, setInteractedStations] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const savedActions = JSON.parse(localStorage.getItem('fulltank_actions') || '[]');
      return Array.isArray(savedActions) ? savedActions : [];
    } catch { return []; }
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [pendingFocusStationId, setPendingFocusStationId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({ has_92: false, has_95: false, has_diesel: false, has_super_diesel: false, queue_length: 'Unknown' });
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const nextLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLoc(nextLoc);
        onUserLocChange?.(nextLoc);
      });
    }
  }, [onUserLocChange]);

  useEffect(() => {
    const channel = supabase
      .channel('fulltank-map-stations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stations' }, (payload) => {
        const nextRecord = (
          payload.eventType === 'DELETE' ? payload.old : payload.new
        ) as Record<string, unknown> | null;
        if (!nextRecord) return;

        const nextStation = coerceStation(nextRecord);
        setStations((current) => {
          if (payload.eventType === 'DELETE') {
            return current.filter((station) => station.id !== nextStation.id);
          }

          if (!current.some((station) => station.id === nextStation.id)) {
            return current;
          }

          return mergeStation(current, nextStation);
        });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!targetStationId || targetTrigger === 0) return;

    let isCancelled = false;
    const frameId = window.requestAnimationFrame(() => {
      if (isCancelled) return;
      setEditingId(null);
      setSelectedStationId(null);
      setPendingFocusStationId(targetStationId);
    });

    const loadTargetStation = async () => {
      const { data, error } = await supabase.from('stations').select('*').eq('id', targetStationId).maybeSingle();

      if (isCancelled || error || !data) return;

      setStations((current) => mergeStation(current, coerceStation(data as Record<string, unknown>)));
    };

    loadTargetStation();

    return () => {
      isCancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [targetStationId, targetTrigger]);

  const recordInteraction = (id: string) => {
    if (interactedStations.includes(id)) return;
    const nextActions = [...interactedStations, id];
    setInteractedStations(nextActions);
    localStorage.setItem('fulltank_actions', JSON.stringify(nextActions));
  };

  const persistStationReport = async (
    station: Station,
    overrides: Partial<Pick<Station, FuelKey | 'queue_length'>> = {},
  ) => {
    const reporterFingerprint = getReporterFingerprint();
    const reportPayload = buildStationReportPayload(station, reporterFingerprint, overrides);
    const { error } = await supabase.from('reports').insert([reportPayload]);

    if (error) {
      console.warn('REPORT INSERT ERROR:', error.message);
    }
  };

  const openUpdateForm = (event: MouseEvent<HTMLButtonElement>, station: Station) => {
    event.preventDefault(); event.stopPropagation();
    setEditingId(station.id);
    setEditForm({ has_92: station.has_92, has_95: station.has_95, has_diesel: station.has_diesel, has_super_diesel: station.has_super_diesel, queue_length: station.queue_length || 'Unknown' });
  };

  const submitUpdate = async (event: MouseEvent<HTMLButtonElement>, id: string) => {
    event.preventDefault(); event.stopPropagation();
    const nowIso = new Date().toISOString();
    const nextStation = {
      has_92: editForm.has_92,
      has_95: editForm.has_95,
      has_diesel: editForm.has_diesel,
      has_super_diesel: editForm.has_super_diesel,
      queue_length: editForm.queue_length,
      confirms: 1,
      last_updated: nowIso,
    };

    await supabase.from('stations').update(nextStation).eq('id', id);
    const currentStation = stations.find((station) => station.id === id);
    if (currentStation) {
      await persistStationReport({ ...currentStation, ...nextStation });
    }

    setEditingId(null);
    recordInteraction(id);
    setStations((current) => current.map((station) => (station.id === id ? { ...station, ...nextStation } : station)));
  };

  const confirmFuel = async (event: MouseEvent<HTMLButtonElement>, id: string, currentConfirms: number) => {
    event.preventDefault(); event.stopPropagation();
    if (interactedStations.includes(id)) return;

    const nowIso = new Date().toISOString();
    const currentStation = stations.find((station) => station.id === id);
    const nextStation = currentStation
      ? { ...currentStation, confirms: currentConfirms + 1, last_updated: nowIso }
      : null;

    await supabase.from('stations').update({ confirms: currentConfirms + 1, last_updated: nowIso }).eq('id', id);
    if (nextStation) {
      await persistStationReport(nextStation);
    }

    recordInteraction(id);
    setStations((current) =>
      current.map((station) =>
        station.id === id ? { ...station, confirms: currentConfirms + 1, last_updated: nowIso } : station,
      ),
    );
  };

  const reportFalseInfo = async (event: MouseEvent<HTMLButtonElement>, id: string) => {
    event.preventDefault(); event.stopPropagation();
    if (interactedStations.includes(id)) return;

    const nowIso = new Date().toISOString();
    const nextStation = {
      has_92: false,
      has_95: false,
      has_diesel: false,
      has_super_diesel: false,
      queue_length: 'Unknown',
      confirms: 0,
      last_updated: nowIso,
    };

    await supabase.from('stations').update(nextStation).eq('id', id);
    const currentStation = stations.find((station) => station.id === id);
    if (currentStation) {
      await persistStationReport({ ...currentStation, ...nextStation });
    }

    recordInteraction(id);
    setStations((current) => current.map((station) => (station.id === id ? { ...station, ...nextStation } : station)));
  };

  const toggleFuelInEditForm = (event: MouseEvent<HTMLButtonElement>, field: FuelKey) => {
    event.preventDefault(); event.stopPropagation();
    setEditForm((current) => ({ ...current, [field]: !current[field] }));
  };

  useEffect(() => {
    if (!selectedStationId || typeof window === 'undefined') return;
    const marker = markerRefs.current[selectedStationId];
    if (!marker) return;
    const frameId = window.requestAnimationFrame(() => {
      if (!marker.isPopupOpen()) marker.openPopup();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [selectedStationId, stations]);

  useEffect(() => {
    if (!pendingFocusStationId || typeof window === 'undefined') return;

    const stationExists = stations.some((station) => station.id === pendingFocusStationId);
    if (!stationExists) return;

    const marker = markerRefs.current[pendingFocusStationId];
    if (!marker) return;

    const frameId = window.requestAnimationFrame(() => {
      if (!marker.isPopupOpen()) marker.openPopup();
      setSelectedStationId(pendingFocusStationId);
      setPendingFocusStationId(null);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [pendingFocusStationId, stations]);

  return (
    <MapContainer center={[6.8511, 79.8681]} zoom={14} style={{ height: '100%', width: '100%' }}>
      <TileLayer key={isDark ? 'dark' : 'light'} url={isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'} />
      <LocationCenterer userLoc={userLoc} recenterTrigger={recenterTrigger} />
      <TargetCenterer targetLoc={targetLoc} targetTrigger={targetTrigger} />
      <StableBoundsTracker setStations={setStations} pauseBoundsUpdates={selectedStationId !== null} onMapClick={() => setSelectedStationId(null)} />

      {userLoc && (
        <Marker position={[userLoc.lat, userLoc.lng]} icon={blueIcon}>
          <Popup className="custom-popup" closeButton={false}>
            <div className="p-3 w-48 font-sans">
              <p className="text-[10px] uppercase font-bold text-[var(--ui-brand)] tracking-wider">Your Location</p>
              <h3 className="mt-1 text-sm font-bold text-[var(--ui-text)]">You are here</h3>
            </div>
          </Popup>
        </Marker>
      )}

      {stations.map((station) => {
        const availableFuels = fuelTypes.filter((fuel) => Boolean(station[fuel.key]));
        const hasAnyFuel = availableFuels.length > 0;

        let isAvailable = false;
        if (activeFilter === 'all') {
          isAvailable = hasAnyFuel;
        } else {
          const selectedFuel = fuelTypes.find((fuel) => fuel.filterValue === activeFilter);
          isAvailable = selectedFuel ? Boolean(station[selectedFuel.key]) : false;
          if (!isAvailable) return null;
        }

        const isStale = hasAnyFuel && isStaleTimestamp(station.last_updated);
        const confirmationCount = station.confirms || 0;

        let currentIcon = redIcon;
        if (isAvailable) {
          if (isStale) currentIcon = staleIcon;
          else if (confirmationCount >= 3) currentIcon = greenIcon;
          else currentIcon = yellowIcon;
        }

        const stationState = !hasAnyFuel ? 'empty' : isStale ? 'stale' : confirmationCount >= 3 ? 'verified' : 'pending';
        const distanceStr = userLoc ? `${calculateDistance(userLoc.lat, userLoc.lng, station.lat, station.lng)} km away` : 'Distance loading';
        const gMapsLink = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
        const hasInteracted = interactedStations.includes(station.id);
        const displayTime = confirmationCount === 0 ? 'No updates yet' : timeAgo(station.last_updated);
        const isEditing = editingId === station.id;

        return (
          <Marker key={station.id} position={[station.lat, station.lng]} icon={currentIcon} ref={(marker) => { markerRefs.current[station.id] = marker; }} eventHandlers={{ click: () => setSelectedStationId(station.id), popupopen: () => setSelectedStationId(station.id), popupclose: () => { setSelectedStationId((current) => (current === station.id ? null : current)); setEditingId((current) => (current === station.id ? null : current)); } }}>
            <Popup className="custom-popup" closeButton={false}>
              
              <div className="p-4 w-full font-sans">
                
                {isEditing ? (
                  // --- EDIT MODE ---
                  <div>
                    <div className="flex justify-between items-center mb-5">
                      <div>
                        <h3 className="font-bold text-[var(--ui-text)] text-base">Update Station</h3>
                        <p className="text-xs text-[var(--ui-text-muted)] font-medium truncate max-w-[200px]" title={station.name}>{station.name}</p>
                      </div>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingId(null); setSelectedStationId(null); markerRefs.current[station.id]?.closePopup(); }} className="p-1.5 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] rounded-full transition-colors">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="mb-4">
                      <div className="text-[10px] uppercase font-bold text-[var(--ui-text-muted)] mb-2">Fuel Status</div>
                      <div className="grid grid-cols-2 gap-2">
                        {fuelTypes.map((fuel) => {
                          const Icon = fuel.icon;
                          const isSelected = Boolean(editForm[fuel.key]);
                          return (
                            <button key={fuel.key} onClick={(e) => toggleFuelInEditForm(e, fuel.key)} className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all ${isSelected ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-[var(--ui-surface-strong)] border-[var(--ui-border)] text-[var(--ui-text-muted)] hover:border-[var(--ui-border-strong)]'}`}>
                              <div className="flex items-center gap-1.5"><Icon size={14} className={isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--ui-text-muted)]'}/> <span className="text-xs font-bold">{fuel.label}</span></div>
                              <span className="text-[10px] font-semibold">{isSelected ? 'Available' : 'Empty'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mb-5">
                      <div className="text-[10px] uppercase font-bold text-[var(--ui-text-muted)] mb-2">Queue Length</div>
                      <select value={editForm.queue_length} onChange={(e) => setEditForm(c => ({...c, queue_length: e.target.value}))} onClick={e => e.stopPropagation()} className="w-full bg-[var(--ui-surface-muted)] border border-[var(--ui-border-strong)] text-[var(--ui-text)] text-sm font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--ui-brand)]">
                        {queueOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>

                    <button onClick={(e) => submitUpdate(e, station.id)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-md active:scale-[0.98]">
                      Save Update
                    </button>
                  </div>
                ) : (
                  // --- VIEW MODE ---
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-1.5">
                      <h3 className="font-bold text-[var(--ui-text)] text-lg leading-tight pr-2">{station.name}</h3>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedStationId(null); markerRefs.current[station.id]?.closePopup(); }} className="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                    
                    {/* Meta info */}
                    <div className="flex items-center gap-3 text-[11px] text-[var(--ui-text-muted)] font-semibold mb-4">
                      <span className="flex items-center gap-1"><MapPin size={12}/> {distanceStr}</span>
                      <span className="flex items-center gap-1"><Clock size={12}/> {displayTime}</span>
                    </div>

                    {/* Trust & Queue Cards */}
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      <div className="bg-[var(--ui-surface-muted)] rounded-xl p-3 border border-[var(--ui-border)]">
                        <div className="text-[10px] uppercase font-bold text-[var(--ui-text-muted)] mb-0.5">Queue</div>
                        <div className="text-sm font-bold text-[var(--ui-text)]">{station.queue_length || 'Unknown'}</div>
                      </div>
                      <div className={`rounded-xl p-3 border ${stationState === 'verified' ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/50' : 'bg-[var(--ui-surface-muted)] border-[var(--ui-border)]'}`}>
                        <div className="text-[10px] uppercase font-bold text-[var(--ui-text-muted)] mb-0.5">Trust</div>
                        <div className={`text-sm font-bold flex items-center gap-1.5 ${stationState === 'verified' ? 'text-emerald-700 dark:text-emerald-400' : 'text-[var(--ui-text)]'}`}>
                          {stationState === 'verified' && <ShieldCheck size={14} />}
                          {confirmationCount >= 3 ? 'Verified' : `${confirmationCount}/3 Confirms`}
                        </div>
                      </div>
                    </div>

                    {/* Fuel Status Grid */}
                    <div className="mb-5">
                      <div className="text-[10px] uppercase font-bold text-[var(--ui-text-muted)] mb-2">Fuel Availability</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {fuelTypes.map((fuel) => {
                          const Icon = fuel.icon;
                          const isPresent = Boolean(station[fuel.key]);
                          return (
                            <div key={fuel.key} className={`flex items-center gap-2 py-2 px-2.5 rounded-[10px] border ${isPresent ? 'bg-[var(--ui-surface-strong)] border-[var(--ui-border-strong)] text-[var(--ui-text)] shadow-sm' : 'bg-[var(--ui-surface-muted)] border-[var(--ui-border)] text-[var(--ui-text-muted)]'}`}>
                              <Icon size={14} className={isPresent ? "text-[var(--ui-brand)]" : "text-[var(--ui-text-muted)]"} />
                              <span className="text-xs font-bold">{fuel.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <a href={gMapsLink} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm active:scale-[0.98]">
                            <Map size={14} className="text-white"/> 
                            <span className="text-white">Directions</span>
                        </a>
                        <button onClick={(e) => openUpdateForm(e, station)} className="flex-[0.5] flex items-center justify-center gap-1.5 bg-[var(--ui-surface-muted)] hover:bg-[var(--ui-surface-strong)] text-[var(--ui-text)] border border-[var(--ui-border)] py-2.5 rounded-xl text-xs font-bold transition-colors active:scale-[0.98]">
                            <Edit3 size={14}/> Update
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={(e) => confirmFuel(e, station.id, confirmationCount)} disabled={hasInteracted} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${hasInteracted ? 'bg-[var(--ui-surface-muted)] text-[var(--ui-text-muted)] cursor-not-allowed border border-[var(--ui-border)]' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50 active:scale-[0.98]'}`}>Confirm</button>
                        <button onClick={(e) => reportFalseInfo(e, station.id)} disabled={hasInteracted} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${hasInteracted ? 'bg-[var(--ui-surface-muted)] text-[var(--ui-text-muted)] cursor-not-allowed border border-[var(--ui-border)]' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50 active:scale-[0.98]'}`}>Wrong Info</button>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
