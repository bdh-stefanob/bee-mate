'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { CatalogStep, ParamEnumDef } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STATUS_STYLES: Record<string, string> = {
  wanted:      'bg-[#FF6B2C] text-white border-transparent',
  implemented: 'bg-[#2ECC71] text-white border-transparent',
  deprecated:  'bg-[#9CA3AF] text-white border-transparent',
};

interface Props {
  step: CatalogStep | null;
  onClose: () => void;
}

export function StepDetailModal({ step, onClose }: Props) {
  const router = useRouter();
  const [paramEnums, setParamEnums] = useState<ParamEnumDef[]>([]);
  const [newValues, setNewValues] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step) {
      setParamEnums(step.paramEnums ? JSON.parse(JSON.stringify(step.paramEnums)) : []);
      setNewValues({});
    }
  }, [step]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!step) return null;

  async function handleSave() {
    if (!step) return;
    setSaving(true);
    try {
      const res = await fetch('/api/enums', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: step.expression, paramEnums }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Unknown error');
      toast.success('Enum values salvati in step-enums.json');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Salvataggio fallito');
    } finally {
      setSaving(false);
    }
  }

  function addValue(paramIdx: number) {
    const val = newValues[paramIdx]?.trim();
    if (!val) return;
    setParamEnums(prev => prev.map((p, i) =>
      i === paramIdx ? { ...p, values: [...p.values, val] } : p
    ));
    setNewValues(prev => ({ ...prev, [paramIdx]: '' }));
  }

  function removeValue(paramIdx: number, valIdx: number) {
    setParamEnums(prev => prev.map((p, i) =>
      i === paramIdx ? { ...p, values: p.values.filter((_, vi) => vi !== valIdx) } : p
    ));
  }

  const doc = step.doc;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={e => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <div className="flex-1 min-w-0 mr-4">
            <p className="font-mono text-sm font-semibold break-words">{step.expression}</p>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{step.sourceRef}</p>
          </div>
          <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-5 flex-1">
          {/* Meta row */}
          <div className="flex flex-wrap gap-2 items-center">
            <Badge className={STATUS_STYLES[step.status] ?? ''}>{step.status}</Badge>
            <Badge variant="outline">{step.app}</Badge>
            <Badge variant="outline">{step.area}</Badge>
            {step.page && <Badge variant="outline">{step.page}</Badge>}
          </div>

          {/* Intent */}
          {doc?.intent && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Intent</p>
              <p className="text-sm">{String(doc.intent)}</p>
            </div>
          )}

          {/* Requires */}
          {(step.requires?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Requires</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {step.requires!.map(r => (
                  <li key={r} className="text-xs font-mono">{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Enum editor */}
          {paramEnums.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Parametri e valori selezionabili
              </p>
              <div className="flex flex-col gap-4">
                {paramEnums.map((param, pi) => (
                  <div key={pi} className="rounded-md border border-border p-3">
                    <p className="text-xs font-semibold mb-2">
                      {param.label ?? param.token}
                      <span className="font-normal text-muted-foreground ml-1">({param.token})</span>
                    </p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {param.values.map((v, vi) => (
                        <span key={vi} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                          {v}
                          <button
                            onClick={() => removeValue(pi, vi)}
                            className="text-muted-foreground hover:text-destructive leading-none"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {param.values.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">Nessun valore — free-text</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Input
                        value={newValues[pi] ?? ''}
                        onChange={e => setNewValues(prev => ({ ...prev, [pi]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addValue(pi); } }}
                        placeholder="Aggiungi valore…"
                        className="h-7 text-xs flex-1"
                      />
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => addValue(pi)}>
                        +
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <button
            onClick={() => { router.push('/editor?step=' + encodeURIComponent(step.expression)); onClose(); }}
            className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
          >
            Apri nell&apos;editor →
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Chiudi</Button>
            {paramEnums.length > 0 && (
              <Button size="sm" onClick={handleSave} disabled={saving}
                className="bg-teal-600 hover:bg-teal-700 text-white">
                {saving ? 'Salvataggio…' : 'Salva enum'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StepDetailModal;
