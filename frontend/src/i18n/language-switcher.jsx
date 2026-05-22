import React from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from './index.js';

/**
 * Minimal language switcher.
 * Renders a labelled <select> and calls i18n.changeLanguage on change.
 * Persists choice via i18next-browser-languagedetector → localStorage.
 */
export function LanguageSwitcher({ className = '' }) {
  const { t, i18n } = useTranslation('common');
  const current = i18n.resolvedLanguage || i18n.language || 'en';

  const handleChange = (event) => {
    void i18n.changeLanguage(event.target.value);
  };

  return (
    <label className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <span className="sr-only">{t('language')}</span>
      <select
        value={current}
        onChange={handleChange}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm hover:border-slate-400 focus:border-blue-500"
        aria-label={t('language')}
      >
        {SUPPORTED_LANGUAGES.map((lng) => (
          <option key={lng} value={lng}>
            {t(`languages.${lng}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
