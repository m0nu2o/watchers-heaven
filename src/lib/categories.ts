/**
 * Centralized Category Discovery Service
 * Lumina Media Engine
 *
 * Defines the authoritative 10-category entertainment taxonomy and provides
 * verified TMDB discovery queries with strict filter boundaries to prevent
 * cross-category leakage.
 *
 * Categories:
 * 1. Anime (Japanese animated TV series & movies)
 * 2. Hindi Serials / Indian TV (Classic broadcast serials e.g. C.I.D.)
 * 3. Hindi Web Series (OTT originals e.g. Sacred Games, Mirzapur)
 * 4. K-Dramas (Korean drama series e.g. Squid Game, Crash Landing on You)
 * 5. C-Dramas (Chinese historical & modern series e.g. The Untamed)
 * 6. Other International / Asian Dramas (Japanese live-action, Thai lakorn)
 * 7. Hollywood Movies (Western feature films)
 * 8. Bollywood Movies (Indian Hindi & regional cinema)
 * 9. Cartoons / Western Animation (e.g. Toy Story, Arcane, Spider-Verse)
 * 10. Live TV (Broadcast channels)
 */

import { ApiGateway } from '@/lib/api/gateway';
import type { ContentCategory } from '@/lib/classification';

export interface CategoryDefinition {
  slug: string;
  category: ContentCategory;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  type: 'movie' | 'tv' | 'live';
  tmdbEndpoint: string;
  tmdbParams: Record<string, string>;
}

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  // 1. Anime
  {
    slug: 'anime',
    category: 'anime',
    title: 'Anime',
    subtitle: 'Japanese Animation',
    description: 'Top-rated and trending Japanese anime series and feature films.',
    icon: '🎌',
    type: 'tv',
    tmdbEndpoint: '/discover/tv',
    tmdbParams: {
      with_genres: '16',
      with_original_language: 'ja',
      sort_by: 'popularity.desc',
    },
  },
  // 2. Hindi Serials / Indian TV
  {
    slug: 'hindi-serials',
    category: 'hindi-serial',
    title: 'Hindi Serials & Indian TV',
    subtitle: 'Classic Indian Television',
    description: 'Long-running iconic Indian broadcast television serials and shows.',
    icon: '📺',
    type: 'tv',
    tmdbEndpoint: '/discover/tv',
    tmdbParams: {
      with_original_language: 'hi',
      with_origin_country: 'IN',
      'first_air_date.lte': '2019-12-31',
      sort_by: 'popularity.desc',
    },
  },
  // 3. Hindi Web Series
  {
    slug: 'hindi-web-series',
    category: 'hindi-web-series',
    title: 'Hindi Web Series',
    subtitle: 'Indian OTT Originals',
    description: 'Acclaimed Indian streaming series, thrillers, and dramas.',
    icon: '🔥',
    type: 'tv',
    tmdbEndpoint: '/discover/tv',
    tmdbParams: {
      with_original_language: 'hi',
      with_origin_country: 'IN',
      'first_air_date.gte': '2018-01-01',
      sort_by: 'popularity.desc',
    },
  },
  // 4. K-Dramas
  {
    slug: 'k-drama',
    category: 'kdrama',
    title: 'K-Dramas',
    subtitle: 'Korean Dramas',
    description: 'Gripping Korean drama series, romances, and thrillers.',
    icon: '🇰🇷',
    type: 'tv',
    tmdbEndpoint: '/discover/tv',
    tmdbParams: {
      with_original_language: 'ko',
      with_origin_country: 'KR',
      without_genres: '16',
      sort_by: 'popularity.desc',
    },
  },
  // 5. C-Dramas
  {
    slug: 'c-drama',
    category: 'cdrama',
    title: 'C-Dramas',
    subtitle: 'Chinese Dramas',
    description: 'Epic Chinese historical wuxia, xianxia, and contemporary romance series.',
    icon: '🇨🇳',
    type: 'tv',
    tmdbEndpoint: '/discover/tv',
    tmdbParams: {
      with_original_language: 'zh',
      without_genres: '16',
      sort_by: 'popularity.desc',
    },
  },
  // 6. Other Asian & International Dramas
  {
    slug: 'asian-drama',
    category: 'asian-drama',
    title: 'Asian & International Dramas',
    subtitle: 'J-Dramas, Lakorns & Beyond',
    description: 'Japanese live-action dramas, Thai series, and world television.',
    icon: '🏮',
    type: 'tv',
    tmdbEndpoint: '/discover/tv',
    tmdbParams: {
      with_original_language: 'ja|th',
      without_genres: '16',
      sort_by: 'popularity.desc',
    },
  },
  // 7. Hollywood Movies
  {
    slug: 'hollywood',
    category: 'hollywood',
    title: 'Hollywood Cinema',
    subtitle: 'Blockbusters & Classics',
    description: 'Western cinema hits, award winners, and cinematic masterpieces.',
    icon: '🎬',
    type: 'movie',
    tmdbEndpoint: '/discover/movie',
    tmdbParams: {
      with_original_language: 'en',
      without_genres: '16',
      sort_by: 'popularity.desc',
    },
  },
  // 8. Bollywood Movies
  {
    slug: 'bollywood',
    category: 'bollywood',
    title: 'Bollywood & Indian Cinema',
    subtitle: 'Hindi & Regional Cinema',
    description: 'Spectacular Indian cinema releases, blockbusters, and dramas.',
    icon: '🇮🇳',
    type: 'movie',
    tmdbEndpoint: '/discover/movie',
    tmdbParams: {
      with_original_language: 'hi|ta|te|ml',
      with_origin_country: 'IN',
      without_genres: '16',
      sort_by: 'popularity.desc',
    },
  },
  // 9. Cartoons / Western Animation
  {
    slug: 'cartoons',
    category: 'cartoon',
    title: 'Cartoons & Animation',
    subtitle: 'Western Animated Entertainment',
    description: 'Beloved animation, family classics, and modern animated masterpieces.',
    icon: '🎨',
    type: 'movie',
    tmdbEndpoint: '/discover/movie',
    tmdbParams: {
      with_genres: '16',
      without_original_language: 'ja',
      sort_by: 'popularity.desc',
    },
  },
  // 10. Live TV
  {
    slug: 'live-tv',
    category: 'live-tv',
    title: 'Live Television',
    subtitle: 'Broadcast Channels 24/7',
    description: 'Stream live entertainment, sports, news, and regional TV channels.',
    icon: '📡',
    type: 'live',
    tmdbEndpoint: '/tv/airing_today',
    tmdbParams: {},
  },
];

export function getCategoryDefinition(slug: string): CategoryDefinition | undefined {
  const norm = slug.toLowerCase().trim();
  return CATEGORY_DEFINITIONS.find(
    (c) => c.slug === norm || c.category === norm
  );
}

export async function fetchCategoryContent(
  slug: string,
  page: number = 1
): Promise<{
  definition: CategoryDefinition;
  results: Record<string, unknown>[];
  page: number;
  totalPages: number;
}> {
  const def = getCategoryDefinition(slug) || CATEGORY_DEFINITIONS[0];

  const params: Record<string, string> = {
    ...def.tmdbParams,
    page: String(page),
  };

  try {
    const data = await ApiGateway.fetchTmdb<{
      results?: Record<string, unknown>[];
      page?: number;
      total_pages?: number;
    }>(def.tmdbEndpoint, params);

    return {
      definition: def,
      results: data?.results || [],
      page: data?.page || 1,
      totalPages: data?.total_pages || 1,
    };
  } catch (err) {
    console.error(`Failed to fetch content for category ${slug}:`, err);
    return {
      definition: def,
      results: [],
      page: 1,
      totalPages: 1,
    };
  }
}
