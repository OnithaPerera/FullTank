'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { ArrowLeft, MapPin, ShieldCheck, AlertTriangle, Send } from 'lucide-react';

export default function AboutPage() {
  const [feedbackForm, setFeedbackForm] = useState({ type: 'Add Station', message: '', contact: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Load the shared theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('fulltank_theme');
    if (savedTheme === 'light') setIsDark(false);
  }, []);

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
    setFeedbackForm({ type: 'Add Station', message: '', contact: '' });
    alert('Thank you! Your report has been sent directly to the developer.');
  };

  return (
    <div className={`min-h-screen font-sans overflow-y-auto pb-12 transition-colors duration-300 ${isDark ? 'bg-slate-950 text-white' : 'bg-gray-100 text-slate-900'}`}>
      <div className="max-w-3xl mx-auto p-6">
        
        {/* Navigation */}
        <Link href="/" className="inline-flex items-center text-red-600 hover:text-red-500 font-bold mb-8 transition-colors">
          <ArrowLeft size={20} className="mr-2" /> Back to Map
        </Link>

        {/* Development Notice */}
        <div className={`border rounded-lg p-5 mb-10 flex items-start gap-4 ${isDark ? 'bg-blue-900/30 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
          <AlertTriangle className="text-blue-500 shrink-0 mt-1" size={24} />
          <div>
            <h2 className={`text-lg font-bold mb-1 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Currently in Development</h2>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
              FullTank is a crowdsourced community project. Please note that data is currently heavily focused on the <strong>Western Province</strong> as we roll out testing. Expansion to other districts will happen as the community grows.
            </p>
          </div>
        </div>

        {/* How it Works Section */}
        <div className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 border-b pb-2 ${isDark ? 'border-slate-800' : 'border-gray-300'}`}>How FullTank Works</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className={`p-5 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-sm'}`}>
              <MapPin className="text-red-500 mb-3" size={28} />
              <h3 className="font-bold text-lg mb-2">Map Markers</h3>
              <ul className={`text-sm space-y-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <li className="flex items-center"><span className="inline-block w-3 h-3 rounded-full bg-red-600 mr-2 shrink-0"></span><span><strong>Red:</strong> Out of stock (Empty)</span></li>
                <li className="flex items-center"><span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-2 shrink-0"></span><span><strong>Yellow:</strong> Fuel reported, unverified.</span></li>
                <li className="flex items-center"><span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2 shrink-0"></span><span><strong>Green:</strong> Verified! Has fuel.</span></li>
              </ul>
            </div>

            <div className={`p-5 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-sm'}`}>
              <ShieldCheck className="text-green-500 mb-3" size={28} />
              <h3 className="font-bold text-lg mb-2">The Trust System</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                To prevent false information, when someone reports new fuel, the marker turns yellow. It requires <strong>3 separate users</strong> to click the "Confirm" button before the station is officially marked as Verified (Green).
              </p>
            </div>
          </div>
        </div>

        {/* Contact & Feedback Form */}
        <div>
          <h2 className={`text-2xl font-bold mb-6 border-b pb-2 ${isDark ? 'border-slate-800' : 'border-gray-300'}`}>Contact & Reports</h2>
          <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Help us keep the map accurate. Use this form to report missing stations, request removals, suggest features, or report bugs.
          </p>

          <form onSubmit={submitFeedback} className={`p-6 rounded-lg border flex flex-col gap-5 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div>
              <label className={`text-sm font-bold mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>What are you reporting?</label>
              <select 
                value={feedbackForm.type} onChange={(e) => setFeedbackForm({...feedbackForm, type: e.target.value})}
                className={`w-full p-3 rounded-md border text-sm focus:outline-none focus:border-red-500 ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
              >
                <option value="Add Station">Add a Missing Station</option>
                <option value="Remove Station">Remove / Delete a Station</option>
                <option value="Wrong Location">Incorrect Station Data/Location</option>
                <option value="Improvement">App Improvement Suggestion</option>
                <option value="Bug">Report a Bug</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className={`text-sm font-bold mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Details</label>
              <textarea 
                required
                rows={5}
                placeholder="Please provide specifics (e.g., Google Maps links, exact station names, or detailed bug descriptions)..."
                value={feedbackForm.message} onChange={(e) => setFeedbackForm({...feedbackForm, message: e.target.value})}
                className={`w-full p-3 rounded-md border text-sm focus:outline-none focus:border-red-500 resize-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
              />
            </div>

            <div>
              <label className={`text-sm font-bold mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Your Contact (Optional)</label>
              <input 
                type="text"
                placeholder="Email or phone number"
                value={feedbackForm.contact} onChange={(e) => setFeedbackForm({...feedbackForm, contact: e.target.value})}
                className={`w-full p-3 rounded-md border text-sm focus:outline-none focus:border-red-500 ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-md transition-colors flex items-center justify-center">
              {isSubmitting ? 'Sending...' : <><Send size={18} className="mr-2" /> Submit Report</>}
            </button>
          </form>
        </div>

        {/* --- COPYRIGHT FOOTER --- */}
        <div className={`mt-12 pt-6 text-center text-xs border-t ${isDark ? 'border-slate-800 text-gray-500' : 'border-gray-300 text-gray-400'}`}>
          <p>&copy; {new Date().getFullYear()} FullTank.</p>
          <p className="mt-1">Created & Maintained by <strong>Onitha Perera</strong>.</p>
        </div>

      </div>
    </div>
  );
}