// src/game/MainScene.ts
import Phaser from 'phaser';
import { level1, TILE_SIZE, TileType, npcWaypoints } from './level1';

interface NPCCar {
    sprite: Phaser.Physics.Arcade.Sprite;
    waypointIndex: number;
  
    name: string;
    baseSpeed: number;   // preferred straight-line speed
    turnSpeed: number;   // how fast they can steer (radians/ms)
    traction: number;    // 0–1: how quickly velocity aligns with heading
    jitterX: number;     // offset from waypoint center
    jitterY: number;
    finished: boolean;
    finishTime: number | null; // ms in this run
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

  private spawnPos = { x: 0, y: 0 };
  private goalPos = { x: 0, y: 0 };

  private npcCars: NPCCar[] = [];

  private playerFinishTime: number | null = null;
  private isRaceOver = false;
  private resultsText?: Phaser.GameObjects.Text;

  private playerDNF = false;

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
        this.drawWaypointDebug();  // Uncomment this line to show waypoint spots for debugging NPC driving path
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
    // You can tweak or add more entries here
    const npcConfigs = [
      { // Quick, high control, high traction
        name: 'Blue Pro',
        color: 0x66ccff,
        baseSpeed: 230,        // pretty quick
        turnSpeed: 0.0030,     // steers well
        traction: 0.35,        // snaps to line fairly quickly
        jitterRange: TILE_SIZE * 0.12,
      },
      { // Slower, low control, low traction, big jitter
        name: 'Pink Drifter',
        color: 0xff66cc,
        baseSpeed: 210,        // slightly slower
        turnSpeed: 0.0022,     // lazier steering
        traction: 0.18,        // more drift / slide feel
        jitterRange: TILE_SIZE * 0.20   ,
      },
      { // Fastest straight away, medium turn speed, low traction, tiny jitter
        name: 'Purple Bullet',
        color: 0x800080,
        baseSpeed: 240,        
        turnSpeed: 0.00225,
        traction: 0.18,     
        jitterRange: TILE_SIZE * 0.05,
      }
    ];
  
    this.npcCars = [];
  
    npcConfigs.forEach((cfg, i) => {
    const offsetX = (i + 1) * -TILE_SIZE * 0.6;
    const offsetY = (i % 2 === 0 ? 1 : -1) * TILE_SIZE * 0.2;

    const npc = this.physics.add.sprite(
        this.spawnPos.x + offsetX,
        this.spawnPos.y + offsetY,
        'car'
    );

    npc.setTint(cfg.color);
    npc.setCollideWorldBounds(true);
    npc.setDamping(false);
    npc.setDrag(0, 0);
    npc.setMaxVelocity(400, 400);

    const jitterX = Phaser.Math.FloatBetween(-cfg.jitterRange, cfg.jitterRange);
    const jitterY = Phaser.Math.FloatBetween(-cfg.jitterRange, cfg.jitterRange);

    if (npcWaypoints.length > 0) {
        const wp = npcWaypoints[0];
        npc.rotation = Phaser.Math.Angle.Between(npc.x, npc.y, wp.x, wp.y);
    }

    this.physics.add.collider(
        npc,
        this.walls,
        this.handleNPCWallCollision,
        undefined,
        this
    );

    this.npcCars.push({
        sprite: npc,
        waypointIndex: 0,
        name: cfg.name,
        baseSpeed: cfg.baseSpeed,
        turnSpeed: cfg.turnSpeed,
        traction: cfg.traction,
        jitterX,
        jitterY,
        finished: false,
        finishTime: null,
    });
    });
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

  private drawWaypointDebug() {
    npcWaypoints.forEach((wp, index) => {
      // little circle
      this.add.circle(wp.x, wp.y, 6, 0xff0000, 0.7);
  
      // label
      this.add.text(wp.x + 8, wp.y - 6, index.toString(), {
        fontSize: '12px',
        color: '#ffcccc',
      });
    });
  }

  private handleNPCWallCollision(
    npcGO: Phaser.GameObjects.GameObject,
    wallGO: Phaser.GameObjects.GameObject
  ) {
    const npc = npcGO as Phaser.Physics.Arcade.Sprite;
    const body = npc.body as Phaser.Physics.Arcade.Body;
    const speed = body.velocity.length();
  
    // Find this NPC's data
    const npcCar = this.npcCars.find(c => c.sprite === npc);
    if (!npcCar) return;
  
    const wallRect = wallGO as Phaser.GameObjects.Rectangle;
  
    // Approximate collision normal: from wall center to NPC
    const normal = new Phaser.Math.Vector2(
      npc.x - wallRect.x,
      npc.y - wallRect.y
    ).normalize();
  
    // Current velocity vector
    const v = new Phaser.Math.Vector2(body.velocity.x, body.velocity.y);
  
    // Component of velocity along the normal
    const vn = v.dot(normal);
  
    // If vn < 0, we're moving into the wall along this normal
    if (vn < 0) {
      const restitution = 0.1; // very low bounce, mostly just a nudge
  
      // Reflect only the normal component (softly)
      const bounce = normal.clone().scale((1 + restitution) * vn);
      v.subtract(bounce);
  
      // Lose a bit of energy
      v.scale(0.92);
  
      // Don't let them exceed their preferred speed
      if (v.length() > npcCar.baseSpeed) {
        v.normalize().scale(npcCar.baseSpeed);
      }
    }
  
    body.setVelocity(v.x, v.y);
  }

