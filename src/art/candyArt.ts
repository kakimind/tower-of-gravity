import { ART_SIZE } from '../config/GameConfig';

export interface CandyPalette {
  base: string;
  light: string;
  dark: string;
}

export const CANDY_PALETTES: CandyPalette[] = [
  { base: '#ff4d5e', light: '#ffd1d6', dark: '#b3122a' }, // red — scalloped disc
  { base: '#ff9f40', light: '#ffe0b3', dark: '#c4650a' }, // orange — wrapped bonbon
  { base: '#ffd93c', light: '#fff5c2', dark: '#c99500' }, // yellow — teardrop
  { base: '#4fd06a', light: '#c9f7d3', dark: '#0f8f3c' }, // green — gem
  { base: '#3fa9ff', light: '#c2e6ff', dark: '#0b5fb8' }, // blue — swirl lollipop
  { base: '#c15fff', light: '#ecccff', dark: '#7a1fc9' }, // purple — star
  { base: '#2ad6c9', light: '#c2fbf5', dark: '#0c8d82' }, // teal — heart
  { base: '#ff6fae', light: '#ffd6ea', dark: '#c21f6b' }, // pink — clover
  { base: '#6c7bff', light: '#d8dcff', dark: '#3a3fc9' }, // indigo — diamond
  { base: '#ffffff', light: '#ffffff', dark: '#b8c2cc' }, // silver/white — donut
];

function defs(id: string, p: CandyPalette): string {
  return `
    <radialGradient id="body-${id}" cx="38%" cy="32%" r="80%">
      <stop offset="0%" stop-color="${p.light}" />
      <stop offset="45%" stop-color="${p.base}" />
      <stop offset="100%" stop-color="${p.dark}" />
    </radialGradient>
    <filter id="shadow-${id}" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="3" stdDeviation="2.2" flood-color="#2b1030" flood-opacity="0.35" />
    </filter>
  `;
}

function shine(c: number, r: number): string {
  return `
    <ellipse cx="${c - r * 0.32}" cy="${c - r * 0.36}" rx="${r * 0.28}" ry="${r * 0.18}"
             fill="#ffffff" opacity="0.85" transform="rotate(-24 ${c - r * 0.32} ${c - r * 0.36})" />
    <circle cx="${c + r * 0.28}" cy="${c + r * 0.3}" r="${r * 0.08}" fill="#ffffff" opacity="0.5" />
  `;
}

