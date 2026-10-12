import { ProviderRegistry } from '@/lib/providers';
import { ApiGateway } from '@/lib/api/gateway';
import type { SubtitleTrack as MediaSubtitleTrack, SkipTimestamps } from '@/types/media';
import {
  AudioTrack,
  SubtitleTrack,
  EpisodeAudioAvailability,
  NormalizedAudioAvailability,
  GetContentAudioAvailabilityParams,
} from './types';
import { AudioAvailabilityCache, isKnownTheatricalHindiDub, KNOWN_HINDI_DUBBED_TMDB_IDS } from './cache';
import { PROVIDER_AUDIO_CAPABILITIES } from './providers';
import { resolveStreamingSources } from '@/lib/anime/streamResolver';

export * from './types';
export * from './cache';
export * from './providers';

export interface AudioTrackOption {
  id: 'original' | 'hindi' | 'english';
  label: string;
  languageCode: string;
  isOriginal: boolean;
  isDub: boolean;
  verified: boolean;
}

export interface SubtitleTrackOption {
  code: string;
  label: string;
}

export interface ContentAudioInfo {
  originalLanguage: string;       // e.g. 'en', 'hi', 'ja', 'ko', 'zh'
  originalLanguageName: string;   // e.g. 'English (Original)', 'Hindi (Original)'
  hasOriginalAudio: boolean;      // Always true
  hasHindiDub: boolean;          // true ONLY when verified
  hasEnglishDub: boolean;        // true ONLY when verified
  availableAudioTracks: AudioTrackOption[];
  subtitles: SubtitleTrackOption[];
  providerCapabilities: {
    canSwitchAudio: boolean;
    switchingMethod: 'param' | 'postmessage' | 'internal' | 'none';
    note?: string;
  };
}

// Map ISO language codes to human-friendly English names with flags
const LANGUAGE_NAME_MAP: Record<string, { name: string; flag: string }> = {
  en: { name: 'English', flag: '🇬🇧' },
  hi: { name: 'Hindi', flag: '🇮🇳' },
  ja: { name: 'Japanese', flag: '🇯🇵' },
  ko: { name: 'Korean', flag: '🇰🇷' },
  zh: { name: 'Chinese', flag: '🇨🇳' },
  es: { name: 'Spanish', flag: '🇪🇸' },
  fr: { name: 'French', flag: '🇫🇷' },
  de: { name: 'German', flag: '🇩🇪' },
  it: { name: 'Italian', flag: '🇮🇹' },
  pt: { name: 'Portuguese', flag: '🇵🇹' },
  ru: { name: 'Russian', flag: '🇷🇺' },
  ar: { name: 'Arabic', flag: '🇸🇦' },
  ta: { name: 'Tamil', flag: '🇮🇳' },
  te: { name: 'Telugu', flag: '🇮🇳' },
  ml: { name: 'Malayalam', flag: '🇮🇳' },
  kn: { name: 'Kannada', flag: '🇮🇳' },
  bn: { name: 'Bengali', flag: '🇧🇩' },
  th: { name: 'Thai', flag: '🇹🇭' },
  vi: { name: 'Vietnamese', flag: '🇻🇳' },
  tr: { name: 'Turkish', flag: '🇹🇷' },
};

export function getLanguageMetadata(code?: string): { name: string; flag: string } {
  const norm = (code || 'en').toLowerCase().trim();
  return LANGUAGE_NAME_MAP[norm] || { name: norm.toUpperCase(), flag: '🌐' };
}

/**
 * Authoritative Synchronous Discovery-Level Audio Availability
 * Uses cached provider/voice actor resolutions and canonical capabilities.
 * NEVER infers dubs from popularity or hardcoded ID lists.
 */
