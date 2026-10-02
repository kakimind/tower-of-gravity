import Phaser from 'phaser';
import { shade } from './PillButton';

export interface PanelOptions {
  fillColor?: number;
  strokeColor?: number;
  strokeAlpha?: number;
  strokeWidth?: number;
  radius?: number;
  depth?: number;
  // When true, the panel blocks pointer events over its bounds (used to
  // stop clicks on a modal from reaching buttons underneath it).
  interactive?: boolean;
}

const DEFAULTS: Required<PanelOptions> = {
  fillColor: 0x241a3f,
  strokeColor: 0xe8b64f,
  strokeAlpha: 0.8,
  strokeWidth: 2,
  radius: 16,
  depth: 0,
  interactive: false,
};

// Draws a dialog/card background with the same gem-cut treatment as
// PillButton (gradient fill + top sheen) instead of a flat color, so
// modals and cards read at the same polish level as the buttons on them.
export function drawPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: PanelOptions = {},
): Phaser.GameObjects.Graphics {
  const o = { ...DEFAULTS, ...opts };
  const radius = o.radius;

  const top = shade(o.fillColor, 0.16);
  const bottom = shade(o.fillColor, -0.22);

  const g = scene.add.graphics().setPosition(x, y).setDepth(o.depth);
  // fillGradientStyle is WebGL-only; paint a solid base first so a
  // Canvas-renderer fallback still shows the intended color.
  g.fillStyle(o.fillColor, 1);
  g.fillGradientStyle(top, top, bottom, bottom, 1, 1, 1, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
  g.lineStyle(o.strokeWidth, o.strokeColor, o.strokeAlpha);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);

  // Thin highlight along the top edge, echoing the pill-button sheen.
  g.lineStyle(Math.max(1, o.strokeWidth * 0.5), 0xffffff, 0.14);
  g.lineBetween(-w / 2 + radius * 0.6, -h / 2 + o.strokeWidth, w / 2 - radius * 0.6, -h / 2 + o.strokeWidth);

  if (o.interactive) {
    g.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
  }

  return g;
}
