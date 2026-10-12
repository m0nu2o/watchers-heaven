/**
 * Audio & Language Availability Cache
 * Prevents redundant upstream provider requests with TTL-based storage.
 */
import { EpisodeAudioAvailability, NormalizedAudioAvailability } from './types';

interface CacheEntry {
  data: EpisodeAudioAvailability;
  expiresAt: number;
}

interface DiscoveryCacheEntry {
  data: NormalizedAudioAvailability;
  expiresAt: number;
}

const inMemoryCache = new Map<string, CacheEntry>();
const inMemoryDiscoveryCache = new Map<string, DiscoveryCacheEntry>();
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour
const DISCOVERY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const KNOWN_HINDI_DUBBED_TMDB_IDS = new Set<string>([
  '299534', // Avengers: Endgame
  '299536', // Avengers: Infinity War
  '24428',  // The Avengers
  '99861',  // Avengers: Age of Ultron
  '533535', // Deadpool & Wolverine
  '293660', // Deadpool
  '383498', // Deadpool 2
  '634649', // Spider-Man: No Way Home
  '429617', // Spider-Man: Far From Home
  '315635', // Spider-Man: Homecoming
  '19995',  // Avatar
  '76600',  // Avatar: The Way of Water
  '872585', // Oppenheimer
  '438631', // Dune
  '693134', // Dune: Part Two
  '157336', // Interstellar
  '27205',  // Inception
  'tt1375666', // Inception (IMDb)
  '155',    // The Dark Knight
  '49026',  // The Dark Knight Rises
  '272',    // Batman Begins
  '414906', // The Batman
  '603692', // John Wick: Chapter 4
  '385687', // Fast X
  '385128', // F9: The Fast Saga
  '507086', // Jurassic World: Dominion
  '575264', // Mission: Impossible - Dead Reckoning Part One
  '361743', // Top Gun: Maverick
  '505642', // Black Panther: Wakanda Forever
  '453395', // Doctor Strange in the Multiverse of Madness
  '616037', // Thor: Love and Thunder
  '447365', // Guardians of the Galaxy Vol. 3
  '420818', // The Lion King
  '277834', // The Jungle Book
  '572802', // Aquaman and the Lost Kingdom
  '823464', // Godzilla x Kong: The New Empire
  '1011985',// Kung Fu Panda 4
  '1022789',// Inside Out 2
  '1241982',// Moana 2
  '558449', // Gladiator II
  '579974', // RRR
  '554592', // K.G.F: Chapter 1
  '830784', // K.G.F: Chapter 2
  '822119', // Pushpa: The Rise
  '256040', // Baahubali: The Beginning
  '350312', // Baahubali 2: The Conclusion
  '1024535',// Kantara
  '980489', // Kalki 2898 AD
  '974576', // Salaar: Part 1 – Ceasefire
  '974950', // Hanu-Man
]);

export function isKnownTheatricalHindiDub(id?: string | number, title?: string): boolean {
  if (id && KNOWN_HINDI_DUBBED_TMDB_IDS.has(String(id).trim())) {
    return true;
  }
  if (title) {
    const clean = title.toLowerCase().trim();
    if (
      clean.includes('inception') ||
      clean.includes('avengers: endgame') ||
      clean.includes('avengers endgame') ||
      clean.includes('avengers: infinity war') ||
      clean.includes('deadpool & wolverine') ||
      clean.includes('spider-man: no way home') ||
      clean.includes('avatar: the way of water') ||
      clean.includes('oppenheimer') ||
      clean.includes('dune: part two') ||
      clean.includes('rrr') ||
      clean.includes('k.g.f') ||
      clean.includes('pushpa') ||
      clean.includes('baahubali') ||
      clean.includes('kalki 2898')
    ) {
      return true;
    }
  }
  return false;
}

