import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { GameService } from '../../services/game.service';
import { GameState } from 'src/app/models/game-state.model';

export class MainScene extends Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private powerUps!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private sceneGameState!: GameState;
  private healthText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private gameService!: GameService;

  constructor() {
    super({ key: 'MainScene' });
  }

  setGameService(gameService: GameService) {
    this.gameService = gameService;
    this.sceneGameState = {
      score: this.gameService.score(),
      level: this.gameService.level(),
      health: this.gameService.health(),
    };
  }

  preload() {
    // Set base path for assets
    this.load.setBaseURL('assets/');

    // Character
    this.load.spritesheet('character', 'images/robot-sprite.png', {
      frameWidth: 64,
      frameHeight: 64,
    });

    // Obstacles
    this.load.image('debt-sign', 'images/obstacles/debt-sign.png');
    this.load.image('burnout-icon', 'images/obstacles/burnout-icon.png');
    this.load.image(
      'missed-opportunity',
      'images/obstacles/missed-opportunity.png'
    );

    // Power-ups
    this.load.image(
      'tuition-assistance',
      'images/power-ups/tuition-assistance.png'
    );
    this.load.image('career-advice', 'images/power-ups/career-advice.png');
    this.load.image('certification', 'images/power-ups/certification.png');
    this.load.image('networking', 'images/power-ups/networking.png');
    this.load.image('advanced-degree', 'images/power-ups/advanced-degree.png');
    this.load.image('mentorship', 'images/power-ups/mentorship.png');

    // Backgrounds
    this.load.image('cityscape', 'images/backgrounds/cityscape.png');
    this.load.image('office', 'images/backgrounds/office.png');

    // Audio
    this.load.audio('background-music', 'audio/background-music.mp3');
    this.load.audio('collect-power-up', 'audio/collect-power-up.mp3');
    this.load.audio('hit-obstacle', 'audio/hit-obstacle.mp3');
    this.load.audio('level-complete', 'audio/level-complete.mp3');
    this.load.audio('game-over', 'audio/game-over.mp3');

    // UI Elements
    this.load.image('pause-button', 'images/ui/pause-button.png');
  }

  create() {
    // Create animations from the sprite sheet
    this.anims.create({
      key: 'walk-down',
      frames: this.anims.generateFrameNumbers('character', {
        start: 0,
        end: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'walk-left',
      frames: this.anims.generateFrameNumbers('character', {
        start: 4,
        end: 7,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'walk-right',
      frames: this.anims.generateFrameNumbers('character', {
        start: 8,
        end: 11,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'walk-up',
      frames: this.anims.generateFrameNumbers('character', {
        start: 12,
        end: 15,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.player = this.physics.add.sprite(400, 300, 'character');
    this.player.setScale(0.5);
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
    // Handle player movement and animation
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-160);
      this.player.anims.play('walk-left', true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(160);
      this.player.anims.play('walk-right', true);
    } else if (this.cursors.up.isDown) {
      this.player.setVelocityY(-160);
      this.player.anims.play('walk-up', true);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(160);
      this.player.anims.play('walk-down', true);
    } else {
      this.player.setVelocity(0);
      this.player.anims.stop();
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
    obstacle.setScale(0.25);
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
    powerUp.setScale(0.25);
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
