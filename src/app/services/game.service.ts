import { Injectable, signal, computed } from '@angular/core';
import { GameState } from '../models/game-state.model';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private gameState = signal<GameState>({
    score: 0,
    level: 1,
    health: 100,
    isGameOver: false,
  });

  readonly score = computed(() => this.gameState().score);
  readonly level = computed(() => this.gameState().level);
  readonly health = computed(() => this.gameState().health);
  readonly isGameOver = computed(() => this.gameState().isGameOver);

  updateGameState(newState: Partial<GameState>) {
    this.gameState.update((state) => ({ ...state, ...newState }));
  }

  resetGame() {
    this.updateGameState({
      score: 0,
      level: 1,
      health: 100,
      isGameOver: false,
    });
  }
}
