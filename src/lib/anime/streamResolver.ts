// @ts-nocheck
import { extractFlixcloud } from './extractors/flixcloud';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const DEFAULT_REQUEST_TIMEOUT_MS = 3200;
const DEFAULT_RESOLUTION_TIMEOUT_MS = 7500;
const STREAM_CACHE_TTL = 15 * 60 * 1000;

interface StreamCacheEntry {
  data: any;
  expiresAt: number;
}

const streamCache = new Map<string, StreamCacheEntry>();
const mappingCache = new Map<string, any>();

function normalizeTimeout(value: unknown, fallback = DEFAULT_REQUEST_TIMEOUT_MS): number {
  const timeoutMs = Number(value);
  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.max(1, Math.round(timeoutMs)) : fallback;
}

function createDeadline(timeoutMs: number, parentSignal?: AbortSignal | null) {
  const controller = new AbortController();
  const boundedTimeoutMs = normalizeTimeout(timeoutMs);
  let timeoutId: NodeJS.Timeout | null = null;
  let removeAbortListener: (() => void) | null = null;
  const timeoutError = new Error(`Request timed out after ${boundedTimeoutMs}ms`);
  const abortError = new Error('Operation aborted');

  const deadlinePromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort(timeoutError);
      reject(timeoutError);
    }, boundedTimeoutMs);

    if (parentSignal) {
      const abortFromParent = () => {
        const reason = parentSignal.reason || abortError;
        if (!controller.signal.aborted) controller.abort(reason);
        reject(reason);
      };
      if (parentSignal.aborted) {
        abortFromParent();
      } else {
        parentSignal.addEventListener('abort', abortFromParent, { once: true });
        removeAbortListener = () => parentSignal.removeEventListener('abort', abortFromParent);
      }
    }
  });
  deadlinePromise.catch(() => {});

  return {
    signal: controller.signal,
    deadlinePromise,
    abort(reason = abortError) {
      if (!controller.signal.aborted) controller.abort(reason);
    },
    cancel() {
      if (timeoutId) clearTimeout(timeoutId);
      removeAbortListener?.();
    },
  };
}

async function fetchBody(
  fetchImpl: typeof fetch,
  url: string,
  options: RequestInit,
  timeoutMs: number,
  parentSignal?: AbortSignal | null,
  label?: string
) {
  const deadline = createDeadline(timeoutMs, parentSignal);
  try {
    const response = (await Promise.race([
      fetchImpl(url, { ...options, signal: deadline.signal }),
      deadline.deadlinePromise,
    ])) as Response;
    const body = (await Promise.race([response.text(), deadline.deadlinePromise])) as string;
    return { response, body };
  } finally {
    deadline.cancel();
  }
}

async function fetchJson(
  fetchImpl: typeof fetch,
  url: string,
  options: RequestInit,
  timeoutMs: number,
  parentSignal?: AbortSignal | null,
  label?: string
) {
  const { response, body } = await fetchBody(fetchImpl, url, options, timeoutMs, parentSignal, label);
  if (!response.ok) {
    throw new Error(`${label || 'Request'} returned HTTP ${response.status}`);
  }
  return JSON.parse(body);
}

function readStreamCache(key: string, now: number) {
  const cached = streamCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= now) {
    streamCache.delete(key);
    return null;
  }
  return cached.data;
}

function writeStreamCache(key: string, payload: any, now: number) {
  if (streamCache.size >= 100) {
    const oldestKey = streamCache.keys().next().value;
    if (oldestKey) streamCache.delete(oldestKey);
  }
  streamCache.set(key, { data: payload, expiresAt: now + STREAM_CACHE_TTL });
}

