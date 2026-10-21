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
 * TRE COSE IMPARATE PROVANDOLO SU UN UTENTE VERO
 *   - Niente prompt() del browser: Playwright chiude i dialoghi da solo, quindi
 *     il campo non compariva mai. L'input sta dentro la barra.
 *   - I click sulla barra stessa finivano registrati come azioni dell'utente: il
 *     controllo va fatto PRIMA di riconoscere l'elemento, perche' i pulsanti
 *     dentro lo shadow DOM sono a tutti gli effetti dei <button>.
 *   - La barra copre il contenuto: si trascina, e la posizione sopravvive alle
 *     navigazioni.
 */

/**
 * Richiede che `DOM_PROBE_SOURCE` sia gia' stato iniettato, e che esista la
 * binding `window.__bddEmit(evento)` esposta dal lato Node.
 */
export const RECORDER_OVERLAY_SOURCE = String.raw`
(() => {
  if (window.__bddRecorder) return;
  if (!window.__bddProbe) return;

  const state = { picking: false, actions: 0, intents: 0, assertions: 0, mode: null, elenco: [] };

  /**
   * Manda l'evento a Node e aggiorna i contatori con quello che Node risponde.
   *
   * I totali NON si contano qui: l'overlay viene reiniettato a ogni navigazione,
   * quindi un contatore locale ripartirebbe da zero appena si cambia pagina — e
   * il tester vedrebbe "0 azioni" dopo aver appena fatto il login, concludendo
   * che non sta registrando niente. Il solo posto che conosce il totale vero e'
   * il lato Node, che accumula per tutta la sessione.
   */
  function emit(event) {
    try {
      const answer = window.__bddEmit(JSON.stringify(event));
      if (answer && typeof answer.then === 'function') {
        answer.then(function (counts) {
          if (!counts) return;
          state.actions = counts.actions;
          state.intents = counts.intents;
          state.assertions = counts.assertions;
          state.elenco = counts.elenco || [];
          if (counts.annullato !== undefined) avvisaAnnullato(counts.annullato);
          refresh();
        }).catch(function () { /* pagina in navigazione */ });
      }
    } catch (e) { /* pagina in chiusura */ }
  }

  // ── Barra ────────────────────────────────────────────────────────────────
  const host = document.createElement('div');
  host.id = '__bdd_recorder_host';

  // La posizione sopravvive alle navigazioni: l'overlay viene ricreato a ogni
  // pagina, e ritrovarselo ogni volta al punto di partenza sarebbe fastidioso
  // quanto non poterlo spostare affatto.
  let pos = { top: 12, left: null, right: 12 };
  try {
    const saved = sessionStorage.getItem('__bdd_bar_pos');
    if (saved) pos = JSON.parse(saved);
  } catch (e) { /* storage non disponibile: si usa la posizione di default */ }

  function applyPos() {
    host.style.cssText =
      'position:fixed;z-index:2147483647;top:' + pos.top + 'px;' +
      (pos.left === null ? 'right:' + pos.right + 'px;' : 'left:' + pos.left + 'px;');
  }
  applyPos();

  // 'open' e non 'closed': lo shadow DOM serve a isolare gli stili, non a
  // nascondere la barra. Chiuso non sarebbe ispezionabile ne' da un controllo
  // automatico ne' da chi deve capire perche' non si aggiorna.
  const shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = [
    '<style>',
    ':host{all:initial}',
    '.bar{font:13px system-ui,-apple-system,Segoe UI,sans-serif;background:#111827;color:#f9fafb;',
    'border-radius:10px;padding:8px;box-shadow:0 8px 24px rgba(0,0,0,.35);display:flex;',
    'flex-direction:column;gap:6px;min-width:240px;opacity:.97}',
    '.grip{cursor:move;text-align:center;color:#6b7280;font:11px system-ui,sans-serif;',
    'user-select:none;letter-spacing:3px;line-height:1}',
    '.row{display:flex;gap:6px}',
    'button{font:600 12px system-ui,sans-serif;border:0;border-radius:6px;padding:7px 10px;',
    'cursor:pointer;flex:1;background:#374151;color:#f9fafb}',
    'button:hover{background:#4b5563}',
    'button.primary{background:#2563eb}button.primary:hover{background:#1d4ed8}',
    'button.active{background:#b45309}',
    'button.stop{background:#991b1b}button.stop:hover{background:#7f1d1d}',
    '.count{font:11px system-ui,sans-serif;color:#9ca3af;text-align:center}',
    '.hint{font:11px system-ui,sans-serif;color:#fbbf24;text-align:center;display:none;max-width:230px;line-height:1.4}',
    '.hint.on{display:block}',
    '.ask{display:none;flex-direction:column;gap:6px}',
    '.ask.on{display:flex}',
    '.ask label{font:11px system-ui,sans-serif;color:#d1d5db}',
    'input{font:13px system-ui,sans-serif;border:1px solid #4b5563;border-radius:6px;',
    'padding:7px 9px;background:#1f2937;color:#f9fafb;width:100%;box-sizing:border-box}',
    'input:focus{outline:2px solid #2563eb;border-color:#2563eb}',
    '.min{background:transparent;color:#6b7280;flex:0 0 auto;padding:2px 6px;font-size:14px}',
    '.bar.collapsed .body{display:none}',
    '.list{list-style:none;margin:0;padding:0;max-height:220px;overflow:auto;max-width:300px;',
    'display:none;flex-direction:column;gap:3px;border-top:1px solid #374151;padding-top:6px}',
    '.list.on{display:flex}',
    '.list li{font:12px system-ui,sans-serif;line-height:1.35;color:#e5e7eb;overflow-wrap:anywhere}',
    '.list li.verifica,.list li.nota{padding-left:16px;color:#a7f3d0}',
    '.list li.nota{color:#d1d5db;font-style:italic}',
    '.list li.in-corso{color:#fbbf24}',
    '.list .n{color:#9ca3af}',
    '.esito{font:11px system-ui,sans-serif;color:#a7f3d0;text-align:center;display:none;max-width:260px;line-height:1.4}',
    '.esito.on{display:block}',
    '</style>',
    '<div class="bar" id="bar">',
    '  <div class="grip" id="grip">= = =</div>',
    '  <div class="body" id="body">',
    '    <div class="ask" id="ask">',
    '      <label id="asklabel"></label>',
    '      <input id="askinput" type="text" autocomplete="off">',
    '      <div class="row">',
    '        <button id="askok" class="primary">Conferma</button>',
    '        <button id="askcancel">Annulla</button>',
    '      </div>',
    '    </div>',
    '    <div class="row" id="mainrow"><button id="intent" class="primary">Fine intento</button></div>',
    '    <div class="row" id="mainrow2">',
    '      <button id="assert">Verifica</button>',
    '      <button id="note">Nota</button>',
    '    </div>',
    '    <div class="row"><button id="stop" class="stop">Fine registrazione</button></div>',
    '    <div class="count" id="count">0 azioni · 0 intenti · 0 verifiche</div>',
    '    <div class="row">',
    '      <button id="mostra">Mostra elenco</button>',
    '      <button id="annulla">Annulla ultimo</button>',
    '    </div>',
    '    <div class="esito" id="esito" role="status"></div>',
    '    <ol class="list" id="list"></ol>',
    '    <div class="hint" id="hint">Clicca cio che dimostra che e andata bene: un titolo, un messaggio, un totale</div>',
    '  </div>',
    '</div>',
  ].join('');

  const $ = (id) => shadow.getElementById(id);

  const SUGGERIMENTO = 'Clicca cio che dimostra che e andata bene: un titolo, un messaggio, un totale';
  const NIENTE_QUI = 'Qui non c e un testo da verificare. Prova sull etichetta, sul titolo o sul valore accanto';

  /**
   * Il suggerimento nella barra e' anche l'unico canale per dire perche' un
   * click non ha prodotto niente. Senza, la modalita' resta accesa in silenzio e
   * sembra che lo strumento sia rotto: e' il primo difetto segnalato da chi
   * l'ha usato davvero.
   */
  function suggerisci(testo) {
    const h = $('hint');
    if (h) h.textContent = testo;
  }

  /**
   * Cosa e' stato registrato finora, in ordine. Costruito con textContent: le
   * frasi e i testi verificati vengono dalla pagina e dal tester, e non devono
   * mai diventare HTML.
   */
  function disegnaElenco() {
    const list = $('list');
    list.textContent = '';
    let n = 0;
    for (const v of state.elenco) {
      const li = document.createElement('li');
      li.className = v.tipo;
      if (v.tipo === 'passo') {
        n++;
        li.textContent = '✓ ' + n + '. ' + v.testo + ' ';
        const s = document.createElement('span');
        s.className = 'n';
        s.textContent = '(' + v.azioni + (v.azioni === 1 ? ' azione)' : ' azioni)');
        li.appendChild(s);
      } else if (v.tipo === 'verifica') {
        li.textContent = '☑ verifica: «' + v.testo + '»';
      } else if (v.tipo === 'nota') {
        li.textContent = 'nota: ' + v.testo;
      } else {
        li.textContent = '… passo in corso (' + v.azioni + (v.azioni === 1 ? ' azione' : ' azioni') + ', non ancora chiuso)';
      }
      list.appendChild(li);
    }
    if (state.elenco.length === 0) {
      const li = document.createElement('li');
      li.className = 'n';
      li.textContent = 'Ancora niente di registrato';
      list.appendChild(li);
    }
    list.scrollTop = list.scrollHeight;
  }

  function avvisaAnnullato(annullato) {
    const e = $('esito');
    e.textContent = !annullato
      ? 'Niente da annullare: ci sono solo azioni'
      : annullato.tipo === 'passo'
        ? 'Riaperto il passo «' + annullato.testo + '»: le sue azioni tornano nel passo in corso'
        : annullato.tipo === 'verifica'
          ? 'Tolta la verifica «' + annullato.testo + '»'
          : 'Tolta la nota «' + annullato.testo + '»';
    e.classList.add('on');
    clearTimeout(avvisaAnnullato.timer);
    avvisaAnnullato.timer = setTimeout(() => e.classList.remove('on'), 5000);
  }

  function refresh() {
    $('count').textContent =
      state.actions + ' azioni · ' + state.intents + ' intenti · ' + state.assertions + ' verifiche';
    disegnaElenco();
    $('assert').classList.toggle('active', state.picking);
    $('hint').classList.toggle('on', state.picking);
  }

  // ── Campo di testo interno ───────────────────────────────────────────────
  // NON prompt(): Playwright chiude da solo i dialoghi del browser, quindi il
  // campo non comparirebbe mai e l'intento andrebbe perso in silenzio.

  function ask(mode, labelText, placeholder) {
    state.mode = mode;
    $('asklabel').textContent = labelText;
    $('askinput').value = '';
    $('askinput').placeholder = placeholder;
    $('ask').classList.add('on');
    $('mainrow').style.display = 'none';
    $('mainrow2').style.display = 'none';
    setTimeout(() => $('askinput').focus(), 0);
  }

  function closeAsk() {
    state.mode = null;
    $('ask').classList.remove('on');
    $('mainrow').style.display = '';
    $('mainrow2').style.display = '';
  }

  function confirmAsk() {
    const text = $('askinput').value.trim();
    const mode = state.mode;
    closeAsk();
    if (!text) return;
    if (mode === 'intent') emit({ type: 'intent', label: text, at: Date.now() });
    if (mode === 'note') emit({ type: 'note', text: text, at: Date.now() });
  }

  $('askok').addEventListener('click', confirmAsk);
  $('askcancel').addEventListener('click', closeAsk);
  $('askinput').addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); confirmAsk(); }
    if (ev.key === 'Escape') { ev.preventDefault(); closeAsk(); }
  });

  $('intent').addEventListener('click', () => {
    ask('intent', 'Cosa ha appena fatto l utente?', 'es. effettua il login');
  });

  $('note').addEventListener('click', () => {
    ask('note', 'Nota per chi leggera lo scenario:', 'es. attendere la mail');
  });

  $('assert').addEventListener('click', () => {
    state.picking = !state.picking;
    suggerisci(SUGGERIMENTO);
    refresh();
  });

  // Aperto o chiuso resta tale cambiando pagina, come la posizione della barra.
  let elencoAperto = false;
  try { elencoAperto = sessionStorage.getItem('__bdd_elenco') === '1'; } catch (e) { /* niente */ }
  function applicaElenco() {
    $('list').classList.toggle('on', elencoAperto);
    $('mostra').textContent = elencoAperto ? 'Nascondi elenco' : 'Mostra elenco';
  }
  applicaElenco();
  $('mostra').addEventListener('click', () => {
    elencoAperto = !elencoAperto;
    try { sessionStorage.setItem('__bdd_elenco', elencoAperto ? '1' : '0'); } catch (e) { /* niente */ }
    applicaElenco();
  });

  $('annulla').addEventListener('click', () => {
    emit({ type: 'annulla', at: Date.now() });
  });

  $('stop').addEventListener('click', () => {
    emit({ type: 'stop', at: Date.now() });
  });

  // ── Trascinamento ────────────────────────────────────────────────────────
  (() => {
    let dragging = false;
    let startX = 0, startY = 0, startTop = 0, startLeft = 0;

    $('grip').addEventListener('mousedown', (ev) => {
      dragging = true;
      startX = ev.clientX;
      startY = ev.clientY;
      const box = host.getBoundingClientRect();
      startTop = box.top;
      startLeft = box.left;
      ev.preventDefault();
    });

    window.addEventListener('mousemove', (ev) => {
      if (!dragging) return;
      pos.top = Math.max(0, startTop + (ev.clientY - startY));
      pos.left = Math.max(0, startLeft + (ev.clientX - startX));
      pos.right = null;
      applyPos();
    }, true);

    window.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      try { sessionStorage.setItem('__bdd_bar_pos', JSON.stringify(pos)); } catch (e) { /* niente */ }
    }, true);
  })();

  function mount() {
    if (!document.body) return;
    if (!document.getElementById('__bdd_recorder_host')) document.body.appendChild(host);
  }

  /**
   * Le SPA riscrivono il body: senza un osservatore la barra sparisce a meta'
   * sessione. Va pero' agganciato SOLO quando esiste un nodo da osservare.
   *
   * Questo script viene iniettato prima che il documento esista, quindi
   * document.documentElement puo' essere null: chiamare observe(null) lancia,
   * e un'eccezione qui interromperebbe tutto il resto dello script — compresa la
   * registrazione dei listener. Il sintomo sarebbe il peggiore possibile: la
   * barra compare (il montaggio e' agganciato a DOMContentLoaded, che sopravvive)
   * ma non registra niente, e il tester non ha modo di accorgersene se non
   * guardando il contatore fermo a zero.
   */
  function watchForRemount() {
    const root = document.documentElement || document.body;
    if (!root) return;
    try {
      new MutationObserver(mount).observe(root, { childList: true, subtree: false });
    } catch (e) { /* documento non ancora pronto */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { mount(); watchForRemount(); });
  } else {
    mount();
    watchForRemount();
  }

  // ── Cattura ──────────────────────────────────────────────────────────────

  /**
   * Vero se l'evento nasce dentro la nostra barra.
   *
   * Va controllato PRIMA di riconoscere l'elemento: i pulsanti della barra sono
   * <button> a tutti gli effetti, quindi cercando il controllo lungo il percorso
   * dell'evento si trova il nostro prima di arrivare all'host — e i click sulla
   * barra finiscono registrati come azioni dell'utente, gonfiando il conteggio
   * con gesti che l'utente non ha mai fatto sull'applicazione.
   */
  function fromBar(ev) {
    const path = ev.composedPath ? ev.composedPath() : [];
    for (const node of path) {
      if (node === host || node === shadow) return true;
    }
    return ev.target === host;
  }

  function target(ev) {
    if (fromBar(ev)) return null;
    const path = ev.composedPath ? ev.composedPath() : [ev.target];
    for (const node of path) {
      if (node && node.nodeType === 1) {
        const el = window.__bddProbe.closestInteractive(node);
        if (el) return el;
      }
    }
    return null;
  }

  /**
   * Ruoli per cui un click E' un'azione da registrare.
   *
   * Cliccare dentro un campo per scriverci non e' un gesto significativo: e'
   * implicito nel fatto che poi lo si compila, e registrarlo riempie la traccia
   * di passi che nessuno vorrebbe mai vedere in uno scenario. Per checkbox,
   * radio e select il click e' gia' coperto da 'change', che porta anche il
   * valore: registrarlo due volte produrrebbe passi doppi.
   */
  const CLICKABLE = ['button', 'link', 'tab', 'menuitem'];

  /** Il click successivo a una scelta gia' fatta va inghiottito, non registrato. */
  let inghiottiClick = false;

  /**
   * Sceglie l'elemento da verificare.
   *
   * SI FA SU 'pointerdown', NON SU 'click', e non e' un dettaglio: molte
   * applicazioni reagiscono gia' al pointerdown — una riga che apre un
   * dettaglio, una scheda che cambia — e quando il click arriva la pagina e'
   * un'altra. Il tester vedeva "il pulsante Verifica non funziona su questo
   * elemento", e invece l'elemento era sparito prima che potessimo guardarlo.
   *
   * Se non c'e' niente da indicare non si resta in silenzio: la barra dice
   * perche', e la modalita' resta accesa per riprovare senza ripremere.
   */
  function scegli(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    inghiottiClick = true;

    const raw = ev.composedPath ? ev.composedPath()[0] : ev.target;
    const d = window.__bddProbe.describeAny(raw);
    if (!d || !d.name) {
      suggerisci(NIENTE_QUI);
      return;
    }

    state.picking = false;
    suggerisci(SUGGERIMENTO);
    refresh();
    emit({ type: 'assert', role: d.role, name: d.name, text: d.name, at: Date.now() });
  }

  document.addEventListener('pointerdown', (ev) => {
    if (fromBar(ev) || !state.picking) return;
    scegli(ev);
  }, true);

  // Uscire dalla modalita' senza dover ricentrare la barra.
  window.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || !state.picking) return;
    state.picking = false;
    suggerisci(SUGGERIMENTO);
    refresh();
  }, true);

  document.addEventListener('click', (ev) => {
    if (fromBar(ev)) return;

    // LA MODALITA' VERIFICA SI GESTISCE PER PRIMA, e non e' un dettaglio di
    // ordine. Prima passava da closestInteractive, che restituisce solo
    // controlli: un titolo o un messaggio di conferma non erano indicabili, il
    // click cadeva nel vuoto e la modalita' restava accesa senza spiegazioni.
    // Cioe' la verifica piu' naturale che esista non si poteva registrare.
    // Il click che segue il pointerdown con cui si e' gia' scelto non e' un
    // gesto del tester: non arriva all'applicazione e non si registra.
    if (inghiottiClick) {
      inghiottiClick = false;
      ev.preventDefault();
      ev.stopPropagation();
      if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      return;
    }

    // Rete per i browser senza pointer events: li' la scelta avviene qui.
    if (state.picking) {
      scegli(ev);
      return;
    }

    const raw = ev.composedPath ? ev.composedPath()[0] : ev.target;
    const contesto = window.__bddProbe.contestoDi(raw);
    const el = target(ev);

    if (el) {
      const d = window.__bddProbe.describe(el);
      if (!d) return;
      if (CLICKABLE.indexOf(d.role) < 0) return;
      emit({
        type: 'action', action: 'click', role: d.role, name: d.name,
        contesto: contesto, at: Date.now(),
      });
      return;
    }

    // NESSUN RUOLO INTERATTIVO LUNGO IL PERCORSO DELL'EVENTO.
    //
    // Prima si usciva qui, in silenzio, e il gesto spariva. Il caso visto sul
    // campo e' il pin di una mappa — un div senza ruolo e senza nome — cioe' il
    // gesto piu' importante del percorso: scegliere dove ritirare l'ordine. Il
    // passo successivo esiste solo grazie a lui, e senza di lui lo scenario
    // generato aspettava un pulsante che non sarebbe mai comparso.
    //
    // Non si inventa un ancoraggio: si registra cio' che c'e' (la classe CSS) e
    // si lascia al generatore il compito di dichiarare che li' serve una ricetta.
    const senzaRuolo = window.__bddProbe.describeSenzaRuolo(raw);
    if (!senzaRuolo) return;
    emit({
      type: 'action', action: 'click', role: '', name: '',
      ancoraggioAssente: senzaRuolo, contesto: contesto, at: Date.now(),
    });
  }, true);

  /** Valori gia' registrati per ciascun campo, per non emettere due volte lo stesso. */
  const lastValue = new WeakMap();

  /**
   * Registra il valore finale di un campo.
   *
   * Agganciata sia a 'change' sia a 'focusout' di proposito. 'change' da solo
   * non basta: scatta quando il campo perde il fuoco, quindi l'ULTIMO campo
   * compilato prima di premere un pulsante della nostra barra non lo emetterebbe
   * mai — e il tester si ritroverebbe uno scenario a cui manca il dato piu'
   * importante, senza nessun segnale. 'focusout' copre quel caso; la WeakMap
   * evita il doppione quando scattano entrambi.
   */
  /**
   * Ruoli che portano un valore. Un <input type="submit"> ha un attributo value
   * valorizzato ("Login"), quindi senza questo filtro premere un pulsante generava
   * un assurdo 'fill' su un pulsante — un passo che non esiste nella realta'.
   */
  const VALUED = ['textbox', 'searchbox', 'spinbutton', 'combobox', 'checkbox', 'radio', 'switch'];

  function captureField(ev, invio) {
    if (fromBar(ev)) return;
    const el = target(ev);
    if (!el || state.picking) return;
    const d = window.__bddProbe.describe(el);
    if (!d) return;
    if (VALUED.indexOf(d.role) < 0) return;

    const tag = el.tagName;
    let value = '';
    if (tag === 'SELECT') {
      value = el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '';
    } else if (el.type === 'checkbox' || el.type === 'radio') {
      value = el.checked ? 'checked' : 'unchecked';
    } else {
      value = el.value || '';
    }

    // Un campo vuoto che resta vuoto non e' un'azione: il tester ci e' solo
    // passato sopra.
    if (value === '' && !lastValue.has(el)) return;
    if (lastValue.get(el) === value) return;
    lastValue.set(el, value);

    // Mai registrare il contenuto di un campo password: finirebbe in un file
    // che poi qualcuno condivide.
    const secret = el.type === 'password';
    emit({
      type: 'action',
      action: el.type === 'checkbox' || el.type === 'radio' ? 'set' : 'fill',
      role: d.role, name: d.name,
      value: secret ? '<password>' : String(value).slice(0, 200),
      secret: secret,
      // Inviato, non solo compilato: in un campo di ricerca e' tutta la
      // differenza fra "ho scritto un postcode" e "sono comparse le farmacie".
      invio: invio ? true : undefined,
      // La domanda a cui si sta rispondendo. Serve quando il nome accessibile
      // del campo non dice niente — un campo numerico che si chiama "0" — ed e'
      // proprio il caso in cui lo scenario, senza, non si lascia leggere.
      contesto: window.__bddProbe.contestoDi(el),
      at: Date.now(),
    });
  }

  document.addEventListener('change', function (ev) { captureField(ev, false); }, true);
  document.addEventListener('focusout', function (ev) { captureField(ev, false); }, true);

  /**
   * Invio in un campo: si registra il valore SUBITO, marcato come inviato.
   *
   * Non si puo' aspettare 'change' o 'focusout': su un campo di ricerca
   * l'applicazione reagisce al keydown, e quando il fuoco se ne va la pagina e'
   * un'altra — oppure il campo e' ancora li' e il valore viene emesso senza che
   * nessuno sappia che era stato inviato. La WeakMap dei valori gia' visti
   * impedisce il doppione quando 'focusout' arriva dopo.
   */
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' || state.picking) return;
    captureField(ev, true);
  }, true);

  window.__bddRecorder = true;
  emit({ type: 'ready', url: location.href, at: Date.now() });
  refresh();
})();
`;
