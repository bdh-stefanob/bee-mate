import { GherkinEditor } from '@/components/GherkinEditor';

interface EditorPageProps {
  searchParams: Promise<{ step?: string }>;
}

/**
 * EditorPage
 *
 * Pagina /editor dell'App Router.
 * Legge il parametro ?step=... da searchParams (Server Component async in Next.js 15)
 * e lo passa come initialValue al GherkinEditor.
 *
 * Il pre-popolamento avviene quando l'utente fa doppio click su uno step nel Catalog:
 * StepCatalog naviga a /editor?step=Given%20...
 */
export default async function EditorPage({ searchParams }: EditorPageProps) {
  const params = await searchParams;
  const step = params.step ?? '';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Gherkin Editor</h1>
      <GherkinEditor initialValue={step} />
    </div>
  );
}
