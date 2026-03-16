'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Search, AlertTriangle, Trash2, Plus, MessageSquare, MapPin, CheckCircle } from 'lucide-react';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('stations'); // 'stations' or 'feedback'
  
  const [stations, setStations] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [newName, setNewName] = useState('');
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');

  const ADMIN_PASSWORD = 'fulltank2026';

  const handleLogin = (e: any) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) setIsAuthenticated(true);
    else alert('Incorrect password');
  };

  useEffect(() => {
    if (isAuthenticated) {
      const fetchData = async () => {
        const { data: stData } = await supabase.from('stations').select('*').order('name', { ascending: true });
        if (stData) setStations(stData);
        
        const { data: fbData } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
        if (fbData) setFeedback(fbData);
      };
      fetchData();
    }
  }, [isAuthenticated]);

  // --- STATION ACTIONS ---
  const updateStation = async (id: string, field: string, value: any) => {
    setStations(stations.map(st => st.id === id ? { ...st, [field]: value } : st));
    await supabase.from('stations').update({ [field]: value, last_updated: new Date().toISOString() }).eq('id', id);
  };
  const renameStation = async (id: string, newName: string) => {
    await supabase.from('stations').update({ name: newName }).eq('id', id);
  };
  const forceReset = async (id: string) => {
    if(!confirm("Reset this station to empty?")) return;
    setStations(stations.map(st => st.id === id ? { ...st, has_92: false, has_95: false, has_diesel: false, confirms: 0, queue_length: 'Unknown' } : st));
    await supabase.from('stations').update({ has_92: false, has_95: false, has_diesel: false, confirms: 0, queue_length: 'Unknown' }).eq('id', id);
  };
  const deleteStation = async (id: string) => {
    if(!confirm("CRITICAL WARNING: Permanently delete this station?")) return;
    setStations(stations.filter(st => st.id !== id));
    await supabase.from('stations').delete().eq('id', id);
  };
  const addStation = async (e: any) => {
    e.preventDefault();
    if (!newName || !newLat || !newLng) return alert("Fill in Name, Lat, and Lng.");
    const { data, error } = await supabase.from('stations').insert([{ name: newName, lat: parseFloat(newLat), lng: parseFloat(newLng), has_92: false, has_95: false, has_diesel: false, confirms: 0, queue_length: 'Unknown' }]).select(); 
    if (error) alert("Error: " + error.message);
    else if (data) { setStations([...stations, data[0]]); setNewName(''); setNewLat(''); setNewLng(''); }
  };

  // --- FEEDBACK ACTIONS ---
  const resolveFeedback = async (id: string) => {
    setFeedback(feedback.map(fb => fb.id === id ? { ...fb, status: 'resolved' } : fb));
    await supabase.from('feedback').update({ status: 'resolved' }).eq('id', id);
  };
  const deleteFeedback = async (id: string) => {
    if(!confirm("Delete this message?")) return;
    setFeedback(feedback.filter(fb => fb.id !== id));
    await supabase.from('feedback').delete().eq('id', id);
  };

  const filteredStations = stations.filter(st => st.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <form onSubmit={handleLogin} className="bg-slate-900 p-8 rounded-lg shadow-xl border border-slate-800 flex flex-col gap-4 w-80">
          <div className="flex justify-center mb-2"><Lock size={40} className="text-red-600" /></div>
          <h2 className="text-white text-xl font-bold text-center">Admin Access</h2>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter Password" className="p-2 rounded bg-slate-800 text-white border border-slate-700" />
          <button type="submit" className="bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700">Login</button>
        </form>
      </div>
    );
  }

  // DASHBOARD
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-red-500">FullTank <span className="text-white">Admin</span></h1>
            
            {/* Tabs */}
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
              <button onClick={() => setActiveTab('stations')} className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center transition-colors ${activeTab === 'stations' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                <MapPin size={16} className="mr-1"/> Manage Map
              </button>
              <button onClick={() => setActiveTab('feedback')} className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center transition-colors ${activeTab === 'feedback' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                <MessageSquare size={16} className="mr-1"/> User Reports
                {feedback.filter(f => f.status === 'pending').length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{feedback.filter(f => f.status === 'pending').length}</span>
                )}
              </button>
            </div>
          </div>

          {activeTab === 'stations' && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input type="text" placeholder="Search stations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 rounded-full bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:border-red-500 w-64" />
            </div>
          )}
        </header>

        {/* --- STATIONS TAB CONTENT --- */}
        {activeTab === 'stations' && (
          <>
            <div className="bg-slate-900 p-4 rounded-lg shadow border border-slate-800 mb-6 flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-xs text-gray-400 font-bold mb-1 block">Station Name</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. LIOC Mount Lavinia" className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-sm" />
              </div>
              <div className="w-32">
                <label className="text-xs text-gray-400 font-bold mb-1 block">Latitude</label>
                <input type="text" value={newLat} onChange={(e) => setNewLat(e.target.value)} placeholder="6.8333" className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-sm" />
              </div>
              <div className="w-32">
                <label className="text-xs text-gray-400 font-bold mb-1 block">Longitude</label>
                <input type="text" value={newLng} onChange={(e) => setNewLng(e.target.value)} placeholder="79.8667" className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-sm" />
              </div>
              <button onClick={addStation} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center h-[38px] text-sm">
                <Plus size={16} className="mr-1" /> Add
              </button>
            </div>

            <div className="bg-slate-900 rounded-lg shadow border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-gray-400">
                  <tr>
                    <th className="p-4 font-semibold w-1/4">Station Name (Click to edit)</th>
                    <th className="p-4 font-semibold text-center">92 Oct</th>
                    <th className="p-4 font-semibold text-center">95 Oct</th>
                    <th className="p-4 font-semibold text-center">Diesel</th>
                    <th className="p-4 font-semibold">Queue</th>
                    <th className="p-4 font-semibold text-center">Trust</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredStations.map((station) => (
                    <tr key={station.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 font-medium">
                        <input type="text" value={station.name} onChange={(e) => setStations(stations.map(st => st.id === station.id ? { ...st, name: e.target.value } : st))} onBlur={(e) => renameStation(station.id, e.target.value)} className="bg-transparent border-b border-transparent hover:border-slate-600 focus:border-red-500 focus:outline-none w-full py-1 text-white" />
                      </td>
                      <td className="p-4 text-center"><input type="checkbox" checked={station.has_92} onChange={(e) => updateStation(station.id, 'has_92', e.target.checked)} className="w-4 h-4 accent-red-600" /></td>
                      <td className="p-4 text-center"><input type="checkbox" checked={station.has_95} onChange={(e) => updateStation(station.id, 'has_95', e.target.checked)} className="w-4 h-4 accent-red-600" /></td>
                      <td className="p-4 text-center"><input type="checkbox" checked={station.has_diesel} onChange={(e) => updateStation(station.id, 'has_diesel', e.target.checked)} className="w-4 h-4 accent-red-600" /></td>
                      <td className="p-4">
                        <select value={station.queue_length || 'Unknown'} onChange={(e) => updateStation(station.id, 'queue_length', e.target.value)} className="bg-slate-950 border border-slate-700 rounded p-1 text-xs">
                          <option value="Unknown">Unknown</option>
                          <option value="Short (0-15m)">Short (0-15m)</option>
                          <option value="Medium (15-45m)">Medium (15-45m)</option>
                          <option value="Long (45m+)">Long (45m+)</option>
                        </select>
                      </td>
                      <td className="p-4 text-center"><input type="number" value={station.confirms} onChange={(e) => updateStation(station.id, 'confirms', parseInt(e.target.value) || 0)} className="w-16 bg-slate-950 border border-slate-700 rounded p-1 text-center text-xs" /></td>
                      <td className="p-4 text-right flex items-center justify-end gap-3 h-full pt-5">
                        <button onClick={() => forceReset(station.id)} className="text-yellow-500 hover:text-yellow-400 flex items-center text-xs font-bold" title="Reset"><AlertTriangle size={14} className="mr-1" /> Reset</button>
                        <button onClick={() => deleteStation(station.id)} className="text-red-500 hover:text-red-400 flex items-center text-xs font-bold" title="Delete"><Trash2 size={14} className="mr-1" /> Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* --- FEEDBACK TAB CONTENT --- */}
        {activeTab === 'feedback' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {feedback.length === 0 ? (
              <p className="text-gray-400 col-span-full text-center py-10">No feedback reports yet.</p>
            ) : (
              feedback.map((item) => (
                <div key={item.id} className={`p-4 rounded-lg border ${item.status === 'resolved' ? 'bg-slate-900/50 border-slate-800 opacity-70' : 'bg-slate-900 border-red-900/50 shadow-lg'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.type === 'Bug' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {item.type}
                    </span>
                    <span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <p className="text-sm text-gray-300 mb-4 whitespace-pre-wrap">{item.message}</p>
                  
                  {item.contact && (
                    <div className="text-xs text-gray-500 mb-4 border-t border-slate-800 pt-2">
                      <strong>Contact:</strong> {item.contact}
                    </div>
                  )}

                  <div className="flex gap-2 mt-auto">
                    {item.status !== 'resolved' && (
                      <button onClick={() => resolveFeedback(item.id)} className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-500 text-xs font-bold py-1.5 rounded flex justify-center items-center transition-colors">
                        <CheckCircle size={14} className="mr-1" /> Mark Resolved
                      </button>
                    )}
                    <button onClick={() => deleteFeedback(item.id)} className="flex-1 bg-slate-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-xs font-bold py-1.5 rounded flex justify-center items-center transition-colors">
                      <Trash2 size={14} className="mr-1" /> Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}