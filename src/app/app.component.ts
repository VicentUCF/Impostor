import { Component } from '@angular/core';

type Screen =
  | 'intro'
  | 'players'
  | 'names'
  | 'impostors'
  | 'ready'
  | 'player-confirm'
  | 'role-reveal'
  | 'pass-device'
  | 'starter'
  | 'round-live'
  | 'reveal';

type Role = 'crew' | 'impostor';

interface WordCluster {
  name: string;
  words: string[];
}

interface Category {
  name: string;
  clusters: WordCluster[];
}

const WORD_LIBRARY: Category[] = [
  {
    name: 'LUGARES',
    clusters: [
      { name: 'CIUDAD', words: ['METRO', 'PUENTE', 'PLAZA', 'CALLE', 'TUNEL'] },
      { name: 'INTERIOR', words: ['COCINA', 'SALA', 'BANO', 'PASILLO', 'ASCENSOR'] },
      { name: 'OCIO', words: ['CINE', 'TEATRO', 'ESTADIO', 'MUSEO', 'HOTEL'] }
    ]
  },
  {
    name: 'OBJETOS',
    clusters: [
      { name: 'HOGAR', words: ['LAMPARA', 'CUCHILLO', 'ESPEJO', 'COJIN', 'RELOJ'] },
      { name: 'TECNO', words: ['TABLET', 'CABLE', 'CAMARA', 'TECLADO', 'ROUTER'] },
      { name: 'RUTA', words: ['MALETA', 'MAPA', 'MOCHILA', 'BILLETE', 'LLAVE'] }
    ]
  },
  {
    name: 'OFICIOS',
    clusters: [
      { name: 'SERVICIO', words: ['MEDICO', 'BOMBERO', 'PILOTO', 'COCINERO', 'GUARDIA'] },
      { name: 'CREATIVO', words: ['DISENADOR', 'FOTOGRAFO', 'ACTOR', 'MUSICO', 'ARQUITECTO'] },
      { name: 'TECNICO', words: ['MECANICO', 'ELECTRICISTA', 'PROGRAMADOR', 'INGENIERO', 'CARPINTERO'] }
    ]
  },
  {
    name: 'COMIDA',
    clusters: [
      { name: 'DULCE', words: ['HELADO', 'GALLETAS', 'PASTEL', 'CHOCOLATE', 'CARAMELO'] },
      { name: 'SALADO', words: ['PIZZA', 'TACO', 'SOPA', 'ARROZ', 'ENSALADA'] },
      { name: 'BEBIDA', words: ['AGUA', 'CAFE', 'TE', 'JUGO', 'REFRESCO'] }
    ]
  }
];

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
  cluster = '';
  word = '';

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
  }

  revealImpostors(): void {
    this.screen = 'reveal';
  }

  newRound(): void {
    this.clearPassTimeout();
    this.passReady = false;
    this.currentPlayer = 1;
    this.setupRound();
    this.screen = 'ready';
  }

  resetRound(): void {
    this.clearPassTimeout();
    this.passReady = false;
    this.currentPlayer = 1;
    this.playerNames = [];
    this.screen = 'players';
  }

  trackByIndex(index: number): number {
    return index;
  }

  private setupRound(): void {
    const selection = this.pickWord();
    this.category = selection.category;
    this.cluster = selection.cluster;
    this.word = selection.word;
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

  private pickWord(): { category: string; cluster: string; word: string } {
    const category = this.randomItem(WORD_LIBRARY);
    const cluster = this.randomItem(category.clusters);
    const word = this.randomItem(cluster.words);

    return { category: category.name, cluster: cluster.name, word };
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
    }, 900);
  }

  private clearPassTimeout(): void {
    if (this.passTimeoutId !== undefined) {
      window.clearTimeout(this.passTimeoutId);
      this.passTimeoutId = undefined;
    }
  }
}
