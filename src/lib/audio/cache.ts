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

export const AudioAvailabilityCache = {
  makeKey: (mediaType: string, id: string | number, season?: number, episode?: number): string => {
    return `audio-avail:v5:${mediaType}:${id}:${season ?? 0}:${episode ?? 0}`;
  },

  makeDiscoveryKey: (mediaType: string, id: string | number): string => {
    return `audio-discovery:v5:${mediaType}:${id}`;
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
    const key = `known-dub-langs:v5:${mediaIdOrAniListId}`;
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
    return null;
  },

  setKnownDubLanguages: (mediaIdOrAniListId: string | number, langs: string[], ttlMs = 24 * 60 * 60 * 1000): void => {
    const key = `known-dub-langs:v5:${mediaIdOrAniListId}`;
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

