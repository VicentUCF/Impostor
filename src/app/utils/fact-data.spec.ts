import { buildFactCatalog, pickFacts } from './fact-data';

describe('fact-data', () => {
  const catalog = buildFactCatalog();

  it('has a catalog with source links large enough for twelve informants', () => {
    expect(catalog.length).toBeGreaterThanOrEqual(12);
    expect(new Set(catalog.map((fact) => fact.id)).size).toBe(catalog.length);
    expect(new Set(catalog.map((fact) => fact.statement)).size).toBe(catalog.length);
    catalog.forEach((fact) => {
      expect(fact.statement.trim()).toBeTruthy();
      expect(fact.category.trim()).toBeTruthy();
      expect(fact.explanation.trim()).toBeTruthy();
      expect(fact.source.label.trim()).toBeTruthy();
      expect(new URL(fact.source.url).protocol).toBe('https:');
    });
  });

  it('uses unseen facts first and falls back without duplicates when exhausted', () => {
    const pool = catalog.slice(0, 5);
    const recent = pool.slice(0, 3).map((fact) => fact.id);
    const fresh = pickFacts(pool, 2, recent);
    expect(fresh.every((fact) => !recent.includes(fact.id))).toBeTrue();

    const next = pickFacts(pool, 4, recent);
    expect(new Set(next.map((fact) => fact.id)).size).toBe(4);
    expect(next.slice(2).map((fact) => fact.id)).toEqual(recent.slice(0, 2));
  });

  it('rejects an insufficient catalog instead of repeating a fact in one round', () => {
    expect(() => pickFacts([catalog[0], catalog[0]], 2, [])).toThrowError();
  });
});