function scallopedPath(cx: number, cy: number, rOuter: number, rInner: number, lobes: number): string {
  const pts: string[] = [];
  const total = lobes * 2;
  for (let i = 0; i <= total; i++) {
    const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return pts.join(' ') + ' Z';
}

// 0: scalloped jelly disc
function shapeDisc(id: string, p: CandyPalette): string {
  const c = ART_SIZE / 2;
  const rOuter = ART_SIZE * 0.42;
  const rInner = ART_SIZE * 0.36;
  const scallop = scallopedPath(c, c, rOuter, rInner, 8);
  return `
    <g filter="url(#shadow-${id})">
      <path d="${scallop}" fill="url(#body-${id})" stroke="${p.dark}" stroke-width="2.5" stroke-linejoin="round" />
      <circle cx="${c}" cy="${c}" r="${rInner * 0.78}" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.28" />
      ${shine(c, rOuter)}
    </g>
  `;
}

// 1: potion flask (round body, narrow neck, cork)
function shapePotion(id: string, p: CandyPalette): string {
  const c = ART_SIZE / 2;
  const bodyR = ART_SIZE * 0.33;
  const bodyCy = c + ART_SIZE * 0.1;
  const neckW = ART_SIZE * 0.16;
  const neckTop = c - ART_SIZE * 0.4;
  const neckBottom = bodyCy - bodyR * 0.55;
  const corkW = neckW + 6;
  const corkH = ART_SIZE * 0.09;
  return `
    <g filter="url(#shadow-${id})">
      <rect x="${c - neckW / 2}" y="${neckTop + corkH}" width="${neckW}" height="${neckBottom - neckTop}"
            fill="url(#body-${id})" stroke="${p.dark}" stroke-width="2.5" />
      <rect x="${c - corkW / 2}" y="${neckTop}" width="${corkW}" height="${corkH}" rx="3"
            fill="${p.dark}" stroke="${p.dark}" stroke-width="1.5" />
      <circle cx="${c}" cy="${bodyCy}" r="${bodyR}" fill="url(#body-${id})" stroke="${p.dark}" stroke-width="2.5" />
      <path d="M ${c - bodyR * 0.85} ${bodyCy + bodyR * 0.1} A ${bodyR * 0.85} ${bodyR * 0.6} 0 0 0 ${c + bodyR * 0.85} ${bodyCy + bodyR * 0.1} Z"
            fill="${p.light}" opacity="0.4" />
      ${shine(c, bodyR)}
    </g>
  `;
}

// 2: teardrop with spiral stripe
function shapeTeardrop(id: string, p: CandyPalette): string {
  const c = ART_SIZE / 2;
  const r = ART_SIZE * 0.38;
  const path = `M ${c} ${c - r * 1.15}
    C ${c + r * 1.05} ${c - r * 0.15}, ${c + r * 0.72} ${c + r * 0.95}, ${c} ${c + r * 0.95}
    C ${c - r * 0.72} ${c + r * 0.95}, ${c - r * 1.05} ${c - r * 0.15}, ${c} ${c - r * 1.15}
    Z`;
  let stripe = '';
  for (let i = 0; i < 3; i++) {
    const rr = r * (0.85 - i * 0.24);
    stripe += `<path d="M ${c - rr} ${c + r * 0.15} A ${rr} ${rr} 0 0 1 ${c + rr} ${c + r * 0.15}" stroke="${p.light}" stroke-width="3" fill="none" opacity="${0.7 - i * 0.15}" />`;
  }
  return `
    <g filter="url(#shadow-${id})">
      <path d="${path}" fill="url(#body-${id})" stroke="${p.dark}" stroke-width="2.5" stroke-linejoin="round" />
      ${stripe}
      ${shine(c, r)}
    </g>
  `;
}

// 3: faceted gem
function shapeGem(id: string, p: CandyPalette): string {
  const c = ART_SIZE / 2;
  const r = ART_SIZE * 0.4;
  const top = c - r;
  const bot = c + r * 0.7;
  const midY = c - r * 0.25;
  const pts = `${c},${top} ${c + r * 0.85},${midY} ${c + r * 0.55},${bot} ${c - r * 0.55},${bot} ${c - r * 0.85},${midY}`;
  const facets = `
    <polyline points="${c - r * 0.85},${midY} ${c},${midY - r * 0.1} ${c + r * 0.85},${midY}" stroke="${p.light}" stroke-width="2" fill="none" opacity="0.6" />
    <line x1="${c}" y1="${midY - r * 0.1}" x2="${c}" y2="${bot}" stroke="${p.light}" stroke-width="2" opacity="0.5" />
    <line x1="${c}" y1="${midY - r * 0.1}" x2="${c - r * 0.55}" y2="${bot}" stroke="${p.dark}" stroke-width="1.5" opacity="0.4" />
    <line x1="${c}" y1="${midY - r * 0.1}" x2="${c + r * 0.55}" y2="${bot}" stroke="${p.dark}" stroke-width="1.5" opacity="0.4" />
  `;
  return `
    <g filter="url(#shadow-${id})">
      <polygon points="${pts}" fill="url(#body-${id})" stroke="${p.dark}" stroke-width="2.5" stroke-linejoin="round" />
      ${facets}
      <ellipse cx="${c - r * 0.22}" cy="${midY}" rx="${r * 0.22}" ry="${r * 0.14}" fill="#ffffff" opacity="0.8" />
    </g>
  `;
}

// 4: swirl lollipop
function shapeSwirl(id: string, p: CandyPalette): string {
  const c = ART_SIZE / 2;
  const r = ART_SIZE * 0.4;
  let spiral = '';
  for (let i = 0; i < 3; i++) {
    const rr = r * (0.86 - i * 0.24);
    spiral += `<circle cx="${c}" cy="${c}" r="${rr}" fill="none" stroke="${p.light}" stroke-width="3.5" opacity="${0.85 - i * 0.15}" />`;
  }
  return `
    <g filter="url(#shadow-${id})">
      <circle cx="${c}" cy="${c}" r="${r}" fill="url(#body-${id})" stroke="${p.dark}" stroke-width="2.5" />
      ${spiral}
      ${shine(c, r)}
    </g>
  `;
}

// 5: rounded 5-point star
function shapeStar(id: string, p: CandyPalette): string {
  const c = ART_SIZE / 2;
  const rOuter = ART_SIZE * 0.42;
  const rInner = rOuter * 0.46;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    pts.push(`${(c + Math.cos(angle) * r).toFixed(2)},${(c + Math.sin(angle) * r).toFixed(2)}`);
  }
  return `
    <g filter="url(#shadow-${id})">
      <polygon points="${pts.join(' ')}" fill="url(#body-${id})" stroke="${p.dark}" stroke-width="2.5" stroke-linejoin="round" />
      ${shine(c, rOuter)}
    </g>
  `;
}

