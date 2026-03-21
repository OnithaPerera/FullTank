'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Moon, SunMedium, MapPin, ShieldCheck, Clock, AlertTriangle, Send, Linkedin, ChevronDown, ChevronUp} from 'lucide-react';

const THEME_STORAGE_KEY = 'fulltank_theme';

const reportTypes = [
  'Add Station',
  'Remove Station',
  'Wrong Location',
  'Improvement',
  'Bug',
  'Other',
];

const markerGuide = [
  { color: 'bg-red-500', title: 'Red marker', description: 'Empty or no fuel currently reported.' },
  { color: 'bg-amber-400', title: 'Yellow marker', description: 'Reported by users and still awaiting verification.' },
  { color: 'bg-emerald-500', title: 'Green marker', description: 'Verified and available after community confirmations.' },
  { color: 'bg-slate-400', title: 'Gray marker', description: 'Stale information that may no longer reflect current stock.' },
];

export default function AboutPage() {
  const [showForm, setShowForm] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    type: 'Add Station',
    message: '',
    contact: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
  });

  useEffect(() => {
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', isDark ? '#07111a' : '#f4efe8');
    }
  }, [isDark]);

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme ? 'dark' : 'light');
  };

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!feedbackForm.message.trim()) {
      alert('Please enter a message.');
      return;
    }

    setIsSubmitting(true);

    await supabase.from('feedback').insert([
      {
        type: feedbackForm.type,
        message: feedbackForm.message,
        contact: feedbackForm.contact,
      },
    ]);

    setIsSubmitting(false);
    setFeedbackForm({ type: 'Add Station', message: '', contact: '' });
    alert('Thank you. Your report has been sent to the developer.');
  };

  return (
    <main className={`${isDark ? 'theme-dark' : 'theme-light'} ui-page min-h-[100dvh]`}>
      <div className="mx-auto max-w-5xl px-4 pb-14 pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-6 lg:px-8">
        <div className="ui-enter flex items-center justify-between gap-3">
          <Link href="/" className="ui-button-neutral">
            <ArrowLeft size={16} />
            Back to Map
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="ui-button-icon"
          >
            {isDark ? <SunMedium size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <section className="ui-panel ui-enter ui-enter-delay-1 mt-4 rounded-[32px] px-5 py-6 sm:px-7 sm:py-7">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(17rem,1fr)]">
            <div>
              <div className="flex items-center gap-3">
                <div className="ui-brand-mark shrink-0">
                  <Image src="/logo.svg" alt="FullTank logo" width={38} height={38} priority />
                </div>
                <div>
                  <p className="ui-kicker">About FullTank</p>
                  <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                    A fuel utility built for quick, reliable decisions.
                  </h1>
                </div>
              </div>

              <p className="ui-text-muted mt-4 max-w-2xl text-sm leading-7 sm:text-base">
                FullTank is a lightweight mobile-first map for checking fuel availability, queue estimates, and
                crowdsourced verification. The interface is designed to stay fast and readable on low-end devices
                while keeping community updates easy to submit.
              </p>
            </div>

            <div className="ui-panel-muted rounded-[26px] px-5 py-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 text-[var(--ui-brand)]" size={20} />
                <div>
                  <p className="text-sm font-semibold">Current rollout</p>
                  <p className="ui-text-muted mt-1 text-sm leading-6">
                    Data is currently strongest around the Western Province while the community grows. Reports from
                    other districts still help improve coverage.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-[18px] border border-[var(--ui-border)] px-4 py-3">
                  <p className="font-semibold">Verification threshold</p>
                  <p className="ui-text-muted mt-1">Stations turn green after 3 separate confirms.</p>
                </div>
                <div className="rounded-[18px] border border-[var(--ui-border)] px-4 py-3">
                  <p className="font-semibold">Stale reports</p>
                  <p className="ui-text-muted mt-1">Gray markers indicate older community data.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ui-enter ui-enter-delay-2 mt-6 grid gap-4 lg:grid-cols-3">
          

          <div className="ui-panel rounded-[28px] px-5 py-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-emerald-500" size={18} />
              <h2 className="text-lg font-semibold">Trust system</h2>
            </div>

            <div className="mt-4 space-y-3">
              <div className="ui-panel-muted rounded-[20px] px-4 py-3.5">
                <p className="text-sm font-semibold">Why it matters</p>
                <p className="ui-text-muted mt-1 text-sm leading-6">
                  A single update is helpful but not always enough. Community confirmations make the signal more
                  reliable before the marker turns green.
                </p>
              </div>

              <div className="ui-panel-muted rounded-[20px] px-4 py-3.5">
                <p className="text-sm font-semibold">How to help</p>
                <p className="ui-text-muted mt-1 text-sm leading-6">
                  Tap <strong>Confirm</strong> when the information is correct. Use <strong>Update Station Data</strong>{' '}
                  when availability or queue conditions change.
                </p>
              </div>
            </div>
          </div>

          <div className="ui-panel rounded-[28px] px-5 py-5">
            <div className="flex items-center gap-2">
              <Clock className="text-slate-500" size={18} />
              <h2 className="text-lg font-semibold">Good reports are specific</h2>
            </div>

            <div className="mt-4 space-y-3">
              <div className="ui-panel-muted rounded-[20px] px-4 py-3.5">
                <p className="text-sm font-semibold">Helpful details</p>
                <p className="ui-text-muted mt-1 text-sm leading-6">
                  Include station name, area, Google Maps links, queue estimate, or the exact issue you noticed.
                </p>
              </div>

              <div className="ui-panel-muted rounded-[20px] px-4 py-3.5">
                <p className="text-sm font-semibold">What happens next</p>
                <p className="ui-text-muted mt-1 text-sm leading-6">
                  Reports go directly to the developer and are used to improve coverage, clean up map data, and fix
                  product issues.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="ui-enter ui-enter-delay-3 mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(17rem,0.7fr)]">
          <div className="ui-panel rounded-[32px] px-5 py-6 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="ui-kicker">Reports</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">Contact and feedback</h2>
                <p className="ui-text-muted mt-2 text-sm leading-6">
                  Report missing stations, wrong locations, bugs, or product improvements. The form is intentionally
                  simple so it stays quick to complete on mobile.
                </p>
              </div>
            </div>

            <form onSubmit={submitFeedback} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold">Report type</label>
                <select
                  value={feedbackForm.type}
                  onChange={(event) =>
                    setFeedbackForm((current) => ({ ...current, type: event.target.value }))
                  }
                  className="ui-select"
                >
                  {reportTypes.map((reportType) => (
                    <option key={reportType} value={reportType}>
                      {reportType === 'Add Station'
                        ? 'Add a Missing Station'
                        : reportType === 'Remove Station'
                          ? 'Remove / Delete a Station'
                          : reportType === 'Wrong Location'
                            ? 'Incorrect Station Data / Location'
                            : reportType === 'Improvement'
                              ? 'App Improvement Suggestion'
                              : reportType === 'Bug'
                                ? 'Report a Bug'
                                : 'Other'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Details</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Share the station name, exact issue, Google Maps link, or any details that help verify the report."
                  value={feedbackForm.message}
                  onChange={(event) =>
                    setFeedbackForm((current) => ({ ...current, message: event.target.value }))
                  }
                  className="ui-textarea"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Contact (optional)</label>
                <input
                  type="text"
                  placeholder="Email or phone number"
                  value={feedbackForm.contact}
                  onChange={(event) =>
                    setFeedbackForm((current) => ({ ...current, contact: event.target.value }))
                  }
                  className="ui-input"
                />
              </div>

              <button type="submit" disabled={isSubmitting} className="ui-button-brand w-full">
                <Send size={16} />
                {isSubmitting ? 'Sending...' : 'Submit Report'}
              </button>
            </form>
          </div>

          <div className="space-y-4">
            <div className="ui-panel rounded-[28px] px-5 py-5">
              <p className="ui-kicker">Quick Notes</p>
              <div className="mt-3 space-y-3 text-sm">
                <div className="ui-panel-muted rounded-[20px] px-4 py-3.5">
                  <p className="font-semibold">Best for missing stations</p>
                  <p className="ui-text-muted mt-1 leading-6">
                    Include the station name and a Google Maps link if possible.
                  </p>
                </div>
                <div className="ui-panel-muted rounded-[20px] px-4 py-3.5">
                  <p className="font-semibold">Best for bugs</p>
                  <p className="ui-text-muted mt-1 leading-6">
                    Mention the page, the action you tried, and what happened instead.
                  </p>
                </div>
              </div>
            </div>

            <div className="ui-panel rounded-[28px] px-5 py-5">
              <p className="text-sm font-semibold">Made for practical use</p>
              <p className="ui-text-muted mt-2 text-sm leading-6">
                FullTank aims to improve first-glance clarity without adding heavy visuals or slow interactions.
              </p>
            </div>
          </div>
        </section>

        
      {/* Contributors Section */}
        <section className="ui-panel ui-enter ui-enter-delay-2 mt-4 mb-8 rounded-[32px] px-5 py-6 sm:px-7 sm:py-7">
          <h2 className="text-lg font-bold tracking-tight text-[var(--ui-text)]">
            The Team Behind FullTank
          </h2>
          <p className="ui-text-muted mt-1 text-sm">
            FullTank is an open-source initiative built and maintained by the community.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* 1. Onitha Perera */}
            <a 
              href="https://www.linkedin.com/in/onitha-perera" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="group flex items-center justify-between gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] p-3 hover:bg-[var(--ui-surface-strong)] transition-all"
            >
              <div className="flex items-center gap-3">
                <img 
                  src="https://github.com/OnithaPerera.png" 
                  alt="Onitha Perera" 
                  className="h-11 w-11 rounded-full bg-slate-200 object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--ui-text)] group-hover:underline">Onitha Perera</p>
                  <p className="truncate text-[11px] font-bold uppercase tracking-wider text-[var(--ui-brand)]">Creator</p>
                </div>
              </div>
              <Linkedin size={18} className="shrink-0 text-[#0a66c2] opacity-80 transition-opacity group-hover:opacity-100" />
            </a>

            {/* 2. Suven Seoras */}
            <a 
              href="https://www.linkedin.com/in/suvenseoras/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="group flex items-center justify-between gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] p-3 hover:bg-[var(--ui-surface-strong)] transition-all"
            >
              <div className="flex items-center gap-3">
                <img 
                  src="https://ui-avatars.com/api/?name=Suven+Seoras&background=0f172a&color=fff" 
                  alt="Suven Seoras" 
                  className="h-11 w-11 rounded-full bg-slate-200 object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--ui-text)] group-hover:underline">Suven Seoras</p>
                  <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-[var(--ui-text-muted)]">Core Contributor</p>
                </div>
              </div>
              <Linkedin size={18} className="shrink-0 text-[#0a66c2] opacity-80 transition-opacity group-hover:opacity-100" />
            </a>

            {/* 3. Tharin Fernando */}
            <a 
              href="https://www.linkedin.com/in/tharinfernando/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="group flex items-center justify-between gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] p-3 hover:bg-[var(--ui-surface-strong)] transition-all"
            >
              <div className="flex items-center gap-3">
                <img 
                  src="https://ui-avatars.com/api/?name=Tharin+Fernando&background=0f172a&color=fff" 
                  alt="Tharin Fernando" 
                  className="h-11 w-11 rounded-full bg-slate-200 object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--ui-text)] group-hover:underline">Tharin Fernando</p>
                  <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-[var(--ui-text-muted)]">Core Contributor</p>
                </div>
              </div>
              <Linkedin size={18} className="shrink-0 text-[#0a66c2] opacity-80 transition-opacity group-hover:opacity-100" />
            </a>
          </div>
          
          {/* Interactive Contribution Form */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-2 text-[13px] font-bold text-[var(--ui-text)] shadow-sm transition-all hover:bg-[var(--ui-surface-muted)] active:scale-95"
            >
              Want to join the team? Get in touch
              {showForm ? <ChevronUp size={16} className="text-[var(--ui-brand)]" /> : <ChevronDown size={16} className="text-[var(--ui-brand)]" />}
            </button>

            {showForm && (
              <form 
                action="https://formspree.io/f/mzdjwlrw" 
                method="POST"
                className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300 text-left rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] p-4 sm:p-5"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--ui-text-muted)]">Name</label>
                    <input 
                      type="text" 
                      name="name"
                      required 
                      className="w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3.5 py-2.5 text-sm text-[var(--ui-text)] outline-none transition-colors focus:border-[var(--ui-brand)] focus:ring-1 focus:ring-[var(--ui-brand)]" 
                      placeholder="How should we call you?" 
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--ui-text-muted)]">Email / LinkedIn</label>
                    <input 
                      type="text" 
                      name="contact"
                      required 
                      className="w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3.5 py-2.5 text-sm text-[var(--ui-text)] outline-none transition-colors focus:border-[var(--ui-brand)] focus:ring-1 focus:ring-[var(--ui-brand)]" 
                      placeholder="How can we reach you?" 
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--ui-text-muted)]">How would you like to help?</label>
                  <textarea 
                    name="message"
                    required 
                    rows={3} 
                    className="w-full resize-none rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3.5 py-2.5 text-sm text-[var(--ui-text)] outline-none transition-colors focus:border-[var(--ui-brand)] focus:ring-1 focus:ring-[var(--ui-brand)]" 
                    placeholder="E.g., I'm a Next.js developer, or I can help verify stations in Colombo..."
                  />
                </div>

                <div className="mt-5 flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
                  <a 
                    href="https://github.com/OnithaPerera/FullTank" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[13px] font-semibold text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:underline"
                  >
                    Developers: View the GitHub Repo →
                  </a>
                  <button 
                    type="submit" 
                    className="w-full rounded-xl bg-[var(--ui-brand)] px-5 py-2.5 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-90 sm:w-auto"
                  >
                    Send Message
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        <footer className="ui-enter ui-enter-delay-3 ui-text-muted mt-8 border-t border-[var(--ui-border)] pt-5 text-center text-xs">
          <p>&copy; {new Date().getFullYear()} FullTank.</p>
          <p className="mt-1">Created and maintained by <strong>FullTank Dev Team</strong>.</p>
        </footer>
      </div>
    </main>
  );
}
