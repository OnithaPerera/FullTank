'use client';

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState, type Dispatch, type MouseEvent, type SetStateAction } from 'react';
import { supabase } from '../app/lib/supabase';
import {
  Map,
  AlertTriangle,
  MapPin,
  Clock,
  Users,
  Edit3,
  ShieldCheck,
  Fuel,
  Droplets,
  X,
  type LucideIcon,
} from 'lucide-react';

// --- ICONS ---
const greenIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', iconSize: [25, 41], iconAnchor: [12, 41] });
const redIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', iconSize: [25, 41], iconAnchor: [12, 41] });
const yellowIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png', iconSize: [25, 41], iconAnchor: [12, 41] });
const blueIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', iconSize: [25, 41], iconAnchor: [12, 41] });
const staleIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png', iconSize: [25, 41], iconAnchor: [12, 41] });

// --- TYPES & DATA ---
const queueOptions = ['Unknown', 'Short (0-15m)', 'Medium (15-45m)', 'Long (45m+)'];
type FuelKey = 'has_92' | 'has_95' | 'has_diesel' | 'has_super_diesel';
type FuelType = { key: FuelKey; filterValue: string; label: string; icon: LucideIcon; };
type Station = { id: string; name: string; lat: number; lng: number; has_92: boolean; has_95: boolean; has_diesel: boolean; has_super_diesel: boolean; queue_length: string | null; confirms: number | null; last_updated: string | null; };
type EditFormState = { has_92: boolean; has_95: boolean; has_diesel: boolean; has_super_diesel: boolean; queue_length: string; };

const fuelTypes: FuelType[] = [
  { key: 'has_92', filterValue: '92', label: '92 Octane', icon: Fuel },
  { key: 'has_95', filterValue: '95', label: '95 Octane', icon: Fuel },
  { key: 'has_diesel', filterValue: 'diesel', label: 'Diesel', icon: Droplets },
  { key: 'has_super_diesel', filterValue: 'super_diesel', label: 'Super Diesel', icon: Droplets },
];

