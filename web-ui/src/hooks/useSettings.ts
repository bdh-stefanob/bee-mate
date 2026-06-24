'use client';
import { useState, useEffect, useCallback } from 'react';

export interface AppSettings {
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  catalogBranch: string;   // NEW: step-proposals.json push target (D-01)
  commitName: string;      // NEW: Git commit author display name (D-07)
  commitEmail: string;     // NEW: Git commit author email (D-07)
  jiraBaseUrl: string;
  jiraToken: string;
}

export const STORAGE_KEY = 'bdd-scaffold-settings';

const DEFAULTS: AppSettings = {
  githubToken: '',
  githubOwner: '',
  githubRepo: '',
  githubBranch: 'main',
  catalogBranch: 'catalog',
  commitName: '',
  commitEmail: '',
  jiraBaseUrl: '',
  jiraToken: '',
};

function readStorage(): AppSettings {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    // Guard: merge solo se il valore è un plain object (non null, array, stringa, ecc.)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ...DEFAULTS };
    }
    return { ...DEFAULTS, ...parsed } as AppSettings;
  } catch {
    return { ...DEFAULTS };
  }
}

export function useSettings(): {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
} {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);

  useEffect(() => {
    setSettings(readStorage());
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
      } catch { /* localStorage non disponibile — silenzioso */ }
      return next;
    });
  }, []);

  return { settings, update };
}
