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
