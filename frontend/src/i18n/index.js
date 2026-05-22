import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import viCommon from './locales/vi/common.json';
import viAuth from './locales/vi/auth.json';

export const SUPPORTED_LANGUAGES = ['en', 'vi'];
export const DEFAULT_NAMESPACE = 'common';

const resources = {
  en: { common: enCommon, auth: enAuth },
  vi: { common: viCommon, auth: viAuth },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    defaultNS: DEFAULT_NAMESPACE,
    ns: ['common', 'auth'],
    interpolation: {
      escapeValue: false, // React already escapes — safe to disable here
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    returnNull: false,
  });

// Keep <html lang="..."> in sync with the active language for a11y + SEO.
const syncHtmlLang = (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
};
i18n.on('languageChanged', syncHtmlLang);
syncHtmlLang(i18n.resolvedLanguage || i18n.language || 'en');

export default i18n;
