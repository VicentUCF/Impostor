import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GameTimerService {
  private passTimeoutId: number | undefined;
  private roundIntervalId: number | undefined;

  startPassDelay(delayMs: number, onReady: () => void): void {
    this.clearPassDelay();
    this.passTimeoutId = window.setTimeout(() => {
      onReady();
    }, delayMs);
  }

  clearPassDelay(): void {
    if (this.passTimeoutId !== undefined) {
      window.clearTimeout(this.passTimeoutId);
      this.passTimeoutId = undefined;
    }
  }

  startRoundTimer(
    onTick: (seconds: number) => void,
    onRevealReady: () => void,
    revealAfterSeconds = 10
  ): void {
    this.clearRoundTimer();
    let seconds = 0;
    let revealReady = false;

    onTick(seconds);

    this.roundIntervalId = window.setInterval(() => {
      seconds += 1;
      onTick(seconds);

      if (!revealReady && seconds >= revealAfterSeconds) {
        revealReady = true;
        onRevealReady();
      }
    }, 1000);
  }

  clearRoundTimer(): void {
    if (this.roundIntervalId !== undefined) {
      window.clearInterval(this.roundIntervalId);
      this.roundIntervalId = undefined;
    }
  }

  clearAll(): void {
    this.clearPassDelay();
    this.clearRoundTimer();
  }
}
