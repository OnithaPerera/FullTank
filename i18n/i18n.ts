import en from './locales/en.json';
import si from './locales/si.json';

type Locale = 'en' | 'si';

const LOCALE_STORAGE_KEY = 'fulltank_locale';
const defaultLocale: Locale = 'en';

const translations: Record<Locale, Record<string, unknown>> = {
  en: en as unknown as Record<string, unknown>,
  si: si as unknown as Record<string, unknown>,
};

function getObjectByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object' && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, obj);
}

export function getAvailableLocales(): Locale[] {
  return ['en', 'si'];
}

export function getDefaultLocale(): Locale {
  return defaultLocale;
}

export function getCurrentLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;

  const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
  if (saved && getAvailableLocales().includes(saved)) {
    return saved;
  }

  const navLang = window.navigator.language.toLowerCase();
  if (navLang.startsWith('si')) return 'si';
  return defaultLocale;
}

export function setCurrentLocale(locale: Locale): void {
  if (!getAvailableLocales().includes(locale)) return;
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function t(key: string, locale: Locale = defaultLocale): string {
  const trans = translations[locale] || translations[defaultLocale];
  const value = getObjectByPath(trans, key);

  if (typeof value === 'string') {
    return value;
  }

  const fallback = getObjectByPath(translations[defaultLocale], key);
  if (typeof fallback === 'string') {
    return fallback;
  }

  if (typeof window !== 'undefined') {
    console.warn(`i18n missing key: ${key} for locale: ${locale}`);
  }

  return key;
}
