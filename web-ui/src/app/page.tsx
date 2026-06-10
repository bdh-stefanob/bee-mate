'use client';

import StepCatalog from '@/components/StepCatalog';
import { useLanguage } from '@/providers/Providers';

export default function Home() {
  const { t } = useLanguage();
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t.catalog.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.catalog.description}</p>
      </div>
      <StepCatalog />
    </div>
  );
}