export const AudioAvailabilityCache = {
  makeKey: (mediaType: string, id: string | number, season?: number, episode?: number): string => {
    return `audio-avail:v7:${mediaType}:${id}:${season ?? 0}:${episode ?? 0}`;
  },

  makeDiscoveryKey: (mediaType: string, id: string | number): string => {
    return `audio-discovery:v7:${mediaType}:${id}`;
  },

  getDiscovery: (key: string): NormalizedAudioAvailability | null => {
    const mem = inMemoryDiscoveryCache.get(key);
    if (mem) {
      if (Date.now() < mem.expiresAt) {
        return mem.data;
      }
      inMemoryDiscoveryCache.delete(key);
    }

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const entry = JSON.parse(raw) as DiscoveryCacheEntry;
          if (entry.expiresAt && Date.now() < entry.expiresAt) {
            inMemoryDiscoveryCache.set(key, entry);
            return entry.data;
          }
          localStorage.removeItem(key);
        }
      } catch {
        // ignore
      }
    }

    return null;
  },

  setDiscovery: (key: string, data: NormalizedAudioAvailability, ttlMs = DISCOVERY_TTL_MS): void => {
    const entry: DiscoveryCacheEntry = {
      data,
      expiresAt: Date.now() + ttlMs,
    };
    inMemoryDiscoveryCache.set(key, entry);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(entry));
      } catch {
        // ignore
      }
    }
  },

  get: (key: string): EpisodeAudioAvailability | null => {
    // 1. Check in-memory cache
    const mem = inMemoryCache.get(key);
    if (mem) {
      if (Date.now() < mem.expiresAt) {
        return mem.data;
      }
      inMemoryCache.delete(key);
    }

    // 2. Check browser localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const entry = JSON.parse(raw) as CacheEntry;
          if (entry.expiresAt && Date.now() < entry.expiresAt) {
            inMemoryCache.set(key, entry);
            return entry.data;
          }
          localStorage.removeItem(key);
        }
      } catch {
        // ignore parse/storage errors
      }
    }

    return null;
  },

  set: (key: string, data: EpisodeAudioAvailability, ttlMs = DEFAULT_TTL_MS): void => {
    const entry: CacheEntry = {
      data,
      expiresAt: Date.now() + ttlMs,
    };

    inMemoryCache.set(key, entry);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(entry));
      } catch {
        // quota exceeded or private mode
      }
    }
  },

  // Preferred user language persistence
  getPreferredLanguage: (): string => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('lumina-preferred-audio-lang') ||
        localStorage.getItem('watchers-preferred-audio-lang') ||
        'sub'
      );
    }
    return 'sub';
  },

  setPreferredLanguage: (langCode: string): void => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('lumina-preferred-audio-lang', langCode);
      } catch {
        // ignore
      }
    }
  },

  // Authoritative Spoken Dub Languages per media (24-hour TTL)
  getKnownDubLanguages: (mediaIdOrAniListId: string | number): string[] | null => {
    const key = `known-dub-langs:v7:${mediaIdOrAniListId}`;
    const mem = inMemoryCache.get(key) as unknown as { langs?: string[]; expiresAt?: number } | undefined;
    if (mem && mem.expiresAt && Date.now() < mem.expiresAt && mem.langs) {
      return mem.langs;
    }

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const entry = JSON.parse(raw) as { langs: string[]; expiresAt: number };
          if (entry.expiresAt && Date.now() < entry.expiresAt && entry.langs) {
            inMemoryCache.set(key, entry as unknown as CacheEntry);
            return entry.langs;
          }
          localStorage.removeItem(key);
        }
      } catch {
        // ignore
      }
    }

    if (isKnownTheatricalHindiDub(mediaIdOrAniListId)) {
      return ['Hindi'];
    }

    return null;
  },

  setKnownDubLanguages: (mediaIdOrAniListId: string | number, langs: string[], ttlMs = 24 * 60 * 60 * 1000): void => {
    const key = `known-dub-langs:v7:${mediaIdOrAniListId}`;
    const entry = { langs, expiresAt: Date.now() + ttlMs };
    inMemoryCache.set(key, entry as unknown as CacheEntry);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(entry));
      } catch {
        // ignore
      }
    }
  },
};

