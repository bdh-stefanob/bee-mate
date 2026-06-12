import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { REPO_ROOT } from '@/lib/repo';

const execAsync = promisify(exec);

export interface GitFileStatus {
  code: string;
  file: string;
}

export async function GET() {
  try {
    const { stdout } = await execAsync('git status --porcelain', { cwd: REPO_ROOT });
    const files: GitFileStatus[] = stdout
      .split('\n')
      .filter(Boolean)
      .map(line => ({ code: line.slice(0, 2), file: line.slice(3).replace(/\\/g, '/') }));
    return NextResponse.json({ files });
  } catch (err: unknown) {
    return NextResponse.json(
      { files: [], error: err instanceof Error ? err.message : 'git error' },
      { status: 500 }
    );
  }
}
