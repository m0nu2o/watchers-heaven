import { fetchClient, ApiError } from './client';
import { withRetries } from './retries';
import { tmdbCircuitBreaker } from './circuit-breaker';

const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.tmdb.org/3';
const RIVE_BASE = 'https://rivestream.ru';

// ─── Client-side in-memory cache (browser only) ───

interface ClientCacheEntry {
  data: unknown;
  expiresAt: number;
}

const clientCache = new Map<string, ClientCacheEntry>();
const CLIENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── sessionStorage persistence layer ──
// Backs up cache entries to sessionStorage so they survive page refreshes
// and cross-page navigations. Only used in the browser.
const SESSION_CACHE_PREFIX = 'wh-cache:';

function clientCacheGet<T>(key: string): T | undefined {
  // 1. Check in-memory cache first (fastest)
  const entry = clientCache.get(key);
  if (entry) {
    if (Date.now() > entry.expiresAt) {
      clientCache.delete(key);
    } else {
      return entry.data as T;
    }
  }
  // 2. Fall back to sessionStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(SESSION_CACHE_PREFIX + key);
      if (raw) {
        const parsed = JSON.parse(raw) as ClientCacheEntry;
        if (Date.now() <= parsed.expiresAt) {
          // Restore to in-memory cache
          clientCache.set(key, parsed);
          return parsed.data as T;
        }
        sessionStorage.removeItem(SESSION_CACHE_PREFIX + key);
      }
    } catch { /* sessionStorage unavailable or corrupt */ }
  }
  return undefined;
}

function clientCacheSet(key: string, data: unknown, ttlMs = CLIENT_CACHE_TTL): void {
  const expiresAt = Date.now() + ttlMs;
  // Keep the in-memory cache from growing unbounded (max 150 entries)
  if (clientCache.size >= 150) {
    const firstKey = clientCache.keys().next().value;
    if (firstKey) clientCache.delete(firstKey);
  }
  clientCache.set(key, { data, expiresAt });
  // Persist to sessionStorage for cross-page survival
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(
        SESSION_CACHE_PREFIX + key,
        JSON.stringify({ data, expiresAt })
      );
    } catch { /* quota exceeded — silently skip */ }
  }
}

// ─── In-flight request deduplication ───

const inflightRequests = new Map<string, Promise<unknown>>();

function dedupeRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflightRequests.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fn().finally(() => {
    inflightRequests.delete(key);
  });
  inflightRequests.set(key, promise);
  return promise;
}

// ─── Types ───

export interface TouStreamChannel {
  slug: string;
  name: string;
}

export interface AniListSearchResult {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { large: string };
  episodes: number | null;
  averageScore: number | null;
}

import type { AniListMediaDetails } from '@/types/media';

export type { AniListMediaDetails };


