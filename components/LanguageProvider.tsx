'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentLocale, setCurrentLocale, t as translate } from '../i18n/i18n';

type Locale = 'en' | 'si';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  availableLocales: Locale[];
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getCurrentLocale());

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (nextLocale: Locale) => {
    if (nextLocale !== locale) {
      setCurrentLocale(nextLocale);
      setLocaleState(nextLocale);
      if (typeof window !== 'undefined') {
        // ensure full re-render with locale changes applied everywhere
        window.location.reload();
      }
    }
  };

  const value: I18nContextValue = {
    locale,
    setLocale,
    t: (key: string) => translate(key, locale),
    availableLocales: ['en', 'si'],
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within LanguageProvider');
  }
  return context;
}
