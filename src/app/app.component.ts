import { Component } from '@angular/core';
import deportesData from '../db/Deportes.json';
import escapeRoomsData from '../db/EscapeRooms.json';
import juegosData from '../db/Juegos.json';
import marcasData from '../db/Marcas.json';
import padelData from '../db/Padel.json';
import peliculasData from '../db/Peliculas.json';
import seriesData from '../db/Series.json';
import trabajosData from '../db/Trabajos.json';

type Screen =
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

type Role = 'crew' | 'impostor';
type Difficulty = 'easy' | 'normal' | 'hard';

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

interface WordEntry {
  category: string;
  hints: WordHints;
  words: string[];
}

interface CategorySource {
  id: string;
  label: string;
  entries: WordEntry[];
  enabled: boolean;
}

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

const buildSources = (): CategorySource[] => {
  const deportesRaw = Array.isArray(deportesData) ? (deportesData as WordEntryRaw[]) : [];
  const escapeRoomsRaw = Array.isArray(escapeRoomsData)
    ? (escapeRoomsData as WordEntryRaw[])
    : [];
  const juegosRaw = Array.isArray(juegosData) ? (juegosData as WordEntryRaw[]) : [];
  const marcasRaw = Array.isArray(marcasData) ? (marcasData as WordEntryRaw[]) : [];
  const padelRaw = Array.isArray(padelData) ? (padelData as WordEntryRaw[]) : [];
  const peliculasRaw = Array.isArray(peliculasData) ? (peliculasData as WordEntryRaw[]) : [];
  const seriesRaw = Array.isArray(seriesData) ? (seriesData as WordEntryRaw[]) : [];
  const trabajosRaw = Array.isArray(trabajosData) ? (trabajosData as WordEntryRaw[]) : [];

  const sources = [
    {
      id: 'deportes',
      fallbackLabel: 'Deportes',
      raw: deportesRaw
    },
    {
      id: 'escape-rooms',
      fallbackLabel: 'Escape Room',
      raw: escapeRoomsRaw
    },
    {
      id: 'juegos',
      fallbackLabel: 'Juegos',
      raw: juegosRaw
    },
    {
      id: 'marcas',
      fallbackLabel: 'Marcas',
      raw: marcasRaw
    },
    {
      id: 'padel',
      fallbackLabel: 'Padel',
      raw: padelRaw
    },
    {
      id: 'peliculas',
      fallbackLabel: 'Peliculas',
      raw: peliculasRaw
    },
    {
      id: 'series',
      fallbackLabel: 'Series',
      raw: seriesRaw
    },
    {
      id: 'trabajos',
      fallbackLabel: 'Trabajos',
      raw: trabajosRaw
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

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Impostor';
  screen: Screen = 'intro';

  minPlayers = 3;
  maxPlayers = 12;

  totalPlayersInput = '3';
  impostorsInput = '1';

  totalPlayers = 3;
  impostors = 1;

  playerNames: string[] = [];

  currentPlayer = 1;
  starterIndex = 0;
  roles: Role[] = [];

  category = '';
  word = '';
  hint = '';

  showCategory = true;
  showHint = true;
  hintDifficulty: Difficulty = 'normal';
  categorySources: CategorySource[] = buildSources();

  roundSeconds = 0;
  canReveal = false;
  private roundTimerId: number | undefined;

  passReady = false;
  private passTimeoutId: number | undefined;

  get isImpostor(): boolean {
    return this.roles[this.currentPlayer - 1] === 'impostor';
  }

  get maxImpostors(): number {
    return Math.max(1, this.totalPlayers - 1);
  }

  get currentPlayerName(): string {
    return this.playerNames[this.currentPlayer - 1] || `JUGADOR ${this.currentPlayer}`;
  }

  get nextPlayerName(): string {
    return this.playerNames[this.currentPlayer] || `JUGADOR ${this.currentPlayer + 1}`;
  }

  get hasNextPlayer(): boolean {
    return this.currentPlayer < this.totalPlayers;
  }

  get starterName(): string {
    return this.playerNames[this.starterIndex] || `JUGADOR ${this.starterIndex + 1}`;
  }

  get filledNamesCount(): number {
    return this.playerNames.filter((name) => name.trim().length > 0).length;
  }

  get allNamesFilled(): boolean {
    return this.playerNames.length > 0 && this.filledNamesCount === this.playerNames.length;
  }

  get selectedSourcesCount(): number {
    return this.categorySources.filter((source) => source.enabled).length;
  }

  get totalSourcesCount(): number {
    return this.categorySources.length;
  }

  get activeEntries(): WordEntry[] {
    return this.categorySources
      .filter((source) => source.enabled && source.entries.length > 0)
      .flatMap((source) => source.entries);
  }

  get canConfirmConfig(): boolean {
    return this.activeEntries.length > 0;
  }

  get impostorNames(): string[] {
    return this.roles
      .map((role, index) =>
        role === 'impostor' ? this.playerNames[index] || `JUGADOR ${index + 1}` : null
      )
      .filter((name): name is string => name !== null);
  }

  get impostorLabel(): string {
    return this.impostorNames.length === 1 ? 'IMPOSTOR' : 'IMPOSTORES';
  }

  get roundTimerLabel(): string {
    return this.formatTime(this.roundSeconds);
  }

  goToPlayers(): void {
    this.screen = 'players';
  }

  confirmPlayers(): void {
    const parsed = this.parseBounded(
      this.totalPlayersInput,
      this.minPlayers,
      this.maxPlayers,
      this.totalPlayers
    );
    this.totalPlayers = parsed;
    this.totalPlayersInput = String(parsed);

    if (this.impostors > this.maxImpostors) {
      this.impostors = this.maxImpostors;
      this.impostorsInput = String(this.impostors);
    }

    this.playerNames = Array.from(
      { length: this.totalPlayers },
      (_, index) => this.playerNames[index] || ''
    );
    this.screen = 'names';
  }

  updateName(index: number, value: string): void {
    this.playerNames[index] = value;
  }

  confirmNames(): void {
    if (!this.allNamesFilled) {
      return;
    }

    this.screen = 'impostors';
  }

  confirmImpostors(): void {
    const parsed = this.parseBounded(
      this.impostorsInput,
      1,
      this.maxImpostors,
      this.impostors
    );
    this.impostors = parsed;
    this.impostorsInput = String(parsed);

    this.screen = 'config';
  }

  toggleShowCategory(): void {
    this.showCategory = !this.showCategory;
  }

  toggleShowHint(): void {
    this.showHint = !this.showHint;
  }

  setHintDifficulty(difficulty: Difficulty): void {
    this.hintDifficulty = difficulty;
  }

  toggleCategory(source: CategorySource): void {
    if (source.entries.length === 0) {
      return;
    }

    source.enabled = !source.enabled;
  }

  confirmConfig(): void {
    if (!this.canConfirmConfig) {
      return;
    }

    this.setupRound();
    this.screen = 'ready';
  }

  startRoles(): void {
    this.passReady = false;
    this.currentPlayer = 1;
    this.screen = 'player-confirm';
  }

  revealRole(): void {
    this.screen = 'role-reveal';
  }

  hideRole(): void {
    if (this.currentPlayer < this.totalPlayers) {
      this.screen = 'pass-device';
      this.startPassDelay();
      return;
    }

    this.clearPassTimeout();
    this.passReady = false;
    this.screen = 'starter';
  }

  continueAfterPass(): void {
    if (!this.passReady) {
      return;
    }

    this.clearPassTimeout();
    this.passReady = false;

    if (this.currentPlayer < this.totalPlayers) {
      this.currentPlayer += 1;
      this.screen = 'player-confirm';
      return;
    }

    this.screen = 'starter';
  }

  startRound(): void {
    this.screen = 'round-live';
    this.startRoundTimer();
  }

  revealImpostors(): void {
    this.clearRoundTimer();
    this.screen = 'reveal';
  }

  newRound(): void {
    this.clearPassTimeout();
    this.clearRoundTimer();
    this.passReady = false;
    this.currentPlayer = 1;
    this.setupRound();
    this.screen = 'ready';
  }

  resetRound(): void {
    this.clearPassTimeout();
    this.clearRoundTimer();
    this.passReady = false;
    this.currentPlayer = 1;
    this.playerNames = [];
    this.screen = 'players';
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackBySource(index: number, source: CategorySource): string {
    return source.id;
  }

  private setupRound(): void {
    const selection = this.pickWord();
    this.category = selection.category;
    this.word = selection.word;
    this.hint = selection.hint;
    this.roles = this.assignRoles();
    this.starterIndex = Math.floor(Math.random() * this.totalPlayers);
  }

  private parseBounded(value: string, min: number, max: number, fallback: number): number {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return fallback;
    }
    return Math.min(Math.max(parsed, min), max);
  }

  private assignRoles(): Role[] {
    const roles: Role[] = Array.from({ length: this.totalPlayers }, () => 'crew');
    const order = this.shuffle(Array.from({ length: this.totalPlayers }, (_, index) => index));

    for (let i = 0; i < this.impostors; i += 1) {
      roles[order[i]] = 'impostor';
    }

    return roles;
  }

  private pickWord(): { category: string; hint: string; word: string } {
    const entries = this.activeEntries.length > 0 ? this.activeEntries : this.allEntries();

    if (entries.length === 0) {
      return { category: '', hint: '', word: '' };
    }

    const entry = this.randomItem(entries);
    const word = this.randomItem(entry.words);
    const difficultyHints = entry.hints[this.hintDifficulty] ?? [];
    const hint = difficultyHints.length > 0 ? this.randomItem(difficultyHints) : 'SIN PISTA';

    return { category: entry.category, hint, word };
  }

  private allEntries(): WordEntry[] {
    return this.categorySources.flatMap((source) => source.entries);
  }

  private randomItem<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  private shuffle<T>(items: T[]): T[] {
    const copy = [...items];

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }

    return copy;
  }

  private startPassDelay(): void {
    this.clearPassTimeout();
    this.passReady = false;
    this.passTimeoutId = window.setTimeout(() => {
      this.passReady = true;
    }, 400);
  }

  private startRoundTimer(): void {
    this.clearRoundTimer();
    this.roundSeconds = 0;
    this.canReveal = false;
    this.roundTimerId = window.setInterval(() => {
      this.roundSeconds += 1;
      if (this.roundSeconds >= 10) {
        this.canReveal = true;
      }
    }, 1000);
  }

  private clearPassTimeout(): void {
    if (this.passTimeoutId !== undefined) {
      window.clearTimeout(this.passTimeoutId);
      this.passTimeoutId = undefined;
    }
  }

  private clearRoundTimer(): void {
    if (this.roundTimerId !== undefined) {
      window.clearInterval(this.roundTimerId);
      this.roundTimerId = undefined;
    }
    this.roundSeconds = 0;
    this.canReveal = false;
  }

  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}
