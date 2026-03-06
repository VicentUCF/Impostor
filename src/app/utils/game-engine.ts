import {
  pickBalancedImpostorIndexes,
  pickChaosVariant,
  sanitizeRoundHistory
} from './round-history';
import { pickBalancedWordEntry } from './word-data';
import { CategorySource, WordSelection } from '../models/word-models';
import {
  ChaosVariant,
  PlayerSecret,
  RoundConfig,
  RoundHistory,
  RoundState
} from '../models/game-models';

export interface RoundSetup {
  totalPlayers: number;
  impostors: number;
  sources: CategorySource[];
  config: RoundConfig;
  history: RoundHistory;
}

const clampChance = (chance: number): number => Math.min(Math.max(chance, 0), 1);

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

const buildRoles = (
  totalPlayers: number,
  impostorIndexes: number[]
): PlayerSecret['role'][] => {
  const impostorSet = new Set(impostorIndexes);
  return Array.from({ length: totalPlayers }, (_, index) =>
    impostorSet.has(index) ? 'impostor' : 'crew'
  );
};

export const createRoundState = (setup: RoundSetup): RoundState => {
  const history = sanitizeRoundHistory(setup.history);
  const selection = pickBalancedWordEntry(setup.sources, setup.config.hintDifficulty, history);
  const chaosRoll = Math.random() < clampChance(setup.config.chaosChance);
  const variant: ChaosVariant = chaosRoll ? pickChaosVariant(setup.totalPlayers, history) : 'none';
  const impostorIndexes =
    variant === 'no-impostor'
      ? []
      : variant === 'all-impostors'
        ? Array.from({ length: setup.totalPlayers }, (_, index) => index)
        : pickBalancedImpostorIndexes(
            setup.totalPlayers,
            variant === 'double-impostor' ? 2 : setup.impostors,
            history
          );
  const roles = buildRoles(setup.totalPlayers, impostorIndexes);
  const secrets = buildSecrets(roles, selection);

  return {
    mode: chaosRoll ? 'chaos' : 'normal',
    variant: chaosRoll ? variant : 'none',
    secrets,
    impostorIndexes,
    selectedEntry: selection
  };
};
