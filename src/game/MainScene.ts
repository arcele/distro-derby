// src/game/MainScene.ts
import Phaser from 'phaser';
import { level1, TILE_SIZE, TileType } from './level1';

export class MainScene extends Phaser.Scene {
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private goalZone!: Phaser.GameObjects.Rectangle;

  private spawnPos = { x: 0, y: 0 };
  private goalPos = { x: 0, y: 0 };

  constructor() {
    super('MainScene');
  }

  preload() {
    // Make a simple “car” texture (yellow rectangle) so we don’t need asset files
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffcc00, 1);
    g.fillRect(0, 0, 32, 18);
    g.generateTexture('car', 32, 18);
    g.destroy();
  }

  create() {
    this.walls = this.physics.add.staticGroup();

    this.buildMap();
    this.createPlayer();
    this.createGoalZone();

    this.cursors = this.input.keyboard.createCursorKeys();

    // Optional: turn this on in config.ts for visual debugging:
    // physics.arcade.debug = true
  }

  private buildMap() {
    const rows = level1.length;
    const cols = level1[0].length;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tile = level1[y][x];
        const worldX = x * TILE_SIZE + TILE_SIZE / 2;
        const worldY = y * TILE_SIZE + TILE_SIZE / 2;

        if (tile === TileType.Wall) {
          // Draw wall + give it a static physics body
          const wallRect = this.add
            .rectangle(worldX, worldY, TILE_SIZE, TILE_SIZE, 0x333333)
            .setStrokeStyle(2, 0x777777);

          this.physics.add.existing(wallRect, true); // true = static body
          this.walls.add(wallRect);
        } else {
          // Draw floor / special tiles
          let fill = 0x1e1e1e;

          if (tile === TileType.Spawn) {
            fill = 0x003366;
            this.spawnPos.x = worldX;
            this.spawnPos.y = worldY;
          } else if (tile === TileType.Goal) {
            fill = 0x336600;
            this.goalPos.x = worldX;
            this.goalPos.y = worldY;
          }

          this.add
            .rectangle(worldX, worldY, TILE_SIZE, TILE_SIZE, fill)
            .setStrokeStyle(1, 0x2e2e2e);
        }
      }
    }
  }

  private createPlayer() {
    // Spawn at S
    this.player = this.physics.add.sprite(this.spawnPos.x, this.spawnPos.y, 'car');

    this.player.setCollideWorldBounds(true);
    this.player.setDamping(true);
    this.player.setDrag(400, 400);
    this.player.setMaxVelocity(250, 250);

    // Point the car to the right to start
    this.player.setAngle(0);

    // Collide with walls
    this.physics.add.collider(this.player, this.walls);
  }

  private createGoalZone() {
    // Invisible-ish goal zone, still blocks nothing, just overlap check
    this.goalZone = this.add.rectangle(
      this.goalPos.x,
      this.goalPos.y,
      TILE_SIZE * 0.8,
      TILE_SIZE * 0.8,
      0x00ff00,
      0.25
    );

    this.physics.add.existing(this.goalZone, true);

    this.physics.add.overlap(
      this.player,
      this.goalZone,
      () => {
        // For now, just log + flash tint
        console.log('Reached GOAL!');
        this.player.setTint(0x00ff00);
        this.time.delayedCall(300, () => this.player.clearTint());
      },
      undefined,
      this
    );
  }

  update(time: number, delta: number) {
    if (!this.player || !this.cursors) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;

    // Rotation
    const turnSpeed = 0.003 * delta; // radians per ms
    if (this.cursors.left?.isDown) {
      this.player.rotation -= turnSpeed;
    } else if (this.cursors.right?.isDown) {
      this.player.rotation += turnSpeed;
    }

    // Thrust
    const accel = 0.006 * delta; // pixels/s per ms
    if (this.cursors.up?.isDown) {
      this.physics.velocityFromRotation(
        this.player.rotation,
        accel * 100,
        body.velocity
      );
    } else if (this.cursors.down?.isDown) {
      this.physics.velocityFromRotation(
        this.player.rotation,
        -accel * 60,
        body.velocity
      );
    } else {
      // No input → let drag slow us down naturally
      // (body.drag is already set)
    }
  }
}