'use client';

import { useState } from 'react';

export function ShareFlight({ path, title }: { path: string; title: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [manualUrl, setManualUrl] = useState('');

  async function share() {
    const url = new URL(path, window.location.origin).href;
    setBusy(true);
    setMessage('');
    setManualUrl('');

    try {
      if (navigator.share) {
        try {
          await navigator.share({ title: `${title} · Apogée`, url });
          return;
        } catch (error) {
          // Cancelling the share sheet should not trigger a clipboard write.
          if (error instanceof Error && error.name === 'AbortError') return;
        }
      }

      try {
        await navigator.clipboard.writeText(url);
        setMessage('Lien copié !');
      } catch {
        setManualUrl(url);
        setMessage('Copiez le lien ci-dessous pour partager ce vol.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-full flex-col items-start gap-2">
      <button
        type="button"
        onClick={share}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border border-hairline-2 bg-surface/60 px-4 py-2 text-sm text-ink-2 transition-colors duration-200 hover:border-ion/40 hover:text-ink active:scale-[0.98] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ion"
      >
        Partager ce vol
      </button>
      <span role="status" className="text-xs text-ink-3 empty:hidden">
        {message}
      </span>
      {manualUrl ? (
        <input
          type="url"
          aria-label="Lien de partage du vol"
          readOnly
          value={manualUrl}
          onFocus={(event) => event.currentTarget.select()}
          className="w-80 max-w-full rounded-lg border border-hairline-2 bg-surface px-3 py-2 text-xs text-ink"
        />
      ) : null}
    </div>
  );
}
