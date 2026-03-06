import { Location } from '@angular/common';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { AppComponent } from './app.component';
import { appRoutes } from './app-routing.module';
import { GamePageComponent } from './pages/game-page/game-page.component';
import { LandingPageComponent } from './pages/landing-page/landing-page.component';

describe('AppComponent routing', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes(appRoutes)],
      declarations: [AppComponent, LandingPageComponent, GamePageComponent]
    }).compileComponents();
  });

  it('should create the shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the landing on root', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);

    router.initialNavigation();
    tick();
    fixture.detectChanges();

    expect(location.path()).toBe('/');
    expect(fixture.nativeElement.textContent).toContain('Juego del impostor para móvil');
  }));

  it('should navigate to /jugar from the main CTA', fakeAsync(() => {
    spyOn<any>(GamePageComponent.prototype, 'startBackgroundDrift').and.stub();

    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);

    router.initialNavigation();
    tick();
    fixture.detectChanges();

    const cta = fixture.nativeElement.querySelector(
      '.landing-button--primary'
    ) as HTMLAnchorElement;

    cta.click();
    tick();
    fixture.detectChanges();

    expect(location.path()).toBe('/jugar');
    expect(fixture.nativeElement.textContent).toContain('INICIAR RONDA');
  }));

  it('should redirect unknown routes to /', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);

    router.navigateByUrl('/ruta-inexistente');
    tick();
    fixture.detectChanges();

    expect(location.path()).toBe('/');
    expect(router.url).toBe('/');
  }));
});
