'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CatalogStep } from '@/lib/types';
import { filterSteps, uniqueAreas, uniqueStatuses, buildCatalogHeaders } from '@/lib/catalog';
import { useSettings } from '@/hooks/useSettings';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/providers/Providers';
import { StepDetailModal } from '@/components/StepDetailModal';

// Colore del testo del badge di stato: sullo stesso schema di superficie chiara
// + bordo neutro usato in tutto il cruscotto, mai un colore pieno con testo
// bianco sopra (quei colori non hanno una coppia chiaro/scuro pensata per
// reggere il bianco sopra — solo --blu-fondo ce l'ha).
const STATUS_COLOR: Record<string, string> = {
  wanted: 'var(--ambra)',
  implemented: 'var(--verde)',
  deprecated: 'var(--testo-tenue)',
  proposed: 'var(--blu)',
};

export default function StepCatalog() {
  const router = useRouter();
  const { t } = useLanguage();
  const { settings, loaded } = useSettings();
  const [steps, setSteps] = useState<CatalogStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('');
  const [status, setStatus] = useState('');
  const [selectedStep, setSelectedStep] = useState<CatalogStep | null>(null);

  useEffect(() => {
    if (!loaded) return;
    fetch('/api/catalog', { headers: buildCatalogHeaders(settings) })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setSteps(data.steps ?? []);
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Errore caricamento catalog');
        setLoading(false);
      });
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const areas = uniqueAreas(steps);
  const statuses = uniqueStatuses(steps);
  const filtered = filterSteps(steps, { query, area, status });

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-4 w-1/2 rounded animate-pulse bg-muted" />
            <div className="h-4 w-16 rounded animate-pulse bg-muted" />
            <div className="h-4 w-20 rounded animate-pulse bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Errore: {error}
      </div>
    );
  }

  return (
    <>
    <StepDetailModal step={selectedStep} onClose={() => setSelectedStep(null)} />
    <div className="space-y-4">
      {/* Filtri */}
      <div
        className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
        style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}
      >
        <Input
          type="search"
          placeholder={t.catalog.search}
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="h-9 w-64"
        />

        <Select value={area || null} onValueChange={v => setArea((v ?? '') === '__all__' ? '' : (v ?? ''))}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder={t.catalog.filterArea} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t.catalog.filterArea}</SelectItem>
            {areas.map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status || null} onValueChange={v => setStatus((v ?? '') === '__all__' ? '' : (v ?? ''))}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder={t.catalog.filterStatus} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t.catalog.filterStatus}</SelectItem>
            {statuses.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-sm" style={{ color: 'var(--testo-tenue)' }}>
          {filtered.length} {t.catalog.step}
        </span>
      </div>

      {/* Tabella */}
      <div
        className="overflow-x-auto rounded-lg border"
        style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}
      >
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%]">{t.catalog.colExpression}</TableHead>
              <TableHead>{t.catalog.colArea}</TableHead>
              <TableHead>{t.catalog.colStatus}</TableHead>
              <TableHead>{t.catalog.colApp}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  {t.catalog.noResults}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((step, idx) => (
                <TableRow
                  key={`${step.sourceRef}-${idx}`}
                  className="cursor-pointer select-none"
                  onClick={() => setSelectedStep(step)}
                  onDoubleClick={() => {
                    router.push('/editor?step=' + encodeURIComponent(step.expression));
                  }}
                >
                  <TableCell className="font-mono text-xs whitespace-normal break-words max-w-xs">
                    {step.expression}
                  </TableCell>
                  <TableCell>{step.area}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: 'var(--bordo)',
                        background: 'var(--superficie-tenue)',
                        color: STATUS_COLOR[step.status] ?? 'var(--testo-tenue)',
                      }}
                    >
                      {step.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{step.app}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">{t.catalog.hint}</p>
    </div>
    </>
  );
}
