import { clsx } from '@/lib/clsx';
import {
  OUTCOME_LABEL,
  OUTCOME_SHORT,
  RECOVERY_LABEL,
  SCHEDULE_LABEL,
  type LaunchOutcome,
  type LaunchPhase,
  type RecoveryResult,
} from '@/lib/domain/status';

/**
 * Status pills.
 *
 * Colour is an aid, not the signal: each pill carries a glyph and a written label
 * so the state survives a monochrome screen or a colour-vision difference.
 */

type Tone = 'go' | 'warn' | 'fail' | 'neutral' | 'ion';

const TONE: Record<Tone, string> = {
  go: 'border-go/30 bg-go/10 text-go',
  warn: 'border-warn/30 bg-warn/10 text-warn',
  fail: 'border-fail/30 bg-fail/10 text-fail',
  ion: 'border-ion/30 bg-ion/10 text-ion',
  neutral: 'border-hairline-2 bg-surface-2 text-ink-2',
};

const GLYPH: Record<Tone, string> = {
  go: '●', // filled circle
  warn: '▲', // triangle
  fail: '✕', // cross
  ion: '◆', // diamond
  neutral: '○', // hollow circle
};

export function Pill({
  tone = 'neutral',
  children,
  title,
  className,
  pulse = false,
}: {
  tone?: Tone;
  children: React.ReactNode;
  title?: string;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span
      title={title}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5',
        'font-mono text-[10px] uppercase tracking-wider whitespace-nowrap',
        TONE[tone],
        className,
      )}
    >
      <span aria-hidden className={clsx('text-[7px] leading-none', pulse && 'breathe')}>
        {GLYPH[tone]}
      </span>
      {children}
    </span>
  );
}

const OUTCOME_TONE: Record<LaunchOutcome, Tone> = {
  success: 'go',
  failure: 'fail',
  partial: 'warn',
  unknown: 'neutral',
};

/** The scheduling / outcome axis. Never mixed with recovery. */
export function LaunchStatusPill({
  phase,
  outcome,
  statusId,
  statusName,
  short = false,
}: {
  phase: LaunchPhase;
  outcome: LaunchOutcome;
  statusId: number;
  statusName: string;
  short?: boolean;
}) {
  if (phase === 'flown') {
    return (
      <Pill tone={OUTCOME_TONE[outcome]} title={OUTCOME_LABEL[outcome]}>
        {short ? OUTCOME_SHORT[outcome] : OUTCOME_LABEL[outcome]}
      </Pill>
    );
  }
  if (phase === 'in_flight') {
    return (
      <Pill tone="ion" pulse title="Vol en cours, résultat non publié">
        En vol
      </Pill>
    );
  }
  const label = SCHEDULE_LABEL[statusId] ?? statusName;
  const tone: Tone = statusId === 1 ? 'go' : statusId === 5 ? 'warn' : 'neutral';
  return (
    <Pill tone={tone} title={`Statut source : ${statusName}`}>
      {label}
    </Pill>
  );
}

const RECOVERY_TONE: Record<RecoveryResult, Tone> = {
  success: 'go',
  failure: 'fail',
  no_attempt: 'neutral',
  attempted_unknown: 'warn',
  undocumented: 'neutral',
};

/** Recovery of one physical article. A launch can succeed while this fails. */
export function RecoveryPill({ recovery, short = false }: { recovery: RecoveryResult; short?: boolean }) {
  const SHORT: Record<RecoveryResult, string> = {
    success: 'Récupéré',
    failure: 'Perdu',
    no_attempt: 'Sans tentative',
    attempted_unknown: 'Non publié',
    undocumented: 'Non documenté',
  };
  return (
    <Pill tone={RECOVERY_TONE[recovery]} title={RECOVERY_LABEL[recovery]}>
      {short ? SHORT[recovery] : RECOVERY_LABEL[recovery]}
    </Pill>
  );
}
