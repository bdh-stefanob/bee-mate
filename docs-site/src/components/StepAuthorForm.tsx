import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

const STRINGS = {
  it: {
    langLabel: 'EN',
    sec1: '1 · Espressione Gherkin',
    sec2: '2 · Parametri rilevati',
    sec3: '3 · Documentazione',
    sec4: '4 · Codice generato',
    keyword: 'Keyword',
    keywordHint: 'Tipo di step',
    domain: 'Dominio',
    domainHint: 'Area di business dello step',
    newDomain: '+ Nuovo dominio…',
    expression: 'Espressione step',
    expressionHint: 'Usa {string}, {int}, {float}, {word} per i parametri',
    expressionPlaceholder: 'I see the product {string} in the cart',
    paramName: 'nome variabile',
    paramDesc: 'descrizione per @param',
    intent: '@intent',
    intentRequired: '(obbligatorio)',
    intentHint: 'Una frase. Verbo primo, presente, voce attiva. Max ~15 parole.',
    intentPlaceholder: "Verify the product is visible in the user's cart",
    pre: '@pre',
    preHint: 'Precondizione (opzionale)',
    prePlaceholder: 'Cart page is open',
    post: '@post',
    postHint: 'Postcondizione (opzionale)',
    postPlaceholder: 'Product count is visible',
    page: 'Page Object',
    pageHint: 'Classe che questo step usa (es. CartPage)',
    pagePlaceholder: 'CartPage',
    codeEmpty: '// Completa espressione e @intent per vedere il codice generato',
    copy: 'Copia',
    copied: '✓ Copiato',
    copyCode: 'Copia codice',
    copyHint: (domain: string) =>
      `Incolla in src/steps/${domain}/${domain}.steps.ts, poi lancia npm run catalog`,
  },
  en: {
    langLabel: 'IT',
    sec1: '1 · Gherkin Expression',
    sec2: '2 · Detected Parameters',
    sec3: '3 · Documentation',
    sec4: '4 · Generated Code',
    keyword: 'Keyword',
    keywordHint: 'Step type',
    domain: 'Domain',
    domainHint: 'Business area for this step',
    newDomain: '+ New domain…',
    expression: 'Step expression',
    expressionHint: 'Use {string}, {int}, {float}, {word} for parameters',
    expressionPlaceholder: 'I see the product {string} in the cart',
    paramName: 'variable name',
    paramDesc: 'description for @param',
    intent: '@intent',
    intentRequired: '(required)',
    intentHint: 'One sentence. Verb first, present tense, active voice. Max ~15 words.',
    intentPlaceholder: "Verify the product is visible in the user's cart",
    pre: '@pre',
    preHint: 'Precondition (optional)',
    prePlaceholder: 'Cart page is open',
    post: '@post',
    postHint: 'Postcondition (optional)',
    postPlaceholder: 'Product count is visible',
    page: 'Page Object',
    pageHint: 'Page Object class used by this step (e.g. CartPage)',
    pagePlaceholder: 'CartPage',
    codeEmpty: '// Fill in expression and @intent to see the generated code',
    copy: 'Copy',
    copied: '✓ Copied',
    copyCode: 'Copy code',
    copyHint: (domain: string) =>
      `Paste into src/steps/${domain}/${domain}.steps.ts, then run npm run catalog`,
  },
} as const;

type Lang = keyof typeof STRINGS;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParamField {
  placeholder: string;
  name:        string;
  desc:        string;
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
    int:    `count${index + 1}`,
    float:  `amount${index + 1}`,
    word:   `word${index + 1}`,
  };
  return names[type] ?? `param${index + 1}`;
}

function tsType(placeholder: string): string {
  const t = placeholder.replace(/[{}]/g, '').toLowerCase();
  if (['int', 'float', 'biginteger', 'double'].includes(t)) return 'number';
  return 'string';
}