// 6: heart
function shapeHeart(id: string, p: CandyPalette): string {
  const c = ART_SIZE / 2;
  const r = ART_SIZE * 0.3;
  const path = `M ${c} ${c + r * 1.05}
    C ${c - r * 1.6} ${c - r * 0.25}, ${c - r * 0.7} ${c - r * 1.5}, ${c} ${c - r * 0.55}
    C ${c + r * 0.7} ${c - r * 1.5}, ${c + r * 1.6} ${c - r * 0.25}, ${c} ${c + r * 1.05}
    Z`;
  return `
    <g filter="url(#shadow-${id})">
      <path d="${path}" fill="url(#body-${id})" stroke="${p.dark}" stroke-width="2.5" stroke-linejoin="round" />
      ${shine(c, r)}
    </g>
  `;
}

// 7: four-leaf clover
function shapeClover(id: string, p: CandyPalette): string {
  const c = ART_SIZE / 2;
  const lobeR = ART_SIZE * 0.24;
  const offset = lobeR * 0.92;
  const centers = [
    { x: c - offset, y: c - offset },
    { x: c + offset, y: c - offset },
    { x: c - offset, y: c + offset },
    { x: c + offset, y: c + offset },
  ];
  const lobes = centers
    .map((p0) => `<circle cx="${p0.x}" cy="${p0.y}" r="${lobeR}" />`)
    .join('');
  return `
    <g filter="url(#shadow-${id})">
      <g fill="url(#body-${id})" stroke="${p.dark}" stroke-width="2.5">
        ${lobes}
      </g>
      <rect x="${c - ART_SIZE * 0.045}" y="${c}" width="${ART_SIZE * 0.09}" height="${ART_SIZE * 0.4}"
            rx="${ART_SIZE * 0.045}" fill="${p.dark}" opacity="0.8" />
      ${shine(c, lobeR * 1.6)}
    </g>
  `;
}

// 8: diamond (rotated square with facet lines)
function shapeDiamond(id: string, p: CandyPalette): string {
  const c = ART_SIZE / 2;
  const r = ART_SIZE * 0.42;
  const pts = `${c},${c - r} ${c + r},${c} ${c},${c + r} ${c - r},${c}`;
  const facets = `
    <line x1="${c}" y1="${c - r}" x2="${c}" y2="${c + r}" stroke="${p.light}" stroke-width="2" opacity="0.55" />
    <line x1="${c - r}" y1="${c}" x2="${c + r}" y2="${c}" stroke="${p.dark}" stroke-width="1.5" opacity="0.4" />
  `;
  return `
    <g filter="url(#shadow-${id})">
      <polygon points="${pts}" fill="url(#body-${id})" stroke="${p.dark}" stroke-width="2.5" stroke-linejoin="round" />
      ${facets}
      ${shine(c, r)}
    </g>
  `;
}

// 9: iced donut (ring with glaze drip)
function shapeDonut(id: string, p: CandyPalette): string {
  const c = ART_SIZE / 2;
  const rOuter = ART_SIZE * 0.4;
  const rInner = rOuter * 0.42;
  return `
    <g filter="url(#shadow-${id})">
      <circle cx="${c}" cy="${c}" r="${rOuter}" fill="url(#body-${id})" stroke="${p.dark}" stroke-width="2.5" />
      <circle cx="${c}" cy="${c}" r="${rInner}" fill="#2b1030" opacity="0.18" />
      <circle cx="${c}" cy="${c}" r="${rInner}" fill="none" stroke="${p.dark}" stroke-width="2" opacity="0.5" />
      <path d="M ${c - rOuter * 0.8} ${c - rOuter * 0.25}
               A ${rOuter * 0.85} ${rOuter * 0.85} 0 0 1 ${c + rOuter * 0.75} ${c - rOuter * 0.35}
               L ${c + rOuter * 0.55} ${c - rOuter * 0.15}
               A ${rOuter * 0.6} ${rOuter * 0.6} 0 0 0 ${c - rOuter * 0.6} ${c - rOuter * 0.05} Z"
            fill="${p.light}" opacity="0.65" />
      ${shine(c, rOuter)}
    </g>
  `;
}

const SHAPE_FNS = [
  shapeDisc, shapePotion, shapeTeardrop, shapeGem, shapeSwirl, shapeStar, shapeHeart, shapeClover,
  shapeDiamond, shapeDonut,
];

export function buildCandySvg(typeIndex: number): string {
  const p = CANDY_PALETTES[typeIndex];
  const id = `c${typeIndex}`;
  const body = SHAPE_FNS[typeIndex](id, p);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${ART_SIZE}" height="${ART_SIZE}" viewBox="0 0 ${ART_SIZE} ${ART_SIZE}">
      <defs>${defs(id, p)}</defs>
      ${body}
    </svg>
  `.trim();
}

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function candyTextureKey(typeIndex: number): string {
  return `candy-${typeIndex}`;
}
