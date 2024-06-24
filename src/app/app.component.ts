import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameComponent } from './components/game/game.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, GameComponent],
  template: `
    <h1>Fast-Track to Success</h1>
    <app-game></app-game>
  `,
})
export class AppComponent {}
