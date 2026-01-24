import { Component, OnDestroy } from '@angular/core';
import { assignRoles, formatTime, parseBoundedInt } from './utils/game-utils';
import { GameTimerService } from './services/game-timer.service';
import { Screen, Role } from './models/game-models';
import { CategorySource, Difficulty, WordEntry } from './models/word-models';
import {
  buildCategorySources,
  collectActiveEntries,
  collectAllEntries,
  pickWordEntry
} from './utils/word-data';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {
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

  passReady = false;

  constructor(private readonly timerService: GameTimerService) {}

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

  ngOnDestroy(): void {
    this.timerService.clearAll();
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
    this.passReady = false;
    this.timerService.startPassDelay(400, () => {
      this.passReady = true;
    });
  }

  private startRoundTimer(): void {
    this.roundSeconds = 0;
    this.canReveal = false;
    this.timerService.startRoundTimer(
      (seconds) => {
        this.roundSeconds = seconds;
      },
      () => {
        this.canReveal = true;
      },
      10
    );
  }

  private clearPassTimeout(): void {
    this.timerService.clearPassDelay();
  }

  private clearRoundTimer(): void {
    this.timerService.clearRoundTimer();
    this.roundSeconds = 0;
    this.canReveal = false;
  }
}
