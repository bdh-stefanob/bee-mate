/**
 * JiraExportModal
 * ---------------
 * Parses the current editor content, shows a selectable list of scenarios,
 * and exports selected ones as comments on linked Jira issues.
 *
 * Credentials (baseUrl, email, token) are persisted in localStorage only —
 * never sent anywhere except the user's own Jira instance.
 * Falls back to a copyable curl command if the direct fetch is blocked by CORS.
 */

import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScenarioItem {
  id: string;
  title: string;
  tags: string[];
  ticketKey: string;   // extracted from @ticket:KEY, editable inline
  description: string; // free-text block between Scenario: and first step
  steps: string[];
  rawText: string;     // full block for the Jira comment payload
  selected: boolean;
}

interface JiraConfig {
  baseUrl: string; // https://company.atlassian.net
  email: string;   // user email for basic auth
  token: string;   // Jira personal access token
}

type Status = 'idle' | 'loading' | 'ok' | 'error';

const STORAGE_KEY = 'bdd-jira-config';

// ---------------------------------------------------------------------------
// Gherkin scenario parser
// ---------------------------------------------------------------------------

export function parseScenarios(content: string): ScenarioItem[] {
  const lines    = content.split('\n');
  const results: ScenarioItem[] = [];

  let pendingTags: string[] = [];
  let title        = '';
  let descLines:  string[] = [];
  let stepLines:  string[] = [];
  let rawLines:   string[] = [];
  let inScenario  = false;
  let seenStep    = false;
  let idx         = 0;

  function flush() {
    if (!title) return;
    const ticketTag = pendingTags.find((t) => t.startsWith('@ticket:'));
    results.push({
      id:          `sc-${idx++}`,
      title,
      tags:        pendingTags,
      ticketKey:   ticketTag ? ticketTag.replace('@ticket:', '').trim() : '',
      description: descLines.join('\n').trim(),
      steps:       stepLines,
      rawText:     rawLines.join('\n').trim(),
      selected:    true,
    });
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^Scenario(\s+Outline)?:/i.test(trimmed)) {
      flush();
      title       = trimmed.replace(/^Scenario(\s+Outline)?:\s*/i, '');
      descLines   = [];
      stepLines   = [];
      rawLines    = [line];
      inScenario  = true;
      seenStep    = false;
    } else if (trimmed.startsWith('@') && !inScenario) {
      pendingTags.push(...trimmed.split(/\s+/).filter((t) => t.startsWith('@')));
    } else if (inScenario) {
      rawLines.push(line);
      if (/^(Given|When|Then|And|But|\*)\s/i.test(trimmed)) {
        seenStep = true;
        stepLines.push(trimmed);
      } else if (
        !seenStep &&
        trimmed &&
        !trimmed.startsWith('|') &&
        !trimmed.startsWith('Examples:') &&
        !trimmed.startsWith('#') &&
        !trimmed.startsWith('@')
      ) {
        descLines.push(trimmed);
      }
      // Tags inside a scenario block belong to a nested Example row — ignore
      if (/^(Feature|Background|Rule):/i.test(trimmed)) {
        flush();
        inScenario  = false;
        pendingTags = [];
        title       = '';
      }
    }
  }

  flush();
  return results;
}

// ---------------------------------------------------------------------------
// Jira API helpers
// ---------------------------------------------------------------------------

function buildAdfComment(scenario: ScenarioItem): object {
  const intro = scenario.description
    ? `Scenario da Feature Editor BDD:\n${scenario.description}`
    : 'Scenario da Feature Editor BDD:';

  return {
    body: {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: intro }],
        },
        {
          type: 'codeBlock',
          attrs: { language: 'cucumber' },
          content: [{ type: 'text', text: scenario.rawText }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: `Tags: ${scenario.tags.join(' ') || '(nessuno)'}`,
              marks: [{ type: 'em' }],
            },
          ],
        },
      ],
    },
  };
}

