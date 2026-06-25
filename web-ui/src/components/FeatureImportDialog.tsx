'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { extractPageMarkers } from '@/lib/page-markers';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

/** Converte una stringa in slug: lowercase, solo [a-z0-9], separatore '-'. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Estrae il basename senza directory da un path (es. "dir/file.feature" → "file.feature"). */
function basename(filePath: string): string {
  return filePath.split(/[/\\]/).pop() ?? filePath;
}

/**
 * Normalizza un path per il confronto anti-overwrite.
 * Gli existingPaths dal server possono avere prefissi come "src/features/app/flow/file.feature".
 * Confronta solo la coda app/flow/file.
 */
function normalizeTail(filePath: string): string {
  // Rimuovi "src/features/" o "features/" dal prefisso
  return filePath
    .replace(/^src\/features\//, '')
    .replace(/^features\//, '')
    .replace(/\\/g, '/');
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FeatureImportDialogProps {
  open: boolean;
  fileName: string;          // nome file originale (es. "login.feature")
  content: string;           // contenuto verbatim del file caricato
  existingApps: string[];    // valori app esistenti (per datalist)
  existingFlows: string[];   // valori flow esistenti (per datalist)
  existingPaths: string[];   // file path esistenti (per guardia anti-overwrite)
  onCancel: () => void;
  onSaved: (savedPath: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeatureImportDialog({
  open,
  fileName,
  content,
  existingApps,
  existingFlows,
  existingPaths,
  onCancel,
  onSaved,
}: FeatureImportDialogProps) {

  // Derive suggestions from content on first open
  const getSuggestions = useCallback(() => {
    const tagLine = content.match(/^(@\S+(?:\s+@\S+)*)/m);
    const tags = tagLine?.[1].match(/@(\S+)/g)?.map(t => t.slice(1)) ?? [];
    const suggestedApp = slugify(tags[0] ?? '');
    const pages = extractPageMarkers(content);
    const suggestedFlow =
      slugify(tags[1] ?? '') || slugify(pages[0]?.page ?? '');
    const detectedPages = pages.map(p => p.display);
    return { suggestedApp, suggestedFlow, detectedPages };
  }, [content]);

  const [app, setApp] = useState('');
  const [flow, setFlow] = useState('');
  const [detectedPages, setDetectedPages] = useState<string[]>([]);
  const [overwriteConfirmed, setOverwriteConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset state when dialog opens with new file
  useEffect(() => {
    if (open) {
      const { suggestedApp, suggestedFlow, detectedPages: pages } = getSuggestions();
      setApp(suggestedApp);
      setFlow(suggestedFlow);
      setDetectedPages(pages);
      setOverwriteConfirmed(false);
      setSaving(false);
    }
  }, [open, getSuggestions]);

  // Escape key closes the dialog
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  // Derived values
  const appSlug = slugify(app);
  const flowSlug = slugify(flow);
  const baseName = basename(fileName);
  // Ensure .feature extension
  const safeBaseName = baseName.endsWith('.feature') ? baseName : `${baseName}.feature`;
  const targetRel = appSlug && flowSlug
    ? `${appSlug}/${flowSlug}/${safeBaseName}`
    : '';

  // Anti-overwrite guard
  const wouldOverwrite = targetRel
    ? existingPaths.some(p => normalizeTail(p) === targetRel)
    : false;

  const canSave =
    Boolean(appSlug) &&
    Boolean(flowSlug) &&
    (!wouldOverwrite || overwriteConfirmed) &&
    !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await fetch('/api/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, filePath: targetRel }),
      });
      const data = await res.json() as { ok?: boolean; path?: string; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Errore sconosciuto');
      toast.success(`Salvato: ${data.path ?? targetRel}`);
      onSaved(data.path ?? targetRel);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Salvataggio fallito');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-lg flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="text-base font-semibold">Importa feature: <span className="font-mono text-sm text-muted-foreground">{baseName}</span></p>
          {!saving && (
            <button
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground text-lg leading-none"
              aria-label="Chiudi dialog"
            >
              ✕
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4">

          {/* App field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="import-app">
              App
            </label>
            <input
              id="import-app"
              list="import-app-list"
              value={app}
              onChange={e => { setApp(e.target.value); setOverwriteConfirmed(false); }}
              placeholder="es. brochure-clinic"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <datalist id="import-app-list">
              {existingApps.map(a => <option key={a} value={a} />)}
            </datalist>
          </div>

          {/* Flow field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="import-flow">
              Flow
            </label>
            <input
              id="import-flow"
              list="import-flow-list"
              value={flow}
              onChange={e => { setFlow(e.target.value); setOverwriteConfirmed(false); }}
              placeholder="es. login"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <datalist id="import-flow-list">
              {existingFlows.map(f => <option key={f} value={f} />)}
            </datalist>
          </div>

          {/* Detected pages */}
          {detectedPages.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Pagine rilevate: </span>
              {detectedPages.join(', ')}
            </div>
          )}

          {/* Target path preview */}
          <div className="text-xs">
            <span className="font-medium text-foreground">Percorso di destinazione: </span>
            {targetRel ? (
              <span className="font-mono text-teal-600 dark:text-teal-400">
                src/features/{targetRel}
              </span>
            ) : (
              <span className="text-muted-foreground italic">compila App e Flow per vedere il percorso</span>
            )}
          </div>

          {/* Anti-overwrite warning */}
          {wouldOverwrite && (
            <div className="rounded-md border border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 px-3 py-2 text-xs text-yellow-800 dark:text-yellow-300 flex flex-col gap-2">
              <p className="font-semibold">Esiste gia un file in questo percorso — sovrascrivere?</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overwriteConfirmed}
                  onChange={e => setOverwriteConfirmed(e.target.checked)}
                  className="accent-yellow-600"
                />
                <span>Confermo la sovrascrittura</span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={saving}
            className="min-h-[44px]"
          >
            Annulla
          </Button>
          <Button
            size="sm"
            disabled={!canSave}
            onClick={handleSave}
            className="min-h-[44px] bg-teal-600 hover:bg-teal-700 text-white"
          >
            {saving ? 'Salvataggio…' : 'Salva'}
          </Button>
        </div>

      </div>
    </div>
  );
}

export default FeatureImportDialog;
