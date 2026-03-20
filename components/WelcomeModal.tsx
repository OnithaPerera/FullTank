'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type WelcomeModalProps = {
  open: boolean;
  onClose: () => void;
};

const statusItems = [
  { label: 'Reported Unavailable', description: 'Latest report says the station is out of stock.', color: 'bg-red-500' },
  { label: 'Awaiting Review', description: 'Reported by the community and still waiting for more confirmations.', color: 'bg-amber-400' },
  { label: 'Verified', description: 'Fresh report with 3 confirmations behind it.', color: 'bg-emerald-500' },
  { label: 'Stale Report', description: 'Older information that may no longer be reliable.', color: 'bg-slate-400' },
];

export default function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      const frame = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setIsVisible(false);
    const timeout = window.setTimeout(() => setIsMounted(false), 180);
    return () => window.clearTimeout(timeout);
  }, [open]);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-3 sm:p-4">
      <div data-state={isVisible ? 'open' : 'closed'} className="ui-backdrop absolute inset-0 bg-slate-950/50 sm:backdrop-blur-[2px]" />
      <div data-state={isVisible ? 'open' : 'closed'} className="ui-panel-strong ui-presence relative w-full max-w-sm max-h-[85dvh] overflow-y-auto rounded-[28px] px-5 py-5 sm:px-6 no-scrollbar shadow-2xl">
        <p className="ui-kicker">First Visit</p>
        <h2 className="mt-2 text-[1.65rem] font-semibold tracking-[-0.045em]">How the map works</h2>
        <p className="ui-text-muted mt-2 text-[0.92rem] leading-6">
          Marker color is the fastest way to scan the map. Open any station popup for queue details, trust status,
          explicit per-fuel availability, directions, or a fresh update form.
        </p>

        <div className="mt-5 space-y-2.5">
          {statusItems.map((item) => (
            <div key={item.label} className="ui-panel-muted rounded-[20px] px-3.5 py-3">
              <div className="flex items-start gap-3">
                <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${item.color}`}></span>
                <div>
                  <p className="text-[0.9rem] font-semibold tracking-[-0.02em]">{item.label}</p>
                  <p className="ui-text-muted mt-1 text-[13px] sm:text-[0.88rem] leading-5">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="ui-panel-muted mt-4 rounded-[22px] px-4 py-3.5">
          <p className="text-[0.92rem] font-semibold tracking-[-0.02em]">Trust and confirmations</p>
          <p className="ui-text-muted mt-1 text-[13px] sm:text-[0.88rem] leading-5">
            Yellow markers turn green after 3 separate users tap <strong>Confirm</strong>. If the station changes,
            use <strong>Update</strong> to send a fresh report with queue and fuel details.
          </p>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="ui-button-brand flex-1"
          >
            Got it
          </button>

          <Link href="/about" onClick={onClose} className="ui-button-neutral">
            Learn More
          </Link>
        </div>
      </div>
    </div>
  );
}
