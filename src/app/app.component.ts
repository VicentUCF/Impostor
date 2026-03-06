import { Component, OnDestroy, OnInit } from '@angular/core';
import { formatTime, parseBoundedInt } from './utils/game-utils';
import { GameTimerService } from './services/game-timer.service';
import { ConfigPanel, PlayerSecret, RoundConfig, RoundState, Screen } from './models/game-models';
import { CategorySource, Difficulty, WordEntry } from './models/word-models';
import {
  buildCategorySources,
  collectActiveEntries
} from './utils/word-data';
import { createRoundState } from './utils/game-engine';

interface SavedConfig {
  showCategory?: boolean;
  showHint?: boolean;
  hintDifficulty?: Difficulty;
  categoryEnabled?: Record<string, boolean>;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy, OnInit {
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
  chaosChanceBase = 0.2;
  chaosChanceIncrement = 0.01;
  categorySources: CategorySource[] = buildCategorySources();

  roundSeconds = 0;
  canReveal = false;

  chaosRevealStage: 'none' | 'fake' | 'pause' | 'glitch' | 'reveal' | 'detail' | 'final' =
    'none';
  chaosNamesVisible = 0;
  normalRevealStage: 'none' | 'prep' | 'pause' | 'reveal' | 'transition' | 'final' = 'none';
  roleRevealPending = false;
  roundsPlayed = 0;
  private chaosTimeoutIds: number[] = [];
  private chaosNamesIntervalId: number | undefined;
  private normalTimeoutIds: number[] = [];
  private roleRevealTimeoutId: number | undefined;
  private backgroundDriftTimeoutId: number | undefined;
  private readonly roundsPlayedKey = 'impostor.roundsPlayed';
  private readonly configStorageKey = 'impostor.config';
  private readonly totalPlayersKey = 'impostor.totalPlayers';
  private readonly impostorsKey = 'impostor.impostors';
  private readonly playerNamesKey = 'impostor.playerNames';

  constructor(private readonly timerService: GameTimerService) {
    this.roundsPlayed = this.readRoundsPlayed();
    this.loadSavedPlayerCounts();
    this.loadSavedPlayerNames();
    this.loadSavedConfig();
  }

  ngOnInit(): void {
    this.startBackgroundDrift();
  }

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

  get showChaosFake(): boolean {
    return (
      this.isChaosRevealable &&
      (this.chaosRevealStage === 'fake' ||
        this.chaosRevealStage === 'pause' ||
        this.chaosRevealStage === 'glitch')
    );
  }

  get showChaosHeadline(): boolean {
    return (
      this.isChaosRevealable &&
      (this.chaosRevealStage === 'reveal' ||
        this.chaosRevealStage === 'detail' ||
        this.chaosRevealStage === 'final')
    );
  }

  get showChaosDetail(): boolean {
    return (
      this.isChaosRevealable &&
      (this.chaosRevealStage === 'detail' || this.chaosRevealStage === 'final')
    );
  }

  get showChaosFinalDetails(): boolean {
    return this.isChaosRevealable && this.chaosRevealStage === 'final';
  }

  get isChaosGlitch(): boolean {
    return this.isChaosRevealable && this.chaosRevealStage === 'glitch';
  }

  get chaosHeadline(): string {
    return 'RONDA CAOS';
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
    if (!this.showChaosDetail || this.roundState?.variant !== 'double-impostor') {
      return [];
    }

    return this.impostorNames.slice(0, this.chaosNamesVisible);
  }

  get canExitReveal(): boolean {
    if (this.isChaosRevealable) {
      return this.showChaosFinalDetails;
    }

    return this.normalRevealStage === 'final' || this.normalRevealStage === 'none';
  }

  get showNormalRevealBlock(): boolean {
    return this.normalRevealStage !== 'none' && this.normalRevealStage !== 'final';
  }

  get showNormalLead(): boolean {
    return this.showNormalRevealBlock;
  }

  get normalLeadText(): string {
    const plural = this.impostorNames.length > 1;
    const base = plural ? 'LOS IMPOSTORES ERAN' : 'EL IMPOSTOR ERA';
    return this.normalRevealStage === 'prep' || this.normalRevealStage === 'pause'
      ? `${base}...`
      : base;
  }

  get showNormalName(): boolean {
    return this.normalRevealStage === 'reveal' || this.normalRevealStage === 'transition';
  }

  get showNormalClosure(): boolean {
    return this.normalRevealStage === 'transition';
  }

  get showNormalFinalDetails(): boolean {
    return this.normalRevealStage === 'final';
  }

  get normalRevealName(): string {
    if (this.impostorNames.length === 1) {
      return this.impostorNames[0];
    }

    return this.impostorNames.length > 1 ? this.impostorLabel : '';
  }

  get showImpostorRevealSection(): boolean {
    if (!this.isChaosRevealable) {
      return true;
    }

    return (
      this.roundState?.variant !== 'no-impostor' &&
      this.roundState?.variant !== 'all-impostors'
    );
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
    this.persistPlayerNames();
    this.persistPlayerCounts();
    this.persistConfig();
    this.screen = 'names';
  }

  updateName(index: number, value: string): void {
    this.playerNames[index] = value;
    this.persistPlayerNames();
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

    this.persistPlayerCounts();
    this.persistConfig();
    this.screen = 'config';
  }

  toggleConfigPanel(panel: ConfigPanel): void {
    this.configPanels[panel] = !this.configPanels[panel];
  }

  toggleShowCategory(): void {
    this.showCategory = !this.showCategory;
    this.persistConfig();
  }

  toggleShowHint(): void {
    this.showHint = !this.showHint;
    this.persistConfig();
  }

  setHintDifficulty(difficulty: Difficulty): void {
    this.hintDifficulty = difficulty;
    this.persistConfig();
  }

  toggleCategory(source: CategorySource): void {
    if (source.entries.length === 0) {
      return;
    }

    source.enabled = !source.enabled;
    this.persistConfig();
  }

  confirmConfig(): void {
    if (!this.canConfirmConfig) {
      return;
    }

    this.setupRound();
    this.persistConfig();
    this.screen = 'ready';
  }

  startRoles(): void {
    this.clearRoleReveal();
    this.currentPlayer = 1;
    this.screen = 'player-confirm';
  }

  startRoleReveal(): void {
    if (this.roleRevealPending) {
      return;
    }

    this.clearRoleReveal();
    this.roleRevealPending = true;
    this.roleRevealTimeoutId = window.setTimeout(() => {
      this.revealRole();
    }, 240);
  }

  hideRole(): void {
    if (this.currentPlayer < this.totalPlayers) {
      this.screen = 'pass-device';
      this.startPassDelay();
      return;
    }

    this.clearPassTimeout();
    this.screen = 'starter';
  }

  startRound(): void {
    this.screen = 'round-live';
    this.startRoundTimer();
  }

  revealImpostors(): void {
    this.clearRoundTimer();
    this.incrementRoundsPlayed();
    this.screen = 'reveal';
    if (this.isChaosRevealable) {
      this.startChaosReveal();
    } else {
      this.startNormalReveal();
    }
  }

  newRound(): void {
    this.clearPassTimeout();
    this.clearRoundTimer();
    this.clearChaosReveal();
    this.clearNormalReveal();
    this.clearRoleReveal();
    this.currentPlayer = 1;
    this.setupRound();
    this.screen = 'ready';
  }

  resetRound(): void {
    this.clearPassTimeout();
    this.clearRoundTimer();
    this.clearChaosReveal();
    this.clearNormalReveal();
    this.clearRoleReveal();
    this.currentPlayer = 1;
    this.playerNames = [];
    this.clearSavedPlayerNames();
    this.roundState = null;
    this.screen = 'players';
  }

  ngOnDestroy(): void {
    this.timerService.clearAll();
    this.clearChaosReveal();
    this.clearNormalReveal();
    this.clearRoleReveal();
    this.clearBackgroundDrift();
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackBySource(index: number, source: CategorySource): string {
    return source.id;
  }

  private setupRound(): void {
    const chaosChance = this.computeChaosChance();
    const config: RoundConfig = {
      showCategory: this.showCategory,
      showHint: this.showHint,
      hintDifficulty: this.hintDifficulty,
      chaosChance
    };
    const previousSelection = this.roundState?.selectedEntry ?? null;

    this.roundState = createRoundState({
      totalPlayers: this.totalPlayers,
      impostors: this.impostors,
      sources: this.categorySources,
      config,
      previousSelection
    });
    this.starterIndex = Math.floor(Math.random() * this.totalPlayers);
  }

  private computeChaosChance(): number {
    const chance = this.chaosChanceBase + this.roundsPlayed * this.chaosChanceIncrement;
    return Math.min(Math.max(chance, 0), 1);
  }

  private readRoundsPlayed(): number {
    if (typeof window === 'undefined') {
      return 0;
    }

    try {
      const stored = window.sessionStorage.getItem(this.roundsPlayedKey);
      const parsed = Number.parseInt(stored ?? '0', 10);
      return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
    } catch {
      return 0;
    }
  }

  private writeRoundsPlayed(value: number): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.sessionStorage.setItem(this.roundsPlayedKey, String(value));
    } catch {
      // Ignore storage errors (private mode, disabled storage).
    }
  }

