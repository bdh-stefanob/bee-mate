'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { FeatureSummary } from '@/lib/types';
import FeaturePreview from '@/components/FeaturePreview';
import FeatureImportDialog from '@/components/FeatureImportDialog';
import FeaturePlacementDialog from '@/components/FeaturePlacementDialog';
import { useLanguage } from '@/providers/Providers';
import { toast } from 'sonner';

/** Estrae il basename da un path POSIX o Windows. */
function basename(filePath: string): string {
  return filePath.replace(/\\/g, '/').split('/').pop() ?? filePath;
}

// ---------------------------------------------------------------------------
// Tree building
// ---------------------------------------------------------------------------

interface TreeNode {
  app: string;
  flows: {
    flow: string;
    features: FeatureSummary[];
  }[];
}

function buildTree(features: FeatureSummary[]): { tree: TreeNode[]; flat: FeatureSummary[] } {
  const appMap = new Map<string, Map<string, FeatureSummary[]>>();
  const flat: FeatureSummary[] = [];

  for (const f of features) {
    if (!f.app || !f.flow) {
      flat.push(f);
      continue;
    }
    if (!appMap.has(f.app)) appMap.set(f.app, new Map());
    const flowMap = appMap.get(f.app)!;
    if (!flowMap.has(f.flow)) flowMap.set(f.flow, []);
    flowMap.get(f.flow)!.push(f);
  }

  const tree: TreeNode[] = [];
  for (const [app, flowMap] of appMap) {
    const flows = [];
    for (const [flow, feats] of flowMap) {
      flows.push({ flow, features: feats });
    }
    tree.push({ app, flows });
  }
  return { tree, flat };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FeaturesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [features, setFeatures] = useState<FeatureSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedApps, setCollapsedApps] = useState<Set<string>>(new Set());
  const [collapsedFlows, setCollapsedFlows] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importTarget, setImportTarget] = useState<{ fileName: string; content: string } | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<{ file: string; app: string; flow: string } | null>(null);
  const [dragOverFlow, setDragOverFlow] = useState<string | null>(null);

  function loadFeatures() {
    setLoading(true);
    fetch('/api/features')
      .then(res => res.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setFeatures(data as FeatureSummary[]);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load features');
        setLoading(false);
      });
  }

  useEffect(() => { loadFeatures(); }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    if (!file) return;
    if (!file.name.endsWith('.feature')) {
      toast.error('Seleziona un file .feature');
      return;
    }
    setUploading(true);
    try {
      const content = await file.text();
      setImportTarget({ fileName: file.name, content });
      setImportOpen(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lettura file fallita');
    } finally {
      setUploading(false);
    }
  }

  const { tree, flat } = useMemo(() => buildTree(features), [features]);

  const existingApps = useMemo(
    () => [...new Set(features.map(f => f.app).filter((a): a is string => Boolean(a)))],
    [features],
  );
  const existingFlows = useMemo(
    () => [...new Set(features.map(f => f.flow).filter((f): f is string => Boolean(f)))],
    [features],
  );
  const existingPaths = useMemo(() => features.map(f => f.file), [features]);

  function toggleApp(app: string) {
    setCollapsedApps(prev => {
      const next = new Set(prev);
      if (next.has(app)) { next.delete(app); } else { next.add(app); }
      return next;
    });
  }

  function toggleFlow(key: string) {
    setCollapsedFlows(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  }

  async function openInEditor(file: string) {
    const res = await fetch(`/api/download?file=${encodeURIComponent(file)}`);
    if (!res.ok) return;
    const content = await res.text();
    localStorage.setItem('gsd-editor-incoming', JSON.stringify({ content, filePath: file }));
    router.push('/editor');
  }

  function renderFeatureRow(f: FeatureSummary, indent: string) {
    const active = selected === f.file;
    return (
      <div
        key={f.file}
        draggable
        onDragStart={e => {
          e.dataTransfer.setData('text/plain', f.file);
          e.dataTransfer.effectAllowed = 'move';
        }}
        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors ${
          active ? 'bg-teal-600 text-white' : 'hover:bg-muted text-foreground'
        }`}
        style={{ paddingLeft: indent }}
        onClick={() => setSelected(f.file)}
      >
        <span className="flex-1 truncate font-medium" title={f.name}>{f.name}</span>
        <span className={`shrink-0 ${active ? 'text-teal-200' : 'text-muted-foreground'}`}>
          {f.scenarioCount} sc.
        </span>
        <button
          onClick={e => { e.stopPropagation(); openInEditor(f.file); }}
          className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
            active
              ? 'border-teal-300 text-teal-100 hover:bg-teal-700'
              : 'border-border text-muted-foreground hover:border-teal-500 hover:text-teal-600'
          }`}
          title="Apri nell'editor"
        >
          Edit
        </button>
        <button
          onClick={e => { e.stopPropagation(); setMoveTarget({ file: f.file, app: f.app ?? '', flow: f.flow ?? '' }); setMoveOpen(true); }}
          className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
            active
              ? 'border-teal-300 text-teal-100 hover:bg-teal-700'
              : 'border-border text-muted-foreground hover:border-orange-400 hover:text-orange-500'
          }`}
          title="Sposta feature"
        >
          Sposta
        </button>
      </div>
    );
  }

  async function onDropFeature(file: string, app: string, flow: string) {
    const current = features.find(f => f.file === file);
    if (current && current.app === app && current.flow === flow) return; // no-op stessa posizione
    // Riusa la logica handleMove senza duplicare il fetch
    const oldFile = file;
    const res = await fetch('/api/features/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromPath: oldFile, app, flow }),
    });
    const data = await res.json() as { ok?: boolean; path?: string; error?: string };
    if (!res.ok) {
      if (res.status === 409) {
        toast.error('Esiste già un file in quella destinazione — scegli un percorso diverso.');
      } else {
        toast.error(data.error ?? 'Spostamento fallito');
      }
      return;
    }
    toast.success(`Feature spostata: ${data.path}`);
    try {
      const raw = localStorage.getItem('gsd-editor-tabs');
      if (raw && data.path) {
        const tabs = JSON.parse(raw) as Array<{ filePath?: string; [key: string]: unknown }>;
        const updated = tabs.map(tab =>
          tab.filePath === oldFile ? { ...tab, filePath: data.path } : tab,
        );
        localStorage.setItem('gsd-editor-tabs', JSON.stringify(updated));
      }
    } catch {
      // localStorage non disponibile o JSON malformato — non bloccante
    }
    loadFeatures();
  }

  async function handleMove(app: string, flow: string) {
    if (!moveTarget) return;
    const oldFile = moveTarget.file;
    const res = await fetch('/api/features/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromPath: oldFile, app, flow }),
    });
    const data = await res.json() as { ok?: boolean; path?: string; error?: string };
    if (!res.ok) {
      if (res.status === 409) {
        toast.error('Esiste già un file in quella destinazione — scegli un percorso diverso.');
      } else {
        toast.error(data.error ?? 'Spostamento fallito');
      }
      return;
    }
    setMoveOpen(false);
    setMoveTarget(null);
    toast.success(`Feature spostata: ${data.path}`);

    // Aggiorna i tab persistiti in localStorage che puntano al vecchio path
    try {
      const raw = localStorage.getItem('gsd-editor-tabs');
      if (raw && data.path) {
        const tabs = JSON.parse(raw) as Array<{ filePath?: string; [key: string]: unknown }>;
        const updated = tabs.map(tab =>
          tab.filePath === oldFile ? { ...tab, filePath: data.path } : tab,
        );
        localStorage.setItem('gsd-editor-tabs', JSON.stringify(updated));
      }
    } catch {
      // localStorage non disponibile o JSON malformato — non bloccante
    }

    loadFeatures();
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto flex flex-col gap-4">
      {importTarget && (
        <FeatureImportDialog
          open={importOpen}
          fileName={importTarget.fileName}
          content={importTarget.content}
          existingApps={existingApps}
          existingFlows={existingFlows}
          existingPaths={existingPaths}
          onCancel={() => setImportOpen(false)}
          onSaved={(p) => {
            setImportOpen(false);
            toast.success(`Feature salvata: ${p}`);
            loadFeatures();
          }}
        />
      )}
      {moveTarget && (
        <FeaturePlacementDialog
          open={moveOpen}
          title="Sposta feature"
          confirmLabel="Sposta"
          fileBaseName={basename(moveTarget.file)}
          suggestedApp={moveTarget.app}
          suggestedFlow={moveTarget.flow}
          existingApps={existingApps}
          existingFlows={existingFlows}
          existingPaths={existingPaths}
          onCancel={() => { setMoveOpen(false); setMoveTarget(null); }}
          onConfirm={(app, flow) => handleMove(app, flow)}
        />
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.features.title}</h1>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".feature"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 text-sm rounded-md border border-teal-600 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950 transition-colors disabled:opacity-50"
          >
            {uploading ? 'Caricamento…' : '+ Carica .feature'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Tree sidebar */}
        <div className="w-80 flex flex-col gap-1 overflow-y-auto shrink-0">
          {loading && (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-7 rounded animate-pulse bg-muted" />
              ))}
            </div>
          )}
          {!loading && error && <p className="text-sm text-destructive">{error}</p>}

          {/* Tree: App → Flow → Features */}
          {tree.map(({ app, flows }) => {
            const appCollapsed = collapsedApps.has(app);
            return (
              <div key={app}>
                {/* App node */}
                <button
                  onClick={() => toggleApp(app)}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-bold uppercase tracking-wide text-foreground hover:bg-muted transition-colors"
                >
                  <span>{appCollapsed ? '▶' : '▼'}</span>
                  <span className="truncate">{app}</span>
                </button>

                {!appCollapsed && flows.map(({ flow, features: feats }) => {
                  const flowKey = `${app}/${flow}`;
                  const flowCollapsed = collapsedFlows.has(flowKey);
                  return (
                    <div key={flow}>
                      {/* Flow node */}
                      <button
                        onClick={() => toggleFlow(flowKey)}
                        onDragOver={e => { e.preventDefault(); setDragOverFlow(flowKey); }}
                        onDragLeave={() => setDragOverFlow(null)}
                        onDrop={e => {
                          e.preventDefault();
                          const file = e.dataTransfer.getData('text/plain');
                          setDragOverFlow(null);
                          if (file) onDropFeature(file, app, flow);
                        }}
                        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-semibold transition-colors ${
                          dragOverFlow === flowKey
                            ? 'bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500'
                            : 'text-muted-foreground hover:bg-muted'
                        }`}
                        style={{ paddingLeft: '1.25rem' }}
                      >
                        <span>{flowCollapsed ? '▶' : '▼'}</span>
                        <span className="truncate">{flow}</span>
                        <span className="ml-auto text-[10px]">{feats.length}</span>
                      </button>

                      {!flowCollapsed && feats.map(f => renderFeatureRow(f, '2rem'))}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Flat features (no app/flow) */}
          {flat.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide px-2 py-1 mt-1">
                {tree.length > 0 ? 'Altro' : 'Feature files'}
              </p>
              {flat.map(f => renderFeatureRow(f, '0.5rem'))}
            </div>
          )}

          {!loading && features.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 pt-2">
              Nessun file trovato. Carica un .feature o creane uno dall&apos;editor.
            </p>
          )}
        </div>

        {/* Preview panel */}
        <div className="flex-1 min-w-0">
          <FeaturePreview file={selected} />
        </div>
      </div>
    </div>
  );
}
