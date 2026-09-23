'use client';

import StepCatalog from '@/components/StepCatalog';
import { useLanguage } from '@/providers/Providers';

export default function Home() {
  const { t } = useLanguage();
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--testo)' }}>{t.catalog.title}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--testo-tenue)' }}>{t.catalog.description}</p>
      </div>
      <StepCatalog />
    </div>
  );
}
