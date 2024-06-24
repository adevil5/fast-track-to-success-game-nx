import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { GameService } from '../../services/game.service';
import { GameState } from 'src/app/models/game-state.model';

export class MainScene extends Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private initialJumpVelocity = -300; // Stronger initial jump
  private jumpHoldForce = -200; // Force applied while holding jump
  private maxJumpDuration = 250;
  private jumpBufferTime = 150;
  private lastJumpButtonTime = 0;
  private coyoteTime = 100;
  private lastGroundedTime = 0;
  private jumpTimer = 0;
  private isJumping = false;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private powerUps!: Phaser.Physics.Arcade.Group;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;
  private pKey!: Phaser.Input.Keyboard.Key;
  private jumpSound!: Phaser.Sound.BaseSound;
  private sceneGameState!: GameState;
  private healthText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private gameService!: GameService;
  private background!: Phaser.GameObjects.TileSprite;
  private sky!: Phaser.GameObjects.Graphics;
  private isPaused = false;
  private pauseButton!: Phaser.GameObjects.Image;
  private pauseMenu!: Phaser.GameObjects.Container;
  private overlay!: Phaser.GameObjects.Rectangle;
  private gameSpeed = 2;

  constructor() {
    super({ key: 'MainScene' });
  }

  setGameService(gameService: GameService) {
    this.gameService = gameService;
    this.sceneGameState = {
      score: this.gameService.score(),
      level: this.gameService.level(),
      health: this.gameService.health(),
      isGameOver: this.gameService.isGameOver(),
    };
  }

  preload() {
    // Set base path for assets
    this.load.setBaseURL('assets/');

    // Character
    this.load.image('character', 'images/character.png');

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
    this.load.image('ground', 'images/platform.png');

    // Audio
    this.load.audio('background-music', 'audio/background-music.mp3');
    this.load.audio('collect-power-up', 'audio/collect-power-up.mp3');
    this.load.audio('hit-obstacle', 'audio/hit-obstacle.mp3');
    this.load.audio('level-complete', 'audio/level-complete.mp3');
    this.load.audio('game-over', 'audio/game-over.mp3');
    this.load.audio('jump', 'audio/jump.mp3');

    // UI Elements
    this.load.image('pause-button', 'images/ui/pause-button.png');
  }

  create() {
    // Create gradient sky
    this.createGradientSky();

    // Add scrolling background
    this.background = this.add.tileSprite(
      0,
      0,
      this.cameras.main.width,
      this.cameras.main.height,
      'cityscape'
    );
    this.background.setOrigin(0, 0);

    // Create platforms
    this.platforms = this.physics.add.staticGroup();
    this.createPlatforms();

    // Create player
    this.player = this.physics.add.sprite(
      100,
      this.cameras.main.height - 100,
      'character'
    );
    this.player.setScale(0.1);
    this.player.setBounce(0);
    this.player.setCollideWorldBounds(true);
    this.player.setGravityY(2000);

    // Collider for player and platforms
    this.physics.add.collider(this.player, this.platforms);

    // Input Events
    if (this.input && this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.spaceKey = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.SPACE
      );
      this.escKey = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.ESC
      );
      this.pKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    } else {
      console.error('Keyboard input is not available');
    }

    // Load jump sound
    this.jumpSound = this.sound.add('jump');

    // Create obstacles and power-ups
    this.obstacles = this.physics.add.group();
    this.powerUps = this.physics.add.group();

    // Collisions
    this.physics.add.collider(this.obstacles, this.platforms);
    this.physics.add.collider(this.powerUps, this.platforms);
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

    this.pauseButton = this.add
      .image(this.cameras.main.width - 40, 50, 'pause-button')
      .setInteractive()
      .setScale(0.25)
      .on('pointerup', () => this.togglePause());

    this.createPauseMenu();

    // UI
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
      { fontSize: '32px', color: '#fff' }
    );

    // Start spawning
    this.spawnObstacles();
    this.spawnPowerUps();
  }

  override update(time: number, delta: number) {
    if (this.sceneGameState.isGameOver) return;
    if (
      Phaser.Input.Keyboard.JustDown(this.escKey) ||
      Phaser.Input.Keyboard.JustDown(this.pKey)
    ) {
      this.togglePause();
    }
    if (this.isPaused) return;

    // Scroll the background
    this.background.tilePositionX += this.gameSpeed;

    this.obstacles.children.entries.forEach(
      (obstacle: Phaser.GameObjects.GameObject) => {
        const o = obstacle as Phaser.Physics.Arcade.Sprite;
        o.x -= this.gameSpeed;
        if (o.x < -o.width) {
          o.destroy();
        }
      }
    );

    this.powerUps.children.entries.forEach(
      (powerUp: Phaser.GameObjects.GameObject) => {
        const p = powerUp as Phaser.Physics.Arcade.Sprite;
        p.x -= this.gameSpeed;
        if (p.x < -p.width) {
          p.destroy();
        }
      }
    );

    // Player movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-200);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(200);
    } else {
      this.player.setVelocityX(0);
    }

    // Update last grounded time
    if (this.player.body?.touching.down) {
      this.lastGroundedTime = time;
    }

    // Check for jump input
    if (
      this.cursors.up.isDown ||
      this.input.keyboard?.checkDown(this.spaceKey)
    ) {
      this.lastJumpButtonTime = time;
    }

    // Handle jump with both Coyote Time and Jump Buffer
    if (time - this.lastJumpButtonTime < this.jumpBufferTime) {
      if (time - this.lastGroundedTime < this.coyoteTime) {
        this.handleJump(time, delta);
      }
    } else {
      this.isJumping = false;
      this.jumpTimer = 0;
    }

    if (this.player.body?.velocity.y && this.player.body.velocity.y > 0) {
      this.player.setGravityY(2000); // Even higher gravity when falling
    } else {
      this.player.setGravityY(1500); // Reset to normal gravity when rising or on ground
    }

    // Update UI
    this.healthText.setText(`Health: ${this.sceneGameState.health}`);
    this.scoreText.setText(`Score: ${this.sceneGameState.score}`);
  }

  private handleJump(time: number, delta: number) {
    const jumpKeyPressed = this.cursors.up.isDown || this.spaceKey.isDown;
    const jumpKeyJustPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.spaceKey);

    if (!this.player.body) return;

    if (jumpKeyJustPressed && this.canJump(time)) {
      // Start of jump
      this.isJumping = true;
      this.jumpTimer = 0;
      this.player.setVelocityY(this.initialJumpVelocity);
      this.jumpSound.play();
      this.lastGroundedTime = 0; // Reset coyote time
      this.lastJumpButtonTime = 0; // Reset jump buffer
    } else if (jumpKeyPressed && this.isJumping) {
      // Continue jump if button is held
      this.jumpTimer += delta;
      if (this.jumpTimer <= this.maxJumpDuration) {
        // Apply additional upward force while holding
        const jumpForce =
          this.jumpHoldForce * (1 - this.jumpTimer / this.maxJumpDuration);
        this.player.setVelocityY(
          Math.max(this.player.body.velocity.y + jumpForce, -800)
        );
      } else {
        this.isJumping = false; // End jump if max duration is reached
      }
    } else if (this.isJumping && !jumpKeyPressed) {
      // Button released, end jump boost
      this.isJumping = false;
    }

    // Reset jump state when landing
    if (this.player.body.touching.down && this.player.body.velocity.y === 0) {
      this.isJumping = false;
      this.jumpTimer = 0;
    }

    // Update last jump button press time
    if (jumpKeyJustPressed) {
      this.lastJumpButtonTime = time;
    }

    // Update last grounded time
    if (this.player.body.touching.down) {
      this.lastGroundedTime = time;
    }
  }

  private canJump(time: number): boolean {
    return time - this.lastGroundedTime < this.coyoteTime;
  }

  private createPauseMenu() {
    // Create a tinted overlay
    this.overlay = this.add
      .rectangle(
        0,
        0,
        this.cameras.main.width,
        this.cameras.main.height,
        0x000000,
        0.7
      )
      .setOrigin(0)
      .setDepth(100);

    // Create pause menu container
    this.pauseMenu = this.add
      .container(this.cameras.main.width / 2, this.cameras.main.height / 2)
      .setDepth(101);

    // Add pause text
    const pauseText = this.add
      .text(0, -50, 'PAUSED', { fontSize: '32px', color: '#ffffff' })
      .setOrigin(0.5);

    const pauseInstructions = this.add
      .text(0, 100, 'Press ESC or P to pause/unpause', {
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Add resume button
    const resumeButton = this.add
      .text(0, 50, 'Resume', { fontSize: '24px', color: '#ffffff' })
      .setInteractive()
      .setOrigin(0.5)
      .on('pointerup', () => this.togglePause());

    // Add elements to pause menu container
    this.pauseMenu.add([pauseText, pauseInstructions, resumeButton]);

    // Initially hide the pause menu
    this.overlay.setVisible(false);
    this.pauseMenu.setVisible(false);
  }

  private togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.pauseGame();
    } else {
      this.resumeGame();
    }
  }

  private pauseGame() {
    this.physics.pause();
    this.tweens.pauseAll();
    this.overlay.setVisible(true);
    this.pauseMenu.setVisible(true);
    this.pauseButton.setVisible(false);
  }

  private resumeGame() {
    this.physics.resume();
    this.tweens.resumeAll();
    this.overlay.setVisible(false);
    this.pauseMenu.setVisible(false);
    this.pauseButton.setVisible(true);
  }

  private createPlatforms() {
    // Create main ground
    this.createPlatform(
      this.cameras.main.width / 2,
      this.cameras.main.height - 20,
      this.cameras.main.width,
      40,
      0x009900
    );

    // Create some floating platforms
    this.createPlatform(600, 400, 200, 20, 0x00ff00);
    this.createPlatform(50, 250, 150, 20, 0x00ff00);
    this.createPlatform(750, 220, 180, 20, 0x00ff00);
  }

  private createPlatform(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number
  ) {
    const platform = this.add.rectangle(x, y, width, height, color);
    this.physics.add.existing(platform, true);
    this.platforms.add(platform);
  }

  private spawnObstacles() {
    if (this.sceneGameState.isGameOver) return;

    const obstacleTypes = ['debt-sign', 'burnout-icon', 'missed-opportunity'];
    const obstacleType = Phaser.Utils.Array.GetRandom(obstacleTypes);

    const x = this.cameras.main.width;
    const y = Phaser.Math.Between(100, this.cameras.main.height - 100);

    const obstacle = this.obstacles.create(x, y, obstacleType);
    obstacle.setScale(0.25);

    obstacle.body.setAllowGravity(false);
    this.adjustHitBox(obstacle);
    this.addHoverEffect(obstacle);

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
    const x = this.cameras.main.width;
    const y = Phaser.Math.Between(100, this.cameras.main.height - 100);

    const powerUpType = Phaser.Utils.Array.GetRandom(powerUpTypes);

    const powerUp = this.powerUps.create(x, y, powerUpType);
    powerUp.setScale(0.25);

    powerUp.body.setAllowGravity(false);

    this.addHoverEffect(powerUp);

    this.time.delayedCall(10000, () => {
      powerUp.destroy();
    });

    this.time.addEvent({
      delay: Phaser.Math.Between(5000, 10000),
      callback: this.spawnPowerUps,
      callbackScope: this,
    });
  }

  private adjustHitBox(sprite: Phaser.Physics.Arcade.Sprite) {
    if (sprite.body == null) {
      return;
    }

    // Get the current width and height of the sprite
    const width = sprite.width;
    const height = sprite.height;

    const newWidth = width * 0.25;
    const newHeight = height * 0.25;

    // Set the new body size
    sprite.body.setSize(newWidth, newHeight);

    // Center the body on the sprite
    sprite.body.setOffset((width - newWidth) / 2, (height - newHeight) / 2);
  }

  private addHoverEffect(gameObject: Phaser.Physics.Arcade.Sprite) {
    this.tweens.add({
      targets: gameObject,
      y: gameObject.y - 10,
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
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

  private createGradientSky() {
    this.sky = this.add.graphics();
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Define gradient colors for mid-morning sky
    const topColor = Phaser.Display.Color.ValueToColor('#87CEEB'); // Sky blue
    const bottomColor = Phaser.Display.Color.ValueToColor('#E6E6FA'); // Light lavender

    const rectHeight = 1;
    const totalSteps = Math.floor(height / rectHeight);

    for (let i = 0; i < totalSteps; i++) {
      const fraction = i / totalSteps;
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        topColor,
        bottomColor,
        totalSteps,
        i
      );

      this.sky.fillStyle(
        Phaser.Display.Color.GetColor(color.r, color.g, color.b)
      );
      this.sky.fillRect(0, i * rectHeight, width, rectHeight);
    }

    // Ensure the sky is at the back
    this.sky.setDepth(-1);
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
        this.restartGame();
        this.gameService.updateGameState({
          level: this.sceneGameState.level + 1,
        });
      });
  }

  private gameOver() {
    this.sceneGameState.isGameOver = true;
    this.gameService.updateGameState({ isGameOver: true, health: 0 });

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
        this.restartGame();
      });

    this.gameService.updateGameState({
      health: 0,
    });
  }

  private restartGame() {
    this.gameService.resetGame();
    this.scene.restart();
  }
}
