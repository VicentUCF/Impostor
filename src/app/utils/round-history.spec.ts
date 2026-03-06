import { RoundHistory } from '../models/game-models';
import { WordSelection } from '../models/word-models';
import {
  computeChaosChance,
  pickBalancedImpostorIndexes,
  pickChaosVariant,
  pickStarterIndex,
  updateRoundHistory
} from './round-history';

const createHistory = (overrides: Partial<RoundHistory> = {}): RoundHistory => ({
  recentSelections: [],
  starterHistory: [],
  impostorHistory: [],
  chaosVariantHistory: [],
  roundsSinceLastChaos: 0,
  ...overrides
});

const createSelection = (word: string): WordSelection => ({
  id: word.toLowerCase(),
  sourceId: 'animales',
  category: 'Animales',
  subcategory: 'General',
  word,
  similarWords: [word, `${word} Alt`, `${word} Ref`],
  hint: 'PISTA'
});

describe('round-history', () => {
  it('should cap chaos chance at 35 percent', () => {
    const chance = computeChaosChance(createHistory({ roundsSinceLastChaos: 99 }));

    expect(chance).toBe(0.35);
  });

  it('should rotate the starter away from the most recent players when possible', () => {
    const starter = pickStarterIndex(
      3,
      createHistory({
        starterHistory: [1, 0]
      })
    );

    expect(starter).toBe(2);
  });

  it('should avoid repeating the previous impostor when alternatives exist', () => {
    const impostors = pickBalancedImpostorIndexes(
      3,
      1,
      createHistory({
        impostorHistory: [[1], [0]]
      })
    );

    expect(impostors).toEqual([2]);
  });

  it('should apply chaos cooldowns and block double impostor below four players', () => {
    spyOn(Math, 'random').and.returnValue(0);

    const cooledVariant = pickChaosVariant(
      5,
      createHistory({
        chaosVariantHistory: ['no-impostor']
      })
    );

    (Math.random as jasmine.Spy).and.returnValue(0.99);

    const smallTableVariant = pickChaosVariant(3, createHistory());

    expect(cooledVariant).toBe('double-impostor');
    expect(smallTableVariant).toBe('all-impostors');
  });

  it('should reset chaos streaks without updating impostor recency on all-impostors', () => {
    const updated = updateRoundHistory(
      createHistory({
        impostorHistory: [[1]],
        roundsSinceLastChaos: 4
      }),
      {
        selection: createSelection('Lobo'),
        starterIndex: 2,
        impostorIndexes: [0, 1, 2],
        totalPlayers: 3,
        variant: 'all-impostors'
      }
    );

    expect(updated.impostorHistory).toEqual([[1]]);
    expect(updated.roundsSinceLastChaos).toBe(0);
    expect(updated.chaosVariantHistory).toEqual(['all-impostors']);
  });
});
