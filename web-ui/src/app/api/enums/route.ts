import * as fs from 'fs';
import * as path from 'path';
import { NextResponse } from 'next/server';
import { REPO_ROOT } from '@/lib/repo';
import type { ParamEnumDef } from '@/lib/types';

interface StepEnumsFile {
  version: number;
  _comment?: string;
  enums: { expression: string; _comment?: string; paramEnums: ParamEnumDef[] }[];
  dependencies: { expression: string; requires: string[] }[];
}

const ENUMS_PATH = path.join(REPO_ROOT, 'step-enums.json');

function readEnumsFile(): StepEnumsFile {
  const raw = fs.readFileSync(ENUMS_PATH, 'utf-8');
  return JSON.parse(raw) as StepEnumsFile;
}

/**
 * PUT /api/enums
 * Body: { expression: string, paramEnums: ParamEnumDef[] }
 * Upserts the enum entry for the given step expression in step-enums.json.
 */
export async function PUT(request: Request) {
  try {
    const { expression, paramEnums } = await request.json() as {
      expression?: string;
      paramEnums?: ParamEnumDef[];
    };

    if (!expression || !Array.isArray(paramEnums)) {
      return NextResponse.json({ error: 'expression and paramEnums are required' }, { status: 400 });
    }

    const file = readEnumsFile();
    const idx = file.enums.findIndex(e => e.expression === expression);

    if (idx >= 0) {
      file.enums[idx] = { ...file.enums[idx], paramEnums };
    } else {
      file.enums.push({ expression, paramEnums });
    }

    fs.writeFileSync(ENUMS_PATH, JSON.stringify(file, null, 2) + '\n', 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
