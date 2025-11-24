// src/game/MainScene.ts
import Phaser from 'phaser';
import { level1, TILE_SIZE, TileType } from './level1';

export class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  preload() {
    // we'll load real art later
  }

  create() {
    this.buildMap();
  }

  private buildMap() {
    const rows = level1.length;
    const cols = level1[0].length;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tile = level1[y][x];

        const worldX = x * TILE_SIZE + TILE_SIZE / 2;
        const worldY = y * TILE_SIZE + TILE_SIZE / 2;

        switch (tile) {
          case TileType.Wall: {
            // Wall tiles
            this.add
              .rectangle(worldX, worldY, TILE_SIZE, TILE_SIZE, 0x333333)
              .setStrokeStyle(2, 0x777777);
            break;
          }

          case TileType.Spawn: {
            // Spawn tile
            this.add.rectangle(worldX, worldY, TILE_SIZE, TILE_SIZE, 0x003366);
            break;
          }

          case TileType.Goal: {
            // Goal tile
            this.add.rectangle(worldX, worldY, TILE_SIZE, TILE_SIZE, 0x336600);
            break;
          }

          case TileType.Floor:
          default: {
            // Floor tiles
            this.add
              .rectangle(worldX, worldY, TILE_SIZE, TILE_SIZE, 0x1e1e1e)
              .setStrokeStyle(1, 0x2e2e2e);
            break;
          }
        }
      }
    }
  }

  update(time: number, delta: number) {
    // we'll hook the player + collisions in here later
  }
}