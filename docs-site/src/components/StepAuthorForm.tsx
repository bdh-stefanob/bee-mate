/**
 * StepAuthorForm
 * ---------------
 * Form per creare una nuova step definition con documentazione completa.
 * L'utente compila espressione, @intent, parametri, dominio, page object.
 * Il form genera il codice TypeScript pronto da copiare o proporre via PR.
 */

import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParamField {
  placeholder: string; // {string}, {int}, etc.
  name:        string; // nome del parametro per il JSDoc
  desc:        string; // descrizione del parametro per il JSDoc
}

interface StepForm {
  expression: string;
  keyword:    'Given' | 'When' | 'Then' | 'Given/When/Then';
  domain:     string;
  page:       string;
  intent:     string;
  pre:        string;
  post:       string;
  params:     ParamField[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractParams(expression: string): string[] {
  const matches = expression.match(/\{[^}]+\}/g) ?? [];
  return [...new Set(matches)];
}

function inferParamName(placeholder: string, index: number): string {
  const type = placeholder.replace(/[{}]/g, '').toLowerCase();
  const names: Record<string, string> = {
    string: `value${index + 1}`,
    int: `count${index + 1}`,
    float: `amount${index + 1}`,
    word: `word${index + 1}`,
  };
  return names[type] ?? `param${index + 1}`;
}

function tsType(placeholder: string): string {
  const t = placeholder.replace(/[{}]/g, '').toLowerCase();
  if (t === 'int' || t === 'float' || t === 'biginteger' || t === 'double') return 'number';
  if (t === 'word' || t === 'string') return 'string';
  return 'string';
}

function generateCode(form: StepForm): string {
  const lines: string[] = [];

  // JSDoc
  lines.push('/**');
  if (form.intent)  lines.push(` * @intent  ${form.intent}`);
  for (const p of form.params) {
    if (p.name) lines.push(` * @param   ${p.name} ${p.desc || '...'}`);
  }
  if (form.pre)  lines.push(` * @pre     ${form.pre}`);
  if (form.post) lines.push(` * @post    ${form.post}`);
  if (form.page) lines.push(` * @page    ${form.page}`);
  lines.push(' */');

  // Determina il pattern da importare
  const kw = form.keyword === 'Given/When/Then' ? 'Given' : form.keyword;

  // Parametri della funzione
  const fnParams = form.params
    .map((p) => `${p.name || '_'}: ${tsType(p.placeholder)}`)
    .join(', ');
  const fnParamsFull = fnParams ? `, async function(${fnParams})` : ', async function()';

  lines.push(`${kw}('${form.expression}'${fnParamsFull} {`);
  if (form.page) {
    const pageName = form.page.replace(/Page$/, '') + 'Page';
    lines.push(`  // await new ${pageName}(this.page).yourMethod(${form.params.map(p => p.name || '_').join(', ')});`);
  }
  lines.push('  throw new Error(\'Step non ancora implementato\');');
  lines.push('});');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DOMAINS = ['auth', 'orders', 'cart', 'common', 'search', 'account', 'checkout'];
const KEYWORDS = ['Given', 'When', 'Then', 'Given/When/Then'] as const;

export default function StepAuthorForm() {
  const [form, setForm] = useState<StepForm>({
    expression: '',
    keyword:    'When',
    domain:     'common',
    page:       '',
    intent:     '',
    pre:        '',
    post:       '',
    params:     [],
  });
  const [copied, setCopied] = useState(false);

  // Auto-rileva i parametri dall'espressione
  useEffect(() => {
    const placeholders = extractParams(form.expression);
    setForm((prev) => ({
      ...prev,
      params: placeholders.map((ph, i) => {
        const existing = prev.params.find((p) => p.placeholder === ph);
        return existing ?? { placeholder: ph, name: inferParamName(ph, i), desc: '' };
      }),
    }));
  }, [form.expression]);

  const code = generateCode(form);
  const isValid = form.expression.trim() && form.intent.trim();

  function updateParam(index: number, field: 'name' | 'desc', value: string) {
    setForm((prev) => {
      const params = [...prev.params];
      params[index] = { ...params[index]!, [field]: value };
      return { ...prev, params };
    });
  }

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------
  const field: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '0.25rem',
  };
  const lbl: React.CSSProperties = {
    fontSize: '0.78rem', fontWeight: 600,
    color: 'var(--sl-color-text)',
  };
  const sublbl: React.CSSProperties = {
    fontSize: '0.72rem', color: 'var(--sl-color-gray-3)',
    marginBottom: '0.15rem',
  };
  const inp: React.CSSProperties = {
    width: '100%', padding: '0.4rem 0.6rem',
    fontSize: '0.85rem', lineHeight: 1.4,
    border: '1px solid var(--sl-color-hairline)',
    borderRadius: '5px',
    background: 'var(--sl-color-bg)',
    color: 'var(--sl-color-text)',
    fontFamily: 'inherit',
  };
  const monoInp: React.CSSProperties = {
    ...inp, fontFamily: 'monospace', fontSize: '0.82rem',
  };
  const btn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '0.4rem 0.9rem', fontSize: '0.83rem', lineHeight: 1.2,
    border: '1px solid var(--sl-color-hairline)',
    borderRadius: '5px', background: 'var(--sl-color-bg-nav)',
    color: 'var(--sl-color-text)', cursor: 'pointer', fontWeight: 500,
  };
  const btnPrimary: React.CSSProperties = {
    ...btn,
    border: '1px solid var(--sl-color-accent)',
    background: 'var(--sl-color-accent)',
    color: 'var(--sl-color-accent-high)', fontWeight: 600,
  };
  const grid2: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--sl-color-gray-3)',
    marginBottom: '0.75rem', marginTop: '1.5rem',
  };
  const badge: React.CSSProperties = {
    display: 'inline-block', padding: '0.1rem 0.4rem',
    fontSize: '0.7rem', borderRadius: '3px', fontFamily: 'monospace',
    background: 'var(--sl-color-bg-inline-code)',
    color: 'var(--sl-color-text-accent)',
    border: '1px solid var(--sl-color-hairline)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '760px' }}>

      {/* ── Espressione ── */}
      <p style={sectionTitle}>1 · Espressione Gherkin</p>

      <div style={grid2}>
        <div style={field}>
          <span style={lbl}>Keyword</span>
          <select style={inp} value={form.keyword}
            onChange={(e) => setForm({ ...form, keyword: e.target.value as StepForm['keyword'] })}>
            {KEYWORDS.map((k) => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div style={field}>
          <span style={lbl}>Dominio</span>
          <span style={sublbl}>Raggruppa step per area di business</span>
          <select style={inp} value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value })}>
            {DOMAINS.map((d) => <option key={d}>{d}</option>)}
            <option value="__new__">+ Nuovo dominio…</option>
          </select>
        </div>
      </div>

      <div style={field}>
        <span style={lbl}>Espressione step</span>
        <span style={sublbl}>Usa <code>{'{string}'}</code>, <code>{'{int}'}</code>, <code>{'{float}'}</code>, <code>{'{word}'}</code> per i parametri</span>
        <input style={monoInp} type="text"
          placeholder="I see the product {string} in the cart"
          value={form.expression}
          onChange={(e) => setForm({ ...form, expression: e.target.value })}
        />
      </div>

      {/* ── Parametri auto-rilevati ── */}
      {form.params.length > 0 && (
        <div>
          <p style={sectionTitle}>2 · Parametri rilevati</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {form.params.map((p, i) => (
              <div key={p.placeholder} style={{
                display: 'grid', gridTemplateColumns: 'auto 1fr 2fr', gap: '0.6rem',
                alignItems: 'center',
                padding: '0.5rem 0.75rem',
                background: 'var(--sl-color-bg-nav)',
                border: '1px solid var(--sl-color-hairline)',
                borderRadius: '5px',
              }}>
                <span style={badge}>{p.placeholder}</span>
                <input style={inp} type="text" placeholder="nome parametro"
                  value={p.name}
                  onChange={(e) => updateParam(i, 'name', e.target.value)}
                />
                <input style={inp} type="text" placeholder="descrizione per @param"
                  value={p.desc}
                  onChange={(e) => updateParam(i, 'desc', e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Documentazione ── */}
      <p style={sectionTitle}>3 · Documentazione</p>

      <div style={field}>
        <span style={lbl}>@intent <span style={{ color: 'var(--sl-color-red)' }}>*</span></span>
        <span style={sublbl}>Una frase. Verbo primo, presente, voce attiva. Max ~15 parole.</span>
        <input style={inp} type="text"
          placeholder="Verify the product is visible in the user's cart"
          value={form.intent}
          onChange={(e) => setForm({ ...form, intent: e.target.value })}
        />
      </div>

      <div style={grid2}>
        <div style={field}>
          <span style={lbl}>@pre</span>
          <span style={sublbl}>Precondizione (opzionale)</span>
          <input style={inp} type="text"
            placeholder="Cart page is open"
            value={form.pre}
            onChange={(e) => setForm({ ...form, pre: e.target.value })}
          />
        </div>
        <div style={field}>
          <span style={lbl}>@post</span>
          <span style={sublbl}>Postcondizione (opzionale)</span>
          <input style={inp} type="text"
            placeholder="Product count is visible"
            value={form.post}
            onChange={(e) => setForm({ ...form, post: e.target.value })}
          />
        </div>
      </div>

      <div style={field}>
        <span style={lbl}>Page Object</span>
        <span style={sublbl}>Classe Page Object che questo step usa (es. CartPage)</span>
        <input style={inp} type="text"
          placeholder="CartPage"
          value={form.page}
          onChange={(e) => setForm({ ...form, page: e.target.value })}
        />
      </div>

      {/* ── Preview codice ── */}
      <p style={sectionTitle}>4 · Codice generato</p>

      <div style={{
        position: 'relative',
        border: '1px solid var(--sl-color-hairline)',
        borderRadius: '6px', overflow: 'hidden',
      }}>
        <pre style={{
          margin: 0, padding: '1rem',
          fontSize: '0.8rem', lineHeight: 1.6,
          background: 'var(--sl-color-bg-nav)',
          color: 'var(--sl-color-text)',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          opacity: isValid ? 1 : 0.45,
        }}>
          {isValid ? code : '// Completa espressione e @intent per vedere il codice generato'}
        </pre>
        {isValid && (
          <button
            style={{ ...btn, position: 'absolute', top: '0.5rem', right: '0.5rem', fontSize: '0.75rem' }}
            onClick={handleCopy}
          >
            {copied ? '✓ Copiato' : 'Copia'}
          </button>
        )}
      </div>

      {/* ── Azioni ── */}
      {isValid && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button style={btnPrimary} onClick={handleCopy}>
            {copied ? '✓ Copiato' : 'Copia codice'}
          </button>
          <span style={{ fontSize: '0.78rem', color: 'var(--sl-color-gray-3)' }}>
            Incolla in <code>src/steps/{form.domain}/{form.domain}.steps.ts</code>, poi lancia <code>npm run catalog</code>
          </span>
        </div>
      )}

    </div>
  );
}