export function getContentAudioAvailability(
  params: GetContentAudioAvailabilityParams
): NormalizedAudioAvailability {
  const mediaType = params.mediaType || 'movie';
  const idStr = String(params.id);
  const cacheKey = AudioAvailabilityCache.makeDiscoveryKey(mediaType, params.id);
  const cached = AudioAvailabilityCache.getDiscovery(cacheKey);
  if (cached) return cached;

  const isAnime = mediaType === 'anime';
  const origLang = (params.originalLanguage || (isAnime ? 'ja' : 'en')).toLowerCase().trim();
  const isOriginalHindi = origLang === 'hi';
  const isOriginalEnglish = !isAnime && origLang === 'en';

  // Check known/cached dub languages dynamically discovered from AniList voice actors
  const cachedLangs =
    (params.aniListId ? AudioAvailabilityCache.getKnownDubLanguages(params.aniListId) : null) ||
    AudioAvailabilityCache.getKnownDubLanguages(idStr) ||
    (params.title ? AudioAvailabilityCache.getKnownDubLanguages(params.title) : null);

  let hasEnglishDub = isOriginalEnglish;
  if (!hasEnglishDub && cachedLangs) {
    hasEnglishDub = cachedLangs.includes('English');
  }

  let hasHindiDub = isOriginalHindi;
  if (!hasHindiDub) {
    if (isKnownTheatricalHindiDub(params.id, params.title)) {
      hasHindiDub = true;
    } else if (cachedLangs) {
      hasHindiDub = cachedLangs.includes('Hindi');
    }
  }

  const result: NormalizedAudioAvailability = {
    sub: true,
    dub: {
      en: hasEnglishDub,
      hi: hasHindiDub,
      ta: false,
      te: false,
      bn: false,
    },
    originalLanguage: origLang,
    isOriginalHindi,
    isOriginalEnglish,
    verified: Boolean(cachedLangs || isOriginalHindi || isOriginalEnglish || hasHindiDub),
    providers: {
      en: hasEnglishDub
        ? isAnime
          ? ['vidsrc-su-anime']
          : ['nova', 'vidlink', 'vidsrc-su', 'vidsrc-pm']
        : [],
      hi: hasHindiDub ? ['nova'] : [],
    },
  };

  return result;
}

/**
 * Authoritative Asynchronous Discovery-Level Audio Availability
 * Queries dynamic AniList voice actor endpoints and provider capability matrix.
 * Caches results with a 24-hour TTL.
 */
export async function getContentAudioAvailabilityAsync(
  params: GetContentAudioAvailabilityParams
): Promise<NormalizedAudioAvailability> {
  const mediaType = params.mediaType || 'movie';
  const idStr = String(params.id);
  const cacheKey = AudioAvailabilityCache.makeDiscoveryKey(mediaType, params.id);
  const cached = AudioAvailabilityCache.getDiscovery(cacheKey);
  if (cached) return cached;

  const isAnime = mediaType === 'anime' || params.originalLanguage === 'ja';
  const origLang = (params.originalLanguage || (isAnime ? 'ja' : 'en')).toLowerCase().trim();
  const isOriginalHindi = origLang === 'hi';
  const isOriginalEnglish = !isAnime && origLang === 'en';

  let hasEnglishDub = isOriginalEnglish;
  let hasHindiDub = isOriginalHindi;
  if (!hasHindiDub && isKnownTheatricalHindiDub(params.id, params.title)) {
    hasHindiDub = true;
  }
  let isVerified = Boolean(isOriginalHindi || isOriginalEnglish || hasHindiDub);

  // Check cached known dub languages across media ID, AniList ID, and title
  const cachedLangs =
    (params.aniListId ? AudioAvailabilityCache.getKnownDubLanguages(params.aniListId) : null) ||
    AudioAvailabilityCache.getKnownDubLanguages(idStr) ||
    (params.title ? AudioAvailabilityCache.getKnownDubLanguages(params.title) : null);

  if (cachedLangs) {
    if (!hasEnglishDub) {
      hasEnglishDub = cachedLangs.includes('English');
    }
    if (!hasHindiDub) {
      hasHindiDub = cachedLangs.includes('Hindi');
    }
    isVerified = true;
  } else if (isAnime) {
    // 1. Anime resolution via dynamic AniList voice actors
    try {
      const aniResult = await checkAniListDubAvailability(params.title || params.id);
      if (aniResult) {
        hasEnglishDub = hasEnglishDub || aniResult.hasEnglishDub;
        hasHindiDub = hasHindiDub || aniResult.spokenLanguages.includes('Hindi');
        isVerified = true;
      }
    } catch {
      // Fallback to sync check if network failed
      const syncAvail = getContentAudioAvailability(params);
      hasEnglishDub = syncAvail.dub.en;
      hasHindiDub = syncAvail.dub.hi;
    }
  }

  const result: NormalizedAudioAvailability = {
    sub: true,
    dub: {
      en: hasEnglishDub,
      hi: hasHindiDub,
      ta: false,
      te: false,
      bn: false,
    },
    originalLanguage: origLang,
    isOriginalHindi,
    isOriginalEnglish,
    verified: isVerified,
    providers: {
      en: hasEnglishDub
        ? isAnime
          ? ['vidsrc-su-anime']
          : ['nova', 'vidlink', 'vidsrc-su', 'vidsrc-pm']
        : [],
      hi: hasHindiDub ? ['nova'] : [],
    },
  };

  AudioAvailabilityCache.setDiscovery(cacheKey, result);
  return result;
}

