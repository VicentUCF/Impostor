import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { GamePageComponent } from './game-page.component';

describe('GamePageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GamePageComponent]
    }).compileComponents();
  });

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
