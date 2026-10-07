'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Moon, SunMedium, MapPin, ShieldCheck, Clock, AlertTriangle, Send, Linkedin, ChevronUp } from 'lucide-react';

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
  const [feedbackForm, setFeedbackForm] = useState({
    type: 'Add Station',
    message: '',
    contact: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(true);
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
        <div className="flex items-center justify-between gap-3">
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

        <section className="ui-panel mt-4 rounded-[32px] px-5 py-6 sm:px-7 sm:py-7">
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

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="ui-badge">Crowdsourced updates</span>
                <span className="ui-badge">3-user verification</span>
                <span className="ui-badge">Queue awareness</span>
              </div>
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

        <section className="mt-6 grid gap-4 sm:gap-6 lg:grid-cols-3 items-stretch">
          <div className="ui-panel rounded-[28px] px-5 py-5">
            <div className="flex items-center gap-2">
              <MapPin className="text-[var(--ui-brand)]" size={18} />
              <h2 className="text-lg font-semibold">Marker guide</h2>
            </div>

            <div className="mt-4 space-y-2.5">
              {markerGuide.map((item) => (
                <div key={item.title} className="ui-panel-muted rounded-[20px] px-3.5 py-3">
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${item.color}`}></span>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="ui-text-muted mt-1 text-sm leading-5">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

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

        <section className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 lg:grid-cols-3 items-start">
          <div className="ui-panel rounded-[32px] px-5 py-6 sm:px-6 lg:col-span-2">
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

          <div className="flex flex-col gap-4 sm:gap-6 lg:col-span-1">
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

        {/* Team Section */}
        <section className="mt-6 ui-panel rounded-[32px] px-5 py-6 sm:px-7 sm:py-7">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">The Team Behind FullTank</h2>
          <p className="ui-text-muted mt-1 text-sm">FullTank is an open-source initiative built and maintained by the community.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center justify-between gap-4 rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">OP</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">Onitha Perera</p>
                  <p className="text-[10px] font-bold tracking-wider text-[#d0523b]">CREATOR</p>
                </div>
              </div>
              <a href="https://www.linkedin.com/in/onitha-perera" target="_blank" rel="noopener noreferrer" className="text-blue-500 transition-colors hover:text-blue-600" aria-label="Onitha Perera LinkedIn">
                <Linkedin size={18} />
              </a>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 dark:bg-slate-700">
                  <span className="font-bold text-white">SS</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">Suven Seoras</p>
                  <p className="text-[10px] font-bold tracking-wider text-slate-500">CORE CONTRIBUTOR</p>
                </div>
              </div>
              <a href="https://www.linkedin.com/in/suvenseoras/" target="_blank" rel="noopener noreferrer" className="text-blue-500 transition-colors hover:text-blue-600" aria-label="Suven Seoras LinkedIn">
                <Linkedin size={18} />
              </a>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-[20px] border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-800">
                  <span className="font-bold text-white">TF</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">Tharin Fernando</p>
                  <p className="text-[10px] font-bold tracking-wider text-slate-500">CORE CONTRIBUTOR</p>
                </div>
              </div>
              <a href="https://www.linkedin.com/in/tharinfernando/" target="_blank" rel="noopener noreferrer" className="text-blue-500 transition-colors hover:text-blue-600" aria-label="Tharin Fernando LinkedIn">
                <Linkedin size={18} />
              </a>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setShowTeamForm(!showTeamForm)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel)] px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-[var(--ui-panel-muted)]"
            >
              Want to join the team? Get in touch
              <ChevronUp size={16} className={`transition-transform duration-200 ${showTeamForm ? '' : 'rotate-180'}`} />
            </button>
          </div>

          {showTeamForm && (
            <div className="mt-5 rounded-[24px] border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] p-5 sm:p-6">
              <form action="https://formspree.io/f/mzdjwlrw" method="POST" className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Name</label>
                    <input type="text" name="name" required placeholder="How should we call you?" className="ui-input w-full bg-[var(--ui-panel)]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Email / LinkedIn</label>
                    <input type="text" name="contact" required placeholder="How can we reach you?" className="ui-input w-full bg-[var(--ui-panel)]" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">How would you like to help?</label>
                  <textarea name="message" required rows={3} placeholder="E.g., I'm a Next.js developer, or I can help verify stations in Colombo..." className="ui-textarea w-full bg-[var(--ui-panel)]" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <a href="https://github.com/OnithaPerera/FullTank" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold hover:underline">
                    Developers: View the GitHub Repo &rarr;
                  </a>
                  <button type="submit" className="rounded-[14px] bg-[#d0523b] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b84632]">
                    Send Message
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>

        <footer className="ui-text-muted mt-8 border-t border-[var(--ui-border)] pt-5 text-center text-xs">
          <p>&copy; {new Date().getFullYear()} FullTank.</p>
          <p className="mt-1">Created and maintained by <strong>FullTank Dev Team</strong>.</p>
        </footer>
      </div>
    </main>
  );
}
