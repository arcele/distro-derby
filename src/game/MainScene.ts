// src/game/MainScene.ts
import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  preload() {
    // load assets here later
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2, 'Distro Derby', {
        fontSize: '32px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
  }

  update(time: number, delta: number) {
    // game loop logic later
  }
}