  private applyDamage(amount: number) {
    this.health -= amount;
    if (this.health < 0) this.health = 0;
    this.healthText.setText(`Health: ${this.health}`);
  
    if (this.health <= 0) {
      // End timer if it was running
      if (this.timerRunning) {
        this.timerRunning = false;
        const seconds = (this.elapsedTime / 1000).toFixed(2);
        console.log(`Run ended (wreck) at ${seconds}s`);
      }
  
      // Mark as DNF for this run
      this.playerFinishTime = null;
      this.playerDNF = true;
  
      // Stop the car and show wreck state
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      this.player.setTint(0xff0000);
  
      // Do NOT end race or show results yet; NPCs keep racing.
      // We'll show results once all NPCs have finished:
      this.tryShowRaceResults();
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
    this.goalZone = this.add.rectangle(
      this.goalPos.x,
      this.goalPos.y,
      TILE_SIZE * 0.8,
      TILE_SIZE * 0.8,
      0x00ff00,
      0.25
    );
  
    this.physics.add.existing(this.goalZone, true);
  
    // Player overlap
    this.physics.add.overlap(
      this.player,
      this.goalZone,
      this.handleGoalReached,
      undefined,
      this
    );
  
    // NPC overlaps
    for (const npcCar of this.npcCars) {
      this.physics.add.overlap(
        npcCar.sprite,
        this.goalZone,
        this.handleNPCGoalReached,
        undefined,
        this
      );
    }
  }

  private handleGoalReached() {
    if (!this.timerRunning) return;
  
    this.timerRunning = false;
  
    const runTime = this.elapsedTime;
    this.playerFinishTime = runTime;
    this.playerDNF = false; // definitely not a DNF
  
    const seconds = (runTime / 1000).toFixed(2);
    console.log(`Finished in ${seconds}s`);
  
    // Best-time logic stays the same
    if (this.bestTime === null || runTime < this.bestTime) {
      this.bestTime = runTime;
      this.bestTimeText.setText(`Best: ${seconds}s`);
      console.log('New best time!');
    }
  
    // Stop the car on the line
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
  
    this.player.setTint(0x00ff00);
    this.time.delayedCall(300, () => {
      this.player.clearTint();
    });
  
    // Now see if we can show results (will only show if all NPCs also done)
    this.tryShowRaceResults();
  }

  private handleNPCGoalReached(
    npcGO: Phaser.GameObjects.GameObject,
    _goal: Phaser.GameObjects.GameObject
  ) {
    const npc = npcGO as Phaser.Physics.Arcade.Sprite;
    const npcCar = this.npcCars.find(c => c.sprite === npc);
    if (!npcCar) return;
  
    if (!npcCar.finished) {
      npcCar.finished = true;
      npcCar.finishTime = this.elapsedTime;
      console.log(
        `${npcCar.name} finished at ${(this.elapsedTime / 1000).toFixed(2)}s`
      );
    }
  
    // Check if now everyone is done (player finished or DNF + all NPCs)
    this.tryShowRaceResults();
  }

  private startNewRound() {
    // Timer state
    this.elapsedTime = 0;
    this.timerRunning = false;
    this.hasMoved = false;
    this.timerText.setText('Time: 0.00s');
  
    // Health
    this.health = 100;
    this.healthText.setText('Health: 100');
  
    // Player
    this.player.x = this.spawnPos.x;
    this.player.y = this.spawnPos.y;
    this.player.rotation = 0;
  
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setVelocity(0, 0);
    this.player.clearTint();
  
    // Race flags
    this.isRaceOver = false;
    this.playerFinishTime = null;
    this.playerDNF = false;
  
    if (this.resultsText) {
      this.resultsText.destroy();
      this.resultsText = undefined;
    }
  
    // NPCs reset (positions, velocities, finished flags, etc.)
    this.npcCars.forEach((npcCar, i) => {
      const npc = npcCar.sprite;
  
      const offsetX = (i + 1) * -TILE_SIZE * 0.6;
      const offsetY = (i % 2 === 0 ? 1 : -1) * TILE_SIZE * 0.2;
  
      npc.x = this.spawnPos.x + offsetX;
      npc.y = this.spawnPos.y + offsetY;
  
      const body = npc.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
  
      npcCar.waypointIndex = 0;
      npcCar.finished = false;
      npcCar.finishTime = null;
  
      if (npcWaypoints.length > 0) {
        const wp = npcWaypoints[0];
        npc.rotation = Phaser.Math.Angle.Between(npc.x, npc.y, wp.x, wp.y);
      } else {
        npc.rotation = 0;
      }
    });
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
  
    // ⛔ If you're wrecked, or finished don't process movement/timer for the player

    const playerDead = this.health <= 0;
    const playerFinished = this.playerFinishTime !== null;
    if (!playerDead && !playerFinished && !this.isRaceOver) {


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
    }
    // Update timer
    if (this.timerRunning) {
        this.elapsedTime += delta; // delta is in ms
        const seconds = (this.elapsedTime / 1000).toFixed(2);
        this.timerText.setText(`Time: ${seconds}s`);
    }
  }
  private updateNPCs(delta: number) {
    // Once race is fully over and results shown, freeze NPCs
    if (this.isRaceOver) {
        for (const npcCar of this.npcCars) {
        const body = npcCar.sprite.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);
        }
        return;
    }
    
    // Don't move NPCs until the player actually starts their run
    if (!this.hasMoved) {
        for (const npcCar of this.npcCars) {
        const body = npcCar.sprite.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);
        }
        return;
    }
    
