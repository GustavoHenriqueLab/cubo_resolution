let cached: Set<string> | null = null;
let pending: Promise<string[]> | null = null;

export function seedFavorites(ids: string[]) {
  cached = new Set(ids);
}

export function getCachedFavorites(): Set<string> | null {
  return cached;
}

export async function fetchFavorites(): Promise<string[]> {
  if (cached) return Array.from(cached);

  if (!pending) {
    pending = fetch("/api/startups/favorite")
      .then((res) => res.json())
      .then((data: { favorites: string[] }) => {
        cached = new Set(data.favorites ?? []);
        pending = null;
        return Array.from(cached!);
      })
      .catch(() => {
        pending = null;
        return [] as string[];
      });
  }

  return pending;
}