const stationStatusMeta = {
  empty: { label: 'Empty', description: 'No fuel is currently reported at this station.', badgeClass: 'border-red-200 bg-red-50 text-red-700', iconWrapClass: 'bg-red-100 text-red-600', progressClass: 'bg-red-500' },
  pending: { label: 'Pending', description: 'Fuel was reported recently and still needs more community confirmations.', badgeClass: 'border-amber-200 bg-amber-50 text-amber-700', iconWrapClass: 'bg-amber-100 text-amber-700', progressClass: 'bg-amber-400' },
  verified: { label: 'Verified', description: 'Community confirmations indicate fuel is available right now.', badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700', iconWrapClass: 'bg-emerald-100 text-emerald-700', progressClass: 'bg-emerald-500' },
  stale: { label: 'Stale', description: 'The last report is older than 3 hours, so availability may have changed.', badgeClass: 'border-slate-200 bg-slate-100 text-slate-700', iconWrapClass: 'bg-slate-200 text-slate-700', progressClass: 'bg-slate-400' },
};

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

// --- MAP COMPONENTS (MUST BE OUTSIDE MAPBOX) ---
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

function StableBoundsTracker({ setStations, pauseBoundsUpdates, onMapClick }: { setStations: Dispatch<SetStateAction<Station[]>>; pauseBoundsUpdates: boolean; onMapClick: () => void; }) {
  const map = useMapEvents({
    moveend: async () => {
      if (pauseBoundsUpdates) return;
      const bounds = map.getBounds();
      const { data } = await supabase.from('stations').select('*').gte('lat', bounds.getSouth()).lte('lat', bounds.getNorth()).gte('lng', bounds.getWest()).lte('lng', bounds.getEast());
      if (data) setStations(data);
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
  targetTrigger,
  onUserLocChange 
}: {
  activeFilter: string;
  isDark: boolean;
  recenterTrigger: number;
  targetLoc: { lat: number; lng: number } | null;
  targetTrigger: number;
  onUserLocChange?: (loc: { lat: number, lng: number }) => void 
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

    const channel = supabase.channel('public:stations')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stations' }, (payload) => {
        const nextStation = payload.new as Station;
        setStations((current) => current.map((station) => (station.id === nextStation.id ? nextStation : station)));
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [onUserLocChange]);

  const recordInteraction = (id: string) => {
    if (interactedStations.includes(id)) return;
    const nextActions = [...interactedStations, id];
    setInteractedStations(nextActions);
    localStorage.setItem('fulltank_actions', JSON.stringify(nextActions));
  };

  const openUpdateForm = (event: MouseEvent<HTMLButtonElement>, station: Station) => {
    event.preventDefault(); event.stopPropagation();
    setEditingId(station.id);
    setEditForm({ has_92: station.has_92, has_95: station.has_95, has_diesel: station.has_diesel, has_super_diesel: station.has_super_diesel, queue_length: station.queue_length || 'Unknown' });
  };

  const submitUpdate = async (event: MouseEvent<HTMLButtonElement>, id: string) => {
    event.preventDefault(); event.stopPropagation();
    await supabase.from('stations').update({ has_92: editForm.has_92, has_95: editForm.has_95, has_diesel: editForm.has_diesel, has_super_diesel: editForm.has_super_diesel, queue_length: editForm.queue_length, confirms: 1, last_updated: new Date().toISOString() }).eq('id', id);
    setEditingId(null); recordInteraction(id);
  };

  const confirmFuel = async (event: MouseEvent<HTMLButtonElement>, id: string, currentConfirms: number) => {
    event.preventDefault(); event.stopPropagation();
    if (interactedStations.includes(id)) return;
    await supabase.from('stations').update({ confirms: currentConfirms + 1 }).eq('id', id);
    recordInteraction(id);
  };

  const reportFalseInfo = async (event: MouseEvent<HTMLButtonElement>, id: string) => {
    event.preventDefault(); event.stopPropagation();
    if (interactedStations.includes(id)) return;
    await supabase.from('stations').update({ has_92: false, has_95: false, has_diesel: false, has_super_diesel: false, queue_length: 'Unknown', confirms: 0, last_updated: new Date().toISOString() }).eq('id', id);
    recordInteraction(id);
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

  return (
    <MapContainer center={[6.8511, 79.8681]} zoom={14} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        key={isDark ? 'dark' : 'light'}
        url={isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'}
      />

      <LocationCenterer userLoc={userLoc} recenterTrigger={recenterTrigger} />
      <TargetCenterer targetLoc={targetLoc} targetTrigger={targetTrigger} />
      <StableBoundsTracker setStations={setStations} pauseBoundsUpdates={selectedStationId !== null} onMapClick={() => setSelectedStationId(null)} />

      {userLoc && (
        <Marker position={[userLoc.lat, userLoc.lng]} icon={blueIcon}>
          <Popup className="custom-popup">
            <div className="station-popup">
              <p className="ui-kicker">Your Location</p>
              <h3 className="mt-1 text-base font-semibold">You are here</h3>
              <p className="ui-text-muted mt-2 text-sm leading-5">FullTank uses this position to estimate nearby distance to stations.</p>
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
        const statusMeta = stationStatusMeta[stationState];
        const distanceStr = userLoc ? `${calculateDistance(userLoc.lat, userLoc.lng, station.lat, station.lng)} km away` : 'Distance loading';
        const gMapsLink = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
        const hasInteracted = interactedStations.includes(station.id);
        const displayTime = confirmationCount === 0 ? 'No updates yet' : timeAgo(station.last_updated);
        const isEditing = editingId === station.id;
        const remainingConfirmations = Math.max(3 - confirmationCount, 0);

        return (
          <Marker key={station.id} position={[station.lat, station.lng]} icon={currentIcon} ref={(marker) => { markerRefs.current[station.id] = marker; }} eventHandlers={{ click: () => setSelectedStationId(station.id), popupopen: () => setSelectedStationId(station.id), popupclose: () => { setSelectedStationId((current) => (current === station.id ? null : current)); setEditingId((current) => (current === station.id ? null : current)); } }}>
            <Popup className="custom-popup">
              <div className="station-popup">
                <div className="flex items-start gap-2.5">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${statusMeta.iconWrapClass}`}>
                    {stationState === 'verified' ? <ShieldCheck size={18} /> : stationState === 'empty' ? <AlertTriangle size={18} /> : <Clock size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="ui-kicker">Station</p>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                    </div>
                    <h3 className="mt-1 text-lg font-semibold leading-tight">{station.name}</h3>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      <span className="ui-panel-muted inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] shadow-none"><MapPin size={12} />{distanceStr}</span>
                      <span className="ui-panel-muted inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] shadow-none"><Clock size={12} />{displayTime}</span>
                    </div>
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--ui-border)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="ui-kicker">Update</p>
                        <h4 className="mt-1 text-sm font-semibold">Refresh station data</h4>
                        <p className="ui-text-muted mt-1 text-[13px] leading-5">Set current fuel availability and choose the queue estimate.</p>
                      </div>
                      <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setEditingId(null); }} className="ui-button-icon h-9 w-9 shrink-0" aria-label="Close update form"><X size={16} /></button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {fuelTypes.map((fuel) => {
                        const Icon = fuel.icon;
                        const isSelected = Boolean(editForm[fuel.key]);
                        return (
                          <button key={fuel.key} type="button" onClick={(event) => toggleFuelInEditForm(event, fuel.key)} className={`rounded-[18px] border px-3 py-2.5 text-left transition-colors ${isSelected ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
                            <div className="flex items-center gap-2"><Icon size={14} /><span className="text-[13px] font-semibold leading-4">{fuel.label}</span></div>
                            <p className="mt-1 text-[11px] font-medium">{isSelected ? 'Available now' : 'Empty now'}</p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3">
                      <label className="ui-text-muted mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em]">Queue estimate</label>
                      <select value={editForm.queue_length} onChange={(event) => setEditForm((current) => ({ ...current, queue_length: event.target.value }))} onClick={(event) => event.stopPropagation()} className="ui-select">
                        {queueOptions.map((queueOption) => (<option key={queueOption} value={queueOption}>{queueOption}</option>))}
                      </select>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={(event) => submitUpdate(event, station.id)} className="ui-button-brand h-10 w-full">Save Update</button>
                      <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setEditingId(null); }} className="ui-button-neutral h-10 w-full">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="ui-text-muted mt-2 text-[13px] leading-5">{statusMeta.description}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="ui-panel-muted rounded-[18px] px-3 py-2.5 shadow-none">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ui-text-muted)]"><Users size={12} />Queue</div>
                        <p className="mt-1.5 text-sm font-semibold">{station.queue_length || 'Unknown'}</p>
                      </div>
                      <div className="ui-panel-muted rounded-[18px] px-3 py-2.5 shadow-none">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ui-text-muted)]"><ShieldCheck size={12} />Trust</div>
                        <p className="mt-1.5 text-sm font-semibold leading-5">{confirmationCount >= 3 ? 'Verified' : `${confirmationCount}/3 confirmations`}</p>
                        <div className="mt-1.5 flex gap-1.5">
                          {[0, 1, 2].map((index) => (<span key={index} className={`h-1.5 flex-1 rounded-full ${index < Math.min(confirmationCount, 3) ? statusMeta.progressClass : 'bg-slate-200'}`}></span>))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">Fuel status</p>
                        <span className="ui-text-muted text-[11px]">{confirmationCount >= 3 ? 'Verified by community' : remainingConfirmations > 0 ? `${remainingConfirmations} more needed` : 'Awaiting fresh report'}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {fuelTypes.map((fuel) => {
                          const Icon = fuel.icon;
                          const isPresent = Boolean(station[fuel.key]);
                          return (
                            <div key={fuel.key} className={`flex items-center justify-between gap-2 rounded-[16px] border px-3 py-2 ${isPresent ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
                              <div className="flex min-w-0 items-center gap-1.5"><Icon size={14} className="shrink-0" /><span className="text-[13px] font-semibold leading-4">{fuel.label}</span></div>
                              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em]">{isPresent ? 'Available' : 'Empty'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <a href={gMapsLink} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="ui-button-brand flex h-10 w-full justify-center no-underline"><Map size={15} />Directions</a>
                      <button type="button" onClick={(event) => openUpdateForm(event, station)} className="ui-button-neutral h-10 w-full"><Edit3 size={15} />Update</button>
                      <button type="button" onClick={(event) => confirmFuel(event, station.id, confirmationCount)} disabled={hasInteracted} className={`rounded-[14px] border px-4 py-2 text-sm font-semibold transition-colors ${hasInteracted ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>Confirm</button>
                      <button type="button" onClick={(event) => reportFalseInfo(event, station.id)} disabled={hasInteracted} className={`rounded-[14px] border px-4 py-2 text-sm font-semibold transition-colors ${hasInteracted ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`}>Wrong Info</button>
                    </div>

                    {hasInteracted && <p className="ui-text-muted mt-2 text-xs leading-5 text-center">You have already sent feedback for this station on this device.</p>}
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}