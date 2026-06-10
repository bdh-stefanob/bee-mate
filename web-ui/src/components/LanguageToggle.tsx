'use client';

import { useLanguage } from '@/providers/Providers';

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'it' : 'en')}
      className="text-xs font-semibold px-2 py-1 rounded hover:bg-white/20 transition-colors text-white uppercase tracking-wider"
      aria-label="Toggle language"
    >
      {lang === 'en' ? 'IT' : 'EN'}
    </button>
  );
}
