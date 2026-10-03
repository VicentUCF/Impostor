import { RoundHistory } from '../models/game-models';
import { CategorySource, WordEntry } from '../models/word-models';
import { createRoundState } from './game-engine';
import { buildFactCatalog } from './fact-data';

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
  recentFactIds: [],
  starterHistory: [],
  impostorHistory: [],
  chaosVariantHistory: [],
  roundsSinceLastChaos: 0,
  ...overrides
});

describe('game-engine', () => {
  const createFactRound = (chaosChance = 0, totalPlayers = 6) => createRoundState({
    gameType: 'facts',
    totalPlayers,
    impostors: 1,
    sources: [],
    facts: buildFactCatalog(),
    config: { showCategory: true, showHint: true, hintDifficulty: 'normal', chaosChance },
    history: createHistory()
  });

  it('gives different facts to informants and no fact, word or hint to the impostor', () => {
    const round = createFactRound();
    expect(round.gameType).toBe('facts');
    if (round.gameType !== 'facts') {
      throw new Error('Expected a facts round');
    }
    expect(round.impostorIndexes.length).toBe(1);
    expect(round.selectedEntry).toBeUndefined();
    const informants = round.secrets.filter((secret) => secret.role === 'crew');
    expect(informants.length).toBe(5);
    expect(new Set(informants.map((secret) => secret.fact?.id)).size).toBe(5);
    const impostor = round.secrets[round.impostorIndexes[0]];
    expect(impostor.fact).toBeNull();
    expect(impostor.word).toBeUndefined();
    expect(impostor.hint).toBe('');
    expect(impostor.category).toBe('');
  });

  [
    { roll: 0, variant: 'no-impostor', count: 0 },
    { roll: 0.6, variant: 'double-impostor', count: 2 },
    { roll: 0.99, variant: 'all-impostors', count: 12 }
  ].forEach(({ roll, variant, count }) => {
    it(`preserves ${variant} chaos in facts mode for twelve players`, () => {
      spyOn(Math, 'random').and.returnValue(roll);
      const round = createFactRound(1, 12);
      expect(round.variant).toBe(variant);
      expect(round.mode).toBe('chaos');
      expect(round.impostorIndexes.length).toBe(count);
      const facts = round.secrets.flatMap((secret) => secret.fact ? [secret.fact.id] : []);
      expect(facts.length).toBe(12 - count);
      expect(new Set(facts).size).toBe(facts.length);
    });
  });

  it('still gives a shared word to classic informants', () => {
    const round = createRoundState({
      totalPlayers: 4, impostors: 1, sources: createSources(), history: createHistory(),
      config: { showCategory: true, showHint: true, hintDifficulty: 'normal', chaosChance: 0 }
    });
    expect(round.gameType).toBe('words');
    if (round.gameType !== 'words') {
      throw new Error('Expected a words round');
    }
    expect(round.secrets.filter((secret) => secret.role === 'crew').map((secret) => secret.word))
      .toEqual(['Lobo', 'Lobo', 'Lobo']);
    expect(round.secrets[round.impostorIndexes[0]].word).toBe('');
  });

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
