/**
 * Shared watchlist helpers — keeps the localStorage format consistent
 * across hero, movie detail, TV detail, and watchlist pages.
 *
 * Format: Array of { id: string, type: 'movie' | 'tv' }
 */

export interface WatchlistItem {
  id: string;
  type: 'movie' | 'tv' | 'anime';
}

const STORAGE_KEY = 'lumina-watchlist';
const LEGACY_STORAGE_KEY = 'watchers-heaven-watchlist';

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!stored) return [];
  try {
    const raw: unknown[] = JSON.parse(stored);
    // Migrate old format (plain string IDs → assume movie)
    return raw.map((item) => {
      if (typeof item === 'string') return { id: item, type: 'movie' as const };
      if (item && typeof item === 'object' && 'id' in item) return item as WatchlistItem;
      return null;
    }).filter(Boolean) as WatchlistItem[];
  } catch {
    return [];
  }
}

export function saveWatchlist(items: WatchlistItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function isInWatchlist(id: string | number): boolean {
  return getWatchlist().some((item) => item.id === String(id));
}

export function toggleWatchlistItem(id: string | number, type: 'movie' | 'tv' | 'anime'): boolean {
  const items = getWatchlist();
  const idStr = String(id);
  const idx = items.findIndex((item) => item.id === idStr);

  if (idx >= 0) {
    items.splice(idx, 1);
    saveWatchlist(items);
    return false; // removed
  } else {
    items.push({ id: idStr, type });
    saveWatchlist(items);
    return true; // added
  }
}

export function removeFromWatchlist(id: string | number): void {
  const items = getWatchlist().filter((item) => item.id !== String(id));
  saveWatchlist(items);
}
