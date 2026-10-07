'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Search, AlertTriangle, Trash2, Plus, MessageSquare, MapPin, CheckCircle, LogOut, Moon, SunMedium, Clock, ChevronLeft, ChevronRight, Activity, BarChart3 } from 'lucide-react';

// Helper to format exact timestamps
function formatExactTime(dateString: string) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const datePart = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${datePart}, ${time}`;
}

export default function AdminDashboard() {
  // Auth & Theme State
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Dashboard State
  const [activeTab, setActiveTab] = useState('stations');
  const [stations, setStations] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

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
        const { data: stData } = await supabase.from('stations').select('*');
        if (stData) setStations(stData);
        
        const { data: fbData } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
        if (fbData) setFeedback(fbData);
      };
      fetchData();
    }
  }, [session]);

  // Reset pagination when searching or sorting
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

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
    setStations(stations.map(st => st.id === id ? { ...st, has_92: false, has_95: false, has_diesel: false, has_super_diesel: false, confirms: 0, queue_length: 'Unknown' } : st));
    await supabase.from('stations').update({ has_92: false, has_95: false, has_diesel: false, has_super_diesel: false, confirms: 0, queue_length: 'Unknown' }).eq('id', id);
  };
  
  const deleteStation = async (id: string) => {
    if(!confirm("CRITICAL WARNING: Permanently delete this station?")) return;
    setStations(stations.filter(st => st.id !== id));
    await supabase.from('stations').delete().eq('id', id);
  };
  
  const addStation = async (e: any) => {
    e.preventDefault();
    if (!newName || !newLat || !newLng) return alert("Fill in Name, Lat, and Lng.");
    const { data, error } = await supabase.from('stations').insert([{ name: newName, lat: parseFloat(newLat), lng: parseFloat(newLng), has_92: false, has_95: false, has_diesel: false, has_super_diesel: false, confirms: 0, queue_length: 'Unknown' }]).select(); 
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

  // --- FILTERING, SORTING & PAGINATION LOGIC ---
  let filteredStations = [...stations].filter(st => st.name.toLowerCase().includes(searchTerm.toLowerCase()));
  
  if (sortBy === 'recent') {
    filteredStations.sort((a, b) => {
      const timeA = new Date(a.last_updated || 0).getTime();
      const timeB = new Date(b.last_updated || 0).getTime();
      return timeB - timeA;
    });
  } else {
    filteredStations.sort((a, b) => a.name.localeCompare(b.name));
  }

  const totalPages = Math.ceil(filteredStations.length / itemsPerPage);
  const paginatedStations = filteredStations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- METRICS CALCULATIONS ---
  const totalActiveStations = stations.length;
  const totalConfirms = stations.reduce((sum, st) => sum + (st.confirms || 0), 0);
  const pendingReports = feedback.filter(f => f.status === 'pending').length;

  // SECURE LOGIN SCREEN
  if (!session) {
    return (
      <div className={`flex h-screen items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
        <form onSubmit={handleLogin} className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xl'} p-8 rounded-xl border flex flex-col gap-4 w-80 transition-colors`}>
          <div className="flex justify-center mb-2"><Lock size={40} className="text-red-600" /></div>
          <h2 className={`${isDark ? 'text-white' : 'text-slate-900'} text-xl font-bold text-center`}>Secure Admin Access</h2>
          
          <input 
            type="email" required 
            value={email} onChange={(e) => setEmail(e.target.value)} 
            placeholder="Admin Email" 
            className={`p-2 rounded ${isDark ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-300'} border focus:outline-none focus:border-red-500 transition-colors`} 
          />
          <input 
            type="password" required 
            value={password} onChange={(e) => setPassword(e.target.value)} 
            placeholder="Password" 
            className={`p-2 rounded ${isDark ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-300'} border focus:outline-none focus:border-red-500 transition-colors`} 
          />
          
          <button type="submit" disabled={isLoggingIn} className="bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-700 transition-colors mt-2">
            {isLoggingIn ? 'Verifying...' : 'Login'}
          </button>
        </form>
      </div>
    );
  }

  // MAIN DASHBOARD
  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} p-6 font-sans transition-colors duration-200`}>
      <div className="max-w-[1400px] mx-auto">
        
        <header className={`flex justify-between items-center mb-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'} pb-4`}>
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-red-600">FullTank <span className={isDark ? 'text-white' : 'text-slate-900'}>Admin</span></h1>
            
            <div className={`flex rounded-lg p-1 border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <button onClick={() => setActiveTab('stations')} className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center transition-colors ${activeTab === 'stations' ? 'bg-red-600 text-white shadow-sm' : isDark ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                <MapPin size={16} className="mr-1.5"/> Manage Map
              </button>
              <button onClick={() => setActiveTab('feedback')} className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center transition-colors ${activeTab === 'feedback' ? 'bg-red-600 text-white shadow-sm' : isDark ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                <MessageSquare size={16} className="mr-1.5"/> User Reports
                {pendingReports > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingReports}</span>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {activeTab === 'stations' && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input type="text" placeholder="Search stations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                    className={`pl-10 pr-4 py-2 rounded-full border text-sm focus:outline-none focus:border-red-500 w-48 lg:w-64 transition-colors ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-sm'}`} 
                  />
                </div>
                
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'name')}
                  className={`border text-sm rounded-full px-4 py-2 focus:outline-none focus:border-red-500 transition-colors ${isDark ? 'bg-slate-900 border-slate-700 text-gray-300' : 'bg-white border-slate-300 text-slate-700 shadow-sm'}`}
                >
                  <option value="recent">🕒 Recently Updated</option>
                  <option value="name">🔤 Alphabetical (A-Z)</option>
                </select>
              </>
            )}
            
            {/* Theme Toggle */}
            <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-slate-900 text-yellow-400 hover:bg-slate-800' : 'bg-white text-slate-600 border border-slate-200 shadow-sm hover:bg-slate-50'}`}>
              {isDark ? <SunMedium size={18} /> : <Moon size={18} />}
            </button>

            {/* Secure Logout Button */}
            <button onClick={handleLogout} className={`flex items-center px-3 py-2 text-sm font-bold transition-colors ${isDark ? 'text-gray-400 hover:text-red-400' : 'text-slate-500 hover:text-red-600'}`}>
              <LogOut size={16} className="mr-1" /> Logout
            </button>
          </div>
        </header>

        {/* --- HERO METRICS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`p-4 rounded-xl border flex items-center gap-4 transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-500/10 text-blue-500' : 'bg-blue-50 text-blue-600'}`}><MapPin size={24}/></div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Active Stations</p>
              <p className="text-2xl font-black">{totalActiveStations}</p>
            </div>
          </div>
          
          <div className={`p-4 rounded-xl border flex items-center gap-4 transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600'}`}><Activity size={24}/></div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Total Confirms</p>
              <p className="text-2xl font-black">{totalConfirms}</p>
            </div>
          </div>

          <div className={`p-4 rounded-xl border flex items-center gap-4 transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-amber-500/10 text-amber-500' : 'bg-amber-50 text-amber-600'}`}><AlertTriangle size={24}/></div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Pending Reports</p>
              <p className="text-2xl font-black">{pendingReports}</p>
            </div>
          </div>
        </div>

        {/* --- STATIONS TAB CONTENT --- */}
        {activeTab === 'stations' && (
          <>
            <div className={`p-4 rounded-xl shadow-sm border mb-6 flex gap-4 items-end transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex-1">
                <label className={`text-xs font-bold mb-1.5 block ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Station Name</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. LIOC Mount Lavinia" 
                  className={`w-full p-2 rounded-lg border text-sm focus:outline-none focus:border-red-500 transition-colors ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
              </div>
              <div className="w-32">
                <label className={`text-xs font-bold mb-1.5 block ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Latitude</label>
                <input type="text" value={newLat} onChange={(e) => setNewLat(e.target.value)} placeholder="6.8333" 
                  className={`w-full p-2 rounded-lg border text-sm focus:outline-none focus:border-red-500 transition-colors ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
              </div>
              <div className="w-32">
                <label className={`text-xs font-bold mb-1.5 block ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Longitude</label>
                <input type="text" value={newLng} onChange={(e) => setNewLng(e.target.value)} placeholder="79.8667" 
                   className={`w-full p-2 rounded-lg border text-sm focus:outline-none focus:border-red-500 transition-colors ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} />
              </div>
              <button onClick={addStation} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-5 rounded-lg flex items-center h-[38px] text-sm transition-colors shadow-sm">
                <Plus size={16} className="mr-1" /> Add
              </button>
            </div>

            <div className={`rounded-xl shadow-sm border overflow-hidden transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <table className="w-full text-left text-sm">
                <thead className={`${isDark ? 'bg-slate-950 text-gray-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'} border-b`}>
                  <tr>
                    <th className="p-4 font-bold w-1/4">Station Name</th>
                    <th className="p-4 font-bold text-center">92 Oct</th>
                    <th className="p-4 font-bold text-center">95 Oct</th>
                    <th className="p-4 font-bold text-center">Diesel</th>
                    <th className="p-4 font-bold text-center">Super Diesel</th>
                    <th className="p-4 font-bold">Queue</th>
                    <th className="p-4 font-bold text-center">Trust</th>
                    <th className="p-4 font-bold text-center">Last Updated</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {paginatedStations.map((station) => (
                    <tr key={station.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                      <td className="p-4 font-medium">
                        <input type="text" value={station.name} onChange={(e) => setStations(stations.map(st => st.id === station.id ? { ...st, name: e.target.value } : st))} onBlur={(e) => renameStation(station.id, e.target.value)} 
                          className={`bg-transparent border-b hover:border-slate-400 focus:border-red-500 focus:outline-none w-full py-1 transition-colors ${isDark ? 'border-transparent text-white' : 'border-transparent text-slate-900'}`} />
                      </td>
                      <td className="p-4 text-center"><input type="checkbox" checked={station.has_92} onChange={(e) => updateStation(station.id, 'has_92', e.target.checked)} className="w-4 h-4 accent-red-600" /></td>
                      <td className="p-4 text-center"><input type="checkbox" checked={station.has_95} onChange={(e) => updateStation(station.id, 'has_95', e.target.checked)} className="w-4 h-4 accent-red-600" /></td>
                      <td className="p-4 text-center"><input type="checkbox" checked={station.has_diesel} onChange={(e) => updateStation(station.id, 'has_diesel', e.target.checked)} className="w-4 h-4 accent-red-600" /></td>
                      <td className="p-4 text-center"><input type="checkbox" checked={station.has_super_diesel || false} onChange={(e) => updateStation(station.id, 'has_super_diesel', e.target.checked)} className="w-4 h-4 accent-red-600" /></td>
                      <td className="p-4">
                        <select value={station.queue_length || 'Unknown'} onChange={(e) => updateStation(station.id, 'queue_length', e.target.value)} 
                          className={`border rounded-lg p-1.5 text-xs font-semibold focus:outline-none focus:border-red-500 ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}>
                          <option value="Unknown">Unknown</option>
                          <option value="Short (0-15m)">Short (0-15m)</option>
                          <option value="Medium (15-45m)">Medium (15-45m)</option>
                          <option value="Long (45m+)">Long (45m+)</option>
                        </select>
                      </td>
                      <td className="p-4 text-center">
                        <input type="number" value={station.confirms} onChange={(e) => updateStation(station.id, 'confirms', parseInt(e.target.value) || 0)} 
                          className={`w-16 border rounded-lg p-1.5 text-center text-xs font-bold focus:outline-none focus:border-red-500 ${isDark ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-slate-50 border-slate-300 text-emerald-700'}`} />
                      </td>
                      
                      <td className="p-4 text-center text-xs font-medium whitespace-nowrap">
                        <span className={isDark ? 'text-gray-400' : 'text-slate-500'}>
                          {formatExactTime(station.last_updated)}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                         <div className="flex items-center justify-end gap-3">
                          <button onClick={() => forceReset(station.id)} className="text-amber-500 hover:text-amber-600 flex items-center text-xs font-bold transition-colors" title="Reset"><AlertTriangle size={14} className="mr-1" /> Reset</button>
                          <button onClick={() => deleteStation(station.id)} className="text-red-500 hover:text-red-600 flex items-center text-xs font-bold transition-colors" title="Delete"><Trash2 size={14} className="mr-1" /> Delete</button>
                         </div>
                      </td>
                    </tr>
                  ))}
                  
                  {paginatedStations.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500">No stations found matching your criteria.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* PAGINATION CONTROLS */}
              {totalPages > 1 && (
                <div className={`flex items-center justify-between p-4 border-t ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}`}>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    Showing <span className="font-bold">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-bold">{Math.min(currentPage * itemsPerPage, filteredStations.length)}</span> of <span className="font-bold">{filteredStations.length}</span> stations
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className={`p-1.5 rounded-md border flex items-center justify-center transition-colors ${
                        currentPage === 1 
                          ? (isDark ? 'border-slate-800 text-slate-700 cursor-not-allowed' : 'border-slate-200 text-slate-300 cursor-not-allowed')
                          : (isDark ? 'border-slate-700 text-gray-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-white')
                      }`}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className={`p-1.5 rounded-md border flex items-center justify-center transition-colors ${
                        currentPage === totalPages 
                          ? (isDark ? 'border-slate-800 text-slate-700 cursor-not-allowed' : 'border-slate-200 text-slate-300 cursor-not-allowed')
                          : (isDark ? 'border-slate-700 text-gray-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-white')
                      }`}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* --- FEEDBACK TAB CONTENT --- */}
        {activeTab === 'feedback' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {feedback.length === 0 ? (
              <p className={`col-span-full text-center py-10 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>No feedback reports yet.</p>
            ) : (
              feedback.map((item) => (
                <div key={item.id} className={`p-5 rounded-xl border transition-colors ${
                  item.status === 'resolved' 
                    ? (isDark ? 'bg-slate-900/50 border-slate-800 opacity-60' : 'bg-slate-50 border-slate-200 opacity-70')
                    : (isDark ? 'bg-slate-900 border-red-900/40 shadow-lg' : 'bg-white border-red-200 shadow-md')
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${item.type === 'Bug' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {item.type}
                    </span>
                    <span className={`text-[11px] font-semibold flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                       <Clock size={12}/> {formatExactTime(item.created_at)}
                    </span>
                  </div>
                  
                  <p className={`text-sm mb-4 whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{item.message}</p>
                  
                  {item.contact && (
                    <div className={`text-xs mb-4 border-t pt-3 ${isDark ? 'text-gray-400 border-slate-800' : 'text-slate-500 border-slate-100'}`}>
                      <strong className={isDark ? 'text-gray-300' : 'text-slate-700'}>Contact:</strong> {item.contact}
                    </div>
                  )}

                  <div className="flex gap-2 mt-auto">
                    {item.status !== 'resolved' && (
                      <button onClick={() => resolveFeedback(item.id)} className={`flex-1 text-xs font-bold py-2 rounded-lg flex justify-center items-center transition-colors ${isDark ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'}`}>
                        <CheckCircle size={14} className="mr-1.5" /> Mark Resolved
                      </button>
                    )}
                    <button onClick={() => deleteFeedback(item.id)} className={`flex-1 text-xs font-bold py-2 rounded-lg flex justify-center items-center transition-colors ${isDark ? 'bg-slate-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400' : 'bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600'}`}>
                      <Trash2 size={14} className="mr-1.5" /> Delete
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