async function resolveReanime(
  anilistId: number | string,
  epNum: number,
  isDub: boolean,
  {
    fetchImpl = fetch,
    signal = null,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  }: {
    fetchImpl?: typeof fetch;
    signal?: AbortSignal | null;
    timeoutMs?: number;
  } = {}
) {
  const BASE = 'https://reanime.to';
  const cleanAnilistId = String(anilistId).replace(/^anilist-/, '').trim();
  const targetUrl = `${BASE}/api/flix/${encodeURIComponent(cleanAnilistId)}/${encodeURIComponent(epNum)}`;

  let flixData: any = null;

  // 1. Edge proxy bypasses Cloudflare datacenter IP blocks (Ported from anime website)
  const workerProxy =
    process.env.CLOUDFLARE_WORKER_URL ||
    process.env.STREAM_PROXY_URL ||
    'https://tblbvrgzoovujszpztvr.supabase.co/functions/v1/anime-proxy';

  if (workerProxy) {
    try {
      const cleanWorker = workerProxy.replace(/\/+$/, '');
      const proxyFetchUrl = cleanWorker.includes('?')
        ? `${cleanWorker}&url=${encodeURIComponent(targetUrl)}`
        : `${cleanWorker}?url=${encodeURIComponent(targetUrl)}`;

      const { response, body } = await fetchBody(
        fetchImpl,
        proxyFetchUrl,
        { headers: { Accept: 'application/json' } },
        Math.min(timeoutMs, 5000),
        signal,
        'Reanime edge proxy request'
      );
      if (response.ok) {
        try {
          const parsed = JSON.parse(body);
          if (parsed?.success && Array.isArray(parsed?.servers) && parsed.servers.length > 0) {
            flixData = parsed;
          }
        } catch {}
      }
    } catch {}
  }

  // 2. Direct request fallback with browser headers
  if (!flixData) {
    try {
      const H = {
        'User-Agent': USER_AGENT,
        Accept: 'application/json, */*',
        Referer: `${BASE}/`,
      };
      const { response, body } = await fetchBody(
        fetchImpl,
        targetUrl,
        { headers: H },
        timeoutMs,
        signal,
        'Reanime catalog direct request'
      );
      if (response.ok) {
        try {
          flixData = JSON.parse(body);
        } catch {
          flixData = null;
        }
      }
    } catch (error) {
      if (signal?.aborted) throw signal.reason;
    }
  }

  if (!flixData?.success || !Array.isArray(flixData?.servers) || flixData.servers.length === 0) {
    throw new Error('No servers returned by Reanime');
  }

  const rawServers: any[] = flixData.servers;
  const hasSub = rawServers.some((s: any) => ['sub', 's-sub'].includes(s.dataType?.toLowerCase()));
  const hasDub = rawServers.some((s: any) => ['dub', 's-dub'].includes(s.dataType?.toLowerCase()));

  // Prioritize requested audio (dub or sub)
  const preferredType = isDub ? 'dub' : 'sub';
  const matchingServers = rawServers.filter((s: any) => s.dataType?.toLowerCase() === preferredType);
  const otherServers = rawServers.filter((s: any) => s.dataType?.toLowerCase() !== preferredType);
  const sortedServers = [...matchingServers, ...otherServers];

  // Map to verified embed sources (FlixCloud HD-1 & HD-2 with ?a=1 for Dub)
  const availableSources = sortedServers.map((s: any, idx: number) => {
    const isServerDub = ['dub', 's-dub'].includes(s.dataType?.toLowerCase());
    const finalUrl = isServerDub
      ? `${s.dataLink}${s.dataLink.includes('?') ? '&' : '?'}a=1`
      : s.dataLink;

    const serverDisplayName = s.serverName || `HD-${idx + 1}`;
    const label = `ReAnime ${serverDisplayName} (${(s.dataType || 'sub').toUpperCase()})`;

    return {
      label,
      url: finalUrl,
      type: 'embed',
      serverName: label,
      serverId: `reanime-${serverDisplayName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      isDub: isServerDub,
      headers: { Referer: `${BASE}/` },
    };
  });

  return {
    provider: 'direct-hls',
    sources: availableSources,
    subtitles: [],
    hasSub,
    hasDub,
  };
}

async function resolveSenshi(
  malId: number | string,
  epNum: number,
  isDub: boolean,
  {
    fetchImpl = fetch,
    signal = null,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  }: {
    fetchImpl?: typeof fetch;
    signal?: AbortSignal | null;
    timeoutMs?: number;
  } = {}
) {
  if (!malId) throw new Error('No MAL ID available for Senshi resolver');

  const BASE = 'https://senshi.to';
  const H = { 'User-Agent': USER_AGENT, Referer: `${BASE}/` };

  const embeds = await fetchJson(
    fetchImpl,
    `${BASE}/episode-embeds/${malId}/${epNum}`,
    { headers: H },
    timeoutMs,
    signal,
    'Senshi embed request'
  );
  if (!Array.isArray(embeds) || embeds.length === 0) {
    throw new Error('Senshi returned empty embeds');
  }

  const targetStatus = isDub ? 'dub' : 'hardsub';
  const matching = embeds.find((embed: any) => (embed.status || '').toLowerCase().includes(targetStatus)) || embeds[0];
  const remoteSourceId = matching?.remote_source_id;

  if (remoteSourceId) {
    try {
      const vidSources = await fetchJson(
        fetchImpl,
        `https://s.vidcloud.se/_v1/sources?id=${encodeURIComponent(remoteSourceId)}`,
        {
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/json,*/*',
            Origin: BASE,
            Referer: `${BASE}/`,
          },
        },
        timeoutMs,
        signal,
        'Senshi vidcloud request'
      );
      const primary = vidSources?.[0];
      if (primary?.source?.src) {
        const subtitles = (primary.tracks || [])
          .filter((track: any) => track?.vtt_url && track?.label?.toLowerCase() !== 'chapter')
          .map((track: any) => ({
            url: track.vtt_url,
            language: track.label?.toLowerCase()?.startsWith('eng') ? 'en' : track.label?.toLowerCase(),
            label: track.label,
            default: Boolean(track.default),
            format: 'vtt',
          }));

        return {
          provider: 'senshi',
          sources: [
            {
              url: primary.source.src,
              type: 'hls',
              quality: primary.source.quality || '1080p',
              headers: {
                Referer: `${BASE}/`,
                Origin: BASE,
                'User-Agent': USER_AGENT,
              },
            },
          ],
          subtitles,
        };
      }
    } catch {
      // ignore
    }
  }

  if (matching?.url) {
    return {
      provider: 'senshi',
      sources: [
        {
          url: matching.url,
          type: 'hls',
          headers: { Referer: `${BASE}/` },
        },
      ],
      subtitles: [],
    };
  }

  throw new Error('No playable source resolved from Senshi');
}

export async function getAniZipMappings(
  anilistId: number | string,
  {
    fetchImpl = fetch,
    signal = null,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  }: {
    fetchImpl?: typeof fetch;
    signal?: AbortSignal | null;
    timeoutMs?: number;
  } = {}
) {
  if (!anilistId) return null;
  const key = String(anilistId);
  const cached = mappingCache.get(key);
  if (cached) return cached;

  try {
    const mappings = await fetchJson(
      fetchImpl,
      `https://api.ani.zip/mappings?anilist_id=${encodeURIComponent(anilistId)}`,
      { headers: { 'User-Agent': USER_AGENT } },
      timeoutMs,
      signal,
      'AniZip mapping request'
    );
    if (mappings?.mappings) {
      mappingCache.set(key, mappings.mappings);
      return mappings.mappings;
    }
  } catch {
    // ignore
  }

  try {
    const data = await fetchJson(
      fetchImpl,
      'https://graphql.anilist.co',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
        body: JSON.stringify({
          query:
            'query mediaQuery($id: Int) { Media(id: $id) { id idMal title { romaji english native } countryOfOrigin externalLinks { site url type } streamingEpisodes { title url site } } }',
          variables: { id: Number(anilistId) },
        }),
      },
      timeoutMs,
      signal,
      'AniList mapping request'
    );
    const media = data?.data?.Media;
    if (media) {
      const fallbackMapping = {
        anilist_id: anilistId,
        mal_id: media.idMal,
        title: media.title,
        countryOfOrigin: media.countryOfOrigin,
        externalLinks: media.externalLinks || [],
        streamingEpisodes: media.streamingEpisodes || [],
      };
      mappingCache.set(key, fallbackMapping);
      return fallbackMapping;
    }
  } catch {
    // ignore
  }

  return null;
}

export function buildProxyUrl(url: string, headers: Record<string, string> = {}, pk = '', isDub = false): string {
  if (!url || typeof url !== 'string') return '';
  if (!/^https?:\/\//i.test(url) || url.startsWith('/api/proxy/stream')) return url;

  const params = new URLSearchParams();
  params.set('url', url);
  if (headers && Object.keys(headers).length > 0) {
    params.set('headers', JSON.stringify(headers));
  }
  if (pk) {
    params.set('pk', pk);
  }
  if (isDub) {
    params.set('dub', '1');
  }
  return `/api/proxy/stream?${params.toString()}`;
}

export interface ResolveStreamingParams {
  animeId?: number | string;
  episode?: number | string;
  isDub?: boolean;
  malId?: number | string | null;
  tmdbId?: number | string | null;
  title?: string | null;
  nativeTitle?: string | null;
  country?: string | null;
}

export async function resolveStreamingSources({
  animeId,
  episode = 1,
  isDub = false,
  malId = null,
  tmdbId = null,
  title = null,
  nativeTitle = null,
  country = null,
}: ResolveStreamingParams) {
  const epNum = Number(episode) || 1;
  const isDonghuaInitial = country === 'CN' || (typeof nativeTitle === 'string' && /[\u4e00-\u9fa5]/.test(nativeTitle));
  const cacheKey = `${animeId || tmdbId}:${epNum}:${isDub ? 'dub' : 'sub'}`;
  const cached = readStreamCache(cacheKey, Date.now());
  if (cached) return cached;

  const resolutionDeadline = createDeadline(DEFAULT_RESOLUTION_TIMEOUT_MS, null);
  let discoveredMalId = malId;
  let discoveredTmdbId = tmdbId;
  let isDonghua = isDonghuaInitial;
  let resolvedAnimeId = animeId;

  try {
    // 0. Auto-discover AniList ID if only TMDB ID or title is provided
    if ((!resolvedAnimeId || Number(resolvedAnimeId) <= 0) && (title || tmdbId)) {
      try {
        let searchTitle = title;
        if (!searchTitle && tmdbId && process.env.TMDB_API_KEY) {
          const tmdbRes = await fetchJson(
            fetch,
            `https://api.tmdb.org/3/tv/${tmdbId}?api_key=${process.env.TMDB_API_KEY}`,
            {},
            2000,
            resolutionDeadline.signal
          ).catch(() => null);
          if (tmdbRes) searchTitle = tmdbRes.name || tmdbRes.original_name;
        }
        if (searchTitle) {
          const alData = await fetchJson(
            fetch,
            'https://graphql.anilist.co',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
              body: JSON.stringify({
                query: 'query ($search: String) { Media(search: $search, type: ANIME) { id idMal countryOfOrigin } }',
                variables: { search: searchTitle },
              }),
            },
            2500,
            resolutionDeadline.signal
          ).catch(() => null);
          if (alData?.data?.Media?.id) {
            resolvedAnimeId = alData.data.Media.id;
            if (!discoveredMalId && alData.data.Media.idMal) discoveredMalId = alData.data.Media.idMal;
            if (alData.data.Media.countryOfOrigin === 'CN') isDonghua = true;
          }
        }
      } catch {}
    }

    // 1. If not Donghua and animeId exists, attempt Reanime direct HLS
    if (!isDonghua && resolvedAnimeId && Number(resolvedAnimeId) > 0) {
      try {
        const reanimeResult = await resolveReanime(resolvedAnimeId, epNum, isDub, {
          signal: resolutionDeadline.signal,
          timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
        });

        if (reanimeResult?.sources?.length) {
          const primarySource = reanimeResult.sources[0];

          const payload = {
            success: true,
            provider: 'direct-hls',
            primaryUrl: primarySource.url,
            rawUrl: primarySource.url,
            isHls: false,
            sources: reanimeResult.sources,
            subtitles: reanimeResult.subtitles || [],
            skipTimestamps: undefined,
            hasSub: reanimeResult.hasSub,
            hasDub: reanimeResult.hasDub,
            isDonghua: false,
          };

          writeStreamCache(cacheKey, payload, Date.now());
          return payload;
        }
      } catch (err) {
        console.warn('[DEBUG resolveReanime ERROR]', err);
        // Reanime failed, continue to Senshi or Donghua fallback
      }
    }

    // 2. Discover mappings (AniZip / AniList) for MAL ID and TMDB ID
    if (animeId && Number(animeId) > 0 && (!discoveredMalId || !discoveredTmdbId)) {
      try {
        const mappings = await getAniZipMappings(animeId, {
          signal: resolutionDeadline.signal,
          timeoutMs: 2000,
        });
        if (mappings?.mal_id && !discoveredMalId) discoveredMalId = mappings.mal_id;
        if (mappings?.themoviedb_id && !discoveredTmdbId) discoveredTmdbId = mappings.themoviedb_id;
        if (mappings?.countryOfOrigin === 'CN') isDonghua = true;
      } catch {}
    }

    // 3. Attempt Senshi if MAL ID is available and not Donghua
    if (!isDonghua && discoveredMalId) {
      try {
        const senshiResult = await resolveSenshi(discoveredMalId, epNum, isDub, {
          signal: resolutionDeadline.signal,
          timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
        });

        if (senshiResult?.sources?.length) {
          const primarySource = senshiResult.sources[0];
          const payload = {
            success: true,
            provider: 'senshi',
            primaryUrl: buildProxyUrl(primarySource.url, primarySource.headers || {}, '', isDub),
            rawUrl: primarySource.url,
            isHls: true,
            sources: senshiResult.sources.map((s: any) => ({
              ...s,
              proxyUrl: buildProxyUrl(s.url, s.headers || {}, '', isDub),
            })),
            subtitles: senshiResult.subtitles || [],
            hasSub: true,
            hasDub: isDub,
            isDonghua: false,
          };

          writeStreamCache(cacheKey, payload, Date.now());
          return payload;
        }
      } catch {}
    }

    // 4. Donghua or Anime Embed Fallback via TMDB ID
    if (discoveredTmdbId) {
      const vidSrcSuUrl = `https://vidsrc.su/embed/tv/${discoveredTmdbId}/${1}/${epNum}`;
      const vidSrcPmUrl = `https://vidsrc.pm/embed/tv/${discoveredTmdbId}/${1}/${epNum}`;
      const autoEmbedUrl = `https://autoembed.co/tv/tmdb/${discoveredTmdbId}-1-${epNum}`;
      const twoEmbedUrl = `https://www.2embed.cc/embedtv/${discoveredTmdbId}&s=1&e=${epNum}`;

      const payload = {
        success: true,
        provider: 'vidsrc-su',
        primaryUrl: vidSrcSuUrl,
        rawUrl: vidSrcSuUrl,
        isHls: false,
        sources: [
          { url: vidSrcSuUrl, type: 'embed', serverName: 'VidSrc SU (HD-1)', serverId: 'vidsrc-su' },
          { url: vidSrcPmUrl, type: 'embed', serverName: 'VidSrc PM (HD-2)', serverId: 'vidsrc-pm' },
          { url: autoEmbedUrl, type: 'embed', serverName: 'AutoEmbed (HD-3)', serverId: 'autoembed' },
          { url: twoEmbedUrl, type: 'embed', serverName: '2Embed (HD-4)', serverId: '2embed' },
        ],
        subtitles: [],
        hasSub: true,
        hasDub: false,
        isDonghua,
      };

      writeStreamCache(cacheKey, payload, Date.now());
      return payload;
    }

    return {
      success: false,
      error: isDonghua
        ? `Donghua episode ${epNum} source is resolving. Please try another server or episode.`
        : `Unable to resolve playable stream for episode ${epNum}.`,
      sources: [],
      subtitles: [],
      isDonghua,
    };
  } finally {
    resolutionDeadline.cancel();
  }
}
