import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { matchGuess } from '../src/wordle';

const wordFrom = (letters: string) =>
  fc.array(fc.constantFrom(...letters), { minLength: 5, maxLength: 5 }).map(cs => cs.join(''));
const word = wordFrom('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
// A small alphabet makes repeated letters common enough to exercise allocation.
const repeatedWord = wordFrom('ABC');

// Independent specification: reserve all exact matches before allocating
// remaining occurrences to unmatched guesses from left to right.
function expectedColors(secret: string, guess: string): string[] {
  const remaining = [...secret];
  const result = Array<string>(5).fill('B');
  for (let i = 0; i < 5; i++) {
    if (guess[i] === secret[i]) {
      result[i] = 'G';
      remaining[i] = '';
    }
  }
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'G') continue;
    const index = remaining.indexOf(guess[i]);
    if (index !== -1) {
      result[i] = 'Y';
      remaining[index] = '';
    }
  }
  return result;
}

describe('matchGuess', () => {
  // Pattern: invariant. The result has one valid color per position.
  it('returns exactly five valid colors', () => {
    fc.assert(fc.property(word, word, (secret, guess) => {
      const colors = matchGuess(secret, guess);
      expect(colors).toHaveLength(5);
      for (const color of colors) expect(['G', 'Y', 'B']).toContain(color);
    }));
  });

  // Pattern: conditional. An identical guess is entirely green.
  it('gives all greens when the guess equals the secret', () => {
    fc.assert(fc.property(word, secret => {
      expect(matchGuess(secret, secret)).toEqual(['G', 'G', 'G', 'G', 'G']);
    }));
  });

  // Pattern: invariant. Each letter is credited at most as often as it appears in the secret.
  it('never overcredits a letter', () => {
    fc.assert(fc.property(repeatedWord, repeatedWord, (secret, guess) => {
      const colors = matchGuess(secret, guess);
      for (const letter of new Set(guess)) {
        const credited = [...guess].filter((c, i) => c === letter && colors[i] !== 'B').length;
        expect(credited).toBeLessThanOrEqual([...secret].filter(c => c === letter).length);
      }
    }));
  });

  // Pattern: differential. Exact matches take priority, then remaining letters are used left to right.
  it('matches the specified allocation of repeated letters', () => {
    fc.assert(fc.property(repeatedWord, repeatedWord, (secret, guess) => {
      expect(matchGuess(secret, guess)).toEqual(expectedColors(secret, guess));
    }));
  });

  // Pattern: conditional. Invalid words are rejected in either argument.
  it('rejects invalid words', () => {
    const invalid = fc.oneof(
      fc.string({ maxLength: 4 }),
      fc.string({ minLength: 6, maxLength: 12 }),
      fc.constantFrom('abcde', 'AB CD', 'ABCDE\n', '12345'),
    );
    fc.assert(fc.property(word, invalid, (valid, bad) => {
      expect(() => matchGuess(valid, bad)).toThrow(RangeError);
      expect(() => matchGuess(bad, valid)).toThrow(RangeError);
    }));
  });
});
