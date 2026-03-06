import { Component, OnInit } from '@angular/core';
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
export class LandingPageComponent implements OnInit {
  readonly steps: LandingStep[] = [
    {
      index: '01',
      title: 'Configura la ronda',
      body:
        'Elige de 3 a 12 jugadores, ajusta cuantos impostores quieres y activa las categorias que mejor encajan con tu grupo.'
    },
    {
      index: '02',
      title: 'Reparte el movil',
      body:
        'Cada persona mira su rol en secreto. La mayoria ve la palabra; el impostor solo recibe categoria y pista si tu quieres.'
    },
    {
      index: '03',
      title: 'Hablad y descubrid',
      body:
        'Empiezan las sospechas, las preguntas cruzadas y el farol. Cuando el grupo lo tenga claro, revela quien mentia.'
    }
  ];

  readonly chaosFeatures: ChaosFeature[] = [
    {
      title: 'Rondas que rompen la mesa',
      body:
        'El Modo Caos no avisa. Puede no haber impostor, puede haber dos o puede girar las expectativas cuando todos creen controlar la partida.'
    },
    {
      title: 'Mentira, paranoia y giros',
      body:
        'Las variantes reales del juego fuerzan lecturas nuevas, provocan errores de confianza y convierten una ronda normal en una escena memorable.'
    },
    {
      title: 'Ideal para repetir',
      body:
        'Cuantas mas partidas jugais, mas posibilidades hay de que aparezca una ronda extraña. El juego aprende el ritmo del grupo y devuelve tension.'
    }
  ];

  readonly faqs: LandingFaq[] = [
    {
      question: '¿Como se juega a Algo No Cuadra con un solo movil?',
      answer:
        'Una persona configura la ronda, el movil se pasa por turnos y cada jugador ve solo su informacion. No hace falta imprimir cartas ni preparar nada mas.'
    },
    {
      question: '¿Cuantos jugadores admite la partida?',
      answer:
        'El juego esta pensado para grupos de 3 a 12 personas. Funciona bien tanto en cenas pequenas como en fiestas con mucha gente.'
    },
    {
      question: '¿Que ve el impostor?',
      answer:
        'Por defecto ve la categoria y puede recibir una pista con dificultad ajustable. Eso te permite hacer la partida mas accesible o mas salvaje.'
    },
    {
      question: '¿Que es el Modo Caos?',
      answer:
        'Es una capa de variaciones que altera el formato esperado de la ronda: dobles impostores, mesas sin impostor o giros que cambian la lectura social.'
    }
  ];

  constructor(private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setPage({
      title: 'Juego del impostor para fiestas y grupos',
      description:
        'Juego del impostor para 3 a 12 jugadores, en un solo movil. Explica reglas, activa el Modo Caos y juega una partida al instante.',
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
              'Juego del impostor para jugar en grupo desde un solo movil, con categorias, pistas y un Modo Caos pensado para fiestas.',
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
}