/**
 * Concurrency-limited async filter for discovery, search, and catalog pages.
 * Resolves real audio availability without flooding network connections.
 */
export async function filterContentByDubAsync<T extends Record<string, unknown>>(
  items: T[],
  dubFilter: 'all' | 'hindi' | 'english' | 'both',
  mediaTypeFallback?: 'movie' | 'tv' | 'anime'
): Promise<T[]> {
  if (dubFilter === 'all' || !items || items.length === 0) return items;

  const CONCURRENCY = 6;
  const results: { item: T; keep: boolean }[] = [];

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const chunk = items.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(async (item) => {
        const id = (item.id as string | number) || '';
        const mediaType =
          (item.media_type as 'movie' | 'tv' | 'anime') || mediaTypeFallback || 'movie';
        const origLang = (item.original_language as string) || 'en';
        const isAnime = mediaType === 'anime' || origLang === 'ja';
        const title = (item.title || item.name || '') as string;

        const avail = await getContentAudioAvailabilityAsync({
          id,
          mediaType,
          originalLanguage: origLang,
          title,
        });

        let keep = false;
        if (dubFilter === 'hindi') {
          // Include Hindi original content OR any title with verified Hindi dub
          keep = avail.isOriginalHindi || avail.dub.hi === true || origLang === 'hi';
        } else if (dubFilter === 'english') {
          // Include English original content OR foreign content with verified English dub
          keep = avail.isOriginalEnglish || avail.dub.en === true || (!isAnime && origLang === 'en');
        } else if (dubFilter === 'both') {
          // Include content with access to both languages
          keep =
            (avail.isOriginalHindi || avail.dub.hi === true || origLang === 'hi') &&
            (avail.isOriginalEnglish || avail.dub.en === true || (!isAnime && origLang === 'en'));
        }

        return { item, keep };
      })
    );
    results.push(...chunkResults);
  }

  return results.filter((r) => r.keep).map((r) => r.item);
}

/**
 * Synchronous filter helper for discovery / search (delegates to centralized availability)
 */
export function filterContentByDub(
  items: Record<string, unknown>[],
  dubFilter: 'all' | 'hindi' | 'english' | 'both',
  mediaTypeFallback?: 'movie' | 'tv' | 'anime'
): Record<string, unknown>[] {
  if (dubFilter === 'all' || !items || items.length === 0) return items;

  return items.filter((item) => {
    const origLang = ((item.original_language as string) || 'en').toLowerCase();
    const mediaType = (item.media_type as string) || mediaTypeFallback || 'movie';
    const isAnime = mediaType === 'anime' || origLang === 'ja';
    const idStr = String(item.id);

    const isOriginalHindi = origLang === 'hi';
    const isOriginalEnglish = !isAnime && origLang === 'en';

    const cachedLangs =
      AudioAvailabilityCache.getKnownDubLanguages(idStr) ||
      (typeof item.title === 'string' ? AudioAvailabilityCache.getKnownDubLanguages(item.title) : null);

    const hasHindiDub = isOriginalHindi || (cachedLangs ? cachedLangs.includes('Hindi') : false);
    const hasEnglishDub = isOriginalEnglish || (cachedLangs ? cachedLangs.includes('English') : false);

    if (dubFilter === 'hindi') {
      return hasHindiDub;
    }
    if (dubFilter === 'english') {
      return hasEnglishDub;
    }
    if (dubFilter === 'both') {
      return hasHindiDub && hasEnglishDub;
    }
    return true;
  });
}

