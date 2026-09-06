'use client';

import { useEffect, useState } from 'react';
import { clsx } from '@/lib/clsx';

/**
 * Countdown to a target instant.
 *
 * Only mounted when the source gives a time precise enough to count down to.
 * Ticking is local: it never re-queries the source. At zero it switches to
 * "en attente de confirmation" rather than declaring the launch flown, because
 * a passed target time proves nothing about what happened.
 */
export function Countdown({
  targetIso,
  provisional,
  confirmed,
  className,
}: {
  targetIso: string;
  /** True when the target time is still provisional (TBD/TBC/hold). */
  provisional: boolean;
  /** True once the source says the vehicle has actually left the pad. */
  confirmed: boolean;
  className?: string;
}) {
  const target = Date.parse(targetIso);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (Number.isNaN(target)) return;
    const tick = () => setRemaining(target - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (Number.isNaN(target)) return null;

  // Server render and first client paint agree on a neutral placeholder.
  if (remaining === null) {
    return (
      <div className={clsx('flex gap-2', className)} aria-hidden>
        {['J', 'H', 'M', 'S'].map((u) => (
          <Cell key={u} value="--" unit={u} />
        ))}
      </div>
    );
  }

  if (remaining <= 0) {
    return (
      <div className={clsx('flex flex-col gap-1', className)}>
        <span className="font-mono text-lg tracking-tight text-ink">
          {confirmed ? 'Décollage confirmé' : 'En attente de confirmation'}
        </span>
        <span className="text-[11px] leading-snug text-ink-3">
          {confirmed
            ? "Le décollage est confirmé par la source. Le résultat s'affiche dès sa publication."
            : "L'heure cible est dépassée. La source n'a pas encore confirmé le décollage."}
        </span>
      </div>
    );
  }

  const s = Math.floor(remaining / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <div className="flex gap-2" role="timer" aria-live="off">
        <Cell value={String(days)} unit="jours" />
        <Cell value={pad(hours)} unit="heures" />
        <Cell value={pad(minutes)} unit="min" />
        <Cell value={pad(seconds)} unit="sec" highlight />
      </div>
      {provisional ? (
        <span className="text-[11px] leading-snug text-warn/90">
          Indicatif : l&apos;heure cible est encore provisoire et peut être recalculée.
        </span>
      ) : null}
    </div>
  );
}

function Cell({ value, unit, highlight = false }: { value: string; unit: string; highlight?: boolean }) {
  return (
    <div
      className={clsx(
        'flex min-w-[3.6rem] flex-col items-center gap-0.5 rounded-lg border px-2.5 py-2',
        highlight ? 'border-ion/25 bg-ion-wash' : 'border-hairline bg-surface/70',
      )}
    >
      <span
        suppressHydrationWarning
        className={clsx('font-mono text-xl leading-none tabular', highlight ? 'text-ion' : 'text-ink')}
      >
        {value}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-widest text-ink-4">{unit}</span>
    </div>
  );
}
