'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clsx } from '@/lib/clsx';
import type { SearchHit } from '@/lib/db/search';

const GROUP_LABEL: Record<string, string> = {
  launch: 'Vols',
  booster: 'Boosters',
  spacecraft: 'Vaisseaux',
  model: 'Modèles',
  payload: 'Charges utiles',
};

const ORDER = ['launch', 'booster', 'spacecraft', 'payload', 'model'];

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; groups: Record<string, SearchHit[]> };

/**
 * Cross-entity search, reachable from every screen.
 *
 * Results are grouped by type and open the matching page directly. A booster
 * serial finds its missions because the index carries serials on launch rows.
 */
export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(id);
  }, [open]);

  // Closing resets the palette here rather than in an effect, so the reset is part
  // of the interaction that caused it instead of a follow-up render.
  const close = useCallback(() => {
    setOpen(false);
    setQ('');
    setState({ kind: 'idle' });
    setActive(0);
  }, []);

  // Below the minimum length there is nothing to fetch and nothing to show; the
  // idle view is derived rather than written back into state.
  const view = useMemo<State>(() => (q.trim().length < 2 ? { kind: 'idle' } : state), [q, state]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const controller = new AbortController();
    const id = window.setTimeout(async () => {
      setState({ kind: 'loading' });
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const body = await res.json();
        setState({ kind: 'ready', groups: body.groups ?? {} });
        setActive(0);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setState({ kind: 'error' });
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(id);
    };
  }, [q]);

  const flat = useMemo(() => {
    if (view.kind !== 'ready') return [];
    return ORDER.flatMap((k) => view.groups[k] ?? []);
  }, [view]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!flat.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % flat.length);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + flat.length) % flat.length);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const hit = flat[active];
      if (hit) {
        close();
        router.push(hit.href);
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          'group flex items-center gap-2 rounded-lg border border-hairline bg-surface/60 px-2.5 py-1.5',
          'text-xs text-ink-3 transition-colors duration-200 hover:border-hairline-2 hover:text-ink-2',
          'active:scale-[0.98] motion-safe:transition-transform',
        )}
        aria-label="Rechercher une mission, un matériel ou une charge utile"
      >
        <SearchGlyph />
        <span className="hidden sm:inline">Rechercher</span>
        <kbd className="ml-1 hidden rounded border border-hairline-2 px-1 font-mono text-[9px] text-ink-4 md:inline">
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-ground/85 px-4 pt-[12vh] backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Recherche transversale"
            className="rise w-full max-w-2xl overflow-hidden rounded-xl border border-hairline-2 bg-surface shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)]"
          >
            <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
              <SearchGlyph />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Mission, numéro de booster (B1075), vaisseau, charge utile…"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-4"
                aria-label="Terme de recherche"
              />
              <kbd className="rounded border border-hairline-2 px-1.5 py-0.5 font-mono text-[9px] text-ink-4">
                esc
              </kbd>
            </div>

            <div className="max-h-[54vh] overflow-y-auto">
              {view.kind === 'idle' && q.trim().length < 2 ? (
                <p className="px-4 py-8 text-center text-xs text-ink-3">
                  Deux caractères suffisent pour lancer la recherche.
                </p>
              ) : null}

              {view.kind === 'loading' ? (
                <div className="space-y-2 p-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="shimmer relative h-9 overflow-hidden rounded-md bg-surface-2" />
                  ))}
                </div>
              ) : null}

              {view.kind === 'error' ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-fail">La recherche est momentanément indisponible.</p>
                  <button
                    type="button"
                    onClick={() => setQ((v) => `${v} `.trim())}
                    className="mt-2 text-xs text-ion underline underline-offset-4"
                  >
                    Réessayer
                  </button>
                </div>
              ) : null}

              {view.kind === 'ready' && flat.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-ink-3">
                  Aucun résultat pour « {q} ». Essayez un numéro de série ou un nom de mission.
                </p>
              ) : null}

              {view.kind === 'ready'
                ? ORDER.filter((k) => (view.groups[k] ?? []).length).map((key) => (
                    <section key={key} className="border-b border-hairline last:border-0">
                      <h3 className="px-4 pt-3 pb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-4">
                        {GROUP_LABEL[key]}
                      </h3>
                      <ul>
                        {(view.groups[key] ?? []).map((hit) => {
                          const index = flat.indexOf(hit);
                          return (
                            <li key={`${hit.entity}-${hit.ref}`}>
                              <Link
                                href={hit.href}
                                onClick={close}
                                onMouseEnter={() => setActive(index)}
                                className={clsx(
                                  'flex items-center justify-between gap-4 px-4 py-2 text-sm transition-colors',
                                  index === active ? 'bg-ion-wash text-ink' : 'text-ink-2 hover:bg-surface-2',
                                )}
                              >
                                <span className="truncate">{hit.title}</span>
                                <span className="shrink-0 truncate font-mono text-[10px] text-ink-4">
                                  {hit.subtitle}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))
                : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SearchGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
