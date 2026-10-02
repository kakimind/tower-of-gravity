import Phaser from 'phaser';
import { GRID_SIZE, TILE, UI_SCALE, ART_SIZE } from '../config/GameConfig';
import { TOTAL_STAGES } from '../engine/StageConfig';
import {
  getCurrentStage, getUnlockedStage, getCurrency, addCurrency,
  trySpendCurrency, getBoosts, addBonusMovesBoost, addSpecialBoost,
  getHearts, addHearts, getMsUntilNextHeart, HEART_MAX,
} from '../engine/Progress';
import { buildSpecialSvg, specialTextureKey, SpecialArtType } from '../art/specialArt';
import { svgToDataUri } from '../art/candyArt';
import { createPillButton } from '../ui/PillButton';
import { drawPanel } from '../ui/Panel';
import { setCurrentSceneKey } from '../ui/settingsPanel';
import { playReward } from '../audio/sfx';
import { t } from '../i18n';

interface SpecialShopItem {
  type: SpecialArtType;
  labelKey: 'item.lineRow' | 'item.lineCol' | 'item.crossBomb' | 'item.colorBomb';
  price: number;
}

const SPECIAL_SHOP_ITEMS: SpecialShopItem[] = [
  { type: 'lineRow', labelKey: 'item.lineRow', price: 35 },
  { type: 'lineCol', labelKey: 'item.lineCol', price: 35 },
  { type: 'crossBomb', labelKey: 'item.crossBomb', price: 65 },
  { type: 'colorBomb', labelKey: 'item.colorBomb', price: 110 },
];

const SPECIAL_LABEL_KEYS: Record<SpecialArtType, 'item.lineRow' | 'item.lineCol' | 'item.crossBomb' | 'item.colorBomb'> = {
  lineRow: 'item.lineRow', lineCol: 'item.lineCol', crossBomb: 'item.crossBomb', colorBomb: 'item.colorBomb',
};

const W = GRID_SIZE * TILE;
const H = GRID_SIZE * TILE;
const S = UI_SCALE;

export class LobbyScene extends Phaser.Scene {
  private currencyText?: Phaser.GameObjects.Text;
  private boostText?: Phaser.GameObjects.Text;
  private heartsText?: Phaser.GameObjects.Text;
  private shopGroup?: Phaser.GameObjects.Container;

  constructor() {
    super('LobbyScene');
  }

  preload(): void {
    SPECIAL_SHOP_ITEMS.forEach((item) => {
      if (this.textures.exists(specialTextureKey(item.type))) return;
      const svg = buildSpecialSvg(item.type);
      this.load.svg(specialTextureKey(item.type), svgToDataUri(svg), { width: ART_SIZE, height: ART_SIZE });
    });
  }

  create(): void {
    setCurrentSceneKey('LobbyScene');
    document.querySelector('.hud')?.setAttribute('style', 'display:none');
    document.querySelector('.footer-hint')?.setAttribute('style', 'display:none');

    this.cameras.main.setBackgroundColor('#1a1330');

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2c1f4a, 0x2c1f4a, 0x0f0a1c, 0x0f0a1c, 1);
    bg.fillRect(0, 0, W, H);

    this.drawStars();
    this.drawTower();

    const stage = getCurrentStage();
    const unlocked = getUnlockedStage();
    const floor = Math.ceil(stage / 10);

    this.add.text(W / 2, 26 * S, t('lobby.floorStage', { floor, stage, total: TOTAL_STAGES }), {
      fontFamily: 'Cormorant Garamond, serif', fontSize: `${13 * S}px`, fontStyle: '700', color: '#e4dcf5',
      stroke: '#0a0618', strokeThickness: 3 * S,
    }).setOrigin(0.5);

