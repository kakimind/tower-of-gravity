import { LANGUAGES, getLanguage, setLanguage, t } from '../i18n';

let currentSceneKey = 'LobbyScene';

export function setCurrentSceneKey(key: string): void {
  currentSceneKey = key;
  syncExitVisibility();
}

function syncExitVisibility(): void {
  const exitBtn = document.getElementById('settings-exit-btn');
  if (!exitBtn) return;
  if (currentSceneKey === 'GameScene') {
    exitBtn.removeAttribute('hidden');
  } else {
    exitBtn.setAttribute('hidden', 'true');
  }
}

const TITLE_MAX_FONT_PX = 26;
const TITLE_MIN_FONT_PX = 13;

function fitTitleToBox(): void {
  const h1 = document.querySelector<HTMLElement>('.title-plaque h1');
  const container = document.querySelector<HTMLElement>('.title-plaque');
  if (!h1 || !container) return;

  const horizontalPadding = 36;
  const available = Math.max(20, container.clientWidth - horizontalPadding);

  let fontSize = TITLE_MAX_FONT_PX;
  h1.style.fontSize = `${fontSize}px`;
  while (h1.scrollWidth > available && fontSize > TITLE_MIN_FONT_PX) {
    fontSize -= 1;
    h1.style.fontSize = `${fontSize}px`;
  }
}

function applyTranslations(): void {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    el.textContent = t(key as Parameters<typeof t>[0]);
  });
  fitTitleToBox();
}

export function initSettingsPanel(): void {
  const openBtn = document.getElementById('settings-open-btn');
  const overlay = document.getElementById('settings-overlay');
  const closeBtn = document.getElementById('settings-close-btn');
  const exitBtn = document.getElementById('settings-exit-btn');
  const languageSelect = document.getElementById('settings-language') as HTMLSelectElement | null;

  if (!openBtn || !overlay || !closeBtn || !exitBtn || !languageSelect) return;

  LANGUAGES.forEach((lang) => {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = lang.nativeName;
    languageSelect.appendChild(opt);
  });
  languageSelect.value = getLanguage();

  applyTranslations();
  syncExitVisibility();

  openBtn.addEventListener('click', () => {
    overlay.classList.add('open');
  });
  closeBtn.addEventListener('click', () => {
    overlay.classList.remove('open');
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });

  languageSelect.addEventListener('change', () => {
    setLanguage(languageSelect.value);
    applyTranslations();
  });

  exitBtn.addEventListener('click', () => {
    overlay.classList.remove('open');
    window.dispatchEvent(new CustomEvent('game:exit-to-lobby'));
  });
}
