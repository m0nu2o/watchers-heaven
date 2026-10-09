/**
 * LUMINA CONTENT CLASSIFICATION ENGINE
 *
 * Strict, deterministic metadata-grounded classification.
 * Prevents cross-category leakage (e.g. Toy Story appearing as Anime,
 * or Japanese live-action dramas routing to anime servers).
 *
 * Classifications:
 * 1. Anime (Japanese animated TV series)
 * 2. Anime Movies (Japanese animated feature films)
 * 3. Western Cartoons and Animation (Western animated movies & series, e.g. Toy Story, Arcane)
 * 4. Hollywood Movies (Western live-action films)
 * 5. Bollywood Movies (Indian Hindi/regional cinema)
 * 6. International Movies (World live-action cinema)
 * 7. TV Series (Western & international live-action series)
 * 8. K-Dramas (Korean live-action drama series)
 * 9. C-Dramas (Chinese live-action drama series)
 * 10. Other Asian Dramas (Japanese live-action, Thai lakorn, etc.)
 */

export type ContentCategory =
  | 'anime'
  | 'anime-movie'
  | 'cartoon'
  | 'hollywood'
  | 'bollywood'
  | 'international-movie'
  | 'tv'
  | 'kdrama'
  | 'cdrama'
  | 'asian-drama';

export interface ClassifiableMedia {
  id?: number | string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  media_type?: 'movie' | 'tv' | 'anime' | string;
  genre_ids?: number[];
  genres?: Array<{ id: number; name?: string }> | number[];
  original_language?: string;
  origin_country?: string[];
  production_countries?: Array<{ iso_3166_1?: string; name?: string }>;
  aniListId?: number | null;
  first_air_date?: string;
  release_date?: string;
}

/**
 * TMDB Genre IDs of interest
 */
export const GENRE_ANIMATION = 16;

/**
 * Extracts normalized genre IDs array from any shape of TMDB object
 */
export function extractGenreIds(item: ClassifiableMedia): number[] {
  if (Array.isArray(item.genre_ids)) {
    return item.genre_ids.filter((id): id is number => typeof id === 'number');
  }
  if (Array.isArray(item.genres)) {
    return item.genres
      .map((g) => (typeof g === 'number' ? g : g?.id))
      .filter((id): id is number => typeof id === 'number');
  }
  return [];
}

/**
 * Extracts normalized origin countries array from any shape of TMDB object
 */
export function extractOriginCountries(item: ClassifiableMedia): string[] {
  const countries = new Set<string>();

  if (Array.isArray(item.origin_country)) {
    item.origin_country.forEach((c) => {
      if (typeof c === 'string' && c.trim()) countries.add(c.trim().toUpperCase());
    });
  }

  if (Array.isArray(item.production_countries)) {
    item.production_countries.forEach((c) => {
      if (c?.iso_3166_1 && typeof c.iso_3166_1 === 'string') {
        countries.add(c.iso_3166_1.trim().toUpperCase());
      }
    });
  }

  return Array.from(countries);
}

/**
 * Determines whether a title is animated.
 * Uses TMDB genre 16 and AniList metadata.
 */
export function isAnimation(item: ClassifiableMedia): boolean {
  const genreIds = extractGenreIds(item);
  return genreIds.includes(GENRE_ANIMATION) || Boolean(item.aniListId && item.aniListId > 0);
}

/**
 * Determines whether an animation is specifically Japanese Anime.
 * Strictly requires Japanese language ('ja'), Japanese origin ('JP'), or an AniList record.
 * Western animations (like Toy Story, Shrek, The Simpsons, Frozen) return FALSE.
 */
export function isJapaneseAnime(item: ClassifiableMedia): boolean {
  if (!isAnimation(item)) return false;

  const lang = (item.original_language || '').toLowerCase().trim();
  const countries = extractOriginCountries(item);

  // If AniList ID is present, it's explicitly verified anime
  if (item.aniListId && item.aniListId > 0) return true;

  // Japanese language or Japan origin country
  if (lang === 'ja' || countries.includes('JP')) return true;

  return false;
}

/**
 * Resolves whether the item is structurally a movie vs an episodic TV show
 */
export function resolveFormat(item: ClassifiableMedia): 'movie' | 'tv' {
  if (item.media_type === 'movie') return 'movie';
  if (item.media_type === 'tv') return 'tv';
  if (item.first_air_date && !item.release_date) return 'tv';
  if (item.release_date && !item.first_air_date) return 'movie';
  return 'movie';
}

/**
 * Authoritative Content Classification Function.
 * Evaluates the full metadata envelope and returns the single accurate category.
 */
