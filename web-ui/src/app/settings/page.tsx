'use client';
import { useState, useCallback } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/useSettings';
import { useLanguage } from '@/providers/Providers';

export default function SettingsPage() {
  const { t } = useLanguage();
  const { settings, loaded, update } = useSettings();
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: string[] } | null>(null);

  const handleBlur = useCallback((key: keyof typeof settings, value: string) => {
    update({ [key]: value });
    setSavedKey(key);
    setTimeout(() => setSavedKey(k => k === key ? null : k), 2000);
  }, [settings, update]);

  const handleJiraSync = useCallback(async () => {
    if (!settings.jiraBaseUrl || !settings.jiraToken) return;
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/jira/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-jira-url': settings.jiraBaseUrl,
          'x-jira-token': settings.jiraToken,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { synced: number; skipped: number; errors: string[] };
      setSyncResult({ synced: data.synced, errors: data.errors });
      if (data.errors.length === 0) {
        const resultText = t.settings.jiraSyncResult
          .replace('{synced}', String(data.synced))
          .replace('{errors}', String(data.errors.length));
        toast.success(resultText);
      } else {
        toast.error(`Sync completata con ${data.errors.length} errori`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Jira sync fallita: ${msg}`);
    } finally {
      setIsSyncing(false);
    }
  }, [settings.jiraBaseUrl, settings.jiraToken, t.settings.jiraSyncResult]);

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
        // Remount once values hydrate from localStorage so the uncontrolled
        // input re-reads defaultValue (avoids the controlled/uncontrolled warning).
        key={loaded ? 'loaded' : 'init'}
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
        {field('catalogBranch', 'Catalog branch', 'Branch where step proposals are pushed (default: catalog)')}
      </section>

      {/* Commit identity Section */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground border-b border-border pb-2">
          Commit identity
        </h2>
        {field('commitName', 'Commit name', 'Display name shown as the Git commit author')}
        {field('commitEmail', 'Commit email', 'Email shown as the Git commit author')}
        <p className="text-sm text-muted-foreground">
          Required scopes: repo, contents:write.{' '}
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 dark:text-teal-400 hover:underline"
          >
            Generate a token
          </a>
        </p>
      </section>

      {/* Jira Section */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground border-b border-border pb-2">
          {t.settings.jira}
        </h2>
        {field('jiraBaseUrl', t.settings.jiraBaseUrl, t.settings.jiraBaseUrlHint)}
        {field('jiraToken', t.settings.jiraToken, t.settings.jiraTokenHint, 'password')}
      </section>

      {/* Jira Sync Section */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground border-b border-border pb-2">
          {t.settings.jiraSyncTitle}
        </h2>
        {settings.jiraBaseUrl && settings.jiraToken ? (
          <div className="space-y-3">
            <Button
              onClick={handleJiraSync}
              disabled={isSyncing}
            >
              {isSyncing ? t.settings.jiraSyncLoading : t.settings.jiraSyncButton}
            </Button>
            {syncResult && (
              <div className="text-sm text-muted-foreground">
                <p>{syncResult.synced} scenari sincronizzati</p>
                {syncResult.errors.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {syncResult.errors.map((e, i) => (
                      <li key={i} className="text-destructive text-xs font-mono">{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t.settings.jiraSyncNotConfigured}</p>
        )}
      </section>
    </div>
  );
}
