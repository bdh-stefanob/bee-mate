'use client';

import dynamic from 'next/dynamic';

// Editor depends entirely on browser APIs (localStorage, CodeMirror).
// ssr:false prevents server/client HTML mismatch (hydration error).
const EditorContent = dynamic(
  () => import('./_content').then(m => m.EditorContent),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center text-muted-foreground text-sm">
        Caricamento editor…
      </div>
    ),
  }
);

export default function EditorPage() {
  return <EditorContent />;
}
