import { Component } from '@angular/core';
import {
  CategorySource,
  Difficulty,
  WordEntry,
  buildCategorySources,
  collectActiveEntries,
  collectAllEntries,
  pickWordEntry
} from './utils/word-data';
import { Role, assignRoles, formatTime, parseBoundedInt } from './utils/game-utils';

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
  categorySources: CategorySource[] = buildCategorySources();

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
    return collectActiveEntries(this.categorySources);
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
    return formatTime(this.roundSeconds);
  }

  goToPlayers(): void {
    this.screen = 'players';
  }

  confirmPlayers(): void {
    const parsed = parseBoundedInt(
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
    const parsed = parseBoundedInt(
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
    const entries = collectActiveEntries(this.categorySources);
    const selection = pickWordEntry(
      entries.length > 0 ? entries : collectAllEntries(this.categorySources),
      this.hintDifficulty
    );

    this.category = selection.category;
    this.word = selection.word;
    this.hint = selection.hint;
    this.roles = assignRoles(this.totalPlayers, this.impostors);
    this.starterIndex = Math.floor(Math.random() * this.totalPlayers);
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
}
