import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { GameService } from '../../services/game.service';
import { GameState } from 'src/app/models/game-state.model';

export class MainScene extends Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private powerUps!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private sceneGameState: GameState;
  private healthText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;

  constructor(private gameService: GameService) {
    super({ key: 'MainScene' });
    this.gameService = gameService;
    this.sceneGameState = { score: 0, level: 1, health: 100 };
  }

  preload() {
    // Character
    this.load.image('character', 'assets/images/character.webp');

    // Obstacles
    this.load.image('debt-sign', 'assets/images/obstacles/debt-sign.webp');
    this.load.image(
      'burnout-icon',
      'assets/images/obstacles/burnout-icon.webp'
    );
    this.load.image(
      'missed-opportunity',
      'assets/images/obstacles/missed-opportunity.webp'
    );

    // Power-ups
    this.load.image(
      'tuition-assistance',
      'assets/images/power-ups/tuition-assistance.webp'
    );
    this.load.image(
      'career-advice',
      'assets/images/power-ups/career-advice.webp'
    );
    this.load.image(
      'certification',
      'assets/images/power-ups/certification.webp'
    );
    this.load.image('networking', 'assets/images/power-ups/networking.webp');
    this.load.image(
      'advanced-degree',
      'assets/images/power-ups/advanced-degree.webp'
    );
    this.load.image('mentorship', 'assets/images/power-ups/mentorship.webp');

    // Backgrounds
    this.load.image('cityscape', 'assets/images/backgrounds/cityscape.webp');
    this.load.image('office', 'assets/images/backgrounds/office.webp');

    // Audio
    this.load.audio('background-music', 'assets/audio/background-music.mp3');
    this.load.audio('collect-power-up', 'assets/audio/collect-power-up.mp3');
    this.load.audio('hit-obstacle', 'assets/audio/hit-obstacle.mp3');
    this.load.audio('level-complete', 'assets/audio/level-complete.mp3');
    this.load.audio('game-over', 'assets/audio/game-over.mp3');

    // UI Elements
    this.load.image('pause-button', 'assets/images/ui/pause-button.webp');
  }

  create() {
    this.player = this.physics.add.sprite(400, 300, 'character');
    this.player.setCollideWorldBounds(true);

    this.obstacles = this.physics.add.group();
    this.powerUps = this.physics.add.group();

    if (this.input && this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    } else {
      console.error('Keyboard input is not available');
    }

    this.physics.add.collider(
      this.player,
      this.obstacles,
      this.hitObstacle,
      undefined,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.powerUps,
      this.collectPowerUp,
      undefined,
      this
    );

    this.spawnObstacles();
    this.spawnPowerUps();

    this.healthText = this.add.text(
      16,
      16,
      `Health: ${this.sceneGameState.health}`,
      { fontSize: '32px', color: '#fff' }
    );
    this.scoreText = this.add.text(
      16,
      50,
      `Score: ${this.sceneGameState.score}`,
      {
        fontSize: '32px',
        color: '#fff',
      }
    );
  }

  override update() {
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-160);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(160);
    } else {
      this.player.setVelocityX(0);
    }

    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-160);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(160);
    } else {
      this.player.setVelocityY(0);
    }

    this.healthText.setText(`Health: ${this.sceneGameState.health}`);
    this.scoreText.setText(`Score: ${this.sceneGameState.score}`);
  }

  private spawnObstacles() {
    const obstacleTypes = ['debt-sign', 'burnout-icon', 'missed-opportunity'];
    const x = Phaser.Math.Between(0, this.game.config.width as number);
    const y = Phaser.Math.Between(0, this.game.config.height as number);
    const obstacleType = Phaser.Utils.Array.GetRandom(obstacleTypes);

    const obstacle = this.obstacles.create(x, y, obstacleType);
    obstacle.setCollideWorldBounds(true);
    obstacle.setBounce(1);
    obstacle.setVelocity(
      Phaser.Math.Between(-100, 100),
      Phaser.Math.Between(-100, 100)
    );

    this.time.addEvent({
      delay: Phaser.Math.Between(2000, 5000),
      callback: this.spawnObstacles,
      callbackScope: this,
    });
  }

  private spawnPowerUps() {
    const powerUpTypes = [
      'tuition-assistance',
      'career-advice',
      'certification',
      'networking',
      'advanced-degree',
      'mentorship',
    ];
    const x = Phaser.Math.Between(0, this.game.config.width as number);
    const y = Phaser.Math.Between(0, this.game.config.height as number);
    const powerUpType = Phaser.Utils.Array.GetRandom(powerUpTypes);

    const powerUp = this.powerUps.create(x, y, powerUpType);
    powerUp.setCollideWorldBounds(true);

    this.time.delayedCall(10000, () => {
      powerUp.destroy();
    });

    this.time.addEvent({
      delay: Phaser.Math.Between(5000, 10000),
      callback: this.spawnPowerUps,
      callbackScope: this,
    });
  }

  private hitObstacle(
    player:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Tilemaps.Tile,
    obstacle:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Tilemaps.Tile
  ) {
    const playerSprite = player as Phaser.Physics.Arcade.Sprite;
    const obstacleSprite = obstacle as Phaser.Physics.Arcade.Sprite;

    this.sound.play('hit-obstacle');
    this.cameras.main.shake(250, 0.01);

    this.sceneGameState.health -= 20;

    this.gameService.updateGameState({
      health: this.sceneGameState.health,
      score: this.sceneGameState.score,
    });

    playerSprite.setTint(0xff0000);
    this.time.delayedCall(250, () => {
      playerSprite.clearTint();
    });

    obstacleSprite.destroy();

    if (this.sceneGameState.health <= 0) {
      this.gameOver();
    }
  }

  private collectPowerUp(
    player:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Tilemaps.Tile,
    powerUp:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Tilemaps.Tile
  ) {
    const playerSprite = player as Phaser.Physics.Arcade.Sprite;
    const powerUpSprite = powerUp as Phaser.Physics.Arcade.Sprite;

    const powerUpType = powerUpSprite.texture.key;

    this.sound.play('collect-power-up');
    this.cameras.main.flash(250, 255, 255, 255);

    switch (powerUpType) {
      case 'tuition-assistance':
        this.sceneGameState.score += 100;
        break;
      case 'career-advice':
        this.sceneGameState.score += 50;
        this.sceneGameState.health = Math.min(
          this.sceneGameState.health + 10,
          100
        );
        break;
      case 'certification':
        this.sceneGameState.score += 150;
        break;
      case 'networking':
        this.sceneGameState.score += 75;
        this.time.delayedCall(5000, () => {
          if (playerSprite.body) {
            playerSprite.setVelocity(
              playerSprite.body.velocity.x * 1.5,
              playerSprite.body.velocity.y * 1.5
            );
          }
        });
        break;
      case 'advanced-degree':
        this.sceneGameState.score += 200;
        break;
      case 'mentorship':
        this.sceneGameState.score += 100;
        this.sceneGameState.health = Math.min(
          this.sceneGameState.health + 20,
          100
        );
        break;
    }

    this.gameService.updateGameState({
      health: this.sceneGameState.health,
      score: this.sceneGameState.score,
    });

    playerSprite.setTint(0x00ff00);
    this.time.delayedCall(250, () => {
      playerSprite.clearTint();
    });

    powerUpSprite.destroy();

    this.createFloatingText(
      powerUpSprite.x,
      powerUpSprite.y,
      `+${this.sceneGameState.score}`
    );

    this.checkLevelCompletion();
  }

  private createFloatingText(x: number, y: number, message: string) {
    const floatingText = this.add.text(x, y, message, {
      fontSize: '24px',
      color: '#ffffff',
    });
    this.tweens.add({
      targets: floatingText,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        floatingText.destroy();
      },
    });
  }

  private checkLevelCompletion() {
    if (this.sceneGameState.score >= 1000) {
      this.levelComplete();
    }
  }

  private levelComplete() {
    this.physics.pause();
    this.sound.play('level-complete');

    const levelCompleteText = this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        'Level Complete!',
        { fontSize: '64px', color: '#00ff00' }
      )
      .setOrigin(0.5);

    const nextLevelButton = this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY + 100,
        'Next Level',
        {
          fontSize: '32px',
          color: '#ffffff',
          backgroundColor: '#000000',
          padding: { x: 10, y: 5 },
        }
      )
      .setOrigin(0.5)
      .setInteractive()
      .on('pointerdown', () => {
        this.scene.restart();
        this.gameService.updateGameState({
          level: this.sceneGameState.level + 1,
        });
      });
  }

  private gameOver() {
    this.physics.pause();
    this.sound.play('game-over');

    const gameOverText = this.add
      .text(this.cameras.main.centerX, this.cameras.main.centerY, 'Game Over', {
        fontSize: '64px',
        color: '#ff0000',
      })
      .setOrigin(0.5);

    const retryButton = this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY + 100,
        'Retry',
        {
          fontSize: '32px',
          color: '#ffffff',
          backgroundColor: '#000000',
          padding: { x: 10, y: 5 },
        }
      )
      .setOrigin(0.5)
      .setInteractive()
      .on('pointerdown', () => {
        this.scene.restart();
      });

    this.gameService.updateGameState({
      health: 0,
    });
  }
}
