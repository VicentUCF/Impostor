import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GamePageComponent } from './pages/game-page/game-page.component';
import { LandingPageComponent } from './pages/landing-page/landing-page.component';

export const appRoutes: Routes = [
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

@NgModule({
  imports: [
    RouterModule.forRoot(appRoutes, {
      anchorScrolling: 'enabled',
      initialNavigation: 'enabledBlocking',
      scrollPositionRestoration: 'enabled'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
