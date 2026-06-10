'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CatalogStep } from '@/lib/types';
import { filterSteps, uniqueAreas, uniqueStatuses } from '@/lib/catalog';
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

const STATUS_STYLES: Record<string, string> = {
  wanted:      'bg-[#FF6B2C] text-white border-transparent',
  implemented: 'bg-[#2ECC71] text-white border-transparent',
  deprecated:  'bg-[#9CA3AF] text-white border-transparent',
};

export default function StepCatalog() {
  const router = useRouter();
  const [steps, setSteps] = useState<CatalogStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch('/api/catalog')
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
  }, []);

  const areas = uniqueAreas(steps);
  const statuses = uniqueStatuses(steps);
  const filtered = filterSteps(steps, { query, area, status });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Caricamento step catalog…
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
    <div className="space-y-4">
      {/* Filtri */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          placeholder="Cerca per expression…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="h-9 w-64"
        />

        <Select value={area || undefined} onValueChange={v => setArea((v ?? '') === '__all__' ? '' : (v ?? ''))}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Tutte le aree" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tutte le aree</SelectItem>
            {areas.map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status || undefined} onValueChange={v => setStatus((v ?? '') === '__all__' ? '' : (v ?? ''))}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Tutti gli status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tutti gli status</SelectItem>
            {statuses.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} step
        </span>
      </div>

      {/* Tabella */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%]">Expression</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>App</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Nessuno step trovato
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((step, idx) => (
                <TableRow
                  key={`${step.sourceRef}-${idx}`}
                  className="cursor-pointer select-none"
                  onDoubleClick={() => {
                    router.push('/editor?step=' + encodeURIComponent('Given ' + step.expression));
                  }}
                >
                  <TableCell className="font-mono text-xs whitespace-normal break-words max-w-xs">
                    {step.expression}
                  </TableCell>
                  <TableCell>{step.area}</TableCell>
                  <TableCell>
                    <Badge
                      className={STATUS_STYLES[step.status] ?? 'bg-muted text-muted-foreground border-transparent'}
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

      <p className="text-xs text-muted-foreground">
        Doppio click su una riga per aprirla nell&apos;editor.
      </p>
    </div>
  );
}
