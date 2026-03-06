import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  QueryList,
  ViewChildren
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SeoService } from '../../services/seo.service';

interface LandingStep {
  index: string;
  title: string;
  body: string;
}

interface LandingFaq {
  question: string;
  answer: string;
}

interface ChaosFeature {
  title: string;
  body: string;
}

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss']
})
export class LandingPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('revealItem')
  private readonly revealItems?: QueryList<ElementRef<HTMLElement>>;

  readonly steps: LandingStep[] = [
    {
      index: '01',
      title: 'Configura la ronda',
      body:
        'Elige de 3 a 12 jugadores, ajusta cuántos impostores quieres y activa las categorías que mejor encajan con tu grupo.'
    },
    {
      index: '02',
      title: 'Reparte el móvil',
      body:
        'Cada persona mira su rol en secreto. La mayoría ve la palabra; el impostor solo recibe categoría y pista si tú quieres.'
    },
    {
      index: '03',
      title: 'Hablad y descubrid',
      body:
        'Empiezan las sospechas, las preguntas cruzadas y el farol. Cuando el grupo lo tenga claro, revela quién mentía.'
    }
  ];

  readonly chaosFeatures: ChaosFeature[] = [
    {
      title: 'Rondas que rompen la mesa',
      body:
        'El modo caos no avisa. Puede no haber impostor, puede haber dos o puede girar las expectativas cuando todos creen controlar la partida.'
    },
    {
      title: 'Mentira, paranoia y giros',
      body:
        'Las variantes reales del juego fuerzan lecturas nuevas, provocan errores de confianza y convierten una ronda normal en una escena memorable.'
    },
    {
      title: 'Ideal para repetir',
      body:
        'Cuantas más partidas jugáis, más posibilidades hay de que aparezca una ronda extraña. El juego acompaña el ritmo del grupo y devuelve tensión.'
    }
  ];

  readonly faqs: LandingFaq[] = [
    {
      question: '¿Cómo se juega a Algo No Cuadra con un solo móvil?',
      answer:
        'Una persona configura la ronda, el móvil se pasa por turnos y cada jugador ve solo su información. No hace falta imprimir cartas ni preparar nada más.'
    },
    {
      question: '¿Cuántos jugadores admite la partida?',
      answer:
        'El juego está pensado para grupos de 3 a 12 personas. Funciona bien tanto en cenas pequeñas como en fiestas con mucha gente.'
    },
    {
      question: '¿Qué ve el impostor?',
      answer:
        'Por defecto ve la categoría y puede recibir una pista con dificultad ajustable. Eso te permite hacer la partida más accesible o más salvaje.'
    },
    {
      question: '¿Qué es el modo caos?',
      answer:
        'Es una capa de variaciones que altera el formato esperado de la ronda: dobles impostores, mesas sin impostor o giros que cambian la lectura social.'
    }
  ];

  private revealObserver?: IntersectionObserver;

  constructor(
    private readonly seoService: SeoService,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  ngOnInit(): void {
    this.seoService.setPage({
      title: 'Juego del impostor para grupos y fiestas en un solo móvil',
      description:
        'Juego del impostor para 3 a 12 jugadores en un solo móvil. Explica reglas, activa el modo caos y lanza una partida para grupos en segundos.',
      path: '/',
      imagePath: '/assets/og-cover.png',
      type: 'website',
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': 'https://www.algonocuadra.app/#website',
            name: 'Algo No Cuadra',
            url: 'https://www.algonocuadra.app/',
            inLanguage: 'es'
          },
          {
            '@type': 'SoftwareApplication',
            '@id': 'https://www.algonocuadra.app/#software',
            name: 'Algo No Cuadra',
            applicationCategory: 'GameApplication',
            operatingSystem: 'Web',
            inLanguage: 'es',
            description:
              'Juego del impostor para jugar en grupo desde un solo móvil, con categorías, pistas y un modo caos pensado para fiestas.',
            url: 'https://www.algonocuadra.app/',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'EUR'
            }
          },
          {
            '@type': 'FAQPage',
            '@id': 'https://www.algonocuadra.app/#faq',
            mainEntity: this.faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer
              }
            }))
          }
        ]
      }
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const revealElements =
      this.revealItems?.toArray().map((item) => item.nativeElement) ?? [];

    if (!revealElements.length) {
      return;
    }

    const reduceMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealElements.forEach((element) =>
        element.setAttribute('data-reveal-state', 'visible')
      );
      return;
    }

    const foldThreshold = window.innerHeight * 0.88;
    revealElements.forEach((element) => {
      const top = element.getBoundingClientRect().top;
      element.setAttribute(
        'data-reveal-state',
        top > foldThreshold ? 'hidden' : 'visible'
      );
    });

    this.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-reveal-state', 'visible');
            this.revealObserver?.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.18
      }
    );

    revealElements
      .filter((element) => element.getAttribute('data-reveal-state') === 'hidden')
      .forEach((element) => this.revealObserver?.observe(element));
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
  }
}
