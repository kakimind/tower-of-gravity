import {
  getNukeInventory, getSpecialInventory, getBonusMovesInventory,
} from '../engine/Progress';
import type { NukeType } from '../art/nukeArt';
import type { SpecialArtType } from '../art/specialArt';
import { t } from '../i18n';
import type { TranslationKey } from '../i18n/translations';

const NUKE_ICONS: Record<NukeType, string> = {
  bomb: '💣', lightning: '⚡', meteor: '☄️', blackHole: '🕳️',
};

const NUKE_LABEL_KEYS: Record<NukeType, TranslationKey> = {
  bomb: 'item.bomb', blackHole: 'item.blackHole', lightning: 'item.lightning', meteor: 'item.meteor',
};

const SPECIAL_ICONS: Record<SpecialArtType, string> = {
  lineRow: '↔️', lineCol: '↕️', crossBomb: '✚', colorBomb: '🌈',
};

const SPECIAL_LABEL_KEYS: Record<SpecialArtType, TranslationKey> = {
  lineRow: 'item.lineRow', lineCol: 'item.lineCol', crossBomb: 'item.crossBomb', colorBomb: 'item.colorBomb',
};

interface ItemRow {
  icon: string;
  label: string;
  count: number;
  dispatch: () => void;
}

// Every shop-bought item (bonus-moves, the 4 hand-placed specials, and the
// 4 finisher nukes) is used the same way: tap the 🎒 badge, tap a row, the
// row dispatches its own 'game:use-*' CustomEvent that GameScene listens
// for (see beginUseBonusMoves/beginUseSpecialItem/beginUseNukeItem there).
function collectRows(): ItemRow[] {
  const rows: ItemRow[] = [];

  const bonusMoves = getBonusMovesInventory();
  if (bonusMoves > 0) {
    rows.push({
      icon: '🪄',
      label: t('lobby.shopMovesLabel'),
      count: bonusMoves,
      dispatch: () => window.dispatchEvent(new CustomEvent('game:use-bonusmoves')),
    });
  }

  const specials = getSpecialInventory();
  (Object.keys(SPECIAL_LABEL_KEYS) as SpecialArtType[]).forEach((type) => {
    const count = specials[type];
    if (count <= 0) return;
    rows.push({
      icon: SPECIAL_ICONS[type],
      label: t(SPECIAL_LABEL_KEYS[type]),
      count,
      dispatch: () => window.dispatchEvent(new CustomEvent('game:use-special', { detail: { type } })),
    });
  });

  const nukes = getNukeInventory();
  (Object.keys(NUKE_LABEL_KEYS) as NukeType[]).forEach((type) => {
    const count = nukes[type];
    if (count <= 0) return;
    rows.push({
      icon: NUKE_ICONS[type],
      label: t(NUKE_LABEL_KEYS[type]),
      count,
      dispatch: () => window.dispatchEvent(new CustomEvent('game:use-nuke', { detail: { type } })),
    });
  });

  return rows;
}

let popupOpen = false;
// The bag popup is a fixed DOM layer with no knowledge of the Phaser-canvas
// story/dialogue card beneath it, so without this flag the two can render
// stacked on top of each other at the same time.
let storyCardOpen = false;

function closePopup(): void {
  document.getElementById('hud-items-popup')?.classList.remove('open');
  popupOpen = false;
}

window.addEventListener('game:story-open', () => {
  storyCardOpen = true;
  closePopup();
});
window.addEventListener('game:story-close', () => {
  storyCardOpen = false;
});

// Called after a purchase, after using an item mid-stage, and once when
// GameScene starts, so the badge count and popup rows never go stale.
export function refreshItemBar(): void {
  const countEl = document.getElementById('hud-items-count');
  const popup = document.getElementById('hud-items-popup');
  if (!countEl || !popup) return;

  const rows = collectRows();
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  countEl.textContent = String(total);

  popup.innerHTML = '';
  rows.forEach((row) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'hud-items-row';
    el.innerHTML = `<span class="hud-items-icon">${row.icon}</span>`
      + `<span class="hud-items-label">${row.label}</span>`
      + `<span class="hud-items-count">x${row.count}</span>`;
    el.addEventListener('click', (e) => {
      // Without this, the click bubbles up to hud-items-btn's own listener
      // (the popup is nested inside the button), which immediately toggles
      // the just-closed popup back open.
      e.stopPropagation();
      closePopup();
      row.dispatch();
    });
    popup.appendChild(el);
  });

  if (total <= 0) closePopup();
}

export function initItemBar(): void {
  const btn = document.getElementById('hud-items-btn');
  const popup = document.getElementById('hud-items-popup');
  if (!btn || !popup) return;

  refreshItemBar();

  btn.addEventListener('click', () => {
    if (storyCardOpen) return;
    const hasAny = collectRows().length > 0;
    if (!hasAny) return;
    popupOpen = !popupOpen;
    if (popupOpen) {
      // position:fixed, set from the button's live rect — a CSS-only
      // `position: absolute; top: 100%` placement gets clipped away by
      // .hud's `overflow: hidden` on phone-width viewports (see index.html).
      const rect = btn.getBoundingClientRect();
      popup.style.top = `${rect.bottom + 6}px`;
      popup.style.right = `${window.innerWidth - rect.right}px`;
    }
    popup.classList.toggle('open', popupOpen);
  });

  document.addEventListener('click', (e) => {
    if (!popupOpen) return;
    const target = e.target as Node;
    if (btn.contains(target) || popup.contains(target)) return;
    closePopup();
  });
}
