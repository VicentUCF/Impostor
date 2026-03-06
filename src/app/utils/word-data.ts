import deportesData from '../../db/Deportes.json';
import escapeRoomsData from '../../db/EscapeRooms.json';
import juegosData from '../../db/Juegos.json';
import marcasData from '../../db/Marcas.json';
import padelData from '../../db/Padel.json';
import peliculasData from '../../db/Peliculas.json';
import seriesData from '../../db/Series.json';
import trabajosData from '../../db/Trabajos.json';
import comidaData from '../../db/Comida.json';
import objetosData from '../../db/Objetos.json';
import { randomItem } from './game-utils';
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

const normalizeComparable = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeEntries = (label: string, rawEntries: unknown[]): WordEntry[] =>
  rawEntries
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
        category,
        subcategory,
        word,
        similarWords,
        hints
      };
    })
    .filter((entry) => entry.word.length > 0 && entry.id.length > 0);

const asEntries = (data: unknown): unknown[] => (Array.isArray(data) ? data : []);

const deriveLabel = (fallback: string, entries: WordEntry[]): string => {
  const label = entries.find((entry) => entry.category.length > 0)?.category;
  return label?.length ? label : fallback;
};

const emptySelection = (): WordSelection => ({
  id: '',
  category: '',
  subcategory: '',
  word: '',
  similarWords: EMPTY_TRIPLE,
  hint: ''
});

export const buildCategorySources = (): CategorySource[] => {
  const sources = [
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
    const entries = normalizeEntries(source.fallbackLabel, source.raw);
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

export const pickWordEntry = (
  entries: WordEntry[],
  difficulty: Difficulty,
  previousSelection?: WordSelection | null
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
    category: entry.category,
    subcategory: entry.subcategory,
    word: entry.word,
    similarWords: entry.similarWords,
    hint: hintPool.length > 0 ? randomItem(hintPool) : EMPTY_HINT
  };
};
