import { Component, OnDestroy } from '@angular/core';
import { formatTime, parseBoundedInt } from './utils/game-utils';
import { GameTimerService } from './services/game-timer.service';
import { ConfigPanel, PlayerSecret, RoundConfig, RoundState, Screen } from './models/game-models';
import { CategorySource, Difficulty, WordEntry } from './models/word-models';
import {
  buildCategorySources,
  collectActiveEntries
} from './utils/word-data';
import { createRoundState } from './utils/game-engine';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {
  title = 'Impostor';
  screen: Screen = 'intro';

  configPanels: Record<ConfigPanel, boolean> = {
    impostor: true,
    themes: false
  };

  minPlayers = 3;
  maxPlayers = 12;

  totalPlayersInput = '3';
  impostorsInput = '1';

  totalPlayers = 3;
  impostors = 1;

  playerNames: string[] = [];

  currentPlayer = 1;
  starterIndex = 0;
  roundState: RoundState | null = null;

  showCategory = true;
  showHint = true;
  hintDifficulty: Difficulty = 'normal';
  chaosChance = 0.2;
  categorySources: CategorySource[] = buildCategorySources();

  roundSeconds = 0;
  canReveal = false;

  passReady = false;
  chaosRevealStage: 'none' | 'banner' | 'message' = 'none';
  chaosNamesVisible = 0;
  private chaosTimeoutIds: number[] = [];
  private chaosNamesIntervalId: number | undefined;

  constructor(private readonly timerService: GameTimerService) {}

  get isImpostor(): boolean {
    return this.currentSecret?.role === 'impostor';
  }

  get currentSecret(): PlayerSecret | null {
    return this.roundState?.secrets[this.currentPlayer - 1] ?? null;
  }

  get currentWord(): string {
    return this.currentSecret?.word ?? '';
  }

  get currentHint(): string {
    return this.currentSecret?.hint ?? '';
  }

  get currentCategory(): string {
    return this.currentSecret?.category ?? '';
  }

  get revealWord(): string {
    return this.roundState?.selectedEntry.word ?? '';
  }

  get revealHint(): string {
    return this.roundState?.selectedEntry.hint ?? '';
  }

  get revealCategory(): string {
    return this.roundState?.selectedEntry.category ?? '';
  }

  get isChaosRound(): boolean {
    return this.roundState?.mode === 'chaos';
  }

  get isChaosRevealable(): boolean {
    return (
      this.roundState?.mode === 'chaos' &&
      this.roundState?.variant !== 'roles-inverted' &&
      this.roundState?.variant !== 'none'
    );
  }

  get showChaosBanner(): boolean {
    return this.isChaosRevealable && this.chaosRevealStage !== 'none';
  }

  get showChaosMessage(): boolean {
    return this.isChaosRevealable && this.chaosRevealStage === 'message';
  }

  get chaosVariantMessage(): string {
    switch (this.roundState?.variant) {
      case 'no-impostor':
        return 'NO HABIA IMPOSTOR';
      case 'all-impostors':
        return 'TODOS ERAIS IMPOSTORES';
      case 'double-impostor':
        return 'HABIA 2 IMPOSTORES';
      default:
        return '';
    }
  }

  get chaosNamesToShow(): string[] {
    if (!this.showChaosMessage || this.roundState?.variant !== 'double-impostor') {
      return [];
    }

    return this.impostorNames.slice(0, this.chaosNamesVisible);
  }

  get showRolesInvertedHint(): boolean {
    return this.roundState?.variant === 'roles-inverted';
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
    const indexes = this.roundState?.impostorIndexes ?? [];
    return indexes.map((index) => this.playerNames[index] || `JUGADOR ${index + 1}`);
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

  toggleConfigPanel(panel: ConfigPanel): void {
    this.configPanels[panel] = !this.configPanels[panel];
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
    this.startChaosReveal();
  }

  newRound(): void {
    this.clearPassTimeout();
    this.clearRoundTimer();
    this.clearChaosReveal();
    this.passReady = false;
    this.currentPlayer = 1;
    this.setupRound();
    this.screen = 'ready';
  }

  resetRound(): void {
    this.clearPassTimeout();
    this.clearRoundTimer();
    this.clearChaosReveal();
    this.passReady = false;
    this.currentPlayer = 1;
    this.playerNames = [];
    this.roundState = null;
    this.screen = 'players';
  }

  ngOnDestroy(): void {
    this.timerService.clearAll();
    this.clearChaosReveal();
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackBySource(index: number, source: CategorySource): string {
    return source.id;
  }

  private setupRound(): void {
    const config: RoundConfig = {
      showCategory: this.showCategory,
      showHint: this.showHint,
      hintDifficulty: this.hintDifficulty,
      chaosChance: this.chaosChance
    };

    this.roundState = createRoundState({
      totalPlayers: this.totalPlayers,
      impostors: this.impostors,
      sources: this.categorySources,
      config
    });
    this.starterIndex = Math.floor(Math.random() * this.totalPlayers);
  }

  private startChaosReveal(): void {
    this.clearChaosReveal();
    this.chaosRevealStage = 'none';
    this.chaosNamesVisible = 0;

    if (!this.isChaosRevealable) {
      return;
    }

    this.chaosTimeoutIds.push(
      window.setTimeout(() => {
        this.chaosRevealStage = 'banner';
      }, 1000)
    );

    this.chaosTimeoutIds.push(
      window.setTimeout(() => {
        this.chaosRevealStage = 'message';
        this.startChaosNamesReveal();
      }, 1700)
    );
  }

  private startChaosNamesReveal(): void {
    if (this.roundState?.variant !== 'double-impostor') {
      return;
    }

    const names = this.impostorNames;
    if (names.length === 0) {
      return;
    }

    this.chaosNamesVisible = 0;
    this.chaosNamesIntervalId = window.setInterval(() => {
      this.chaosNamesVisible += 1;
      if (this.chaosNamesVisible >= names.length) {
        if (this.chaosNamesIntervalId !== undefined) {
          window.clearInterval(this.chaosNamesIntervalId);
          this.chaosNamesIntervalId = undefined;
        }
      }
    }, 700);
  }

  private clearChaosReveal(): void {
    this.chaosTimeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    this.chaosTimeoutIds = [];

    if (this.chaosNamesIntervalId !== undefined) {
      window.clearInterval(this.chaosNamesIntervalId);
      this.chaosNamesIntervalId = undefined;
    }

    this.chaosRevealStage = 'none';
    this.chaosNamesVisible = 0;
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