export const ApiGateway = {
  // --- RiveStream API ---
  getMovieEmbedUrl: (tmdbId: string | number, type: 'default' | 'torrent' | 'agg' = 'default') => {
    const path = type === 'default' ? '/embed' : `/embed/${type}`;
    return `${RIVE_BASE}${path}?type=movie&id=${tmdbId}`;
  },

  getTvEmbedUrl: (tmdbId: string | number, season: number, episode: number, type: 'default' | 'torrent' | 'agg' = 'default') => {
    const path = type === 'default' ? '/embed' : `/embed/${type}`;
    return `${RIVE_BASE}${path}?type=tv&id=${tmdbId}&season=${season}&episode=${episode}`;
  },

  getMovieDownloadUrl: (tmdbId: string | number) => {
    return `${RIVE_BASE}/download?type=movie&id=${tmdbId}`;
  },

  getTvDownloadUrl: (tmdbId: string | number, season: number, episode: number) => {
    return `${RIVE_BASE}/download?type=tv&id=${tmdbId}&season=${season}&episode=${episode}`;
  },

  // --- ScreenScape API ---
  getScreenScapeUrl: (id: string | number, type: 'movie' | 'tv', season?: number, episode?: number, language = 'eng', isImdb = false) => {
    const idKey = isImdb ? 'imdb' : 'tmdb';
    let url = `https://screenscape.me/embed?${idKey}=${id}&type=${type}`;
    if (type === 'tv' && season !== undefined && episode !== undefined) {
      url += `&s=${season}&e=${episode}`;
    }
    if (language) {
      url += `&lan=${language}`;
    }
    return url;
  },

  // --- TouStream API ---
  getTouStreamMovieUrl: (tmdbId: string | number) => {
    return `https://toustream.xyz/tou/movies/${tmdbId}`;
  },

  getTouStreamLiveUrl: (channelSlug: string) => {
    return `https://toustream.xyz/tou/live/${channelSlug}`;
  },

  /**
   * Fetch live channels through the server proxy to avoid the 12 MB
   * client-side JSON parse crash. Falls back to a small default list.
   * @param limit  Max channels to return (10–200, default 200).
   *               Use a smaller limit for a fast initial batch.
   */
  getTouStreamChannels: async (limit = 500): Promise<TouStreamChannel[]> => {
    const cacheKey = `toustream-channels:${limit}`;

    // Check client cache first
    const cached = clientCacheGet<TouStreamChannel[]>(cacheKey);
    if (cached) return cached;

    const FALLBACK: TouStreamChannel[] = [
      { slug: 'cnn', name: 'CNN' },
      { slug: 'bbcnews', name: 'BBC News' },
      { slug: 'espn', name: 'ESPN' },
      { slug: 'foxnews', name: 'Fox News' },
      { slug: 'bloomberg', name: 'Bloomberg' },
      { slug: 'cartoonnetwork', name: 'Cartoon Network' },
      { slug: 'disneychannel', name: 'Disney Channel' },
      { slug: 'nickelodeon', name: 'Nickelodeon' },
      { slug: 'natgeo', name: 'National Geographic' },
      { slug: 'discovery', name: 'Discovery Channel' },
    ];

    try {
      return await dedupeRequest(cacheKey, async () => {
        const res = await fetchClient('/api/tmdb/channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-channels', limit }),
          timeoutMs: 95_000,
        });
        const channels = Array.isArray(res) ? res : FALLBACK;
        clientCacheSet(cacheKey, channels, 30 * 60 * 1000); // 30 min
        return channels;
      });
    } catch (err) {
      console.warn('TouStream channels unavailable, using fallback:', (err as Error).message);
      return FALLBACK;
    }
  },

  // --- VidFast (vidfast.pro) API ---
  getVidFastUrl: (
    tmdbId: string | number,
    type: 'movie' | 'tv',
    season?: number,
    episode?: number,
    options?: {
      autoPlay?: boolean;
      theme?: string;
      title?: boolean;
      poster?: boolean;
      nextButton?: boolean;
      autoNext?: boolean;
      startAt?: number;
    }
  ) => {
    let url = type === 'movie'
      ? `https://vidfast.pro/movie/${tmdbId}`
      : `https://vidfast.pro/tv/${tmdbId}/${season || 1}/${episode || 1}`;
    const params: string[] = [];
    if (options?.autoPlay !== undefined) params.push(`autoPlay=${options.autoPlay ? 1 : 0}`);
    if (options?.theme) params.push(`theme=${options.theme}`);
    if (options?.startAt && options.startAt > 0) params.push(`startAt=${options.startAt}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return url;
  },

  // --- Dedicated Anime (vidsrc.sh) API ---
  getVidsrcAnimeUrl: (tmdbId: string | number, episode?: number) => {
    return `https://vidsrc.sh/embed/anime/${tmdbId}/${episode || 1}`;
  },

  // --- Vidsrc Mirror (vidsrc.pm) API ---
  getVidsrcMirrorUrl: (tmdbId: string | number, type: 'movie' | 'tv', season?: number, episode?: number) => {
    return type === 'movie'
      ? `https://vidsrc.pm/embed/movie/${tmdbId}`
      : `https://vidsrc.pm/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
  },

  // --- Vidsrc.sh API ---
  getVidsrcEmbedUrl: (id: string | number, type: 'movie' | 'tv', season?: number, episode?: number, options?: { subUrl?: string; dsLang?: string; autoplay?: boolean }) => {
    const base = 'https://vidsrc.sh/embed';
    let url = type === 'movie'
      ? `${base}/movie/${id}`
      : `${base}/tv/${id}/${season || 1}-${episode || 1}`;
    const params: string[] = [];
    if (options?.subUrl) params.push(`sub_url=${encodeURIComponent(options.subUrl)}`);
    if (options?.dsLang) params.push(`ds_lang=${options.dsLang}`);
    if (options?.autoplay !== undefined) params.push(`autoplay=${options.autoplay ? 1 : 0}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return url;
  },

  // --- RiveStream (dead — blocks X-Frame-Options) → redirected to vidsrc.net ---
  getRiveStreamUrl: (tmdbId: string | number, type: 'movie' | 'tv', season?: number, episode?: number) => {
    return type === 'movie'
      ? `https://vidsrc.net/embed/movie/?tmdb=${tmdbId}`
      : `https://vidsrc.net/embed/tv/?tmdb=${tmdbId}&season=${season || 1}&episode=${episode || 1}`;
  },

  // --- 111Movies Fast Stream API ---
  get111MoviesUrl: (tmdbId: string | number, type: 'movie' | 'tv', season?: number, episode?: number) => {
    return type === 'movie'
      ? `https://111movies.com/movie/${tmdbId}`
      : `https://111movies.com/tv/${tmdbId}/${season || 1}/${episode || 1}`;
  },

  // --- VidSrc.me (vidsrc.me) API — Alternative 1080p, Multi-Sub, Wide Catalog ---
  getVidsrcMeUrl: (tmdbId: string | number, type: 'movie' | 'tv', season?: number, episode?: number) => {
    return type === 'movie'
      ? `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`
      : `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season || 1}&episode=${episode || 1}`;
  },

  // --- VidSrc.net — most reliable vidsrc variant, iframe-friendly ---
  getVidSrcNetUrl: (tmdbId: string | number, type: 'movie' | 'tv', season?: number, episode?: number) => {
    return type === 'movie'
      ? `https://vidsrc.net/embed/movie/?tmdb=${tmdbId}`
      : `https://vidsrc.net/embed/tv/?tmdb=${tmdbId}&season=${season || 1}&episode=${episode || 1}`;
  },

  // --- VidLink (vidlink.pro) — Ultra-clean, modern player, multi-audio & subtitles ---
  getVidLinkUrl: (tmdbId: string | number, type: 'movie' | 'tv', season?: number, episode?: number) => {
    return type === 'movie'
      ? `https://vidlink.pro/movie/${tmdbId}?autoplay=true`
      : `https://vidlink.pro/tv/${tmdbId}/${season || 1}/${episode || 1}?autoplay=true`;
  },

  // --- VidSrc.cc (vidsrc.cc) — High performance v2 multi-server embed ---
  getVidSrcCcUrl: (tmdbId: string | number, type: 'movie' | 'tv', season?: number, episode?: number) => {
    return type === 'movie'
      ? `https://vidsrc.cc/v2/embed/movie/${tmdbId}`
      : `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
  },

  // --- Miruro Anime (miruro.tv) — AniList-based, skip timestamps, sub+dub ---
  getMiruroUrl: (aniListId: number | string | null | undefined, episode: number = 1, isDub = false) => {
    if (!aniListId) return `https://www.miruro.tv/`;
    return `https://www.miruro.tv/watch?id=${aniListId}&ep=${episode}${isDub ? '&dub=true' : ''}`;
  },

  // --- MultiEmbed (multiembed.mov) — 1080p, Multi-Audio, Huge Catalog ---
  getMultiEmbedUrl: (tmdbId: string | number, type: 'movie' | 'tv', season?: number, episode?: number) => {
    const base = `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`;
    return type === 'movie' ? base : `${base}&s=${season || 1}&e=${episode || 1}`;
  },

  // --- AutoEmbed (DEAD — autoembed.cc DNS down) — falls back to vidsrc.me ---
  getAutoEmbedUrl: (tmdbId: string | number, type: 'movie' | 'tv', season?: number, episode?: number) => {
    // autoembed.cc is DNS-dead as of Sep 2026; redirect to vidsrc.me
    return type === 'movie'
      ? `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`
      : `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season || 1}&episode=${episode || 1}`;
  },

  // --- 2Embed (www.2embed.cc) API (Extensive anime & TV catalog coverage) ---
  get2EmbedUrl: (tmdbId: string | number, type: 'movie' | 'tv', season?: number, episode?: number) => {
    return type === 'movie'
      ? `https://www.2embed.cc/embed/${tmdbId}`
      : `https://www.2embed.cc/embedtv/${tmdbId}?s=${season || 1}&e=${episode || 1}`;
  },

  // --- NHD Embed (nhdapi.com) API (Hindi Dub Priority, Multi-Audio, Auto Failover) ---
  getNhdEmbedUrl: (
    id: string | number,
    type: 'movie' | 'tv' | 'anime',
    season?: number,
    episode?: number,
    aniListId?: number | null
  ) => {
    if (type === 'anime' && aniListId) {
      return `https://nhdapi.com/anime/${aniListId}/${episode || 1}`;
    }
    return type === 'movie'
      ? `https://nhdapi.com/movie/${id}`
      : `https://nhdapi.com/tv/${id}/${season || 1}/${episode || 1}`;
  },

  // --- Embed.su (embed.su) API (Ultra-fast 1080p, Ad-Free, Huge Catalog, Multi-Subtitles) ---
  getEmbedSuUrl: (tmdbId: string | number, type: 'movie' | 'tv', season?: number, episode?: number) => {
    return type === 'movie'
      ? `https://embed.su/embed/movie/${tmdbId}`
      : `https://embed.su/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
  },

  // --- VidSrc.to (vidsrc.to) API — Premium 1080p, Hindi+English Dub, Rich Built-in Player ---
  getVidSrcUrl: (tmdbId: string | number, type: 'movie' | 'tv', season?: number, episode?: number) => {
    return type === 'movie'
      ? `https://vidsrc.to/embed/movie/${tmdbId}`
      : `https://vidsrc.to/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`;
  },

  // --- AutoEmbed Anime Pro (DEAD — anime.autoembed.cc down) — falls back to multiembed ---
  getAutoEmbedAnimeProUrl: (tmdbId: string | number, season?: number, episode?: number) => {
    // anime.autoembed.cc is DNS-dead; route to multiembed.mov which covers anime via TMDB
    const base = `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`;
    return `${base}&s=${season || 1}&e=${episode || 1}`;
  },

  // --- Videasy (player.videasy.net) — Premium built-in player, ad-free, multi-language ---
  getVideasyUrl: (tmdbId: string | number, type: 'movie' | 'tv' | 'anime', season?: number, episode?: number, aniListId?: number | null) => {
    if (type === 'movie') return `https://player.videasy.net/movie/${tmdbId}`;
    if (type === 'anime' && aniListId) return `https://player.videasy.net/anime/${aniListId}/${episode || 1}`;
    return `https://player.videasy.net/tv/${tmdbId}/${season || 1}/${episode || 1}`;
  },

  // --- Kuhi & Anivexa Direct HLS Stream Extraction (AniList-based, 0 Ads, parallel race) ---
  getDirectAnimeStream: async (
    aniListId: number | string,
    episode: number = 1,
    isDub: boolean = false
  ): Promise<{
    url: string;
    subtitles?: Array<{ label: string; file: string }>;
    skipTimestamps?: { intro?: { start: number; end: number }; outro?: { start: number; end: number } };
  } | null> => {
    const id = String(aniListId);
    const subOrDub = isDub ? 'dub' : 'sub';

    // Race all endpoints in parallel — resolves as soon as the first succeeds
    // Max wait: 5s total (not 3×4s = 12s like the old sequential loop)
    const endpoints = [
      `https://anivexa-api.vercel.app/watch/reanime/${id}/${subOrDub}/reanime-${episode}`,
      `https://anivexa-api.vercel.app/watch/animepahe/${id}/${subOrDub}/animepahe-${episode}`,
      `https://anivexa-api.vercel.app/watch/anikoto/${id}/${subOrDub}/anikoto-${episode}`,
    ];

    const tryEndpoint = async (ep: string) => {
      const res = await fetch(ep, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const source = data?.sources?.find((s: { url?: string; isM3U8?: boolean }) =>
        s?.url?.includes('.m3u8') || s?.isM3U8
      ) || data?.sources?.[0];
      if (!source?.url) throw new Error('No valid source URL');
      return {
        url: source.url as string,
        subtitles: (data?.subtitles as Array<{ lang?: string; label?: string; url?: string }> | undefined)?.map((s) => ({
          label: s.label || s.lang || 'English',
          file: s.url || '',
        })),
        skipTimestamps: data?.intro || data?.outro ? {
          intro: data.intro ? { start: data.intro.start as number, end: data.intro.end as number } : undefined,
          outro: data.outro ? { start: data.outro.start as number, end: data.outro.end as number } : undefined,
        } : undefined,
      };
    };

    try {
      return await Promise.any(endpoints.map(tryEndpoint));
    } catch {
      return null;
    }
  },

  // --- AniList GraphQL API (via server proxy /api/anilist) ---

  /**
   * Search AniList for an anime by title or AniList ID and return its ID, MAL ID, and verified spoken dub languages.
   * Caches response for 24 hours.
   */
  getAniListMediaDetails: async (
    idOrTitle: number | string
  ): Promise<AniListMediaDetails | null> => {
    const isId = typeof idOrTitle === 'number' || /^\d+$/.test(String(idOrTitle).trim());
    const numericId = isId ? parseInt(String(idOrTitle).trim(), 10) : undefined;
    const search = isId ? undefined : String(idOrTitle).trim();

    const cacheKey = `anilist-media:v2:${isId ? numericId : search?.toLowerCase()}`;
    const cached = clientCacheGet<AniListMediaDetails | null>(cacheKey);
    if (cached !== undefined) return cached;

    const query = `
      query ($id: Int, $search: String) {
        Media(id: $id, search: $search, type: ANIME) {
          id
          idMal
          title { romaji english }
          characters(perPage: 12) {
            edges {
              node { id }
              voiceActors {
                id
                languageV2
              }
            }
          }
        }
      }
    `;

    try {
      const endpoint =
        typeof window !== 'undefined'
          ? '/api/anilist'
          : 'https://graphql.anilist.co';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ query, variables: { id: numericId, search } }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        data?: {
          Media?: {
            id: number;
            idMal?: number | null;
            characters?: {
              edges?: Array<{
                node?: { id: number };
                voiceActors?: Array<{ languageV2?: string }>;
              }>;
            };
          };
        };
      };
      const media = json?.data?.Media;
      if (!media || !media.id) return null;

      const langs = new Set<string>();
      (media.characters?.edges || []).forEach((e) => {
        e.voiceActors?.forEach((v) => {
          if (v.languageV2) langs.add(v.languageV2);
        });
      });
      const spokenLanguages = Array.from(langs);
      const hasEnglishDub = spokenLanguages.includes('English');

      const result: AniListMediaDetails = {
        id: media.id,
        malId: media.idMal ?? null,
        hasEnglishDub,
        spokenLanguages,
      };

      clientCacheSet(cacheKey, result, 24 * 60 * 60 * 1000); // 24 hours
      return result;
    } catch {
      return null;
    }
  },

  /**
   * Search AniList for an anime by title and return its AniList ID.
   * Used to convert TMDB anime titles → AniList IDs for Videasy embeds.
   * Returns null if no match is found.
   */
  getAniListId: async (title: string): Promise<number | null> => {
    const details = await ApiGateway.getAniListMediaDetails(title);
    return details?.id ?? null;
  },

  /**
   * Search AniList for multiple anime — useful for populating a list page.
   * Returns up to `perPage` results (max 50).
   */
  searchAniList: async (
    search: string,
    page = 1,
    perPage = 20,
  ): Promise<AniListSearchResult[]> => {
    const cacheKey = `anilist-search:${search.toLowerCase().trim()}:${page}:${perPage}`;
    const cached = clientCacheGet<AniListSearchResult[]>(cacheKey);
    if (cached) return cached;

    const query = `
      query ($search: String, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
            id
            title { romaji english }
            coverImage { large }
            episodes
            averageScore
          }
        }
      }
    `;

    try {
      const res = await fetch('/api/anilist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { search, page, perPage } }),
      });
      if (!res.ok) return [];
      const json = await res.json() as { data?: { Page?: { media?: AniListSearchResult[] } } };
      const media = (json?.data?.Page?.media ?? []) as AniListSearchResult[];
      clientCacheSet(cacheKey, media, 10 * 60 * 1000); // 10 min
      return media;
    } catch {
      return [];
    }
  },




  // --- TMDB API (with client-side cache + deduplication) ---
  fetchTmdb: async <T>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
    const isBrowser = typeof window !== 'undefined';

    // Build a deterministic cache key
    const sortedParams = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
    const paramStr = sortedParams.map(([k, v]) => `${k}=${v}`).join('&');
    const cacheKey = `tmdb:${endpoint}${paramStr ? '?' + paramStr : ''}`;

    // ── Client cache hit ──
    if (isBrowser) {
      const cached = clientCacheGet<T>(cacheKey);
      if (cached) return cached;
    }

    // ── Deduplicate in-flight requests ──
    return await dedupeRequest(cacheKey, async () => {
      let urlString = '';

      const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

      if (isBrowser) {
        const url = new URL(`${window.location.origin}/api/tmdb${normalizedEndpoint}`);
        Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
        urlString = url.toString();
      } else {
        const apiKey = process.env.TMDB_API_KEY;
        if (!apiKey) throw new Error('TMDB_API_KEY is not set');
        const url = new URL(`${TMDB_BASE_URL}${normalizedEndpoint}`);
        url.searchParams.append('api_key', apiKey);
        Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
        urlString = url.toString();
      }

      const data = await tmdbCircuitBreaker.execute(() =>
        withRetries(() => fetchClient(urlString, {
          headers: { 'Accept': 'application/json' },
        }))
      );

      // ── Store in client cache ──
      if (isBrowser) {
        clientCacheSet(cacheKey, data);
      }

      return data as T;
    });
  },

  getMovieDetails: (id: string | number) => {
    return ApiGateway.fetchTmdb<Record<string, unknown>>(`/movie/${id}`);
  },

  getMovieCredits: async (id: string | number) => {
    try {
      return await ApiGateway.fetchTmdb<Record<string, unknown>>(`/movie/${id}/credits`);
    } catch {
      return { cast: [], crew: [] };
    }
  },

  getMovieRecommendations: async (id: string | number) => {
    try {
      return await ApiGateway.fetchTmdb<{ results?: Record<string, unknown>[] }>(`/movie/${id}/recommendations`);
    } catch {
      return { results: [] };
    }
  },

  getTvDetails: (id: string | number) => {
    return ApiGateway.fetchTmdb<Record<string, unknown>>(`/tv/${id}`);
  },

  getTvCredits: async (id: string | number) => {
    try {
      return await ApiGateway.fetchTmdb<Record<string, unknown>>(`/tv/${id}/credits`);
    } catch {
      return { cast: [], crew: [] };
    }
  },

  getTvRecommendations: async (id: string | number) => {
    try {
      return await ApiGateway.fetchTmdb<{ results?: Record<string, unknown>[] }>(`/tv/${id}/recommendations`);
    } catch {
      return { results: [] };
    }
  },

  getTvSeasonDetails: async (tvId: string | number, seasonNumber: number) => {
    try {
      return await ApiGateway.fetchTmdb<Record<string, unknown>>(`/tv/${tvId}/season/${seasonNumber}`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        return { season_number: seasonNumber, episodes: [] };
      }
      throw err;
    }
  },

  /**
   * Resilient media details loader:
   * Queries primary endpoint (movie or tv). If it returns 404, automatically tries the alternate endpoint.
   * Prevents console errors and broken pages when TV shows are opened as movies or anime movies are opened as TV.
   */
  getMediaDetails: async (
    id: string | number,
    preferredType: 'movie' | 'tv' | 'anime' = 'movie'
  ): Promise<{ data: Record<string, unknown>; resolvedType: 'movie' | 'tv' } | null> => {
    const isTvPreferred = preferredType === 'tv' || preferredType === 'anime';
    const primaryType = isTvPreferred ? 'tv' : 'movie';
    const secondaryType = isTvPreferred ? 'movie' : 'tv';

    try {
      const data = await ApiGateway.fetchTmdb<Record<string, unknown>>(`/${primaryType}/${id}`);
      return { data, resolvedType: primaryType };
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        try {
          const fallbackData = await ApiGateway.fetchTmdb<Record<string, unknown>>(`/${secondaryType}/${id}`);
          return { data: fallbackData, resolvedType: secondaryType };
        } catch {
          return null;
        }
      }
      throw err;
    }
  },

  getTvAiringToday: async (page = 1) => {
    return ApiGateway.fetchTmdb<{
      results: Array<{
        id: number;
        name: string;
        original_name?: string;
        overview?: string;
        poster_path?: string;
        backdrop_path?: string;
        vote_average?: number;
        first_air_date?: string;
        origin_country?: string[];
        original_language?: string;
      }>;
      page: number;
      total_pages: number;
    }>('/tv/airing_today', { page: String(page) });
  },

  getTvOnTheAir: async (page = 1) => {
    return ApiGateway.fetchTmdb<{
      results: Array<{
        id: number;
        name: string;
        original_name?: string;
        overview?: string;
        poster_path?: string;
        backdrop_path?: string;
        vote_average?: number;
        first_air_date?: string;
        origin_country?: string[];
        original_language?: string;
      }>;
      page: number;
      total_pages: number;
    }>('/tv/on_the_air', { page: String(page) });
  },

  getAiringAnime: async (page = 1, perPage = 24) => {
    const cacheKey = `anilist-airing:${page}:${perPage}`;
    const cached = clientCacheGet<
      Array<{
        id: number;
        title: { romaji?: string; english?: string };
        coverImage?: { large?: string };
        nextAiringEpisode?: { episode: number; airingAt: number } | null;
        averageScore?: number;
      }>
    >(cacheKey);
    if (cached) return cached;

    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
            id
            title { romaji english }
            coverImage { large }
            nextAiringEpisode { episode airingAt }
            averageScore
          }
        }
      }
    `;

    try {
      const endpoint =
        typeof window !== 'undefined'
          ? '/api/anilist'
          : 'https://graphql.anilist.co';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ query, variables: { page, perPage } }),
      });
      if (!res.ok) return [];
      const json = (await res.json()) as {
        data?: {
          Page?: {
            media?: Array<{
              id: number;
              title: { romaji?: string; english?: string };
              coverImage?: { large?: string };
              nextAiringEpisode?: { episode: number; airingAt: number } | null;
              averageScore?: number;
            }>;
          };
        };
      };
      const media = json?.data?.Page?.media ?? [];
      clientCacheSet(cacheKey, media, 10 * 60 * 1000);
      return media;
    } catch {
      return [];
    }
  },
};

export default ApiGateway;
