'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { GherkinEditor, type GherkinEditorHandle } from '@/components/GherkinEditor';
import { GherkinToolbar } from '@/components/GherkinToolbar';
import { StepBrowser } from '@/components/StepBrowser';
import { FileSidebar } from '@/components/FileSidebar';
import { ImportDropzone } from '@/components/ImportDropzone';
import type { CatalogStep, FeatureSummary } from '@/lib/types';
import { slugify } from '@/lib/repo';
import { formatGherkin } from '@/lib/gherkin-cm';
import { useLanguage } from '@/providers/Providers';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';
import { CommitPreviewDialog } from '@/components/CommitPreviewDialog';
import { ProposeStepModal } from '@/components/ProposeStepModal';
import { matchesCatalog } from '@/lib/catalog-match';
import { buildCatalogHeaders } from '@/lib/catalog';
import { FeaturePlacementDialog } from '@/components/FeaturePlacementDialog';
import { getFeatureTags, setFeatureTags } from '@/lib/feature-tags';

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

let _tabCounter = 0;
function tabId(): string {
  // Counter + random suffix → unique even across reloads (the counter resets to 0 each page load,
  // but persisted tabs keep ids from prior sessions; the suffix prevents collisions). SSR-safe
  // (never called server-side since ssr:false).
  return `tab-${++_tabCounter}-${Math.random().toString(36).slice(2, 8)}`;
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

const TABS_KEY     = 'gsd-editor-tabs';
const ACTIVE_KEY   = 'gsd-editor-active-tab';
const INCOMING_KEY = 'gsd-editor-incoming';

function safeDecodeURI(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

function loadInitialState(stepParam: string | null): { tabs: EditorTab[]; activeId: string } {
  const fallback = () => { const t = newTab(); return { tabs: [t], activeId: t.id }; };

  let persistedTabs: EditorTab[] = [];
  let persistedActiveId = '';
  try {
    const raw = localStorage.getItem(TABS_KEY);
    persistedTabs = raw ? (JSON.parse(raw) as EditorTab[]) : [];
    persistedActiveId = localStorage.getItem(ACTIVE_KEY) ?? persistedTabs[0]?.id ?? '';
    // Regenerate ids to guarantee uniqueness — persisted ids from prior sessions can collide
    // with freshly-generated ones (counter resets per load) and may already be duplicated in
    // corrupted storage. Remap the active tab by its index so the selection is preserved.
    if (persistedTabs.length > 0) {
      const activeIdx = persistedTabs.findIndex(t => t.id === persistedActiveId);
      persistedTabs = persistedTabs.map(t => ({ ...t, id: tabId() }));
      persistedActiveId = persistedTabs[activeIdx >= 0 ? activeIdx : 0].id;
    }
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

  if (persistedTabs.length > 0) return { tabs: persistedTabs, activeId: persistedActiveId };
  return fallback();
}

// ---------------------------------------------------------------------------
// Component — inner (needs useSearchParams → Suspense boundary in parent)
// ---------------------------------------------------------------------------

function EditorInner() {
  const { t } = useLanguage();
  const { settings, loaded: settingsLoaded } = useSettings();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step');

  // Initialized from localStorage in useEffect (ssr:false guarantees client-only)
  const [tabs, setTabs] = useState<EditorTab[]>(() => { const tab = newTab(); return [tab]; });
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const [showSidebar, setShowSidebar] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state once on mount
  useEffect(() => {
    const { tabs: t, activeId } = loadInitialState(stepParam);
    setTabs(t);
    setActiveTabId(activeId || t[0]?.id || '');
    setShowSidebar(localStorage.getItem('gsd-editor-sidebar') !== 'false');
    setHydrated(true);
  // stepParam intentionally omitted — only read once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem('gsd-editor-sidebar', String(showSidebar));
  }, [showSidebar, hydrated]);

  // Open file paths (for sidebar highlighting)
  const openFilePaths = useMemo(
    () => new Set(tabs.map(tab => tab.filePath).filter(Boolean) as string[]),
    [tabs]
  );

  // Proposal panel state
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalSelected, setProposalSelected] = useState<Set<string>>(new Set());
  const [isProposing, setIsProposing] = useState(false);

  // Flag: tab appena caricato da .feature upload → trigger apertura pannello proposta dopo render
  const [justLoadedTabId, setJustLoadedTabId] = useState<string | null>(null);

  // ProposeStepModal state (click-to-propose from CodeMirror decoration)
  const [proposeModal, setProposeModal] = useState<{ expression: string; keyword: 'Given' | 'When' | 'Then' } | null>(null);
  const [proposeError, setProposeError] = useState<string | null>(null);

  // Catalog areas (for ProposeStepModal area dropdown)
  const [catalogAreas, setCatalogAreas] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [preview, setPreview] = useState<{ kind: 'feature' | 'proposal' } | null>(null);
  const [stepExpressions, setStepExpressions] = useState<string[]>([]);
  const editorRef = useRef<GherkinEditorHandle | null>(null);

  // Placement dialog state
  const [placementOpen, setPlacementOpen] = useState(false);
  // 'save' = triggered from handleSave; 'set' = triggered from explicit button
  const [placementAction, setPlacementAction] = useState<'save' | 'set'>('set');

  // Feature list for placement dialog autocomplete (lazy-loaded on first dialog open)
  const [featureList, setFeatureList] = useState<FeatureSummary[]>([]);
  const featureListLoadedRef = useRef(false);

  const existingApps = useMemo(
    () => [...new Set(featureList.map(f => f.app).filter(Boolean) as string[])].sort(),
    [featureList]
  );
  const existingFlows = useMemo(
    () => [...new Set(featureList.map(f => f.flow).filter(Boolean) as string[])].sort(),
    [featureList]
  );
  const existingPaths = useMemo(() => featureList.map(f => f.file), [featureList]);

  const loadFeatureList = useCallback(async () => {
    if (featureListLoadedRef.current) return;
    featureListLoadedRef.current = true;
    try {
      const res = await fetch('/api/features');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as FeatureSummary[];
      setFeatureList(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      // Non bloccante — il dialog funziona anche senza autocomplete
      console.warn('Feature list non disponibile:', err instanceof Error ? err.message : err);
    }
  }, []);

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
    if (hydrated) localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
  }, [tabs, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(ACTIVE_KEY, activeTabId);
  }, [activeTabId, hydrated]);

  // Reset proposal panel on tab switch
  useEffect(() => {
    setProposalOpen(false);
    setProposalSelected(new Set());
  }, [activeTabId]);

  // Load step catalog once settings are hydrated — also derives catalogAreas for ProposeStepModal
  useEffect(() => {
    if (!settingsLoaded) return;
    fetch('/api/catalog', { headers: buildCatalogHeaders(settings) })
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((data: { steps?: CatalogStep[] }) => {
        if (data.steps) {
          setStepExpressions(data.steps.map(s => s.expression));
          setCatalogAreas([...new Set(data.steps.map(s => s.area))].sort());
        }
      })
      .catch((err: Error) => { toast.error(`Catalog non disponibile: ${err.message}`); });
  }, [settingsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Unknown steps in current content — with resolved keyword (And/But inherit previous)
  // Page markers: comment lines like "# #LOGIN" or "# #HOMEPAGE-POPULAR SERVICES MENU"
  // are transitive: they stay active as the page for all following steps until the next marker.
  const unknownSteps = useMemo(() => {
    if (!stepExpressions.length || !content.trim()) return [];
    // All-caps comment = page marker: "# #LOGIN", "#WEIGHT LOSS", "# MEDICINE PREFER"
    const PAGE_MARKER_RE = /^\s*#\s*#?([A-Z][A-Z0-9 _-]{1,})\s*$/;
    const STEP_LINE_RE   = /^\s+(given|when|then|and|but)\s+(.+)/i;
    const seen = new Set<string>();
    const result: { expression: string; keyword: 'Given' | 'When' | 'Then'; page: string }[] = [];
    let lastKw: 'Given' | 'When' | 'Then' = 'When';
    let currentPage = '';
    for (const line of content.split('\n')) {
      const pm = line.match(PAGE_MARKER_RE);
      if (pm) {
        currentPage = pm[1].trim().toLowerCase().replace(/\s+/g, '-');
        continue;
      }
      const sm = line.match(STEP_LINE_RE);
      if (!sm) continue;
      const kwRaw = sm[1].toLowerCase();
      let kw: 'Given' | 'When' | 'Then';
      if (kwRaw === 'given') kw = 'Given';
      else if (kwRaw === 'when') kw = 'When';
      else if (kwRaw === 'then') kw = 'Then';
      else kw = lastKw;
      lastKw = kw;
      const text = sm[2].trim();
      if (!seen.has(text) && !matchesCatalog(text, stepExpressions)) {
        seen.add(text);
        result.push({ expression: text, keyword: kw, page: currentPage });
      }
    }
    return result;
  }, [content, stepExpressions]);

  // Apri il pannello proposta dopo un upload .feature, una volta che unknownSteps è ricalcolato.
  // Dipende da unknownSteps (non solo activeTabId) per garantire che il memo sia già aggiornato
  // quando l'effect gira. Il flag viene consumato subito per evitare riaperture su edit successivi.
  useEffect(() => {
    if (!justLoadedTabId || activeTabId !== justLoadedTabId) return;
    if (unknownSteps.length > 0) {
      setProposalSelected(new Set(unknownSteps.map(s => s.expression)));
      setProposalOpen(true);
    }
    setJustLoadedTabId(null);
  }, [justLoadedTabId, unknownSteps, activeTabId]);

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

  const handleOpenFile = useCallback((filePath: string, fileContent: string) => {
    setTabs(prev => {
      const existing = prev.find(t => t.filePath === filePath);
      if (existing) { setActiveTabId(existing.id); return prev; }
      const tab = newTab(fileContent, filePath);
      setActiveTabId(tab.id);
      return [...prev, tab];
    });
  }, []);

  const openContentInNewTab = useCallback((fileContent: string) => {
    const tab = newTab(fileContent);
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
    setJustLoadedTabId(tab.id);
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

  const doCommitGitHub = useCallback(async () => {
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
          'x-commit-name': settings.commitName,
          'x-commit-email': settings.commitEmail,
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

  // ---------------------------------------------------------------------------
  // Save helpers (shared between handleSave and placement dialog confirm)
  // ---------------------------------------------------------------------------

  const doSaveContent = useCallback(async (contentToSave: string, filePath: string) => {
    if (!activeTab) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentToSave, filePath }),
      });
      const data = await res.json() as { ok?: boolean; path?: string; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Unknown error');
      toast.success(`Salvato in ${data.path}`);
      const savedPath = data.path ?? filePath;
      setTabs(prev => prev.map(tab =>
        tab.id === activeTab.id
          ? { ...tab, content: contentToSave, dirty: false, filePath: savedPath, label: labelFrom(contentToSave) || tab.label }
          : tab
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, unknownSteps]);

  const handleSave = useCallback(async () => {
    if (!content.trim() || !activeTab) return;
    const featureMatch = content.match(/Feature:\s*(.+)/i);
    const slug = slugify(featureMatch?.[1].trim() ?? 'scenario') || 'scenario';
    const { app, flow } = getFeatureTags(content);
    const appSlug  = app  ? slugify(app)  : null;
    const flowSlug = flow ? slugify(flow) : null;

    if (appSlug && flowSlug) {
      // Tag completi — salva diretto, Ctrl+S resta veloce
      await doSaveContent(content, `${appSlug}/${flowSlug}/${slug}.feature`);
    } else {
      // Tag mancanti — apri il dialog di placement
      await loadFeatureList();
      setPlacementAction('save');
      setPlacementOpen(true);
    }
  }, [content, activeTab, doSaveContent, loadFeatureList]);

  // Ctrl+S → save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  const doPropose = useCallback(async () => {
    const selected = [...proposalSelected];
    if (!selected.length) return;
    const tagLine = content.match(/^(@\S+(?:\s+@\S+)*)/m);
    const tags = tagLine?.[1].match(/@(\S+)/g)?.map(tag => tag.slice(1)) ?? [];
    const steps = selected.map(expr => {
      const found = unknownSteps.find(s => s.expression === expr);
      return {
        expression: expr,
        keyword: found?.keyword,
        page: found?.page || undefined,
      };
    });
    setIsProposing(true);
    try {
      const res = await fetch('/api/catalog/propose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-token': settings.githubToken,
          'x-github-owner': settings.githubOwner,
          'x-github-repo': settings.githubRepo,
          'x-catalog-branch': settings.catalogBranch || 'catalog',
          'x-github-branch': settings.githubBranch || 'main',
          'x-commit-name': settings.commitName,
          'x-commit-email': settings.commitEmail,
        },
        body: JSON.stringify({
          steps,
          app:  tags[0] ? slugify(tags[0]) : '',
          area: tags[1] ? slugify(tags[1]) : 'to-classify',
        }),
      });
      const data = await res.json() as { ok?: boolean; added?: number; error?: string };
      if (res.status === 409 || !data.ok) {
        toast.error(data.error ?? 'Unknown error');
        return;
      }
      toast.success(`${data.added} step proposed — pushed to ${settings.catalogBranch || 'catalog'}`);
      setProposalOpen(false);
      const catalogRes = await fetch('/api/catalog', { headers: buildCatalogHeaders(settings) });
      const catalogData = await catalogRes.json() as { steps?: CatalogStep[] };
      if (catalogData.steps) setStepExpressions(catalogData.steps.map(s => s.expression));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore proposta');
    } finally {
      setIsProposing(false);
    }
  }, [proposalSelected, content, unknownSteps, settings]);

  // Single-step proposal from CodeMirror click-to-propose (ProposeStepModal)
  const doProposeSingle = useCallback(async (area: string) => {
    if (!proposeModal) return;
    const tagLine = content.match(/^(@\S+(?:\s+@\S+)*)/m);
    const tags = tagLine?.[1].match(/@(\S+)/g)?.map(tag => tag.slice(1)) ?? [];
    const app = tags[0] ? slugify(tags[0]) : '';
    setIsProposing(true);
    try {
      const res = await fetch('/api/catalog/propose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-token': settings.githubToken,
          'x-github-owner': settings.githubOwner,
          'x-github-repo': settings.githubRepo,
          'x-catalog-branch': settings.catalogBranch || 'catalog',
          'x-github-branch': settings.githubBranch || 'main',
          'x-commit-name': settings.commitName,
          'x-commit-email': settings.commitEmail,
        },
        body: JSON.stringify({
          steps: [{ expression: proposeModal.expression, keyword: proposeModal.keyword }],
          app,
          area,
        }),
      });
      const data = await res.json() as { ok?: boolean; added?: number; error?: string };
      if (res.status === 409 || !data.ok) {
        setProposeError(data.error ?? 'Proposal failed');
        return;
      }
      toast.success(`Step proposed — pushed to ${settings.catalogBranch || 'catalog'}`);
      setProposeModal(null);
      setProposeError(null);
      // Refresh catalog so the underline clears and area list stays current
      const catalogRes = await fetch('/api/catalog', { headers: buildCatalogHeaders(settings) });
      const catalogData = await catalogRes.json() as { steps?: CatalogStep[] };
      if (catalogData.steps) {
        setStepExpressions(catalogData.steps.map(s => s.expression));
        setCatalogAreas([...new Set(catalogData.steps.map(s => s.area))].sort());
      }
    } catch (err: unknown) {
      setProposeError(err instanceof Error ? err.message : 'Proposal failed');
    } finally {
      setIsProposing(false);
    }
  }, [proposeModal, content, settings]);

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
              <ImportDropzone
                variant="button"
                onImported={featureContent => setContent(featureContent)}
                onLoadFeature={openContentInNewTab}
              />
              {settings.githubToken && (
                <button onClick={() => setPreview({ kind: 'feature' })} disabled={isCommitting || !content.trim()}
                  className="px-3 py-1.5 text-sm rounded-md border border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isCommitting ? t.editor.commitGitHubLoading : t.editor.commitGitHub}
                </button>
              )}
              <button
                onClick={async () => {
                  await loadFeatureList();
                  setPlacementAction('set');
                  setPlacementOpen(true);
                }}
                disabled={!content.trim()}
                title="Imposta cartella / tag di placement"
                className="px-3 py-1.5 text-sm rounded-md border border-violet-600 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cartella
              </button>
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

        </div>

        {/* Scrollable content — plain BLOCK scroll container (NOT flex), so wheel scroll over the
            CodeMirror editor bubbles up and scrolls normally. min-h-0 lets this flex-1 child actually
            scroll instead of being clipped by the parent's overflow-hidden. The inner row holds the
            two columns; the Steps column is sticky so it stays in view while the editor scrolls. */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 lg:px-6 pt-1 pb-4 lg:pb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* LEFT COLUMN — editor scrolls with the page (NOT sticky) */}
          <div className="flex flex-col gap-3 lg:w-2/3 min-w-0">
              <div className="lg:sticky lg:top-0 z-10 bg-background">
                <GherkinToolbar
                  onInsert={handleInsert}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onFormat={handleFormat}
                  formatLabel={t.editor.format}
                />
              </div>
              <GherkinEditor
                ref={editorRef}
                value={content}
                onChange={setContent}
                stepExpressions={stepExpressions}
                onProposeStep={(expression, keyword) => { setProposeError(null); setProposeModal({ expression, keyword }); }}
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
                        {unknownSteps.map(({ expression: s, keyword: kw, page }) => (
                          <label key={s} className="flex items-start gap-2 cursor-pointer">
                            <input type="checkbox" checked={proposalSelected.has(s)}
                              onChange={() => setProposalSelected(prev => {
                                const next = new Set(prev);
                                if (next.has(s)) { next.delete(s); } else { next.add(s); }
                                return next;
                              })}
                              className="mt-0.5 shrink-0 accent-orange-600"
                            />
                            <span className="font-mono flex-1 min-w-0">
                              <span className="text-muted-foreground mr-1">{kw}</span>{s}
                            </span>
                            {page && (
                              <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-200 font-medium">
                                {page}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setPreview({ kind: 'proposal' })} disabled={isProposing || proposalSelected.size === 0}
                          className="text-[10px] px-2 py-0.5 rounded bg-orange-600 text-white hover:bg-orange-700 transition-colors disabled:opacity-50">
                          {isProposing ? 'Aggiunta…' : `Proponi ${proposalSelected.size} step al catalogo`}
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
          </div>

          {/* RIGHT COLUMN — Steps stays in view while the editor scrolls (sticky) */}
          <div className="flex flex-col gap-4 lg:w-1/3 min-w-0 lg:sticky lg:top-0 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <StepBrowser onInsert={handleInsert} />
          </div>

          </div>
        </div>
      </div>

      {/* Placement dialog — apre quando i tag @app/@flow mancano al Save, o on-demand da "Cartella" */}
      {(() => {
        const featureMatch = content.match(/Feature:\s*(.+)/i);
        const slug = slugify(featureMatch?.[1].trim() ?? 'scenario') || 'scenario';
        const { app: tagApp, flow: tagFlow } = getFeatureTags(content);
        return (
          <FeaturePlacementDialog
            open={placementOpen}
            title={placementAction === 'save' ? 'Salva feature' : 'Imposta cartella / tag'}
            fileBaseName={`${slug}.feature`}
            suggestedApp={tagApp ? slugify(tagApp) : ''}
            suggestedFlow={tagFlow ? slugify(tagFlow) : ''}
            existingApps={existingApps}
            existingFlows={existingFlows}
            existingPaths={existingPaths}
            confirmLabel={placementAction === 'save' ? 'Salva' : 'Applica tag'}
            onCancel={() => setPlacementOpen(false)}
            onConfirm={async (app, flow) => {
              const updated = setFeatureTags(content, app, flow);
              if (placementAction === 'save') {
                const featureMatchUpdated = updated.match(/Feature:\s*(.+)/i);
                const slugUpdated = slugify(featureMatchUpdated?.[1].trim() ?? 'scenario') || 'scenario';
                setTabs(prev => prev.map(tab =>
                  tab.id === activeTab?.id
                    ? { ...tab, content: updated, dirty: true, label: labelFrom(updated) || tab.label }
                    : tab
                ));
                await doSaveContent(updated, `${app}/${flow}/${slugUpdated}.feature`);
              } else {
                setContent(updated);
              }
              setPlacementOpen(false);
            }}
          />
        );
      })()}

      {/* ProposeStepModal — single-step proposal from CodeMirror click-to-propose */}
      <ProposeStepModal
        open={proposeModal !== null}
        expression={proposeModal?.expression ?? ''}
        keyword={proposeModal?.keyword ?? 'When'}
        areas={catalogAreas}
        app={(() => { const tagLine = content.match(/^(@\S+(?:\s+@\S+)*)/m); const tags = tagLine?.[1].match(/@(\S+)/g)?.map(tag => tag.slice(1)) ?? []; return tags[0] ? slugify(tags[0]) : ''; })()}
        submitting={isProposing}
        errorText={proposeError}
        onSubmit={area => doProposeSingle(area)}
        onClose={() => { setProposeModal(null); setProposeError(null); }}
      />

      {/* Commit preview dialog — gates both feature push and proposal push (D-08) */}
      <CommitPreviewDialog
        open={preview !== null}
        commitName={settings.commitName}
        commitEmail={settings.commitEmail}
        targetBranch={preview?.kind === 'proposal' ? (settings.catalogBranch || 'catalog') : (settings.githubBranch || 'main')}
        pushing={preview?.kind === 'feature' ? isCommitting : isProposing}
        onConfirm={async () => {
          const kind = preview?.kind;
          if (kind === 'feature') await doCommitGitHub();
          else if (kind === 'proposal') await doPropose();
          setPreview(null);
        }}
        onCancel={() => setPreview(null)}
      />
    </div>
  );
}

export function EditorContent() {
  return (
    <Suspense>
      <EditorInner />
    </Suspense>
  );
}
