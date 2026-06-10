'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSuggestions } from '@/lib/autocomplete';
import type { CatalogStep } from '@/lib/types';
import { slugify } from '@/lib/repo';
import { ImportDropzone } from './ImportDropzone';

interface GherkinEditorProps {
  initialValue?: string;
}

/**
 * GherkinEditor
 *
 * Textarea monospace controllata con:
 * - Autocomplete prefix-match sul catalog (max 8, Tab/Enter/Escape)
 * - Pre-popolamento da prop initialValue (passata da ?step= query)
 * - Dropdown con wrapper position:relative (Pitfall 6)
 * - onBlur con delay 50ms (Pitfall 5)
 * - Preview .feature in pannello laterale
 * - Download .feature client-side via Blob
 * - ImportDropzone integrata
 */
export function GherkinEditor({ initialValue = '' }: GherkinEditorProps) {
  const [value, setValue] = useState<string>(initialValue);
  const [steps, setSteps] = useState<CatalogStep[]>([]);
  const [suggestions, setSuggestions] = useState<CatalogStep[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aggiorna il value se initialValue cambia (es. navigazione da catalog)
  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
    }
  }, [initialValue]);

  // Carica il catalog
  useEffect(() => {
    fetch('/api/catalog')
      .then(res => res.json())
      .then(data => {
        if (data.steps) setSteps(data.steps);
      })
      .catch(() => {/* ignora errori fetch in caso di rete assente */});
  }, []);

  // Inserisce il suggerimento nel testo, sostituendo il testo dopo la keyword
  const insertSuggestion = useCallback((step: CatalogStep) => {
    // Trova l'ultima riga con keyword Gherkin e sostituisce il testo dopo la keyword
    const PREFIX_RE = /(?:^|\n)(Given|When|Then|And|But)\s+([^\n]*)$/;
    const m = value.match(PREFIX_RE);
    if (!m) return;

    const keywordEnd = value.lastIndexOf(m[1]) + m[1].length + 1; // +1 per lo spazio
    const newValue = value.slice(0, keywordEnd) + step.expression;
    setValue(newValue);
    setShowDropdown(false);
    setSuggestions([]);
    // Riposiziona il cursore alla fine
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newValue.length, newValue.length);
      }
    }, 0);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    const sugg = getSuggestions(newValue, steps);
    if (sugg.length > 0) {
      setSuggestions(sugg);
      setShowDropdown(true);
      setActiveIndex(0);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      if (showDropdown && suggestions[activeIndex]) {
        e.preventDefault();
        insertSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
    }
  };

  // Pitfall 5: delay 50ms per permettere il click sul suggerimento
  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setShowDropdown(false);
    }, 50);
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
  };

  // Download .feature client-side via Blob
  const handleDownload = () => {
    // Estrae il nome Feature dalla prima riga "Feature: ..."
    const featureMatch = value.match(/Feature:\s*(.+)/i);
    const featureName = featureMatch ? featureMatch[1].trim() : 'scenario';
    const filename = slugify(featureName) || 'scenario';

    const blob = new Blob([value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.feature`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowPreview(p => !p)}
          className="px-3 py-1.5 text-sm rounded-md bg-teal-600 text-white hover:bg-teal-700 transition-colors"
        >
          {showPreview ? 'Chiudi Preview' : 'Preview .feature'}
        </button>
        <button
          onClick={handleDownload}
          className="px-3 py-1.5 text-sm rounded-md border border-teal-600 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950 transition-colors"
        >
          Download .feature
        </button>
      </div>

      <div className="flex gap-4">
        {/* Editor area */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Textarea con wrapper relative per il dropdown (Pitfall 6) */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onFocus={handleFocus}
              placeholder="Feature: Il mio scenario&#10;&#10;  Scenario: Descrizione&#10;    Given ...&#10;    When ...&#10;    Then ..."
              className="w-full h-64 p-3 font-mono text-sm border border-border rounded-md bg-background text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-teal-500"
              spellCheck={false}
              aria-label="Gherkin Editor"
              aria-autocomplete="list"
              aria-controls={showDropdown ? 'autocomplete-listbox' : undefined}
              aria-activedescendant={
                showDropdown ? `autocomplete-option-${activeIndex}` : undefined
              }
            />

            {/* Autocomplete dropdown (Pitfall 6: position absolute su parent relative) */}
            {showDropdown && suggestions.length > 0 && (
              <ul
                id="autocomplete-listbox"
                role="listbox"
                className="absolute left-0 right-0 z-50 mt-0.5 bg-popover border border-border rounded-md shadow-lg max-h-56 overflow-y-auto"
              >
                {suggestions.map((s, i) => (
                  <li
                    key={s.expression}
                    id={`autocomplete-option-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    onMouseDown={(e) => {
                      e.preventDefault(); // previene blur prima del click
                      insertSuggestion(s);
                    }}
                    className={`px-3 py-2 text-sm font-mono cursor-pointer flex items-center gap-2 ${
                      i === activeIndex
                        ? 'bg-teal-600 text-white'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span className="flex-1 truncate">{s.expression}</span>
                    <span
                      className={`text-xs shrink-0 ${
                        i === activeIndex ? 'text-teal-100' : 'text-muted-foreground'
                      }`}
                    >
                      {s.area}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Import dropzone */}
          <ImportDropzone
            onImported={(featureContent) => setValue(featureContent)}
          />
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div className="flex-1 min-w-0">
            <div className="h-full border border-border rounded-md bg-muted/30 p-3 overflow-auto">
              <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">
                Preview .feature
              </p>
              <pre className="text-sm font-mono whitespace-pre-wrap text-foreground break-words">
                {value || '# Nessun contenuto da visualizzare'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
