// src/game/config.ts
import Phaser from 'phaser';
import type = Phaser.Types.Core;
import { MainScene } from './MainScene';

export const GameConfig: type.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#121212',
  parent: 'app', // Vite's default div id in index.html
  physics: {
    default: 'arcade',
    arcade: {
      debug: true,
    },
  },
  scene: [MainScene],
};