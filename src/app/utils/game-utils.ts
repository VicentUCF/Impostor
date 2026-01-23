export type Role = 'crew' | 'impostor';

export const parseBoundedInt = (
  value: string,
  min: number,
  max: number,
  fallback: number
): number => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
};

export const randomItem = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
};

export const assignRoles = (totalPlayers: number, impostors: number): Role[] => {
  const roles: Role[] = Array.from({ length: totalPlayers }, () => 'crew');
  const order = shuffle(Array.from({ length: totalPlayers }, (_, index) => index));

  for (let i = 0; i < impostors; i += 1) {
    roles[order[i]] = 'impostor';
  }

  return roles;
};

export const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
