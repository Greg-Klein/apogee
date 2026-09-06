import { describe, it, expect } from 'vitest';
import {
  formatLaunchDate,
  formatLaunchDateShort,
  formatDuration,
  formatRelative,
  formatMass,
  formatKm,
  ordinalFr,
  PRECISION_BADGE,
  PRECISION_NOTE,
  UTC,
  type DateShape,
} from '@/lib/domain/format';
import type { PrecisionKind } from '@/lib/domain/precision';

const PARIS = 'Europe/Paris';

describe('formatLaunchDate / formatLaunchDateShort per PrecisionKind', () => {
  describe('instant (CEST, non-zero UTC offset)', () => {
    const shape: DateShape = { kind: 'instant', lo: Date.UTC(2026, 5, 15, 10, 0, 0), hi: null };

    it('renders day, month, year and clock time in UTC', () => {
      expect(formatLaunchDate(shape, UTC)).toBe('lun 15 juin 2026, 10:00');
      expect(formatLaunchDateShort(shape, UTC)).toBe('15.06.2026 10:00');
    });

    it('shifts the displayed hour in Europe/Paris relative to UTC', () => {
      expect(formatLaunchDate(shape, PARIS)).toBe('lun 15 juin 2026, 12:00');
      expect(formatLaunchDateShort(shape, PARIS)).toBe('15.06.2026 12:00');
    });
  });

  describe('unrecorded behaves like instant', () => {
    const shape: DateShape = { kind: 'unrecorded', lo: Date.UTC(2026, 5, 15, 10, 0, 0), hi: null };
    it('renders a clock time', () => {
      expect(formatLaunchDate(shape, UTC)).toBe('lun 15 juin 2026, 10:00');
      expect(formatLaunchDateShort(shape, UTC)).toBe('15.06.2026 10:00');
    });
  });

  describe('day', () => {
    const shape: DateShape = { kind: 'day', lo: Date.UTC(2026, 6, 15), hi: null };

    it('renders a day number but no clock time, in UTC', () => {
      const full = formatLaunchDate(shape, UTC);
      const short = formatLaunchDateShort(shape, UTC);
      expect(full).toBe('mer 15 juillet 2026');
      expect(short).toBe('15.07.2026');
      expect(full).not.toMatch(/:/);
      expect(short).not.toMatch(/:/);
    });

    it('renders the same calendar day in Europe/Paris (midnight UTC does not roll the date)', () => {
      expect(formatLaunchDate(shape, PARIS)).toBe('mer 15 juillet 2026');
      expect(formatLaunchDateShort(shape, PARIS)).toBe('15.07.2026');
    });
  });

  describe('month: no day number, no clock time', () => {
    const shape: DateShape = { kind: 'month', lo: Date.UTC(2026, 6, 1), hi: null };
    it('renders month + year only', () => {
      const full = formatLaunchDate(shape, UTC);
      const short = formatLaunchDateShort(shape, UTC);
      expect(full).toBe('juillet 2026');
      expect(short).toBe('07.2026');
      expect(full).not.toMatch(/:/);
      expect(full).not.toMatch(/^\d{1,2}\s/);
    });
  });

  describe('quarter: no day number, no clock time', () => {
    const shape: DateShape = { kind: 'quarter', lo: Date.UTC(2026, 6, 1), hi: null };
    it('renders the quarter label + year', () => {
      const full = formatLaunchDate(shape, UTC);
      const short = formatLaunchDateShort(shape, UTC);
      expect(full).toBe('T3 2026');
      expect(short).toBe('T3 2026');
      expect(full).not.toMatch(/:/);
    });
  });

  describe('half: no day number, no clock time', () => {
    const shape: DateShape = { kind: 'half', lo: Date.UTC(2026, 6, 1), hi: null };
    it('renders the half label + year', () => {
      const full = formatLaunchDate(shape, UTC);
      const short = formatLaunchDateShort(shape, UTC);
      expect(full).toBe('2e semestre 2026');
      expect(short).toBe('S2 2026');
      expect(full).not.toMatch(/:/);
    });
  });

  describe('year: no day number, no clock time', () => {
    const shape: DateShape = { kind: 'year', lo: Date.UTC(2026, 0, 1), hi: null };
    it('renders the year only', () => {
      const full = formatLaunchDate(shape, UTC);
      const short = formatLaunchDateShort(shape, UTC);
      expect(full).toBe('Courant 2026');
      expect(short).toBe('2026');
      expect(full).not.toMatch(/:/);
    });
  });

  describe('decade: no day number, no clock time', () => {
    const shape: DateShape = { kind: 'decade', lo: Date.UTC(2020, 0, 1), hi: null };
    it('renders the decade only', () => {
      const full = formatLaunchDate(shape, UTC);
      const short = formatLaunchDateShort(shape, UTC);
      expect(full).toBe('Années 2020');
      expect(short).toBe('2020s');
      expect(full).not.toMatch(/:/);
    });
  });

  describe('lo: null', () => {
    const shape: DateShape = { kind: 'unknown', lo: null, hi: null };
    it('renders the "not provided" placeholders', () => {
      expect(formatLaunchDate(shape, UTC)).toBe('Date non renseignée');
      expect(formatLaunchDateShort(shape, UTC)).toBe('—');
    });
  });

  describe('unrecognised kind with a non-null lo falls back to the placeholder', () => {
    const shape: DateShape = { kind: 'unknown', lo: Date.UTC(2026, 0, 1), hi: null };
    it('does not invent a date', () => {
      expect(formatLaunchDate(shape, UTC)).toBe('Date non renseignée');
      expect(formatLaunchDateShort(shape, UTC)).toBe('—');
    });
  });
});