  private incrementRoundsPlayed(): void {
    this.roundsPlayed += 1;
    this.writeRoundsPlayed(this.roundsPlayed);
  }

  private loadSavedConfig(): void {
    const saved = this.readSavedConfig();
    if (!saved) {
      return;
    }

    if (typeof saved.showCategory === 'boolean') {
      this.showCategory = saved.showCategory;
    }

    if (typeof saved.showHint === 'boolean') {
      this.showHint = saved.showHint;
    }

    if (saved.hintDifficulty === 'easy' || saved.hintDifficulty === 'normal' || saved.hintDifficulty === 'hard') {
      this.hintDifficulty = saved.hintDifficulty;
    }

    if (saved.categoryEnabled && typeof saved.categoryEnabled === 'object') {
      this.categorySources = this.categorySources.map((source) => {
        const enabled = saved.categoryEnabled?.[source.id];
        if (typeof enabled === 'boolean' && source.entries.length > 0) {
          return { ...source, enabled };
        }

        return source;
      });
    }
  }

  private persistConfig(): void {
    const payload: SavedConfig = {
      showCategory: this.showCategory,
      showHint: this.showHint,
      hintDifficulty: this.hintDifficulty,
      categoryEnabled: this.categorySources.reduce<Record<string, boolean>>((acc, source) => {
        acc[source.id] = source.enabled;
        return acc;
      }, {})
    };

    this.writeSavedConfig(payload);
  }

