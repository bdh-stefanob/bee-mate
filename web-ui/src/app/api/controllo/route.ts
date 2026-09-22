import { NextResponse } from 'next/server';
import { execFileSync } from 'child_process';
import { REPO_ROOT } from '@/lib/repo';
import { rigaDiComando } from '@/lib/esecuzione';
import { interpreta } from '@/lib/controllo';
import { ambienteFiglio } from '@/lib/ambiente-figlio';

export async function GET() {
  const { eseguibile, argomenti } = rigaDiComando('diagnosi');
  try {
    // Niente `shell`, per lo stesso motivo per cui e' stata tolta altrove — e
    // qui era peggio: l'eseguibile ora e' un percorso con uno spazio dentro
    // ("C:\Program Files\..."), e una shell lo spezza sul primo spazio. La
    // prima schermata del cruscotto rispondeva 500 sempre, con un pulsante
    // "Riprova" che non poteva riuscire.
    const uscita = execFileSync(eseguibile, argomenti, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 60000,
      env: ambienteFiglio(),
    });
    return NextResponse.json(interpreta(JSON.parse(uscita)));
  } catch (errore) {
    // L'errore vero va detto da qualche parte: senza, un guasto come quello
    // della shell resta muto anche nei log, e si cerca al buio.
    console.error('diagnosi non riuscita:', errore);
    return NextResponse.json(
      { pronto: false, voci: [], errore: 'la diagnosi non e\' riuscita a girare' },
      { status: 500 }
    );
  }
}
