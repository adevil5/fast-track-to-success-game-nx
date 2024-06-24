import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  inject,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as Phaser from 'phaser';

import { GameService } from '../../services/game.service';
import { MainScene } from './main-scene';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #gameContainer></div>
    <div>
      <p>Score: {{ gameService.score() }}</p>
      <p>Level: {{ gameService.level() }}</p>
      <p>Health: {{ gameService.health() }}</p>
      <p *ngIf="gameService.isGameOver()">Game Over!</p>
    </div>
  `,
})
export class GameComponent implements OnInit, OnDestroy {
  @ViewChild('gameContainer', { static: true })
  private gameContainer!: ElementRef;

  private game!: Phaser.Game;
  protected gameService = inject(GameService);

  ngOnInit() {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 376,
      parent: this.gameContainer.nativeElement,
      scene: {
        init: () => {
          // Pass the GameService to the scene
          (this.game.scene.getScene('MainScene') as MainScene).setGameService(
            this.gameService
          );
        },
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 300 },
          debug: false,
        },
      },
      input: {
        keyboard: true,
      },
    };

    this.game = new Phaser.Game(config);
    this.game.scene.add('MainScene', MainScene, true);
  }

  ngOnDestroy() {
    if (this.game) {
      this.game.destroy(true);
    }
  }
}
