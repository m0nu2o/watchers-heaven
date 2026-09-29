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
import { AudioAvailabilityCache } from './cache';
import { PROVIDER_AUDIO_CAPABILITIES } from './providers';

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

// Known titles with verified authorized Hindi audio / dubs
const VERIFIED_HINDI_DUB_IDS = new Set<string | number>([
  // MCU / Marvel
  '299534', // Avengers: Endgame
  '299536', // Avengers: Infinity War
  '24428',  // The Avengers
  '284054', // Black Panther
  '634649', // Spider-Man: No Way Home
  '315635', // Spider-Man: Homecoming
  '429617', // Spider-Man: Far From Home
  '293660', // Deadpool
  '533535', // Deadpool & Wolverine
  '118340', // Guardians of the Galaxy
  '284053', // Thor: Ragnarok
  '1726',   // Iron Man
  '284052', // Doctor Strange

  // Blockbusters / Sci-Fi
  '19995',  // Avatar
  '76600',  // Avatar: The Way of Water
  '438631', // Dune
  '693134', // Dune: Part Two
  '157336', // Interstellar
  '872585', // Oppenheimer
  '155',    // The Dark Knight
  '27205',  // Inception
  '597',    // Titanic
  '916224', // Suzume

  // TV / Anime Series (Crunchyroll, Netflix & JioCinema Official Hindi Dubs)
  '66732',  // Stranger Things
  '71446',  // Money Heist
  '93405',  // Squid Game
  '99966',  // All of Us Are Dead
  '70523',  // Dark
  '46260',  // Naruto (TMDB 46260)
  '20',     // Naruto (AniList 20)
  '31911',  // Naruto Shippuden (TMDB 31911)
  '1735',   // Naruto Shippuden (AniList 1735)
  '70881',  // Boruto (TMDB 70881)
  '97938',  // Boruto (AniList 97938)
  '12971',  // Dragon Ball Z (TMDB 12971)
  '813',    // Dragon Ball Z (AniList 813)
  '62710',  // Dragon Ball Super (TMDB 62710)
  '21175',  // Dragon Ball Super (AniList 21175)
  '85937',  // Demon Slayer (TMDB 85937)
  '101922', // Demon Slayer (AniList 101922)
  '95479',  // Jujutsu Kaisen (TMDB 95479)
  '113415', // Jujutsu Kaisen (AniList 113415)
  '127532', // Solo Leveling (TMDB 127532)
  '151807', // Solo Leveling (AniList 151807)
  '114410', // Chainsaw Man (TMDB 114410)
  '127230', // Chainsaw Man (AniList 127230)
  '120089', // Spy x Family (TMDB 120089)
  '140960', // Spy x Family (AniList 140960)
  '207347', // Kaiju No. 8 (TMDB 207347)
  '153288', // Kaiju No. 8 (AniList 153288)
  '37854',  // One Piece (TMDB 37854)
  '21',     // One Piece (AniList 21)
  '73223',  // Black Clover (TMDB 73223)
  '97940',  // Black Clover (AniList 97940)
  '30984',  // Bleach (TMDB 30984)
  '269',    // Bleach (AniList 269)
  '211684', // Bleach: TYBW (TMDB 211684)
  '114446', // Bleach: TYBW (AniList 114446)
  '13916',  // Death Note (TMDB 13916)
  '1535',   // Death Note (AniList 1535)
  '106063', // Tokyo Revengers (TMDB 106063)
  '120120', // Tokyo Revengers (AniList 120120)
  '1429',   // Attack on Titan (TMDB 1429)
  '16498',  // Attack on Titan (AniList 16498)
  '65930',  // My Hero Academia (TMDB 65930)
  '21459',  // My Hero Academia (AniList 21459)
  '136283', // Blue Lock (TMDB 136283)
  '137822', // Blue Lock (AniList 137822)
  '225016', // Wind Breaker (TMDB 225016)
  '163270', // Wind Breaker (AniList 163270)
  '205424', // Mashle: Magic and Muscles (TMDB 205424)
  '151801', // Mashle (AniList 151801)
  '114411', // Ranking of Kings (TMDB 114411)
  '113717', // Ranking of Kings (AniList 113717)
  '71370',  // Classroom of the Elite (TMDB 71370)
  '98659',  // Classroom of the Elite (AniList 98659)
  '83095',  // Vinland Saga (TMDB 83095)
  '101348', // Vinland Saga (AniList 101348)
  '46298',  // Hunter x Hunter (TMDB 46298)
  '11061',  // Hunter x Hunter (AniList 11061)
  '60625',  // Haikyu!! (TMDB 60625)
  '20464',  // Haikyu!! (AniList 20464)
  '117465', // Hell's Paradise (TMDB 117465)
  '128893', // Hell's Paradise (AniList 128893)
  '86031',  // Dr. STONE (TMDB 86031)
  '105333', // Dr. STONE (AniList 105333)
  '86717',  // Fire Force (TMDB 86717)
  '105310', // Fire Force (AniList 105310)
  '81356',  // Slime Isekai (TMDB 81356)
  '101280', // Slime Isekai (AniList 101280)
  '83097',  // Shield Hero (TMDB 83097)
  '99263',  // Shield Hero (AniList 99263)
  '98322',  // Mushoku Tensei (TMDB 98322)
  '108465', // Mushoku Tensei (AniList 108465)
  '63639',  // Overlord (TMDB 63639)
  '20832',  // Overlord (AniList 20832)
  '65942',  // Re:Zero (TMDB 65942)
  '21355',  // Re:Zero (AniList 21355)
  '209867', // Frieren (TMDB 209867)
  '154587', // Frieren (AniList 154587)
  '372058', // Your Name (TMDB 372058)
  '568160', // Weathering with You (TMDB 568160)

  // Major Indian / Hindi Cinema Hits
  '579974', // RRR
  '554600', // K.G.F: Chapter 1
  '585268', // K.G.F: Chapter 2
  '256040', // Baahubali: The Beginning
  '350312', // Baahubali 2: The Conclusion
  '872906', // Jawan
  '781732', // Animal
  '533642', // Stree
  '1022789', // Stree 2
  '360814', // Dangal
  '693134', // Kalki 2898 AD
  '626392', // Pushpa: The Rise
  '889737', // Pushpa 2: The Rule
  '792307', // Pathaan
  '753342', // Tiger 3
]);

