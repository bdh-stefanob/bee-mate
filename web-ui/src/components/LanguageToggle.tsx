'use client';

import { useLanguage } from '@/providers/Providers';

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'it' : 'en')}
      className="min-h-10 min-w-10 inline-flex items-center justify-center text-xs font-semibold px-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors uppercase tracking-wider focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ color: 'var(--testo-tenue)', outlineColor: 'var(--blu)' }}
      aria-label="Toggle language"
    >
      {lang === 'en' ? 'IT' : 'EN'}
    </button>
  );
}
