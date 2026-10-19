import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { matchGuess } from '../src/wordle';
import { match } from 'node:assert';

// Recitation Part 1: follow along with your TA, filling in the todos below.
// Problem set Task 1: keep adding properties until `npm run mutants:wordle`
// kills every mutant. Read the spec in src/wordle/matchGuess.ts.
//
// Label every property with its pattern, on the line above its `it(`:
//   // Pattern: invariant. The result always has exactly five colors.
// (invariant, algebraic, metamorphic, differential, or conditional)

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';


const wordFrom = (letters: string) => 
  fc.array(fc.constantFrom(...letters), {minLength: 5, maxLength: 5}).map(cs => cs.join(''));
const word = wordFrom(ALPHABET)

// Step 1: a generator for five-letter uppercase words.
// const word = ...




describe ('matchguess', () => {

  it('returns exactly five colors', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        expect(matchGuess(secret, guess)).toHaveLength(5)
      }),
    )
  })

  it('returns only green, black or yellow', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        for (const c of matchGuess(secret, guess)) expect(['G', 'Y', 'B']).toContain(c);
      }),
    )
  })

  it('secret gives al greens', () => {
    fc.assert(
      fc.property(word, w => {
        expect(matchGuess(w, w)).toEqual(['G', 'G', 'G', 'G', 'G'])
      }),
    )
  })


  it('number of letters is the same', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        const res = matchGuess(secret, guess)
        for (const letter of new Set(guess)) {
          const credited = [...guess].filter((c, i) => c === letter && res[i] !== 'B').length;
          const inSecret = [...secret].filter(c => c === letter).length
          expect(credited).toBeLessThanOrEqual(inSecret)
        }

        
        for (const c of matchGuess(secret, guess)) expect(['G', 'Y', 'B']).toContain(c);
      }),
    )
  })

  
});




describe('matchGuess', () => {
  it.todo('returns exactly five colors');
  it.todo('only uses the colors G, Y, B');
  it.todo('guessing the secret gives all greens');
  it.todo('never credits a letter more times than the secret contains it');
});
