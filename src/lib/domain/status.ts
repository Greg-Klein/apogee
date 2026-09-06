/**
 * Launch status handling.
 *
 * The brief draws a hard line between scheduling state and flight outcome: a target
 * time that has passed never turns a launch into a flown one, and a successful launch
 * says nothing about recovery. `phase` answers "has it left the pad", `outcome`
 * answers "how did the ascent end", and neither is derived from the clock.
 */

export type LaunchPhase = 'scheduled' | 'in_flight' | 'flown';
export type LaunchOutcome = 'success' | 'failure' | 'partial' | 'unknown';

/** LL2 status ids, stable across the 2.x API. */
const STATUS = {
  GO: 1,
  TBD: 2,
  SUCCESS: 3,
  FAILURE: 4,
  HOLD: 5,
  IN_FLIGHT: 6,
  PARTIAL_FAILURE: 7,
  TBC: 8,
} as const;

export function phaseOf(statusId: number): LaunchPhase {
  switch (statusId) {
    case STATUS.SUCCESS:
    case STATUS.FAILURE:
    case STATUS.PARTIAL_FAILURE:
      return 'flown';
    case STATUS.IN_FLIGHT:
      return 'in_flight';
    default:
      return 'scheduled';
  }
}

/** Outcome of the ascent only. `unknown` for anything not yet resolved by the source. */
export function outcomeOf(statusId: number): LaunchOutcome {
  switch (statusId) {
    case STATUS.SUCCESS:
      return 'success';
    case STATUS.FAILURE:
      return 'failure';
    case STATUS.PARTIAL_FAILURE:
      return 'partial';
    default:
      return 'unknown';
  }
}

/** French labels. Source wording is kept when its functional meaning is uncertain. */
export const SCHEDULE_LABEL: Record<number, string> = {
  [STATUS.GO]: 'Go pour le lancement',
  [STATUS.TBD]: 'Date à confirmer',
  [STATUS.HOLD]: 'Suspendu',
  [STATUS.TBC]: 'Date provisoire',
  [STATUS.IN_FLIGHT]: 'En vol',
};

export const OUTCOME_LABEL: Record<LaunchOutcome, string> = {
  success: 'Lancement réussi',
  failure: 'Échec du lancement',
  partial: 'Échec partiel',
  unknown: 'Résultat inconnu',
};

export const OUTCOME_SHORT: Record<LaunchOutcome, string> = {
  success: 'Réussi',
  failure: 'Échec',
  partial: 'Partiel',
  unknown: 'Inconnu',
};

/** Recovery is a separate axis: no attempt is not a failure. */
export type RecoveryResult = 'success' | 'failure' | 'no_attempt' | 'attempted_unknown' | 'undocumented';

export function recoveryOf(
  hasLandingRecord: boolean,
  attempt: boolean | null,
  success: boolean | null,
): RecoveryResult {
  if (!hasLandingRecord) return 'undocumented';
  if (attempt === false) return 'no_attempt';
  if (success === true) return 'success';
  if (success === false) return 'failure';
  return 'attempted_unknown';
}

export const RECOVERY_LABEL: Record<RecoveryResult, string> = {
  success: 'Récupéré',
  failure: 'Récupération échouée',
  no_attempt: 'Pas de tentative de récupération',
  attempted_unknown: 'Tentative, résultat non publié',
  undocumented: 'Récupération non documentée',
};
