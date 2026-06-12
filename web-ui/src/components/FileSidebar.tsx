'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FeatureSummary } from '@/lib/types';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GitFile {
  code: string;
  file: string;
}

export interface FileSidebarProps {
  openFilePaths: Set<string>;
  activeFilePath?: string;
  onOpenFile: (filePath: string, content: string) => void;
}

interface TreeNode {
  app: string;
  flows: { flow: string; features: FeatureSummary[] }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTree(features: FeatureSummary[]): { tree: TreeNode[]; flat: FeatureSummary[] } {
  const appMap = new Map<string, Map<string, FeatureSummary[]>>();
  const flat: FeatureSummary[] = [];
  for (const f of features) {
    if (!f.app || !f.flow) { flat.push(f); continue; }
    if (!appMap.has(f.app)) appMap.set(f.app, new Map());
    const fm = appMap.get(f.app)!;
    if (!fm.has(f.flow)) fm.set(f.flow, []);
    fm.get(f.flow)!.push(f);
  }
  const tree: TreeNode[] = [];
  for (const [app, fm] of appMap)
    tree.push({ app, flows: [...fm.entries()].map(([flow, feats]) => ({ flow, features: feats })) });
  return { tree, flat };
}

function gitBadge(code: string): { label: string; cls: string } {
  if (code === '??' || code === '? ') return { label: 'U', cls: 'text-green-500' };
  if (code[0] === 'A' || code[1] === 'A') return { label: 'A', cls: 'text-green-500' };
  if (code[0] === 'D' || code[1] === 'D') return { label: 'D', cls: 'text-red-500' };
  if (code[0] === 'R' || code[1] === 'R') return { label: 'R', cls: 'text-blue-400' };
  if (code.includes('M')) return { label: 'M', cls: 'text-yellow-500' };
  return { label: code.trim().charAt(0) || '~', cls: 'text-muted-foreground' };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FileSidebar({ openFilePaths, activeFilePath, onOpenFile }: FileSidebarProps) {
  const [features, setFeatures] = useState<FeatureSummary[]>([]);
  const [gitFiles, setGitFiles] = useState<GitFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedApps, setCollapsedApps] = useState<Set<string>>(new Set());
  const [collapsedFlows, setCollapsedFlows] = useState<Set<string>>(new Set());
  const [featOpen, setFeatOpen] = useState(true);
  const [gitOpen, setGitOpen] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [featQuery, setFeatQuery] = useState('');

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/features').then(r => r.json()),
      fetch('/api/git/status').then(r => r.json()).catch(() => ({ files: [] })),
    ]).then(([featData, gitData]: [unknown, { files?: GitFile[] }]) => {
      if (Array.isArray(featData)) setFeatures(featData as FeatureSummary[]);
      if (gitData.files) setGitFiles(gitData.files);
    }).catch((err: Error) => toast.error(`Sidebar: ${err.message}`))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const { tree, flat } = useMemo(() => buildTree(features), [features]);

  const featQueryLower = featQuery.trim().toLowerCase();
  const filteredFeatures = useMemo(() =>
    featQueryLower
      ? features.filter(f =>
          f.name.toLowerCase().includes(featQueryLower) ||
          f.file.toLowerCase().includes(featQueryLower)
        )
      : null,
  [features, featQueryLower]);

  async function openFile(file: string) {
    if (opening === file) return;
    setOpening(file);
    try {
      const res = await fetch(`/api/download?file=${encodeURIComponent(file)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const content = await res.text();
      onOpenFile(file, content);
    } catch (err: unknown) {
      toast.error(`Apertura fallita: ${err instanceof Error ? err.message : 'errore'}`);
    } finally {
      setOpening(null);
    }
  }

  function toggleApp(app: string) {
    setCollapsedApps(prev => { const n = new Set(prev); n.has(app) ? n.delete(app) : n.add(app); return n; });
  }
  function toggleFlow(key: string) {
    setCollapsedFlows(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  function FeatureRow({ f, indent }: { f: FeatureSummary; indent: string }) {
    const isActive = activeFilePath === f.file;
    const isOpen = openFilePaths.has(f.file);
    const isOpening = opening === f.file;
    return (
      <button
        onClick={() => openFile(f.file)}
        disabled={isOpening}
        style={{ paddingLeft: indent }}
        className={`w-full flex items-center gap-1.5 pr-2 py-0.5 text-left text-xs rounded transition-colors truncate ${
          isActive
            ? 'bg-teal-600 text-white'
            : 'text-foreground hover:bg-muted'
        } disabled:opacity-60`}
        title={f.file}
      >
        <span className="truncate flex-1">{f.name}</span>
        {isOpen && !isActive && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-teal-500" title="Aperto" />}
        {isOpening && <span className="shrink-0 text-[9px] text-muted-foreground">…</span>}
      </button>
    );
  }

  const sectionHeader = (label: string, open: boolean, toggle: () => void, count?: number) => (
    <button
      onClick={toggle}
      className="w-full flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
    >
      <span>{open ? '▼' : '▶'}</span>
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && <span className="font-normal">{count}</span>}
    </button>
  );

  return (
    <div className="flex flex-col h-full text-xs overflow-hidden border-r border-border bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Explorer</span>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          title="Aggiorna"
          aria-label="Aggiorna"
        >
          {loading ? '⟳' : '↺'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Features section */}
        <div>
          {sectionHeader('Features', featOpen, () => setFeatOpen(o => !o), features.length)}
          {featOpen && (
            <div className="pb-1">
              {/* Search */}
              <div className="px-2 pb-1">
                <input
                  type="text"
                  value={featQuery}
                  onChange={e => setFeatQuery(e.target.value)}
                  placeholder="Cerca feature…"
                  className="w-full text-[10px] px-2 py-0.5 rounded border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal-500"
                />
              </div>

              {loading && (
                <div className="space-y-1 px-2 py-1">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-4 rounded animate-pulse bg-muted" />
                  ))}
                </div>
              )}

              {/* Search results — flat list */}
              {!loading && filteredFeatures && (
                <>
                  {filteredFeatures.length === 0
                    ? <p className="px-2 py-1 text-[10px] text-muted-foreground">Nessun risultato</p>
                    : filteredFeatures.map(f => <FeatureRow key={f.file} f={f} indent="0.5rem" />)
                  }
                </>
              )}

              {/* Normal tree — shown when no query */}
              {!loading && !filteredFeatures && tree.map(({ app, flows }) => {
                const appCollapsed = collapsedApps.has(app);
                return (
                  <div key={app}>
                    <button
                      onClick={() => toggleApp(app)}
                      className="w-full flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-foreground hover:bg-muted transition-colors uppercase tracking-wide"
                    >
                      <span className="text-[8px]">{appCollapsed ? '▶' : '▼'}</span>
                      <span className="truncate">{app}</span>
                    </button>
                    {!appCollapsed && flows.map(({ flow, features: feats }) => {
                      const key = `${app}/${flow}`;
                      const flowCollapsed = collapsedFlows.has(key);
                      return (
                        <div key={flow}>
                          <button
                            onClick={() => toggleFlow(key)}
                            className="w-full flex items-center gap-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted transition-colors"
                            style={{ paddingLeft: '1rem' }}
                          >
                            <span className="text-[8px]">{flowCollapsed ? '▶' : '▼'}</span>
                            <span className="truncate">{flow}</span>
                          </button>
                          {!flowCollapsed && feats.map(f => (
                            <FeatureRow key={f.file} f={f} indent="1.75rem" />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {!loading && flat.map(f => <FeatureRow key={f.file} f={f} indent="0.5rem" />)}
              {!loading && features.length === 0 && (
                <p className="px-2 py-1 text-muted-foreground text-[10px]">Nessun feature file</p>
              )}
            </div>
          )}
        </div>

        {/* Git section */}
        <div className="border-t border-border mt-1">
          {sectionHeader('Changes', gitOpen, () => setGitOpen(o => !o), gitFiles.length || undefined)}
          {gitOpen && (
            <div className="pb-1">
              {gitFiles.length === 0 && !loading && (
                <p className="px-2 py-1 text-muted-foreground text-[10px]">Nessuna modifica</p>
              )}
              {gitFiles.map((gf, i) => {
                const { label, cls } = gitBadge(gf.code);
                const name = gf.file.split('/').pop() ?? gf.file;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-muted"
                    title={gf.file}
                  >
                    <span className={`shrink-0 text-[10px] font-bold w-3 ${cls}`}>{label}</span>
                    <span className="truncate text-foreground">{name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FileSidebar;
