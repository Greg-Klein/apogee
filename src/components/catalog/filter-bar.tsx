'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { clsx } from '@/lib/clsx';
import type { FacetSet } from '@/lib/db/facets';
import type { CatalogFilters, CatalogView } from '@/lib/db/launches';

const VIEW_LABEL: Record<CatalogView, string> = {
  upcoming: 'À venir',
  past: 'Passés',
  all: 'Tous',
};

const OUTCOME_FACETS = [
  { value: 'success', label: 'Réussis', count: 0 },
  { value: 'failure', label: 'Échecs', count: 0 },
  { value: 'partial', label: 'Échecs partiels', count: 0 },
  { value: 'unknown', label: 'Résultat inconnu', count: 0 },
  { value: 'scheduled', label: 'Programmés', count: 0 },
  { value: 'in_flight', label: 'En vol', count: 0 },
];

/**
 * Catalogue controls.
 *
 * Writes straight to the URL: filters, sort and page are shareable and the back
 * button restores the previous list. Categories combine with AND, values inside
 * one category with OR, and every active value can be removed on its own.
 */
export function FilterBar({
  filters,
  facets,
  counts,
  total,
}: {
  filters: CatalogFilters;
  facets: FacetSet;
  counts: Record<CatalogView, number>;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? '/vols';
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(filters.q ?? '');
  const firstRender = useRef(true);

  const push = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params?.toString());
    mutate(next);
    // Any change to the result set invalidates the current page number.
    next.delete('page');
    startTransition(() => {
      router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
    });
  };

  // Debounced search, so typing does not push one navigation per keystroke.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      push((p) => {
        if (query.trim()) p.set('q', query.trim());
        else p.delete('q');
      });
    }, 320);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const toggleValue = (key: string, value: string) => {
    push((p) => {
      const current = (p.get(key)?.split(',') ?? []).filter(Boolean);
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      if (next.length) p.set(key, next.join(','));
      else p.delete(key);
    });
  };

  const chips = buildChips(filters, facets);
  const viewIndex = (['upcoming', 'past', 'all'] as CatalogView[]).indexOf(filters.view);

  return (
    <div className={clsx('flex flex-col gap-4 transition-opacity duration-200', pending && 'opacity-70')}>
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="radiogroup"
          aria-label="Vue du catalogue"
          className="relative flex rounded-lg border border-hairline bg-surface/60 p-0.5"
        >
          <span
            aria-hidden
            className="absolute inset-y-0.5 left-0.5 rounded-md bg-surface-2 transition-transform duration-300"
            style={{
              width: 'calc((100% - 4px) / 3)',
              transform: `translateX(${viewIndex * 100}%)`,
              transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
            }}
          />
          {(['upcoming', 'past', 'all'] as CatalogView[]).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={filters.view === v}
              onClick={() =>
                push((p) => {
                  if (v === 'all') p.delete('vue');
                  else p.set('vue', v);
                  // The default sort differs per view; drop an explicit one.
                  p.delete('tri');
                })
              }
              className={clsx(
                'relative z-10 flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs transition-colors duration-200',
                filters.view === v ? 'text-ink' : 'text-ink-4 hover:text-ink-2',
              )}
            >
              {VIEW_LABEL[v]}
              <span className="font-mono text-[10px] tabular text-ink-4">{counts[v]}</span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[16rem] flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mission, alias, numéro de booster, charge utile…"
            aria-label="Rechercher dans le catalogue"
            className={clsx(
              'w-full rounded-lg border border-hairline bg-surface/60 px-3 py-1.5 pr-8 text-xs text-ink',
              'outline-none transition-colors duration-200 placeholder:text-ink-4',
              'hover:border-hairline-2 focus:border-ion/40',
            )}
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
            <option value="date_desc">Date décroissante</option>
            <option value="date_asc">Date croissante</option>
            <option value="name_asc">Nom (A→Z)</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={clsx(
            'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors duration-200 active:scale-[0.98]',
            open || chips.length
              ? 'border-ion/40 bg-ion-wash text-ink'
              : 'border-hairline bg-surface/60 text-ink-3 hover:border-hairline-2 hover:text-ink-2',
          )}
        >
          Filtres
          {chips.length ? (
            <span className="font-mono text-[10px] tabular text-ion">{chips.length}</span>
          ) : null}
          <span aria-hidden className={clsx('transition-transform duration-300', open && 'rotate-180')}>
            ▾
          </span>
        </button>
      </div>

      {chips.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <button
              key={`${c.key}-${c.value}`}
              type="button"
              onClick={() => (c.key === 'q' ? setQuery('') : push((p) => removeValue(p, c.key, c.value)))}
              className="group flex items-center gap-1.5 rounded-full border border-hairline-2 bg-surface-2 py-0.5 pl-2.5 pr-1.5 text-[11px] text-ink-2 transition-colors hover:border-fail/40 hover:text-ink"
            >
              <span className="font-mono text-[9px] uppercase tracking-wider text-ink-4">{c.category}</span>
              <span className="max-w-[14rem] truncate">{c.label}</span>
              <span aria-hidden className="text-ink-4 transition-colors group-hover:text-fail">
                ×
              </span>
              <span className="sr-only">Retirer ce filtre</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setQuery('');
              startTransition(() =>
                router.replace(filters.view === 'all' ? '/vols' : `/vols?vue=${filters.view}`, {
                  scroll: false,
                }),
              );
            }}
            className="ml-1 text-[11px] text-ink-3 underline underline-offset-4 transition-colors hover:text-fail"
          >
            Tout réinitialiser
          </button>
        </div>
      ) : null}

      {open ? (
        <div className="rise grid gap-6 rounded-xl border border-hairline bg-surface/40 p-5 md:grid-cols-2 lg:grid-cols-3">
          <DateRange
            from={filters.from}
            to={filters.to}
            onChange={(from, to) =>
              push((p) => {
                if (from) p.set('du', from);
                else p.delete('du');
                if (to) p.set('au', to);
                else p.delete('au');
              })
            }
          />
          <FacetGroup
            title="Famille de lanceur"
            items={facets.families}
            selected={filters.families ?? []}
            onToggle={(v) => toggleValue('famille', v)}
          />
          <FacetGroup
            title="Statut ou résultat"
            items={OUTCOME_FACETS}
            selected={filters.outcomes ?? []}
            hideCounts
            onToggle={(v) => toggleValue('resultat', v)}
          />
          <FacetGroup
            title="Site de lancement"
            items={facets.locations}
            selected={(filters.locations ?? []).map(String)}
            onToggle={(v) => toggleValue('site', v)}
          />
          <FacetGroup
            title="Pas de tir"
            items={facets.pads}
            selected={(filters.pads ?? []).map(String)}
            onToggle={(v) => toggleValue('pas', v)}
          />
          <FacetGroup
            title="Type de mission"
            items={facets.missionTypes}
            selected={filters.missionTypes ?? []}
            onToggle={(v) => toggleValue('type', v)}
          />
          <FacetGroup
            title="Programme"
            items={facets.programs}
            selected={(filters.programs ?? []).map(String)}
            onToggle={(v) => toggleValue('programme', v)}
            limit={10}
          />
          <FacetGroup
            title="Organisation"
            items={facets.agencies}
            selected={(filters.agencies ?? []).map(String)}
            onToggle={(v) => toggleValue('organisation', v)}
            limit={10}
          />
          <FacetGroup
            title="Équipage"
            items={[
              { value: 'yes', label: 'Vol habité', count: 0 },
              { value: 'no', label: 'Sans équipage', count: 0 },
            ]}
            selected={filters.crewed ? [filters.crewed] : []}
            hideCounts
            onToggle={(v) =>
              push((p) => {
                if (p.get('equipage') === v) p.delete('equipage');
                else p.set('equipage', v);
              })
            }
          />
        </div>
      ) : null}

      <p className="text-[11px] text-ink-3" aria-live="polite">
        <span className="font-mono tabular text-ink-2">{total}</span> vol{total > 1 ? 's' : ''} dans le
        catalogue
        {chips.length ? ' pour ces filtres' : ''}. Les filtres et la recherche portent sur l&apos;ensemble du
        catalogue, pas seulement sur la page affichée.
      </p>
    </div>
  );
}

