'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { clsx } from '@/lib/clsx';

/**
 * A headline figure that opens the rows behind it.
 * The value counts up once on mount, then stays put.
 */
export function Metric({
  label,
  value,
  href,
  hint,
  suffix,
  emphasis = false,
}: {
  label: string;
  value: number;
  href?: string;
  hint?: string;
  suffix?: string;
  emphasis?: boolean;
}) {
  const display = useCountUp(value);

  const body = (
    <>
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">{label}</span>
      <span
        className={clsx(
          'font-mono leading-none tabular tracking-tight',
          emphasis ? 'text-4xl text-ink' : 'text-3xl text-ink',
        )}
      >
        {display}
        {suffix ? <span className="ml-1 text-base text-ink-3">{suffix}</span> : null}
      </span>
      {hint ? <span className="text-[11px] leading-snug text-ink-4">{hint}</span> : null}
    </>
  );

  if (!href) {
    return <div className="flex flex-col gap-2">{body}</div>;
  }
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-lg transition-colors duration-200 hover:text-ion"
    >
      {body}
      <span className="font-mono text-[10px] text-ink-4 transition-colors group-hover:text-ion">
        Voir les vols{' '}
        <span
          aria-hidden
          className="inline-block transition-transform duration-300 group-hover:translate-x-0.5"
        >
          →
        </span>
      </span>
    </Link>
  );
}

/**
 * Animates from whatever is on screen to the new target.
 *
 * Runs on every target change, not only on mount, so changing the period visibly
 * moves each figure to its new value instead of leaving the first one frozen.
 */
function useCountUp(target: number): string {
  // State starts at the target so server and client markup agree; the ref starts at
  // zero so the first effect still runs the intro count-up.
  const [n, setN] = useState(target);
  const current = useRef(0);

  useEffect(() => {
    const from = current.current;
    if (from === target) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || Math.abs(target - from) < 5) {
      current.current = target;
      setN(target);
      return;
    }

    const start = performance.now();
    const duration = 620;
    let frame = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const value = Math.round(from + (target - from) * eased);
      current.current = value;
      setN(value);
      if (p < 1) frame = requestAnimationFrame(step);
      else current.current = target;
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      current.current = target;
    };
  }, [target]);

  return n.toLocaleString('fr-FR');
}
