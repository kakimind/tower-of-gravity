import Phaser from 'phaser';
import { BOARD_PIXELS } from './config/GameConfig';
import { GameScene } from './scenes/GameScene';
import { LobbyScene } from './scenes/LobbyScene';
import { initSettingsPanel } from './ui/settingsPanel';
import { unlockAudioOnFirstGesture } from './audio/sfx';

unlockAudioOnFirstGesture();

// Phaser's canvas renders at the game's logical pixel size. On HiDPI/Retina
// displays that leaves every Text object looking soft, since it's rasterized
// at 1x and then upscaled by the browser. Patch the Text factory so every
// this.add.text(...) call renders its texture at device pixel density by
// default, unless a style explicitly overrides `resolution`.
const dpr = Math.min(window.devicePixelRatio || 1, 3);
type TextFactory = (x: number, y: number, text: string | string[], style?: Phaser.Types.GameObjects.Text.TextStyle) => Phaser.GameObjects.Text;
const factoryProto = Phaser.GameObjects.GameObjectFactory.prototype as unknown as { text: TextFactory };
const originalTextFactory = factoryProto.text;
factoryProto.text = function patchedText(
  this: Phaser.GameObjects.GameObjectFactory,
  x: number,
  y: number,
  text: string | string[],
  style?: Phaser.Types.GameObjects.Text.TextStyle,
) {
  return originalTextFactory.call(this, x, y, text, { resolution: dpr, ...style });
};

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: BOARD_PIXELS,
  height: BOARD_PIXELS,
  backgroundColor: '#4a2a17',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [LobbyScene, GameScene],
};

const game = new Phaser.Game(config);
initSettingsPanel();

if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