function removeValue(p: URLSearchParams, key: string, value: string) {
  if (key === 'du' || key === 'au' || key === 'equipage' || key === 'q') {
    p.delete(key);
    return;
  }
  const next = (p.get(key)?.split(',') ?? []).filter((v) => v && v !== value);
  if (next.length) p.set(key, next.join(','));
  else p.delete(key);
  p.delete('page');
}

function FacetGroup({
  title,
  items,
  selected,
  onToggle,
  limit = 8,
  hideCounts = false,
}: {
  title: string;
  items: Array<{ value: string; label: string; count: number }>;
  selected: string[];
  onToggle: (value: string) => void;
  limit?: number;
  hideCounts?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return null;
  const shown = expanded ? items : items.slice(0, limit);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">{title}</legend>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((f) => {
          const active = selected.includes(f.value);
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(f.value)}
              className={clsx(
                'flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-all duration-200 active:scale-[0.97]',
                active
                  ? 'border-ion/45 bg-ion-wash text-ink'
                  : 'border-hairline bg-surface/50 text-ink-3 hover:border-hairline-2 hover:text-ink-2',
              )}
            >
              <span className="max-w-[15rem] truncate">{f.label}</span>
              {!hideCounts ? (
                <span className="font-mono text-[9px] tabular text-ink-4">{f.count}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      {items.length > limit ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start text-[10px] text-ink-4 underline underline-offset-4 transition-colors hover:text-ion"
        >
          {expanded ? 'Réduire' : `${items.length - limit} de plus`}
        </button>
      ) : null}
    </fieldset>
  );
}

