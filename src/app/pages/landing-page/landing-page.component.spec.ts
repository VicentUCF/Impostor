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

    expect(title.getTitle()).toBe('Juego del impostor para fiestas y grupos | Algo No Cuadra');
    expect(meta.getTag('name="description"')?.content).toContain('Juego del impostor');
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
});