    if (npcWaypoints.length === 0) return;
  
    for (const npcCar of this.npcCars) {
      const npc = npcCar.sprite;
  
      const wp = npcWaypoints[npcCar.waypointIndex];
  
      // Use jitter except on super-tight corners if you’ve added that logic
      const targetX = wp.x + npcCar.jitterX;
      const targetY = wp.y + npcCar.jitterY;
  
      const dx = targetX - npc.x;
      const dy = targetY - npc.y;
  
      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = Phaser.Math.Angle.Wrap(targetAngle - npc.rotation);
  
      const turnSpeed = npcCar.turnSpeed * delta;
  
      // Turn gradually toward waypoint
      if (angleDiff > 0) {
        npc.rotation += Math.min(angleDiff, turnSpeed);
      } else {
        npc.rotation += Math.max(angleDiff, -turnSpeed);
      }
  
      // Desired velocity along facing
      const body = npc.body as Phaser.Physics.Arcade.Body;
      const desired = new Phaser.Math.Vector2();
      this.physics.velocityFromRotation(
        npc.rotation,
        npcCar.baseSpeed,
        desired
      );
  
      // Current velocity
      const current = new Phaser.Math.Vector2(body.velocity.x, body.velocity.y);
  
      // Traction: how quickly we move current vel toward desired vel
      const t = Phaser.Math.Clamp(npcCar.traction, 0.05, 0.6);
      const newVel = current.lerp(desired, t);
  
      body.setVelocity(newVel.x, newVel.y);
  
      // Waypoint reach check (you may already have the 1.1 radius tweak)
      const distSq = dx * dx + dy * dy;
      const reachRadius = TILE_SIZE * TILE_SIZE * 1.1;
  
      if (distSq < reachRadius) {
        npcCar.waypointIndex = (npcCar.waypointIndex + 1) % npcWaypoints.length;
      }
    }
  }
  private tryShowRaceResults() {
    if (this.isRaceOver) return;
  
    const playerFinished = this.playerFinishTime !== null;
    const allNPCFinished = this.npcCars.every(c => c.finished);
  
    // Case A: you finished, wait for all NPCs
    if (playerFinished && allNPCFinished) {
      this.isRaceOver = true;
      this.showRaceResults();
      return;
    }
  
    // Case B: you DNF'd (wrecked), wait for all NPCs
    if (this.playerDNF && allNPCFinished) {
      this.isRaceOver = true;
      this.showRaceResults();
    }
  }
  private showRaceResults() {
    const racers: { label: string; finished: boolean; time: number }[] = [];
  
    // Player
    if (this.playerFinishTime !== null) {
      racers.push({
        label: 'You',
        finished: true,
        time: this.playerFinishTime,
      });
    } else {
      racers.push({
        label: 'You',
        finished: false,
        time: Infinity,
      });
    }
  
    // NPCs
    for (const npcCar of this.npcCars) {
      if (npcCar.finished && npcCar.finishTime !== null) {
        racers.push({
          label: npcCar.name,
          finished: true,
          time: npcCar.finishTime,
        });
      } else {
        racers.push({
          label: npcCar.name,
          finished: false,
          time: Infinity,
        });
      }
    }
  
    // Sort: finished first, by time; then DNFs
    racers.sort((a, b) => {
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;
      return a.time - b.time;
    });
  
    let text = 'Race Results\n\n';
    racers.forEach((r, index) => {
      const place = index + 1;
      if (r.finished) {
        const secs = (r.time / 1000).toFixed(2);
        text += `${place}. ${r.label} - ${secs}s\n`;
      } else {
        text += `${place}. ${r.label} - DNF\n`;
      }
    });
  
    if (this.resultsText) {
      this.resultsText.destroy();
    }
  
    this.resultsText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, text, {
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
  
    // Optional: faint background box behind results
    const bg = this.add
      .rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        this.resultsText.width + 40,
        this.resultsText.height + 40,
        0x000000,
        0.6
      )
      .setDepth(this.resultsText.depth - 1);
  
    this.resultsText.setDepth(bg.depth + 1);
  }
}