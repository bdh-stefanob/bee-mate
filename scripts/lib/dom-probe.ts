/**
 * lib/dom-probe.ts
 * ----------------
 * Il codice che, dentro la pagina, descrive un elemento come `role` + `name`.
 *
 * PERCHE' STA IN UN POSTO SOLO
 * Lo usano due strumenti: lo **scout**, che inventaria i componenti di una
 * pagina, e il **recorder**, che traccia cosa tocca il tester mentre esegue il
 * test a mano. Se i due descrivessero lo stesso pulsante in modo anche
 * leggermente diverso, la traccia non si aggancerebbe piu' al dizionario — e
 * l'aggancio deterministico fra "cosa ha toccato il tester" e "quale componente
 * e' quello" e' il pezzo su cui poggia tutto il metodo. Duplicare questa logica
 * significherebbe rompere in silenzio la cosa piu' importante.
 *
 * E' esportato come SORGENTE, non come funzione: va iniettato nella pagina, dove
 * non esiste nulla del contesto Node.
 */

/**
 * Definisce `window.__bddProbe` con:
 *   describe(el)  -> { role, name } | null   descrizione stabile dell'elemento
 *   isVisible(el) -> boolean                 visibile per un utente reale
 *   closestInteractive(el) -> Element|null   risale al controllo vero
 *
 * `closestInteractive` serve al recorder: il click arriva spesso sull'icona o
 * sullo `<span>` dentro il pulsante, non sul pulsante. Senza risalire si
 * registrerebbe un elemento che nessun locator sapra' mai ritrovare.
 */
export const DOM_PROBE_SOURCE = String.raw`
(() => {
  if (window.__bddProbe) return;

  const IMPLICIT_ROLE = {
    a: 'link', button: 'button', select: 'combobox', textarea: 'textbox',
  };
  const INPUT_ROLE = {
    checkbox: 'checkbox', radio: 'radio', submit: 'button', button: 'button',
    search: 'searchbox', email: 'textbox', password: 'textbox', tel: 'textbox',
    text: 'textbox', number: 'spinbutton', url: 'textbox', date: 'textbox',
  };
  const KEEP = new Set([
    'button', 'link', 'textbox', 'combobox', 'checkbox', 'radio',
    'tab', 'menuitem', 'searchbox', 'spinbutton', 'switch', 'option',
  ]);

  function roleOf(el) {
    const explicit = el.getAttribute && el.getAttribute('role');
    if (explicit) return explicit;
    const tag = el.tagName ? el.tagName.toLowerCase() : '';
    if (tag === 'input') return INPUT_ROLE[el.type] || 'textbox';
    return IMPLICIT_ROLE[tag] || '';
  }

  function labelText(el) {
    const id = el.getAttribute && el.getAttribute('id');
    if (id) {
      try {
        const l = document.querySelector('label[for="' + CSS.escape(id) + '"]');
        if (l) return (l.textContent || '').trim().replace(/\s+/g, ' ');
      } catch (e) { /* selettore non valido: si prosegue */ }
    }
    const wrapper = el.closest && el.closest('label');
    return wrapper ? (wrapper.textContent || '').trim().replace(/\s+/g, ' ') : '';
  }

  function accessibleName(el) {
    const labelledBy = el.getAttribute && el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const target = document.getElementById(labelledBy);
      if (target) return (target.textContent || '').trim().replace(/\s+/g, ' ');
    }
    const candidates = [
      el.getAttribute && el.getAttribute('aria-label'),
      el.placeholder,
      el.textContent && el.textContent.trim().replace(/\s+/g, ' '),
      el.getAttribute && el.getAttribute('title'),
      labelText(el),
      // Il value conta per i pulsanti <input type="submit" value="Invia">,
      // non per i campi di testo, dove sarebbe il dato digitato.
      (el.tagName === 'INPUT' && /^(submit|button|reset)$/.test(el.type)) ? el.value : '',
    ];
    for (const c of candidates) {
      if (c && String(c).trim()) return String(c).trim();
    }
    return '';
  }

  function isVisible(el) {
    if (!el || !el.closest) return false;
    if (el.closest('[aria-hidden="true"]')) return false;
    // I checkbox e i radio "custom" nascondono l'input vero e disegnano la label:
    // un input di dimensione zero conta se il suo contenitore e' visibile.
    const isFormControl = ['INPUT', 'SELECT', 'TEXTAREA'].indexOf(el.tagName) >= 0;
    const box = isFormControl ? (el.parentElement || el) : el;
    if (box.offsetWidth === 0 && box.offsetHeight === 0) return false;
    const s = window.getComputedStyle(box);
    return !(s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0');
  }

  /**
   * Dal nodo che ha ricevuto l'evento risale al controllo vero.
   * Un click su un pulsante arriva quasi sempre sull'icona o sullo span interno.
   */
  function closestInteractive(el) {
    let node = el;
    for (let depth = 0; node && depth < 8; depth++) {
      if (node.nodeType === 1 && KEEP.has(roleOf(node))) return node;
      node = node.parentElement;
    }
    return null;
  }

  function describe(el) {
    if (!el || el.nodeType !== 1) return null;
    const role = roleOf(el);
    if (!KEEP.has(role)) return null;
    const name = accessibleName(el);
    if (name.length >= 120) return { role: role, name: name.slice(0, 120), truncated: true };
    return { role: role, name: name };
  }

  window.__bddProbe = {
    describe: describe,
    isVisible: isVisible,
    closestInteractive: closestInteractive,
    roles: Array.from(KEEP),
  };
})();
`;
