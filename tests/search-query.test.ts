import { describe, it, expect } from 'vitest';
import { toMatchQuery } from '@/lib/db/launches';

describe('toMatchQuery', () => {
  it('a single term becomes a prefix match', () => {
    expect(toMatchQuery('falcon')).toBe('"falcon"*');
  });

  it('multiple terms are joined with AND', () => {
    expect(toMatchQuery('falcon heavy')).toBe('"falcon"* AND "heavy"*');
  });

  it('strips quotes and asterisks out of the input terms', () => {
    expect(toMatchQuery('"falcon*" "heavy"')).toBe('"falcon"* AND "heavy"*');
    expect(toMatchQuery('fal*con "9"')).toBe('"falcon"* AND "9"*');
  });

  it('empty input -> ""', () => {
    expect(toMatchQuery('')).toBe('""');
  });

  it('whitespace-only input -> ""', () => {
    expect(toMatchQuery('   \t  ')).toBe('""');
  });

  it('more than 8 terms are truncated to 8', () => {
    const words = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    const result = toMatchQuery(words.join(' '));
    expect(result).toBe(
      words
        .slice(0, 8)
        .map((w) => `"${w}"*`)
        .join(' AND '),
    );
    expect(result.split(' AND ')).toHaveLength(8);
  });

  it('never contains a bare unescaped quote inside a term', () => {
    const result = toMatchQuery('fal"con* "heavy"" te*rm');
    // Every quoted segment must be exactly `"<term>"`, never a quote inside the term itself.
    for (const segment of result.split(' AND ')) {
      const inner = /^"([^"]*)"\*$/.exec(segment);
      expect(inner).not.toBeNull();
    }
  });
});
