'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FeaturePreviewProps {
  file: string | null;
}

/**
 * FeaturePreview: mostra il contenuto di un .feature e offre un link download.
 * Fetch del contenuto via /api/download?file=<encoded> (T-04-12: encodeURIComponent).
 */
export default function FeaturePreview({ file }: FeaturePreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setContent(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch('/api/download?file=' + encodeURIComponent(file))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [file]);

  if (!file) {
    return (
      <Card className="h-full flex items-center justify-center text-muted-foreground text-sm">
        <CardContent className="pt-6">
          Seleziona un feature file per visualizzarne il contenuto.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-sm font-mono">{file}</CardTitle>
        <a
          href={'/api/download?file=' + encodeURIComponent(file)}
          download
          className="text-xs text-primary underline hover:no-underline ml-auto"
        >
          Download
        </a>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {loading && (
          <p className="text-muted-foreground text-sm">Caricamento...</p>
        )}
        {error && (
          <p className="text-destructive text-sm">Errore: {error}</p>
        )}
        {content && !loading && (
          <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
