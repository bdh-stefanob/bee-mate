'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GherkinToolbarProps {
  onInsert: (text: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onFormat?: () => void;
  formatLabel?: string;
}

// ---------------------------------------------------------------------------
// Snippet definitions
// ---------------------------------------------------------------------------

// Gherkin canonical indentation (Cucumber spec):
//   Feature:                col 0
//   Scenario: / Background: col 2
//   Given/When/Then:        col 4
//   Examples:               col 4
//   | table rows |          col 6

const STRUCTURE_SNIPPETS: { label: string; text: string }[] = [
  { label: 'Feature:',          text: 'Feature: \n\n  ' },
  { label: 'Scenario:',         text: '\n  Scenario: \n    ' },
  { label: 'Background:',       text: '\n  Background:\n    ' },
  { label: 'Scenario Outline:', text: '\n  Scenario Outline: \n    ' },
  { label: 'Examples:',         text: '\n    Examples:\n      | col1 | col2 |\n      |      |      |' },
];

const STEP_SNIPPETS: { label: string; text: string }[] = [
  { label: 'Given', text: '    Given ' },
  { label: 'When',  text: '    When ' },
  { label: 'Then',  text: '    Then ' },
  { label: 'And',   text: '    And ' },
  { label: 'But',   text: '    But ' },
];

const TABLE_SNIPPET = { label: '| table |', text: '      | col1 | col2 |\n      |      |      |' };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * GherkinToolbar
 *
 * Two rows of buttons for quick Gherkin snippet insertion:
 *  Row 1 — Structure: Feature, Scenario, Background, Scenario Outline, Examples
 *  Row 2 — Steps: Given, When, Then, And, But + table + undo/redo
 *
 * Structure buttons use teal border; step keyword buttons use green border.
 */
export function GherkinToolbar({ onInsert, onUndo, onRedo, onFormat, formatLabel = 'Format' }: GherkinToolbarProps) {
  return (
    <div className="flex flex-col gap-1.5 p-2 rounded-md border border-border bg-muted/30">
      {/* Row 1 — Structure keywords */}
      <div className="flex flex-wrap gap-1">
        <span className="text-xs text-muted-foreground self-center mr-1 min-w-fit">Structure:</span>
        {STRUCTURE_SNIPPETS.map(({ label, text }) => (
          <Button
            key={label}
            variant="outline"
            size="sm"
            onClick={() => onInsert(text)}
            className="border-teal-500 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950 text-xs h-7 px-2"
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Row 2 — Step keywords + table + undo/redo */}
      <div className="flex flex-wrap gap-1 items-center">
        <span className="text-xs text-muted-foreground self-center mr-1 min-w-fit">Steps:</span>
        {STEP_SNIPPETS.map(({ label, text }) => (
          <Button
            key={label}
            variant="outline"
            size="sm"
            onClick={() => onInsert(text)}
            className="border-green-500 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950 text-xs h-7 px-2"
          >
            {label}
          </Button>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onInsert(TABLE_SNIPPET.text)}
          className="text-xs h-7 px-2"
          title="Insert table template"
        >
          {TABLE_SNIPPET.label}
        </Button>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={onUndo}
          className="text-xs h-7 px-2"
          title="Undo (Ctrl+Z)"
        >
          ↩ Undo
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRedo}
          className="text-xs h-7 px-2"
          title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
        >
          ↪ Redo
        </Button>

        {onFormat && (
          <>
            <Separator orientation="vertical" className="h-5 mx-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={onFormat}
              className="text-xs h-7 px-2 border-teal-500 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950"
              title="Auto-format indentation"
            >
              ⟳ {formatLabel}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default GherkinToolbar;
