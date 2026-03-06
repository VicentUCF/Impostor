import { Location } from '@angular/common';
import { fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { Router, Routes } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { AppComponent } from './app.component';
import { GamePageComponent } from './pages/game-page/game-page.component';
import { LandingPageComponent } from './pages/landing-page/landing-page.component';

const testRoutes: Routes = [
  {
    path: '',
    component: LandingPageComponent
  },
  {
    path: 'jugar',
    component: GamePageComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];

describe('AppComponent routing', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes(testRoutes)],
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
    spyOn(window, 'matchMedia').and.returnValue({
      matches: true
    } as MediaQueryList);

    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);

    router.initialNavigation();
    tick();
    fixture.detectChanges();

    const cta = fixture.nativeElement.querySelector(
      '.landing-button--primary'
    ) as HTMLAnchorElement;

    cta.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0
      })
    );
    tick();
    tick();
    fixture.detectChanges();

    expect(location.path()).toBe('/jugar');
    expect(fixture.nativeElement.textContent).toContain('INICIAR RONDA');
    flush();
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