  private loadSavedPlayerCounts(): void {
    const storedPlayers = this.readSessionValue(this.totalPlayersKey);
    if (storedPlayers !== null) {
      const parsedPlayers = parseBoundedInt(
        storedPlayers,
        this.minPlayers,
        this.maxPlayers,
        this.totalPlayers
      );
      this.totalPlayers = parsedPlayers;
      this.totalPlayersInput = String(parsedPlayers);
    }

    const storedImpostors = this.readSessionValue(this.impostorsKey);
    if (storedImpostors !== null) {
      const parsedImpostors = parseBoundedInt(
        storedImpostors,
        1,
        this.maxImpostors,
        this.impostors
      );
      this.impostors = parsedImpostors;
      this.impostorsInput = String(parsedImpostors);
    }
  }

  private persistPlayerCounts(): void {
    this.writeSessionValue(this.totalPlayersKey, this.totalPlayers);
    this.writeSessionValue(this.impostorsKey, this.impostors);
  }

  private loadSavedPlayerNames(): void {
    const stored = this.readSessionJson(this.playerNamesKey);
    if (!Array.isArray(stored)) {
      return;
    }

    const names = stored.filter((entry): entry is string => typeof entry === 'string');
    if (names.length === 0) {
      return;
    }

    this.playerNames = Array.from(
      { length: this.totalPlayers },
      (_, index) => names[index] ?? ''
    );
  }

  private persistPlayerNames(): void {
    this.writeSessionJson(this.playerNamesKey, this.playerNames);
  }

