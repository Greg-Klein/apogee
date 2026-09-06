import { describe, it, expect } from 'vitest';
import {
  phaseOf,
  outcomeOf,
  recoveryOf,
  RECOVERY_LABEL,
  OUTCOME_LABEL,
  OUTCOME_SHORT,
  type LaunchPhase,
  type LaunchOutcome,
  type RecoveryResult,
} from '@/lib/domain/status';

// LL2 status ids, stable across the 2.x API.
const GO = 1;
const TBD = 2;
const SUCCESS = 3;
const FAILURE = 4;
const HOLD = 5;
const IN_FLIGHT = 6;
const PARTIAL_FAILURE = 7;
const TBC = 8;
const UNKNOWN_ID = 99;

describe('phaseOf', () => {
  it.each([
    [GO, 'scheduled'],
    [TBD, 'scheduled'],
    [SUCCESS, 'flown'],
    [FAILURE, 'flown'],
    [HOLD, 'scheduled'],
    [IN_FLIGHT, 'in_flight'],
    [PARTIAL_FAILURE, 'flown'],
    [TBC, 'scheduled'],
    [UNKNOWN_ID, 'scheduled'],
  ] as const)('status %i -> phase %s', (id, phase) => {
    expect(phaseOf(id)).toBe(phase);
  });
});

describe('outcomeOf', () => {
  it.each([
    [GO, 'unknown'],
    [TBD, 'unknown'],
    [SUCCESS, 'success'],
    [FAILURE, 'failure'],
    [HOLD, 'unknown'],
    [IN_FLIGHT, 'unknown'],
    [PARTIAL_FAILURE, 'partial'],
    [TBC, 'unknown'],
    [UNKNOWN_ID, 'unknown'],
  ] as const)('status %i -> outcome %s', (id, outcome) => {
    expect(outcomeOf(id)).toBe(outcome);
  });
});

describe('invariant: a scheduled phase never yields a resolved outcome', () => {
  it('every status id whose phase is "scheduled" has outcome "unknown"', () => {
    const allIds = [GO, TBD, SUCCESS, FAILURE, HOLD, IN_FLIGHT, PARTIAL_FAILURE, TBC, UNKNOWN_ID];
    for (const id of allIds) {
      if (phaseOf(id) === 'scheduled') {
        expect(outcomeOf(id)).toBe('unknown');
      }
    }
  });

  it('a passed target time (TBC/GO/HOLD/TBD) cannot itself produce a success', () => {
    // These ids represent scheduling states, some of which describe a target that may
    // already be in the past; none of them may resolve to a flight outcome.
    for (const id of [GO, TBD, HOLD, TBC]) {
      expect(phaseOf(id)).toBe('scheduled');
      expect(outcomeOf(id)).toBe('unknown');
      expect(outcomeOf(id)).not.toBe('success');
    }
  });
});

describe('recoveryOf', () => {
  it('no landing record -> undocumented, regardless of attempt/success', () => {
    expect(recoveryOf(false, null, null)).toBe('undocumented');
    expect(recoveryOf(false, true, true)).toBe('undocumented');
  });

  it('attempt: false -> no_attempt (never treated as a failure)', () => {
    const result = recoveryOf(true, false, null);
    expect(result).toBe('no_attempt');
    expect(result).not.toBe('failure');
  });

  it('attempt: true, success: true -> success', () => {
    expect(recoveryOf(true, true, true)).toBe('success');
  });

  it('attempt: true, success: false -> failure', () => {
    expect(recoveryOf(true, true, false)).toBe('failure');
  });

  it('attempt: true, success: null -> attempted_unknown', () => {
    expect(recoveryOf(true, true, null)).toBe('attempted_unknown');
  });

  it('attempt: null, success: true -> success', () => {
    expect(recoveryOf(true, null, true)).toBe('success');
  });
});

describe('label completeness', () => {
  it('every RecoveryResult has a RECOVERY_LABEL entry', () => {
    const members: RecoveryResult[] = [
      'success',
      'failure',
      'no_attempt',
      'attempted_unknown',
      'undocumented',
    ];
    for (const m of members) {
      expect(RECOVERY_LABEL[m]).toBeTypeOf('string');
      expect(RECOVERY_LABEL[m].length).toBeGreaterThan(0);
    }
    expect(Object.keys(RECOVERY_LABEL).sort()).toEqual(members.slice().sort());
  });

  it('every LaunchOutcome has an OUTCOME_LABEL and OUTCOME_SHORT entry', () => {
    const members: LaunchOutcome[] = ['success', 'failure', 'partial', 'unknown'];
    for (const m of members) {
      expect(OUTCOME_LABEL[m]).toBeTypeOf('string');
      expect(OUTCOME_SHORT[m]).toBeTypeOf('string');
    }
    expect(Object.keys(OUTCOME_LABEL).sort()).toEqual(members.slice().sort());
    expect(Object.keys(OUTCOME_SHORT).sort()).toEqual(members.slice().sort());
  });
});

// Type-level sanity: ensures LaunchPhase stays the 3-member union the tests assume.
const _phaseCheck: LaunchPhase[] = ['scheduled', 'in_flight', 'flown'];
void _phaseCheck;
