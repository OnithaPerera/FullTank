'use client';

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { supabase } from '../app/lib/supabase';
import { Map, CheckCircle, AlertTriangle, MapPin, Clock, Users, Edit3 } from 'lucide-react';

const greenIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', iconSize: [25, 41], iconAnchor: [12, 41] });
const redIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', iconSize: [25, 41], iconAnchor: [12, 41] });
const yellowIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png', iconSize: [25, 41], iconAnchor: [12, 41] });
const blueIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', iconSize: [25, 41], iconAnchor: [12, 41] });
const staleIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png', iconSize: [25, 41], iconAnchor: [12, 41] });

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

function timeAgo(dateString: string) {
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
  if (!dateString) return true;
  const past = new Date(dateString);
  if (Number.isNaN(past.getTime())) return true;
  const diffMs = Date.now() - past.getTime();
  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  return diffMs > THREE_HOURS_MS;
}

function LocationCenterer({ userLoc, recenterTrigger }: { userLoc: { lat: number, lng: number } | null, recenterTrigger: number }) {
  const map = useMap();
  const [hasCentered, setHasCentered] = useState(false);

  useEffect(() => {
    if (userLoc && !hasCentered) {
      map.flyTo([userLoc.lat, userLoc.lng], 14, { animate: true, duration: 1.5 });
      setHasCentered(true);
    }
  }, [userLoc, hasCentered, map]);

  useEffect(() => {
    if (userLoc && recenterTrigger > 0) {
      map.flyTo([userLoc.lat, userLoc.lng], 15, { animate: true, duration: 1.0 });
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

function MapBoundsTracker({ setStations }: { setStations: any }) {
  const map = useMapEvents({
    moveend: async () => {
      const bounds = map.getBounds();
      const { data } = await supabase.from('stations').select('*')
        .gte('lat', bounds.getSouth()).lte('lat', bounds.getNorth())
        .gte('lng', bounds.getWest()).lte('lng', bounds.getEast());
      if (data) setStations(data);
    },
  });
  
  useEffect(() => { map.fire('moveend'); }, [map]);
  return null;
}

export default function MapBox({ 
  activeFilter, 
  isDark, 
  recenterTrigger,
  targetLoc,
  targetTrigger,
  onUserLocChange 
}: { 
  activeFilter: string, 
  isDark: boolean, 
  recenterTrigger: number,
  targetLoc: { lat: number; lng: number } | null,
  targetTrigger: number,
  onUserLocChange?: (loc: { lat: number, lng: number }) => void 
}) {
  const [stations, setStations] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [interactedStations, setInteractedStations] = useState<string[]>([]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
    has_92: false, 
    has_95: false, 
    has_diesel: false, 
    has_super_diesel: false, 
    queue_length: 'Unknown' 
  });

  useEffect(() => {
    const savedActions = JSON.parse(localStorage.getItem('fulltank_actions') || '[]');
    setInteractedStations(savedActions);
  }, []);

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
    const channel = supabase.channel('public:stations')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stations' }, (payload) => {
        setStations((current) => current.map(st => st.id === payload.new.id ? payload.new : st));
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const recordInteraction = (id: string) => {
    const newActions = [...interactedStations, id];
    setInteractedStations(newActions);
    localStorage.setItem('fulltank_actions', JSON.stringify(newActions));
  };

  const openUpdateForm = (e: any, station: any) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(station.id);
    setEditForm({
      has_92: station.has_92,
      has_95: station.has_95,
      has_diesel: station.has_diesel,
      has_super_diesel: station.has_super_diesel,
      queue_length: station.queue_length || 'Unknown'
    });
  };

  const submitUpdate = async (e: any, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    await supabase.from('stations').update({ 
      has_92: editForm.has_92, 
      has_95: editForm.has_95, 
      has_diesel: editForm.has_diesel, 
      has_super_diesel: editForm.has_super_diesel,
      queue_length: editForm.queue_length,
      confirms: 1, 
      last_updated: new Date().toISOString() 
    }).eq('id', id);
    
    setEditingId(null);
    recordInteraction(id);
  };

  const confirmFuel = async (e: any, id: string, currentConfirms: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (interactedStations.includes(id)) return; 
    await supabase.from('stations').update({ confirms: currentConfirms + 1 }).eq('id', id);
    recordInteraction(id);
  };

  const reportFalseInfo = async (e: any, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (interactedStations.includes(id)) return;
    await supabase.from('stations').update({ 
      has_92: false, 
      has_95: false, 
      has_diesel: false, 
      has_super_diesel: false,
      queue_length: 'Unknown', 
      confirms: 0, 
      last_updated: new Date().toISOString() 
    }).eq('id', id);
    recordInteraction(id);
  };

  return (
    <MapContainer center={[6.8511, 79.8681]} zoom={14} style={{ height: '100%', width: '100%' }}>
      <TileLayer 
        key={isDark ? 'dark' : 'light'} 
        url={isDark 
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
          : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"} 
      />
      
      <LocationCenterer userLoc={userLoc} recenterTrigger={recenterTrigger} />
      <TargetCenterer targetLoc={targetLoc} targetTrigger={targetTrigger} />
      <MapBoundsTracker setStations={setStations} />

      {userLoc && (
        <Marker position={[userLoc.lat, userLoc.lng]} icon={blueIcon}>
          <Popup><strong className="text-gray-900">Your Location</strong></Popup>
        </Marker>
      )}

      {stations.map((station) => {
        let isAvailable = false;
        
        if (activeFilter === 'all') {
          isAvailable = station.has_92 || station.has_95 || station.has_diesel || station.has_super_diesel;
        } else {
          isAvailable = Boolean(station[activeFilter]);
          if (!isAvailable) return null;
        }

        const isStale = station.confirms === 0 || isStaleTimestamp(station.last_updated);
        let currentIcon = redIcon;
        if (isStale) {
          currentIcon = staleIcon;
        } else if (isAvailable) {
          if (station.confirms >= 3) currentIcon = greenIcon;
          else currentIcon = yellowIcon;
        }

        const distanceStr = userLoc ? `${calculateDistance(userLoc.lat, userLoc.lng, station.lat, station.lng).toFixed(1)} km` : '...';
        const gMapsLink = `https://www.google.com/maps/dir/?api=1&destination=$${station.lat},${station.lng}`;
        const hasInteracted = interactedStations.includes(station.id);
        const displayTime = station.confirms === 0 ? 'No updates' : timeAgo(station.last_updated);
        const isEditing = editingId === station.id;

        return (
          <Marker key={station.id} position={[station.lat, station.lng]} icon={currentIcon}>
            <Popup className="custom-popup">
              <div className="flex flex-col w-[250px] font-sans">
                
                <div className="mb-3">
                  <h3 className="text-gray-900 text-lg font-bold m-0 leading-tight">{station.name}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <span className="flex items-center text-red-600 font-semibold text-xs"><MapPin size={12} className="mr-1" /> {distanceStr}</span>
                    <span className="flex items-center text-gray-500 font-medium text-xs"><Clock size={12} className="mr-1" /> {displayTime}</span>
                  </div>
                </div>

                {isEditing ? (
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs font-bold text-gray-700 mb-2">Update Availability:</p>
                    <div className="flex flex-col gap-2 mb-3">
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditForm({...editForm, has_92: !editForm.has_92})}} className={`px-3 py-2 rounded-md text-white text-sm font-semibold ${editForm.has_92 ? 'bg-green-600' : 'bg-red-600'}`}>92 Octane: {editForm.has_92 ? 'Yes' : 'No'}</button>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditForm({...editForm, has_95: !editForm.has_95})}} className={`px-3 py-2 rounded-md text-white text-sm font-semibold ${editForm.has_95 ? 'bg-green-600' : 'bg-red-600'}`}>95 Octane: {editForm.has_95 ? 'Yes' : 'No'}</button>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditForm({...editForm, has_diesel: !editForm.has_diesel})}} className={`px-3 py-2 rounded-md text-white text-sm font-semibold ${editForm.has_diesel ? 'bg-green-600' : 'bg-red-600'}`}>Diesel: {editForm.has_diesel ? 'Yes' : 'No'}</button>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditForm({...editForm, has_super_diesel: !editForm.has_super_diesel})}} className={`px-3 py-2 rounded-md text-white text-sm font-semibold ${editForm.has_super_diesel ? 'bg-green-600' : 'bg-red-600'}`}>Super Diesel: {editForm.has_super_diesel ? 'Yes' : 'No'}</button>
                    </div>
                    
                    <p className="text-xs font-bold text-gray-700 mb-1">Queue Length:</p>
                    <select 
                      value={editForm.queue_length} 
                      onChange={(e) => setEditForm({...editForm, queue_length: e.target.value})}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full border border-gray-300 rounded p-1 mb-3 text-sm text-gray-900 bg-white"
                    >
                      <option value="Unknown">Unknown</option>
                      <option value="Short (0-15m)">Short (0-15m)</option>
                      <option value="Medium (15-45m)">Medium (15-45m)</option>
                      <option value="Long (45m+)">Long (45m+)</option>
                    </select>

                    <div className="flex gap-2">
                      <button type="button" onClick={(e) => submitUpdate(e, station.id)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded font-bold">Save</button>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingId(null); }} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs py-2 rounded font-bold">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <a href={gMapsLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white text-sm py-2 rounded-md font-bold transition-colors mb-3 no-underline">
                      <Map size={16} className="mr-2" /> Open in Google Maps
                    </a>

                    <div className="bg-gray-50 rounded p-2 mb-3 border border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600 flex items-center"><Users size={14} className="mr-1"/> Queue:</span>
                      <span className="text-xs font-bold text-gray-900">{station.queue_length || 'Unknown'}</span>
                    </div>

                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-500 text-xs font-medium">Community Status:</span>
                        {station.confirms >= 3 ? (
                           <span className="flex items-center text-green-600 font-bold text-xs"><CheckCircle size={12} className="mr-1"/> Verified</span>
                        ) : (
                           <span className="flex items-center text-yellow-600 font-bold text-xs"><AlertTriangle size={12} className="mr-1"/> Pending ({station.confirms}/3)</span>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 mb-3">
                        <div className={`flex items-center justify-between px-3 py-1.5 rounded-md text-white text-sm font-semibold ${station.has_92 ? 'bg-green-600' : 'bg-red-600'}`}>
                          <span>92 Octane</span> <span>{station.has_92 ? 'Available' : 'Empty'}</span>
                        </div>
                        <div className={`flex items-center justify-between px-3 py-1.5 rounded-md text-white text-sm font-semibold ${station.has_95 ? 'bg-green-600' : 'bg-red-600'}`}>
                          <span>95 Octane</span> <span>{station.has_95 ? 'Available' : 'Empty'}</span>
                        </div>
                        <div className={`flex items-center justify-between px-3 py-1.5 rounded-md text-white text-sm font-semibold ${station.has_diesel ? 'bg-green-600' : 'bg-red-600'}`}>
                          <span>Diesel</span> <span>{station.has_diesel ? 'Available' : 'Empty'}</span>
                        </div>
                        <div className={`flex items-center justify-between px-3 py-1.5 rounded-md text-white text-sm font-semibold ${station.has_super_diesel ? 'bg-green-600' : 'bg-red-600'}`}>
                          <span>Super Diesel</span> <span>{station.has_super_diesel ? 'Available' : 'Empty'}</span>
                        </div>
                      </div>

                      <button 
                        type="button" 
                        onClick={(e) => openUpdateForm(e, station)} 
                        className={`w-full flex items-center justify-center mb-2 border text-xs py-2 rounded-md font-bold transition-colors bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100`}
                      >
                        <Edit3 size={14} className="mr-1" /> Update Station Data
                      </button>

                      <div className="flex gap-2">
                        <button type="button" onClick={(e) => confirmFuel(e, station.id, station.confirms)} disabled={hasInteracted} className={`flex-1 flex items-center justify-center border text-xs py-1.5 rounded-md font-semibold transition-colors ${hasInteracted ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                          <CheckCircle size={14} className="mr-1" /> Confirm
                        </button>
                        <button type="button" onClick={(e) => reportFalseInfo(e, station.id)} disabled={hasInteracted} className={`flex-1 flex items-center justify-center border text-xs py-1.5 rounded-md font-semibold transition-colors ${hasInteracted ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'}`}>
                          <AlertTriangle size={14} className="mr-1" /> Fake
                        </button>
                      </div>
                    </div>
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