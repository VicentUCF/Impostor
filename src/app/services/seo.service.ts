import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

interface SeoPageConfig {
  title: string;
  description: string;
  path: string;
  imagePath: string;
  type: 'website' | 'article';
  structuredData?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly siteUrl = 'https://www.algonocuadra.app';
  private readonly siteName = 'Algo No Cuadra';
  private readonly structuredDataId = 'app-seo-structured-data';

  constructor(
    private readonly title: Title,
    private readonly meta: Meta,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  setPage(config: SeoPageConfig): void {
    const pageTitle = config.title.includes(this.siteName)
      ? config.title
      : `${config.title} | ${this.siteName}`;
    const canonicalUrl = this.toAbsoluteUrl(config.path);
    const imageUrl = this.toAbsoluteUrl(config.imagePath);

    this.document.documentElement.lang = 'es';
    this.title.setTitle(pageTitle);
    this.updateCanonical(canonicalUrl);

    this.meta.updateTag({ name: 'description', content: config.description });
    this.meta.updateTag({
      name: 'robots',
      content: 'index, follow, max-image-preview:large'
    });
    this.meta.updateTag({ property: 'og:type', content: config.type });
    this.meta.updateTag({ property: 'og:site_name', content: this.siteName });
    this.meta.updateTag({ property: 'og:locale', content: 'es_ES' });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ property: 'og:image', content: imageUrl });
    this.meta.updateTag({
      property: 'og:image:alt',
      content: 'Portada de Algo No Cuadra'
    });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: config.description });
    this.meta.updateTag({ name: 'twitter:image', content: imageUrl });

    if (config.structuredData) {
      this.updateStructuredData(config.structuredData);
    }
  }

  private toAbsoluteUrl(path: string): string {
    return new URL(path, `${this.siteUrl}/`).toString();
  }

  private updateCanonical(url: string): void {
    let canonical = this.document.head.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;

    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      this.document.head.appendChild(canonical);
    }

    canonical.setAttribute('href', url);
  }

  private updateStructuredData(data: Record<string, unknown>): void {
    const existing = this.document.getElementById(this.structuredDataId);
    if (existing) {
      existing.remove();
    }

    const script = this.document.createElement('script');
    script.id = this.structuredDataId;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    this.document.head.appendChild(script);
  }
}
