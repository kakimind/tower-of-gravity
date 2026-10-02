export type Direction = 'down' | 'left' | 'up' | 'right';

export const DIRECTION_CYCLE: Direction[] = ['down', 'left', 'up', 'right'];

export function nextDirection(dir: Direction): Direction {
  const idx = DIRECTION_CYCLE.indexOf(dir);
  return DIRECTION_CYCLE[(idx + 1) % DIRECTION_CYCLE.length];
}

export const DIRECTION_ARROW: Record<Direction, string> = {
  down: '⬇️',
  left: '⬅️',
  up: '⬆️',
  right: '➡️',
};

