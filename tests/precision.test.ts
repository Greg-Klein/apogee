import { describe, it, expect } from 'vitest';
import { resolvePrecision, isInstant, type PrecisionKind } from '@/lib/domain/precision';

// Reference instant: 2026-07-15T12:34:56Z sits inside Q3 2026 / H2 2026 / the 2020s decade,
// which lets every coarse-grained label below derive its expected interval from one date.
const NET = '2026-07-15T12:34:56Z';
const T = Date.parse(NET);
const MINUTE = 60_000;

describe('resolvePrecision: recognised LL2 labels', () => {
  it.each(['Second', 'Minute', 'Hour'])('"%s" resolves to an instant at net, +1 minute wide', (label) => {
    const d = resolvePrecision(NET, label, false);
    expect(d).toEqual({ kind: 'instant', lo: T, hi: T + MINUTE, sourceLabel: label });
    expect(d!.hi).toBeGreaterThan(d!.lo);
  });

  it('"Day" resolves to the UTC calendar day containing net', () => {
    const d = resolvePrecision(NET, 'Day', false);
    const lo = Date.UTC(2026, 6, 15);
    const hi = Date.UTC(2026, 6, 16);
    expect(d).toEqual({ kind: 'day', lo, hi, sourceLabel: 'Day' });
    expect(d!.hi).toBeGreaterThan(d!.lo);
  });

  it('"Month" resolves to the full calendar month containing net', () => {
    const d = resolvePrecision(NET, 'Month', false);
    const lo = Date.UTC(2026, 6, 1); // July
    const hi = Date.UTC(2026, 7, 1); // August
    expect(d).toEqual({ kind: 'month', lo, hi, sourceLabel: 'Month' });
    expect(d!.hi).toBeGreaterThan(d!.lo);
  });

  it.each([
    ['Quarter 1', Date.UTC(2026, 0, 1), Date.UTC(2026, 3, 1)],
    ['Quarter 2', Date.UTC(2026, 3, 1), Date.UTC(2026, 6, 1)],
    ['Quarter 3', Date.UTC(2026, 6, 1), Date.UTC(2026, 9, 1)],
    ['Quarter 4', Date.UTC(2026, 9, 1), Date.UTC(2027, 0, 1)],
  ] as const)('"%s" resolves to the matching calendar quarter of 2026', (label, lo, hi) => {
    const d = resolvePrecision(NET, label, false);
    expect(d).toEqual({ kind: 'quarter', lo, hi, sourceLabel: label });
    expect(d!.hi).toBeGreaterThan(d!.lo);
  });

  it('Quarter 3 of 2026 is exactly 2026-07-01T00:00:00Z .. 2026-10-01T00:00:00Z', () => {
    const d = resolvePrecision(NET, 'Quarter 3', false);
    expect(d!.lo).toBe(Date.UTC(2026, 6, 1));
    expect(d!.hi).toBe(Date.UTC(2026, 9, 1));
    expect(new Date(d!.lo).toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(new Date(d!.hi).toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });

  it.each([
    ['Year Half 1', Date.UTC(2026, 0, 1), Date.UTC(2026, 6, 1)],
    ['Year Half 2', Date.UTC(2026, 6, 1), Date.UTC(2027, 0, 1)],
  ] as const)('"%s" resolves to the matching half of 2026', (label, lo, hi) => {
    const d = resolvePrecision(NET, label, false);
    expect(d).toEqual({ kind: 'half', lo, hi, sourceLabel: label });
    expect(d!.hi).toBeGreaterThan(d!.lo);
  });

  it.each(['Year', 'Fiscal Year'])('"%s" resolves to the full calendar year', (label) => {
    const d = resolvePrecision(NET, label, false);
    const lo = Date.UTC(2026, 0, 1);
    const hi = Date.UTC(2027, 0, 1);
    expect(d).toEqual({ kind: 'year', lo, hi, sourceLabel: label });
    expect(d!.hi).toBeGreaterThan(d!.lo);
  });

  it('"Decade" resolves to the containing decade', () => {
    const d = resolvePrecision(NET, 'Decade', false);
    const lo = Date.UTC(2020, 0, 1);
    const hi = Date.UTC(2030, 0, 1);
    expect(d).toEqual({ kind: 'decade', lo, hi, sourceLabel: 'Decade' });
    expect(d!.hi).toBeGreaterThan(d!.lo);
  });
});

describe('resolvePrecision: null precision', () => {
  it('null precision + hasFlown true -> unrecorded, lo equals parsed net', () => {
    const d = resolvePrecision(NET, null, true);
    expect(d).toEqual({ kind: 'unrecorded', lo: T, hi: T + MINUTE, sourceLabel: null });
  });

  it('null precision + hasFlown false -> year, widened to the whole year', () => {
    const d = resolvePrecision(NET, null, false);
    expect(d).toEqual({
      kind: 'year',
      lo: Date.UTC(2026, 0, 1),
      hi: Date.UTC(2027, 0, 1),
      sourceLabel: null,
    });
  });
});

describe('resolvePrecision: invalid net', () => {
  it('net null -> null', () => {
    expect(resolvePrecision(null, 'Day', true)).toBeNull();
  });

  it('unparseable net string -> null', () => {
    expect(resolvePrecision('not-a-date', 'Day', true)).toBeNull();
  });
});

describe('resolvePrecision: unrecognised label', () => {
  it('falls back to kind "year" and keeps the original string in sourceLabel', () => {
    const d = resolvePrecision(NET, 'Fortnight', false);
    expect(d).toEqual({
      kind: 'year',
      lo: Date.UTC(2026, 0, 1),
      hi: Date.UTC(2027, 0, 1),
      sourceLabel: 'Fortnight',
    });
  });
});

describe('resolvePrecision: label casing', () => {
  it.each(['DAY', 'day', 'dAy', 'Day'])('label "%s" is matched case-insensitively', (label) => {
    const d = resolvePrecision(NET, label, false);
    expect(d!.kind).toBe('day');
  });

  it('sourceLabel preserves the exact casing given, not the normalised form', () => {
    expect(resolvePrecision(NET, 'dAy', false)!.sourceLabel).toBe('dAy');
    expect(resolvePrecision(NET, 'QUARTER 3', false)!.sourceLabel).toBe('QUARTER 3');
    expect(resolvePrecision(NET, 'yEAr hALF 2', false)!.sourceLabel).toBe('yEAr hALF 2');
  });
});

describe('isInstant', () => {
  it('is true only for "instant" and "unrecorded"', () => {
    const kinds: PrecisionKind[] = [
      'instant',
      'day',
      'month',
      'quarter',
      'half',
      'year',
      'decade',
      'unrecorded',
    ];
    const expected: Record<PrecisionKind, boolean> = {
      instant: true,
      unrecorded: true,
      day: false,
      month: false,
      quarter: false,
      half: false,
      year: false,
      decade: false,
    };
    for (const k of kinds) {
      expect(isInstant(k)).toBe(expected[k]);
    }
  });
});