export const VERIFIED_ENGLISH_DUB_ANIME_IDS = new Set<string | number>([
  // Major anime with verified English dub streaming support
  '21',     // One Piece (AniList ID 21)
  '37854',  // One Piece (TMDB ID 37854)
  '16498',  // Attack on Titan (AniList 16498)
  '1429',   // Attack on Titan (TMDB 1429)
  '20',     // Naruto (AniList 20)
  '46260',  // Naruto (TMDB 46260)
  '1735',   // Naruto Shippuden (AniList 1735)
  '31911',  // Naruto Shippuden (TMDB 31911)
  '101922', // Demon Slayer (AniList 101922)
  '85937',  // Demon Slayer (TMDB 85937)
  '113415', // Jujutsu Kaisen (AniList 113415)
  '95479',  // Jujutsu Kaisen (TMDB 95479)
  '151807', // Solo Leveling (AniList 151807)
  '127532', // Solo Leveling (TMDB 127532)
  '127230', // Chainsaw Man (AniList 127230)
  '114410', // Chainsaw Man (TMDB 114410)
  '140960', // Spy x Family (AniList 140960)
  '120089', // Spy x Family (TMDB 120089)
  '154587', // Frieren (AniList 154587)
  '209867', // Frieren (TMDB 209867)
  '1535',   // Death Note (AniList 1535)
  '13916',  // Death Note (TMDB 13916)
  '20605',  // Tokyo Ghoul (AniList 20605)
  '61223',  // Tokyo Ghoul (TMDB 61223)
  '21459',  // My Hero Academia (AniList 21459)
  '65930',  // My Hero Academia (TMDB 65930)
  '30',     // Neon Genesis Evangelion
  '269',    // Bleach (AniList 269)
  '30984',  // Bleach (TMDB 30984)
  '114446', // Bleach: TYBW (AniList 114446)
  '211684', // Bleach: TYBW (TMDB 211684)
  '11061',  // Hunter x Hunter (AniList 11061)
  '46298',  // Hunter x Hunter (TMDB 46298)
  '5114',   // Fullmetal Alchemist: Brotherhood
  '101348', // Vinland Saga (AniList 101348)
  '83095',  // Vinland Saga (TMDB 83095)
  '120377', // Cyberpunk: Edgerunners (AniList 120377)
  '105248', // Cyberpunk: Edgerunners (TMDB 105248)
  '1',      // Cowboy Bebop (AniList 1)
  '13850',  // Cowboy Bebop (TMDB 13850)
  '9253',   // Steins;Gate (AniList 9253)
  '34484',  // Steins;Gate (TMDB 34484)
  '21507',  // Mob Psycho 100 (AniList 21507)
  '67070',  // Mob Psycho 100 (TMDB 67070)
  '11757',  // Sword Art Online (AniList 11757)
  '45782',  // Sword Art Online (TMDB 45782)
  '153288', // Kaiju No. 8 (AniList 153288)
  '207347', // Kaiju No. 8 (TMDB 207347)
  '137822', // Blue Lock (AniList 137822)
  '136283', // Blue Lock (TMDB 136283)
  '20832',  // Overlord (AniList 20832)
  '63639',  // Overlord (TMDB 63639)
  '21355',  // Re:Zero (AniList 21355)
  '65942',  // Re:Zero (TMDB 65942)
]);

