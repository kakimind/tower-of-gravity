import { ART_SIZE } from '../config/GameConfig';
import { frame, SpecialTheme } from './specialArt';

// "Finisher" items: like lineRow/lineCol/crossBomb/colorBomb, these are
// bought in the lobby shop and sit in the player's item bag until used
// on demand mid-stage, targeted at a tile — but a finisher detonates a
// board-wide burst immediately instead of placing a special candy.
// See GameScene.beginUseNukeItem / NUKE_EFFECTS.
export type NukeType = 'bomb' | 'blackHole' | 'lightning' | 'meteor';

export const NUKE_THEMES: Record<NukeType, SpecialTheme> = {
  bomb: { glow: '#ff7a3d', light: '#ffd9b8', dark: '#9a3a0a' },
  blackHole: { glow: '#9b6bff', light: '#2b1a4a', dark: '#0a0618' },
  lightning: { glow: '#f4ff6a', light: '#ffffe0', dark: '#8a8a10' },
  meteor: { glow: '#ff5d7a', light: '#ffd0da', dark: '#8a1030' },
};

function buildBomb(): string {
  const c = ART_SIZE / 2;
  const theme = NUKE_THEMES.bomb;
  const id = 'nbomb';
  const body = `
    <circle cx="${c}" cy="${c + 4}" r="20" fill="#241a3f" stroke="${theme.glow}" stroke-width="2.5" />
    <circle cx="${c - 6}" cy="${c - 2}" r="6" fill="${theme.light}" opacity="0.4" />
    <path d="M ${c + 6} ${c - 16} q 10 -4 8 -14" fill="none" stroke="${theme.dark}" stroke-width="3" stroke-linecap="round" />
    <circle cx="${c + 15}" cy="${c - 31}" r="5" fill="${theme.glow}" />
    <circle cx="${c + 15}" cy="${c - 31}" r="9" fill="none" stroke="${theme.light}" stroke-width="1.5" opacity="0.7" />
  `;
  return frame(id, theme, body);
}

function buildBlackHole(): string {
  const c = ART_SIZE / 2;
  const theme = NUKE_THEMES.blackHole;
  const id = 'nhole';
  let rings = '';
  for (let i = 0; i < 3; i++) {
    const rr = 30 - i * 8;
    rings += `<ellipse cx="${c}" cy="${c}" rx="${rr}" ry="${rr * 0.4}" fill="none" stroke="${theme.glow}" stroke-width="2" opacity="${0.75 - i * 0.2}" transform="rotate(${i * 25} ${c} ${c})" />`;
  }
  const body = `
    ${rings}
    <circle cx="${c}" cy="${c}" r="11" fill="#000000" />
    <circle cx="${c}" cy="${c}" r="11" fill="none" stroke="${theme.glow}" stroke-width="2" />
  `;
  return frame(id, theme, body);
}

function buildLightning(): string {
  const c = ART_SIZE / 2;
  const theme = NUKE_THEMES.lightning;
  const id = 'nbolt';
  const bolt = `M ${c + 6} ${c - 34} L ${c - 14} ${c + 2} L ${c} ${c + 2} L ${c - 8} ${c + 34} L ${c + 16} ${c - 6} L ${c + 2} ${c - 6} Z`;
  const body = `
    <path d="${bolt}" fill="${theme.glow}" stroke="${theme.dark}" stroke-width="2" stroke-linejoin="round" />
    <path d="${bolt}" fill="${theme.light}" opacity="0.5" transform="scale(0.6) translate(${c * 0.67} ${c * 0.67})" />
  `;
  return frame(id, theme, body);
}

function buildMeteor(): string {
  const c = ART_SIZE / 2;
  const theme = NUKE_THEMES.meteor;
  const id = 'nmeteor';
  const body = `
    <path d="M ${c - 30} ${c - 30} L ${c - 2} ${c - 2}" stroke="${theme.light}" stroke-width="3" opacity="0.6" stroke-linecap="round" />
    <path d="M ${c - 24} ${c - 16} L ${c - 4} ${c - 4}" stroke="${theme.light}" stroke-width="2" opacity="0.4" stroke-linecap="round" />
    <circle cx="${c + 4}" cy="${c + 4}" r="15" fill="${theme.dark}" stroke="${theme.glow}" stroke-width="2.5" />
    <circle cx="${c}" cy="${c}" r="3.5" fill="${theme.light}" opacity="0.7" />
    <circle cx="${c + 10}" cy="${c + 10}" r="2.5" fill="${theme.light}" opacity="0.5" />
  `;
  return frame(id, theme, body);
}

export function buildNukeSvg(type: NukeType): string {
  if (type === 'bomb') return buildBomb();
  if (type === 'blackHole') return buildBlackHole();
  if (type === 'lightning') return buildLightning();
  return buildMeteor();
}

export function nukeTextureKey(type: NukeType): string {
  return `nuke-${type}`;
}
