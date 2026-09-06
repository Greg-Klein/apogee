'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { clsx } from '@/lib/clsx';
import type { VehicleFilters as Filters } from '@/lib/db/vehicles';

type ModelOption = {
  id: string;
  name: string;
  full_name: string | null;
  kind: string;
  article_count: number;
};

/**
 * Filters for the physical-article list. State lives in the URL so a filtered
 * hardware view is shareable and survives the back button.
 */
export function VehicleFilters({
  filters,
  statuses,
  models,
}: {
  filters: Filters;
  statuses: Array<{ value: string; label: string; count: number }>;
  models: ModelOption[];
}) {
  const router = useRouter();
  const pathname = usePathname() ?? '/materiel';
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

  const kinds = [
    { value: '', label: 'Tous' },
    { value: 'booster', label: 'Boosters' },
    { value: 'spacecraft', label: 'Vaisseaux' },
  ];

  const relevantModels = models.filter(
    (m) =>
      m.article_count > 0 &&
      (!filters.kind || (filters.kind === 'booster' ? m.kind === 'launcher' : m.kind === 'spacecraft')),
  );

  return (
    <div
      className={clsx(
        'flex flex-wrap items-center gap-3 transition-opacity duration-200',
        pending && 'opacity-70',
      )}
    >
      <div
        role="radiogroup"
        aria-label="Type de matériel"
        className="flex rounded-lg border border-hairline bg-surface/60 p-0.5"
      >
        {kinds.map((k) => {
          const active = (filters.kind ?? '') === k.value;
          return (
            <button
              key={k.value || 'all'}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() =>
                push((p) => {
                  if (k.value) p.set('type', k.value);
                  else p.delete('type');
                  p.delete('modele');
                })
              }
              className={clsx(
                'rounded-md px-3 py-1.5 text-xs transition-colors duration-200',
                active ? 'bg-surface-2 text-ink' : 'text-ink-4 hover:text-ink-2',
              )}
            >
              {k.label}
            </button>
          );
        })}
      </div>

      <div className="relative min-w-[14rem] flex-1">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Numéro de série, par exemple B1075"
          aria-label="Rechercher un exemplaire"
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
        <span className="font-mono text-[10px] uppercase tracking-wider">Modèle</span>
        <select
          value={filters.model ?? ''}
          onChange={(e) =>
            push((p) => (e.target.value ? p.set('modele', e.target.value) : p.delete('modele')))
          }
          className="max-w-[13rem] rounded-lg border border-hairline bg-surface/60 px-2 py-1.5 text-xs text-ink outline-none transition-colors hover:border-hairline-2 focus:border-ion/40"
        >
          <option value="">Tous</option>
          {relevantModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name ?? m.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-xs text-ink-3">
        <span className="font-mono text-[10px] uppercase tracking-wider">État</span>
        <select
          value={filters.status ?? ''}
          onChange={(e) => push((p) => (e.target.value ? p.set('etat', e.target.value) : p.delete('etat')))}
          className="rounded-lg border border-hairline bg-surface/60 px-2 py-1.5 text-xs text-ink outline-none transition-colors hover:border-hairline-2 focus:border-ion/40"
        >
          <option value="">Tous</option>
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label} ({s.count})
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-xs text-ink-3">
        <span className="font-mono text-[10px] uppercase tracking-wider">Tri</span>
        <select
          value={filters.sort}
          onChange={(e) => push((p) => p.set('tri', e.target.value))}
          className="rounded-lg border border-hairline bg-surface/60 px-2 py-1.5 text-xs text-ink outline-none transition-colors hover:border-hairline-2 focus:border-ion/40"
        >
          <option value="flights_desc">Vols répertoriés</option>
          <option value="recent">Vol le plus récent</option>
          <option value="name">Numéro de série</option>
        </select>
      </label>
    </div>
  );
}
