import type { ReactNode } from 'react';
import { clsx } from '@/lib/clsx';

/** Small uppercase label used to title a data block. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={clsx('font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3', className)}>
      {children}
    </span>
  );
}

/**
 * A labelled value. Renders the label even when the value is missing so the
 * absence itself is visible, per the brief's rule on incomplete blocks.
 */
export function Field({
  label,
  value,
  hint,
  mono = false,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  mono?: boolean;
  className?: string;
}) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <Eyebrow>{label}</Eyebrow>
      <span
        className={clsx(
          'text-sm leading-snug',
          mono && 'font-mono tabular',
          empty ? 'text-ink-4 italic' : 'text-ink',
        )}
      >
        {empty ? 'Non renseigné' : value}
      </span>
      {hint ? <span className="text-[11px] leading-snug text-ink-3">{hint}</span> : null}
    </div>
  );
}

/** Section heading with an optional trailing action. */
export function SectionHead({
  id,
  title,
  count,
  action,
  description,
}: {
  /** Anchors the section's `aria-labelledby`, so no duplicate heading is needed. */
  id?: string;
  title: string;
  count?: number | string;
  action?: ReactNode;
  description?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-hairline pb-3">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="flex items-baseline gap-2.5 text-[15px] font-medium tracking-tight text-ink">
          {title}
          {count !== undefined ? (
            <span className="font-mono text-[11px] tabular text-ink-3">{count}</span>
          ) : null}
        </h2>
        {description ? (
          <p className="max-w-[70ch] text-xs leading-relaxed text-ink-3">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** Panel used only where elevation carries meaning; elsewhere hairlines do the grouping. */
export function Panel({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'aside';
}) {
  return (
    <Tag
      className={clsx(
        'rounded-xl border border-hairline bg-surface/60 backdrop-blur-sm',
        'shadow-[inset_0_1px_0_rgb(255_255_255/0.035)]',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-3">
      <span aria-hidden className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-ink-4" />
      <span className="max-w-[80ch]">{children}</span>
    </p>
  );
}

/** Deliberate empty state: says what is missing and why, never fabricates a value. */
export function EmptyBlock({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-hairline-2 px-4 py-6">
      <span className="text-sm text-ink-2">{title}</span>
      {hint ? <span className="max-w-[60ch] text-xs leading-relaxed text-ink-3">{hint}</span> : null}
      {action}
    </div>
  );
}
