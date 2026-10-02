import Phaser from 'phaser';
import { playTap } from '../audio/sfx';

export interface PillButtonOptions {
  fontFamily?: string;
  fontSize?: string;
  textColor?: string;
  bgColor?: number;
  bgAlpha?: number;
  strokeColor?: number;
  strokeAlpha?: number;
  strokeWidth?: number;
  paddingX?: number;
  paddingY?: number;
  minWidth?: number;
  depth?: number;
}

const DEFAULTS: Required<PillButtonOptions> = {
  fontFamily: 'Cinzel Decorative, serif',
  fontSize: '16px',
  textColor: '#150f26',
  bgColor: 0xe8b64f,
  bgAlpha: 1,
  strokeColor: 0xffffff,
  strokeAlpha: 0,
  strokeWidth: 0,
  paddingX: 20,
  paddingY: 10,
  minWidth: 0,
  depth: 0,
};

export function createPillButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  opts: PillButtonOptions = {},
): Phaser.GameObjects.Container {
  const o = { ...DEFAULTS, ...opts };

  const text = scene.add.text(0, 0, label, {
    fontFamily: o.fontFamily,
    fontSize: o.fontSize,
    fontStyle: 'bold',
    color: o.textColor,
  }).setOrigin(0.5);

  const w = Math.max(text.width + o.paddingX * 2, o.minWidth);
  const h = text.height + o.paddingY * 2;
  const radius = h / 2;

  const bg = scene.add.graphics();
  bg.fillStyle(o.bgColor, o.bgAlpha);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
  if (o.strokeAlpha > 0) {
    bg.lineStyle(o.strokeWidth, o.strokeColor, o.strokeAlpha);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  }

  const container = scene.add.container(x, y, [bg, text]).setDepth(o.depth);
  container.setSize(w, h);
  container.setInteractive({ useHandCursor: true });
  container.on('pointerdown', () => playTap());
  return container;
}
