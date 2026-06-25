'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  commitName: string;
  commitEmail: string;
  targetBranch: string;
  pushing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// CommitPreviewDialog
//
// Confirm-before-push modal (D-08).
// Pattern: same as StepDetailModal — fixed inset overlay, bg-black/50 backdrop,
// Escape-to-close, max-w-md card.
// UI-SPEC: max-w-md (448px), "Review commit" title, identity in font-mono,
// teal "Push to catalog" button, ghost "Cancel" button.
// WCAG 2.5.5: all buttons min 44px height (min-h-11 / py-2.5).
// ---------------------------------------------------------------------------

export function CommitPreviewDialog({
  open,
  commitName,
  commitEmail,
  targetBranch,
  pushing = false,
  onConfirm,
  onCancel,
}: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const hasIdentity = Boolean(commitName && commitEmail);

  // Escape key closes the dialog
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={e => {
        if (e.target === backdropRef.current) onCancel();
      }}
    >
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-md flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="text-base font-semibold">Review commit</p>
          {!pushing && (
            <button
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground text-lg leading-none"
              aria-label="Close dialog"
            >
              ✕
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {hasIdentity ? (
            <p className="font-mono text-sm break-all">
              Committing as: {commitName} &lt;{commitEmail}&gt;
              {' '}→ branch:{' '}
              <span className="inline-block bg-teal-600 text-white text-xs px-2 py-0.5 rounded font-sans">
                {targetBranch}
              </span>
            </p>
          ) : (
            <p className="text-sm text-destructive">
              Commit identity not configured. Go to Settings → Commit identity to add your name and email.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          {!pushing && (
            <Button
              variant="ghost"
              onClick={onCancel}
              className="min-h-11 py-2.5"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={onConfirm}
            disabled={pushing || !commitName || !commitEmail}
            className="min-h-11 py-2.5"
          >
            {pushing ? 'Pushing…' : 'Push to catalog'}
          </Button>
        </div>

      </div>
    </div>
  );
}

export default CommitPreviewDialog;
