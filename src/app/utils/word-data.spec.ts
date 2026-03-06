import { CategorySource, WordEntry } from '../models/word-models';
import { RoundHistory } from '../models/game-models';
import {
  buildCategorySources,
  normalizeComparable,
  pickBalancedWordEntry
} from './word-data';

const createEntry = (
  sourceId: string,
  word: string,
  subcategory = 'General',
  similarWords: [string, string, string] = [word, `${word} Alt`, `${word} Ref`]
): WordEntry => ({
  id: `${sourceId}-${normalizeComparable(word).replace(/\s+/g, '-')}`,
  sourceId,
  category: sourceId.toUpperCase(),
  subcategory,
  word,
  similarWords,
  hints: {
    easy: ['PISTA', 'PISTA 2', 'PISTA 3'],
    normal: ['PISTA', 'PISTA 2', 'PISTA 3'],
    hard: ['PISTA', 'PISTA 2', 'PISTA 3']
  }
});

const createSource = (id: string, entries: WordEntry[]): CategorySource => ({
  id,
  label: id,
  entries,
  enabled: true
});

const createHistory = (recentSelections: RoundHistory['recentSelections']): RoundHistory => ({
  recentSelections,
  starterHistory: [],
  impostorHistory: [],
  chaosVariantHistory: [],
  roundsSinceLastChaos: 0
});

describe('word-data', () => {
  it('should include animales and personajes while deduplicating words inside each source', () => {
    const sources = buildCategorySources();
    const sourceIds = sources.map((source) => source.id);
    const escapeRooms = sources.find((source) => source.id === 'escape-rooms');
    const peliculas = sources.find((source) => source.id === 'peliculas');
    const personajes = sources.find((source) => source.id === 'personajes');

    if (!escapeRooms || !peliculas || !personajes) {
      fail('Expected core sources to be available.');
      return;
    }

    expect(sourceIds).toContain('animales');
    expect(sourceIds).toContain('personajes');
    expect(
      new Set(escapeRooms.entries.map((entry) => normalizeComparable(entry.word))).size
    ).toBe(escapeRooms.entries.length);
    expect(peliculas.entries.some((entry) => normalizeComparable(entry.word) === 'harry potter'))
      .toBeTrue();
    expect(personajes.entries.some((entry) => normalizeComparable(entry.word) === 'harry potter'))
      .toBeTrue();
  });

  it('should choose categories uniformly instead of favouring larger datasets', () => {
    const sources = [
      createSource('small', [createEntry('small', 'Alpha')]),
      createSource(
        'large',
        Array.from({ length: 20 }, (_, index) => createEntry('large', `Beta ${index}`))
      )
    ];
    spyOn(Math, 'random').and.returnValues(0.4, 0, 0, 0);

    const selection = pickBalancedWordEntry(sources, 'normal', createHistory([]));

    expect(selection.sourceId).toBe('small');
    expect(selection.word).toBe('Alpha');
  });

  it('should avoid the last two categories when other sources are available', () => {
    const sources = [
      createSource('animales', [createEntry('animales', 'Lobo')]),
      createSource('comida', [createEntry('comida', 'Pizza')]),
      createSource('series', [createEntry('series', 'Dark')])
    ];
    const history = createHistory([
      {
        sourceId: 'animales',
        subcategory: 'General',
        word: 'lobo',
        similarWords: []
      },
      {
        sourceId: 'comida',
        subcategory: 'General',
        word: 'pizza',
        similarWords: []
      }
    ]);
    spyOn(Math, 'random').and.returnValue(0);

    const selection = pickBalancedWordEntry(sources, 'normal', history);

    expect(selection.sourceId).toBe('series');
    expect(selection.word).toBe('Dark');
  });

  it('should avoid recent words and similar-word clashes while alternatives exist', () => {
    const sources = [
      createSource('animales', [
        createEntry('animales', 'Lobo', 'Mamiferos', ['Perro', 'Canino', 'Bosque']),
        createEntry('animales', 'Gato', 'Mamiferos', ['Felino', 'Bigotes', 'Tejado'])
      ])
    ];
    const history = createHistory([
      {
        sourceId: 'animales',
        subcategory: 'Mamiferos',
        word: 'perro',
        similarWords: ['canino']
      }
    ]);
    spyOn(Math, 'random').and.returnValue(0);

    const selection = pickBalancedWordEntry(sources, 'normal', history);

    expect(selection.word).toBe('Gato');
  });

  it('should fall back to the immediate-repeat filter when strict history exhausts the pool', () => {
    const sources = [
      createSource('animales', [
        createEntry('animales', 'Perro'),
        createEntry('animales', 'Gato')
      ])
    ];
    const history = createHistory([
      {
        sourceId: 'animales',
        subcategory: 'General',
        word: 'gato',
        similarWords: []
      },
      {
        sourceId: 'animales',
        subcategory: 'General',
        word: 'perro',
        similarWords: ['canino']
      }
    ]);
    spyOn(Math, 'random').and.returnValues(0, 0);

    const selection = pickBalancedWordEntry(sources, 'normal', history);

    expect(selection.word).toBe('Gato');
  });
});
