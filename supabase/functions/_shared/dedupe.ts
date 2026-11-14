// Pulled sources (Health Connect, Google Health API) re-send a trailing window
// on every sync instead of trusting a saved position, so the same rows arrive
// repeatedly and must be dropped before insert. Returns the rows whose key is
// neither already stored nor repeated earlier in the batch.
export function dropKnown<T>(rows: T[], known: Set<string>, keyOf: (row: T) => string): T[] {
  const seen = new Set(known);
  const fresh: T[] = [];
  for (const row of rows) {
    const key = keyOf(row);
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push(row);
  }
  return fresh;
}

export const instantKey = (v: string) => new Date(v).toISOString();
