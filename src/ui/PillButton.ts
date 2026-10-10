import Phaser from 'phaser';
import { playTap } from '../audio/sfx';
import { TITLE_FONT } from '../config/GameConfig';

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
  fontFamily: TITLE_FONT,
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

// Lightens (positive amount) or darkens (negative) a 0xRRGGBB color by
// mixing each channel toward white/black, used to fake a glossy gem-cut
// gradient on buttons instead of a flat fill.
export function shade(color: number, amount: number): number {
  const target = amount >= 0 ? 255 : 0;
  const t = Math.min(1, Math.abs(amount));
  const mix = (c: number) => Math.round(c + (target - c) * t);
  const r = mix((color >> 16) & 0xff);
  const g = mix((color >> 8) & 0xff);
  const b = mix(color & 0xff);
  return (r << 16) | (g << 8) | b;
}

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

  const shadowG = scene.add.graphics();
  shadowG.fillStyle(0x0a0618, 0.35);
  shadowG.fillRoundedRect(-w / 2, -h / 2 + h * 0.16, w, h, radius);

  const top = shade(o.bgColor, 0.22);
  const bottom = shade(o.bgColor, -0.2);
  const bg = scene.add.graphics();
  // fillGradientStyle only renders under the WebGL pipeline, so paint a
  // solid base first in case the device falls back to the Canvas renderer.
  bg.fillStyle(o.bgColor, o.bgAlpha);
  bg.fillGradientStyle(top, top, bottom, bottom, o.bgAlpha, o.bgAlpha, o.bgAlpha, o.bgAlpha);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
  if (o.strokeAlpha > 0) {
    bg.lineStyle(o.strokeWidth, o.strokeColor, o.strokeAlpha);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  }

  // Glass-like sheen across the top third, suggesting a polished, convex
  // surface rather than a flat painted shape.
  const sheenH = h * 0.4;
  const sheen = scene.add.graphics();
  sheen.fillStyle(0xffffff, 0.16);
  sheen.fillRoundedRect(-w / 2 + w * 0.08, -h / 2 + h * 0.08, w * 0.84, sheenH, Math.min(radius, sheenH / 2));

  const container = scene.add.container(x, y, [shadowG, bg, sheen, text]).setDepth(o.depth);
  container.setSize(w, h);
  container.setInteractive({ useHandCursor: true });
  container.on('pointerdown', () => {
    playTap();
    scene.tweens.add({ targets: container, scaleX: 0.96, scaleY: 0.96, duration: 70, ease: 'Sine.easeOut' });
  });
  container.on('pointerup', () => {
    scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120, ease: 'Back.easeOut' });
  });
  container.on('pointerout', () => {
    scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120, ease: 'Sine.easeOut' });
  });
  return container;
}
