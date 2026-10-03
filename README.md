# Impostor

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 15.2.10.

## Modos de juego

- **Palabras:** los informantes comparten una palabra; el impostor recibe las ayudas configuradas.
- **Datos:** cada informante recibe un dato real diferente, sin tema común obligatorio.
  El impostor no recibe un dato ni una mentira preparada: debe improvisar.
  Se mantienen el reparto privado, el jugador inicial, el debate y votación fuera de la app,
  el temporizador y la revelación. El caos automático conserva sus tres variantes.

El selector está en la configuración de la partida y se guarda junto a las preferencias.
Las categorías y pistas de Palabras se conservan al cambiar de modo; no se aplican a Datos.
Las explicaciones y enlaces de los datos aparecen únicamente al terminar la revelación.

### Ampliar el catálogo de datos

`src/db/Datos.json` contiene los 500 datos aportados en `datos_random_500.json`,
repartidos en 10 categorías. Cada entrada tiene `id` estable, `category`, `statement`,
`explanation` y `source: { label, url }`. El catálogo está destinado a afirmaciones
verdaderas; no hay un banco de mentiras.

La importación comprueba el formato, los campos obligatorios y la ausencia de IDs y
textos repetidos. No equivale a una verificación factual de las 500 afirmaciones:
varias fuentes del archivo apuntan a portadas o secciones generales y necesitan una
referencia más específica en una futura revisión editorial.

Añadir entradas al JSON no requiere cambiar el motor. Evitar IDs o afirmaciones duplicadas
y redactar frases breves que se puedan recordar al pasar el móvil. Debe haber al menos
12 datos distintos para admitir el máximo de jugadores incluso en caos sin impostor.
Se priorizan datos no vistos y luego los menos recientes, sin repetir dentro de una ronda.
El historial de datos es independiente del de palabras y admite preferencias antiguas.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
