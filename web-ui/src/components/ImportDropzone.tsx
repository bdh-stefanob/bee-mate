'use client';

import { useState, useRef } from 'react';
import { useLanguage } from '@/providers/Providers';
import { toast } from 'sonner';

interface ImportDropzoneProps {
  onImported: (featureContent: string) => void;
}

type ImportState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; newCount: number; skipCount: number; featurePath: string | null }
  | { status: 'error'; error: string };

/**
 * ImportDropzone
 *
 * Area drag-drop + file picker per file .txt.
 * Al drop/select: POST /api/import con FormData.
 * Su ok: chiama onImported(featureContent) e mostra riepilogo N step nuovi, M skippati.
 * Su errore: mostra il messaggio di errore.
 */
export function ImportDropzone({ onImported }: ImportDropzoneProps) {
  const { t } = useLanguage();
  const [state, setState] = useState<ImportState>({ status: 'idle' });
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.feature')) {
      setState({ status: 'error', error: 'Accetta solo file .txt' });
      return;
    }

    setState({ status: 'loading' });

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
