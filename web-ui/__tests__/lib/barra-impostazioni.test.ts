import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import en from '../../messages/en.json';
import it_ from '../../messages/it.json';

/**
 * Audit del 4/10, §5 (job S4, con F17 e la parte "titolo" di F9).
 *
 * Difetti che questi casi fermano:
 * - lingua e tema usavano il blu pieno del pulsante principale (`--blu-fondo` con
 *   testo bianco): tre elementi blu fissi nella barra competevano con l'azione
 *   della pagina;
 * - "System" usciva troncato ("Syst…") e "No environment configured" idem (F17);
 * - le impostazioni stavano appiccicate alla navigazione, tre blocchi con tre bordi;
 * - il titolo della scheda era in italiano anche con l'interfaccia in inglese.
 */
const SRC = path.resolve(__dirname, '..', '..', 'src');
const leggi = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf-8');

const SELETTORI = [
  'components/cruscotto/SelettoreLingua.tsx',
  'components/cruscotto/SelettoreTema.tsx',
  'components/cruscotto/SelettoreAmbiente.tsx',
];

describe('barra laterale: impostazioni raggruppate e leggere', () => {
  it("nessun selettore usa il blu pieno ne' il testo bianco fisso", () => {
    for (const f of SELETTORI) {
      const testo = leggi(f);
      expect(testo, f).not.toMatch(/--blu-fondo/);
      expect(testo, f).not.toMatch(/#fff\b/i);
    }
  });

  it('lo stato selezionato non si affida al solo colore: ha peso del testo', () => {
    for (const f of ['components/cruscotto/SelettoreLingua.tsx', 'components/cruscotto/SelettoreTema.tsx']) {
      expect(leggi(f), f).toMatch(/font-semibold/);
    }
  });

  it('le etichette del tema non si troncano', () => {
    expect(leggi('components/cruscotto/SelettoreTema.tsx')).not.toMatch(/\btruncate\b/);
  });

  it('la barra ha un solo gruppo "Impostazioni", spinto in fondo e separato dalla navigazione', () => {
    const barra = leggi('components/cruscotto/BarraLaterale.tsx');
    expect(barra).toMatch(/settingsLabel/);
    expect(barra).toMatch(/mt-auto/);
    expect(barra).toMatch(/role="group"/);
    // I tre selettori sono dentro lo stesso gruppo: un solo bordo, non uno per selettore.
    expect((barra.match(/border-t/g) ?? []).length).toBe(1);
  });

  it('la barra sta ferma all\'altezza della finestra: in una pagina lunga le impostazioni non finiscono fuori schermo', () => {
    const barra = leggi('components/cruscotto/BarraLaterale.tsx');
    expect(barra).toMatch(/min-\[900px\]:sticky/);
    expect(barra).toMatch(/min-\[900px\]:h-screen/);
    expect(barra).toMatch(/min-\[900px\]:overflow-y-auto/);
  });

  it("il gruppo ha un'etichetta in italiano e in inglese", () => {
    expect(en.Cruscotto.settingsLabel).toBeTruthy();
    expect(it_.Cruscotto.settingsLabel).toBeTruthy();
    expect(en.Cruscotto.settingsLabel).not.toBe(it_.Cruscotto.settingsLabel);
  });

  it("l'etichetta dell'ambiente vuoto sta in una riga di 240 px (F17)", () => {
    // Barra 240 px, meno i margini e l'icona restano ~150 px a 14 px: circa 18 caratteri.
    expect(en.Cruscotto.environmentNone.length).toBeLessThanOrEqual(18);
    expect(it_.Cruscotto.environmentNone.length).toBeLessThanOrEqual(18);
  });
});

describe("titolo della scheda nella lingua dell'interfaccia", () => {
  it('le due lingue hanno un titolo, e sono diversi', () => {
    expect(en.Cruscotto.titoloScheda).toBeTruthy();
    expect(it_.Cruscotto.titoloScheda).toBeTruthy();
    expect(en.Cruscotto.titoloScheda).not.toBe(it_.Cruscotto.titoloScheda);
  });

  it("il layout radice lo traduce e non ha piu' il titolo scritto in italiano", () => {
    const layout = leggi('app/layout.tsx');
    expect(layout).toMatch(/generateMetadata/);
    expect(layout).toMatch(/titoloScheda/);
    expect(layout).not.toMatch(/Cruscotto del tester/);
  });
});