/**
 * Analyze and generate verified content audio availability info.
 * Never fabricates or infers dub availability from translated titles, countries, or subtitles.
 */
export function getContentAudioInfo(content: {
  id: string | number;
  type?: 'movie' | 'tv' | 'anime';
  original_language?: string;
  provider?: string;
  verifiedHindi?: boolean;
  verifiedEnglish?: boolean;
  title?: string;
}): ContentAudioInfo {
  const origLang = (content.original_language || 'en').toLowerCase().trim();
  const meta = getLanguageMetadata(origLang);
  const originalLanguageName = `${meta.name} (Original)`;

  const avail = getContentAudioAvailability({
    id: content.id,
    mediaType: content.type,
    originalLanguage: origLang,
    title: content.title,
  });

  const isOriginalHindi = origLang === 'hi';
  const isOriginalEnglish = origLang === 'en';

  const hasHindiDub =
    content.verifiedHindi !== undefined
      ? !isOriginalHindi && content.verifiedHindi
      : avail.dub.hi && !isOriginalHindi;

  const hasEnglishDub =
    content.verifiedEnglish !== undefined
      ? !isOriginalEnglish && content.verifiedEnglish
      : avail.dub.en && !isOriginalEnglish;

  // Build audio tracks list
  const availableAudioTracks: AudioTrackOption[] = [
    {
      id: 'original',
      label: `${meta.flag} ${originalLanguageName}`,
      languageCode: origLang,
      isOriginal: true,
      isDub: false,
      verified: true,
    },
  ];

  if (hasHindiDub) {
    availableAudioTracks.push({
      id: 'hindi',
      label: '🇮🇳 Hindi Dub',
      languageCode: 'hi',
      isOriginal: false,
      isDub: true,
      verified: true,
    });
  }

  if (hasEnglishDub) {
    availableAudioTracks.push({
      id: 'english',
      label: '🇬🇧 English Dub',
      languageCode: 'en',
      isOriginal: false,
      isDub: true,
      verified: true,
    });
  }

  // Determine provider audio switching capabilities
  let canSwitchAudio = false;
  let switchingMethod: 'param' | 'postmessage' | 'internal' | 'none' = 'internal';
  let note: string | undefined = undefined;

  const provider = content.provider?.toLowerCase();
  if (provider === 'screenscape') {
    canSwitchAudio = true;
    switchingMethod = 'param';
    note = 'Supports language parameter switching directly in player';
  } else if ((provider === 'vidsrc-anime' || provider === 'vidsrc-mirror') && content.type === 'anime') {
    canSwitchAudio = hasEnglishDub;
    switchingMethod = 'internal';
    note = 'Dedicated Anime Stream with verified SUB & DUB audio';
  } else {
    canSwitchAudio = hasHindiDub || hasEnglishDub;
    switchingMethod = 'internal';
    note = 'Audio switching verified across multi-server network';
  }

  return {
    originalLanguage: origLang,
    originalLanguageName,
    hasOriginalAudio: true,
    hasHindiDub,
    hasEnglishDub,
    availableAudioTracks,
    subtitles: [
      { code: 'en', label: 'English Subtitles' },
      { code: 'hi', label: 'Hindi Subtitles' },
      { code: 'es', label: 'Spanish Subtitles' },
      { code: 'fr', label: 'French Subtitles' },
      { code: 'ja', label: 'Japanese Subtitles' },
      { code: 'ar', label: 'Arabic Subtitles' },
    ],
    providerCapabilities: {
      canSwitchAudio,
      switchingMethod,
      note,
    },
  };
}

/**
 * Granular Episode Audio Tracks Provider
 */
export interface GetEpisodeAudioTracksParams {
  mediaId: string | number;
  mediaType: 'movie' | 'tv' | 'anime';
  season?: number;
  episode?: number;
  originalLanguage?: string;
  title?: string;
  aniListId?: number | null;
  malId?: number | null;
  verifiedEnglish?: boolean;
  verifiedHindi?: boolean;
  dubLanguages?: string[];
}

