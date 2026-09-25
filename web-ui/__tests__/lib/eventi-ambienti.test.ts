import { describe, expect, it, vi } from 'vitest';
import { notificaAmbientiCambiati, suAmbientiCambiati } from '@/lib/eventi-ambienti';

// F3: il difetto era che nessuno avvisava la barra laterale quando la
// sezione Ambienti cambiava l'elenco. Questo verifica il meccanismo che lo
// risolve: chi si iscrive viene richiamato a ogni notifica, e puo' smettere.
describe('eventi-ambienti', () => {
  it('richiama ogni ascoltatore iscritto quando l\'elenco cambia', () => {
    const primo = vi.fn();
    const secondo = vi.fn();
    const via1 = suAmbientiCambiati(primo);
    const via2 = suAmbientiCambiati(secondo);

    notificaAmbientiCambiati();

    expect(primo).toHaveBeenCalledTimes(1);
    expect(secondo).toHaveBeenCalledTimes(1);
    via1();
    via2();
  });

  it('non richiama piu\' un ascoltatore dopo la disiscrizione', () => {
    const ascoltatore = vi.fn();
    const disiscriviti = suAmbientiCambiati(ascoltatore);

    disiscriviti();
    notificaAmbientiCambiati();

    expect(ascoltatore).not.toHaveBeenCalled();
  });

  it('senza nessun iscritto, notificare non lancia errori', () => {
    expect(() => notificaAmbientiCambiati()).not.toThrow();
  });
});
