import { LANGUAGES, getDictionary, TranslationKey } from './translations';

const KEY = 'towerGravityLanguage';

export function getLanguage(): string {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored && LANGUAGES.some((l) => l.code === stored)) return stored;
  } catch {
    // ignore
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'ko';
  const match = LANGUAGES.find((l) => l.code === nav || l.code === nav.split('-')[0]);
  return match?.code ?? 'ko';
}

export function setLanguage(code: string): void {
  try {
    localStorage.setItem(KEY, code);
  } catch {
    // ignore
  }
}

export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  const text = getDictionary(getLanguage())[key];
  if (!vars) return text;
  return Object.entries(vars).reduce(
    (out, [name, value]) => out.replace(`{${name}}`, String(value)),
    text,
  );
}

export { LANGUAGES };
