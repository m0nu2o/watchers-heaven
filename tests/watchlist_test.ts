/**
 * Tests for watchlist logic (inlined from src/lib/watchlist.ts)
 * Deno-compatible: no external src/ imports needed.
 */
import { assertEquals } from "jsr:@std/assert";

// ── Inlined watchlist logic ───────────────────────────────────────────────────

interface WatchlistItem {
  id: string;
  type: "movie" | "tv";
}

const STORAGE_KEY = "lumina-watchlist";

// Simple in-memory store standing in for localStorage
const store = new Map<string, string>();
const fakeStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => { store.set(key, value); },
};

function getWatchlist(): WatchlistItem[] {
  const stored = fakeStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const raw: unknown[] = JSON.parse(stored);
    return raw.map((item) => {
      if (typeof item === "string") return { id: item, type: "movie" as const };
      if (item && typeof item === "object" && "id" in item) {
        return item as WatchlistItem;
      }
      return null;
    }).filter(Boolean) as WatchlistItem[];
  } catch {
    return [];
  }
}

function saveWatchlist(items: WatchlistItem[]): void {
  fakeStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function isInWatchlist(id: string | number): boolean {
  return getWatchlist().some((item) => item.id === String(id));
}

function toggleWatchlistItem(id: string | number, type: "movie" | "tv"): boolean {
  const items = getWatchlist();
  const idStr = String(id);
  const idx = items.findIndex((item) => item.id === idStr);
  if (idx >= 0) {
    items.splice(idx, 1);
    saveWatchlist(items);
    return false;
  }
  items.push({ id: idStr, type });
  saveWatchlist(items);
  return true;
}

function removeFromWatchlist(id: string | number): void {
  saveWatchlist(getWatchlist().filter((item) => item.id !== String(id)));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

function reset() { store.clear(); }

Deno.test("watchlist - getWatchlist returns empty array when nothing stored", () => {
  reset();
  assertEquals(getWatchlist(), []);
});

Deno.test("watchlist - saveWatchlist and getWatchlist round-trips correctly", () => {
  reset();
  saveWatchlist([{ id: "1", type: "movie" }, { id: "2", type: "tv" }]);
  const list = getWatchlist();
  assertEquals(list.length, 2);
  assertEquals(list[0], { id: "1", type: "movie" });
  assertEquals(list[1], { id: "2", type: "tv" });
});

Deno.test("watchlist - isInWatchlist returns false when empty", () => {
  reset();
  assertEquals(isInWatchlist("99"), false);
});

Deno.test("watchlist - isInWatchlist returns true after adding an item", () => {
  reset();
  saveWatchlist([{ id: "42", type: "movie" }]);
  assertEquals(isInWatchlist("42"), true);
  assertEquals(isInWatchlist(42), true);
});

Deno.test("watchlist - toggleWatchlistItem adds item when not present", () => {
  reset();
  const added = toggleWatchlistItem("10", "movie");
  assertEquals(added, true);
  assertEquals(isInWatchlist("10"), true);
});

Deno.test("watchlist - toggleWatchlistItem removes item when already present", () => {
  reset();
  saveWatchlist([{ id: "10", type: "movie" }]);
  const removed = toggleWatchlistItem("10", "movie");
  assertEquals(removed, false);
  assertEquals(isInWatchlist("10"), false);
});

Deno.test("watchlist - toggleWatchlistItem preserves other items on removal", () => {
  reset();
  saveWatchlist([
    { id: "1", type: "movie" },
    { id: "2", type: "tv" },
    { id: "3", type: "movie" },
  ]);
  toggleWatchlistItem("2", "tv");
  const list = getWatchlist();
  assertEquals(list.length, 2);
  assertEquals(list.find((i) => i.id === "2"), undefined);
});

Deno.test("watchlist - removeFromWatchlist removes the specified item", () => {
  reset();
  saveWatchlist([{ id: "5", type: "tv" }, { id: "6", type: "movie" }]);
  removeFromWatchlist("5");
  const list = getWatchlist();
  assertEquals(list.length, 1);
  assertEquals(list[0].id, "6");
});

Deno.test("watchlist - removeFromWatchlist is a no-op for non-existent id", () => {
  reset();
  saveWatchlist([{ id: "7", type: "movie" }]);
  removeFromWatchlist("999");
  assertEquals(getWatchlist().length, 1);
});

Deno.test("watchlist - migrates old format (plain string IDs) to WatchlistItem", () => {
  reset();
  store.set(STORAGE_KEY, JSON.stringify(["101", "202"]));
  const list = getWatchlist();
  assertEquals(list.length, 2);
  assertEquals(list[0], { id: "101", type: "movie" });
  assertEquals(list[1], { id: "202", type: "movie" });
});

Deno.test("watchlist - getWatchlist returns empty on corrupt JSON", () => {
  reset();
  store.set(STORAGE_KEY, "not-valid-json{{{");
  assertEquals(getWatchlist(), []);
});
