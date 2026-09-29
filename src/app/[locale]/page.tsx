import process from 'node:process';
import { HeroFeature } from '@/components/hero/HeroFeature';
import { CarouselRow } from '@/components/cards/CarouselRow';
import { PosterCard } from '@/components/cards/PosterCard';

interface TmdbItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

// Fallback lists in case API fetch fails
const fallbackRecommendation = [
  { id: 533535, title: 'Deadpool & Wolverine', poster_path: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', vote_average: 7.7, release_date: '2024-07-24' },
  { id: 693134, title: 'Dune: Part Two', poster_path: '/1pdfLvkbY9ohJlCjQH2JGqqUT1e.jpg', vote_average: 8.3, release_date: '2024-02-27' },
  { id: 1022789, title: 'Inside Out 2', poster_path: '/vpnVM9B6NMmQpWeZvzRxHXh2kM2.jpg', vote_average: 7.7, release_date: '2024-06-11' }
];

import { tmdbCache } from '@/lib/cache';

async function fetchFromTmdb(endpoint: string, params: Record<string, string> = {}) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error('TMDB_API_KEY is not set');

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const sortedParams = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
  const paramStr = sortedParams.map(([k, v]) => `${k}=${v}`).join('&');
  const cacheKey = `server:tmdb:${normalizedEndpoint}${paramStr ? '?' + paramStr : ''}`;

  // 1. Instant in-memory cache hit (< 1ms)
  const cached = tmdbCache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // cache corrupted, proceed to fetch
    }
  }

  const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.tmdb.org/3';
  const url = new URL(`${TMDB_BASE_URL}${normalizedEndpoint}`);
  url.searchParams.append('api_key', apiKey);
  url.searchParams.append('include_adult', 'false');
  sortedParams.forEach(([key, value]) => url.searchParams.append(key, value));
  
  try {
    let res: Response | null = null;
    try {
      res = await fetch(url.toString(), {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(3500),
      });
    } catch {
      // Fast fallback to alternate host if primary domain is throttled
      const alternateHost = url.hostname === 'api.tmdb.org' ? 'api.themoviedb.org' : 'api.tmdb.org';
      const fallbackUrl = new URL(url.toString());
      fallbackUrl.hostname = alternateHost;
      res = await fetch(fallbackUrl.toString(), {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(3500),
      });
    }

    if (!res.ok) throw new Error(`TMDB API Fetch failed: ${res.status}`);
    const data = await res.json();
    
    // Store in memory cache for 1 hour
    if (data && data.results) {
      tmdbCache.set(cacheKey, JSON.stringify(data), 60 * 60 * 1000);
    }

    return data;
  } catch (err) {
    console.error(`Error querying TMDB ${endpoint}:`, err);
    return { results: [] };
  }
}

