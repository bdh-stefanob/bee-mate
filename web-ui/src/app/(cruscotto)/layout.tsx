import { cookies } from 'next/headers';
import { BarraLaterale } from '@/components/cruscotto/BarraLaterale';
import { ContenitorePagina } from '@/components/cruscotto/ContenitorePagina';
import { PuliziaResiduiPortale } from '@/components/cruscotto/PuliziaResiduiPortale';
import { ProviderAmbiente } from '@/context/AmbienteContext';
import { ProviderModifiche } from '@/context/ModificheContext';
import { NOME_COOKIE_AMBIENTE, ambienteValido } from '@/lib/ambiente-corrente';

/**
 * Layout del cruscotto: legge l'ambiente scelto dal cookie (stesso schema
 * della lingua in `src/i18n/request.ts`) e lo passa a `ProviderAmbiente`,
 * cosi' Registra ed Esecuzione — e chiunque in futuro — condividono la
 * stessa scelta invece di chiederla ciascuno per conto proprio.
 */
export default async function CruscottoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const barattoloCookie = await cookies();
  const valoreCookie = barattoloCookie.get(NOME_COOKIE_AMBIENTE)?.value;
  const ambienteIniziale = ambienteValido(valoreCookie) ? valoreCookie : '';

  return (
    <ProviderAmbiente ambienteIniziale={ambienteIniziale}>
      {/* "Ci sono modifiche non salvate": la barra laterale lo chiede prima di navigare. */}
      <ProviderModifiche>
        <PuliziaResiduiPortale />
        <div className="flex flex-col min-[900px]:flex-row min-h-screen">
          <BarraLaterale />
          <main className="flex-1 min-w-0 p-6">
            <ContenitorePagina>{children}</ContenitorePagina>
          </main>
        </div>
      </ProviderModifiche>
    </ProviderAmbiente>
  );
}
