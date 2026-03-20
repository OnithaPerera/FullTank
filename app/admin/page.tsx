'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Search, AlertTriangle, Trash2, Plus, MessageSquare, MapPin, CheckCircle, LogOut, Clock } from 'lucide-react';

// Helper to format timestamps
function timeAgo(dateString: string) {
  if (!dateString) return 'Never';
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

export default function AdminDashboard() {
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard State
  const [activeTab, setActiveTab] = useState('stations');
  const [stations, setStations] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent'); // Default to recent to monitor live traffic!

  // Add Station State
  const [newName, setNewName] = useState('');
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');

  // 1. Check Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setSession(data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      if (data?.subscription) data.subscription.unsubscribe();
    };
  }, []);

  // 2. Fetch data
  useEffect(() => {
    if (session) {
      const fetchData = async () => {
        // Fetch all stations
        const { data: stData } = await supabase.from('stations').select('*');
        if (stData) setStations(stData);
        
        const { data: fbData } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
        if (fbData) setFeedback(fbData);
      };
      fetchData();
    }
  }, [session]);

  // --- AUTHENTICATION ACTIONS ---
  const handleLogin = async (e: any) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else { setEmail(''); setPassword(''); }
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

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

  // --- FILTERING & SORTING LOGIC ---
  let filteredStations = [...stations].filter(st => st.name.toLowerCase().includes(searchTerm.toLowerCase()));
  
  if (sortBy === 'recent') {
    filteredStations.sort((a, b) => {
      const timeA = new Date(a.last_updated || 0).getTime();
      const timeB = new Date(b.last_updated || 0).getTime();
      return timeB - timeA; // Newest first
    });
  } else {
    filteredStations.sort((a, b) => a.name.localeCompare(b.name)); // A-Z
  }

  // SECURE LOGIN SCREEN
  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <form onSubmit={handleLogin} className="bg-slate-900 p-8 rounded-lg shadow-xl border border-slate-800 flex flex-col gap-4 w-80">
          <div className="flex justify-center mb-2"><Lock size={40} className="text-red-600" /></div>
          <h2 className="text-white text-xl font-bold text-center">Secure Admin Access</h2>
          
          <input 
            type="email" required 
            value={email} onChange={(e) => setEmail(e.target.value)} 
            placeholder="Admin Email" 
            className="p-2 rounded bg-slate-800 text-white border border-slate-700 focus:outline-none focus:border-red-500" 
          />
          <input 
            type="password" required 
            value={password} onChange={(e) => setPassword(e.target.value)} 
            placeholder="Password" 
            className="p-2 rounded bg-slate-800 text-white border border-slate-700 focus:outline-none focus:border-red-500" 
          />
          
          <button type="submit" disabled={isLoggingIn} className="bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700 transition-colors">
            {isLoggingIn ? 'Verifying...' : 'Login'}
          </button>
        </form>
      </div>
    );
  }

  // MAIN DASHBOARD
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-red-500">FullTank <span className="text-white">Admin</span></h1>
            
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

          <div className="flex items-center gap-4">
            {activeTab === 'stations' && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input type="text" placeholder="Search stations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 rounded-full bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:border-red-500 w-48 lg:w-64" />
                </div>
                
                {/* NEW SORT DROPDOWN */}
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'name')}
                  className="bg-slate-900 border border-slate-700 text-sm rounded-full px-4 py-2 text-gray-300 focus:outline-none focus:border-red-500"
                >
                  <option value="recent">🕒 Recently Updated</option>
                  <option value="name">🔤 Alphabetical (A-Z)</option>
                </select>
              </>
            )}
            
            {/* Secure Logout Button */}
            <button onClick={handleLogout} className="flex items-center px-3 py-2 text-sm font-bold text-gray-400 hover:text-red-400 transition-colors">
              <LogOut size={16} className="mr-1" /> Logout
            </button>
          </div>
        </header>

        {/* --- STATIONS TAB CONTENT --- */}
        {activeTab === 'stations' && (
          <>
            <div className="bg-slate-900 p-4 rounded-lg shadow border border-slate-800 mb-6 flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-xs text-gray-400 font-bold mb-1 block">Station Name</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. LIOC Mount Lavinia" className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-sm focus:outline-none focus:border-red-500" />
              </div>
              <div className="w-32">
                <label className="text-xs text-gray-400 font-bold mb-1 block">Latitude</label>
                <input type="text" value={newLat} onChange={(e) => setNewLat(e.target.value)} placeholder="6.8333" className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-sm focus:outline-none focus:border-red-500" />
              </div>
              <div className="w-32">
                <label className="text-xs text-gray-400 font-bold mb-1 block">Longitude</label>
                <input type="text" value={newLng} onChange={(e) => setNewLng(e.target.value)} placeholder="79.8667" className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-sm focus:outline-none focus:border-red-500" />
              </div>
              <button onClick={addStation} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center h-[38px] text-sm transition-colors">
                <Plus size={16} className="mr-1" /> Add
              </button>
            </div>

            <div className="bg-slate-900 rounded-lg shadow border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-gray-400">
                  <tr>
                    <th className="p-4 font-semibold w-1/4">Station Name</th>
                    <th className="p-4 font-semibold text-center">92 Oct</th>
                    <th className="p-4 font-semibold text-center">95 Oct</th>
                    <th className="p-4 font-semibold text-center">Diesel</th>
                    <th className="p-4 font-semibold">Queue</th>
                    <th className="p-4 font-semibold text-center">Trust</th>
                    {/* NEW COLUMN */}
                    <th className="p-4 font-semibold text-center">Last Updated</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredStations.map((station) => (
                    <tr key={station.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 font-medium">
                        <input type="text" value={station.name} onChange={(e) => setStations(stations.map(st => st.id === station.id ? { ...st, name: e.target.value } : st))} onBlur={(e) => renameStation(station.id, e.target.value)} className="bg-transparent border-b border-transparent hover:border-slate-600 focus:border-red-500 focus:outline-none w-full py-1 text-white transition-colors" />
                      </td>
                      <td className="p-4 text-center"><input type="checkbox" checked={station.has_92} onChange={(e) => updateStation(station.id, 'has_92', e.target.checked)} className="w-4 h-4 accent-red-600" /></td>
                      <td className="p-4 text-center"><input type="checkbox" checked={station.has_95} onChange={(e) => updateStation(station.id, 'has_95', e.target.checked)} className="w-4 h-4 accent-red-600" /></td>
                      <td className="p-4 text-center"><input type="checkbox" checked={station.has_diesel} onChange={(e) => updateStation(station.id, 'has_diesel', e.target.checked)} className="w-4 h-4 accent-red-600" /></td>
                      <td className="p-4">
                        <select value={station.queue_length || 'Unknown'} onChange={(e) => updateStation(station.id, 'queue_length', e.target.value)} className="bg-slate-950 border border-slate-700 rounded p-1 text-xs focus:outline-none focus:border-red-500">
                          <option value="Unknown">Unknown</option>
                          <option value="Short (0-15m)">Short (0-15m)</option>
                          <option value="Medium (15-45m)">Medium (15-45m)</option>
                          <option value="Long (45m+)">Long (45m+)</option>
                        </select>
                      </td>
                      <td className="p-4 text-center"><input type="number" value={station.confirms} onChange={(e) => updateStation(station.id, 'confirms', parseInt(e.target.value) || 0)} className="w-16 bg-slate-950 border border-slate-700 rounded p-1 text-center text-xs focus:outline-none focus:border-red-500" /></td>
                      
                      {/* NEW COLUMN DATA */}
                      <td className="p-4 text-center text-xs text-gray-400 font-medium">
                        {timeAgo(station.last_updated)}
                      </td>

                      <td className="p-4 text-right flex items-center justify-end gap-3 h-full pt-5">
                        <button onClick={() => forceReset(station.id)} className="text-yellow-500 hover:text-yellow-400 flex items-center text-xs font-bold transition-colors" title="Reset"><AlertTriangle size={14} className="mr-1" /> Reset</button>
                        <button onClick={() => deleteStation(station.id)} className="text-red-500 hover:text-red-400 flex items-center text-xs font-bold transition-colors" title="Delete"><Trash2 size={14} className="mr-1" /> Delete</button>
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