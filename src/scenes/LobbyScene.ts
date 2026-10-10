import Phaser from 'phaser';
import { GRID_SIZE, TILE, UI_SCALE, ART_SIZE, TITLE_FONT, BODY_FONT } from '../config/GameConfig';
import { TOTAL_STAGES, SPECIAL_UNLOCK_FLOOR, isSpecialUnlocked } from '../engine/StageConfig';
import {
  getCurrentStage, getUnlockedStage, getCurrency, addCurrency,
  trySpendCurrency, getBonusMovesInventory, getSpecialInventory, addBonusMovesBoost, addSpecialBoost, addNukeBoost, getNukeInventory,
  getHearts, addHearts, getMsUntilNextHeart, HEART_MAX,
} from '../engine/Progress';
import { buildSpecialSvg, specialTextureKey, SpecialArtType, SPECIAL_THEMES } from '../art/specialArt';
import { buildNukeSvg, nukeTextureKey, NukeType, NUKE_THEMES } from '../art/nukeArt';
import { svgToDataUri } from '../art/candyArt';
import { createPillButton } from '../ui/PillButton';
import { drawPanel } from '../ui/Panel';
import { playMockAd } from '../ui/AdOverlay';
import { setCurrentSceneKey } from '../ui/settingsPanel';
import { playReward, playHeartGain } from '../audio/sfx';
import { t } from '../i18n';

interface SpecialShopItem {
  type: SpecialArtType;
  labelKey: 'item.lineRow' | 'item.lineCol' | 'item.crossBomb' | 'item.colorBomb';
  price: number;
}

const SPECIAL_SHOP_ITEMS: SpecialShopItem[] = [
  { type: 'lineRow', labelKey: 'item.lineRow', price: 40 },
  { type: 'lineCol', labelKey: 'item.lineCol', price: 40 },
  { type: 'crossBomb', labelKey: 'item.crossBomb', price: 70 },
  { type: 'colorBomb', labelKey: 'item.colorBomb', price: 115 },
];

const SPECIAL_LABEL_KEYS: Record<SpecialArtType, 'item.lineRow' | 'item.lineCol' | 'item.crossBomb' | 'item.colorBomb'> = {
  lineRow: 'item.lineRow', lineCol: 'item.lineCol', crossBomb: 'item.crossBomb', colorBomb: 'item.colorBomb',
};

interface NukeShopItem {
  type: NukeType;
  labelKey: 'item.bomb' | 'item.blackHole' | 'item.lightning' | 'item.meteor';
  price: number;
}

// Finisher items: used on demand mid-stage from the HUD item bag, targeted
// at a tile like the hand-placed specials — see GameScene.beginUseNukeItem.
// Priced above the hand-placed specials since each one clears a much
// bigger chunk of the board in one shot.
const NUKE_SHOP_ITEMS: NukeShopItem[] = [
  { type: 'bomb', labelKey: 'item.bomb', price: 130 },
  { type: 'lightning', labelKey: 'item.lightning', price: 150 },
  { type: 'meteor', labelKey: 'item.meteor', price: 160 },
  { type: 'blackHole', labelKey: 'item.blackHole', price: 180 },
];

const NUKE_LABEL_KEYS: Record<NukeType, 'item.bomb' | 'item.blackHole' | 'item.lightning' | 'item.meteor'> = {
  bomb: 'item.bomb', blackHole: 'item.blackHole', lightning: 'item.lightning', meteor: 'item.meteor',
};

const W = GRID_SIZE * TILE;
const H = GRID_SIZE * TILE;
const S = UI_SCALE;

export class LobbyScene extends Phaser.Scene {
  private currencyText?: Phaser.GameObjects.Text;
  private boostText?: Phaser.GameObjects.Text;
  private heartsText?: Phaser.GameObjects.Text;
  private heartsTimerText?: Phaser.GameObjects.Text;
  private shopGroup?: Phaser.GameObjects.Container;
  private shopTab: 'special' | 'nuke' = 'special';
  private languageListener?: () => void;

  constructor() {
    super('LobbyScene');
  }

  preload(): void {
    SPECIAL_SHOP_ITEMS.forEach((item) => {
      if (this.textures.exists(specialTextureKey(item.type))) return;
      const svg = buildSpecialSvg(item.type);
      this.load.svg(specialTextureKey(item.type), svgToDataUri(svg), { width: ART_SIZE, height: ART_SIZE });
    });
    NUKE_SHOP_ITEMS.forEach((item) => {
      if (this.textures.exists(nukeTextureKey(item.type))) return;
      const svg = buildNukeSvg(item.type);
      this.load.svg(nukeTextureKey(item.type), svgToDataUri(svg), { width: ART_SIZE, height: ART_SIZE });
    });
  }

  create(): void {
    setCurrentSceneKey('LobbyScene');
    document.querySelector('.hud')?.setAttribute('style', 'display:none');
    document.querySelector('.footer-hint')?.setAttribute('style', 'display:none');
    this.languageListener = () => this.scene.restart();
    window.addEventListener('game:language-changed', this.languageListener);
    this.events.once('shutdown', () => {
      if (this.languageListener) window.removeEventListener('game:language-changed', this.languageListener);
    });

    this.cameras.main.setBackgroundColor('#1a1330');

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2c1f4a, 0x2c1f4a, 0x0f0a1c, 0x0f0a1c, 1);
    bg.fillRect(0, 0, W, H);

    this.drawOrbitRings();
    this.drawStars();
    this.drawTower();

