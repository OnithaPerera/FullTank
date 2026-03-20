'use client';

import { Search, X } from 'lucide-react';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import {
  getStationLocationLabel,
  getStationSearchText,
  normalizeSearchText,
  type Station,
} from '../app/lib/stations';

type StationSearchProps = {
  stations: Station[];
  isDark: boolean;
  onSelectStation: (station: Station) => void;
};

type SearchMatch = {
  station: Station;
  score: number;
  secondaryLabel: string | null;
};

const MAX_RESULTS = 6;

export default function StationSearch({ stations, isDark, onSelectStation }: StationSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = normalizeSearchText(deferredQuery);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const matches: SearchMatch[] = normalizedQuery
    ? stations
        .filter((station) => Number.isFinite(station.lat) && Number.isFinite(station.lng))
        .map((station) => {
          const haystack = getStationSearchText(station);
          const tokens = normalizedQuery.split(' ').filter(Boolean);
          const secondaryLabel = getStationLocationLabel(station);

          if (tokens.some((token) => !haystack.includes(token))) {
            return null;
          }

          const normalizedName = normalizeSearchText(station.name);
          const normalizedSecondary = normalizeSearchText(secondaryLabel ?? '');
          let score = normalizedName.length;

          if (normalizedName.startsWith(normalizedQuery)) score -= 80;
          else if (normalizedName.includes(normalizedQuery)) score -= 50;

          if (normalizedSecondary && normalizedSecondary.includes(normalizedQuery)) score -= 25;

          return {
            station,
            score,
            secondaryLabel,
          };
        })
        .filter((match): match is SearchMatch => match !== null)
        .sort((left, right) => left.score - right.score)
        .slice(0, MAX_RESULTS)
    : [];
  const highlightedIndex = matches.length === 0 ? -1 : Math.min(Math.max(activeIndex, 0), matches.length - 1);

  const handleSelect = (station: Station) => {
    setQuery(station.name);
    setIsOpen(false);
    setActiveIndex(-1);
    onSelectStation(station);
  };

  const showDropdown = isOpen && normalizedQuery.length > 0;

  return (
    <div ref={rootRef} className="relative w-[min(92vw,44rem)]">
      <div className="ui-panel pointer-events-auto flex items-center gap-3 rounded-[26px] px-4 py-3 shadow-[var(--ui-shadow)] backdrop-blur-xl">
        <Search size={18} className="shrink-0 text-[var(--ui-text-muted)]" />
        <input
          type="search"
          value={query}
          placeholder="Search station, area, or location"
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={(event) => {
            if (!showDropdown) {
              if (event.key === 'ArrowDown' && matches.length > 0) {
                setIsOpen(true);
                setActiveIndex(0);
              }
              return;
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex((current) => (current + 1) % matches.length);
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((current) => (current <= 0 ? matches.length - 1 : current - 1));
            }

            if (event.key === 'Enter' && highlightedIndex >= 0 && matches[highlightedIndex]) {
              event.preventDefault();
              handleSelect(matches[highlightedIndex].station);
            }

            if (event.key === 'Escape') {
              setIsOpen(false);
              setActiveIndex(-1);
            }
          }}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-[var(--ui-text)] outline-none placeholder:text-[var(--ui-text-muted)] sm:text-[15px]"
          aria-label="Search for a station"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              setActiveIndex(-1);
            }}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
              isDark
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="ui-panel-strong pointer-events-auto absolute inset-x-0 mt-2 overflow-hidden rounded-[24px] shadow-[var(--ui-shadow)]">
          {matches.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[var(--ui-text-muted)]">
              No stations match that search.
            </div>
          ) : (
            <div className="max-h-[20rem] overflow-y-auto py-1">
              {matches.map((match, index) => {
                const isActive = index === highlightedIndex;

                return (
                  <button
                    key={match.station.id}
                    type="button"
                    onClick={() => handleSelect(match.station)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors ${
                      isActive
                        ? 'bg-[var(--ui-brand-soft)]'
                        : 'hover:bg-[var(--ui-surface-muted)]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[var(--ui-text)]">
                        {match.station.name}
                      </div>
                      <div className="mt-1 truncate text-xs text-[var(--ui-text-muted)]">
                        {match.secondaryLabel ?? 'Tap to center on map'}
                      </div>
                    </div>
                    <div className="shrink-0 rounded-full border border-[var(--ui-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ui-text-muted)]">
                      Open
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
