'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { GherkinEditor, type GherkinEditorHandle } from '@/components/GherkinEditor';
import { GherkinToolbar } from '@/components/GherkinToolbar';
import { StepBrowser } from '@/components/StepBrowser';
import { FileSidebar } from '@/components/FileSidebar';
import { ImportDropzone } from '@/components/ImportDropzone';
import type { CatalogStep } from '@/lib/types';
import { slugify } from '@/lib/repo';
import { formatGherkin } from '@/lib/gherkin-cm';
import { useLanguage } from '@/providers/Providers';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Tab types
// ---------------------------------------------------------------------------

interface EditorTab {
  id: string;
  label: string;
  filePath?: string;
  content: string;
  dirty: boolean;
}

function tabId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function labelFrom(content: string): string {
  const m = content.match(/Feature:\s*(.+)/i);
  return m ? m[1].trim() : 'Nuovo feature';
}

function newTab(content = '', filePath?: string): EditorTab {
  return { id: tabId(), label: content ? labelFrom(content) : 'Nuovo feature', filePath, content, dirty: false };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TABS_KEY   = 'gsd-editor-tabs';
const ACTIVE_KEY = 'gsd-editor-active-tab';
const INCOMING_KEY = 'gsd-editor-incoming';

function safeDecodeURI(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

function matchesCatalog(stepText: string, expressions: string[]): boolean {
  return expressions.some(expr => {
    const segments = expr.split(/\{[^}]+\}/);
    const pattern = segments.map(s => s.replace(/[.*+?^$|[\]\\()[\]{}]/g, '\\$&')).join('.+');
    try { return new RegExp(`^${pattern}$`, 'i').test(stepText); }
    catch { return false; }
  });
}

function computeInitialState(stepParam: string | null): { tabs: EditorTab[]; activeId: string } {
  const fallback = () => { const t = newTab(); return { tabs: [t], activeId: t.id }; };
  if (typeof window === 'undefined') return fallback();

  // Load persisted tabs
  let persistedTabs: EditorTab[] = [];
  let persistedActiveId = '';
  try {
    const raw = localStorage.getItem(TABS_KEY);
    persistedTabs = raw ? (JSON.parse(raw) as EditorTab[]) : [];
    persistedActiveId = localStorage.getItem(ACTIVE_KEY) ?? persistedTabs[0]?.id ?? '';
  } catch {}

  // Legacy migration: single draft → first tab
  if (persistedTabs.length === 0) {
    const legacy = localStorage.getItem('gsd-editor-draft') ?? '';
    const t = newTab(legacy);
    persistedTabs = [t];
    persistedActiveId = t.id;
  }

  // Incoming file from features page
  const incomingRaw = localStorage.getItem(INCOMING_KEY);
  if (incomingRaw) {
    localStorage.removeItem(INCOMING_KEY);
    try {
      const incoming = JSON.parse(incomingRaw) as { content: string; filePath?: string };
      const existing = incoming.filePath ? persistedTabs.find(t => t.filePath === incoming.filePath) : null;
      if (existing) return { tabs: persistedTabs, activeId: existing.id };
      const t = newTab(incoming.content, incoming.filePath);
      return { tabs: [...persistedTabs, t], activeId: t.id };
    } catch {}
  }

  // ?step= param → new tab pre-populated
  if (stepParam) {
    const t = newTab(`  Given ${safeDecodeURI(stepParam)}`);
    return { tabs: [...persistedTabs, t], activeId: t.id };
  }

  return { tabs: persistedTabs, activeId: persistedActiveId };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function EditorContent() {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step');

  // Compute initial state once
  const [initState] = useState(() => computeInitialState(stepParam));
  const [tabs, setTabs] = useState<EditorTab[]>(initState.tabs);
  const [activeTabId, setActiveTabId] = useState<string>(initState.activeId || initState.tabs[0]?.id || '');

  // Sidebar state (persisted)
  const [showSidebar, setShowSidebar] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('gsd-editor-sidebar') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('gsd-editor-sidebar', String(showSidebar));
  }, [showSidebar]);

  // Open file paths (for sidebar highlighting)
  const openFilePaths = useMemo(
    () => new Set(tabs.map(t => t.filePath).filter(Boolean) as string[]),
    [tabs]
  );

  // Proposal panel state
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalSelected, setProposalSelected] = useState<Set<string>>(new Set());
  const [isProposing, setIsProposing] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [stepExpressions, setStepExpressions] = useState<string[]>([]);
  const editorRef = useRef<GherkinEditorHandle | null>(null);

  // Active tab
  const activeTab = useMemo(
    () => tabs.find(tab => tab.id === activeTabId) ?? tabs[tabs.length - 1] ?? null,
    [tabs, activeTabId]
  );
  const content = activeTab?.content ?? '';

  function setContent(newContent: string) {
    if (!activeTab) return;
    setTabs(prev => prev.map(tab =>
      tab.id === activeTab.id
        ? { ...tab, content: newContent, dirty: true, label: labelFrom(newContent) || tab.label }
        : tab
    ));
  }

  // Persist tabs
  useEffect(() => {
    localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_KEY, activeTabId);
  }, [activeTabId]);

  // Reset proposal panel on tab switch
  useEffect(() => {
    setProposalOpen(false);
    setProposalSelected(new Set());
  }, [activeTabId]);

  // Load step catalog once
  useEffect(() => {
    fetch('/api/catalog')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((data: { steps?: CatalogStep[] }) => {
        if (data.steps) setStepExpressions(data.steps.map(s => s.expression));
      })
      .catch((err: Error) => { toast.error(`Catalog non disponibile: ${err.message}`); });
  }, []);

  // Unknown steps in current content — with resolved keyword (And/But inherit previous)
  const unknownSteps = useMemo(() => {
    if (!stepExpressions.length || !content.trim()) return [];
    const re = /^\s+(given|when|then|and|but)\s+(.+)/gim;
    const seen = new Set<string>();
    const result: { expression: string; keyword: 'Given' | 'When' | 'Then' }[] = [];
    let lastKw: 'Given' | 'When' | 'Then' = 'When';
    for (const m of content.matchAll(re)) {
      const kwRaw = m[1].toLowerCase();
      let kw: 'Given' | 'When' | 'Then';
      if (kwRaw === 'given') kw = 'Given';
      else if (kwRaw === 'when') kw = 'When';
      else if (kwRaw === 'then') kw = 'Then';
      else kw = lastKw;
      lastKw = kw;
      const text = m[2].trim();
      if (!seen.has(text) && !matchesCatalog(text, stepExpressions)) {
        seen.add(text);
        result.push({ expression: text, keyword: kw });
      }
    }
    return result;
  }, [content, stepExpressions]);

  // ---------------------------------------------------------------------------
  // Tab management
  // ---------------------------------------------------------------------------

  function addTab() {
    const tab = newTab();
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
  }

  function closeTab(id: string) {
    const tab = tabs.find(t => t.id === id);
    if (tab?.dirty && !confirm(`"${tab.label}" ha modifiche non salvate. Chiudere comunque?`)) return;

    const idx = tabs.findIndex(t => t.id === id);
    const filtered = tabs.filter(t => t.id !== id);

    if (filtered.length === 0) {
      const empty = newTab();
      setTabs([empty]);
      setActiveTabId(empty.id);
      return;
    }

    setTabs(filtered);
    if (activeTabId === id) {
      setActiveTabId(filtered[Math.min(idx, filtered.length - 1)].id);
    }
  }

  // ---------------------------------------------------------------------------
  // Editor actions
  // ---------------------------------------------------------------------------

  const handleOpenFile = useCallback((filePath: string, content: string) => {
    setTabs(prev => {
      const existing = prev.find(t => t.filePath === filePath);
      if (existing) { setActiveTabId(existing.id); return prev; }
      const t = newTab(content, filePath);
      setActiveTabId(t.id);
      return [...prev, t];
    });
  }, []);

  const handleInsert = useCallback((text: string) => {
    editorRef.current?.insertAtCursor(text);
  }, []);

  const handleUndo = useCallback(() => { editorRef.current?.undo(); }, []);
  const handleRedo = useCallback(() => { editorRef.current?.redo(); }, []);

  const handleFormat = useCallback(() => {
    const formatted = formatGherkin(content);
    if (formatted !== content) setContent(formatted);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const handleCommitGitHub = useCallback(async () => {
    if (!settings.githubToken || !settings.githubOwner || !settings.githubRepo) return;
    const featureMatch = content.match(/Feature:\s*(.+)/i);
    const slug = slugify(featureMatch?.[1].trim() ?? 'scenario') || 'scenario';
    setIsCommitting(true);
    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-token': settings.githubToken,
          'x-github-owner': settings.githubOwner,
          'x-github-repo': settings.githubRepo,
          'x-github-branch': settings.githubBranch || 'main',
        },
        body: JSON.stringify({ content, filePath: `src/features/${slug}.feature` }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Unknown error');
      toast.success(t.editor.commitGitHubSuccess);
    } catch (err: unknown) {
      toast.error(`${t.editor.commitGitHubError}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsCommitting(false);
    }
  }, [content, settings, t]);

  const handleSave = useCallback(async () => {
    if (!content.trim() || !activeTab) return;
    const featureMatch = content.match(/Feature:\s*(.+)/i);
    const slug = slugify(featureMatch?.[1].trim() ?? 'scenario') || 'scenario';
    const tagLine = content.match(/^(@\S+(?:\s+@\S+)*)/m);
    const tags = tagLine?.[1].match(/@(\S+)/g)?.map(tag => tag.slice(1)) ?? [];
    const appSlug  = tags[0] ? slugify(tags[0]) : null;
    const flowSlug = tags[1] ? slugify(tags[1]) : null;
    const filePath = appSlug && flowSlug ? `${appSlug}/${flowSlug}/${slug}.feature` : `${slug}.feature`;

    setIsSaving(true);
    try {
      const res = await fetch('/api/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, filePath }),
      });
      const data = await res.json() as { ok?: boolean; path?: string; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Unknown error');
      toast.success(`Salvato in ${data.path}`);
      // Mark tab clean + update filePath
      const savedPath = data.path ?? filePath;
      setTabs(prev => prev.map(tab =>
        tab.id === activeTab.id ? { ...tab, dirty: false, filePath: savedPath } : tab
      ));
      if (unknownSteps.length > 0) {
        setProposalSelected(new Set(unknownSteps.map(s => s.expression)));
        setProposalOpen(true);
      }
    } catch (err: unknown) {
      toast.error(`Salvataggio fallito: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  }, [content, activeTab, unknownSteps]);

  // Ctrl+S → save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  const handlePropose = useCallback(async () => {
    const selected = [...proposalSelected];
    if (!selected.length) return;
    const tagLine = content.match(/^(@\S+(?:\s+@\S+)*)/m);
    const tags = tagLine?.[1].match(/@(\S+)/g)?.map(tag => tag.slice(1)) ?? [];
    const steps = selected.map(expr => ({
      expression: expr,
      keyword: unknownSteps.find(s => s.expression === expr)?.keyword,
    }));
    setIsProposing(true);
    try {
      const res = await fetch('/api/catalog/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps,
          app:  tags[0] ? slugify(tags[0]) : '',
          area: tags[1] ? slugify(tags[1]) : 'to-classify',
        }),
      });
      const data = await res.json() as { ok?: boolean; added?: number; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Unknown error');
      toast.success(`${data.added} step aggiunti al catalogo come @wanted`);
      setProposalOpen(false);
      const catalogRes = await fetch('/api/catalog');
      const catalogData = await catalogRes.json() as { steps?: CatalogStep[] };
      if (catalogData.steps) setStepExpressions(catalogData.steps.map(s => s.expression));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore proposta');
    } finally {
      setIsProposing(false);
    }
  }, [proposalSelected, content, unknownSteps]);

  const handleDownload = useCallback(() => {
    const featureMatch = content.match(/Feature:\s*(.+)/i);
    const filename = slugify(featureMatch?.[1].trim() ?? 'scenario') || 'scenario';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.feature`; a.click();
    URL.revokeObjectURL(url);
  }, [content]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">

      {/* Left sidebar */}
      {showSidebar && (
        <div className="w-52 shrink-0 overflow-hidden">
          <FileSidebar
            openFilePaths={openFilePaths}
            activeFilePath={activeTab?.filePath}
            onOpenFile={handleOpenFile}
          />
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

      {/* Header + tab bar — fixed, non scrollano */}
      <div className="shrink-0 px-4 lg:px-6 pt-4 lg:pt-6 flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSidebar(o => !o)}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={showSidebar ? 'Nascondi sidebar' : 'Mostra sidebar'}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <h1 className="text-2xl font-bold text-foreground">{t.editor.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {settings.githubToken && (
            <button onClick={handleCommitGitHub} disabled={isCommitting || !content.trim()}
              className="px-3 py-1.5 text-sm rounded-md border border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {isCommitting ? t.editor.commitGitHubLoading : t.editor.commitGitHub}
            </button>
          )}
          <button onClick={handleSave} disabled={isSaving || !content.trim()} title="Ctrl+S"
            className="px-3 py-1.5 text-sm rounded-md border border-green-600 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={handleDownload}
            className="px-3 py-1.5 text-sm rounded-md border border-teal-600 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950 transition-colors">
            {t.editor.download}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-end gap-0 overflow-x-auto border-b border-border -mx-4 lg:-mx-6 px-4 lg:px-6">
        {tabs.map(tab => {
          const active = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-x border-t rounded-t shrink-0 transition-colors select-none ${
                active
                  ? 'bg-background border-border text-foreground -mb-px z-10'
                  : 'bg-muted/40 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <span className="max-w-[140px] truncate font-medium">{tab.label}</span>
              {tab.dirty && <span className="text-amber-500 text-[10px]" title="Modifiche non salvate">●</span>}
              <button
                onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity leading-none"
                aria-label="Chiudi tab"
              >
                ×
              </button>
            </div>
          );
        })}
        <button
          onClick={addTab}
          className="px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Nuova tab"
          aria-label="Nuova tab"
        >
          +
        </button>
      </div>

      </div> {/* end header+tab bar */}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 pb-4 lg:pb-6 flex flex-col gap-3">

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* LEFT COLUMN — editor */}
        <div className="flex flex-col gap-3 lg:w-2/3 min-w-0">
          <GherkinToolbar
            onInsert={handleInsert}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onFormat={handleFormat}
            formatLabel={t.editor.format}
          />
          <GherkinEditor
            ref={editorRef}
            value={content}
            onChange={setContent}
            stepExpressions={stepExpressions}
          />

          {/* Unknown steps panel */}
          {unknownSteps.length > 0 && (
            <div className="rounded-md border border-orange-300 bg-orange-50 dark:bg-orange-950 px-3 py-2 text-xs text-orange-700 dark:text-orange-300">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">⚠ {unknownSteps.length} step non nel catalogo</p>
                <button
                  onClick={() => { setProposalSelected(new Set(unknownSteps.map(s => s.expression))); setProposalOpen(o => !o); }}
                  className="shrink-0 text-[10px] px-2 py-0.5 rounded border border-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors"
                >
                  {proposalOpen ? 'Chiudi ▲' : 'Proponi al catalogo ▼'}
                </button>
              </div>
              {proposalOpen && (
                <div className="mt-2 pt-2 border-t border-orange-200 dark:border-orange-800 flex flex-col gap-2">
                  <div className="space-y-1">
                    {unknownSteps.map(({ expression: s, keyword: kw }) => (
                      <label key={s} className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" checked={proposalSelected.has(s)}
                          onChange={() => setProposalSelected(prev => {
                            const next = new Set(prev);
                            if (next.has(s)) { next.delete(s); } else { next.add(s); }
                            return next;
                          })}
                          className="mt-0.5 shrink-0 accent-orange-600"
                        />
                        <span className="font-mono"><span className="text-muted-foreground mr-1">{kw}</span>{s}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handlePropose} disabled={isProposing || proposalSelected.size === 0}
                      className="text-[10px] px-2 py-0.5 rounded bg-orange-600 text-white hover:bg-orange-700 transition-colors disabled:opacity-50">
                      {isProposing ? 'Aggiunta…' : `Aggiungi ${proposalSelected.size} come @wanted`}
                    </button>
                    <button onClick={() => setProposalOpen(false)}
                      className="text-[10px] px-2 py-0.5 rounded border border-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors">
                      Ignora
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <ImportDropzone onImported={featureContent => setContent(featureContent)} />
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-4 lg:w-1/3 min-w-0">
          <StepBrowser onInsert={handleInsert} />
          <div className="rounded-md border border-border bg-muted/30 flex flex-col">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                {t.editor.preview}
              </p>
            </div>
            <pre className="text-sm font-mono whitespace-pre-wrap text-foreground break-words p-3 overflow-auto flex-1 max-h-96">
              {content || t.editor.previewPlaceholder}
            </pre>
          </div>
        </div>
      </div>
      </div> {/* end scrollable content */}
      </div> {/* end main area */}
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense>
      <EditorContent />
    </Suspense>
  );
}