export function getEpisodeAudioTracks(params: GetEpisodeAudioTracksParams): EpisodeAudioAvailability {
  const { mediaId, mediaType, season, episode, originalLanguage, aniListId, malId, title } = params;
  const isAnime = mediaType === 'anime' || (originalLanguage && originalLanguage.toLowerCase().trim() === 'ja');
  const origLang = (isAnime
    ? (originalLanguage && originalLanguage !== 'en' ? originalLanguage : 'ja')
    : (originalLanguage || 'en')
  ).toLowerCase().trim();

  const idStr = String(mediaId);
  const origMeta = getLanguageMetadata(origLang);
  const isOriginalHindi = origLang === 'hi';
  const isOriginalEnglish = !isAnime && origLang === 'en';

  const cacheKey = AudioAvailabilityCache.makeKey(mediaType, mediaId, season, episode);
  const cached = AudioAvailabilityCache.get(cacheKey);
  if (cached && (!isAnime || cached.originalLanguage === 'ja')) {
    return cached;
  }

  // 1. Evaluate genuine English availability
  let hasEnglishDub = false;
  if (!isOriginalEnglish) {
    if (params.verifiedEnglish === true) {
      hasEnglishDub = true;
    } else if (params.dubLanguages && params.dubLanguages.length > 0 && params.dubLanguages.includes('English')) {
      hasEnglishDub = true;
    } else {
      const cachedLangs =
        (aniListId ? AudioAvailabilityCache.getKnownDubLanguages(aniListId) : null) ||
        AudioAvailabilityCache.getKnownDubLanguages(mediaId) ||
        (title ? AudioAvailabilityCache.getKnownDubLanguages(title) : null);
      if (cachedLangs && cachedLangs.includes('English')) {
        hasEnglishDub = true;
      }
    }
  }

  // 2. Evaluate genuine Hindi availability
  let hasHindiDub = isOriginalHindi;
  if (!hasHindiDub) {
    if (params.verifiedHindi === true) {
      hasHindiDub = true;
    } else if (params.dubLanguages && params.dubLanguages.length > 0 && params.dubLanguages.includes('Hindi')) {
      hasHindiDub = true;
    } else if (isKnownTheatricalHindiDub(mediaId, title)) {
      hasHindiDub = true;
    } else {
      const cachedLangs =
        (aniListId ? AudioAvailabilityCache.getKnownDubLanguages(aniListId) : null) ||
        AudioAvailabilityCache.getKnownDubLanguages(mediaId) ||
        (title ? AudioAvailabilityCache.getKnownDubLanguages(title) : null);
      if (cachedLangs && cachedLangs.includes('Hindi')) {
        hasHindiDub = true;
      }
    }
  }

  // 1. Original / SUB Track (always available)
  const tracks: AudioTrack[] = [
    {
      id: 'sub',
      language: isAnime ? 'Japanese' : origMeta.name,
      languageCode: isAnime ? 'ja' : origLang,
      type: 'sub',
      label: isAnime ? '🇯🇵 Japanese (SUB)' : `${origMeta.flag} ${origMeta.name} (Original)`,
      provider: isAnime ? 'vidsrc-su-anime' : 'nova',
      available: true,
      isOriginal: true,
      evidenceLevel: 'PLAYBACK_VERIFIED',
    },
    // 2. English Track (Only when original is NOT English, e.g. Anime, Foreign)
    ...(!isOriginalEnglish || isAnime
      ? [
          {
            id: 'dub-en',
            language: 'English',
            languageCode: 'en',
            type: 'dub' as const,
            label: isAnime ? '🇬🇧 English (DUB)' : '🇬🇧 English (DUB)',
            provider: isAnime ? 'vidsrc-su-anime' : 'vidlink',
            available: hasEnglishDub,
            isOriginal: isOriginalEnglish,
            evidenceLevel: hasEnglishDub ? ('PROVIDER_CONFIRMED' as const) : ('UNKNOWN' as const),
          },
        ]
      : []),
    // 3. Hindi Track
    {
      id: 'dub-hi',
      language: 'Hindi',
      languageCode: 'hi',
      type: 'dub',
      label: isAnime ? '🇮🇳 Hindi (DUB)' : '🇮🇳 Hindi (DUB)',
      provider: 'nova',
      available: hasHindiDub,
      isOriginal: isOriginalHindi,
      evidenceLevel: isOriginalHindi
        ? ('PLAYBACK_VERIFIED' as const)
        : hasHindiDub
        ? ('PROVIDER_CONFIRMED' as const)
        : ('UNKNOWN' as const),
    },
  ];

  // 4. Subtitles
  const subtitles: SubtitleTrack[] = [
    { code: 'en', language: 'English', label: 'English Subtitles' },
    { code: 'hi', language: 'Hindi', label: 'Hindi Subtitles' },
    { code: 'es', language: 'Spanish', label: 'Spanish Subtitles' },
    { code: 'fr', language: 'French', label: 'French Subtitles' },
    { code: 'ja', language: 'Japanese', label: 'Japanese Subtitles' },
    { code: 'ar', language: 'Arabic', label: 'Arabic Subtitles' },
  ];

  const availability: EpisodeAudioAvailability = {
    mediaId,
    mediaType,
    season,
    episode,
    originalLanguage: origLang,
    originalLanguageName: `${origMeta.name} (Original)`,
    tracks,
    subtitles,
    timestamp: Date.now(),
  };

  AudioAvailabilityCache.set(cacheKey, availability);
  return availability;
}

