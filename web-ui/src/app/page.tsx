import StepCatalog from '@/components/StepCatalog';

export default function Home() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Step Catalog</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ricerca e filtra gli step BDD disponibili. Doppio click per aprirli nell&apos;editor.
        </p>
      </div>
      <StepCatalog />
    </div>
  );
}
