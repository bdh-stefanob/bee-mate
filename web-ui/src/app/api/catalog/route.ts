import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';
import type { CatalogStep, ParamEnumDef } from '@/lib/types';

interface StepEnumsFile {
  version: number;
  enums: { expression: string; paramEnums: ParamEnumDef[] }[];
  dependencies: { expression: string; requires: string[] }[];
}

export async function GET() {
  try {
    const catalogPath = path.join(REPO_ROOT, 'step-catalog.json');
    const data = JSON.parse(fs.readFileSync(catalogPath, 'utf-8')) as { steps: CatalogStep[] };

    const enumsPath = path.join(REPO_ROOT, 'step-enums.json');
    if (fs.existsSync(enumsPath)) {
      const enums: StepEnumsFile = JSON.parse(fs.readFileSync(enumsPath, 'utf-8'));
      const enumMap = new Map(enums.enums.map(e => [e.expression, e.paramEnums]));
      const depsMap = new Map(enums.dependencies.map(d => [d.expression, d.requires]));

      data.steps = data.steps.map(step => ({
        ...step,
        paramEnums: enumMap.get(step.expression) ?? [],
        requires:   depsMap.get(step.expression) ?? [],
      }));
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