describe('formatDuration', () => {
  it('P41DT13H35M30S -> caps at the two most significant units (days, hours)', () => {
    expect(formatDuration('P41DT13H35M30S')).toBe('41 j 13 h');
  });

  it('P197DT15H34M45.714887S -> caps at days + hours, drops minutes/seconds', () => {
    expect(formatDuration('P197DT15H34M45.714887S')).toBe('197 j 15 h');
  });

  it('PT35M -> minutes only', () => {
    expect(formatDuration('PT35M')).toBe('35 min');
  });

  it('P1Y2M -> years + months are never capped', () => {
    expect(formatDuration('P1Y2M')).toBe('1 an 2 mois');
  });

  it('null -> null', () => {
    expect(formatDuration(null)).toBeNull();
  });

  it('a malformed duration string -> null', () => {
    expect(formatDuration('not-a-duration')).toBeNull();
  });

  it('renders a seconds-only duration rather than dropping it', () => {
    expect(formatDuration('PT45S')).toBe('45 s');
  });

  it('omits seconds once a coarser unit is available', () => {
    expect(formatDuration('PT35M12S')).toBe('35 min');
  });
});

describe('formatRelative', () => {
  it('negative offset without an hours component', () => {
    expect(formatRelative(-2280)).toBe('T-38:00');
  });

  it('positive offset with an hours component', () => {
    expect(formatRelative(3600)).toBe('T+1:00:00');
  });

  it('negative offset with an hours component', () => {
    expect(formatRelative(-3661)).toBe('T-1:01:01');
  });

  it('positive offset without an hours component', () => {
    expect(formatRelative(90)).toBe('T+01:30');
  });
});

describe('formatMass', () => {
  it('below 1000 kg renders in kg', () => {
    expect(formatMass(500)).toBe('500 kg');
  });

  it('exactly 1000 kg renders as 1 t', () => {
    expect(formatMass(1000)).toBe('1 t');
  });

  it('above 1000 kg renders in tonnes', () => {
    expect(formatMass(2500)).toBe('2,5 t');
  });

  it('null/undefined -> null', () => {
    expect(formatMass(null)).toBeNull();
    expect(formatMass(undefined)).toBeNull();
  });
});

describe('formatKm', () => {
  it('renders a rounded km value', () => {
    expect(formatKm(525)).toBe('525 km');
  });

  it('null/undefined -> null', () => {
    expect(formatKm(null)).toBeNull();
    expect(formatKm(undefined)).toBeNull();
  });
});

describe('ordinalFr', () => {
  it('1 -> 1er', () => {
    expect(ordinalFr(1)).toBe('1er');
  });

  it('2 -> 2e', () => {
    expect(ordinalFr(2)).toBe('2e');
  });

  it('21 -> 21e', () => {
    expect(ordinalFr(21)).toBe('21e');
  });
});

describe('PRECISION_BADGE / PRECISION_NOTE completeness', () => {
  const kinds: Array<PrecisionKind | 'unknown'> = [
    'instant',
    'day',
    'month',
    'quarter',
    'half',
    'year',
    'decade',
    'unrecorded',
    'unknown',
  ];

  it('every PrecisionKind plus "unknown" has a PRECISION_BADGE entry', () => {
    for (const k of kinds) {
      expect(Object.prototype.hasOwnProperty.call(PRECISION_BADGE, k)).toBe(true);
    }
    expect(Object.keys(PRECISION_BADGE).sort()).toEqual(kinds.slice().sort());
  });

  it('every PrecisionKind plus "unknown" has a PRECISION_NOTE entry', () => {
    for (const k of kinds) {
      expect(Object.prototype.hasOwnProperty.call(PRECISION_NOTE, k)).toBe(true);
    }
    expect(Object.keys(PRECISION_NOTE).sort()).toEqual(kinds.slice().sort());
  });
});