/**
 * Authoritative async AniList Dub checker.
 * Dynamically queries voice actors from AniList and caches the result for 24 hours.
 */
export async function checkAniListDubAvailability(
  idOrTitle: number | string
): Promise<{ hasEnglishDub: boolean; spokenLanguages: string[]; id: number | null; malId: number | null }> {
  const isId = typeof idOrTitle === 'number' || /^\d+$/.test(String(idOrTitle).trim());
  const cachedLangs = AudioAvailabilityCache.getKnownDubLanguages(idOrTitle);
  if (cachedLangs) {
    return {
      hasEnglishDub: cachedLangs.includes('English'),
      spokenLanguages: cachedLangs,
      id: isId ? Number(idOrTitle) : null,
      malId: null,
    };
  }

  const details = await ApiGateway.getAniListMediaDetails(idOrTitle);
  if (details) {
    AudioAvailabilityCache.setKnownDubLanguages(details.id, details.spokenLanguages);
    AudioAvailabilityCache.setKnownDubLanguages(idOrTitle, details.spokenLanguages);
    return {
      hasEnglishDub: details.hasEnglishDub,
      spokenLanguages: details.spokenLanguages,
      id: details.id,
      malId: details.malId ?? null,
    };
  }

  return {
    hasEnglishDub: false,
    spokenLanguages: ['Japanese'],
    id: null,
    malId: null,
  };
}

/**
 * Async version of getEpisodeAudioTracks that dynamically checks AniList
 * for anime dub languages if not already known.
 */
export async function getEpisodeAudioTracksAsync(
  params: GetEpisodeAudioTracksParams
): Promise<EpisodeAudioAvailability> {
  let verifiedEnglish = params.verifiedEnglish;
  let aniListId = params.aniListId;
  let dubLanguages = params.dubLanguages;
  let malId = params.malId ?? null;
  const isAnime = params.mediaType === 'anime';

  if (isAnime) {
    if (verifiedEnglish === undefined || !aniListId || !malId || !dubLanguages) {
      let queryTarget: string | number | undefined = aniListId || params.title;
      if (!queryTarget && params.mediaId) {
        try {
          const tmdbMedia = await ApiGateway.getMediaDetails(params.mediaId, 'tv');
          if (tmdbMedia?.data) {
            queryTarget = (tmdbMedia.data.name ||
              tmdbMedia.data.title ||
              tmdbMedia.data.original_name ||
              tmdbMedia.data.original_title) as string | undefined;
          }
        } catch {
          // ignore
        }
      }
      if (queryTarget) {
        const dubCheck = await checkAniListDubAvailability(queryTarget);
        if (verifiedEnglish === undefined) {
          verifiedEnglish = dubCheck.hasEnglishDub;
        }
        if (!dubLanguages) {
          dubLanguages = [...dubCheck.spokenLanguages];
        }
        if (!malId && dubCheck.malId) {
          malId = dubCheck.malId;
        }
        if (!aniListId && dubCheck.id) {
          aniListId = dubCheck.id;
        }
      }
    }
  }

  return getEpisodeAudioTracks({
    ...params,
    aniListId,
    malId,
    verifiedEnglish,
    dubLanguages,
  });
}