export default async function Home(props: { params: Promise<{ locale?: string }> }) {
  const { locale = 'en' } = (await props.params) || {};

  // Query actual trending/latest lists
  const [
    trendingMovies,
    trendingTv,
    topRated,
    nowPlaying,
    anime,
    bollywood,
    kdrama,
    action
  ] = await Promise.all([
    fetchFromTmdb('/trending/movie/week'),
    fetchFromTmdb('/trending/tv/week'),
    fetchFromTmdb('/movie/top_rated'),
    fetchFromTmdb('/movie/now_playing'),
    fetchFromTmdb('/discover/tv', {
      'with_genres': '16',
      'with_original_language': 'ja',
      'sort_by': 'popularity.desc'
    }),
    fetchFromTmdb('/discover/movie', {
      'with_original_language': 'hi',
      'sort_by': 'popularity.desc'
    }),
    fetchFromTmdb('/discover/tv', {
      'with_original_language': 'ko',
      'sort_by': 'popularity.desc'
    }),
    fetchFromTmdb('/discover/movie', {
      'with_genres': '28,12',
      'sort_by': 'popularity.desc'
    })
  ]);

  const getList = (apiResult: { results?: unknown[] } | null, fallback: unknown[]) => {
    return apiResult?.results?.length ? apiResult.results : fallback;
  };

  // Mix trending movies + TV shows for the hero slider
  const heroMovies = getList(trendingMovies, fallbackRecommendation)
    .slice(0, 3)
    .map((item) => ({ ...(item as TmdbItem), media_type: 'movie' }));
  const heroTv = getList(trendingTv, [])
    .slice(0, 3)
    .map((item) => ({ ...(item as TmdbItem), media_type: 'tv' }));
  const heroSlides = [...heroMovies, ...heroTv].filter((item) => (item as TmdbItem).backdrop_path);

  return (
    <main className="min-h-screen pb-20 bg-[var(--color-main)] text-slate-800 dark:text-white transition-colors duration-300">
      <HeroFeature movies={heroSlides} />
      
      <div className="mt-8 space-y-4 animate-fadeIn">
        {/* Recommendation / Trending Movies */}
        <CarouselRow
          title="Trending Movies"
          seeMoreHref={`/${locale}/movies`}
          exploreHref={`/${locale}/explore?type=movie`}
        >
          {getList(trendingMovies, fallbackRecommendation).map((item) => {
            const movie = item as TmdbItem;
            return (
              <PosterCard 
                key={movie.id}
                id={movie.id}
                title={movie.title ?? movie.name ?? ''}
                posterPath={movie.poster_path ?? ''}
                rating={movie.vote_average}
                year={movie.release_date ? movie.release_date.split('-')[0] : (movie.first_air_date ? movie.first_air_date.split('-')[0] : '')}
                type="movie"
              />
            );
          })}
        </CarouselRow>

        {/* Trending TV Shows */}
        <CarouselRow
          title="Trending TV Shows"
          seeMoreHref={`/${locale}/tv`}
          exploreHref={`/${locale}/explore?type=tv`}
        >
          {getList(trendingTv, []).map((item) => {
            const show = item as TmdbItem;
            return (
              <PosterCard 
                key={show.id}
                id={show.id}
                title={show.name ?? show.title ?? ''}
                posterPath={show.poster_path ?? ''}
                rating={show.vote_average}
                year={show.first_air_date ? show.first_air_date.split('-')[0] : ''}
                type="tv"
              />
            );
          })}
        </CarouselRow>

        {/* Popular Anime */}
        <CarouselRow
          title="Popular Anime"
          seeMoreHref={`/${locale}/anime`}
          exploreHref={`/${locale}/explore?type=anime`}
        >
          {getList(anime, []).map((item) => {
            const show = item as TmdbItem;
            return (
              <PosterCard 
                key={show.id}
                id={show.id}
                title={show.name ?? ''}
                posterPath={show.poster_path ?? ''}
                rating={show.vote_average}
                year={show.first_air_date ? show.first_air_date.split('-')[0] : ''}
                type="anime"
              />
            );
          })}
        </CarouselRow>

        {/* Bollywood & Indian Cinema */}
        <CarouselRow
          title="Bollywood & Indian Cinema"
          seeMoreHref={`/${locale}/movies`}
          exploreHref={`/${locale}/explore?type=bollywood`}
        >
          {getList(bollywood, []).map((item) => {
            const movie = item as TmdbItem;
            return (
              <PosterCard 
                key={movie.id}
                id={movie.id}
                title={movie.title ?? ''}
                posterPath={movie.poster_path ?? ''}
                rating={movie.vote_average}
                year={movie.release_date ? movie.release_date.split('-')[0] : ''}
                type="movie"
              />
            );
          })}
        </CarouselRow>

        {/* K-Drama & Korean Shows */}
        <CarouselRow
          title="K-Drama & Korean Shows"
          seeMoreHref={`/${locale}/k-drama`}
          exploreHref={`/${locale}/explore?type=kdrama`}
        >
          {getList(kdrama, []).map((item) => {
            const show = item as TmdbItem;
            return (
              <PosterCard 
                key={show.id}
                id={show.id}
                title={show.name ?? show.title ?? ''}
                posterPath={show.poster_path ?? ''}
                rating={show.vote_average}
                year={show.first_air_date ? show.first_air_date.split('-')[0] : ''}
                type="tv"
              />
            );
          })}
        </CarouselRow>

        {/* Top Rated Movies */}
        <CarouselRow
          title="Top Rated Movies"
          seeMoreHref={`/${locale}/movies`}
          exploreHref={`/${locale}/explore?type=movie&sort=vote_average.desc`}
        >
          {getList(topRated, []).map((item) => {
            const movie = item as TmdbItem;
            return (
              <PosterCard 
                key={movie.id}
                id={movie.id}
                title={movie.title ?? ''}
                posterPath={movie.poster_path ?? ''}
                rating={movie.vote_average}
                year={movie.release_date ? movie.release_date.split('-')[0] : ''}
                type="movie"
              />
            );
          })}
        </CarouselRow>

        {/* Now Playing in Theaters */}
        <CarouselRow
          title="Now Playing in Theaters"
          seeMoreHref={`/${locale}/theater`}
          exploreHref={`/${locale}/explore?type=movie&sort=primary_release_date.desc`}
        >
          {getList(nowPlaying, []).map((item) => {
            const movie = item as TmdbItem;
            return (
              <PosterCard 
                key={movie.id}
                id={movie.id}
                title={movie.title ?? ''}
                posterPath={movie.poster_path ?? ''}
                rating={movie.vote_average}
                year={movie.release_date ? movie.release_date.split('-')[0] : ''}
                type="movie"
              />
            );
          })}
        </CarouselRow>

        {/* Action & Adventure */}
        <CarouselRow
          title="Action & Adventure"
          seeMoreHref={`/${locale}/movies`}
          exploreHref={`/${locale}/explore?genre=28`}
        >
          {getList(action, []).map((item) => {
            const movie = item as TmdbItem;
            return (
              <PosterCard 
                key={movie.id}
                id={movie.id}
                title={movie.title ?? ''}
                posterPath={movie.poster_path ?? ''}
                rating={movie.vote_average}
                year={movie.release_date ? movie.release_date.split('-')[0] : ''}
                type="movie"
              />
            );
          })}
        </CarouselRow>
      </div>
    </main>
  );
}
