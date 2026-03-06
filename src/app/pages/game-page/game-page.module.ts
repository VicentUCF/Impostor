import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { GamePageRoutingModule } from './game-page-routing.module';
import { GamePageComponent } from './game-page.component';

@NgModule({
  declarations: [GamePageComponent],
  imports: [CommonModule, GamePageRoutingModule]
})
export class GamePageModule {}
