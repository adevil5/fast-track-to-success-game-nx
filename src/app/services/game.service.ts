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
  });

  readonly score = computed(() => this.gameState().score);
  readonly level = computed(() => this.gameState().level);
  readonly health = computed(() => this.gameState().health);

  updateGameState(newState: Partial<GameState>) {
    this.gameState.update((state) => ({ ...state, ...newState }));
  }
}
