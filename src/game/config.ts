// src/game/config.ts
import Phaser from 'phaser';
import type = Phaser.Types.Core;
import { MainScene } from './MainScene';

export const GameConfig: type.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#121212',
  parent: 'game-container',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false, // toggle to true to see collision and physics details
    },
  },
  scene: [MainScene],
};
