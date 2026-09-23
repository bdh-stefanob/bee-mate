'use client';
import Link from 'next/link';
import { Settings as SettingsIcon } from 'lucide-react';
import { useLanguage } from '@/providers/Providers';

export function NavSettingsLink() {
  const { t } = useLanguage();
  return (
    <Link
      href="/settings"
      className="min-h-10 inline-flex items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ color: 'var(--testo-tenue)', outlineColor: 'var(--blu)' }}
    >
      <SettingsIcon className="w-4 h-4" aria-hidden="true" />
      {t.settings.nav}
    </Link>
  );
}
