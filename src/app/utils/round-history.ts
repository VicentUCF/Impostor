import {
  ChaosVariant,
  RealChaosVariant,
  RecentSelectionHistory,
  RoundHistory
} from '../models/game-models';
import { WordSelection } from '../models/word-models';
import { randomItem } from './game-utils';
import { normalizeComparable } from './word-data';

const MAX_RECENT_SELECTIONS = 8;
const MAX_STARTER_HISTORY = 12;
const MAX_IMPOSTOR_HISTORY = 12;
const MAX_CHAOS_VARIANT_HISTORY = 2;
const MAX_ROUNDS_WITHOUT_CHAOS = 15;
export const MIN_ROUNDS_BETWEEN_CHAOS = 5;

interface RoundHistoryUpdate {
  selection: WordSelection;
  starterIndex: number;
  impostorIndexes: number[];
  totalPlayers: number;
  variant: ChaosVariant;
}

const CHAOS_VARIANTS: ReadonlyArray<{
  variant: RealChaosVariant;
  weight: number;
  minPlayers?: number;
}> = [
  { variant: 'no-impostor', weight: 35 },
  { variant: 'double-impostor', weight: 20, minPlayers: 4 },
  { variant: 'all-impostors', weight: 15 }
];

const appendWithLimit = <T>(items: readonly T[], item: T, limit: number): T[] =>
  [...items, item].slice(-limit);

const clampRoundsWithoutChaos = (value: number): number =>
  Math.min(Math.max(Math.trunc(value), 0), MAX_ROUNDS_WITHOUT_CHAOS);

const isRealChaosVariant = (value: unknown): value is RealChaosVariant =>
  value === 'no-impostor' || value === 'double-impostor' || value === 'all-impostors';

const sanitizeNumberList = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is number => Number.isInteger(entry) && entry >= 0);
};

const sanitizeRecentSelection = (value: unknown): RecentSelectionHistory | null => {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const selection = value as Partial<RecentSelectionHistory>;
  const sourceId = typeof selection.sourceId === 'string' ? selection.sourceId.trim() : '';
  const subcategory = typeof selection.subcategory === 'string' ? selection.subcategory.trim() : '';
  const word = typeof selection.word === 'string' ? normalizeComparable(selection.word) : '';
  const similarWords = Array.isArray(selection.similarWords)
    ? selection.similarWords
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => normalizeComparable(entry))
        .filter((entry, index, entries) => entry.length > 0 && entries.indexOf(entry) === index)
    : [];

  if (sourceId.length === 0 || word.length === 0) {
    return null;
  }

  return {
    sourceId,
    subcategory,
    word,
    similarWords
  };
};

const sanitizeImpostorHistory = (value: unknown): number[][] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => sanitizeNumberList(entry))
    .map((entry) => Array.from(new Set(entry)).sort((left, right) => left - right))
    .slice(-MAX_IMPOSTOR_HISTORY);
};

const scoreLeastRecentStarter = (playerIndex: number, starterHistory: readonly number[]): number => {
  const lastIndex = starterHistory.lastIndexOf(playerIndex);
  return lastIndex === -1 ? Number.POSITIVE_INFINITY : starterHistory.length - 1 - lastIndex;
};

const scoreLeastRecentImpostor = (
  playerIndex: number,
  impostorHistory: readonly number[][]
): number => {
  for (let index = impostorHistory.length - 1; index >= 0; index -= 1) {
    if (impostorHistory[index]?.includes(playerIndex)) {
      return impostorHistory.length - 1 - index;
    }
  }

  return Number.POSITIVE_INFINITY;
};

export const createEmptyRoundHistory = (): RoundHistory => ({
  recentSelections: [],
  starterHistory: [],
  impostorHistory: [],
  chaosVariantHistory: [],
  roundsSinceLastChaos: 0
});

export const sanitizeRoundHistory = (value: unknown): RoundHistory => {
  if (typeof value !== 'object' || value === null) {
    return createEmptyRoundHistory();
  }

  const candidate = value as Partial<RoundHistory>;
  const recentSelections = Array.isArray(candidate.recentSelections)
    ? candidate.recentSelections
        .map((entry) => sanitizeRecentSelection(entry))
        .filter((entry): entry is RecentSelectionHistory => entry !== null)
        .slice(-MAX_RECENT_SELECTIONS)
    : [];
  const starterHistory = sanitizeNumberList(candidate.starterHistory).slice(-MAX_STARTER_HISTORY);
  const impostorHistory = sanitizeImpostorHistory(candidate.impostorHistory);
  const chaosVariantHistory = Array.isArray(candidate.chaosVariantHistory)
    ? candidate.chaosVariantHistory
        .filter((entry): entry is RealChaosVariant => isRealChaosVariant(entry))
        .slice(-MAX_CHAOS_VARIANT_HISTORY)
    : [];

  return {
    recentSelections,
    starterHistory,
    impostorHistory,
    chaosVariantHistory,
    roundsSinceLastChaos: clampRoundsWithoutChaos(candidate.roundsSinceLastChaos ?? 0)
  };
};

export const canRollChaos = (history: RoundHistory): boolean =>
  history.chaosVariantHistory.length === 0 ||
  history.roundsSinceLastChaos >= MIN_ROUNDS_BETWEEN_CHAOS;

