'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { clsx } from '@/lib/clsx';
import type { PayloadFilters as Filters } from '@/lib/db/payloads';

type Facet = { value: string; label: string; count: number };

/** Filters for the payload catalogue. Same URL-driven contract as the flight catalogue. */
export function PayloadFilters({
  filters,
  facets,
  total,
}: {
  filters: Filters;
  facets: { types: Facet[]; operators: Facet[]; destinations: Facet[] };
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? '/charges-utiles';
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q ?? '');
  const first = useRef(true);

  const push = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params?.toString());
    mutate(next);
    startTransition(() => router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false }));
  };

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      push((p) => {
        if (query.trim()) p.set('q', query.trim());
        else p.delete('q');
      });
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const toggle = (key: string, value: string) => {
    push((p) => {
      const current = (p.get(key)?.split(',') ?? []).filter(Boolean);
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      if (next.length) p.set(key, next.join(','));
      else p.delete(key);
    });
  };

  const active =
    (filters.types?.length ?? 0) +
    (filters.operators?.length ?? 0) +
    (filters.destinations?.length ?? 0) +
    (filters.q ? 1 : 0);

  return (
    <div className={clsx('flex flex-col gap-4 transition-opacity duration-200', pending && 'opacity-70')}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, organisation, constructeur…"
            aria-label="Rechercher une charge utile"
            className="w-full rounded-lg border border-hairline bg-surface/60 px-3 py-1.5 pr-8 text-xs text-ink outline-none transition-colors duration-200 placeholder:text-ink-4 hover:border-hairline-2 focus:border-ion/40"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-4 transition-colors hover:text-ink-2"
            >
              ×
            </button>
          ) : null}
        </div>

        <label className="flex items-center gap-2 text-xs text-ink-3">
          <span className="font-mono text-[10px] uppercase tracking-wider">Tri</span>
          <select
            value={filters.sort}
            onChange={(e) => push((p) => p.set('tri', e.target.value))}
            className="rounded-lg border border-hairline bg-surface/60 px-2 py-1.5 text-xs text-ink outline-none transition-colors hover:border-hairline-2 focus:border-ion/40"
          >
            <option value="recent">Vol le plus récent</option>
            <option value="name">Nom (A→Z)</option>
          </select>
        </label>

        {active ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              startTransition(() => router.replace('/charges-utiles', { scroll: false }));
            }}
            className="text-[11px] text-ink-3 underline underline-offset-4 transition-colors hover:text-fail"
          >
            Réinitialiser ({active})
          </button>
        ) : null}
      </div>

      <div className="grid gap-5 rounded-xl border border-hairline bg-surface/40 p-4 md:grid-cols-3">
        <Group
          title="Type"
          items={facets.types}
          selected={filters.types ?? []}
          onToggle={(v) => toggle('type', v)}
        />
        <Group
          title="Organisation"
          items={facets.operators}
          selected={filters.operators ?? []}
          onToggle={(v) => toggle('operateur', v)}
        />
        <Group
          title="Destination"
          items={facets.destinations}
          selected={filters.destinations ?? []}
          onToggle={(v) => toggle('destination', v)}
        />
      </div>

      <p className="text-[11px] text-ink-3" aria-live="polite">
        <span className="font-mono tabular text-ink-2">{total}</span> entrée{total > 1 ? 's' : ''} affichée
        {total > 1 ? 's' : ''}.
      </p>
    </div>
  );
}

function Group({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: Facet[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, 8);
  if (!items.length) return null;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">{title}</legend>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((f) => {
          const isActive = selected.includes(f.value);
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onToggle(f.value)}
              className={clsx(
                'flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-all duration-200 active:scale-[0.97]',
                isActive
                  ? 'border-ion/45 bg-ion-wash text-ink'
                  : 'border-hairline bg-surface/50 text-ink-3 hover:border-hairline-2 hover:text-ink-2',
              )}
            >
              <span className="max-w-[13rem] truncate">{f.label}</span>
              <span className="font-mono text-[9px] tabular text-ink-4">{f.count}</span>
            </button>
          );
        })}
      </div>
      {items.length > 8 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start text-[10px] text-ink-4 underline underline-offset-4 transition-colors hover:text-ion"
        >
          {expanded ? 'Réduire' : `${items.length - 8} de plus`}
        </button>
      ) : null}
    </fieldset>
  );
}