    const pill = this.add.graphics();
    pill.fillStyle(0x150f26, 0.85);
    pill.lineStyle(2 * S, 0xe8b64f, 0.9);
    pill.fillRoundedRect(W / 2 - 70 * S, 44 * S, 140 * S, 32 * S, 16 * S);
    pill.strokeRoundedRect(W / 2 - 70 * S, 44 * S, 140 * S, 32 * S, 16 * S);
    this.currencyText = this.add.text(W / 2, 60 * S, t('lobby.currency', { n: getCurrency() }), {
      fontFamily: 'Cinzel Decorative, serif', fontSize: `${16 * S}px`, color: '#fff3c4',
      stroke: '#0a0618', strokeThickness: 5,
    }).setOrigin(0.5);

    this.heartsText = this.add.text(W / 2, 90 * S, '', {
      fontFamily: 'Cormorant Garamond, serif', fontSize: `${13 * S}px`, fontStyle: '700', color: '#ffb3c0', align: 'center',
      stroke: '#0a0618', strokeThickness: 3 * S,
    }).setOrigin(0.5);
    this.refreshHearts();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.refreshHearts() });

    this.boostText = this.add.text(W / 2, 110 * S, '', {
      fontFamily: 'Cormorant Garamond, serif', fontSize: `${12 * S}px`, fontStyle: '700', color: '#9df0ac', align: 'center',
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
      fontFamily: 'Cinzel Decorative, serif', fontSize: `${15 * S}px`, textColor: '#f3e6c8',
      bgColor: 0x3a2a5c, strokeColor: 0x7a5bb5, strokeAlpha: 1, strokeWidth: 2 * S,
      paddingX: 20 * S, paddingY: 9 * S, minWidth: ctaWidth, depth: 5,
    });
    shopBtn.on('pointerdown', () => this.toggleShop());

    void unlocked;
  }

  private drawStars(): void {
    const g = this.add.graphics();
    const positions: [number, number, number][] = [
      [30 * S, 100 * S, 1.5 * S], [60 * S, 200 * S, S], [W - 40 * S, 90 * S, 1.3 * S], [W - 30 * S, 220 * S, S],
      [24 * S, 320 * S, 1.2 * S], [W - 24 * S, 340 * S, 1.4 * S], [40 * S, 420 * S, S], [W - 50 * S, 440 * S, 1.2 * S],
    ];
    positions.forEach(([x, y, r]) => {
      const star = this.add.circle(x, y, r, 0xffffff, 0.8);
      this.tweens.add({
        targets: star, alpha: 0.2, yoyo: true, repeat: -1, duration: 900 + Math.random() * 900,
        delay: Math.random() * 800,
      });
    });
    void g;
  }

  private drawTower(): void {
    const cx = W / 2;
    const baseY = 322 * S;

    // slim, constant-width spire body (not a flared trapezoid) topped by a
    // conical roof that flares out wider than the body — matches the
    // Arcane Spire mockup silhouette instead of the old wide citadel.
    const bodyW = 50 * S;
    const bodyH = 136 * S;
    const brimY = baseY - bodyH;
    const roofHalfW = 31 * S;
    const roofH = 40 * S;
    const apexY = brimY - roofH;
    const turretOffset = 62 * S;
    const turretW = 22 * S;
    const turretH = 82 * S;

    const moonG = this.add.graphics();
    moonG.fillStyle(0xfff3cf, 0.9);
    moonG.fillCircle(cx + 78 * S, apexY + 16 * S, 16 * S);
    moonG.fillStyle(0x1a1330, 1);
    moonG.fillCircle(cx + 85 * S, apexY + 11 * S, 16 * S);
    this.tweens.add({
      targets: moonG, alpha: 0.75, yoyo: true, repeat: -1, duration: 2200, ease: 'Sine.easeInOut',
    });

    const aura = this.add.circle(cx, (brimY + apexY) / 2, 110 * S, 0x9b6bff, 0.16);
    this.tweens.add({
      targets: aura, alpha: 0.26, scale: 1.08, yoyo: true, repeat: -1, duration: 1600, ease: 'Sine.easeInOut',
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
    let text = icons;
    if (hearts < HEART_MAX) {
      const ms = getMsUntilNextHeart();
      const mm = Math.floor(ms / 60000);
      const ss = Math.floor((ms % 60000) / 1000);
      text += t('lobby.nextHeart', { mm, ss: String(ss).padStart(2, '0') });
    }
    this.heartsText?.setText(text);
  }

  private confirmAd(message: string, onConfirm: () => void): void {
    const cx = W / 2;
    const cy = H / 2;
    const overlay = this.add.rectangle(cx, cy, W, H, 0x0a0618, 0.75).setDepth(58).setInteractive();
    const panel = drawPanel(this, cx, cy, W - 80 * S, 150 * S, { radius: 16 * S, strokeWidth: 2 * S, depth: 59 });
    const text = this.add.text(cx, cy - 30 * S, message, {
      fontFamily: 'Cormorant Garamond, serif', fontSize: `${15 * S}px`, fontStyle: '700', color: '#f3e6c8', align: 'center',
      stroke: '#0a0618', strokeThickness: 3 * S,
      wordWrap: { width: W - 120 * S },
    }).setOrigin(0.5).setDepth(59);

    const yesBtn = createPillButton(this, cx - 55 * S, cy + 40 * S, t('common.watch'), {
      fontSize: `${14 * S}px`, bgColor: 0xe8b64f, paddingX: 16 * S, paddingY: 8 * S, depth: 59,
    });
    const noBtn = createPillButton(this, cx + 55 * S, cy + 40 * S, t('common.cancel'), {
      fontFamily: 'Cormorant Garamond, serif', fontSize: `${13 * S}px`, textColor: '#f3e6c8',
      bgColor: 0x3a2a5c, paddingX: 16 * S, paddingY: 8 * S, depth: 59,
    });

    const group = this.add.container(0, 0, [overlay, panel, text, yesBtn, noBtn]).setDepth(58);
    yesBtn.on('pointerdown', () => { group.destroy(true); onConfirm(); });
    noBtn.on('pointerdown', () => group.destroy(true));
  }

  private playAdForHeart(): void {
    const cx = W / 2;
    const cy = H / 2;
    const overlay = this.add.rectangle(cx, cy, W, H, 0x000000, 0.9).setDepth(60);
    const label = this.add.text(cx, cy, t('ad.playing'), {
      fontFamily: 'Cinzel Decorative, serif', fontSize: `${18 * S}px`, color: '#ffffff',
    }).setOrigin(0.5).setDepth(61);
    let remaining = 3;
    const countdown = this.add.text(cx, cy + 40 * S, `${remaining}`, {
      fontFamily: 'Cinzel Decorative, serif', fontSize: `${24 * S}px`, color: '#e8b64f',
    }).setOrigin(0.5).setDepth(61);

    this.time.addEvent({
      delay: 700,
      repeat: 2,
      callback: () => {
        remaining -= 1;
        countdown.setText(String(Math.max(0, remaining)));
        if (remaining <= 0) {
          overlay.destroy();
          label.destroy();
          countdown.destroy();
          addHearts(1);
          this.refreshHearts();
          this.spawnRewardPopup(cx, cy, '+1 ❤️');
        }
      },
    });
  }

  private refreshBoostText(): void {
    const boosts = getBoosts();
    const parts: string[] = [];
    if (boosts.bonusMovesOwned > 0) parts.push(t('lobby.boostBonusMoves', { n: boosts.bonusMovesOwned }));
    (Object.keys(SPECIAL_LABEL_KEYS) as SpecialArtType[]).forEach((type) => {
      const count = boosts.specialOwned[type];
      if (count > 0) parts.push(`${t(SPECIAL_LABEL_KEYS[type])} x${count}`);
    });
    this.boostText?.setText(parts.length ? t('lobby.boostOwned', { items: parts.join(' · ') }) : '');
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
      fontFamily: 'Cinzel Decorative, serif', fontSize: `${18 * S}px`, color: '#e8b64f',
      stroke: '#0a0618', strokeThickness: 4 * S,
    }).setOrigin(0.5);
    children.push(title);

    const rowGap = 36 * S;
    let rowY = cy - 122 * S;

    const rowMoves = this.buildShopRow(cx, rowY, t('lobby.shopMovesLabel'), t('lobby.priceStardust', { n: 40 }), () => {
      if (trySpendCurrency(40)) {
        addBonusMovesBoost();
        this.refreshAll();
      } else {
        this.flashInsufficient(cx, rowY + 18 * S);
      }
    });
    children.push(...rowMoves);
    rowY += rowGap;

    SPECIAL_SHOP_ITEMS.forEach((item) => {
      const thisRowY = rowY;
      const icon = this.add.image(cx - 164 * S, thisRowY, specialTextureKey(item.type));
      icon.setDisplaySize(22 * S, 22 * S);
      children.push(icon);

      const row = this.buildShopRow(cx, thisRowY, t(item.labelKey), t('lobby.priceStardust', { n: item.price }), () => {
        if (trySpendCurrency(item.price)) {
          addSpecialBoost(item.type);
          this.refreshAll();
        } else {
          this.flashInsufficient(cx, thisRowY + 18 * S);
        }
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
      fontFamily: 'Cormorant Garamond, serif', fontSize: `${14 * S}px`, textColor: '#f3e6c8',
      bgColor: 0x3a2a5c, paddingX: 16 * S, paddingY: 6 * S,
    });
    closeBtn.on('pointerdown', () => this.toggleShop());
    children.push(closeBtn);

    this.shopGroup = this.add.container(0, 0, children).setDepth(50);
  }

  private buildShopRow(cx: number, cy: number, label: string, price: string, onBuy: () => void): Phaser.GameObjects.GameObject[] {
    const labelText = this.add.text(cx - 150 * S, cy, label, {
      fontFamily: 'Cormorant Garamond, serif', fontSize: `${14 * S}px`, fontStyle: '700', color: '#f3e6c8',
      stroke: '#0a0618', strokeThickness: 3 * S,
    }).setOrigin(0, 0.5);
    const buyBtn = createPillButton(this, cx + 150 * S, cy, price, {
      fontSize: `${14 * S}px`, bgColor: 0xe8b64f, paddingX: 12 * S, paddingY: 7 * S,
    });
    buyBtn.on('pointerdown', onBuy);
    return [labelText, buyBtn];
  }

  private flashInsufficient(x: number, y: number): void {
    const txt = this.add.text(x, y, t('lobby.insufficientCurrency'), {
      fontFamily: 'Cormorant Garamond, serif', fontSize: `${12 * S}px`, fontStyle: '700', color: '#ff9d9d',
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
    const overlay = this.add.rectangle(cx, cy, W, H, 0x000000, 0.9).setDepth(60);
    const label = this.add.text(cx, cy, t('ad.playing'), {
      fontFamily: 'Cinzel Decorative, serif', fontSize: `${18 * S}px`, color: '#ffffff',
    }).setOrigin(0.5).setDepth(61);

    let remaining = 3;
    const countdown = this.add.text(cx, cy + 40 * S, `${remaining}`, {
      fontFamily: 'Cinzel Decorative, serif', fontSize: `${24 * S}px`, color: '#e8b64f',
    }).setOrigin(0.5).setDepth(61);

    const tick = this.time.addEvent({
      delay: 700,
      repeat: 2,
      callback: () => {
        remaining -= 1;
        countdown.setText(String(Math.max(0, remaining)));
        if (remaining <= 0) {
          tick.remove(false);
          overlay.destroy();
          label.destroy();
          countdown.destroy();
          addCurrency(30);
          this.refreshAll();
          this.spawnRewardPopup(cx, cy, '+30 🌟');
        }
      },
    });
  }

  private spawnRewardPopup(x: number, y: number, text: string): void {
    playReward();
    const txt = this.add.text(x, y, text, {
      fontFamily: 'Cinzel Decorative, serif', fontSize: `${22 * S}px`, color: '#e8b64f',
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