export const computeChaosChance = (
  history: RoundHistory,
  baseChance = 0.2,
  increment = 0.01,
  maxChance = 0.35
): number => {
  const sanitizedHistory = sanitizeRoundHistory(history);

  if (!canRollChaos(sanitizedHistory)) {
    return 0;
  }

  return Math.min(
    Math.max(baseChance + sanitizedHistory.roundsSinceLastChaos * increment, 0),
    maxChance
  );
};

export const pickStarterIndex = (totalPlayers: number, history: RoundHistory): number => {
  const availablePlayers = Array.from({ length: totalPlayers }, (_, index) => index);
  if (availablePlayers.length === 0) {
    return 0;
  }

  const blockedPlayers = new Set(
    history.starterHistory.slice(-2).filter((index) => index >= 0 && index < totalPlayers)
  );
  const preferredPlayers = availablePlayers.filter((index) => !blockedPlayers.has(index));
  const candidates = preferredPlayers.length > 0 ? preferredPlayers : availablePlayers;
  const bestScore = Math.max(
    ...candidates.map((index) => scoreLeastRecentStarter(index, history.starterHistory))
  );

  return randomItem(
    candidates.filter(
      (index) => scoreLeastRecentStarter(index, history.starterHistory) === bestScore
    )
  );
};

export const pickBalancedImpostorIndexes = (
  totalPlayers: number,
  impostors: number,
  history: RoundHistory
): number[] => {
  const cappedImpostors = Math.min(Math.max(impostors, 0), totalPlayers);
  const availablePlayers = Array.from({ length: totalPlayers }, (_, index) => index);
  const previousRound = history.impostorHistory[history.impostorHistory.length - 1] ?? [];
  const selected: number[] = [];

  for (let remaining = cappedImpostors; remaining > 0; remaining -= 1) {
    const eligiblePlayers = availablePlayers.filter((index) => !selected.includes(index));
    const withoutPreviousRound = eligiblePlayers.filter((index) => !previousRound.includes(index));
    const candidates =
      withoutPreviousRound.length >= remaining ? withoutPreviousRound : eligiblePlayers;
    const bestScore = Math.max(
      ...candidates.map((index) => scoreLeastRecentImpostor(index, history.impostorHistory))
    );
    const mostOverduePlayers = candidates.filter(
      (index) => scoreLeastRecentImpostor(index, history.impostorHistory) === bestScore
    );

    selected.push(randomItem(mostOverduePlayers));
  }

  return selected.sort((left, right) => left - right);
};

export const pickChaosVariant = (
  totalPlayers: number,
  history: RoundHistory
): RealChaosVariant => {
  const eligibleVariants = CHAOS_VARIANTS.filter(
    (variant) => variant.minPlayers === undefined || totalPlayers >= variant.minPlayers
  );
  const lastVariant = history.chaosVariantHistory[history.chaosVariantHistory.length - 1];
  const cooledVariants = eligibleVariants.filter((variant) => variant.variant !== lastVariant);
  const options = cooledVariants.length > 0 ? cooledVariants : eligibleVariants;
  const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const option of options) {
    roll -= option.weight;
    if (roll <= 0) {
      return option.variant;
    }
  }

  return options[options.length - 1]?.variant ?? 'no-impostor';
};

export const updateRoundHistory = (
  history: RoundHistory,
  update: RoundHistoryUpdate
): RoundHistory => {
  const sanitizedHistory = sanitizeRoundHistory(history);
  const recentSelection: RecentSelectionHistory = {
    sourceId: update.selection.sourceId,
    subcategory: update.selection.subcategory,
    word: normalizeComparable(update.selection.word),
    similarWords: update.selection.similarWords
      .map((entry) => normalizeComparable(entry))
      .filter((entry, index, entries) => entry.length > 0 && entries.indexOf(entry) === index)
  };
  const validImpostorIndexes = Array.from(
    new Set(
      update.impostorIndexes.filter(
        (index) => Number.isInteger(index) && index >= 0 && index < update.totalPlayers
      )
    )
  ).sort((left, right) => left - right);
  const shouldPersistImpostors = update.variant !== 'all-impostors';
  const validStarterIndex =
    update.starterIndex >= 0 && update.starterIndex < update.totalPlayers ? update.starterIndex : 0;

  return {
    recentSelections: appendWithLimit(
      sanitizedHistory.recentSelections,
      recentSelection,
      MAX_RECENT_SELECTIONS
    ),
    starterHistory: appendWithLimit(
      sanitizedHistory.starterHistory,
      validStarterIndex,
      MAX_STARTER_HISTORY
    ),
    impostorHistory: shouldPersistImpostors
      ? appendWithLimit(
          sanitizedHistory.impostorHistory,
          validImpostorIndexes,
          MAX_IMPOSTOR_HISTORY
        )
      : sanitizedHistory.impostorHistory,
    chaosVariantHistory: isRealChaosVariant(update.variant)
      ? appendWithLimit(
          sanitizedHistory.chaosVariantHistory,
          update.variant,
          MAX_CHAOS_VARIANT_HISTORY
        )
      : sanitizedHistory.chaosVariantHistory,
    roundsSinceLastChaos: isRealChaosVariant(update.variant)
      ? 0
      : clampRoundsWithoutChaos(sanitizedHistory.roundsSinceLastChaos + 1)
  };
};
