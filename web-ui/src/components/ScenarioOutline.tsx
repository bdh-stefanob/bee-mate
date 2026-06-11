'use client';

import { useMemo, useState } from 'react';
import type { GherkinEditorHandle } from '@/components/GherkinEditor';

interface ScenarioEntry {
  index: number;
  title: string;
  lineNumber: number;
  steps: string[];
}

function parseScenarios(content: string): ScenarioEntry[] {
  const lines = content.split('\n');
  const results: ScenarioEntry[] = [];
  let current: Omit<ScenarioEntry, 'index'> | null = null;

  lines.forEach((line, i) => {
    const match = line.match(/^\s*Scenario(?:\s+Outline)?:\s*(.*)$/i);
    if (match) {
      if (current) results.push(current);
      current = { title: match[1].trim() || '(no title)', lineNumber: i + 1, steps: [] };
    } else if (current && /^\s+(Given|When|Then|And|But)\s/i.test(line)) {
      current.steps.push(line.trim());
    }
  });
  if (current) results.push(current);

  return results.map((s, i) => ({ ...s, index: i + 1 }));
}

interface Props {
  content: string;
  editorRef: React.RefObject<GherkinEditorHandle | null>;
}

export function ScenarioOutline({ content, editorRef }: Props) {
  const scenarios = useMemo(() => parseScenarios(content), [content]);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  if (scenarios.length === 0) return null;

  function scrollToScenario(lineNumber: number) {
    const view = editorRef.current?.getView();
    if (!view) return;
    const line = view.state.doc.line(lineNumber);
    view.dispatch({ selection: { anchor: line.from } });
    view.scrollDOM.scrollTo({ top: view.lineBlockAt(line.from).top - 60, behavior: 'smooth' });
    view.focus();
  }

  function toggle(index: number) {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }

  return (
    <div className="rounded-md border border-border bg-background overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Scenarios
        </p>
        <span className="text-xs text-muted-foreground">{scenarios.length}</span>
      </div>
      <ul className="divide-y divide-border max-h-64 overflow-y-auto">
        {scenarios.map(s => {
          const isCollapsed = collapsed.has(s.index);
          return (
            <li key={s.index} className="text-xs">
              <div className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-muted/50">
                <button
                  onClick={() => toggle(s.index)}
                  className="shrink-0 w-4 text-muted-foreground hover:text-foreground"
                  aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                >
                  {isCollapsed ? '▶' : '▼'}
                </button>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground w-5 text-right">
                  {s.index}.
                </span>
                <button
                  onClick={() => scrollToScenario(s.lineNumber)}
                  className="flex-1 text-left font-medium truncate hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                  title={s.title}
                >
                  {s.title}
                </button>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  :{s.lineNumber}
                </span>
              </div>
              {!isCollapsed && s.steps.length > 0 && (
                <ul className="pl-8 pb-1.5 space-y-0.5">
                  {s.steps.map((step, i) => (
                    <li key={i} className="font-mono text-[10px] text-muted-foreground truncate">
                      {step}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default ScenarioOutline;
