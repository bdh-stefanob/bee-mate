export interface CatalogStep {
  expression: string;
  parameters: string[];
  app: string;
  area: string;
  domain: string;
  status: 'implemented' | 'wanted' | 'deprecated';
  page?: string;
  requester?: string;
  sourceRef: string;
  documented: boolean;
}

export interface Catalog {
  totalSteps: number;
  steps: CatalogStep[];
}

export interface FeatureSummary {
  file: string;
  name: string;
  area: string;
  scenarioCount: number;
}
