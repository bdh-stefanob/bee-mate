/**
 * La serratura dei file degli scenari: una modifica che si sta scrivendo e
 * controllando, e un "Salva" della schermata Registra che scrive nelle stesse
 * cartelle, non devono pestarsi. Una persona sola alla tastiera, ma due finestre
 * (o due schede) aperte si possono avere.
 *
 * Su `globalThis`, come lo stato di `registro.ts`: il server di sviluppo di Next
 * carica un modulo una volta per rotta, e due copie con due serrature
 * proteggerebbero da niente.
 */

const globale = globalThis as unknown as { __bddSerraturaScenari?: { presa: boolean } };
const stato = (globale.__bddSerraturaScenari ??= { presa: false });

export class SerraturaOccupata extends Error {
  constructor() {
    super('un\'altra operazione sugli scenari e\' in corso');
  }
}

/** Qualcuno sta scrivendo gli scenari adesso? */
export function serraturaPresa(): boolean {
  return stato.presa;
}

/** Esegue `f` tenendo la serratura; se e' gia' presa lancia `SerraturaOccupata` senza eseguirla. */
export async function conLaSerratura<T>(f: () => Promise<T>): Promise<T> {
  if (stato.presa) throw new SerraturaOccupata();
  stato.presa = true;
  try {
    return await f();
  } finally {
    stato.presa = false;
  }
}