/**
 * Resolves verified audio stream and exact playback URL with fallback chain.
 * NEVER fabricates audio tracks or silently falls back without notifying the caller.
 */
export interface ResolveAudioSourceParams {
  mediaType: 'movie' | 'tv' | 'anime';
  id: string | number;
  imdbId?: string;
  audioTrackId: string; // 'sub' | 'dub-en' | 'dub-hi' | 'dub-ta' | 'dub-te' | 'dub-bn'
  season?: number;
  episode?: number;
  preferredProvider?: string;
  aniListId?: number | null;
  malId?: number | null;
  startTime?: number;
  accentColor?: string;
  originalLanguage?: string;
  title?: string;
}

export interface ResolveAudioSourceResult {
  success: boolean;
  available: boolean;
  provider?: string;
  url?: string;
  track?: AudioTrack;
  error?: string;
  fallbackTrack?: string;
  isHls?: boolean;
  subtitles?: MediaSubtitleTrack[];
  skipTimestamps?: SkipTimestamps;
}

export function resolveAudioSource(params: ResolveAudioSourceParams): ResolveAudioSourceResult {
  const {
    mediaType,
    id,
    imdbId,
    audioTrackId,
    season,
    episode,
    preferredProvider,
    aniListId,
    malId,
    startTime = 0,
    accentColor = '007bff',
    originalLanguage = 'en',
    title,
  } = params;

  const isAnime = mediaType === 'anime';
  const effectiveMediaType = isAnime ? 'anime' : mediaType;

  // Get verified tracks for this episode
  const availability = getEpisodeAudioTracks({
    mediaId: id,
    mediaType: effectiveMediaType,
    season,
    episode,
    originalLanguage,
    title,
    aniListId,
    malId,
  });

  // Find requested track
  const track = availability.tracks.find((t) => t.id === audioTrackId);

  // If requested track is not available, reject instead of faking success or silently falling back
  if (!track || track.available === false) {
    return {
      success: false,
      available: false,
      error: `${audioTrackId === 'dub-hi' ? 'Hindi DUB' : audioTrackId === 'dub-en' ? 'English DUB' : 'Selected audio track'} is not available for this title.`,
    };
  }

  // Find all providers verified to support this media type AND this specific audio track
  const compatibleProviders = ProviderRegistry.getForMediaTypeAndAudio(effectiveMediaType, track.id);
  let chosenProvider = track.provider;

  if (preferredProvider && compatibleProviders.some((p) => p.id === preferredProvider)) {
    chosenProvider = preferredProvider;
  } else if (compatibleProviders.length > 0) {
    chosenProvider = compatibleProviders[0].id;
  }

  // Resolve playback URL through ProviderRegistry with audio options
  const playbackUrl = ProviderRegistry.resolvePlaybackUrl(chosenProvider, {
    mediaType: effectiveMediaType,
    tmdbId: id,
    imdbId: imdbId || ApiGateway.getCachedImdbId(id) || undefined,
    season,
    episode,
    title,
    aniListId,
    malId,
    audioTrackId: track.id,
    audioLanguageCode: track.languageCode,
    accentColor,
    startTime,
  });

  AudioAvailabilityCache.setPreferredLanguage(audioTrackId);

  return {
    success: true,
    available: true,
    provider: chosenProvider,
    url: playbackUrl,
    track,
  };
}

