// src/game/MainScene.ts
import Phaser from 'phaser';
import { level1, TILE_SIZE, TileType, npcWaypoints } from './level1';

interface NPCCar {
  sprite: Phaser.Physics.Arcade.Sprite;
  waypointIndex: number;
}

export class MainScene extends Phaser.Scene {
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private goalZone!: Phaser.GameObjects.Rectangle;
  private health = 100;
  private healthText!: Phaser.GameObjects.Text;
  
  private elapsedTime = 0;              // ms
  private timerRunning = false;
  private timerText!: Phaser.GameObjects.Text;
  private hasMoved = false;
  
  private bestTime: number | null = null;
  private bestTimeText!: Phaser.GameObjects.Text;
  
  private restartKey!: Phaser.Input.Keyboard.Key;
  private npcCars: NPCCar[] = []; 


  private elapsedTime = 0;              // ms
  private timerRunning = false;
  private timerText!: Phaser.GameObjects.Text;
  private hasMoved = false;             // has the car started a run yet?



  private spawnPos = { x: 0, y: 0 };
  private goalPos = { x: 0, y: 0 };

  constructor() {
    super('MainScene');
  }

  preload() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffcc00, 1);
    g.fillRect(0, 0, 24, 14);  // smaller car sprite
    g.generateTexture('car', 24, 14);
    g.destroy();
  }

  create() {
    this.walls = this.physics.add.staticGroup();
  
    this.buildMap();
    this.createPlayer();
    this.createNPCs();
    this.createGoalZone();
    this.createUI();
  
    this.cursors = this.input.keyboard.createCursorKeys();
    this.restartKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.R
    );
  }
  
  private createNPCs() {
    // How many rivals you want
    const numNPCs = 2;
  
    for (let i = 0; i < numNPCs; i++) {
      // Slight offset behind/around player spawn so they don't overlap
      const offsetX = (i + 1) * -TILE_SIZE * 0.6;
      const offsetY = (i % 2 === 0 ? 1 : -1) * TILE_SIZE * 0.2;
  
      const npc = this.physics.add.sprite(
        this.spawnPos.x + offsetX,
        this.spawnPos.y + offsetY,
        'car'
      );
  
      // Tint to differentiate from player
      const colors = [0x66ccff, 0xff66cc, 0x66ff66];
      npc.setTint(colors[i % colors.length]);
  
      npc.setCollideWorldBounds(true);
      npc.setDamping(false);
      npc.setDrag(0, 0);
      npc.setMaxVelocity(350, 350);
  
      // Point them initially toward first waypoint
      if (npcWaypoints.length > 0) {
        const wp = npcWaypoints[0];
        npc.rotation = Phaser.Math.Angle.Between(npc.x, npc.y, wp.x, wp.y);
      }
  
      // Collide with walls (no damage for now)
      this.physics.add.collider(npc, this.walls);
  
      this.npcCars.push({
        sprite: npc,
        waypointIndex: 0,
      });
    }
  }

  private createUI() {
    this.healthText = this.add
      .text(10, 10, 'Health: 100', {
        fontSize: '18px',
        color: '#ffffff',
      })
      .setScrollFactor(0);
  
    this.timerText = this.add
      .text(10, 32, 'Time: 0.00s', {
        fontSize: '18px',
        color: '#ffffff',
      })
      .setScrollFactor(0);
  
    this.bestTimeText = this.add
      .text(10, 54, 'Best: --.--s', {
        fontSize: '18px',
        color: '#ffffff',
      })
      .setScrollFactor(0);
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
  
    // Let us handle speed/friction manually
    this.player.setDamping(false);
    this.player.setDrag(0, 0);
    this.player.setMaxVelocity(400, 400);
  
    // Point the car to the right to start
    this.player.setAngle(0);
  
    // Collide with walls
    this.physics.add.collider(
        this.player,
        this.walls,
        this.handleWallCollision,
        undefined,
        this
      );
  }

  private handleWallCollision(
    player: Phaser.GameObjects.GameObject,
    wall: Phaser.GameObjects.GameObject
  ) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = body.velocity.length();
  
    // Ignore very soft bumps
    const impactThreshold = 80;
    if (speed < impactThreshold) return;
  
    // --- DAMAGE (same as before) ---
    const damage = Phaser.Math.Clamp(Math.floor(speed / 40), 5, 25);
    this.applyDamage(damage);
  
    // --- PHYSICAL-ISH BOUNCE ---
  
    const wallRect = wall as Phaser.GameObjects.Rectangle;
  
    // Normal pointing from wall center to player (approx collision normal)
    const normal = new Phaser.Math.Vector2(
      this.player.x - wallRect.x,
      this.player.y - wallRect.y
    ).normalize();
  
    // Current velocity
    const v = new Phaser.Math.Vector2(body.velocity.x, body.velocity.y);
  
    // Component of velocity along the normal
    const vn = v.dot(normal);
  
    // Only bounce if we're moving INTO the wall (velocity toward wall)
    // With this normal, 'into wall' gives vn < 0
    if (vn < 0) {
      const restitution = 0.66; // 0 = no bounce, 1 = perfect elastic
  
      // v' = v - (1 + e) * (v·n) * n
      const bounce = normal.clone().scale((1 + restitution) * vn);
      v.subtract(bounce);
  
      // Optionally damp overall speed a bit so you don't ping-pong forever
      v.scale(0.9);
    }
  
    // Apply the new velocity
    body.setVelocity(v.x, v.y);
  
    // Flash red briefly
    this.player.setTint(0xff0000);
    this.time.delayedCall(120, () => {
      this.player.clearTint();
    });
  }
  
  private applyDamage(amount: number) {
    this.health -= amount;
    if (this.health < 0) this.health = 0;
    this.healthText.setText(`Health: ${this.health}`);
  
    if (this.health <= 0) {
      // End current run timer
      if (this.timerRunning) {
        this.timerRunning = false;
        const seconds = (this.elapsedTime / 1000).toFixed(2);
        console.log(`Run ended (wreck) at ${seconds}s`);
      }
  
      this.handleDeathAndRespawn();
    }
  }
  
  private handleDeathAndRespawn() {
    this.startNewRound();
  
    // Brief "respawn" flash
    this.player.setTint(0x00ffff);
    this.time.delayedCall(200, () => {
      this.player.clearTint();
    });
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
        this.handleGoalReached,
        undefined,
        this
      );
  }

  private handleGoalReached() {
    if (!this.timerRunning) return;
  
    this.timerRunning = false;
  
    const runTime = this.elapsedTime; // ms
    const seconds = (runTime / 1000).toFixed(2);
    console.log(`Finished in ${seconds}s`);
  
    // Update best time
    if (this.bestTime === null || runTime < this.bestTime) {
      this.bestTime = runTime;
      this.bestTimeText.setText(`Best: ${seconds}s`);
      console.log('New best time!');
    }
  
    // Nice little success flash
    this.player.setTint(0x00ff00);
    this.time.delayedCall(300, () => {
      this.player.clearTint();
    });
  }

  private startNewRound() {
    // Reset timer state
    this.elapsedTime = 0;
    this.timerRunning = false;
    this.hasMoved = false;
    this.timerText.setText('Time: 0.00s');
  
    // Reset health
    this.health = 100;
    this.healthText.setText('Health: 100');
  
    // Reset player position/orientation
    this.player.x = this.spawnPos.x;
    this.player.y = this.spawnPos.y;
    this.player.rotation = 0;
  
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setVelocity(0, 0);
  
    this.player.clearTint();
  
    // Reset NPCs as well
    for (let i = 0; i < this.npcCars.length; i++) {
      const npcCar = this.npcCars[i];
      const npc = npcCar.sprite;
  
      const offsetX = (i + 1) * -TILE_SIZE * 0.6;
      const offsetY = (i % 2 === 0 ? 1 : -1) * TILE_SIZE * 0.2;
  
      npc.x = this.spawnPos.x + offsetX;
      npc.y = this.spawnPos.y + offsetY;
      npc.rotation = 0;
  
      const body = npc.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
  
      npcCar.waypointIndex = 0;
  
      if (npcWaypoints.length > 0) {
        const wp = npcWaypoints[0];
        npc.rotation = Phaser.Math.Angle.Between(npc.x, npc.y, wp.x, wp.y);
      }
    }
  } 

  update(time: number, delta: number) {
    if (!this.player || !this.cursors) return;
    this.updateNPCs(delta);

    // Press R to start a new round
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.startNewRound();
        return;
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;
  
    // --- CONFIG TUNING ---
    const turnSpeed = 0.003 * delta;      // radians per ms
    const accel = 0.004 * delta;          // forward acceleration
    const brake = 0.006 * delta;          // stronger decel when braking
    const friction = 0.985;               // natural slowdown when coasting
    const maxSpeed = 300;                 // forward max
    const maxReverse = 100;               // reverse max
  
    // 1) Steering
    if (this.cursors.left?.isDown) {
      this.player.rotation -= turnSpeed;
    } else if (this.cursors.right?.isDown) {
      this.player.rotation += turnSpeed;
    }
  
    // 2) Get current scalar speed
    let speed = body.velocity.length();
  
    // Determine if we’re moving forward or backward
    // by checking dot product of velocity and facing
    const facing = new Phaser.Math.Vector2(
      Math.cos(this.player.rotation),
      Math.sin(this.player.rotation)
    );
    const movingForward =
      body.velocity.dot(facing) >= 0; // true if roughly same direction
  
    if (!movingForward) {
      speed = -speed; // treat backwards motion as negative speed
    }
  
    // 3) Throttle / brake input
    if (this.cursors.up?.isDown) {
      speed += accel * 100;
    } else if (this.cursors.down?.isDown) {
      if (speed > 0) {
        // braking while moving forward
        speed -= brake * 100;
      } else {
        // accelerate backwards
        speed -= accel * 80;
      }
    } else {
      // No throttle: apply friction
      speed *= friction;
    }
  
    // 4) Clamp speeds
    if (speed > maxSpeed) speed = maxSpeed;
    if (speed < -maxReverse) speed = -maxReverse;
  
    // 5) Apply velocity along car’s facing direction
    this.physics.velocityFromRotation(
      this.player.rotation,
      speed,
      body.velocity
    );

    // 6) Start timer the first time the player attempts to move this run
    if (
        !this.hasMoved &&
        (this.cursors.up?.isDown || this.cursors.down?.isDown)
    ) {
        this.hasMoved = true;
        this.timerRunning = true;
    }
    // Update timer
    if (this.timerRunning) {
        this.elapsedTime += delta; // delta is in ms
        const seconds = (this.elapsedTime / 1000).toFixed(2);
        this.timerText.setText(`Time: ${seconds}s`);
    }
  }
  private updateNPCs(delta: number) {
    const baseSpeed = 220;      // target cruising speed
    const turnSpeed = 0.0025 * delta;
  
    if (npcWaypoints.length === 0) return;
  
    for (const npcCar of this.npcCars) {
      const npc = npcCar.sprite;
  
      const wp = npcWaypoints[npcCar.waypointIndex];
      const dx = wp.x - npc.x;
      const dy = wp.y - npc.y;
  
      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = Phaser.Math.Angle.Wrap(targetAngle - npc.rotation);
  
      // Turn gradually toward waypoint
      if (angleDiff > 0) {
        npc.rotation += Math.min(angleDiff, turnSpeed);
      } else {
        npc.rotation += Math.max(angleDiff, -turnSpeed);
      }
  
      // Always try to move forward along facing direction
      const body = npc.body as Phaser.Physics.Arcade.Body;
      this.physics.velocityFromRotation(
        npc.rotation,
        baseSpeed,
        body.velocity
      );
  
      // If close enough to this waypoint, go to next
      const distSq = dx * dx + dy * dy;
      const reachRadius = TILE_SIZE * TILE_SIZE * 0.7; // within ~0.84 * TILE_SIZE
  
      if (distSq < reachRadius) {
        npcCar.waypointIndex = (npcCar.waypointIndex + 1) % npcWaypoints.length;
      }
    }
  }
}