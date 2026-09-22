import { NextResponse } from 'next/server';
import { execFileSync } from 'child_process';
import { REPO_ROOT } from '@/lib/repo';
import { rigaDiComando } from '@/lib/esecuzione';
import { interpreta } from '@/lib/controllo';

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
