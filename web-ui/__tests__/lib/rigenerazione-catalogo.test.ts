import { describe, it, expect, vi } from 'vitest';
import { tentaRigenerazioneCatalogo } from '@/lib/rigenerazione-catalogo';

type Chiamata = { eseguibile: string; argomenti: string[] };

/** Un lanciatore finto: registra ogni lancio e finisce solo quando glielo si dice. */
function lanciatoreFinto() {
  const chiamate: Chiamata[] = [];
  const sblocchi: Array<{ ok: () => void; ko: (e: Error) => void }> = [];
  const lancia = vi.fn((eseguibile: string, argomenti: string[]) => {
    chiamate.push({ eseguibile, argomenti });
    return new Promise<void>((ok, ko) => sblocchi.push({ ok, ko }));
  });
  return { lancia, chiamate, sblocchi };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('tentaRigenerazioneCatalogo', () => {
  it('restituisce una Promise, senza aspettare che i processi finiscano', () => {
    const { lancia } = lanciatoreFinto();
    const esito = tentaRigenerazioneCatalogo(lancia);
    expect(esito).toBeInstanceOf(Promise);
  });

  it('lancia le tre fasi in ordine, una alla volta', async () => {
    const { lancia, chiamate, sblocchi } = lanciatoreFinto();
    const esito = tentaRigenerazioneCatalogo(lancia);

    await tick();
    expect(chiamate).toHaveLength(1);
    expect(chiamate[0].argomenti.join(' ')).toContain('--dry-run');

    sblocchi[0].ok();
    await tick();
    expect(chiamate).toHaveLength(2);
    expect(chiamate[1].argomenti.join(' ')).toContain('extract-steps.ts');
    expect(chiamate[1].argomenti.join(' ')).toContain('cucumber-messages.ndjson');

    sblocchi[1].ok();
    await tick();
    expect(chiamate).toHaveLength(3);
    expect(chiamate[2].argomenti.join(' ')).toContain('render-markdown.ts');

    sblocchi[2].ok();
    expect(await esito).toBe(true);
  });

  it('se una fase fallisce non lancia le successive e restituisce false', async () => {
    const { lancia, chiamate, sblocchi } = lanciatoreFinto();
    const spia = vi.spyOn(console, 'error').mockImplementation(() => {});
    const esito = tentaRigenerazioneCatalogo(lancia);

    await tick();
    sblocchi[0].ko(new Error('cucumber rotto'));

    expect(await esito).toBe(false);
    expect(chiamate).toHaveLength(1);
    spia.mockRestore();
  });
});
