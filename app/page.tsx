'use client';

import dynamic from 'next/dynamic';
import { Fuel, Droplet, Moon, Sun, MessageSquare, X } from 'lucide-react';
import { useState } from 'react';
import { supabase } from './lib/supabase'; // Make sure this path is correct for your setup

const MapBox = dynamic(() => import('../components/MapBox'), { ssr: false });

export default function Home() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [isDark, setIsDark] = useState(true);
  
  // Feedback Modal State
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ type: 'Add Station', message: '', contact: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeedback = async (e: any) => {
    e.preventDefault();
    if (!feedbackForm.message) return alert('Please enter a message.');
    
    setIsSubmitting(true);
    await supabase.from('feedback').insert([{
      type: feedbackForm.type,
      message: feedbackForm.message,
      contact: feedbackForm.contact
    }]);
    
    setIsSubmitting(false);
    setShowFeedback(false);
    setFeedbackForm({ type: 'Add Station', message: '', contact: '' });
    alert('Thank you! Your report has been sent to the admin.');
  };

  return (
    <main className={`flex h-screen flex-col overflow-hidden transition-colors duration-300 ${isDark ? 'bg-slate-950 text-white' : 'bg-gray-100 text-slate-900'}`}>
      
      {/* Header */}
      <header className={`flex flex-col gap-4 p-4 shadow-md border-b flex-none transition-colors duration-300 ${isDark ? 'bg-slate-900 border-red-900/30' : 'bg-white border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-red-600 p-2">
              <Fuel size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-red-600">Full<span className={isDark ? "text-white" : "text-slate-900"}>Tank</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`text-sm flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Live
            </div>
            <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-gray-200 text-slate-700 hover:bg-gray-300'}`}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => setActiveFilter('all')} className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${activeFilter === 'all' ? 'bg-red-600 text-white' : (isDark ? 'bg-slate-800 text-gray-300' : 'bg-gray-200 text-slate-700')}`}>All Fuels</button>
          <button onClick={() => setActiveFilter('92')} className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${activeFilter === '92' ? 'bg-red-600 text-white' : (isDark ? 'bg-slate-800 text-gray-300' : 'bg-gray-200 text-slate-700')}`}>92 Octane</button>
          <button onClick={() => setActiveFilter('95')} className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${activeFilter === '95' ? 'bg-red-600 text-white' : (isDark ? 'bg-slate-800 text-gray-300' : 'bg-gray-200 text-slate-700')}`}>95 Octane</button>
          <button onClick={() => setActiveFilter('diesel')} className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${activeFilter === 'diesel' ? 'bg-red-600 text-white' : (isDark ? 'bg-slate-800 text-gray-300' : 'bg-gray-200 text-slate-700')}`}><Droplet size={14} /> Diesel</button>
        </div>
      </header>

      {/* Map Area */}
      <div className="flex-grow relative z-0">
        <MapBox activeFilter={activeFilter} isDark={isDark} />
      </div>

      {/* Footer */}
      <footer className={`border-t p-3 flex justify-between items-center text-xs flex-none transition-colors duration-300 ${isDark ? 'bg-slate-900 border-red-900/30 text-gray-400' : 'bg-white border-red-200 text-gray-500'}`}>
        <p>Data is crowdsourced and may not be 100% accurate. Created by Onitha Perera</p>
        <button onClick={() => setShowFeedback(true)} className="flex items-center font-bold text-red-500 hover:text-red-400 transition-colors">
          <MessageSquare size={14} className="mr-1" /> Report Issue
        </button>
      </footer>

      {/* Feedback Modal Overlay */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md p-6 rounded-xl shadow-2xl relative ${isDark ? 'bg-slate-900 text-white border border-slate-700' : 'bg-white text-slate-900 border border-gray-200'}`}>
            <button onClick={() => setShowFeedback(false)} className={`absolute top-4 right-4 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}>
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4 flex items-center"><MessageSquare className="mr-2 text-red-500" /> Report an Issue</h2>
            
            <form onSubmit={submitFeedback} className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-bold mb-1 block opacity-80">What is this regarding?</label>
                <select 
                  value={feedbackForm.type} onChange={(e) => setFeedbackForm({...feedbackForm, type: e.target.value})}
                  className={`w-full p-2 rounded border text-sm focus:outline-none focus:border-red-500 ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                >
                  <option value="Add Station">Missing Fuel Station</option>
                  <option value="Wrong Location">Incorrect Station Location</option>
                  <option value="Bug">App Bug / Glitch</option>
                  <option value="Suggestion">Improvement Suggestion</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold mb-1 block opacity-80">Message Details</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Please provide details (e.g., coordinates, exact name, or bug description)..."
                  value={feedbackForm.message} onChange={(e) => setFeedbackForm({...feedbackForm, message: e.target.value})}
                  className={`w-full p-2 rounded border text-sm focus:outline-none focus:border-red-500 resize-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                />
              </div>

              <div>
                <label className="text-sm font-bold mb-1 block opacity-80">Contact Email/Phone (Optional)</label>
                <input 
                  type="text"
                  placeholder="So we can reach out if needed"
                  value={feedbackForm.contact} onChange={(e) => setFeedbackForm({...feedbackForm, contact: e.target.value})}
                  className={`w-full p-2 rounded border text-sm focus:outline-none focus:border-red-500 ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                />
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded transition-colors mt-2">
                {isSubmitting ? 'Sending...' : 'Submit Report'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}