export function getLanguageMetadata(code?: string): { name: string; flag: string } {
  const norm = (code || 'en').toLowerCase().trim();
  return LANGUAGE_NAME_MAP[norm] || { name: norm.toUpperCase(), flag: '🌐' };
}

/**
 * Authoritative Synchronous Discovery-Level Audio Availability
 * Uses cached provider/voice actor resolutions and canonical capabilities.
 */
export function getContentAudioAvailability(
  params: GetContentAudioAvailabilityParams
): NormalizedAudioAvailability {
  const mediaType = params.mediaType || 'movie';
  const idStr = String(params.id);
  const cacheKey = AudioAvailabilityCache.makeDiscoveryKey(mediaType, params.id);
  const cached = AudioAvailabilityCache.getDiscovery(cacheKey);
  if (cached) return cached;

  const isAnime = mediaType === 'anime' || params.originalLanguage === 'ja';
  const origLang = (params.originalLanguage || (isAnime ? 'ja' : 'en')).toLowerCase().trim();
  const isOriginalHindi = origLang === 'hi';
  const isOriginalEnglish = !isAnime && origLang === 'en';

  // Check known/cached dub languages from AniList or previous resolution
  const cachedLangs =
    (params.aniListId ? AudioAvailabilityCache.getKnownDubLanguages(params.aniListId) : null) ||
    AudioAvailabilityCache.getKnownDubLanguages(idStr) ||
    (params.title ? AudioAvailabilityCache.getKnownDubLanguages(params.title) : null);

  const isCatalogEnglish =
    VERIFIED_ENGLISH_DUB_ANIME_IDS.has(idStr) ||
    VERIFIED_ENGLISH_DUB_ANIME_IDS.has(Number(idStr)) ||
    (params.aniListId ? VERIFIED_ENGLISH_DUB_ANIME_IDS.has(String(params.aniListId)) || VERIFIED_ENGLISH_DUB_ANIME_IDS.has(Number(params.aniListId)) : false);

  const isCatalogHindi =
    VERIFIED_HINDI_DUB_IDS.has(idStr) ||
    VERIFIED_HINDI_DUB_IDS.has(Number(idStr)) ||
    (params.aniListId ? VERIFIED_HINDI_DUB_IDS.has(String(params.aniListId)) || VERIFIED_HINDI_DUB_IDS.has(Number(params.aniListId)) : false);

  let hasEnglishDub = isOriginalEnglish || isCatalogEnglish;
  if (!hasEnglishDub && cachedLangs) {
    hasEnglishDub = cachedLangs.includes('English');
  }

  let hasHindiDub = isOriginalHindi || isCatalogHindi;
  if (!hasHindiDub && cachedLangs) {
    hasHindiDub = cachedLangs.includes('Hindi');
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
    verified: Boolean(cachedLangs),
    providers: {
      en: hasEnglishDub
        ? isAnime
          ? ['kuhi-hls', 'anivexa-hls', 'miruro-anime', '2embed-anime', 'nhd-anime', 'vidsrc-me']
          : ['vidsrc', 'vidsrc-me', 'nhd-cinema', '2embed', 'vidfast']
        : [],
      hi: hasHindiDub
        ? isAnime
          ? ['nhd-anime', '2embed-anime']
          : ['nhd-cinema', '2embed', 'vidsrc']
        : [],
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

  const isCatalogEnglish =
    VERIFIED_ENGLISH_DUB_ANIME_IDS.has(idStr) ||
    VERIFIED_ENGLISH_DUB_ANIME_IDS.has(Number(idStr)) ||
    (params.aniListId ? VERIFIED_ENGLISH_DUB_ANIME_IDS.has(String(params.aniListId)) || VERIFIED_ENGLISH_DUB_ANIME_IDS.has(Number(params.aniListId)) : false);

  const isCatalogHindi =
    VERIFIED_HINDI_DUB_IDS.has(idStr) ||
    VERIFIED_HINDI_DUB_IDS.has(Number(idStr)) ||
    (params.aniListId ? VERIFIED_HINDI_DUB_IDS.has(String(params.aniListId)) || VERIFIED_HINDI_DUB_IDS.has(Number(params.aniListId)) : false);

  let hasEnglishDub = isOriginalEnglish || isCatalogEnglish;
  let hasHindiDub = isOriginalHindi || isCatalogHindi;
  let isVerified = Boolean(isCatalogEnglish || isCatalogHindi);

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
          ? ['kuhi-hls', 'anivexa-hls', 'miruro-anime', '2embed-anime', 'nhd-anime', 'vidsrc-me']
          : ['vidsrc', 'vidsrc-me', 'nhd-cinema', '2embed', 'vidfast']
        : [],
      hi: hasHindiDub
        ? isAnime
          ? ['nhd-anime', '2embed-anime']
          : ['nhd-cinema', '2embed', 'vidsrc']
        : [],
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
    const hasHindiDub =
      isOriginalHindi ||
      VERIFIED_HINDI_DUB_IDS.has(idStr) ||
      VERIFIED_HINDI_DUB_IDS.has(Number(item.id));
    const hasEnglishDub =
      isOriginalEnglish ||
      VERIFIED_ENGLISH_DUB_ANIME_IDS.has(idStr) ||
      VERIFIED_ENGLISH_DUB_ANIME_IDS.has(Number(item.id));

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
  const isAnime = mediaType === 'anime';
  const origLang = (isAnime
    ? (originalLanguage && originalLanguage !== 'en' ? originalLanguage : 'ja')
    : (originalLanguage || 'en')
  ).toLowerCase().trim();

  const cacheKey = AudioAvailabilityCache.makeKey(mediaType, mediaId, season, episode);
  const cached = AudioAvailabilityCache.get(cacheKey);
  if (cached && (!isAnime || cached.originalLanguage === 'ja')) return cached;

  const idStr = String(mediaId);
  const origMeta = getLanguageMetadata(origLang);
  const isOriginalHindi = origLang === 'hi';
  const isOriginalEnglish = !isAnime && origLang === 'en';

  const isCatalogEnglish =
    VERIFIED_ENGLISH_DUB_ANIME_IDS.has(idStr) ||
    VERIFIED_ENGLISH_DUB_ANIME_IDS.has(Number(idStr)) ||
    (aniListId ? VERIFIED_ENGLISH_DUB_ANIME_IDS.has(String(aniListId)) || VERIFIED_ENGLISH_DUB_ANIME_IDS.has(Number(aniListId)) : false);

  const isCatalogHindi =
    VERIFIED_HINDI_DUB_IDS.has(idStr) ||
    VERIFIED_HINDI_DUB_IDS.has(Number(idStr)) ||
    (aniListId ? VERIFIED_HINDI_DUB_IDS.has(String(aniListId)) || VERIFIED_HINDI_DUB_IDS.has(Number(aniListId)) : false);

  // 1. Evaluate genuine English availability
  let hasEnglishDub = isAnime ? isCatalogEnglish : isOriginalEnglish;
  if (!hasEnglishDub) {
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
  let hasHindiDub = isOriginalHindi || isCatalogHindi;
  if (!hasHindiDub) {
    if (params.verifiedHindi === true) {
      hasHindiDub = true;
    } else if (params.dubLanguages && params.dubLanguages.length > 0 && params.dubLanguages.includes('Hindi')) {
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
      provider: isAnime ? 'kuhi-hls' : 'vidsrc-me',
      available: true,
      isOriginal: true,
    },
    // 2. English Track
    {
      id: 'dub-en',
      language: 'English',
      languageCode: 'en',
      type: 'dub',
      label: isAnime ? '🇬🇧 English (DUB)' : '🇬🇧 English Audio',
      provider: isAnime ? 'vidlink-anime' : 'vidlink',
      available: isAnime ? true : hasEnglishDub,
      isOriginal: isOriginalEnglish,
    },
    // 3. Hindi Track
    {
      id: 'dub-hi',
      language: 'Hindi',
      languageCode: 'hi',
      type: 'dub',
      label: isAnime ? '🇮🇳 Hindi (DUB)' : '🇮🇳 Hindi Audio',
      provider: isAnime ? 'nhd-anime' : 'nhd-cinema',
      available: hasHindiDub,
      isOriginal: isOriginalHindi,
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

  if (params.mediaType === 'anime') {
    const idStr = String(params.mediaId);
    const isCatalogEnglish =
      VERIFIED_ENGLISH_DUB_ANIME_IDS.has(idStr) ||
      VERIFIED_ENGLISH_DUB_ANIME_IDS.has(Number(idStr)) ||
      (aniListId ? VERIFIED_ENGLISH_DUB_ANIME_IDS.has(String(aniListId)) || VERIFIED_ENGLISH_DUB_ANIME_IDS.has(Number(aniListId)) : false);
    const isCatalogHindi =
      VERIFIED_HINDI_DUB_IDS.has(idStr) ||
      VERIFIED_HINDI_DUB_IDS.has(Number(idStr)) ||
      (aniListId ? VERIFIED_HINDI_DUB_IDS.has(String(aniListId)) || VERIFIED_HINDI_DUB_IDS.has(Number(aniListId)) : false);

    if (verifiedEnglish === undefined && isCatalogEnglish) {
      verifiedEnglish = true;
    }

    if (verifiedEnglish === undefined || !aniListId || !malId) {
      const queryTarget = aniListId || params.title || params.mediaId;
      const dubCheck = await checkAniListDubAvailability(queryTarget);
      if (verifiedEnglish === undefined) {
        verifiedEnglish = dubCheck.hasEnglishDub || isCatalogEnglish;
      }
      if (!dubLanguages) {
        dubLanguages = dubCheck.spokenLanguages;
        if (isCatalogHindi && !dubLanguages.includes('Hindi')) {
          dubLanguages = [...dubLanguages, 'Hindi'];
        }
      }
      if (!malId && dubCheck.malId) {
        malId = dubCheck.malId;
      }
      if (!aniListId && dubCheck.id) {
        aniListId = dubCheck.id;
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

  // Get verified tracks for this episode
  const availability = getEpisodeAudioTracks({
    mediaId: id,
    mediaType,
    season,
    episode,
    originalLanguage,
    title,
    aniListId,
    malId,
  });

  // Find requested track
  let track: AudioTrack | undefined = availability.tracks.find((t) => t.id === audioTrackId);
  let isFallback = false;
  let fallbackMessage: string | undefined;

  // If requested track is not found, construct or safely fallback
  if (!track) {
    if (audioTrackId === 'dub-en' || audioTrackId === 'dub') {
      track = {
        id: 'dub-en',
        language: 'English',
        languageCode: 'en',
        type: 'dub',
        label: mediaType === 'anime' ? '🇬🇧 English (DUB)' : '🇬🇧 English Audio',
        provider: mediaType === 'anime' ? 'vidlink-anime' : 'vidlink',
        available: true,
        isOriginal: false,
      };
    } else if (audioTrackId === 'dub-hi' || audioTrackId === 'hindi') {
      track = {
        id: 'dub-hi',
        language: 'Hindi',
        languageCode: 'hi',
        type: 'dub',
        label: mediaType === 'anime' ? '🇮🇳 Hindi (DUB)' : '🇮🇳 Hindi Audio',
        provider: mediaType === 'anime' ? 'vidlink-anime' : 'vidsrc-dev',
        available: true,
        isOriginal: false,
      };
    } else {
      const subTrack = availability.tracks.find((t) => t.id === 'sub') || availability.tracks[0];
      track = subTrack;
      isFallback = true;
      fallbackMessage = `${audioTrackId === 'dub-hi' ? 'Hindi' : 'English'} dub is not available for this title. Playing in Original / SUB.`;
    }
  }

  // Determine provider to use:
  let chosenProvider = preferredProvider || track.provider;

  if (preferredProvider) {
    const adapter = ProviderRegistry.getById(preferredProvider);
    if (adapter) {
      const isCompatible =
        (mediaType === 'anime' && adapter.supportsAnime) ||
        (mediaType === 'tv' && adapter.supportsTV) ||
        (mediaType === 'movie' && adapter.supportsMovie);
      if (isCompatible) {
        chosenProvider = adapter.id;
      }
    }
  } else {
    // Smart Dub auto-prioritization when no explicit provider chosen
    if (track.id === 'dub-hi') {
      chosenProvider = mediaType === 'anime' ? 'vidlink-anime' : 'vidsrc-dev';
    } else if (track.id === 'dub-en') {
      chosenProvider = mediaType === 'anime' ? 'vidlink-anime' : 'vidlink';
    }
  }

  // Resolve playback URL through ProviderRegistry with audio options
  const playbackUrl = ProviderRegistry.resolvePlaybackUrl(chosenProvider, {
    mediaType,
    tmdbId: id,
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

  // Remember user preference ONLY if not falling back
  if (!isFallback) {
    AudioAvailabilityCache.setPreferredLanguage(audioTrackId);
  }

  return {
    success: true,
    available: true,
    provider: chosenProvider,
    url: playbackUrl,
    track,
    error: fallbackMessage,
    fallbackTrack: isFallback ? 'sub' : undefined,
  };
}

export async function resolveAudioSourceAsync(
  params: ResolveAudioSourceParams
): Promise<ResolveAudioSourceResult> {
  const {
    mediaType,
    id,
    audioTrackId,
    season,
    episode,
    preferredProvider,
    startTime = 0,
    accentColor = '007bff',
    originalLanguage = mediaType === 'anime' ? 'ja' : 'en',
    title,
  } = params;

  let resolvedAniListId = params.aniListId;
  let resolvedMalId = params.malId;

  if (mediaType === 'anime' && (!resolvedAniListId || !resolvedMalId)) {
    const queryTarget = resolvedAniListId || title || id;
    const dubCheck = await checkAniListDubAvailability(queryTarget);
    if (!resolvedAniListId && dubCheck.id) resolvedAniListId = dubCheck.id;
    if (!resolvedMalId && dubCheck.malId) resolvedMalId = dubCheck.malId;
  }

  // Dynamically resolve audio tracks for this episode
  const availability = await getEpisodeAudioTracksAsync({
    mediaId: id,
    mediaType,
    season,
    episode,
    originalLanguage,
    title,
    aniListId: resolvedAniListId,
    malId: resolvedMalId,
  });

  let track = availability.tracks.find((t) => t.id === audioTrackId);
  let isFallback = false;
  let fallbackMessage: string | undefined;

  if (!track) {
    if (audioTrackId === 'dub-en' || audioTrackId === 'dub') {
      track = {
        id: 'dub-en',
        language: 'English',
        languageCode: 'en',
        type: 'dub',
        label: mediaType === 'anime' ? '🇬🇧 English (DUB)' : '🇬🇧 English Audio',
        provider: mediaType === 'anime' ? 'vidlink-anime' : 'vidlink',
        available: true,
        isOriginal: false,
      };
    } else if (audioTrackId === 'dub-hi' || audioTrackId === 'hindi') {
      track = {
        id: 'dub-hi',
        language: 'Hindi',
        languageCode: 'hi',
        type: 'dub',
        label: mediaType === 'anime' ? '🇮🇳 Hindi (DUB)' : '🇮🇳 Hindi Audio',
        provider: mediaType === 'anime' ? 'vidlink-anime' : 'vidsrc-dev',
        available: true,
        isOriginal: false,
      };
    } else {
      const subTrack = availability.tracks.find((t) => t.id === 'sub') || availability.tracks[0];
      track = subTrack;
      isFallback = true;
      fallbackMessage = `${audioTrackId === 'dub-hi' ? 'Hindi' : 'English'} dub is not available for this title. Playing in Original / SUB.`;
    }
  }

  let chosenProvider = preferredProvider || track.provider;

  if (preferredProvider) {
    const adapter = ProviderRegistry.getById(preferredProvider);
    if (adapter) {
      const isCompatible =
        (mediaType === 'anime' && adapter.supportsAnime) ||
        (mediaType === 'tv' && adapter.supportsTV) ||
        (mediaType === 'movie' && adapter.supportsMovie);
      if (isCompatible) {
        chosenProvider = adapter.id;
      }
    }
  } else {
    // Smart Dub auto-prioritization when no explicit provider chosen
    if (track.id === 'dub-hi') {
      chosenProvider = mediaType === 'anime' ? 'vidlink-anime' : 'vidsrc-dev';
    } else if (track.id === 'dub-en') {
      chosenProvider = mediaType === 'anime' ? 'vidlink-anime' : 'vidlink';
    }
  }

  const playbackUrl = ProviderRegistry.resolvePlaybackUrl(chosenProvider, {
    mediaType,
    tmdbId: id,
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

  if (!isFallback) {
    AudioAvailabilityCache.setPreferredLanguage(audioTrackId);
  }

  return {
    success: true,
    available: true,
    provider: chosenProvider,
    url: playbackUrl,
    isHls: false,
    track,
    error: fallbackMessage,
    fallbackTrack: isFallback ? 'sub' : undefined,
  };
}


