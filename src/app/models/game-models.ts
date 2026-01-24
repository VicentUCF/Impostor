import { Difficulty, WordSelection } from './word-models';

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

export type ConfigPanel = 'impostor' | 'themes';

export type RoundMode = 'normal' | 'chaos';

export type ChaosVariant =
  | 'none'
  | 'no-impostor'
  | 'all-impostors'
  | 'roles-inverted'
  | 'double-impostor';

export interface RoundConfig {
  showCategory: boolean;
  showHint: boolean;
  hintDifficulty: Difficulty;
  chaosChance: number;
}

export interface PlayerSecret {
  role: Role;
  word: string;
  hint: string;
  category: string;
}

export interface RoundState {
  mode: RoundMode;
  variant: ChaosVariant;
  secrets: PlayerSecret[];
  impostorIndexes: number[];
  selectedEntry: WordSelection;
}
