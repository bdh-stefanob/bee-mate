import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

/** Le due lingue che la finestra sa parlare: l'inglese e' quella di apertura. */
export const LINGUE = ['en', 'it'] as const;
export type Lingua = (typeof LINGUE)[number];
export const LINGUA_DI_APERTURA: Lingua = 'en';

export const NOME_COOKIE_LINGUA = 'lingua';

function linguaValida(valore: string | undefined): valore is Lingua {
  return LINGUE.includes(valore as Lingua);
}

/**
 * Nessuna lingua nell'indirizzo: il guscio desktop non deve mai vedere un
 * `/en/...` o `/it/...`, sennò si rompono il redirect dalla radice e il
 * portale del catalogo. La scelta viaggia in un cookie, che la finestra
 * Electron conserva da un'apertura all'altra come farebbe un browser.
 */
export default getRequestConfig(async () => {
  const barattoloCookie = await cookies();
  const valore = barattoloCookie.get(NOME_COOKIE_LINGUA)?.value;
  const locale = linguaValida(valore) ? valore : LINGUA_DI_APERTURA;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