export function classifyContent(item: ClassifiableMedia): ContentCategory {
  const isAnim = isAnimation(item);
  const isJapAnime = isJapaneseAnime(item);
  const format = resolveFormat(item);
  const lang = (item.original_language || 'en').toLowerCase().trim();
  const countries = extractOriginCountries(item);

  // ── 1. ANIMATION TAXONOMY ──
  if (isAnim) {
    if (isJapAnime) {
      return format === 'movie' ? 'anime-movie' : 'anime';
    }
    // Any non-Japanese animation is Western Cartoons and Animation
    // (e.g. Toy Story, Shrek, The Simpsons, Arcane, Avatar)
    return 'cartoon';
  }

  // ── 2. LIVE-ACTION TV TAXONOMY ──
  if (format === 'tv') {
    // Korean Drama
    if (lang === 'ko' || countries.includes('KR')) {
      return 'kdrama';
    }
    // Chinese Drama
    if (lang === 'zh' || countries.includes('CN') || countries.includes('TW') || countries.includes('HK')) {
      return 'cdrama';
    }
    // Japanese live-action drama (J-Drama) or other Asian Drama (Thai, etc.)
    if (lang === 'ja' || countries.includes('JP') || lang === 'th' || countries.includes('TH')) {
      return 'asian-drama';
    }
    // Standard Western / International TV Series
    return 'tv';
  }

  // ── 3. LIVE-ACTION MOVIE TAXONOMY ──
  // Bollywood / Indian Cinema
  if (lang === 'hi' || countries.includes('IN') || ['ta', 'te', 'ml', 'kn', 'bn'].includes(lang)) {
    return 'bollywood';
  }

  // Hollywood / Western English Feature Films
  if (lang === 'en' || countries.some((c) => ['US', 'GB', 'CA', 'AU', 'NZ', 'IE'].includes(c))) {
    return 'hollywood';
  }

  // International / World Cinema
  return 'international-movie';
}

/**
 * Returns player-compatible media type ('movie' | 'tv' | 'anime')
 * Ensures proper resolver routing and prevents cross-category endpoint pollution.
 */
export function getPlaybackMediaType(category: ContentCategory, format: 'movie' | 'tv' = 'movie'): 'movie' | 'tv' | 'anime' {
  switch (category) {
    case 'anime':
      return 'anime';
    case 'anime-movie':
      // Anime movies are feature films; they can route to anime or movie providers based on ID
      return 'movie';
    case 'cartoon':
      return format === 'tv' ? 'tv' : 'movie';
    case 'kdrama':
    case 'cdrama':
    case 'asian-drama':
    case 'tv':
      return 'tv';
    case 'bollywood':
    case 'hollywood':
    case 'international-movie':
      return 'movie';
    default:
      return format;
  }
}

/**
 * Visual badge metadata for UI cards and headers
 */
export interface CategoryBadgeInfo {
  category: ContentCategory;
  label: string;
  shortLabel: string;
  icon: string;
  badgeClass: string;
}

export function getCategoryBadge(category: ContentCategory): CategoryBadgeInfo {
  switch (category) {
    case 'anime':
      return {
        category,
        label: 'Japanese Anime',
        shortLabel: 'ANIME',
        icon: '🎌',
        badgeClass: 'bg-rose-500/80 text-white shadow-rose-500/20 border-rose-400/30',
      };
    case 'anime-movie':
      return {
        category,
        label: 'Anime Feature Film',
        shortLabel: 'ANIME MOVIE',
        icon: '🎬',
        badgeClass: 'bg-rose-600/80 text-white shadow-rose-600/20 border-rose-400/30',
      };
    case 'cartoon':
      return {
        category,
        label: 'Animation',
        shortLabel: 'ANIMATION',
        icon: '🎨',
        badgeClass: 'bg-amber-500/80 text-white shadow-amber-500/20 border-amber-400/30',
      };
    case 'kdrama':
      return {
        category,
        label: 'K-Drama',
        shortLabel: 'K-DRAMA',
        icon: '🇰🇷',
        badgeClass: 'bg-violet-500/80 text-white shadow-violet-500/20 border-violet-400/30',
      };
    case 'cdrama':
      return {
        category,
        label: 'C-Drama',
        shortLabel: 'C-DRAMA',
        icon: '🇨🇳',
        badgeClass: 'bg-red-500/80 text-white shadow-red-500/20 border-red-400/30',
      };
    case 'asian-drama':
      return {
        category,
        label: 'Asian Drama',
        shortLabel: 'ASIAN DRAMA',
        icon: '🏮',
        badgeClass: 'bg-purple-500/80 text-white shadow-purple-500/20 border-purple-400/30',
      };
    case 'bollywood':
      return {
        category,
        label: 'Bollywood',
        shortLabel: 'BOLLYWOOD',
        icon: '🇮🇳',
        badgeClass: 'bg-emerald-500/80 text-white shadow-emerald-500/20 border-emerald-400/30',
      };
    case 'hollywood':
      return {
        category,
        label: 'Hollywood',
        shortLabel: 'HOLLYWOOD',
        icon: '🎬',
        badgeClass: 'bg-blue-500/80 text-white shadow-blue-500/20 border-blue-400/30',
      };
    case 'international-movie':
      return {
        category,
        label: 'World Cinema',
        shortLabel: 'WORLD',
        icon: '🌍',
        badgeClass: 'bg-cyan-500/80 text-white shadow-cyan-500/20 border-cyan-400/30',
      };
    case 'tv':
    default:
      return {
        category: 'tv',
        label: 'Series',
        shortLabel: 'SERIES',
        icon: '📺',
        badgeClass: 'bg-indigo-500/80 text-white shadow-indigo-500/20 border-indigo-400/30',
      };
  }
}
