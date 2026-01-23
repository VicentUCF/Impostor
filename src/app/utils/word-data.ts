import deportesData from '../../db/Deportes.json';
import escapeRoomsData from '../../db/EscapeRooms.json';
import juegosData from '../../db/Juegos.json';
import marcasData from '../../db/Marcas.json';
import padelData from '../../db/Padel.json';
import peliculasData from '../../db/Peliculas.json';
import seriesData from '../../db/Series.json';
import trabajosData from '../../db/Trabajos.json';
import { randomItem } from './game-utils';

export type Difficulty = 'easy' | 'normal' | 'hard';

interface WordSub {
  id?: string;
  easy?: string[];
  normal?: string[];
  hard?: string[];
}

interface WordEntryRaw {
  category?: string;
  sub?: WordSub;
  words?: string[];
}

interface WordHints {
  easy: string[];
  normal: string[];
  hard: string[];
}

export interface WordEntry {
  category: string;
  hints: WordHints;
  words: string[];
}

export interface CategorySource {
  id: string;
  label: string;
  entries: WordEntry[];
  enabled: boolean;
}

const EMPTY_HINT = 'SIN PISTA';

const sanitizeList = (values?: string[]): string[] => {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};

const buildHints = (sub?: WordSub): WordHints => ({
  easy: sanitizeList(sub?.easy),
  normal: sanitizeList(sub?.normal),
  hard: sanitizeList(sub?.hard)
});

const deriveLabel = (fallback: string, entries: WordEntryRaw[]): string => {
  const label = entries.find((entry) => entry.category)?.category;
  return label?.trim().length ? label.trim() : fallback;
};

const normalizeEntries = (label: string, entries: WordEntryRaw[]): WordEntry[] =>
  entries
    .map((entry) => {
      const category = entry.category?.trim().length ? entry.category.trim() : label;
      const words = sanitizeList(entry.words);
      const hints = buildHints(entry.sub);

      return { category, words, hints };
    })
    .filter((entry) => entry.words.length > 0);

const asEntries = (data: unknown): WordEntryRaw[] => (Array.isArray(data) ? data : []);

export const buildCategorySources = (): CategorySource[] => {
  const sources = [
    {
      id: 'deportes',
      fallbackLabel: 'Deportes',
      raw: asEntries(deportesData)
    },
    {
      id: 'escape-rooms',
      fallbackLabel: 'Escape Room',
      raw: asEntries(escapeRoomsData)
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
      id: 'padel',
      fallbackLabel: 'Padel',
      raw: asEntries(padelData)
    },
    {
      id: 'peliculas',
      fallbackLabel: 'Peliculas',
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
    }
  ];

  return sources.map((source) => {
    const label = deriveLabel(source.fallbackLabel, source.raw);
    const entries = normalizeEntries(label, source.raw);

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
  difficulty: Difficulty
): { category: string; hint: string; word: string } => {
  if (entries.length === 0) {
    return { category: '', hint: '', word: '' };
  }

  const entry = randomItem(entries);
  const word = randomItem(entry.words);
  const difficultyHints = entry.hints[difficulty] ?? [];
  const hint = difficultyHints.length > 0 ? randomItem(difficultyHints) : EMPTY_HINT;

  return { category: entry.category, hint, word };
};
