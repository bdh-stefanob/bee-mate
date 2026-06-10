import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { FEATURES_DIR } from '@/lib/repo';

// Estrae il testo di ogni Scenario (dal tag @ticket fino alla riga vuota successiva
// o al prossimo Scenario/Feature)
function extractScenariosWithTicket(
  featureContent: string
): Array<{ ticketKey: string; scenarioText: string }> {
  const results: Array<{ ticketKey: string; scenarioText: string }> = [];
  const lines = featureContent.split('\n');
  let i = 0;

  while (i < lines.length) {
    const ticketMatch = lines[i].match(/@ticket:([A-Z]+-\d+)/);
    if (ticketMatch) {
      const ticketKey = ticketMatch[1];
      // Raccogliere le righe dello scenario fino al prossimo @ticket o Feature o fine file
      const scenarioLines: string[] = [lines[i]];
      i++;
      while (i < lines.length) {
        const line = lines[i];
        // Stop al prossimo tag @ticket o alla keyword Feature: al livello radice
        if (/@ticket:/.test(line) || /^Feature:/.test(line.trim())) break;
        scenarioLines.push(line);
        i++;
      }
      results.push({
        ticketKey,
        scenarioText: scenarioLines.join('\n').trim(),
      });
    } else {
      i++;
    }
  }
  return results;
}

// Raccogliere tutti i .feature in modo ricorsivo
function walkFeatureFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFeatureFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.feature')) {
      results.push(fullPath);
    }
  }
  return results;
}

function buildAdfComment(scenarioText: string): object {
  return {
    body: {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'codeBlock',
          attrs: { language: 'gherkin' },
          content: [{ type: 'text', text: scenarioText }],
        },
      ],
    },
  };
}

export async function POST(request: Request) {
  // 1. Leggere token dagli header
  const jiraUrl   = request.headers.get('x-jira-url');
  const jiraToken = request.headers.get('x-jira-token');

  if (!jiraUrl || !jiraToken) {
    return NextResponse.json(
      { ok: false, error: 'Missing headers: x-jira-url, x-jira-token' },
      { status: 400 }
    );
  }

  // Normalizzare l'URL base (rimuovere trailing slash)
  const baseUrl = jiraUrl.replace(/\/$/, '');

  // 2. Raccogliere tutti i .feature
  const featureFiles = walkFeatureFiles(FEATURES_DIR);

  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];

  // 3. Per ogni file, estrarre gli scenari con @ticket
  for (const filePath of featureFiles) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      errors.push(`Cannot read ${path.basename(filePath)}`);
      continue;
    }

    const scenarios = extractScenariosWithTicket(content);
    if (scenarios.length === 0) {
      skipped++;
      continue;
    }

    // 4. Per ogni scenario, postare il commento su Jira
    for (const { ticketKey, scenarioText } of scenarios) {
      const commentUrl = `${baseUrl}/rest/api/3/issue/${ticketKey}/comment`;
      try {
        const res = await fetch(commentUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jiraToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(buildAdfComment(scenarioText)),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({})) as { message?: string; errorMessages?: string[] };
          const msg = errData.message ?? errData.errorMessages?.[0] ?? `HTTP ${res.status}`;
          errors.push(`${ticketKey}: ${msg}`);
        } else {
          synced++;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Network error';
        errors.push(`${ticketKey}: ${msg}`);
      }
    }
  }

  return NextResponse.json({ synced, skipped, errors });
}