function DateRange({
  from,
  to,
  onChange,
}: {
  from?: string;
  to?: string;
  onChange: (from?: string, to?: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Période</legend>
      <div className="flex items-center gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[10px] text-ink-4">Du</span>
          <input
            type="date"
            defaultValue={from ?? ''}
            onChange={(e) => onChange(e.target.value || undefined, to)}
            className="rounded-md border border-hairline bg-surface/60 px-2 py-1 text-[11px] text-ink outline-none transition-colors hover:border-hairline-2 focus:border-ion/40"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[10px] text-ink-4">Au</span>
          <input
            type="date"
            defaultValue={to ?? ''}
            onChange={(e) => onChange(from, e.target.value || undefined)}
            className="rounded-md border border-hairline bg-surface/60 px-2 py-1 text-[11px] text-ink outline-none transition-colors hover:border-hairline-2 focus:border-ion/40"
          />
        </label>
      </div>
      <p className="text-[10px] leading-relaxed text-ink-4">
        Une période retient aussi les dates approximatives dont l&apos;intervalle la chevauche.
      </p>
    </fieldset>
  );
}

function buildChips(f: CatalogFilters, facets: FacetSet) {
  const label = (items: Array<{ value: string; label: string }>, v: string) =>
    items.find((i) => i.value === v)?.label ?? v;

  const chips: Array<{ key: string; value: string; category: string; label: string }> = [];
  if (f.q) chips.push({ key: 'q', value: f.q, category: 'Recherche', label: f.q });
  for (const v of f.families ?? []) chips.push({ key: 'famille', value: v, category: 'Lanceur', label: v });
  for (const v of f.outcomes ?? [])
    chips.push({ key: 'resultat', value: v, category: 'Statut', label: label(OUTCOME_FACETS, v) });
  for (const v of f.locations ?? [])
    chips.push({
      key: 'site',
      value: String(v),
      category: 'Site',
      label: label(facets.locations, String(v)),
    });
  for (const v of f.pads ?? [])
    chips.push({
      key: 'pas',
      value: String(v),
      category: 'Pas de tir',
      label: label(facets.pads, String(v)),
    });
  for (const v of f.missionTypes ?? []) chips.push({ key: 'type', value: v, category: 'Mission', label: v });
  for (const v of f.programs ?? [])
    chips.push({
      key: 'programme',
      value: String(v),
      category: 'Programme',
      label: label(facets.programs, String(v)),
    });
  for (const v of f.agencies ?? [])
    chips.push({
      key: 'organisation',
      value: String(v),
      category: 'Organisation',
      label: label(facets.agencies, String(v)),
    });
  if (f.crewed)
    chips.push({
      key: 'equipage',
      value: f.crewed,
      category: 'Équipage',
      label: f.crewed === 'yes' ? 'Vol habité' : 'Sans équipage',
    });
  if (f.from) chips.push({ key: 'du', value: f.from, category: 'Depuis', label: f.from });
  if (f.to) chips.push({ key: 'au', value: f.to, category: "Jusqu'au", label: f.to });
  return chips;
}
