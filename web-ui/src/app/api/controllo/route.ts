import { NextResponse } from 'next/server';
import { execFileSync } from 'child_process';
import { REPO_ROOT } from '@/lib/repo';
import { rigaDiComando } from '@/lib/esecuzione';

export interface VoceDiagnosi {
  nome: string;
  esito: 'ok' | 'manca' | 'attenzione';
  dettaglio: string;
  rimedio?: string;
}

/** Separata dalla rotta perche' e' la parte che si puo' verificare da sola. */
export function interpreta(grezzo: { voci: VoceDiagnosi[] }) {
  const voci = grezzo.voci.map((v) => ({
    ...v,
    rimedio: v.rimedio ? { comando: v.rimedio } : undefined,
  }));
  return { pronto: voci.every((v) => v.esito === 'ok'), voci };
}

export async function GET() {
  const { eseguibile, argomenti } = rigaDiComando('diagnosi');
  try {
    const uscita = execFileSync(eseguibile, argomenti, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 60000,
      shell: process.platform === 'win32',
    });
    return NextResponse.json(interpreta(JSON.parse(uscita)));
  } catch {
    return NextResponse.json(
      { pronto: false, voci: [], errore: 'la diagnosi non e\' riuscita a girare' },
      { status: 500 }
    );
  }
}