    const stage = getCurrentStage();
    const unlocked = getUnlockedStage();
    const floor = Math.ceil(stage / 10);

    this.add.text(W / 2, 20 * S, t('lobby.floorStage', { floor, stage, total: TOTAL_STAGES }), {
      fontFamily: BODY_FONT, fontSize: `${12 * S}px`, fontStyle: '700', color: '#e4dcf5',
      stroke: '#0a0618', strokeThickness: 3 * S,
    }).setOrigin(0.5);

    // Single consolidated status bar (currency + hearts side by side with a
    // thin divider) instead of three separately-stacked pills — frees the
    // vertical space previously spent on stacked status rows so the tower
    // illustration below can take over as the actual hero of the screen.
    //
    // Width is measured from the actual currency string rather than a fixed
    // offset: other languages (e.g. "522 Stardust" vs "522 별가루") run
    // noticeably longer than Korean and were overflowing past the divider
    // into the hearts segment at the old fixed layout.
    const statusTop = 34 * S;
    const statusH = 30 * S;
    const currencyStr = t('lobby.currency', { n: getCurrency() });
    const measure = this.add.text(0, 0, currencyStr, { fontFamily: TITLE_FONT, fontSize: `${13 * S}px` });
    const currencySegW = Math.max(110 * S, measure.width + 36 * S);
    measure.destroy();
    const heartsSegW = 150 * S;
    const totalW = currencySegW + heartsSegW;
    const pillLeft = W / 2 - totalW / 2;
    const dividerX = pillLeft + currencySegW;

    const statusPill = this.add.graphics();
    statusPill.fillStyle(0x150f26, 0.85);
    statusPill.lineStyle(2 * S, 0xe8b64f, 0.9);
    statusPill.fillRoundedRect(pillLeft, statusTop, totalW, statusH, 15 * S);
    statusPill.strokeRoundedRect(pillLeft, statusTop, totalW, statusH, 15 * S);
    statusPill.lineStyle(1.5 * S, 0xe8b64f, 0.35);
    statusPill.lineBetween(dividerX, statusTop + 6 * S, dividerX, statusTop + statusH - 6 * S);

    const statusCenterY = statusTop + statusH / 2;
    const currencyX = pillLeft + currencySegW / 2;
    this.currencyText = this.add.text(currencyX, statusCenterY, currencyStr, {
      fontFamily: TITLE_FONT, fontSize: `${13 * S}px`, color: '#fff3c4',
      stroke: '#0a0618', strokeThickness: 4 * S,
    }).setOrigin(0.5);

    // A couple of tiny twinkling sparkles near the currency segment, echoing
    // the board's corner sigils, so the stardust reads as faintly magical
    // rather than a plain number.
    [[-48, -7, 2200], [45, 6, 1800]].forEach(([dx, dy, dur], i) => {
      const sparkle = this.add.star(currencyX + dx * S, statusCenterY + dy * S, 4, 0.9 * S, 2 * S, 0xfff3c4, 0.8);
      this.tweens.add({
        targets: sparkle, alpha: 0.15, scale: 1.4, yoyo: true, repeat: -1, duration: dur, delay: i * 400, ease: 'Sine.easeInOut',
      });
    });

    this.heartsText = this.add.text(dividerX + heartsSegW / 2, statusCenterY, '', {
      fontFamily: BODY_FONT, fontSize: `${12 * S}px`, fontStyle: '700', color: '#ffb3c0', align: 'center',
      stroke: '#0a0618', strokeThickness: 3 * S,
    }).setOrigin(0.5);

