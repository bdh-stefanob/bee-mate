'use client';
import { useState, useCallback } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSettings } from '@/hooks/useSettings';
import { useLanguage } from '@/providers/Providers';

export default function SettingsPage() {
  const { t } = useLanguage();
  const { settings, update } = useSettings();
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const handleBlur = useCallback((key: keyof typeof settings, value: string) => {
    update({ [key]: value });
    setSavedKey(key);
    setTimeout(() => setSavedKey(k => k === key ? null : k), 2000);
  }, [settings, update]);

  const field = (
    key: keyof typeof settings,
    label: string,
    hint: string,
    type: 'text' | 'password' = 'text'
  ) => (
    <div className="space-y-1.5" key={key}>
      <label className="text-sm font-medium text-foreground flex items-center gap-2">
        {label}
        {savedKey === key && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-normal">
            {t.settings.saved}
          </span>
        )}
      </label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <Input
        type={type}
        defaultValue={settings[key]}
        onBlur={e => handleBlur(key, e.target.value)}
        autoComplete="off"
        className="font-mono text-sm"
      />
    </div>
  );

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">{t.settings.title}</h1>
      </div>

      {/* GitHub Section */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground border-b border-border pb-2">
          {t.settings.github}
        </h2>
        {field('githubToken', t.settings.githubToken, t.settings.githubTokenHint, 'password')}
        {field('githubOwner', t.settings.githubOwner, '')}
        {field('githubRepo', t.settings.githubRepo, '')}
        {field('githubBranch', t.settings.githubBranch, '')}
      </section>

      {/* Jira Section */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground border-b border-border pb-2">
          {t.settings.jira}
        </h2>
        {field('jiraBaseUrl', t.settings.jiraBaseUrl, t.settings.jiraBaseUrlHint)}
        {field('jiraToken', t.settings.jiraToken, t.settings.jiraTokenHint, 'password')}
      </section>
    </div>
  );
}
