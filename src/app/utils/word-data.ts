import deportesData from '../../db/Deportes.json';
import animalesData from '../../db/Animales.json';
import escapeRoomsData from '../../db/EscapeRooms.json';
import juegosData from '../../db/Juegos.json';
import marcasData from '../../db/Marcas.json';
import padelData from '../../db/Padel.json';
import peliculasData from '../../db/Peliculas.json';
import personajesData from '../../db/Personajes.json';
import seriesData from '../../db/Series.json';
import trabajosData from '../../db/Trabajos.json';
import comidaData from '../../db/Comida.json';
import objetosData from '../../db/Objetos.json';
import { randomItem } from './game-utils';
import { RecentSelectionHistory, RoundHistory } from '../models/game-models';
import {
  CategorySource,
  Difficulty,
  WordEntry,
  WordHints,
  WordSelection
} from '../models/word-models';

const EMPTY_HINT = 'SIN PISTA';
const EMPTY_TRIPLE: [string, string, string] = ['', '', ''];

interface WordEntryRaw {
  id?: unknown;
  category?: unknown;
  subcategory?: unknown;
  word?: unknown;
  similarWords?: unknown;
  hints?: {
    easy?: unknown;
    normal?: unknown;
    hard?: unknown;
  };
}

const sanitizeValue = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const sanitizeList = (values: unknown): string[] => {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};

const ensureTriple = (values: unknown, fallback: string[]): [string, string, string] => {
  const list = sanitizeList(values);
  const merged = [...list, ...fallback].filter((value, index, all) => all.indexOf(value) === index);

  return [
    merged[0] ?? EMPTY_HINT,
    merged[1] ?? merged[0] ?? EMPTY_HINT,
    merged[2] ?? merged[1] ?? merged[0] ?? EMPTY_HINT
  ];
};

const buildHints = (rawHints: WordEntryRaw['hints']): WordHints => ({
  easy: ensureTriple(rawHints?.easy, [EMPTY_HINT]),
  normal: ensureTriple(rawHints?.normal, [EMPTY_HINT]),
  hard: ensureTriple(rawHints?.hard, [EMPTY_HINT])
});

export const normalizeComparable = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeEntries = (sourceId: string, label: string, rawEntries: unknown[]): WordEntry[] => {
  const normalizedEntries = rawEntries
    .map((raw): WordEntryRaw => (typeof raw === 'object' && raw !== null ? (raw as WordEntryRaw) : {}))
    .map((raw) => {
      const category = sanitizeValue(raw.category) || label;
      const word = sanitizeValue(raw.word);
      const id = sanitizeValue(raw.id) || normalizeComparable(word).replace(/\s+/g, '_');
      const subcategory = sanitizeValue(raw.subcategory) || 'General';
      const similarWords = ensureTriple(raw.similarWords, [word]);
      const hints = buildHints(raw.hints);

      return {
        id,
        sourceId,
        category,
        subcategory,
        word,
        similarWords,
        hints
      };
    })
    .filter((entry) => entry.word.length > 0 && entry.id.length > 0);
  const seenWords = new Set<string>();

  return normalizedEntries.filter((entry) => {
    const comparableWord = normalizeComparable(entry.word);
    if (seenWords.has(comparableWord)) {
      return false;
    }

    seenWords.add(comparableWord);
    return true;
  });
};

const asEntries = (data: unknown): unknown[] => (Array.isArray(data) ? data : []);

const deriveLabel = (fallback: string, entries: WordEntry[]): string => {
  const label = entries.find((entry) => entry.category.length > 0)?.category;
  return label?.length ? label : fallback;
};

const emptySelection = (): WordSelection => ({
  id: '',
  sourceId: '',
  category: '',
  subcategory: '',
  word: '',
  similarWords: EMPTY_TRIPLE,
  hint: ''
});

export const buildCategorySources = (): CategorySource[] => {
  const sources = [
    {
      id: 'animales',
      fallbackLabel: 'Animales',
      raw: asEntries(animalesData)
    },
    {
      id: 'deportes',
      fallbackLabel: 'Deportes',
      raw: asEntries(deportesData)
    },
    {
      id: 'juegos',
      fallbackLabel: 'Juegos',
      raw: asEntries(juegosData)
    },
    {
      id: 'marcas',
      fallbackLabel: 'Marcas',
      raw: asEntries(marcasData)
    },
    {
      id: 'peliculas',
      fallbackLabel: 'Películas',
      raw: asEntries(peliculasData)
    },
    {
      id: 'personajes',
      fallbackLabel: 'Personajes',
      raw: asEntries(personajesData)
    },
    {
      id: 'series',
      fallbackLabel: 'Series',
      raw: asEntries(seriesData)
    },
    {
      id: 'trabajos',
      fallbackLabel: 'Trabajos',
      raw: asEntries(trabajosData)
    },
    {
      id: 'comida',
      fallbackLabel: 'Comida',
      raw: asEntries(comidaData)
    },
    {
      id: 'objetos',
      fallbackLabel: 'Objetos',
      raw: asEntries(objetosData)
    },
    {
      id: 'padel',
      fallbackLabel: 'Padel',
      raw: asEntries(padelData)
    },
    {
      id: 'escape-rooms',
      fallbackLabel: 'Escape Room',
      raw: asEntries(escapeRoomsData)
    }
  ];

  return sources.map((source) => {
    const entries = normalizeEntries(source.id, source.fallbackLabel, source.raw);
    const label = deriveLabel(source.fallbackLabel, entries);

    return {
      id: source.id,
      label,
      entries,
      enabled: entries.length > 0
    };
  });
};

