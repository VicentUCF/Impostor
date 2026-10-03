import factsData from '../../db/Datos.json';
import { FactEntry } from '../models/fact-models';

export const buildFactCatalog = (): FactEntry[] => factsData;

// Prefer unseen facts, then the least recently used. Never repeat within a round,
// even when the small starter catalog has already been exhausted.
export const pickFacts = (
  catalog: readonly FactEntry[],
  count: number,
  recentFactIds: readonly string[]
): FactEntry[] => {
  const pool = Array.from(new Map(catalog.map((fact) => [fact.id, fact])).values());
  if (!Number.isInteger(count) || count < 0 || pool.length < count) {
    throw new Error('No hay suficientes datos distintos para esta ronda.');
  }

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }

  pool.sort((left, right) => recentFactIds.lastIndexOf(left.id) - recentFactIds.lastIndexOf(right.id));
  return pool.slice(0, count);
};
