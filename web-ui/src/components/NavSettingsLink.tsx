'use client';
import Link from 'next/link';
import { Settings as SettingsIcon } from 'lucide-react';
import { useLanguage } from '@/providers/Providers';

export function NavSettingsLink() {
  const { t } = useLanguage();
  return (
    <Link
      href="/settings"
      className="flex items-center gap-1 text-sm text-teal-100 hover:text-white transition-colors"
    >
      <SettingsIcon className="w-4 h-4" />
      {t.settings.nav}
    </Link>
  );
}
