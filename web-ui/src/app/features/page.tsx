'use client';

import { useEffect, useState } from 'react';
import type { FeatureSummary } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import FeaturePreview from '@/components/FeaturePreview';
import { useLanguage } from '@/providers/Providers';

export default function FeaturesPage() {
  const { t } = useLanguage();
  const [features, setFeatures] = useState<FeatureSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/features')
      .then((res) => res.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          setFeatures(data as FeatureSummary[]);
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load features');
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 max-w-screen-xl mx-auto flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t.features.title}</h1>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Lista feature */}
        <div className="w-80 flex flex-col gap-2 overflow-y-auto shrink-0">
          {loading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4 items-center p-3 rounded-md border border-border">
                  <div className="h-5 w-1/3 rounded animate-pulse bg-muted" />
                  <div className="h-4 w-16 rounded animate-pulse bg-muted" />
                  <div className="h-4 w-8 rounded animate-pulse bg-muted" />
                </div>
              ))}
            </div>
          )}
          {!loading && error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {!loading && !error && features.length === 0 && (
            <p className="text-muted-foreground text-sm">{t.features.noFiles}</p>
          )}
          {features.map((f) => (
            <Card
              key={f.file}
              className={`cursor-pointer transition-colors hover:bg-accent ${
                selected === f.file ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelected(f.file)}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">
                    {f.area}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {f.scenarioCount} {t.features.colScenarios.toLowerCase()}
                  </span>
                </div>
                <p className="text-sm font-medium leading-snug">{f.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
                  {f.file}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pannello preview */}
        <div className="flex-1 min-w-0">
          <FeaturePreview file={selected} />
        </div>
      </div>
    </div>
  );
}
