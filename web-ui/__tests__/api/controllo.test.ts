import { describe, it, expect } from 'vitest';
import { interpreta } from '@/lib/controllo';

describe('controllo della macchina', () => {
  it('una voce che manca porta con se\' il rimedio', () => {
    const r = interpreta({
      voci: [
        {
          chiaveNome: 'diagnosi.browser.nome',
          esito: 'manca',
          chiaveDettaglio: 'diagnosi.browser.assente',
          rimedio: 'installa-browser',
        },
      ],
    });
    expect(r.pronto).toBe(false);
    expect(r.voci[0].rimedio).toBeDefined();
  });

  it('tutto a posto significa pronto', () => {
    const r = interpreta({
      voci: [{ chiaveNome: 'diagnosi.browser.nome', esito: 'ok', chiaveDettaglio: 'diagnosi.browser.scaricato' }],
    });
    expect(r.pronto).toBe(true);
  });
});

describe('il rimedio arriva sempre fino alla riga', () => {
  it("una voce senza corrispondenza chiusa tiene comunque il comando da copiare", () => {
    // Il difetto che questo caso ferma: il JSON portava solo il nome chiuso,
    // quindi le voci senza corrispondenza (Ambienti, Catalogo) restavano rosse
    // e mute — nessun pulsante, nessun testo, nessuna strada.
    const r = interpreta({
      voci: [
        {
          chiaveNome: 'diagnosi.ambienti.nome',
          esito: 'manca',
          chiaveDettaglio: 'diagnosi.ambienti.nessuno',
          rimedio: 'cp bdd-targets.example.json bdd-targets.json',
        },
      ],
    });
    expect(r.voci[0].rimedio).toEqual({
      comando: 'cp bdd-targets.example.json bdd-targets.json',
      chiuso: undefined,
    });
  });

  it('una voce con corrispondenza chiusa porta tutti e due', () => {
    const r = interpreta({
      voci: [
        {
          chiaveNome: 'diagnosi.browser.nome',
          esito: 'manca',
          chiaveDettaglio: 'diagnosi.browser.assente',
          rimedio: 'npx playwright install chromium',
          rimedioChiuso: 'installa-browser',
        },
      ],
    });
    expect(r.voci[0].rimedio).toEqual({
      comando: 'npx playwright install chromium',
      chiuso: 'installa-browser',
    });
  });
});

describe('i dati numerici della diagnosi arrivano fino alla voce', () => {
  it('una voce con dati porta con se\' i valori da interpolare nel testo tradotto', () => {
    const r = interpreta({
      voci: [
        {
          chiaveNome: 'diagnosi.ambienti.nome',
          esito: 'attenzione',
          chiaveDettaglio: 'diagnosi.ambienti.parziali',
          dati: { pronti: 1, totale: 3 },
        },
      ],
    });
    expect(r.voci[0].dati).toEqual({ pronti: 1, totale: 3 });
  });
});

describe('le voci avanzate non decidono se la macchina e\' pronta', () => {
  // Il difetto che questo caso ferma: "Assistente da riga di comando" e
  // "Agenti e automatismi" riguardano chi ha costruito la catena, non chi la
  // usa per testare a mano. Su una macchina altrimenti a posto, la schermata
  // diceva per sempre "manca qualcosa" solo perche' mancava un assistente che
  // un tester non ha mai chiesto ne' vuole.
  it('una voce avanzata che manca non rompe "pronto"', () => {
    const r = interpreta({
      voci: [
        { chiaveNome: 'diagnosi.browser.nome', esito: 'ok', chiaveDettaglio: 'diagnosi.browser.scaricato' },
        {
          chiaveNome: 'diagnosi.agenti.nome',
          esito: 'manca',
          chiaveDettaglio: 'diagnosi.agenti.assenti',
          rimedio: 'npm run rules:sync',
          avanzata: true,
        },
      ],
    });
    expect(r.pronto).toBe(true);
  });

  it('una voce essenziale che manca continua a bloccare "pronto", anche con voci avanzate a posto', () => {
    const r = interpreta({
      voci: [
        { chiaveNome: 'diagnosi.browser.nome', esito: 'manca', chiaveDettaglio: 'diagnosi.browser.assente' },
        {
          chiaveNome: 'diagnosi.assistente.nome',
          esito: 'ok',
          chiaveDettaglio: 'diagnosi.assistente.trovato',
          avanzata: true,
        },
      ],
    });
    expect(r.pronto).toBe(false);
  });

  it('il segnale "avanzata" arriva fino alla voce, per la sezione a parte nella finestra', () => {
    const r = interpreta({
      voci: [
        {
          chiaveNome: 'diagnosi.agenti.nome',
          esito: 'ok',
          chiaveDettaglio: 'diagnosi.agenti.trovati',
          dati: { agenti: 2, hook: 0 },
          avanzata: true,
        },
      ],
    });
    expect(r.voci[0].avanzata).toBe(true);
  });
});
