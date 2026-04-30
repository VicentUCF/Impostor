import { RoundHistory } from '../models/game-models';
import { CategorySource, WordEntry } from '../models/word-models';
import { createRoundState } from './game-engine';

const createEntry = (): WordEntry => ({
  id: 'animales-lobo',
  sourceId: 'animales',
  category: 'Animales',
  subcategory: 'General',
  word: 'Lobo',
  similarWords: ['Lobo', 'Canino', 'Bosque'],
  hints: {
    easy: ['PISTA', 'PISTA 2', 'PISTA 3'],
    normal: ['PISTA', 'PISTA 2', 'PISTA 3'],
    hard: ['PISTA', 'PISTA 2', 'PISTA 3']
  }
});

const createSources = (): CategorySource[] => [
  {
    id: 'animales',
    label: 'Animales',
    entries: [createEntry()],
    enabled: true
  }
];

const createHistory = (overrides: Partial<RoundHistory> = {}): RoundHistory => ({
  recentSelections: [],
  starterHistory: [],
  impostorHistory: [],
  chaosVariantHistory: [],
  roundsSinceLastChaos: 0,
  ...overrides
});

describe('game-engine', () => {
  it('should not roll chaos during the cooldown even with a guaranteed chaos chance', () => {
    spyOn(Math, 'random').and.returnValue(0);

    const round = createRoundState({
      totalPlayers: 4,
      impostors: 1,
      sources: createSources(),
      config: {
        showCategory: true,
        showHint: true,
        hintDifficulty: 'normal',
        chaosChance: 1
      },
      history: createHistory({
        chaosVariantHistory: ['no-impostor'],
        roundsSinceLastChaos: 4
      })
    });

    expect(round.mode).toBe('normal');
    expect(round.variant).toBe('none');
  });
});
