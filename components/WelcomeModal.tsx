'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from './LanguageProvider';

type WelcomeModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  const { t } = useI18n();

  const statusItems = [
    { label: t('welcomeModal.status.reportedUnavailable.label'), description: t('welcomeModal.status.reportedUnavailable.desc'), color: 'bg-red-500' },
    { label: t('welcomeModal.status.awaitingReview.label'), description: t('welcomeModal.status.awaitingReview.desc'), color: 'bg-amber-400' },
    { label: t('welcomeModal.status.verified.label'), description: t('welcomeModal.status.verified.desc'), color: 'bg-emerald-500' },
    { label: t('welcomeModal.status.stale.label'), description: t('welcomeModal.status.stale.desc'), color: 'bg-slate-400' },
  ];
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        <p className="ui-kicker">{t('welcomeModal.kicker')}</p>
        <h2 className="mt-2 text-[1.65rem] font-semibold tracking-[-0.045em]">{t('welcomeModal.headline')}</h2>
        <p className="ui-text-muted mt-2 text-[0.92rem] leading-6">
          {t('welcomeModal.description')}
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
          <p className="text-[0.92rem] font-semibold tracking-[-0.02em]">{t('welcomeModal.trustHeading')}</p>
          <p className="ui-text-muted mt-1 text-[13px] sm:text-[0.88rem] leading-5">
            {t('welcomeModal.trustDescription')}
          </p>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="ui-button-brand flex-1"
          >
            {t('welcomeModal.gotIt')}
          </button>

          <Link href="/about" onClick={onClose} className="ui-button-neutral">
            {t('welcomeModal.learnMore')}
          </Link>
        </div>
      </div>
    </div>
  );
}
