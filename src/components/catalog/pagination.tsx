'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { clsx } from '@/lib/clsx';

/**
 * Pagination that keeps every other parameter intact, so paging never drops a
 * filter and the resulting URL stays shareable.
 */
export function Pagination({ page, pages, total }: { page: number; pages: number; total: number }) {
  const params = useSearchParams();

  const hrefFor = (n: number) => {
    const next = new URLSearchParams(params?.toString());
    if (n <= 1) next.delete('page');
    else next.set('page', String(n));
    return next.size ? `/vols?${next}` : '/vols';
  };

  if (pages <= 1) {
    return (
      <p className="py-4 text-center font-mono text-[11px] tabular text-ink-4">
        {total} résultat{total > 1 ? 's' : ''}
      </p>
    );
  }

  const window = pageWindow(page, pages);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-4 py-5">
      <p className="font-mono text-[11px] tabular text-ink-4">
        Page {page} sur {pages} · {total} résultat{total > 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-1">
        <PageLink href={hrefFor(page - 1)} disabled={page === 1} label="Page précédente">
          ←
        </PageLink>
        {window.map((n, i) =>
          n === null ? (
            <span key={`gap-${i}`} aria-hidden className="px-1 font-mono text-[11px] text-ink-4">
              …
            </span>
          ) : (
            <PageLink key={n} href={hrefFor(n)} current={n === page} label={`Page ${n}`}>
              {n}
            </PageLink>
          ),
        )}
        <PageLink href={hrefFor(page + 1)} disabled={page === pages} label="Page suivante">
          →
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  children,
  current = false,
  disabled = false,
  label,
}: {
  href: string;
  children: React.ReactNode;
  current?: boolean;
  disabled?: boolean;
  label: string;
}) {
  const className = clsx(
    'flex min-w-[2rem] items-center justify-center rounded-md border px-2 py-1',
    'font-mono text-[11px] tabular transition-all duration-200',
    current
      ? 'border-ion/45 bg-ion-wash text-ink'
      : disabled
        ? 'cursor-not-allowed border-hairline text-ink-4 opacity-40'
        : 'border-hairline text-ink-3 hover:border-hairline-2 hover:text-ink active:scale-[0.96]',
  );

  if (disabled) {
    return (
      <span className={className} aria-disabled>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={current ? 'page' : undefined}
      className={className}
      scroll={false}
    >
      {children}
    </Link>
  );
}

/** Compact page list: first, last, and a window around the current page. */
function pageWindow(page: number, pages: number): Array<number | null> {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: Array<number | null> = [1];
  const lo = Math.max(2, page - 1);
  const hi = Math.min(pages - 1, page + 1);
  if (lo > 2) out.push(null);
  for (let n = lo; n <= hi; n += 1) out.push(n);
  if (hi < pages - 1) out.push(null);
  out.push(pages);
  return out;
}