    // Regen countdown as its own small subtitle rather than appended inline
    // to the heart icons — the icons stay fixed-width in the status bar's
    // right segment, and this line only appears while hearts are missing.
    this.heartsTimerText = this.add.text(W / 2, statusTop + statusH + 12 * S, '', {
      fontFamily: BODY_FONT, fontSize: `${10 * S}px`, fontStyle: '700', color: '#ffb3c0', align: 'center',
      stroke: '#0a0618', strokeThickness: 2.5 * S,
    }).setOrigin(0.5);
    this.refreshHearts();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.refreshHearts() });

    this.boostText = this.add.text(W / 2, statusTop + statusH + 28 * S, '', {
      fontFamily: BODY_FONT, fontSize: `${11 * S}px`, fontStyle: '700', color: '#9df0ac', align: 'center',
      stroke: '#0a0618', strokeThickness: 3 * S,
      wordWrap: { width: W - 40 * S },
      lineSpacing: 2 * S,
    }).setOrigin(0.5);
    this.refreshBoostText();

    const ctaWidth = 220 * S;

    const ascendBtn = createPillButton(this, W / 2, H - 76 * S, t('lobby.ascend'), {
      fontSize: `${18 * S}px`, bgColor: 0xe8b64f, paddingX: 24 * S, paddingY: 9 * S, minWidth: ctaWidth, depth: 5,
    });
    this.tweens.add({
      targets: ascendBtn, scale: 1.04, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.easeInOut',
    });
    ascendBtn.on('pointerdown', () => {
      if (getHearts() <= 0) {
        this.confirmAd(t('lobby.noHeartsConfirm'), () => this.playAdForHeart());
        return;
      }
      this.scene.start('GameScene', { stage: getCurrentStage() });
    });

    const shopBtn = createPillButton(this, W / 2, H - 32 * S, t('lobby.shop'), {
      fontFamily: TITLE_FONT, fontSize: `${15 * S}px`, textColor: '#f3e6c8',
      bgColor: 0x3a2a5c, strokeColor: 0x7a5bb5, strokeAlpha: 1, strokeWidth: 2 * S,
      paddingX: 20 * S, paddingY: 9 * S, minWidth: ctaWidth, depth: 5,
    });
    shopBtn.on('pointerdown', () => this.toggleShop());

    void unlocked;
  }

  // Two faint, slowly-counter-rotating rings of small dots behind the tower
  // — a nod to the game's gravity theme (distant bodies in orbit) and a
  // cheap way to give the background a sense of depth instead of a flat
  // gradient. Drawn before the stars/tower so it sits furthest back.
  private drawOrbitRing(
    cx: number, cy: number, radius: number, count: number,
    dotSize: number, alpha: number, duration: number, color: number, clockwise: boolean,
  ): void {
    const ring = this.add.container(cx, cy);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dot = this.add.circle(Math.cos(angle) * radius, Math.sin(angle) * radius, dotSize, color, alpha);
      ring.add(dot);
    }
    this.tweens.add({
      targets: ring, angle: clockwise ? 360 : -360, duration, repeat: -1, ease: 'Linear',
    });
  }

  private drawOrbitRings(): void {
    const cx = W / 2;
    const cy = 380 * S;
    this.drawOrbitRing(cx, cy, 280 * S, 14, 1.8 * S, 0.42, 70000, 0x9b6bff, true);
    this.drawOrbitRing(cx, cy, 210 * S, 10, 1.6 * S, 0.48, 48000, 0xe8b64f, false);
  }

  private drawStars(): void {
    // Two depth tiers — small/dim "far" stars and a few larger/brighter
    // "near" ones — instead of a single flat layer, so the sky reads with
    // some parallax depth even though nothing actually moves horizontally.
    const far: [number, number][] = [
      [20 * S, 60 * S], [70 * S, 140 * S], [16 * S, 260 * S], [52 * S, 380 * S],
      [W - 18 * S, 130 * S], [W - 66 * S, 260 * S], [W - 20 * S, 380 * S], [W - 46 * S, 60 * S],
      [120 * S, 30 * S], [W - 110 * S, 40 * S], [34 * S, 470 * S], [W - 36 * S, 470 * S],
    ];
    far.forEach(([x, y]) => {
      const star = this.add.circle(x, y, 0.7 * S, 0xffffff, 0.45);
      this.tweens.add({
        targets: star, alpha: 0.1, yoyo: true, repeat: -1, duration: 1100 + Math.random() * 900,
        delay: Math.random() * 900,
      });
    });

    const near: [number, number, number][] = [
      [30 * S, 100 * S, 1.5 * S], [60 * S, 200 * S, S], [W - 40 * S, 90 * S, 1.3 * S], [W - 30 * S, 220 * S, S],
      [24 * S, 320 * S, 1.2 * S], [W - 24 * S, 340 * S, 1.4 * S], [40 * S, 420 * S, S], [W - 50 * S, 440 * S, 1.2 * S],
    ];
    near.forEach(([x, y, r]) => {
      const star = this.add.circle(x, y, r, 0xffffff, 0.8);
      this.tweens.add({
        targets: star, alpha: 0.2, yoyo: true, repeat: -1, duration: 900 + Math.random() * 900,
        delay: Math.random() * 800,
      });
    });
  }

  private drawTower(): void {
    const cx = W / 2;
    const baseY = 322 * S;

    // slim, constant-width spire body (not a flared trapezoid) topped by a
    // conical roof that flares out wider than the body — matches the
    // Arcane Spire mockup silhouette instead of the old wide citadel.
    // Sized up from the original proportions (baseY unchanged, so the
    // plinth-to-button clearance below is untouched) now that consolidating
    // the lobby's status rows into one bar freed vertical space above —
    // the tower is meant to be the hero of this screen, not a small
    // silhouette floating in empty starfield.
    const bodyW = 56 * S;
    const bodyH = 158 * S;
    const brimY = baseY - bodyH;
    const roofHalfW = 35 * S;
    const roofH = 46 * S;
    const apexY = brimY - roofH;
    const turretOffset = 68 * S;
    const turretW = 25 * S;
    const turretH = 94 * S;

    const moonG = this.add.graphics();
    moonG.fillStyle(0xfff3cf, 0.9);
    moonG.fillCircle(cx + 78 * S, apexY + 16 * S, 19 * S);
    moonG.fillStyle(0x1a1330, 1);
    moonG.fillCircle(cx + 86 * S, apexY + 10 * S, 19 * S);
    this.tweens.add({
      targets: moonG, alpha: 0.75, yoyo: true, repeat: -1, duration: 2200, ease: 'Sine.easeInOut',
    });

    const aura = this.add.circle(cx, (brimY + apexY) / 2, 110 * S, 0x9b6bff, 0.16);
    this.tweens.add({
      targets: aura, alpha: 0.26, scale: 1.08, yoyo: true, repeat: -1, duration: 1600, ease: 'Sine.easeInOut',
    });

    // Ground mist at the tower's foot — stacked low-opacity ellipses that
    // fade outward, so the plinth sits in atmospheric haze instead of
    // meeting bare empty background.
    // No explicit depth: like the rest of this scene's tower pieces, paint
    // order follows creation order at the shared default depth (0), and
    // this is created after the background/stars/moon but before the
    // plinth, landing it exactly between them.
    const mist = this.add.graphics();
    [[260, 22, 0.1], [190, 16, 0.14], [130, 12, 0.18]].forEach(([w, h, a]) => {
      mist.fillStyle(0xcbb8f0, a);
      mist.fillEllipse(cx, baseY + 14 * S, w * S, h * S);
    });
    this.tweens.add({
      targets: mist, alpha: 0.6, yoyo: true, repeat: -1, duration: 3200, ease: 'Sine.easeInOut',
    });

    // stone plinth / steps the tower stands on
    const plinthG = this.add.graphics();
    ([[90, 4], [112, 8], [134, 12]] as [number, number][]).map(([w, dy]) => [w * S, dy * S]).forEach(([w, dy], i) => {
      const shade = 0x160f28 + i * 0x040302;
      plinthG.fillStyle(shade, 1);
      plinthG.fillRoundedRect(cx - w / 2, baseY + dy, w, 7 * S, 3 * S);
      plinthG.lineStyle(S, 0xe8b64f, 0.25);
      plinthG.strokeRoundedRect(cx - w / 2, baseY + dy, w, 7 * S, 3 * S);
    });

    // flanking turrets, close against the spire
    this.drawSideSpire(cx - turretOffset, baseY, -1, turretW, turretH);
    this.drawSideSpire(cx + turretOffset, baseY, 1, turretW, turretH);

    const g = this.add.graphics();

    g.fillStyle(0x3a2a5c, 1);
    g.fillEllipse(cx, baseY + 6 * S, bodyW + 20 * S, 14 * S);

    g.fillGradientStyle(0x4a3480, 0x2c1f4a, 0x4a3480, 0x2c1f4a, 1);
    g.fillRoundedRect(cx - bodyW / 2, brimY, bodyW, bodyH, { tl: 6 * S, tr: 6 * S, bl: 2 * S, br: 2 * S });
    g.lineStyle(2 * S, 0xe8b64f, 0.55);
    g.strokeRoundedRect(cx - bodyW / 2, brimY, bodyW, bodyH, { tl: 6 * S, tr: 6 * S, bl: 2 * S, br: 2 * S });

    g.fillStyle(0x1c1330, 1);
    g.fillEllipse(cx, brimY, roofHalfW * 2, 10 * S);
    g.lineStyle(2 * S, 0xe8b64f, 0.7);
    g.strokeEllipse(cx, brimY, roofHalfW * 2, 10 * S);

    g.fillStyle(0x6a4ab0, 1);
    g.fillTriangle(cx - roofHalfW, brimY, cx + roofHalfW, brimY, cx, apexY);
    g.lineStyle(1.5 * S, 0xe8b64f, 0.6);
    for (let i = 0; i < 3; i++) {
      const t0 = 0.15 + i * 0.28;
      const y0 = brimY - (brimY - apexY) * t0;
      const spread0 = roofHalfW * (1 - t0);
      const y1 = brimY - (brimY - apexY) * (t0 + 0.16);
      const spread1 = roofHalfW * (1 - (t0 + 0.16));
      g.lineBetween(cx - spread0, y0, cx + spread1, y1);
    }

    const orb = this.add.circle(cx, apexY - 8 * S, 5 * S, 0xffe9a8, 1);
    this.tweens.add({
      targets: orb, alpha: 0.4, scale: 1.5, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.easeInOut',
    });

    [[-1, 0.3], [1, 0.5], [-0.6, 0.72]].forEach(([side, t], i) => {
      const rune = this.add.star(cx + (side as number) * 44 * S, brimY - (brimY - apexY) * (t as number), 4 * S, 2 * S, 4 * S, 0xffe9a8, 0.85);
      this.tweens.add({
        targets: rune, alpha: 0.25, angle: 90, yoyo: true, repeat: -1, duration: 1400 + i * 200, delay: i * 300,
      });
    });

    const windowYs = [baseY - 28 * S, baseY - 68 * S, baseY - 108 * S];
    windowYs.forEach((wy, i) => {
      const rr = (i === 0 ? 9 : 7) * S;
      // Soft bloom halo behind the pane, like warm candlelight spilling
      // through the glass into the night — added first so it sits behind.
      const glow = this.add.circle(cx, wy, rr * 2.4, 0xffd27a, 0.16);
      const win = this.add.circle(cx, wy, rr, 0xffe9a8, 0.85);
      win.setStrokeStyle(1.5 * S, 0xe8b64f, 0.9);
      const bar1 = this.add.rectangle(cx, wy, rr * 2 + 2 * S, 1.4 * S, 0x150f26, 0.6);
      const bar2 = this.add.rectangle(cx, wy, 1.4 * S, rr * 2 + 2 * S, 0x150f26, 0.6);
      this.tweens.add({
        targets: [win, bar1, bar2], alpha: 0.35, yoyo: true, repeat: -1, duration: 1100, delay: i * 500,
      });
      this.tweens.add({
        targets: glow, alpha: 0.04, scale: 1.15, yoyo: true, repeat: -1, duration: 1800, delay: i * 400, ease: 'Sine.easeInOut',
      });
    });

    // pennants hung at the eaves, where the roof meets the body
    [-1, 1].forEach((side, i) => {
      const bx = cx + side * (roofHalfW - 7 * S);
      const bTop = brimY - 4 * S;
      const bannerG = this.add.graphics();
      // fillGradientStyle only renders under WebGL; fillStyle first keeps
      // the pennant red (not black) on a Canvas-renderer fallback.
      bannerG.fillStyle(0xb3122a, 1);
      bannerG.fillGradientStyle(0xe0455a, 0xb3122a, 0xe0455a, 0xb3122a, 1);
      bannerG.fillRect(bx - 5 * S, bTop, 10 * S, 24 * S);
      bannerG.beginPath();
      bannerG.moveTo(bx - 5 * S, bTop + 24 * S);
      bannerG.lineTo(bx, bTop + 18 * S);
      bannerG.lineTo(bx + 5 * S, bTop + 24 * S);
      bannerG.closePath();
      bannerG.fillPath();
      // center fold crease, suggesting draped cloth rather than a flat card
      bannerG.lineStyle(0.8 * S, 0x7a0d1d, 0.55);
      bannerG.lineBetween(bx, bTop + 2 * S, bx, bTop + 21 * S);
      bannerG.lineStyle(S, 0xe8b64f, 0.7);
      bannerG.strokeRect(bx - 5 * S, bTop, 10 * S, 24 * S);
      this.tweens.add({
        targets: bannerG, angle: side * 3, yoyo: true, repeat: -1, duration: 1600 + i * 200, ease: 'Sine.easeInOut',
      });
    });
  }

  private drawSideSpire(x: number, baseY: number, side: number, w: number, bodyH: number): void {
    const g = this.add.graphics();
    const roofH = Math.round(bodyH * 0.26);
    const brimY = baseY - bodyH;
    const apexY = brimY - roofH;

    g.fillStyle(0x241a3f, 1);
    g.fillEllipse(x, baseY + 3 * S, w + 10 * S, 8 * S);

    g.fillGradientStyle(0x3d2c68, 0x241a3f, 0x3d2c68, 0x241a3f, 1);
    g.fillRect(x - w / 2, brimY, w, bodyH);
    g.lineStyle(1.5 * S, 0xe8b64f, 0.4);
    g.strokeRect(x - w / 2, brimY, w, bodyH);

    g.fillStyle(0x1c1330, 1);
    g.fillEllipse(x, brimY, w + 8 * S, 7 * S);

    g.fillStyle(0x6a4ab0, 1);
    g.fillTriangle(x - (w + 6 * S) / 2, brimY, x + (w + 6 * S) / 2, brimY, x, apexY);
    g.lineStyle(S, 0xe8b64f, 0.5);
    g.lineBetween(x, apexY, x - (w + 6 * S) / 4, brimY);

    const winGlow = this.add.circle(x, baseY - bodyH / 2, 3.5 * S * 2.2, 0xffd27a, 0.14);
    const win = this.add.circle(x, baseY - bodyH / 2, 3.5 * S, 0xffe9a8, 0.8);
    this.tweens.add({
      targets: win, alpha: 0.3, yoyo: true, repeat: -1, duration: 1300, delay: side > 0 ? 300 : 0,
    });
    this.tweens.add({
      targets: winGlow, alpha: 0.04, scale: 1.15, yoyo: true, repeat: -1, duration: 1700, delay: side > 0 ? 200 : 0, ease: 'Sine.easeInOut',
    });

    const tip = this.add.circle(x, apexY - 3 * S, 2.5 * S, 0xffe9a8, 0.9);
    this.tweens.add({
      targets: tip, alpha: 0.3, scale: 1.4, yoyo: true, repeat: -1, duration: 900, delay: side > 0 ? 150 : 0,
    });
  }

  private refreshHearts(): void {
    const hearts = getHearts();
    const icons = Array.from({ length: HEART_MAX }, (_, i) => (i < hearts ? '❤️' : '🖤')).join(' ');
    this.heartsText?.setText(icons);
    if (hearts < HEART_MAX) {
      const ms = getMsUntilNextHeart();
      const mm = Math.floor(ms / 60000);
      const ss = Math.floor((ms % 60000) / 1000);
      this.heartsTimerText?.setText(t('lobby.nextHeart', { mm, ss: String(ss).padStart(2, '0') }));
    } else {
      this.heartsTimerText?.setText('');
    }
  }

  private confirmAd(message: string, onConfirm: () => void): void {
    const cx = W / 2;
    const cy = H / 2;
    const overlay = this.add.rectangle(cx, cy, W, H, 0x0a0618, 0.75).setDepth(58).setInteractive();
    const panel = drawPanel(this, cx, cy, W - 80 * S, 150 * S, { radius: 16 * S, strokeWidth: 2 * S, depth: 59 });
    const text = this.add.text(cx, cy - 30 * S, message, {
      fontFamily: BODY_FONT, fontSize: `${15 * S}px`, fontStyle: '700', color: '#f3e6c8', align: 'center',
      stroke: '#0a0618', strokeThickness: 3 * S,
      wordWrap: { width: W - 120 * S },
    }).setOrigin(0.5).setDepth(59);

    const yesBtn = createPillButton(this, cx - 55 * S, cy + 40 * S, t('common.watch'), {
      fontSize: `${14 * S}px`, bgColor: 0xe8b64f, paddingX: 16 * S, paddingY: 8 * S, depth: 59,
    });
    const noBtn = createPillButton(this, cx + 55 * S, cy + 40 * S, t('common.cancel'), {
      fontFamily: BODY_FONT, fontSize: `${13 * S}px`, textColor: '#f3e6c8',
      bgColor: 0x3a2a5c, paddingX: 16 * S, paddingY: 8 * S, depth: 59,
    });

    const group = this.add.container(0, 0, [overlay, panel, text, yesBtn, noBtn]).setDepth(58);
    yesBtn.on('pointerdown', () => { group.destroy(true); onConfirm(); });
    noBtn.on('pointerdown', () => group.destroy(true));
  }

  private playAdForHeart(): void {
    const cx = W / 2;
    const cy = H / 2;
    playMockAd(this, cx, cy, () => {
      addHearts(1);
      this.refreshHearts();
      this.spawnRewardPopup(cx, cy, '+1 ❤️', playHeartGain);
    });
  }

  private refreshBoostText(): void {
    const bonusMovesOwned = getBonusMovesInventory();
    const specialOwned = getSpecialInventory();
    const parts: string[] = [];
    if (bonusMovesOwned > 0) parts.push(t('lobby.boostBonusMoves', { n: bonusMovesOwned }));
    (Object.keys(SPECIAL_LABEL_KEYS) as SpecialArtType[]).forEach((type) => {
      const count = specialOwned[type];
      if (count > 0) parts.push(`${t(SPECIAL_LABEL_KEYS[type])} x${count}`);
    });
    const nukeInventory = getNukeInventory();
    (Object.keys(NUKE_LABEL_KEYS) as NukeType[]).forEach((type) => {
      const count = nukeInventory[type];
      if (count > 0) parts.push(`${t(NUKE_LABEL_KEYS[type])} x${count}`);
    });
    if (!this.boostText) return;
    const full = parts.length ? t('lobby.boostOwned', { items: parts.join(' · ') }) : '';
    // A player who has bought every boost type produces a long list that can
    // wrap to 3+ lines at the default size — the last line then becomes a
    // lone orphaned word (e.g. just "x2") dangling well below the status bar,
    // overlapping the tower artwork. Shrink the font until it settles into
    // at most ~2 lines' worth of height instead of letting it sprawl.
    const maxBoostH = 44 * S;
    const floorFontPx = 8 * S;
    let fontPx = 11 * S;
    this.boostText.setFontSize(fontPx);
    this.boostText.setText(full);
    while (this.boostText.height > maxBoostH && fontPx > floorFontPx) {
      fontPx -= 1 * S;
      this.boostText.setFontSize(fontPx);
    }
  }

  private toggleShop(): void {
    if (this.shopGroup) {
      this.shopGroup.destroy(true);
      this.shopGroup = undefined;
      return;
    }
    this.buildShop();
  }

  private buildShop(): void {
    const cx = W / 2;
    const cy = H / 2;
    const children: Phaser.GameObjects.GameObject[] = [];

    const overlay = this.add.rectangle(cx, cy, W, H, 0x0a0618, 0.85).setInteractive();
    children.push(overlay);

    const panel = drawPanel(this, cx, cy, W - 40 * S, 360 * S, {
      radius: 16 * S, strokeWidth: 2 * S, interactive: true,
    });
    children.push(panel);

    const title = this.add.text(cx, cy - 160 * S, t('lobby.shopTitle'), {
      fontFamily: TITLE_FONT, fontSize: `${18 * S}px`, color: '#e8b64f',
      stroke: '#0a0618', strokeThickness: 4 * S,
    }).setOrigin(0.5);
    children.push(title);

    // Special (hand-placed) and nuke (instant finisher) items share the same
    // list of 4 rows and don't fit on screen together, so they page between
    // each other with arrows instead of needing a scrollable panel — reuses
    // the exact row geometry that already fits 6 rows.
    const PAGES: Array<'special' | 'nuke'> = ['special', 'nuke'];
    const pageIndex = PAGES.indexOf(this.shopTab);
    const goToPage = (index: number) => {
      const next = PAGES[(index + PAGES.length) % PAGES.length];
      if (next === this.shopTab) return;
      this.shopTab = next;
      this.shopGroup?.destroy(true);
      this.shopGroup = undefined;
      this.buildShop();
    };
    const pageLabel = this.add.text(cx, cy - 124 * S, t(this.shopTab === 'special' ? 'lobby.shopTabSpecial' : 'lobby.shopTabNuke'), {
      fontFamily: BODY_FONT, fontSize: `${14 * S}px`, fontStyle: '700', color: '#ffe9a8',
      stroke: '#0a0618', strokeThickness: 3 * S,
    }).setOrigin(0.5);
    const pageDots = this.add.text(cx, cy - 108 * S, PAGES.map((_, i) => (i === pageIndex ? '●' : '○')).join(' '), {
      fontFamily: BODY_FONT, fontSize: `${9 * S}px`, color: '#8a7aa8',
    }).setOrigin(0.5);
    const arrowLeft = this.add.text(cx - 140 * S, cy - 124 * S, '◀', {
      fontFamily: BODY_FONT, fontSize: `${16 * S}px`, color: '#e8b64f',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    arrowLeft.on('pointerdown', () => goToPage(pageIndex - 1));
    const arrowRight = this.add.text(cx + 140 * S, cy - 124 * S, '▶', {
      fontFamily: BODY_FONT, fontSize: `${16 * S}px`, color: '#e8b64f',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    arrowRight.on('pointerdown', () => goToPage(pageIndex + 1));
    children.push(pageLabel, pageDots, arrowLeft, arrowRight);

    const rowGap = 38 * S;
    let rowY = cy - 90 * S;

    const rowMoves = this.buildShopRow(cx, rowY, t('lobby.shopMovesLabel'), t('lobby.priceStardust', { n: 45 }), () => {
      if (trySpendCurrency(45)) {
        addBonusMovesBoost();
        this.refreshAll();
      } else {
        this.flashInsufficient(cx, rowY + 18 * S);
      }
    });
    children.push(...rowMoves);
    rowY += rowGap;

    const unlockedStage = getUnlockedStage();
    const currentItems = this.shopTab === 'special'
      ? SPECIAL_SHOP_ITEMS.map((item) => ({
        label: t(item.labelKey), price: item.price,
        textureKey: specialTextureKey(item.type), glow: SPECIAL_THEMES[item.type].glow,
        locked: isSpecialUnlocked(item.type, unlockedStage) ? undefined : { floor: SPECIAL_UNLOCK_FLOOR[item.type] },
        buy: () => addSpecialBoost(item.type),
      }))
      : NUKE_SHOP_ITEMS.map((item) => ({
        label: t(item.labelKey), price: item.price,
        textureKey: nukeTextureKey(item.type), glow: NUKE_THEMES[item.type].glow,
        locked: undefined as { floor: number } | undefined,
        buy: () => addNukeBoost(item.type),
      }));
    currentItems.forEach((item) => {
      const thisRowY = rowY;
      const row = this.buildShopRow(cx, thisRowY, item.label, t('lobby.priceStardust', { n: item.price }), () => {
        if (trySpendCurrency(item.price)) {
          item.buy();
          this.refreshAll();
        } else {
          this.flashInsufficient(cx, thisRowY + 18 * S);
        }
      }, {
        textureKey: item.textureKey, glowColor: item.glow, locked: item.locked,
      });
      children.push(...row);
      rowY += rowGap;
    });

    const rowAd = this.buildShopRow(cx, rowY, t('lobby.shopAdLabel'), t('lobby.get'), () => {
      this.confirmAd(t('lobby.confirmWatchAdReward'), () => this.playAdForReward());
    });
    children.push(...rowAd);
    rowY += rowGap;

    const closeBtn = createPillButton(this, cx, rowY + 6 * S, t('settings.close'), {
      fontFamily: BODY_FONT, fontSize: `${14 * S}px`, textColor: '#f3e6c8',
      bgColor: 0x3a2a5c, paddingX: 16 * S, paddingY: 6 * S,
    });
    closeBtn.on('pointerdown', () => this.toggleShop());
    children.push(closeBtn);

    this.shopGroup = this.add.container(0, 0, children).setDepth(50);
  }

  private buildShopRow(
    cx: number, cy: number, label: string, price: string, onBuy: () => void,
    icon?: { textureKey: string; glowColor: string; locked?: { floor: number } },
  ): Phaser.GameObjects.GameObject[] {
    const items: Phaser.GameObjects.GameObject[] = [];
    const locked = icon?.locked;

    // Slot card behind the row: a soft dark backing with a thin gold divider
    // along the bottom, so the shop reads as a stacked list of distinct
    // item slots instead of bare text/button pairs floating on the panel.
    const rowW = 332 * S;
    const rowH = 28 * S;
    const card = this.add.graphics();
    card.fillStyle(0x1c1330, locked ? 0.2 : 0.35);
    card.fillRoundedRect(cx - rowW / 2, cy - rowH / 2, rowW, rowH, 8 * S);
    card.lineStyle(S, 0xe8b64f, locked ? 0.08 : 0.16);
    card.lineBetween(cx - rowW / 2 + 12 * S, cy + rowH / 2, cx + rowW / 2 - 12 * S, cy + rowH / 2);
    items.push(card);

    const labelX = icon ? cx - 132 * S : cx - 150 * S;

    if (icon) {
      const glowColor = Phaser.Display.Color.HexStringToColor(icon.glowColor).color;
      const glow = this.add.circle(cx - 167 * S, cy, 17 * S, glowColor, locked ? 0.08 : 0.22);
      const glowTween = this.tweens.add({
        targets: glow, alpha: locked ? 0.03 : 0.08, scale: 1.15, yoyo: true, repeat: -1, duration: 1600, ease: 'Sine.easeInOut',
      });
      // The shop panel is rebuilt from scratch on every open (toggleShop ->
      // buildShop), so these infinite repeat:-1 tweens would otherwise pile
      // up across opens instead of stopping with the glow they animate.
      glow.once(Phaser.GameObjects.Events.DESTROY, () => glowTween.remove());
      const iconImg = this.add.image(cx - 167 * S, cy, icon.textureKey);
      iconImg.setDisplaySize(28 * S, 28 * S);
      if (locked) iconImg.setAlpha(0.35).setTint(0x8a7aa8);
      items.push(glow, iconImg);
    }

    const labelText = this.add.text(labelX, cy, label, {
      fontFamily: BODY_FONT, fontSize: `${14 * S}px`, fontStyle: '700',
      color: locked ? '#8a7aa8' : '#f3e6c8',
      stroke: '#0a0618', strokeThickness: 3 * S,
    }).setOrigin(0, 0.5);
    items.push(labelText);

    const panelRight = cx + (W - 40 * S) / 2 - 14 * S;

    if (locked) {
      // Locked rows show where the item unlocks instead of a buy button —
      // no interaction, just a preview of what's still ahead. Cap the wrap
      // width to the panel's actual right edge (not a flat guess) so longer
      // translations of "unlocks at floor N" wrap instead of spilling past it.
      const lockMaxWidth = Math.max(60 * S, (panelRight - (cx + 150 * S) - 4 * S) * 2);
      // 10*S (not 11*S): at 3 wrapped lines (e.g. Spanish "Se desbloquea
      // en el piso N"), 11*S's line height ran taller than the 38*S row
      // gap, crowding the label right up against the neighboring row.
      const lockLabel = this.add.text(cx + 150 * S, cy, `🔒 ${t('lobby.unlocksAtFloor', { floor: locked.floor })}`, {
        fontFamily: BODY_FONT, fontSize: `${10 * S}px`, fontStyle: '700', color: '#8a7aa8',
        align: 'center', wordWrap: { width: lockMaxWidth },
      }).setOrigin(0.5);
      items.push(lockLabel);
      this.fitShopRowLabel(labelText, cx + 150 * S - lockLabel.width / 2, labelX);
      return items;
    }

    const buyBtn = this.createFittingPricePill(cx + 150 * S, cy, price, panelRight);
    buyBtn.on('pointerdown', onBuy);
    items.push(buyBtn);

    this.fitShopRowLabel(labelText, buyBtn.x - buyBtn.displayWidth / 2, labelX);

    return items;
  }

  // Long currency names (e.g. Italian's "Polvere di stelle") can make the
  // price pill wider than the shop panel itself, clipping its right edge.
  // Shrink the pill's font until it fits inside the panel before placing it.
  //
  // createPillButton's pill is a full capsule (corner radius = height / 2),
  // so paddingX needs to stay close to that radius or the text's corners
  // sit inside the curved cap instead of the straight run — it reads as
  // text crammed into the curve even though nothing is technically clipped
  // (this is what was bothering long strings like Spanish "POLVO ESTELAR").
  // paddingY is fixed, so keep paddingX fixed too instead of shrinking it
  // alongside the font — let the font shrink further on long strings
  // rather than tightening the one margin that keeps the pill readable.
  private createFittingPricePill(x: number, cy: number, price: string, maxRight: number): Phaser.GameObjects.Container {
    const maxWidth = (maxRight - x) * 2;
    const MIN_FONT = 10 * S;
    const ROOMY_PADDING_X = 14 * S;
    const TIGHT_PADDING_X = 9 * S;
    let fontSize = 14 * S;
    let paddingX = ROOMY_PADDING_X;
    let btn = createPillButton(this, x, cy, price, {
      fontSize: `${fontSize}px`, bgColor: 0xe8b64f, paddingX, paddingY: 7 * S,
    });
    // First pass: shrink the font only, keeping paddingX roomy enough that
    // text doesn't crowd into the capsule's rounded ends (paddingX needs to
    // stay close to the cap's radius — see note above).
    while (btn.displayWidth > maxWidth && fontSize > MIN_FONT) {
      fontSize -= 0.5 * S;
      btn.destroy(true);
      btn = createPillButton(this, x, cy, price, {
        fontSize: `${fontSize}px`, bgColor: 0xe8b64f, paddingX, paddingY: 7 * S,
      });
    }
    // Still wider than the shop panel even at the smallest readable font
    // (e.g. Spanish "POLVO ESTELAR") — staying within the panel's edge
    // matters more than the roomy padding, so fall back to tightening it.
    if (btn.displayWidth > maxWidth) {
      paddingX = TIGHT_PADDING_X;
      btn.destroy(true);
      btn = createPillButton(this, x, cy, price, {
        fontSize: `${fontSize}px`, bgColor: 0xe8b64f, paddingX, paddingY: 7 * S,
      });
    }
    return btn;
  }

  // Long translated labels (e.g. Spanish's "+3 movimientos en la próxima
  // partida") can run wider than the gap between the label's start and the
  // price pill, overlapping it. Shrink the font first; if it's still too
  // wide even at the readable floor, wrap it onto a second line instead of
  // shrinking further into illegibility — a two-line label beats a hidden one.
  private fitShopRowLabel(labelText: Phaser.GameObjects.Text, rightEdge: number, leftEdge: number): void {
    const maxWidth = rightEdge - leftEdge - 6 * S;
    if (maxWidth <= 0 || labelText.width <= maxWidth) return;
    const MIN_FONT = 10 * S;
    let fontSize = 14 * S;
    while (labelText.width > maxWidth && fontSize > MIN_FONT) {
      fontSize -= 0.5 * S;
      labelText.setFontSize(fontSize);
    }
    if (labelText.width > maxWidth) {
      labelText.setWordWrapWidth(maxWidth, true);
    }
  }

  private flashInsufficient(x: number, y: number): void {
    const txt = this.add.text(x, y, t('lobby.insufficientCurrency'), {
      fontFamily: BODY_FONT, fontSize: `${12 * S}px`, fontStyle: '700', color: '#ff9d9d',
      stroke: '#0a0618', strokeThickness: 3 * S,
    }).setOrigin(0.5).setDepth(51);
    this.tweens.add({
      targets: txt, alpha: 0, y: y - 20 * S, duration: 900, delay: 400,
      onComplete: () => txt.destroy(),
    });
  }

  private playAdForReward(): void {
    if (this.shopGroup) {
      this.shopGroup.destroy(true);
      this.shopGroup = undefined;
    }
    const cx = W / 2;
    const cy = H / 2;
    playMockAd(this, cx, cy, () => {
      addCurrency(200);
      this.refreshAll();
      this.spawnRewardPopup(cx, cy, '+200 🌟');
    });
  }

  private spawnRewardPopup(x: number, y: number, text: string, sound: () => void = playReward): void {
    sound();
    const txt = this.add.text(x, y, text, {
      fontFamily: TITLE_FONT, fontSize: `${22 * S}px`, color: '#e8b64f',
      stroke: '#150f26', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(61).setScale(0.5).setAlpha(0);
    this.tweens.add({
      targets: txt, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: txt, alpha: 0, y: y - 30 * S, duration: 500, delay: 500, onComplete: () => txt.destroy() });
      },
    });
  }

  private refreshAll(): void {
    this.currencyText?.setText(t('lobby.currency', { n: getCurrency() }));
    this.refreshBoostText();
    if (this.shopGroup) {
      this.shopGroup.destroy(true);
      this.shopGroup = undefined;
      this.buildShop();
    }
  }
}
