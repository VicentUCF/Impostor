import { assignRoles } from './game-utils';
import { collectActiveEntries, collectAllEntries, pickWordEntry } from './word-data';
import { CategorySource, WordSelection } from '../models/word-models';
import { ChaosVariant, PlayerSecret, RoundConfig, RoundState } from '../models/game-models';

export interface RoundSetup {
  totalPlayers: number;
  impostors: number;
  sources: CategorySource[];
  config: RoundConfig;
  previousSelection?: WordSelection | null;
}

interface ChaosVariantWeight {
  variant: ChaosVariant;
  weight: number;
  minPlayers?: number;
}

const CHAOS_VARIANTS: ChaosVariantWeight[] = [
  { variant: 'no-impostor', weight: 35 },
  { variant: 'roles-inverted', weight: 30 },
  { variant: 'double-impostor', weight: 20, minPlayers: 3 },
  { variant: 'all-impostors', weight: 15 }
];

const clampChance = (chance: number): number => Math.min(Math.max(chance, 0), 1);

const pickChaosVariant = (totalPlayers: number): ChaosVariant => {
  const options = CHAOS_VARIANTS.filter(
    (option) => option.minPlayers === undefined || totalPlayers >= option.minPlayers
  );
  const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const option of options) {
    roll -= option.weight;
    if (roll <= 0) {
      return option.variant;
    }
  }

  return options[options.length - 1]?.variant ?? 'none';
};

const buildSecrets = (
  roles: PlayerSecret['role'][],
  selection: RoundState['selectedEntry']
): PlayerSecret[] =>
  roles.map((role) => ({
    role,
    word: role === 'impostor' ? '' : selection.word,
    hint: role === 'impostor' ? selection.hint : '',
    category: selection.category
  }));

const buildChaosRoles = (
  variant: ChaosVariant,
  totalPlayers: number,
  impostors: number
): PlayerSecret['role'][] => {
  switch (variant) {
    case 'no-impostor':
      return Array.from({ length: totalPlayers }, () => 'crew');
    case 'all-impostors':
      return Array.from({ length: totalPlayers }, () => 'impostor');
    case 'double-impostor':
      return assignRoles(totalPlayers, 2);
    case 'roles-inverted':
      return assignRoles(totalPlayers, impostors);
    default:
      return assignRoles(totalPlayers, impostors);
  }
};

export const createRoundState = (setup: RoundSetup): RoundState => {
  const activeEntries = collectActiveEntries(setup.sources);
  const pool = activeEntries.length > 0 ? activeEntries : collectAllEntries(setup.sources);
  const selection = pickWordEntry(
    pool,
    setup.config.hintDifficulty,
    setup.previousSelection ?? null
  );
  const chaosRoll = Math.random() < clampChance(setup.config.chaosChance);
  const variant = chaosRoll ? pickChaosVariant(setup.totalPlayers) : 'none';
  const roles = chaosRoll
    ? buildChaosRoles(variant, setup.totalPlayers, setup.impostors)
    : assignRoles(setup.totalPlayers, setup.impostors);
  const secrets = buildSecrets(roles, selection);
  const impostorIndexes = roles
    .map((role, index) => (role === 'impostor' ? index : null))
    .filter((index): index is number => index !== null);

  return {
    mode: chaosRoll ? 'chaos' : 'normal',
    variant: chaosRoll ? variant : 'none',
    secrets,
    impostorIndexes,
    selectedEntry: selection
  };
};
