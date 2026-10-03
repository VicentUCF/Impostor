import {
  canRollChaos,
  pickBalancedImpostorIndexes,
  pickChaosVariant,
  sanitizeRoundHistory
} from './round-history';
import { pickBalancedWordEntry } from './word-data';
import { buildFactCatalog, pickFacts } from './fact-data';
import { FactEntry } from '../models/fact-models';
import { CategorySource, WordSelection } from '../models/word-models';
import {
  ChaosVariant,
  GameType,
  PlayerSecret,
  WordPlayerSecret,
  RoundConfig,
  RoundHistory,
  RoundState
} from '../models/game-models';

export interface RoundSetup {
  gameType?: GameType;
  facts?: readonly FactEntry[];
  totalPlayers: number;
  impostors: number;
  sources: CategorySource[];
  config: RoundConfig;
  history: RoundHistory;
}

const clampChance = (chance: number): number => Math.min(Math.max(chance, 0), 1);

const buildSecrets = (
  roles: PlayerSecret['role'][],
  selection: WordSelection
): WordPlayerSecret[] =>
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
  // Keep the classic mode's selection order and behavior unchanged.
  const selection = setup.gameType === 'facts'
    ? null
    : pickBalancedWordEntry(setup.sources, setup.config.hintDifficulty, history);
  const chaosRoll =
    canRollChaos(history) && Math.random() < clampChance(setup.config.chaosChance);
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
  if (setup.gameType === 'facts') {
    const facts = pickFacts(
      setup.facts ?? buildFactCatalog(),
      setup.totalPlayers - impostorIndexes.length,
      history.recentFactIds
    );
    let factIndex = 0;

    return {
      gameType: 'facts',
      mode: chaosRoll ? 'chaos' : 'normal',
      variant,
      impostorIndexes,
      secrets: roles.map((role) => {
        const fact = role === 'crew' ? facts[factIndex++] : null;
        return { role, fact, hint: '', category: fact?.category ?? '' };
      })
    };
  }

  if (!selection) {
    throw new Error('No se ha seleccionado una palabra.');
  }
  const secrets = buildSecrets(roles, selection);

  return {
    gameType: 'words',
    mode: chaosRoll ? 'chaos' : 'normal',
    variant: chaosRoll ? variant : 'none',
    secrets,
    impostorIndexes,
    selectedEntry: selection
  };
};
