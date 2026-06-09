import type { Loader } from 'astro/loaders';
import { docsLoader } from '@astrojs/starlight/loaders';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

interface StepDoc {
  intent?: string;
  params: Record<string, string>;
  pre?: string;
  post?: string;
  page?: string;
}

interface Step {
  expression: string;
  parameters: string[];
  domain: string;
  page?: string;
  sourceRef: string;
  doc: StepDoc;
  documented: boolean;
}

interface StepCatalog {
  generatedAt: string;
  totalSteps: number;
  steps: Step[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\{[^}]+\}/g, 'param')  // {string} → param
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function needsReview(step: Step): boolean {
  return !step.doc.intent || !step.page;
}

function renderBody(step: Step): string {
  const parts: string[] = [];

  if (needsReview(step)) {
    const missing: string[] = [];
    if (!step.doc.intent) missing.push('`@intent`');
    if (!step.page)       missing.push('`@page`');
    parts.push(`:::caution[Needs Review]\nThis step is missing: ${missing.join(', ')}. Ask Steve to complete the JSDoc.\n:::\n`);
  }

  if (step.page) {
    parts.push(`**Page Object:** \`${step.page}\`\n`);
  }

  const paramEntries = Object.entries(step.doc.params ?? {});
  if (paramEntries.length > 0) {
    parts.push('## Parameters\n');
    parts.push('| Parameter | Description |');
    parts.push('|-----------|-------------|');
    for (const [name, desc] of paramEntries) {
      parts.push(`| \`${name}\` | ${desc} |`);
    }
    parts.push('');
  }

  if (step.doc.intent) {
    parts.push(`## Intent\n\n${step.doc.intent}\n`);
  }

  if (step.doc.pre) {
    parts.push(`## Pre-condition\n\n${step.doc.pre}\n`);
  }

  if (step.doc.post) {
    parts.push(`## Post-condition\n\n${step.doc.post}\n`);
  }

  // Always show source reference so QA can jump to the implementation.
  const [file, line] = step.sourceRef.split(':');
  const displayRef = line ? `${file}:${line}` : step.sourceRef;
  parts.push(`## Implementation\n\nSource: \`${displayRef}\``);

  return parts.join('\n');
}

/**
 * Composite Astro content loader for the `docs` collection.
 *
 * 1. Delegates to Starlight's built-in docsLoader() to pick up static
 *    .md / .mdx files from src/content/docs/ (e.g. index.mdx).
 * 2. Reads ../../step-catalog.json (repo root, one level above docs-site/)
 *    and injects one virtual page per step under the `steps/` directory.
 *
 * The catalog is a build-time artifact (gitignored).  The deploy workflow
 * regenerates it with `npm run catalog` before invoking `astro build`.
 */
export function catalogDocsLoader(): Loader {
  const staticLoader = docsLoader();

  return {
    name: 'catalog-docs-loader',

    async load(ctx) {
      // 1. Load static pages first so index.mdx etc. are available.
      await staticLoader.load(ctx);

      // 2. Resolve catalog path: docs-site/ → repo root → step-catalog.json
      // config.root is the Astro project root (docs-site/), always a directory URL.
      const docsRoot = fileURLToPath(ctx.config.root);
      const catalogPath = resolve(docsRoot, '..', 'step-catalog.json');

      let catalog: StepCatalog;
      try {
        catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'));
      } catch {
        ctx.logger.warn(
          `step-catalog.json not found at "${catalogPath}". ` +
          'Run "npm run catalog" in the repo root first.',
        );
        return;
      }

      ctx.logger.info(`Injecting ${catalog.steps.length} steps from step-catalog.json`);

      for (const step of catalog.steps) {
        const id = `steps/${slugify(step.expression)}`;
        const body = renderBody(step);

        const frontmatter: Record<string, unknown> = {
          title: step.expression,
          description: step.doc.intent ?? '',
        };

        if (needsReview(step)) {
          frontmatter.badge = { text: 'Needs Review', variant: 'caution' };
        }

        const data = await ctx.parseData({ id, data: frontmatter });

        ctx.store.set({
          id,
          data,
          body,
          // JSON.stringify produces a stable string digest Astro can hash.
          digest: ctx.generateDigest(JSON.stringify(step)),
        });
      }
    },
  };
}
