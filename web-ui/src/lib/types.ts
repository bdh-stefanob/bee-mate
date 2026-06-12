export interface ParamEnumDef {
  token: string;      // e.g. "{string}"
  label?: string;     // display label for the field
  values: string[];   // known valid values; empty = free-text only
}

export interface CatalogStep {
  expression: string;
  parameters: string[];
  app: string;
  area: string;
  domain: string;
  status: 'implemented' | 'wanted' | 'deprecated';
  keyword?: 'Given' | 'When' | 'Then';
  page?: string;
  requester?: string;
  sourceRef: string;
  documented: boolean;
  paramEnums?: ParamEnumDef[];  // enriched at API time from step-enums.json
  requires?: string[];          // prerequisite step expressions
  doc?: { intent?: string; [key: string]: unknown }; // JSDoc annotations (@intent etc.)
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
  app?: string;   // first directory segment under src/features/
  flow?: string;  // second directory segment under src/features/
  tags?: string[]; // #hashtags extracted from Gherkin comments (# #tag1 #tag2)
}
