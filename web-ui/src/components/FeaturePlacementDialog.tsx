'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Utils (locali — nessuna dipendenza da @/lib per mantenere il componente
// autonomo e riusabile in contesti diversi)
// ---------------------------------------------------------------------------

/** Converte una stringa in slug: lowercase, solo [a-z0-9], separatore '-'. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalizza un path per il confronto anti-overwrite.
 * Gli existingPaths dal server possono avere prefissi come "src/features/app/flow/file.feature".
 * Confronta solo la coda app/flow/file.
 */
function normalizeTail(filePath: string): string {
  return filePath
    .replace(/^src\/features\//, '')
    .replace(/^features\//, '')
    .replace(/\\/g, '/');
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FeaturePlacementDialogProps {
  open: boolean;
  /** Titolo dialog (es. "Importa feature", "Sposta feature", "Salva feature") */
  title: string;
  /** Nome file senza directory (per anteprima path, es. "login.feature") */
  fileBaseName: string;
  /** Valore app pre-compilato (suggerimento da tag o contesto) */
  suggestedApp?: string;
  /** Valore flow pre-compilato (suggerimento da tag o page marker) */
  suggestedFlow?: string;
  /** Etichette pagine rilevate (opzionale — visibile solo se presente) */
  detectedPages?: string[];
  /** Valori app esistenti (per datalist autocomplete) */
  existingApps: string[];
  /** Valori flow esistenti (per datalist autocomplete) */
  existingFlows: string[];
  /** Path esistenti (per guardia anti-overwrite) */
  existingPaths: string[];
  /** Etichetta del pulsante di conferma (default: "Conferma") */
  confirmLabel?: string;
  onCancel: () => void;
  /**
   * Callback chiamata quando l'utente conferma la scelta.
   * Riceve app/flow slugificati e il targetRel (es. "my-app/login/file.feature").
   * Il dialog NON esegue fetch — l'azione (save/move) la decide il chiamante.
   */
  onConfirm: (app: string, flow: string, targetRel: string) => void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeaturePlacementDialog({
  open,
  title,
  fileBaseName,
  suggestedApp = '',
  suggestedFlow = '',
  detectedPages,
  existingApps,
  existingFlows,
  existingPaths,
  confirmLabel = 'Conferma',
  onCancel,
  onConfirm,
}: FeaturePlacementDialogProps) {

  const [app, setApp] = useState(suggestedApp);
  const [flow, setFlow] = useState(suggestedFlow);
  const [overwriteConfirmed, setOverwriteConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Aggiorna i campi quando i valori suggeriti cambiano (nuova apertura)
  useEffect(() => {
    if (open) {
      setApp(suggestedApp);
      setFlow(suggestedFlow);
      setOverwriteConfirmed(false);
      setConfirming(false);
    }
  }, [open, suggestedApp, suggestedFlow]);

  // Escape key chiude il dialog
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  // Ensure .feature extension nel nome file
  const safeBaseName = fileBaseName.endsWith('.feature')
    ? fileBaseName
    : `${fileBaseName}.feature`;

  const appSlug = slugify(app);
  const flowSlug = slugify(flow);
  const targetRel = appSlug && flowSlug
    ? `${appSlug}/${flowSlug}/${safeBaseName}`
    : '';

  // Anti-overwrite guard
  const wouldOverwrite = targetRel
    ? existingPaths.some(p => normalizeTail(p) === targetRel)
    : false;

  const canConfirm =
    Boolean(appSlug) &&
    Boolean(flowSlug) &&
    (!wouldOverwrite || overwriteConfirmed) &&
    !confirming;

  async function handleConfirm() {
    if (!canConfirm) return;
    setConfirming(true);
    try {
      await onConfirm(appSlug, flowSlug, targetRel);
    } finally {
      setConfirming(false);
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
          <p className="text-base font-semibold">
            {title}{' '}
            <span className="font-mono text-sm text-muted-foreground">{safeBaseName}</span>
          </p>
          {!confirming && (
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
            <label className="text-xs font-medium text-foreground" htmlFor="placement-app">
              App
            </label>
            <input
              id="placement-app"
              list="placement-app-list"
              value={app}
              onChange={e => { setApp(e.target.value); setOverwriteConfirmed(false); }}
              placeholder="es. brochure-clinic"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <datalist id="placement-app-list">
              {existingApps.map(a => <option key={a} value={a} />)}
            </datalist>
          </div>

          {/* Flow field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="placement-flow">
              Flow
            </label>
            <input
              id="placement-flow"
              list="placement-flow-list"
              value={flow}
              onChange={e => { setFlow(e.target.value); setOverwriteConfirmed(false); }}
              placeholder="es. login"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <datalist id="placement-flow-list">
              {existingFlows.map(f => <option key={f} value={f} />)}
            </datalist>
          </div>

          {/* Detected pages (opzionale) */}
          {detectedPages && detectedPages.length > 0 && (
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
              <span className="text-muted-foreground italic">
                compila App e Flow per vedere il percorso
              </span>
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
            disabled={confirming}
            className="min-h-[44px]"
          >
            Annulla
          </Button>
          <Button
            size="sm"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="min-h-[44px] bg-teal-600 hover:bg-teal-700 text-white"
          >
            {confirming ? 'In corso…' : confirmLabel}
          </Button>
        </div>

      </div>
    </div>
  );
}

export default FeaturePlacementDialog;