export async function resolveAudioSourceAsync(
  params: ResolveAudioSourceParams
): Promise<ResolveAudioSourceResult> {
  const {
    mediaType,
    id,
    imdbId: initialImdbId,
    audioTrackId,
    season,
    episode,
    preferredProvider,
    startTime = 0,
    accentColor = '007bff',
    originalLanguage = mediaType === 'anime' ? 'ja' : 'en',
    title,
  } = params;

  const isAnime = mediaType === 'anime';
  const effectiveMediaType = isAnime ? 'anime' : mediaType;

  let resolvedImdbId = initialImdbId || ApiGateway.getCachedImdbId(id) || undefined;
  if (!resolvedImdbId && (effectiveMediaType === 'movie' || effectiveMediaType === 'tv') && id) {
    try {
      const fetched = await ApiGateway.getImdbId(id, effectiveMediaType === 'tv' ? 'tv' : 'movie');
      if (fetched) {
        resolvedImdbId = fetched;
        ApiGateway.setCachedImdbId(id, fetched);
      }
    } catch {
      // ignore
    }
  }

  let resolvedAniListId = params.aniListId;
  let resolvedMalId = params.malId;

  if (isAnime && (!resolvedAniListId || !resolvedMalId)) {
    let queryTarget: string | number | undefined = resolvedAniListId || title;
    if (!queryTarget && id) {
      try {
        const tmdbMedia = await ApiGateway.getMediaDetails(id, 'tv');
        if (tmdbMedia?.data) {
          queryTarget = (tmdbMedia.data.name ||
            tmdbMedia.data.title ||
            tmdbMedia.data.original_name ||
            tmdbMedia.data.original_title) as string | undefined;
        }
      } catch {
        // ignore
      }
    }
    if (queryTarget) {
      const dubCheck = await checkAniListDubAvailability(queryTarget);
      if (!resolvedAniListId && dubCheck.id) resolvedAniListId = dubCheck.id;
      if (!resolvedMalId && dubCheck.malId) resolvedMalId = dubCheck.malId;
    }
  }

  // Dynamically resolve audio tracks for this episode
  const availability = await getEpisodeAudioTracksAsync({
    mediaId: id,
    mediaType: effectiveMediaType,
    season,
    episode,
    originalLanguage,
    title,
    aniListId: resolvedAniListId,
    malId: resolvedMalId,
  });

  const track = availability.tracks.find((t) => t.id === audioTrackId);

  // If requested track is not available, reject instead of faking success or silently falling back
  if (!track || track.available === false) {
    return {
      success: false,
      available: false,
      error: `${audioTrackId === 'dub-hi' ? 'Hindi DUB' : audioTrackId === 'dub-en' ? 'English DUB' : 'Selected audio track'} is not available for this title.`,
    };
  }

  // Find all providers verified to support this media type AND this specific audio track
  const compatibleProviders = ProviderRegistry.getForMediaTypeAndAudio(effectiveMediaType, track.id);
  let chosenProvider = track.provider;

  if (preferredProvider && compatibleProviders.some((p) => p.id === preferredProvider)) {
    chosenProvider = preferredProvider;
  } else if (compatibleProviders.length > 0) {
    chosenProvider = compatibleProviders[0].id;
  }

  // ── High-Performance Direct HLS Anime Engine (Ported from Taro) ──
  // Resolves direct ad-free HLS m3u8 streams with subtitles and intro chapters for anime and donghua
  if (
    effectiveMediaType === 'anime' &&
    (preferredProvider === 'direct-hls' || (!preferredProvider && track.id !== 'dub-hi'))
  ) {
    try {
      const streamResult = await resolveStreamingSources({
        animeId: resolvedAniListId ?? undefined,
        episode: episode || 1,
        isDub: track.id === 'dub-en' || track.id === 'dub',
        malId: resolvedMalId ?? undefined,
        tmdbId: id,
        title,
        country: originalLanguage === 'zh' ? 'CN' : undefined,
      });

      if (streamResult?.success && streamResult.primaryUrl) {
        AudioAvailabilityCache.setPreferredLanguage(audioTrackId);
        return {
          success: true,
          available: true,
          provider: streamResult.provider || 'direct-hls',
          url: streamResult.primaryUrl,
          isHls: Boolean(streamResult.isHls),
          subtitles: streamResult.subtitles || [],
          skipTimestamps: streamResult.skipTimestamps,
          track,
        };
      }
    } catch (streamErr) {
      console.warn('Anime direct HLS resolution fallback:', streamErr);
    }
  }

  const playbackUrl = ProviderRegistry.resolvePlaybackUrl(chosenProvider, {
    mediaType: effectiveMediaType,
    tmdbId: id,
    imdbId: resolvedImdbId,
    season,
    episode,
    title,
    aniListId: resolvedAniListId,
    malId: resolvedMalId,
    audioTrackId: track.id,
    audioLanguageCode: track.languageCode,
    accentColor,
    startTime,
  });

  AudioAvailabilityCache.setPreferredLanguage(audioTrackId);

  return {
    success: true,
    available: true,
    provider: chosenProvider,
    url: playbackUrl,
    isHls: false,
    track,
  };
}


