'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { extractPageMarkers } from '@/lib/page-markers';
import { getFeatureTags } from '@/lib/feature-tags';
import { FeaturePlacementDialog } from '@/components/FeaturePlacementDialog';

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

// ---------------------------------------------------------------------------
// Props — firma esterna INVARIATA rispetto alla versione originale
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

  // Calcola i valori suggeriti dai tag nel contenuto (o fallback ai page marker)
  const getSuggestions = useCallback(() => {
    const { app: tagApp, flow: tagFlow } = getFeatureTags(content);
    const suggestedApp = slugify(tagApp ?? '');
    const pages = extractPageMarkers(content);
    const suggestedFlow = slugify(tagFlow ?? '') || slugify(pages[0]?.page ?? '');
    const detectedPages = pages.map(p => p.display);
    return { suggestedApp, suggestedFlow, detectedPages };
  }, [content]);

  const { suggestedApp, suggestedFlow, detectedPages } = getSuggestions();

  // Estrai basename (senza directory)
  const baseName = fileName.split(/[/\\]/).pop() ?? fileName;

  // onConfirm esegue il POST /api/features con il content verbatim
  const handleConfirm = useCallback(async (app: string, flow: string, targetRel: string) => {
    const res = await fetch('/api/features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, filePath: targetRel }),
    });
    const data = await res.json() as { ok?: boolean; path?: string; error?: string };
    if (!data.ok) throw new Error(data.error ?? 'Errore sconosciuto');
    toast.success(`Salvato: ${data.path ?? targetRel}`);
    onSaved(data.path ?? targetRel);
  }, [content, onSaved]);

  return (
    <FeaturePlacementDialog
      open={open}
      title="Importa feature:"
      fileBaseName={baseName}
      suggestedApp={suggestedApp}
      suggestedFlow={suggestedFlow}
      detectedPages={detectedPages}
      existingApps={existingApps}
      existingFlows={existingFlows}
      existingPaths={existingPaths}
      confirmLabel="Salva"
      onCancel={onCancel}
      onConfirm={handleConfirm}
    />
  );
}

export default FeatureImportDialog;
