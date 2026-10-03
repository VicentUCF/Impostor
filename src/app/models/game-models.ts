import { Difficulty, WordSelection } from './word-models';
import { FactEntry } from './fact-models';

export type Screen =
  | 'intro'
  | 'players'
  | 'names'
  | 'impostors'
  | 'config'
  | 'ready'
  | 'player-confirm'
  | 'role-reveal'
  | 'pass-device'
  | 'starter'
  | 'round-live'
  | 'reveal';

export type Role = 'crew' | 'impostor';

export type GameType = 'words' | 'facts';

export type ConfigPanel = 'impostor' | 'themes';

export type RoundMode = 'normal' | 'chaos';

export type ChaosVariant =
  | 'none'
  | 'no-impostor'
  | 'all-impostors'
  | 'double-impostor';

export type RealChaosVariant = Exclude<ChaosVariant, 'none'>;

export interface RoundConfig {
  showCategory: boolean;
  showHint: boolean;
  hintDifficulty: Difficulty;
  chaosChance: number;
}

export interface RecentSelectionHistory {
  sourceId: string;
  subcategory: string;
  word: string;
  similarWords: string[];
}

export interface RoundHistory {
  recentSelections: RecentSelectionHistory[];
  recentFactIds: string[];
  starterHistory: number[];
  impostorHistory: number[][];
  chaosVariantHistory: RealChaosVariant[];
  roundsSinceLastChaos: number;
}

interface BasePlayerSecret {
  role: Role;
  hint: string;
  category: string;
}

export interface WordPlayerSecret extends BasePlayerSecret {
  word: string;
  fact?: never;
}

export interface FactPlayerSecret extends BasePlayerSecret {
  word?: never;
  fact: FactEntry | null;
}

export type PlayerSecret = WordPlayerSecret | FactPlayerSecret;

interface BaseRoundState {
  mode: RoundMode;
  variant: ChaosVariant;
  impostorIndexes: number[];
}

export interface WordRoundState extends BaseRoundState {
  gameType: 'words';
  secrets: WordPlayerSecret[];
  selectedEntry: WordSelection;
}

export interface FactRoundState extends BaseRoundState {
  gameType: 'facts';
  secrets: FactPlayerSecret[];
  selectedEntry?: never;
}

export type RoundState = WordRoundState | FactRoundState;
