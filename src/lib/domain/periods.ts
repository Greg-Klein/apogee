/**
 * Period options for the overview indicators.
 * Kept out of the client component so server code can import the values themselves
 * rather than a client reference.
 */
export const PERIODS = [
  { key: '12m', label: '12 mois' },
  { key: '24m', label: '24 mois' },
  { key: '5y', label: '5 ans' },
  { key: 'all', label: 'Tout' },
] as const;

export type PeriodKey = (typeof PERIODS)[number]['key'];

export function isPeriodKey(v: string): v is PeriodKey {
  return PERIODS.some((p) => p.key === v);
}