  private clearSavedPlayerNames(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.sessionStorage.removeItem(this.playerNamesKey);
    } catch {
      // Ignore storage errors.
    }
  }

  private readSessionJson(key: string): unknown {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const stored = window.sessionStorage.getItem(key);
      if (!stored) {
        return null;
      }
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  private writeSessionJson(key: string, value: unknown): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage errors.
    }
  }

  private readSessionValue(key: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private writeSessionValue(key: string, value: number): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.sessionStorage.setItem(key, String(value));
    } catch {
      // Ignore storage errors.
    }
  }

  private readSavedConfig(): SavedConfig | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const stored = window.localStorage.getItem(this.configStorageKey);
      if (!stored) {
        return null;
      }
      return JSON.parse(stored) as SavedConfig;
    } catch {
      return null;
    }
  }

  private writeSavedConfig(config: SavedConfig): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(this.configStorageKey, JSON.stringify(config));
    } catch {
      // Ignore storage errors.
    }
  }

  private startBackgroundDrift(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion?.matches) {
      return;
    }

    this.applyRandomBackgroundPositions();
    this.scheduleBackgroundDrift();
  }

  private scheduleBackgroundDrift(): void {
    const delay = this.randomBetween(9000, 14000);
    this.backgroundDriftTimeoutId = window.setTimeout(() => {
      this.applyRandomBackgroundPositions();
      this.scheduleBackgroundDrift();
    }, delay);
  }

  private applyRandomBackgroundPositions(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const x1 = this.randomBetween(0, 35);
    const y1 = this.randomBetween(0, 35);
    const x2 = this.randomBetween(65, 100);
    const y2 = this.randomBetween(0, 35);
    const position = `${x1.toFixed(1)}% ${y1.toFixed(1)}%, ${x2.toFixed(1)}% ${y2.toFixed(1)}%, 0% 0%`;
    document.body.style.backgroundPosition = position;
  }

  private clearBackgroundDrift(): void {
    if (this.backgroundDriftTimeoutId !== undefined) {
      window.clearTimeout(this.backgroundDriftTimeoutId);
      this.backgroundDriftTimeoutId = undefined;
    }
  }

  private randomBetween(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private startChaosReveal(): void {
    this.clearChaosReveal();
    this.clearNormalReveal();
    this.chaosRevealStage = 'none';
    this.chaosNamesVisible = 0;

    if (!this.isChaosRevealable) {
      return;
    }

    this.chaosRevealStage = 'fake';

    this.chaosTimeoutIds.push(
      window.setTimeout(() => {
        this.chaosRevealStage = 'pause';
      }, 700)
    );

    this.chaosTimeoutIds.push(
      window.setTimeout(() => {
        this.chaosRevealStage = 'glitch';
        this.triggerVibration(30);
      }, 1500)
    );

    this.chaosTimeoutIds.push(
      window.setTimeout(() => {
        this.chaosRevealStage = 'reveal';
        this.triggerVibration(120);
      }, 1800)
    );

    this.chaosTimeoutIds.push(
      window.setTimeout(() => {
        this.chaosRevealStage = 'detail';
        this.startChaosNamesReveal();
      }, 3000)
    );

    this.chaosTimeoutIds.push(
      window.setTimeout(() => {
        this.chaosRevealStage = 'final';
      }, 4700)
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

  private startNormalReveal(): void {
    this.clearNormalReveal();
    this.clearChaosReveal();
    this.normalRevealStage = 'prep';

    this.normalTimeoutIds.push(
      window.setTimeout(() => {
        this.normalRevealStage = 'pause';
      }, 600)
    );

    this.normalTimeoutIds.push(
      window.setTimeout(() => {
        this.normalRevealStage = 'reveal';
        this.triggerVibration(20);
      }, 1000)
    );

    this.normalTimeoutIds.push(
      window.setTimeout(() => {
        this.normalRevealStage = 'transition';
      }, 1900)
    );

    this.normalTimeoutIds.push(
      window.setTimeout(() => {
        this.normalRevealStage = 'final';
      }, 2400)
    );
  }

  private clearNormalReveal(): void {
    this.normalTimeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    this.normalTimeoutIds = [];
    this.normalRevealStage = 'none';
  }

  private revealRole(): void {
    this.clearRoleReveal();
    this.screen = 'role-reveal';
  }

  private clearRoleReveal(): void {
    if (this.roleRevealTimeoutId !== undefined) {
      window.clearTimeout(this.roleRevealTimeoutId);
      this.roleRevealTimeoutId = undefined;
    }

    this.roleRevealPending = false;
  }

  private triggerVibration(pattern: number | number[]): void {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) {
      return;
    }

    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors on unsupported devices.
    }
  }

  private startPassDelay(): void {
    this.timerService.startPassDelay(700, () => {
      this.advanceAfterPass();
    });
  }

  private advanceAfterPass(): void {
    this.clearPassTimeout();

    if (this.currentPlayer < this.totalPlayers) {
      this.currentPlayer += 1;
      this.screen = 'player-confirm';
      return;
    }

    this.screen = 'starter';
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
      3
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