function buildCurl(baseUrl: string, email: string, token: string, issueKey: string, body: object): string {
  const creds  = btoa(`${email}:${token}`);
  const url    = `${baseUrl.replace(/\/$/, '')}/rest/api/3/issue/${issueKey}/comment`;
  const json   = JSON.stringify(body, null, 2);
  return `curl -X POST "${url}" \\\n  -H "Authorization: Basic ${creds}" \\\n  -H "Content-Type: application/json" \\\n  -d '${json}'`;
}

async function postComment(
  baseUrl: string,
  email: string,
  token: string,
  issueKey: string,
  body: object,
): Promise<void> {
  const url   = `${baseUrl.replace(/\/$/, '')}/rest/api/3/issue/${issueKey}/comment`;
  const creds = btoa(`${email}:${token}`);
  const res   = await fetch(url, {
    method:  'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 120)}` : ''}`);
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  content: string;
  onClose: () => void;
}

export default function JiraExportModal({ content, onClose }: Props) {
  // ── Scenarios ──────────────────────────────────────────────────────────
  const [scenarios, setScenarios] = useState<ScenarioItem[]>(() =>
    parseScenarios(content),
  );

  // ── Jira config ────────────────────────────────────────────────────────
  const [config, setConfig] = useState<JiraConfig>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as JiraConfig) : { baseUrl: '', email: '', token: '' };
    } catch { return { baseUrl: '', email: '', token: '' }; }
  });
  const [showConfig, setShowConfig] = useState(!config.baseUrl);

  function saveConfig(updated: JiraConfig) {
    setConfig(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  // ── Export state ───────────────────────────────────────────────────────
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);
  const [curlId, setCurlId]       = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Helpers ────────────────────────────────────────────────────────────
  function toggleAll(selected: boolean) {
    setScenarios((prev) => prev.map((s) => ({ ...s, selected })));
  }

  function toggleOne(id: string) {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s)),
    );
  }

  function setTicketKey(id: string, key: string) {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ticketKey: key } : s)),
    );
  }

  const selected = scenarios.filter((s) => s.selected);
  const readyToExport = selected.filter((s) => s.ticketKey.trim());
  const missingTicket = selected.filter((s) => !s.ticketKey.trim());

  async function handleExport() {
    if (!config.baseUrl || !config.email || !config.token) {
      setShowConfig(true);
      return;
    }
    setExporting(true);
    const next: Record<string, Status> = {};
    const msgs: Record<string, string> = {};

    for (const s of readyToExport) {
      next[s.id] = 'loading';
      setStatuses({ ...next });
      try {
        const body = buildAdfComment(s);
        await postComment(config.baseUrl, config.email, config.token, s.ticketKey, body);
        next[s.id] = 'ok';
        msgs[s.id] = `Commentato su ${s.ticketKey}`;
      } catch (err) {
        next[s.id] = 'error';
        msgs[s.id] = String(err);
      }
      setStatuses({ ...next });
      setMessages({ ...msgs });
    }
    setExporting(false);
  }

  // ── Styles ─────────────────────────────────────────────────────────────
  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.55)',
    zIndex: 50,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '1rem',
  };
  const card: React.CSSProperties = {
    background: 'var(--sl-color-bg-nav)',
    border: '1px solid var(--sl-color-hairline)',
    borderRadius: '8px',
    width: '100%', maxWidth: '680px',
    maxHeight: '88vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
  };
  const cardHeader: React.CSSProperties = {
    padding: '1rem 1.25rem 0.75rem',
    borderBottom: '1px solid var(--sl-color-hairline)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  };
  const cardBody: React.CSSProperties = {
    overflowY: 'auto', flex: 1,
    padding: '0.75rem 1.25rem',
  };
  const cardFooter: React.CSSProperties = {
    padding: '0.75rem 1.25rem',
    borderTop: '1px solid var(--sl-color-hairline)',
    display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center',
  };
  const inp: React.CSSProperties = {
    width: '100%', padding: '0.3rem 0.5rem',
    fontSize: '0.82rem', lineHeight: 1.4,
    border: '1px solid var(--sl-color-hairline)',
    borderRadius: '4px',
    background: 'var(--sl-color-bg)',
    color: 'var(--sl-color-text)',
  };
  const btn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    margin: 0, padding: '0.35rem 0.75rem',
    fontSize: '0.82rem', lineHeight: 1.2,
    border: '1px solid var(--sl-color-hairline)',
    borderRadius: '4px', background: 'var(--sl-color-bg-nav)',
    color: 'var(--sl-color-text)', cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
  const btnPrimary: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    margin: 0, padding: '0.35rem 0.9rem',
    fontSize: '0.82rem', lineHeight: 1.2,
    border: '1px solid var(--sl-color-accent)',
    borderRadius: '4px', background: 'var(--sl-color-accent)',
    color: 'var(--sl-color-accent-high)', cursor: 'pointer',
    whiteSpace: 'nowrap', fontWeight: 600,
  };
  const label: React.CSSProperties = {
    fontSize: '0.75rem', color: 'var(--sl-color-gray-3)',
    display: 'block', marginBottom: '0.2rem',
  };
  const statusColor = (s: Status) =>
    s === 'ok' ? 'var(--sl-color-green)' : s === 'error' ? 'var(--sl-color-red)' : 'var(--sl-color-gray-3)';

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={card}>

        {/* Header */}
        <div style={cardHeader}>
          <strong style={{ fontSize: '1rem' }}>Export to Jira</strong>
          <button style={{ ...btn, padding: '0.2rem 0.5rem', fontSize: '1rem' }} onClick={onClose} title="Chiudi">×</button>
        </div>

        <div style={cardBody}>

          {/* Jira Config */}
          <div style={{ marginBottom: '1rem' }}>
            <button
              style={{ ...btn, fontSize: '0.78rem', marginBottom: '0.5rem' }}
              onClick={() => setShowConfig((v) => !v)}
            >
              {showConfig ? '▲' : '▶'} Configurazione Jira {!config.baseUrl && ' (richiesta)'}
            </button>

            {showConfig && (
              <div style={{
                border: '1px solid var(--sl-color-hairline)',
                borderRadius: '6px', padding: '0.75rem',
                display: 'grid', gap: '0.6rem',
              }}>
                <div>
                  <span style={label}>URL Jira (es. https://company.atlassian.net)</span>
                  <input style={inp} type="url" value={config.baseUrl} placeholder="https://company.atlassian.net"
                    onChange={(e) => saveConfig({ ...config, baseUrl: e.target.value })} />
                </div>
                <div>
                  <span style={label}>Email account Jira</span>
                  <input style={inp} type="email" value={config.email} placeholder="name@company.com"
                    onChange={(e) => saveConfig({ ...config, email: e.target.value })} />
                </div>
                <div>
                  <span style={label}>
                    API Token (
                    <a href="https://id.atlassian.com/manage-profile/security/api-tokens"
                       target="_blank" rel="noreferrer"
                       style={{ color: 'var(--sl-color-text-accent)' }}>genera qui</a>
                    ) — salvato solo nel browser
                  </span>
                  <input style={inp} type="password" value={config.token} placeholder="••••••••"
                    onChange={(e) => saveConfig({ ...config, token: e.target.value })} />
                </div>
              </div>
            )}
          </div>

          {/* Scenario list */}
          {scenarios.length === 0 ? (
            <p style={{ color: 'var(--sl-color-gray-3)', fontSize: '0.85rem' }}>
              Nessuno scenario trovato nel contenuto corrente.
            </p>
          ) : (
            <>
              {/* Select all / none */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--sl-color-gray-3)' }}>
                  {selected.length} / {scenarios.length} selezionati
                </span>
                <button style={{ ...btn, fontSize: '0.75rem', padding: '0.2rem 0.5rem' }} onClick={() => toggleAll(true)}>Tutti</button>
                <button style={{ ...btn, fontSize: '0.75rem', padding: '0.2rem 0.5rem' }} onClick={() => toggleAll(false)}>Nessuno</button>
              </div>

              {/* Scenario rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {scenarios.map((sc) => {
                  const st   = statuses[sc.id] ?? 'idle';
                  const msg  = messages[sc.id];
                  const curl = buildCurl(config.baseUrl, config.email, config.token, sc.ticketKey || '…', buildAdfComment(sc));

                  return (
                    <div key={sc.id} style={{
                      border: `1px solid ${sc.selected ? 'var(--sl-color-accent)' : 'var(--sl-color-hairline)'}`,
                      borderRadius: '6px', padding: '0.6rem 0.75rem',
                      opacity: sc.selected ? 1 : 0.55,
                      background: 'var(--sl-color-bg)',
                    }}>
                      {/* Row header */}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <input
                          type="checkbox" checked={sc.selected}
                          onChange={() => toggleOne(sc.id)}
                          style={{ marginTop: '0.2rem', flexShrink: 0, cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--sl-color-text)' }}>
                            {sc.title}
                          </div>
                          {sc.tags.length > 0 && (
                            <div style={{ marginTop: '0.2rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {sc.tags.map((t) => (
                                <code key={t} style={{
                                  fontSize: '0.72rem', padding: '0 0.35rem',
                                  background: 'var(--sl-color-bg-nav)',
                                  border: '1px solid var(--sl-color-hairline)',
                                  borderRadius: '3px', color: 'var(--sl-color-text-accent)',
                                }}>{t}</code>
                              ))}
                            </div>
                          )}
                          {sc.description && (
                            <div style={{ marginTop: '0.3rem', fontSize: '0.78rem', color: 'var(--sl-color-gray-3)', fontStyle: 'italic' }}>
                              {sc.description}
                            </div>
                          )}
                        </div>
                        {/* Status badge */}
                        {st !== 'idle' && (
                          <span style={{ fontSize: '0.75rem', color: statusColor(st), flexShrink: 0 }}>
                            {st === 'loading' ? '⟳ invio…' : st === 'ok' ? '✓' : '✗'}
                          </span>
                        )}
                      </div>

                      {/* Ticket key input (only when selected) */}
                      {sc.selected && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--sl-color-gray-3)', flexShrink: 0 }}>
                            Jira issue:
                          </span>
                          <input
                            style={{ ...inp, maxWidth: '160px', padding: '0.2rem 0.4rem' }}
                            type="text" placeholder="BOOT-123"
                            value={sc.ticketKey}
                            onChange={(e) => setTicketKey(sc.id, e.target.value)}
                          />
                          {st === 'error' && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--sl-color-red)' }}>{msg}</span>
                          )}
                          {st === 'ok' && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--sl-color-green)' }}>{msg}</span>
                          )}
                        </div>
                      )}

                      {/* Curl fallback */}
                      {sc.selected && curlId === sc.id && (
                        <details style={{ marginTop: '0.5rem' }}>
                          <summary style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--sl-color-gray-3)' }}>
                            Copia curl command
                          </summary>
                          <textarea
                            readOnly
                            style={{ ...inp, marginTop: '0.3rem', fontFamily: 'monospace', fontSize: '0.7rem', height: '5rem', resize: 'vertical' }}
                            value={curl}
                            onFocus={(e) => e.target.select()}
                          />
                        </details>
                      )}

                      {sc.selected && st === 'idle' && (
                        <button
                          style={{ ...btn, fontSize: '0.72rem', padding: '0.15rem 0.4rem', marginTop: '0.4rem' }}
                          onClick={() => setCurlId(curlId === sc.id ? null : sc.id)}
                        >
                          {curlId === sc.id ? 'Nascondi curl' : 'curl'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={cardFooter}>
          {missingTicket.length > 0 && (
            <span style={{ fontSize: '0.78rem', color: 'var(--sl-color-red)', marginRight: 'auto' }}>
              {missingTicket.length} scenario{missingTicket.length > 1 ? 'i' : ''} senza ticket key
            </span>
          )}
          <button style={btn} onClick={onClose} disabled={exporting}>Annulla</button>
          <button
            style={{ ...btnPrimary, opacity: readyToExport.length === 0 || exporting ? 0.5 : 1 }}
            disabled={readyToExport.length === 0 || exporting}
            onClick={handleExport}
          >
            {exporting ? 'Esportazione…' : `Esporta ${readyToExport.length > 0 ? `(${readyToExport.length})` : ''}`}
          </button>
        </div>

      </div>
    </div>
  );
}