export const collectActiveEntries = (sources: CategorySource[]): WordEntry[] =>
  sources
    .filter((source) => source.enabled && source.entries.length > 0)
    .flatMap((source) => source.entries);

export const collectAllEntries = (sources: CategorySource[]): WordEntry[] =>
  sources.flatMap((source) => source.entries);

const buildRecentWordBlocklist = (recentSelections: readonly RecentSelectionHistory[]): Set<string> => {
  const blockedWords = new Set<string>();

  recentSelections.forEach((selection) => {
    blockedWords.add(selection.word);
    selection.similarWords.forEach((word) => blockedWords.add(word));
  });

  return blockedWords;
};

const hasRecentWordConflict = (
  entry: WordEntry,
  blockedWords: ReadonlySet<string>
): boolean => {
  const comparableWord = normalizeComparable(entry.word);
  if (blockedWords.has(comparableWord)) {
    return true;
  }

  return entry.similarWords
    .map((word) => normalizeComparable(word))
    .some((word) => blockedWords.has(word));
};

const getEntriesBySubcategory = (entries: WordEntry[]): Array<[string, WordEntry[]]> => {
  const groups = new Map<string, WordEntry[]>();

  entries.forEach((entry) => {
    const subcategory = entry.subcategory || 'General';
    const currentEntries = groups.get(subcategory) ?? [];
    currentEntries.push(entry);
    groups.set(subcategory, currentEntries);
  });

  return Array.from(groups.entries());
};

const getLastSelectionForSource = (
  recentSelections: readonly RecentSelectionHistory[],
  sourceId: string
): RecentSelectionHistory | null => {
  for (let index = recentSelections.length - 1; index >= 0; index -= 1) {
    if (recentSelections[index]?.sourceId === sourceId) {
      return recentSelections[index] ?? null;
    }
  }

  return null;
};

const pickStrictEntry = (
  sources: CategorySource[],
  recentSelections: readonly RecentSelectionHistory[]
): WordEntry | null => {
  const blockedWords = buildRecentWordBlocklist(recentSelections);
  const candidatesBySource = sources
    .map((source) => ({
      source,
      entries: source.entries.filter((entry) => !hasRecentWordConflict(entry, blockedWords))
    }))
    .filter((source) => source.entries.length > 0);

  if (candidatesBySource.length === 0) {
    return null;
  }

  const blockedSourceIds = new Set(recentSelections.slice(-2).map((selection) => selection.sourceId));
  const preferredSources = candidatesBySource.filter((source) => !blockedSourceIds.has(source.source.id));
  const eligibleSources = preferredSources.length > 0 ? preferredSources : candidatesBySource;
  const selectedSource = randomItem(eligibleSources);
  const subcategories = getEntriesBySubcategory(selectedSource.entries);
  const lastSelectionForSource = getLastSelectionForSource(recentSelections, selectedSource.source.id);
  const preferredSubcategories =
    lastSelectionForSource && subcategories.length > 1
      ? subcategories.filter(([subcategory]) => subcategory !== lastSelectionForSource.subcategory)
      : subcategories;
  const eligibleSubcategories =
    preferredSubcategories.length > 0 ? preferredSubcategories : subcategories;
  const [, entries] = randomItem(eligibleSubcategories);

  return randomItem(entries);
};

export const pickWordEntry = (
  entries: WordEntry[],
  difficulty: Difficulty,
  previousSelection?: Pick<RecentSelectionHistory, 'word' | 'similarWords'> | null
): WordSelection => {
  if (entries.length === 0) {
    return emptySelection();
  }

  let pool = entries;

  if (previousSelection?.word) {
    const previousWord = normalizeComparable(previousSelection.word);
    const blockedWords = new Set<string>([
      previousWord,
      ...previousSelection.similarWords.map((value) => normalizeComparable(value))
    ]);

    const filtered = entries.filter((entry) => {
      const entryWord = normalizeComparable(entry.word);
      if (blockedWords.has(entryWord)) {
        return false;
      }

      return !entry.similarWords.some(
        (value) => normalizeComparable(value) === previousWord
      );
    });

    if (filtered.length > 0) {
      pool = filtered;
    }
  }

  const entry = randomItem(pool);
  const hintPool = entry.hints[difficulty];

  return {
    id: entry.id,
    sourceId: entry.sourceId,
    category: entry.category,
    subcategory: entry.subcategory,
    word: entry.word,
    similarWords: entry.similarWords,
    hint: hintPool.length > 0 ? randomItem(hintPool) : EMPTY_HINT
  };
};

export const pickBalancedWordEntry = (
  sources: CategorySource[],
  difficulty: Difficulty,
  history: RoundHistory
): WordSelection => {
  const activeSources = sources.filter((source) => source.enabled && source.entries.length > 0);
  const fallbackSources = activeSources.length > 0 ? activeSources : sources.filter((source) => source.entries.length > 0);
  const strictEntry = pickStrictEntry(fallbackSources, history.recentSelections);

  if (strictEntry) {
    const hintPool = strictEntry.hints[difficulty];

    return {
      id: strictEntry.id,
      sourceId: strictEntry.sourceId,
      category: strictEntry.category,
      subcategory: strictEntry.subcategory,
      word: strictEntry.word,
      similarWords: strictEntry.similarWords,
      hint: hintPool.length > 0 ? randomItem(hintPool) : EMPTY_HINT
    };
  }

  const pool = fallbackSources.flatMap((source) => source.entries);
  const previousSelection = history.recentSelections[history.recentSelections.length - 1] ?? null;
  return pickWordEntry(pool, difficulty, previousSelection);
};