function generateCode(form: StepForm): string {
  const lines: string[] = [];
  lines.push('/**');
  if (form.intent) lines.push(` * @intent  ${form.intent}`);
  for (const p of form.params) {
    if (p.name) lines.push(` * @param   ${p.name} ${p.desc || '...'}`);
  }
  if (form.pre)  lines.push(` * @pre     ${form.pre}`);
  if (form.post) lines.push(` * @post    ${form.post}`);
  if (form.page) lines.push(` * @page    ${form.page}`);
  lines.push(' */');

  const kw = form.keyword === 'Given/When/Then' ? 'Given' : form.keyword;
  const fnParams = form.params.map((p) => `${p.name || '_'}: ${tsType(p.placeholder)}`).join(', ');
  const fnParamsFull = fnParams ? `, async function(${fnParams})` : ', async function()';

  lines.push(`${kw}('${form.expression}'${fnParamsFull} {`);
  if (form.page) {
    const cls = form.page.replace(/Page$/, '') + 'Page';
    lines.push(`  // await new ${cls}(this.page).yourMethod(${form.params.map(p => p.name || '_').join(', ')});`);
  }
  lines.push(`  throw new Error('Step not yet implemented');`);
  lines.push('});');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Shared style tokens
// ---------------------------------------------------------------------------

const S = {
  field: { display: 'flex', flexDirection: 'column', gap: '0.25rem' } as React.CSSProperties,
  lbl:   { fontSize: '0.78rem', fontWeight: 600, color: 'var(--sl-color-text)' } as React.CSSProperties,
  hint:  { fontSize: '0.71rem', color: 'var(--sl-color-gray-3)', lineHeight: 1.3 } as React.CSSProperties,
  inp: {
    width: '100%', padding: '0.4rem 0.6rem',
    fontSize: '0.85rem', lineHeight: 1.4,
    border: '1px solid var(--sl-color-hairline)',
    borderRadius: '5px',
    background: 'var(--sl-color-bg)',
    color: 'var(--sl-color-text)',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  } as React.CSSProperties,
  mono: {
    width: '100%', padding: '0.4rem 0.6rem',
    fontSize: '0.82rem', lineHeight: 1.4,
    border: '1px solid var(--sl-color-hairline)',
    borderRadius: '5px',
    background: 'var(--sl-color-bg)',
    color: 'var(--sl-color-text)',
    fontFamily: 'monospace',
    boxSizing: 'border-box',
  } as React.CSSProperties,
  btn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '0.35rem 0.8rem', fontSize: '0.82rem', lineHeight: 1.2,
    border: '1px solid var(--sl-color-hairline)',
    borderRadius: '5px', background: 'var(--sl-color-bg-nav)',
    color: 'var(--sl-color-text)', cursor: 'pointer', fontWeight: 500,
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  secTitle: {
    fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: 'var(--sl-color-gray-3)',
    margin: '1.25rem 0 0.5rem',
    padding: '0.5rem 0.75rem',
    background: 'var(--sl-color-bg-nav)',
    borderLeft: '3px solid var(--sl-color-accent)',
    borderRadius: '0 4px 4px 0',
  } as React.CSSProperties,
  badge: {
    display: 'inline-block', padding: '0.1rem 0.45rem',
    fontSize: '0.7rem', borderRadius: '3px', fontFamily: 'monospace',
    background: 'var(--sl-color-bg-inline-code)',
    color: 'var(--sl-color-text-accent)',
    border: '1px solid var(--sl-color-hairline)',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
};

const DOMAINS = ['auth', 'orders', 'cart', 'common', 'search', 'account', 'checkout'];
const KEYWORDS = ['Given', 'When', 'Then', 'Given/When/Then'] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StepAuthorForm() {
  const [lang, setLang]   = useState<Lang>('it');
  const [form, setForm]   = useState<StepForm>({
    expression: '', keyword: 'When', domain: 'common',
    page: '', intent: '', pre: '', post: '', params: [],
  });
  const [copied, setCopied] = useState(false);

  const t = STRINGS[lang];

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

  const code    = generateCode(form);
  const isValid = form.expression.trim().length > 0 && form.intent.trim().length > 0;

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

  const btnPrimary: React.CSSProperties = {
    ...S.btn,
    border: '1px solid var(--sl-color-accent)',
    background: 'var(--sl-color-accent)',
    color: '#fff',
    fontWeight: 600,
  };

  const langBtn: React.CSSProperties = {
    ...S.btn,
    fontSize: '0.72rem',
    padding: '0.2rem 0.55rem',
    letterSpacing: '0.05em',
    fontWeight: 700,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: '760px' }}>

      {/* ── Language toggle ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
        <button style={langBtn} onClick={() => setLang(lang === 'it' ? 'en' : 'it')}>
          {t.langLabel}
        </button>
      </div>

      {/* ══ Section 1 ══ */}
      <p style={S.secTitle}>{t.sec1}</p>

      {/* Keyword + Domain: align-items:end so selects sit at the same baseline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'end', marginTop: '0.75rem' }}>

        <div style={S.field}>
          <span style={S.lbl}>{t.keyword}</span>
          <span style={S.hint}>{t.keywordHint}</span>
          <select style={S.inp} value={form.keyword}
            onChange={(e) => setForm({ ...form, keyword: e.target.value as StepForm['keyword'] })}>
            {KEYWORDS.map((k) => <option key={k}>{k}</option>)}
          </select>
        </div>

        <div style={S.field}>
          <span style={S.lbl}>{t.domain}</span>
          <span style={S.hint}>{t.domainHint}</span>
          <select style={S.inp} value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value })}>
            {DOMAINS.map((d) => <option key={d}>{d}</option>)}
            <option value="__new__">{t.newDomain}</option>
          </select>
        </div>

      </div>

      {/* Expression */}
      <div style={{ ...S.field, marginTop: '0.75rem' }}>
        <span style={S.lbl}>{t.expression}</span>
        <span style={S.hint}>{t.expressionHint}</span>
        <input style={S.mono} type="text"
          placeholder={t.expressionPlaceholder}
          value={form.expression}
          onChange={(e) => setForm({ ...form, expression: e.target.value })}
        />
      </div>

      {/* ══ Section 2 — Params (conditional) ══ */}
      {form.params.length > 0 && (
        <>
          <p style={S.secTitle}>{t.sec2}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            {form.params.map((p, i) => (
              <div key={p.placeholder} style={{
                display: 'grid', gridTemplateColumns: 'auto 1fr 2fr', gap: '0.5rem',
                alignItems: 'center',
                padding: '0.5rem 0.75rem',
                background: 'var(--sl-color-bg-nav)',
                border: '1px solid var(--sl-color-hairline)',
                borderRadius: '5px',
              }}>
                <span style={S.badge}>{p.placeholder}</span>
                <input style={S.inp} type="text" placeholder={t.paramName}
                  value={p.name}
                  onChange={(e) => updateParam(i, 'name', e.target.value)}
                />
                <input style={S.inp} type="text" placeholder={t.paramDesc}
                  value={p.desc}
                  onChange={(e) => updateParam(i, 'desc', e.target.value)}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ══ Section 3 ══ */}
      <p style={S.secTitle}>{t.sec3}</p>

      {/* @intent */}
      <div style={{ ...S.field, marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
          <span style={S.lbl}>{t.intent}</span>
          <span style={{ ...S.hint, color: 'var(--sl-color-red)', fontWeight: 600 }}>{t.intentRequired}</span>
        </div>
        <span style={S.hint}>{t.intentHint}</span>
        <input style={S.inp} type="text"
          placeholder={t.intentPlaceholder}
          value={form.intent}
          onChange={(e) => setForm({ ...form, intent: e.target.value })}
        />
      </div>

      {/* @pre + @post */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'end', marginTop: '0.75rem' }}>
        <div style={S.field}>
          <span style={S.lbl}>{t.pre}</span>
          <span style={S.hint}>{t.preHint}</span>
          <input style={S.inp} type="text"
            placeholder={t.prePlaceholder}
            value={form.pre}
            onChange={(e) => setForm({ ...form, pre: e.target.value })}
          />
        </div>
        <div style={S.field}>
          <span style={S.lbl}>{t.post}</span>
          <span style={S.hint}>{t.postHint}</span>
          <input style={S.inp} type="text"
            placeholder={t.postPlaceholder}
            value={form.post}
            onChange={(e) => setForm({ ...form, post: e.target.value })}
          />
        </div>
      </div>

      {/* Page Object */}
      <div style={{ ...S.field, marginTop: '0.75rem' }}>
        <span style={S.lbl}>{t.page}</span>
        <span style={S.hint}>{t.pageHint}</span>
        <input style={S.inp} type="text"
          placeholder={t.pagePlaceholder}
          value={form.page}
          onChange={(e) => setForm({ ...form, page: e.target.value })}
        />
      </div>

      {/* ══ Section 4 ══ */}
      <p style={S.secTitle}>{t.sec4}</p>

      <div style={{
        position: 'relative', marginTop: '0.5rem',
        border: '1px solid var(--sl-color-hairline)',
        borderRadius: '6px', overflow: 'hidden',
      }}>
        <pre style={{
          margin: 0, padding: '1rem',
          fontSize: '0.8rem', lineHeight: 1.65,
          background: 'var(--sl-color-bg-nav)',
          color: 'var(--sl-color-text)',
          overflowX: 'auto', whiteSpace: 'pre-wrap',
          opacity: isValid ? 1 : 0.5,
        }}>
          {isValid ? code : t.codeEmpty}
        </pre>
        {isValid && (
          <button
            style={{ ...S.btn, position: 'absolute', top: '0.5rem', right: '0.5rem', fontSize: '0.74rem' }}
            onClick={handleCopy}
          >
            {copied ? t.copied : t.copy}
          </button>
        )}
      </div>

      {/* ── Actions ── */}
      {isValid && (
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <button style={btnPrimary} onClick={handleCopy}>
            {copied ? t.copied : t.copyCode}
          </button>
          <span style={{ fontSize: '0.77rem', color: 'var(--sl-color-gray-3)' }}>
            {t.copyHint(form.domain)}
          </span>
        </div>
      )}

    </div>
  );
}
