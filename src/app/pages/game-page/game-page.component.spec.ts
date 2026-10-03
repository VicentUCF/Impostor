import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';

import { GamePageComponent } from './game-page.component';

describe('GamePageComponent', () => {
  beforeEach(async () => {
    window.sessionStorage.clear();
    window.localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [GamePageComponent]
    }).compileComponents();
  });

  it('persists the chosen mode independently of classic settings', () => {
    const fixture = TestBed.createComponent(GamePageComponent);
    const component = fixture.componentInstance;
    component.toggleShowHint();
    component.setGameType('facts');
    const restored = TestBed.createComponent(GamePageComponent).componentInstance;
    expect(restored.gameType).toBe('facts');
    expect(restored.showHint).toBeFalse();
    restored.setGameType('words');
    expect(restored.showHint).toBeFalse();
  });

  it('plays facts with disabled word categories and only shows sources after revealing', fakeAsync(() => {
    const fixture = TestBed.createComponent(GamePageComponent);
    const component = fixture.componentInstance;
    spyOn<any>(component, 'startBackgroundDrift').and.stub();
    component.chaosChanceBase = 0;
    component.playerNames = ['ANA', 'LUIS', 'MARTA'];
    component.categorySources.forEach((source) => source.enabled = false);
    component.screen = 'config';
    component.setGameType('facts');
    fixture.detectChanges();
    expect(component.canConfirmConfig).toBeTrue();
    expect(fixture.nativeElement.querySelector('.game-accordion')).toBeNull();
    component.confirmConfig();
    component.startRoles();

    for (let index = 0; index < component.totalPlayers; index += 1) {
      component.startRoleReveal();
      tick(240);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.game-fact-source')).toBeNull();
      if (component.isImpostor) {
        expect(fixture.nativeElement.textContent).toContain('NO TIENES DATO');
        expect(fixture.nativeElement.querySelector('.game-value--fact')).toBeNull();
      } else {
        expect(fixture.nativeElement.textContent).toContain(component.currentFact);
      }
      component.hideRole();
      tick(700);
    }

    component.startRound();
    tick(3000);
    component.revealImpostors();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.game-fact-source')).toBeNull();
    tick(5000);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.game-fact-source').length).toBe(2);
    expect(component.roundHistory.recentFactIds.length).toBe(2);
    component.newRound();
    expect(component.screen).toBe('ready');
    expect(component.roundState?.gameType).toBe('facts');
    component.ngOnDestroy();
  }));

  it('should preserve the round flow from setup to reveal', fakeAsync(() => {
    const fixture = TestBed.createComponent(GamePageComponent);
    const component = fixture.componentInstance;

    spyOn<any>(component, 'startBackgroundDrift').and.stub();
    fixture.detectChanges();

    component.goToPlayers();
    component.totalPlayersInput = '3';
    component.confirmPlayers();

    component.updateName(0, 'ANA');
    component.updateName(1, 'LUIS');
    component.updateName(2, 'MARTA');
    component.confirmNames();

    component.impostorsInput = '1';
    component.confirmImpostors();
    component.confirmConfig();

    expect(component.screen).toBe('ready');

    component.startRoles();
    expect(component.screen).toBe('player-confirm');

    for (let index = 0; index < component.totalPlayers; index += 1) {
      component.startRoleReveal();
      tick(240);
      expect(component.screen).toBe('role-reveal');

      component.hideRole();

      if (index < component.totalPlayers - 1) {
        expect(component.screen).toBe('pass-device');
        tick(700);
        expect(component.screen).toBe('player-confirm');
      }
    }

    expect(component.screen).toBe('starter');

    component.startRound();
    expect(component.screen).toBe('round-live');

    tick(3000);
    expect(component.canReveal).toBeTrue();

    component.revealImpostors();
    expect(component.screen).toBe('reveal');

    tick(5000);
    component.ngOnDestroy();
  }));
});
