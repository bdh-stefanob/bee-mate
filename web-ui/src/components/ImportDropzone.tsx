'use client';

import { useState, useRef } from 'react';
import { useLanguage } from '@/providers/Providers';
import { toast } from 'sonner';
import { isExtendedFormat, parseExtendedFormat, type ExtractedStepEnum } from '@/lib/import-extended';

interface ImportDropzoneProps {
  onImported: (featureContent: string) => void;
  onLoadFeature?: (featureContent: string) => void;
  /** 'dropzone' (default) = full drag-drop box; 'button' = compact header button (file picker only). */
  variant?: 'dropzone' | 'button';
}

type ImportState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; newCount: number; skipCount: number; featurePath: string | null }
  | { status: 'extended'; extractedEnums: ExtractedStepEnum[] }
  | { status: 'error'; error: string };

/**
 * ImportDropzone
 *
 * Area drag-drop + file picker per file .txt.
 * Al drop/select: POST /api/import con FormData.
 * Su ok: chiama onImported(featureContent) e mostra riepilogo N step nuovi, M skippati.
 * Su errore: mostra il messaggio di errore.
 */
export function ImportDropzone({ onImported, onLoadFeature, variant = 'dropzone' }: ImportDropzoneProps) {
  const { t } = useLanguage();
  const [state, setState] = useState<ImportState>({ status: 'idle' });
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.feature')) {
      setState({ status: 'error', error: 'Accetta solo file .txt o .feature' });
      return;
    }

    setState({ status: 'loading' });

    // .feature files contain valid Gherkin — load verbatim, never process via import-scenarios
    if (file.name.endsWith('.feature')) {
      const text = await file.text();
      if (onLoadFeature) {
        onLoadFeature(text);
        setState({ status: 'success', newCount: 0, skipCount: 0, featurePath: file.name });
        toast.success('Feature caricato in un nuovo tab');
      } else {
        // Fallback: no onLoadFeature prop — keep backward-compat behaviour for other call sites
        onImported(text);
        setState({ status: 'success', newCount: 0, skipCount: 0, featurePath: file.name });
      }
      return;
    }

    const text = await file.text();

    // Detect extended QA team format (#PageName markers or [enum] suffixes)
    if (isExtendedFormat(text)) {
      const { gherkin, extractedEnums } = parseExtendedFormat(text);
      onImported(gherkin);
      setState({ status: 'extended', extractedEnums });
      toast.success('Formato esteso importato e convertito in Gherkin');
      return;
    }

    // Standard import via server
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (json.ok) {
        onImported(json.featureContent ?? '');
        setState({
          status: 'success',
          newCount: json.newCount ?? 0,
          skipCount: json.skipCount ?? 0,
          featurePath: json.featurePath ?? null,
        });
      } else {
        const errorMsg = json.error ?? 'Errore sconosciuto durante l\'import';
        setState({ status: 'error', error: errorMsg });
        toast.error(`Importazione fallita: ${errorMsg}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore di rete';
      setState({ status: 'error', error: msg });
      toast.error(`Importazione fallita: ${msg}`);
    }
  };

  // Drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  // File picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // reset input per permettere di selezionare lo stesso file di nuovo
    e.target.value = '';
  };

  // Compact header-button variant — file picker only (feedback via toast). Used in the editor header.
  if (variant === 'button') {
    return (
      <>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={state.status === 'loading'}
          title="Importa un file .feature o .txt"
          className="px-3 py-1.5 text-sm rounded-md border border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.status === 'loading' ? t.editor.importLoading : 'Import'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.feature"
          className="hidden"
          onChange={handleFileChange}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Drop area */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Import .txt file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-md cursor-pointer transition-colors text-sm ${
          isDragging
            ? 'border-teal-500 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
            : 'border-border text-muted-foreground hover:border-teal-400 hover:text-teal-600 dark:hover:text-teal-400'
        }`}
      >
        <svg
          className="w-4 h-4 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <span>
          {state.status === 'loading'
            ? t.editor.importLoading
            : t.editor.importHint}
        </span>
      </div>

      {/* Input nascosto */}
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.feature"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Feedback */}
      {state.status === 'success' && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-sm">
          <svg
            className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-700 dark:text-green-300">
            Import completato —{' '}
            <strong>{state.newCount} step nuovi</strong>,{' '}
            <strong>{state.skipCount} skippati</strong>
            {state.featurePath && (
              <span className="block text-xs text-green-600 dark:text-green-400 mt-0.5 font-mono truncate">
                {state.featurePath}
              </span>
            )}
          </span>
        </div>
      )}

      {state.status === 'extended' && (
        <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-xs">
          <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">
            Formato esteso convertito in Gherkin
          </p>
          {state.extractedEnums.length > 0 && (
            <>
              <p className="text-blue-600 dark:text-blue-400 mb-1">
                {state.extractedEnums.length} step con parametri estratti:
              </p>
              <ul className="space-y-2">
                {state.extractedEnums.map((e, i) => (
                  <li key={i} className="text-[10px] text-blue-600 dark:text-blue-400">
                    <p className="font-mono font-semibold truncate">{e.stepExpression}</p>
                    <ul className="pl-2 mt-0.5 space-y-0.5">
                      {e.paramEnums.map((p, pi) => (
                        <li key={pi}>
                          <span className="text-blue-500">{p.label}:</span>{' '}
                          {p.values.join(', ')}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {state.status === 'error' && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-sm">
          <svg
            className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="text-red-700 dark:text-red-300">{state.error}</span>
        </div>
      )}
    </div>
  );
}
