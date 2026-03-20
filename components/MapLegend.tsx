'use client';

import { useState, useEffect, useRef } from 'react';
import { Info, X } from 'lucide-react';

const legendItems = [
  { color: 'bg-emerald-500', label: 'Green', meaning: 'Verified Available' },
  { color: 'bg-amber-400', label: 'Yellow', meaning: 'Awaiting Confirms' },
  { color: 'bg-red-500', label: 'Red', meaning: 'Empty / No Fuel' },
  { color: 'bg-slate-400', label: 'Gray', meaning: 'Data > 3 hours old' },
];

export default function MapLegend() {
  const [isOpen, setIsOpen] = useState(false);
  const legendRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Automatically open the legend on desktop screens, keep it closed on mobile
    if (window.innerWidth >= 640) {
      setIsOpen(true);
    }

    // Close the legend if the user taps anywhere outside of it
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (legendRef.current && !legendRef.current.contains(event.target as Node)) {
        if (window.innerWidth < 640) {
          setIsOpen(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <div ref={legendRef} className="relative flex min-h-11 flex-col items-end">
      
      {/* Minimized Button State */}
      <button
        onClick={() => setIsOpen(true)}
        data-state={!isOpen ? 'open' : 'closed'}
        className="ui-panel ui-floating-surface ui-pressable ui-presence flex items-center gap-2 rounded-full px-3 py-2.5 shadow-md"
        aria-label="Open Map Guide"
      >
        <Info size={16} className="text-[var(--ui-brand)]" />
        <span className="text-xs font-bold text-[var(--ui-text)]">Map Guide</span>
      </button>

      {/* Expanded Panel State */}
      <div data-state={isOpen ? 'open' : 'closed'} className="ui-panel ui-floating-surface ui-presence absolute right-0 top-0 w-[min(17rem,calc(100vw-1rem))] rounded-[20px] px-3.5 py-3 shadow-xl">
          
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="ui-kicker">Map Guide</p>
              <p className="ui-text-muted mt-0.5 text-[11px] leading-4">Station status markers.</p>
            </div>
            
            {/* Mobile Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="ui-button-icon h-7 w-7 shrink-0 sm:hidden"
              aria-label="Close Map Guide"
            >
              <X size={14} />
            </button>
          </div>

          {/* Grid Items */}
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {legendItems.map((item) => (
              <div
                key={item.label}
                className="ui-panel-muted rounded-[16px] px-2.5 py-2"
              >
                <div className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.color}`}></span>
                  <span className="text-[11px] font-semibold">{item.label}</span>
                </div>
                <p className="ui-text-muted mt-0.5 text-[10px] leading-tight">{item.meaning}</p>
              </div>
            ))}
          </div>

          {/* Informational Footer */}
          <div className="ui-panel-muted mt-2 rounded-[14px] px-2.5 py-2">
            <p className="ui-text-muted text-[10px] leading-snug">
              <strong className="font-semibold text-[var(--ui-text)]">Note:</strong> Yellow markers require 3 separate user confirmations to turn Green.
            </p>
          </div>

        </div>
    </div>
  );
}
