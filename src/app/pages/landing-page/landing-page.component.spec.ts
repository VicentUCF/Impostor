import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';

import { LandingPageComponent } from './landing-page.component';

describe('LandingPageComponent SEO', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [LandingPageComponent]
    }).compileComponents();
  });

  it('should publish title, meta tags, canonical and structured data', () => {
    const fixture = TestBed.createComponent(LandingPageComponent);
    const meta = TestBed.inject(Meta);
    const title = TestBed.inject(Title);
    const document = TestBed.inject(DOCUMENT);

    fixture.detectChanges();

    expect(title.getTitle()).toBe(
      'Juego del impostor para grupos y fiestas en un solo móvil | Algo No Cuadra'
    );
    expect(meta.getTag('name="description"')?.content).toContain('un solo móvil');
    expect(meta.getTag('property="og:image"')?.content).toBe(
      'https://www.algonocuadra.app/assets/og-cover.png'
    );
    expect(meta.getTag('name="twitter:card"')?.content).toBe('summary_large_image');

    const canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    expect(canonical?.href).toBe('https://www.algonocuadra.app/');

    const structuredData = document.getElementById('app-seo-structured-data');
    expect(structuredData).toBeTruthy();
    expect(structuredData?.textContent).toContain('"@type":"FAQPage"');
  });

  it('should render a single h1 and semantic navigation landmarks', () => {
    const fixture = TestBed.createComponent(LandingPageComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('h1').length).toBe(1);
    expect(element.querySelector('main')).toBeTruthy();
    expect(element.querySelector('header')).toBeTruthy();
    expect(element.querySelector('nav[aria-label="Principal"]')).toBeTruthy();
    expect(element.querySelector('#faq')).toBeTruthy();
  });

  it('should render the hero highlights and chaos variants', () => {
    const fixture = TestBed.createComponent(LandingPageComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const highlights = Array.from(
      element.querySelectorAll('.landing-highlights .landing-highlight strong')
    ).map((item) => item.textContent?.trim());
    const chaosVariants = Array.from(
      element.querySelectorAll('.landing-chaos__variants .landing-pill')
    ).map((item) => item.textContent?.trim());

    expect(highlights).toEqual([
      '3 a 12',
      'Un solo móvil',
      'Montaje rápido',
      'Modo caos'
    ]);
    expect(chaosVariants).toEqual([
      'Sin impostor',
      'Doble impostor',
      'Giro oculto'
    ]);
  });
});
