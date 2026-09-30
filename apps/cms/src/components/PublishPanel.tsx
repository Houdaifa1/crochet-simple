'use client';

import { Button } from '@payloadcms/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

interface State {
  status: 'idle' | 'running' | 'done' | 'failed';
  step?: 'backup' | 'export' | 'build';
  startedAt?: string;
  finishedAt?: string;
  summary?: string;
  error?: string;
  warnings: string[];
  log: string[];
  lastSuccess?: string;
}

const STEPS = [
  ['backup', 'Back up'],
  ['export', 'Collect content'],
  ['build', 'Build the website'],
] as const;

const when = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : 'never';

export function PublishPanel() {
  const [state, setState] = useState<State | null>(null);
  const [showLog, setShowLog] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/publish', { credentials: 'include' });
    if (!res.ok) return;
    const s = (await res.json()) as State;
    setState(s);
    if (s.status === 'running') timer.current = setTimeout(load, 1000);
  }, []);

  useEffect(() => {
    void load();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  const publish = async () => {
    const res = await fetch('/api/publish', { method: 'POST', credentials: 'include' });
    if (res.ok) {
      setState((await res.json()) as State);
      timer.current = setTimeout(load, 800);
    }
  };
  const openPreview = async () => {
    const res = await fetch('/api/publish/preview', { method: 'POST', credentials: 'include' });
    const body = (await res.json()) as { url?: string; error?: string };
    if (body.url) window.open(body.url, '_blank', 'noopener');
  };

  const running = state?.status === 'running';
  const current = STEPS.findIndex(([k]) => k === state?.step);

  return (
    <section id="publish" className="cs-publish" aria-labelledby="cs-publish-title">
      <div className="cs-publish__head">
        <div>
          <h2 id="cs-publish-title">Publish the website</h2>
          <p>
            Saves a backup, collects everything that is published here, checks it and builds the
            site. Last published: <strong>{when(state?.lastSuccess)}</strong>.
          </p>
        </div>
        <div className="cs-publish__actions">
          <Button onClick={publish} disabled={running || !state} buttonStyle="primary" size="large">
            {running ? 'Publishing…' : 'Publish now'}
          </Button>
          {state?.lastSuccess && !running && (
            <Button onClick={openPreview} buttonStyle="secondary" size="large">
              Open the built site
            </Button>
          )}
        </div>
      </div>

      {running && (
        <ol className="cs-publish__steps" aria-live="polite">
          {STEPS.map(([key, label], i) => (
            <li key={key} data-state={i < current ? 'done' : i === current ? 'now' : 'next'}>
              {label}
            </li>
          ))}
        </ol>
      )}
      {state?.status === 'done' && (
        <p className="cs-publish__ok" role="status">
          Published {when(state.finishedAt)}. {state.summary}
        </p>
      )}
      {state?.status === 'failed' && (
        <div className="cs-publish__error" role="alert">
          <strong>Not published.</strong>
          <pre>{state.error}</pre>
        </div>
      )}
      {state && state.warnings.length > 0 && !running && (
        <ul className="cs-publish__notes">
          {state.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {state && state.log.length > 0 && (
        <details open={showLog} onToggle={(e) => setShowLog((e.target as HTMLDetailsElement).open)}>
          <summary>Details</summary>
          <pre className="cs-publish__log">{state.log.join('\n')}</pre>
        </details>
      )}
    </section>
  );
}
