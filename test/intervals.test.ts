import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mergeIntervals, type Interval } from '../src/intervals';

const endpoint = fc.integer({ min: -20, max: 20 });
const interval: fc.Arbitrary<Interval> = fc.tuple(endpoint, endpoint)
  .map(([a, b]) => [Math.min(a, b), Math.max(a, b)]);
const intervalList = fc.array(interval, { maxLength: 12 });
// Directly construct sorted intervals with a positive gap between neighbors.
const disjointList: fc.Arbitrary<Interval[]> = fc.tuple(
  endpoint,
  fc.array(fc.tuple(fc.nat(5), fc.integer({ min: 1, max: 5 })), { maxLength: 10 }),
).map(([start, pieces]) => {
  let next = start;
  return pieces.map(([width, gap]) => {
    const result: Interval = [next, next + width];
    next = result[1] + gap;
    return result;
  });
});

const covers = (xs: readonly Interval[], point: number) =>
  xs.some(([start, end]) => start <= point && point <= end);

describe('mergeIntervals', () => {
  // Pattern: invariant. Every input interval lies inside some output interval.
  it('contains each input interval', () => {
    fc.assert(fc.property(intervalList, xs => {
      const out = mergeIntervals(xs);
      for (const [s, e] of xs) expect(out.some(([a, b]) => a <= s && e <= b)).toBe(true);
    }));
  });

  // Pattern: invariant. Output intervals are valid, sorted, and neither overlap nor touch.
  it('returns sorted disjoint intervals', () => {
    fc.assert(fc.property(intervalList, xs => {
      const out = mergeIntervals(xs);
      for (let i = 0; i < out.length; i++) {
        expect(out[i][0]).toBeLessThanOrEqual(out[i][1]);
        if (i > 0) expect(out[i - 1][1]).toBeLessThan(out[i][0]);
      }
    }));
  });

  // Pattern: differential. Input and output cover the same real points.
  // Integer endpoints mean coverage can only change at an endpoint; checking
  // endpoints and midpoints between adjacent endpoints covers every region.
  it('preserves coverage of all real points', () => {
    fc.assert(fc.property(intervalList, xs => {
      const out = mergeIntervals(xs);
      const endpoints = [...new Set([...xs, ...out].flat())].sort((a, b) => a - b);
      const points = [...endpoints, ...endpoints.slice(1).map((x, i) => (endpoints[i] + x) / 2)];
      for (const point of points) expect(covers(out, point)).toBe(covers(xs, point));
    }));
  });

  // Pattern: metamorphic. Reordering or duplicating inputs does not change the result.
  it('is independent of input order and duplicates', () => {
    fc.assert(fc.property(intervalList, xs => {
      const expected = mergeIntervals(xs);
      expect(mergeIntervals([...xs].reverse())).toEqual(expected);
      expect(mergeIntervals([...xs, ...xs])).toEqual(expected);
    }));
  });

  // Pattern: algebraic. Merging an already merged result changes nothing.
  it('is idempotent', () => {
    fc.assert(fc.property(intervalList, xs => {
      const merged = mergeIntervals(xs);
      expect(mergeIntervals(merged)).toEqual(merged);
    }));
  });

  // Pattern: conditional. Already sorted intervals with gaps are unchanged.
  it('preserves already disjoint intervals', () => {
    fc.assert(fc.property(disjointList, xs => {
      expect(mergeIntervals(xs)).toEqual(xs);
    }));
  });

  // Pattern: conditional. Intervals sharing an endpoint merge into one interval.
  it('merges intervals that touch exactly', () => {
    fc.assert(fc.property(endpoint, fc.nat(10), fc.nat(10), (x, left, right) => {
      expect(mergeIntervals([[x, x + right], [x - left, x]])).toEqual([[x - left, x + right]]);
    }));
  });

  // Pattern: invariant. Neither the input array nor its intervals are modified.
  it('does not mutate its input', () => {
    fc.assert(fc.property(intervalList, xs => {
      const before = xs.map(([a, b]): Interval => [a, b]);
      mergeIntervals(xs);
      expect(xs).toEqual(before);
    }));
  });

  // Pattern: conditional. Invalid endpoints are rejected.
  it('rejects invalid intervals', () => {
    const invalid: fc.Arbitrary<Interval> = fc.oneof(
      fc.tuple(endpoint, fc.integer({ min: 1, max: 10 })).map(([start, delta]): Interval => [start, start - delta]),
      fc.constantFrom([0.5, 1], [0, 1.5], [NaN, 1], [0, Infinity]) as fc.Arbitrary<Interval>,
    );
    fc.assert(fc.property(intervalList, invalid, (xs, bad) => {
      expect(() => mergeIntervals([...xs, bad])).toThrow(RangeError);
    }));
  });
});
