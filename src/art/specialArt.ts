import { ART_SIZE } from '../config/GameConfig';

export type SpecialArtType = 'lineRow' | 'lineCol' | 'crossBomb' | 'colorBomb';

interface SpecialTheme {
  glow: string;
  light: string;
  dark: string;
}

const THEMES: Record<SpecialArtType, SpecialTheme> = {
  lineRow: { glow: '#ffd76a', light: '#fff3cf', dark: '#a87310' },
  lineCol: { glow: '#7fd8ff', light: '#dff5ff', dark: '#106a94' },
  crossBomb: { glow: '#7effa0', light: '#dcffe6', dark: '#1a8a4a' },
  colorBomb: { glow: '#ff6bd6', light: '#ffd6f4', dark: '#9a1c7a' },
};

function hexOutline(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(cx + Math.cos(angle) * r).toFixed(2)},${(cy + Math.sin(angle) * r).toFixed(2)}`);
  }
  return pts.join(' ');
}

function frame(id: string, theme: SpecialTheme, body: string, beforeTile = ''): string {
  const c = ART_SIZE / 2;
  const r = ART_SIZE * 0.46;
  const hex = hexOutline(c, c, r * 0.92);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${ART_SIZE}" height="${ART_SIZE}" viewBox="0 0 ${ART_SIZE} ${ART_SIZE}">
      <defs>
        <radialGradient id="glow-${id}" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stop-color="${theme.glow}" stop-opacity="0.85" />
          <stop offset="70%" stop-color="${theme.glow}" stop-opacity="0.2" />
          <stop offset="100%" stop-color="${theme.glow}" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="tile-${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3a2a5c" />
          <stop offset="55%" stop-color="#241a3f" />
          <stop offset="100%" stop-color="#180f2c" />
        </linearGradient>
        <linearGradient id="beam-${id}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${theme.glow}" stop-opacity="0" />
          <stop offset="12%" stop-color="${theme.light}" stop-opacity="1" />
          <stop offset="50%" stop-color="${theme.light}" stop-opacity="1" />
          <stop offset="88%" stop-color="${theme.light}" stop-opacity="1" />
          <stop offset="100%" stop-color="${theme.glow}" stop-opacity="0" />
        </linearGradient>
      </defs>
      <circle cx="${c}" cy="${c}" r="${r}" fill="url(#glow-${id})" />
      ${beforeTile}
      <polygon points="${hex}" fill="url(#tile-${id})" stroke="${theme.glow}" stroke-width="3" stroke-linejoin="round" />
      <polygon points="${hex}" fill="none" stroke="${theme.light}" stroke-width="1" stroke-opacity="0.35" />
      ${body}
    </svg>
  `.trim();
}

function buildLineRow(): string {
  const c = ART_SIZE / 2;
  const theme = THEMES.lineRow;
  const id = 'row';
  const beforeTile = `
    <rect x="0" y="${c - 5}" width="${ART_SIZE}" height="10" fill="url(#beam-${id})" opacity="0.9" />
  `;
  const body = `
    <rect x="${c - 26}" y="${c - 3.5}" width="52" height="7" rx="3.5" fill="url(#beam-${id})" />
    <polygon points="${c - 30},${c} ${c - 20},${c - 7} ${c - 20},${c + 7}" fill="${theme.light}" />
    <polygon points="${c + 30},${c} ${c + 20},${c - 7} ${c + 20},${c + 7}" fill="${theme.light}" />
    <circle cx="${ART_SIZE - 3}" cy="${c}" r="2.5" fill="${theme.light}" />
    <circle cx="3" cy="${c}" r="2.5" fill="${theme.light}" />
  `;
  return frame(id, theme, body, beforeTile);
}

function buildLineCol(): string {
  const c = ART_SIZE / 2;
  const theme = THEMES.lineCol;
  const id = 'col';
  const beforeTile = `
    <rect x="${c - 5}" y="0" width="10" height="${ART_SIZE}" fill="url(#beam-${id})" opacity="0.9" transform="rotate(90 ${c} ${c})" />
  `;
  const body = `
    <g transform="rotate(90 ${c} ${c})">
      <rect x="${c - 26}" y="${c - 3.5}" width="52" height="7" rx="3.5" fill="url(#beam-${id})" />
      <polygon points="${c - 30},${c} ${c - 20},${c - 7} ${c - 20},${c + 7}" fill="${theme.light}" />
      <polygon points="${c + 30},${c} ${c + 20},${c - 7} ${c + 20},${c + 7}" fill="${theme.light}" />
    </g>
    <circle cx="${c}" cy="${ART_SIZE - 3}" r="2.5" fill="${theme.light}" />
    <circle cx="${c}" cy="3" r="2.5" fill="${theme.light}" />
  `;
  return frame(id, theme, body, beforeTile);
}

function buildCrossBomb(): string {
  const c = ART_SIZE / 2;
  const theme = THEMES.crossBomb;
  const id = 'cross';
  const beforeTile = `
    <rect x="0" y="${c - 5}" width="${ART_SIZE}" height="10" fill="url(#beam-${id})" opacity="0.85" />
    <rect x="${c - 5}" y="0" width="10" height="${ART_SIZE}" fill="url(#beam-${id})" opacity="0.85" />
  `;
  const arm = (rot: number) => `
    <g transform="rotate(${rot} ${c} ${c})">
      <rect x="${c - 3.5}" y="${c - 26}" width="7" height="20" rx="3.5" fill="${theme.light}" />
      <polygon points="${c - 7},${c - 22} ${c},${c - 32} ${c + 7},${c - 22}" fill="${theme.light}" />
    </g>
  `;
  const body = `
    ${arm(0)}${arm(90)}${arm(180)}${arm(270)}
    <circle cx="${c}" cy="${c}" r="7" fill="#ffffff" />
    <circle cx="${c}" cy="${c}" r="7" fill="none" stroke="${theme.glow}" stroke-width="2" />
  `;
  return frame(id, theme, body, beforeTile);
}

function buildColorBomb(): string {
  const c = ART_SIZE / 2;
  const theme = THEMES.colorBomb;
  const id = 'bomb';
  const orbitColors = ['#ff4d5e', '#4fd06a', '#3fa9ff', '#ffd93c', '#c15fff'];
  let orbits = '';
  orbitColors.forEach((color, i) => {
    const angle = (Math.PI * 2 * i) / orbitColors.length;
    const rr = 17;
    const ox = c + Math.cos(angle) * rr;
    const oy = c + Math.sin(angle) * rr;
    orbits += `<circle cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="3.4" fill="${color}" stroke="#180f2c" stroke-width="0.8" />`;
  });
  let swirl = '';
  for (let i = 0; i < 3; i++) {
    const rr = 20 - i * 5;
    swirl += `<circle cx="${c}" cy="${c}" r="${rr}" fill="none" stroke="${theme.light}" stroke-width="1.4" stroke-dasharray="4 5" opacity="${0.7 - i * 0.15}" />`;
  }
  const body = `
    ${swirl}
    ${orbits}
    <circle cx="${c}" cy="${c}" r="8" fill="#ffffff" />
    <circle cx="${c}" cy="${c}" r="8" fill="none" stroke="${theme.glow}" stroke-width="2.2" />
  `;
  return frame(id, theme, body);
}

export function buildSpecialSvg(type: SpecialArtType): string {
  if (type === 'lineRow') return buildLineRow();
  if (type === 'lineCol') return buildLineCol();
  if (type === 'crossBomb') return buildCrossBomb();
  return buildColorBomb();
}

export function specialTextureKey(type: SpecialArtType): string {
  return `special-${type}`;
}
