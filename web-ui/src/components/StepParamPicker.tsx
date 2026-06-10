'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CatalogStep, ParamEnumDef } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GherkinKeyword = 'Given' | 'When' | 'Then' | 'And' | 'But';

export interface StepParamPickerProps {
  step: CatalogStep;
  defaultKeyword: GherkinKeyword;
  onInsert: (line: string) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeGherkinString(val: string): string {
  // Use double quotes if value contains a single quote (e.g. "I'm new")
  if (val.includes("'")) return `"${val.replace(/"/g, '\\"')}"`;
  return `'${val}'`;
}

function resolveExpression(expression: string, values: Record<number, string>): string {
  let i = 0;
  return expression.replace(/\{[^}]+\}/g, (match) => {
    const val = values[i++];
    return val ? escapeGherkinString(val) : match;
  });
}

function buildInsertLine(keyword: GherkinKeyword, resolved: string): string {
  return `    ${keyword} ${resolved}`;
}

function getParamEnumForIndex(
  expression: string,
  paramEnums: ParamEnumDef[] | undefined,
  targetIndex: number
): ParamEnumDef | undefined {
  if (!paramEnums?.length) return undefined;
  const tokens = [...expression.matchAll(/\{[^}]+\}/g)];
  const token = tokens[targetIndex]?.[0];
  if (!token) return undefined;
  return paramEnums.find(p => p.token === token);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const KEYWORDS: GherkinKeyword[] = ['Given', 'When', 'Then'];

export function StepParamPicker({ step, defaultKeyword, onInsert, onClose }: StepParamPickerProps) {
  const [keyword, setKeyword] = useState<GherkinKeyword>(
    KEYWORDS.includes(defaultKeyword as GherkinKeyword) ? defaultKeyword : 'When'
  );
  const [values, setValues] = useState<Record<number, string>>({});
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Extract param tokens in order from expression
  const paramMatches = [...step.expression.matchAll(/\{[^}]+\}/g)];

  const allFilled = paramMatches.length === 0 ||
    paramMatches.every((_, i) => Boolean(values[i]?.trim()));

  const resolved = resolveExpression(step.expression, values);
  const insertLine = buildInsertLine(keyword, resolved);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && allFilled) {
      e.preventDefault();
      onInsert(insertLine);
    }
  };

  // Highlight param tokens in the expression header
  function renderExpression(expr: string) {
    const parts = expr.split(/(\{[^}]+\})/g);
    return parts.map((part, i) =>
      /^\{[^}]+\}$/.test(part)
        ? <span key={i} className="text-accent font-semibold">{part}</span>
        : <span key={i}>{part}</span>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 p-3 border border-teal-500/40 rounded-md bg-popover shadow-md"
      onKeyDown={handleKeyDown}
    >
      {/* Header: expression with param tokens highlighted */}
      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Insert step</p>
        <p className="text-sm font-mono leading-snug">{renderExpression(step.expression)}</p>
      </div>

      {/* Keyword selector */}
      <div className="flex gap-1" role="group" aria-label="Step keyword">
        {KEYWORDS.map(kw => (
          <button
            key={kw}
            type="button"
            onClick={() => setKeyword(kw)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              keyword === kw
                ? 'bg-secondary border-teal-500 text-teal-700 dark:text-teal-300 font-semibold'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {kw}
          </button>
        ))}
      </div>

      {/* Param fields */}
      {paramMatches.map((match, i) => {
        const enumDef = getParamEnumForIndex(step.expression, step.paramEnums, i);
        const token = match[0];
        const label = enumDef?.label ?? token;
        const enumValues = enumDef?.values ?? [];

        return (
          <div key={i} className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
            {enumValues.length > 0 ? (
              <Select
                value={values[i] ?? ''}
                onValueChange={val => { if (val) setValues(prev => ({ ...prev, [i]: val })); }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={`Select ${label}…`} />
                </SelectTrigger>
                <SelectContent>
                  {enumValues.map(v => (
                    <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                ref={i === 0 ? firstFieldRef : undefined}
                value={values[i] ?? ''}
                onChange={e => setValues(prev => ({ ...prev, [i]: e.target.value }))}
                placeholder="Enter value…"
                className="h-8 text-xs"
              />
            )}
          </div>
        );
      })}

      {/* Preview */}
      <div className="rounded bg-muted/50 px-2 py-1.5">
        <p className="text-[10px] text-muted-foreground mb-0.5">Preview:</p>
        <p className={`text-xs font-mono break-all ${allFilled ? 'text-foreground' : 'text-muted-foreground'}`}>
          {insertLine}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs">
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => onInsert(insertLine)}
          disabled={!allFilled}
          className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white"
        >
          Insert step
        </Button>
      </div>
    </div>
  );
}

export default StepParamPicker;
