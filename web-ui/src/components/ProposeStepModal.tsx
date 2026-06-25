'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  expression: string;
  keyword: 'Given' | 'When' | 'Then';
  areas: string[];          // existing catalog areas for the dropdown
  app: string;              // derived from feature tags by the caller
  submitting?: boolean;
  errorText?: string | null; // duplicate error shown inline
  onSubmit: (area: string) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProposeStepModal({
  open,
  expression,
  keyword,
  areas,
  submitting = false,
  errorText,
  onSubmit,
  onClose,
}: Props) {
  const [area, setArea] = useState('');

  // Reset area selection when modal opens with a new expression
  useEffect(() => {
    if (open) setArea('');
  }, [open, expression]);

  // Escape key closes the modal
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <div className="flex-1 min-w-0 mr-4">
            <p className="font-mono text-sm font-semibold break-words">{expression}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-muted-foreground hover:text-foreground text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4 flex-1">
          {/* Inline duplicate / error message */}
          {errorText && (
            <p className="text-destructive text-xs">{errorText}</p>
          )}

          {/* Keyword — read-only badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Keyword:</span>
            <Badge variant="outline">{keyword}</Badge>
          </div>

          {/* Area select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="propose-area-select">
              Area
            </label>
            <Select
              value={area || null}
              onValueChange={v => setArea(v ?? '')}
            >
              <SelectTrigger id="propose-area-select" className="h-9 w-full">
                <SelectValue placeholder="Select area…" />
              </SelectTrigger>
              <SelectContent>
                {areas.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={submitting || !area}
            onClick={() => onSubmit(area)}
            className="bg-teal-600 hover:bg-teal-700 text-white min-h-[44px]"
          >
            {submitting ? 'Proposing…' : 'Propose step'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ProposeStepModal;
