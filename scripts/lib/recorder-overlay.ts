/**
 * lib/recorder-overlay.ts
 * -----------------------
 * La barra che il tester vede mentre esegue il test a mano, e la cattura delle
 * sue interazioni.
 *
 * COSA RISOLVE, E PERCHE' NON BASTA REGISTRARE E BASTA
 * Una registrazione nuda produce una sequenza di gesti. Per ricavarne uno
 * scenario servono due informazioni che dai gesti non si deducono:
 *
 *   1. DOVE FINISCE UN INTENTO. Tre click possono essere tre step o uno solo.
 *      Indovinarlo e' il punto in cui questi sistemi sbagliano: o spezzano
 *      troppo (uno step per click, cioe' Gherkin imperativo) o troppo poco.
 *      Il pulsante "Fine intento" trasforma il problema da inferenza a
 *      etichettatura: non si indovina piu', lo dichiara chi sta testando.
 *
 *   2. COSA VERIFICARE. Una registrazione cattura azioni, non verifiche. Ma e'
 *      il "Then" che rende un test un test. Il pulsante "Verifica" fa scegliere
 *      al tester l'elemento che prova la riuscita.
 *
 * Senza questi due, si genererebbero scenari senza confini e senza asserzioni:
 * cose che sembrano test e non lo sono.
 *
 * L'overlay vive in uno shadow DOM con stile isolato, per non ereditare i CSS
 * dell'applicazione ne' inquinarli.
 */

/**
 * Richiede che `DOM_PROBE_SOURCE` sia gia' stato iniettato, e che esista la
 * binding `window.__bddEmit(evento)` esposta dal lato Node.
 */
export const RECORDER_OVERLAY_SOURCE = String.raw`
(() => {
  if (window.__bddRecorder) return;
  if (!window.__bddProbe) return;

  const state = { picking: false, intents: 0, actions: 0 };

  function emit(event) {
    try { window.__bddEmit(JSON.stringify(event)); } catch (e) { /* pagina in chiusura */ }
  }

  // ── Barra ────────────────────────────────────────────────────────────────
  const host = document.createElement('div');
  host.id = '__bdd_recorder_host';
  host.style.cssText = 'position:fixed;z-index:2147483647;top:12px;right:12px;';
  const shadow = host.attachShadow({ mode: 'closed' });

  shadow.innerHTML = [
    '<style>',
    ':host{all:initial}',
    '.bar{font:13px system-ui,-apple-system,Segoe UI,sans-serif;background:#111827;color:#f9fafb;',
    'border-radius:10px;padding:8px;box-shadow:0 8px 24px rgba(0,0,0,.35);display:flex;',
    'flex-direction:column;gap:8px;min-width:230px}',
    '.row{display:flex;gap:6px}',
    'button{font:600 12px system-ui,sans-serif;border:0;border-radius:6px;padding:7px 10px;',
    'cursor:pointer;flex:1;background:#374151;color:#f9fafb}',
    'button:hover{background:#4b5563}',
    'button.primary{background:#2563eb}button.primary:hover{background:#1d4ed8}',
    'button.active{background:#b45309}',
    'button.stop{background:#991b1b}button.stop:hover{background:#7f1d1d}',
    '.count{font:11px system-ui,sans-serif;color:#9ca3af;text-align:center}',
    '.hint{font:11px system-ui,sans-serif;color:#fbbf24;text-align:center;display:none}',
    '.hint.on{display:block}',
    '</style>',
    '<div class="bar">',
    '  <div class="row"><button id="intent" class="primary">Fine intento</button></div>',
    '  <div class="row">',
    '    <button id="assert">Verifica</button>',
    '    <button id="note">Nota</button>',
    '  </div>',
    '  <div class="row"><button id="stop" class="stop">Fine registrazione</button></div>',
    '  <div class="count" id="count">0 azioni · 0 intenti</div>',
    '  <div class="hint" id="hint">Clicca l\'elemento da verificare</div>',
    '</div>',
  ].join('');

  const $ = (id) => shadow.getElementById(id);

  function refresh() {
    $('count').textContent = state.actions + ' azioni · ' + state.intents + ' intenti';
    $('assert').classList.toggle('active', state.picking);
    $('hint').classList.toggle('on', state.picking);
  }

  $('intent').addEventListener('click', () => {
    const label = prompt('Cosa ha appena fatto l\'utente?\n(una frase, es. "effettua il login")');
    if (label === null) return;
    state.intents++;
    emit({ type: 'intent', label: label.trim(), at: Date.now() });
    refresh();
  });

  $('assert').addEventListener('click', () => {
    state.picking = !state.picking;
    refresh();
  });

  $('note').addEventListener('click', () => {
    const text = prompt('Nota per chi leggera\' lo scenario:');
    if (text === null || !text.trim()) return;
    emit({ type: 'note', text: text.trim(), at: Date.now() });
  });

  $('stop').addEventListener('click', () => {
    emit({ type: 'stop', at: Date.now() });
  });

  function mount() {
    if (!document.body) return;
    if (!document.getElementById('__bdd_recorder_host')) document.body.appendChild(host);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
  // Le SPA riscrivono il body: senza questo la barra sparisce a meta' sessione.
  new MutationObserver(mount).observe(document.documentElement, { childList: true, subtree: false });

  // ── Cattura ──────────────────────────────────────────────────────────────

  function target(ev) {
    const path = ev.composedPath ? ev.composedPath() : [ev.target];
    for (const node of path) {
      if (node === host) return null;              // click sulla nostra barra
      if (node && node.nodeType === 1) {
        const el = window.__bddProbe.closestInteractive(node);
        if (el) return el;
      }
    }
    return null;
  }

  document.addEventListener('click', (ev) => {
    const el = target(ev);
    if (!el) return;
    const d = window.__bddProbe.describe(el);
    if (!d) return;

    if (state.picking) {
      // In modalita' verifica il click NON e' un'azione: sceglie cosa asserire.
      ev.preventDefault();
      ev.stopPropagation();
      state.picking = false;
      emit({ type: 'assert', role: d.role, name: d.name, text: (el.textContent || '').trim().slice(0, 120), at: Date.now() });
      refresh();
      return;
    }

    state.actions++;
    emit({ type: 'action', action: 'click', role: d.role, name: d.name, at: Date.now() });
    refresh();
  }, true);

  // change invece di input: interessa il valore finale, non ogni tasto.
  document.addEventListener('change', (ev) => {
    const el = target(ev);
    if (!el || state.picking) return;
    const d = window.__bddProbe.describe(el);
    if (!d) return;

    const tag = el.tagName;
    let value = '';
    if (tag === 'SELECT') {
      value = el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '';
    } else if (el.type === 'checkbox' || el.type === 'radio') {
      value = el.checked ? 'checked' : 'unchecked';
    } else {
      value = el.value || '';
    }

    // Mai registrare il contenuto di un campo password: finirebbe in un file
    // che poi qualcuno condivide.
    const secret = el.type === 'password';
    state.actions++;
    emit({
      type: 'action',
      action: el.type === 'checkbox' || el.type === 'radio' ? 'set' : 'fill',
      role: d.role, name: d.name,
      value: secret ? '<password>' : String(value).slice(0, 200),
      secret: secret,
      at: Date.now(),
    });
    refresh();
  }, true);

  window.__bddRecorder = true;
  emit({ type: 'ready', url: location.href, at: Date.now() });
})();
`;
