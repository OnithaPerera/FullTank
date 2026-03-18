'use client';

import Link from 'next/link';

type WelcomeModalProps = {
  open: boolean;
  onClose: () => void;
};

const statusItems = [
  { label: 'Red', description: 'Empty or reported out of stock.', color: 'bg-red-500' },
  { label: 'Yellow', description: 'Reported by the community and still waiting for confirmation.', color: 'bg-amber-400' },
  { label: 'Green', description: 'Verified and currently available.', color: 'bg-emerald-500' },
  { label: 'Gray', description: 'Older information that may no longer be reliable.', color: 'bg-slate-400' },
];

export default function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[5000] flex items-end justify-center bg-slate-950/40 p-4 sm:items-center">
      <div className="ui-panel-strong w-full max-w-sm rounded-[28px] px-5 py-5 sm:px-6">
        <p className="ui-kicker">First Visit</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">How the map works</h2>
        <p className="ui-text-muted mt-2 text-sm leading-6">
          Marker color is the fastest way to read the map. Tap any station card for queue details, trust status,
          directions, or an update form.
        </p>

        <div className="mt-5 space-y-2.5">
          {statusItems.map((item) => (
            <div key={item.label} className="ui-panel-muted rounded-[20px] px-3.5 py-3">
              <div className="flex items-start gap-3">
                <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${item.color}`}></span>
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="ui-text-muted mt-1 text-sm leading-5">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="ui-panel-muted mt-4 rounded-[22px] px-4 py-3.5">
          <p className="text-sm font-semibold">Trust and confirmations</p>
          <p className="ui-text-muted mt-1 text-sm leading-5">
            Yellow markers turn green after 3 separate users tap <strong>Confirm</strong>. If the station changes,
            use <strong>Update Station Data</strong> to send a fresh report.
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
