/**
 * StepBrowserPanel
 * -----------------
 * Pannello laterale del Feature Editor.
 * Mostra gli step del catalogo con filtri per dominio e page object.
 * - Double-click → inserisce lo step nell'editor (via onInsert callback)
 * - Drag → ghost pill animato, drop rilevato dall'overlay in FeatureEditor
 * - ℹ → accordion inline con @intent, @param, page, sourceRef
 */

import { useState, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types (mirrored from FeatureEditor to keep the panel self-contained)
// ---------------------------------------------------------------------------

export interface CatalogStep {
  expression: string;
  parameters: string[];
  domain:     string;
  page?:      string;
  sourceRef:  string;
  doc: { intent?: string; params: Record<string, string> };
}

interface Props {
  steps:              CatalogStep[];
  keyword:            string;  // Given | When | Then
  onInsert:           (text: string) => void;
  onDragActiveChange: (active: boolean) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DOMAIN_COLORS: Record<string, string> = {
  auth:     '#42A5F5',
  orders:   '#AB47BC',
  cart:     '#66BB6A',
  common:   '#78909C',
  search:   '#FFA726',
  account:  '#26C6DA',
  checkout: '#EF5350',
};

function domainColor(d: string) {
  return DOMAIN_COLORS[d] ?? '#90A4AE';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StepBrowserPanel({ steps, keyword, onInsert, onDragActiveChange }: Props) {
  const [search,   setSearch]   = useState('');
  const [domain,   setDomain]   = useState('all');
  const [page,     setPage]     = useState('all');
  const [docOpen,  setDocOpen]  = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const domains = useMemo(
    () => ['all', ...Array.from(new Set(steps.map(s => s.domain))).sort()],
    [steps],
  );

  const pagesForDomain = useMemo(() => {
    const src = domain === 'all' ? steps : steps.filter(s => s.domain === domain);
    return Array.from(new Set(src.map(s => s.page).filter(Boolean) as string[])).sort();
  }, [steps, domain]);

  const filtered = useMemo(() => steps.filter(s => {
    if (domain !== 'all' && s.domain !== domain) return false;
    if (page   !== 'all' && s.page   !== page)   return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.expression.toLowerCase().includes(q) ||
        s.domain.toLowerCase().includes(q) ||
        (s.doc.intent ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  }), [steps, domain, page, search]);

  // Builds the full Gherkin step line to insert: "    When {expression}"
  function buildLine(step: CatalogStep) {
    return `    ${keyword} ${step.expression}`;
  }

  function handleDragStart(e: React.DragEvent, step: CatalogStep) {
    const text = buildLine(step);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('bdd-step', text);

    // Custom pill ghost — replaces the default semi-transparent element clone
    const ghost = document.createElement('div');
    ghost.textContent = `${keyword}  ${step.expression}`;
    Object.assign(ghost.style, {
      position: 'fixed', top: '-9999px', left: '-9999px',
      padding: '5px 12px', borderRadius: '20px',
      background: '#1B448E', color: '#fff',
      fontSize: '12px', fontFamily: 'monospace',
      maxWidth: '320px', overflow: 'hidden',
      whiteSpace: 'nowrap', textOverflow: 'ellipsis',
      pointerEvents: 'none', zIndex: '99999',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    });
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 16, 16);
    requestAnimationFrame(() => { if (document.body.contains(ghost)) document.body.removeChild(ghost); });

    setDragging(step.expression);
    onDragActiveChange(true);
  }

  function handleDragEnd() {
    setDragging(null);
    onDragActiveChange(false);
  }

  // ── Styles ──────────────────────────────────────────────────────────────

  const chip = (active: boolean, color?: string): React.CSSProperties => ({
    display:    'inline-block',
    padding:    '0.18rem 0.5rem',
    fontSize:   '0.7rem',
    borderRadius: '20px',
    border:     `1px solid ${active ? (color ?? 'var(--sl-color-accent)') : 'var(--sl-color-hairline)'}`,
    background: active ? (color ?? 'var(--sl-color-accent)') : 'transparent',
    color:      active ? '#fff' : 'var(--sl-color-gray-3)',
    cursor:     'pointer',
    fontWeight: active ? 700 : 400,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'all 0.1s',
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      background: 'var(--sl-color-bg-nav)',
      borderRight: '1px solid var(--sl-color-hairline)',
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: '0.5rem 0.75rem',
        borderBottom: '1px solid var(--sl-color-hairline)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--sl-color-bg)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.07em',
          textTransform: 'uppercase', color: 'var(--sl-color-gray-3)' }}>
          Step Catalog
        </span>
        <span style={{ fontSize: '0.68rem', color: 'var(--sl-color-gray-3)' }}>
          {filtered.length} / {steps.length}
        </span>
      </div>

      {/* ── Search ── */}
      <div style={{ padding: '0.45rem 0.6rem', borderBottom: '1px solid var(--sl-color-hairline)', flexShrink: 0 }}>
        <input
          type="text"
          placeholder="Cerca step, dominio, intent…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '0.3rem 0.5rem',
            fontSize: '0.78rem', borderRadius: '4px',
            border: '1px solid var(--sl-color-hairline)',
            background: 'var(--sl-color-bg)',
            color: 'var(--sl-color-text)',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* ── Domain chips ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '0.3rem',
        padding: '0.45rem 0.6rem',
        borderBottom: '1px solid var(--sl-color-hairline)',
        flexShrink: 0,
      }}>
        <button style={chip(domain === 'all')}
          onClick={() => { setDomain('all'); setPage('all'); }}>
          tutti
        </button>
        {domains.filter(d => d !== 'all').map(d => (
          <button key={d}
            style={chip(domain === d, domainColor(d))}
            onClick={() => { setDomain(d); setPage('all'); }}>
            {d}
          </button>
        ))}
      </div>

      {/* ── Page filter (shown only when domain selected and has 2+ pages) ── */}
      {domain !== 'all' && pagesForDomain.length > 1 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.3rem',
          padding: '0.35rem 0.6rem',
          borderBottom: '1px solid var(--sl-color-hairline)',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '0.66rem', color: 'var(--sl-color-gray-3)', marginRight: '0.2rem' }}>
            page:
          </span>
          <button style={chip(page === 'all')} onClick={() => setPage('all')}>
            tutte
          </button>
          {pagesForDomain.map(p => (
            <button key={p} style={chip(page === p)} onClick={() => setPage(p)}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* ── Usage hint ── */}
      <div style={{
        padding: '0.3rem 0.6rem',
        fontSize: '0.65rem', color: 'var(--sl-color-gray-3)',
        borderBottom: '1px solid var(--sl-color-hairline)',
        flexShrink: 0, lineHeight: 1.4,
      }}>
        Doppio-clic per inserire · Trascina nell&apos;editor
      </div>

      {/* ── Step list ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.3rem 0.4rem 0.5rem' }}>
        {filtered.length === 0 && (
          <p style={{ fontSize: '0.78rem', color: 'var(--sl-color-gray-3)', padding: '1rem 0.5rem', margin: 0, textAlign: 'center' }}>
            Nessuno step trovato
          </p>
        )}

        {filtered.map(step => {
          const isDocOpen = docOpen === step.expression;
          const isDragging = dragging === step.expression;
          const hasParams   = Object.keys(step.doc.params).length > 0;
          const hasDoc      = step.doc.intent || hasParams || step.page;

          return (
            <div
              key={step.expression}
              draggable
              onDragStart={e => handleDragStart(e, step)}
              onDragEnd={handleDragEnd}
              onDoubleClick={() => onInsert(buildLine(step))}
              style={{
                marginBottom: '0.35rem',
                border: '1px solid var(--sl-color-hairline)',
                borderRadius: '6px',
                background: 'var(--sl-color-bg)',
                opacity: isDragging ? 0.35 : 1,
                transition: 'opacity 0.15s, box-shadow 0.1s, border-color 0.1s',
                cursor: 'grab',
                userSelect: 'none',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.boxShadow = `0 0 0 2px ${domainColor(step.domain)}55`;
                el.style.borderColor = domainColor(step.domain);
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.boxShadow = 'none';
                el.style.borderColor = 'var(--sl-color-hairline)';
              }}
            >
              {/* Main row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem', padding: '0.4rem 0.45rem' }}>
                {/* Drag handle */}
                <span style={{
                  fontSize: '0.9rem', lineHeight: '1.4',
                  color: 'var(--sl-color-gray-4)',
                  flexShrink: 0, cursor: 'grab',
                  marginTop: '0.05rem',
                }}>
                  ⠿
                </span>

                {/* Domain badge */}
                <span style={{
                  flexShrink: 0, fontSize: '0.6rem', fontWeight: 700,
                  padding: '0.1rem 0.35rem', borderRadius: '3px',
                  background: domainColor(step.domain) + '22',
                  color: domainColor(step.domain),
                  border: `1px solid ${domainColor(step.domain)}55`,
                  marginTop: '0.1rem',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {step.domain}
                </span>

                {/* Expression */}
                <span style={{
                  flex: 1, fontSize: '0.75rem', lineHeight: 1.45,
                  color: 'var(--sl-color-text)',
                  fontFamily: 'monospace', wordBreak: 'break-word',
                }}>
                  {step.expression}
                </span>

                {/* Docs toggle — only shown when there's documentation */}
                {hasDoc && (
                  <button
                    title={isDocOpen ? 'Chiudi docs' : 'Vedi docs'}
                    onClick={e => {
                      e.stopPropagation();
                      setDocOpen(isDocOpen ? null : step.expression);
                    }}
                    style={{
                      flexShrink: 0, background: 'none', border: 'none',
                      cursor: 'pointer', padding: '0.1rem 0.2rem',
                      color: isDocOpen ? 'var(--sl-color-accent)' : 'var(--sl-color-gray-3)',
                      fontSize: '0.85rem', lineHeight: 1,
                      transition: 'color 0.1s',
                      borderRadius: '3px',
                    }}
                  >
                    ℹ
                  </button>
                )}
              </div>

              {/* Docs accordion */}
              {isDocOpen && (
                <div style={{
                  borderTop: '1px solid var(--sl-color-hairline)',
                  padding: '0.45rem 0.6rem',
                  background: 'var(--sl-color-bg-nav)',
                  borderRadius: '0 0 5px 5px',
                  fontSize: '0.71rem', lineHeight: 1.55,
                  color: 'var(--sl-color-gray-2)',
                }}>
                  {step.doc.intent && (
                    <div style={{ marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--sl-color-accent)', marginRight: '0.3rem' }}>
                        @intent
                      </span>
                      {step.doc.intent}
                    </div>
                  )}
                  {hasParams && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginBottom: '0.3rem' }}>
                      {Object.entries(step.doc.params).map(([name, desc]) => (
                        <div key={name}>
                          <code style={{
                            fontSize: '0.68rem',
                            background: 'var(--sl-color-bg-inline-code)',
                            padding: '0 0.3rem', borderRadius: '2px',
                            color: 'var(--sl-color-text-accent)',
                          }}>
                            {name}
                          </code>
                          {' '}{desc}
                        </div>
                      ))}
                    </div>
                  )}
                  {step.page && (
                    <div style={{ opacity: 0.8 }}>
                      <span style={{ fontWeight: 600 }}>page</span>
                      {' '}
                      <code style={{ fontSize: '0.68rem', opacity: 0.9 }}>{step.page}</code>
                    </div>
                  )}
                  {step.sourceRef && (
                    <div style={{
                      marginTop: '0.2rem', opacity: 0.55,
                      fontFamily: 'monospace', fontSize: '0.66rem',
                    }}>
                      {step.sourceRef}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
