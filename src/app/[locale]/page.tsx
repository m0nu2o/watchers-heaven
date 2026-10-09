import process from 'node:process';
import { HeroFeature } from '@/components/hero/HeroFeature';
import { CarouselRow } from '@/components/cards/CarouselRow';
import { PosterCard } from '@/components/cards/PosterCard';
import { RankCard } from '@/components/cards/RankCard';
import { tmdbCache } from '@/lib/cache';

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
  overview?: string;
}

// Fallback lists in case API fetch fails
const fallbackRecommendation = [
  { id: 533535, title: 'Deadpool & Wolverine', poster_path: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', backdrop_path: '/yD3tW5ZJc63q0uU3H2rZJ0m4tG6.jpg', vote_average: 7.7, release_date: '2024-07-24' },
  { id: 693134, title: 'Dune: Part Two', poster_path: '/1pdfLvkbY9ohJlCjQH2JGqqUT1e.jpg', backdrop_path: '/xOMo8BRK7PfcJv9JCnx7s520fff.jpg', vote_average: 8.3, release_date: '2024-02-27' },
  { id: 1022789, title: 'Inside Out 2', poster_path: '/vpnVM9B6NMmQpWeZvzRxHXh2kM2.jpg', backdrop_path: '/stKGOmPAgJu3U33ScaFq4ZlDq8p.jpg', vote_average: 7.7, release_date: '2024-06-11' }
];

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

  const getList = (apiResult: { results?: unknown[] } | null, fallback: unknown[] = []) => {
    return (apiResult?.results?.length ? apiResult.results : fallback) as TmdbItem[];
  };

  const moviesList = getList(trendingMovies, fallbackRecommendation);
  const tvList = getList(trendingTv, []);
  const topRatedList = getList(topRated, []);
  const nowPlayingList = getList(nowPlaying, []);
  const animeList = getList(anime, []);
  const bollywoodList = getList(bollywood, []);
  const kdramaList = getList(kdrama, []);
  const actionList = getList(action, []);

  // Mix trending movies + TV shows for the hero slider
  const heroMovies = moviesList.slice(0, 3).map((item) => ({ ...item, media_type: 'movie' }));
  const heroTv = tvList.slice(0, 3).map((item) => ({ ...item, media_type: 'tv' }));
  const heroSlides = [...heroMovies, ...heroTv].filter((item) => item.backdrop_path);

  // Top 10 Ranked Worldwide (Interleaved Movies & Series)
  const top10Ranked: { item: TmdbItem; type: 'movie' | 'tv' }[] = [];
  const maxLen = Math.max(moviesList.length, tvList.length);
  for (let i = 0; i < maxLen && top10Ranked.length < 10; i++) {
    if (moviesList[i]) top10Ranked.push({ item: moviesList[i], type: 'movie' });
    if (tvList[i] && top10Ranked.length < 10) top10Ranked.push({ item: tvList[i], type: 'tv' });
  }

  return (
    <main className="min-h-screen pb-20 bg-[var(--color-main)] text-slate-800 dark:text-white transition-colors duration-300">
      <HeroFeature movies={heroSlides} />
      
      <div className="mt-8 space-y-8 animate-fadeIn">
        {/* ── 1. Top 10 Worldwide Today (Redesigned Editorial Ranked Rail) ── */}
        {top10Ranked.length > 0 && (
          <CarouselRow
            title="Top 10 Worldwide Today"
            badge="LIVE RANKINGS • WORLDWIDE"
            subtitle="The 10 most-streamed films and series trending across the globe today"
          >
            {top10Ranked.map(({ item, type }, index) => {
              const year = item.release_date
                ? item.release_date.split('-')[0]
                : (item.first_air_date ? item.first_air_date.split('-')[0] : '');
              return (
                <RankCard
                  key={`${type}-${item.id}`}
                  rank={index + 1}
                  id={item.id}
                  title={item.title ?? item.name ?? ''}
                  posterPath={item.poster_path ?? ''}
                  rating={item.vote_average}
                  year={year}
                  type={type}
                  extraBadge={index === 0 ? 'TOP #1' : undefined}
                />
              );
            })}
          </CarouselRow>
        )}

        {/* ── 2. Trending Movies ── */}
        <CarouselRow
          title="Trending Movies"
          seeMoreHref={`/${locale}/movies`}
          exploreHref={`/${locale}/explore?type=movie`}
        >
          {moviesList.map((movie) => (
            <PosterCard 
              key={movie.id}
              id={movie.id}
              title={movie.title ?? movie.name ?? ''}
              posterPath={movie.poster_path ?? ''}
              rating={movie.vote_average}
              year={movie.release_date ? movie.release_date.split('-')[0] : (movie.first_air_date ? movie.first_air_date.split('-')[0] : '')}
              type="movie"
            />
          ))}
        </CarouselRow>

        {/* ── 4. Trending TV Shows ── */}
        <CarouselRow
          title="Trending TV Shows"
          seeMoreHref={`/${locale}/tv`}
          exploreHref={`/${locale}/explore?type=tv`}
        >
          {tvList.map((show) => (
            <PosterCard 
              key={show.id}
              id={show.id}
              title={show.name ?? show.title ?? ''}
              posterPath={show.poster_path ?? ''}
              rating={show.vote_average}
              year={show.first_air_date ? show.first_air_date.split('-')[0] : ''}
              type="tv"
            />
          ))}
        </CarouselRow>

        {/* ── 5. Popular Anime ── */}
        <CarouselRow
          title="Popular Anime"
          seeMoreHref={`/${locale}/anime`}
          exploreHref={`/${locale}/explore?type=anime`}
        >
          {animeList.map((show) => (
            <PosterCard 
              key={show.id}
              id={show.id}
              title={show.name ?? ''}
              posterPath={show.poster_path ?? ''}
              rating={show.vote_average}
              year={show.first_air_date ? show.first_air_date.split('-')[0] : ''}
              type="anime"
            />
          ))}
        </CarouselRow>

        {/* ── 6. Bollywood & Indian Cinema ── */}
        <CarouselRow
          title="Bollywood & Indian Cinema"
          seeMoreHref={`/${locale}/movies`}
          exploreHref={`/${locale}/explore?type=bollywood`}
        >
          {bollywoodList.map((movie) => (
            <PosterCard 
              key={movie.id}
              id={movie.id}
              title={movie.title ?? ''}
              posterPath={movie.poster_path ?? ''}
              rating={movie.vote_average}
              year={movie.release_date ? movie.release_date.split('-')[0] : ''}
              type="movie"
              extraBadge="HINDI"
            />
          ))}
        </CarouselRow>

        {/* ── 7. K-Drama & Korean Shows ── */}
        <CarouselRow
          title="K-Drama & Korean Shows"
          seeMoreHref={`/${locale}/k-drama`}
          exploreHref={`/${locale}/explore?type=kdrama`}
        >
          {kdramaList.map((show) => (
            <PosterCard 
              key={show.id}
              id={show.id}
              title={show.name ?? show.title ?? ''}
              posterPath={show.poster_path ?? ''}
              rating={show.vote_average}
              year={show.first_air_date ? show.first_air_date.split('-')[0] : ''}
              type="tv"
              extraBadge="K-DRAMA"
            />
          ))}
        </CarouselRow>

        {/* ── 8. Top Rated Masterpieces ── */}
        <CarouselRow
          title="Top Rated Masterpieces"
          seeMoreHref={`/${locale}/movies`}
          exploreHref={`/${locale}/explore?type=movie&sort=vote_average.desc`}
        >
          {topRatedList.map((movie) => (
            <PosterCard 
              key={movie.id}
              id={movie.id}
              title={movie.title ?? ''}
              posterPath={movie.poster_path ?? ''}
              rating={movie.vote_average}
              year={movie.release_date ? movie.release_date.split('-')[0] : ''}
              type="movie"
            />
          ))}
        </CarouselRow>

        {/* ── 9. Now Playing in Theaters ── */}
        <CarouselRow
          title="Now Playing in Theaters"
          seeMoreHref={`/${locale}/theater`}
          exploreHref={`/${locale}/explore?type=movie&sort=primary_release_date.desc`}
        >
          {nowPlayingList.map((movie) => (
            <PosterCard 
              key={movie.id}
              id={movie.id}
              title={movie.title ?? ''}
              posterPath={movie.poster_path ?? ''}
              rating={movie.vote_average}
              year={movie.release_date ? movie.release_date.split('-')[0] : ''}
              type="movie"
            />
          ))}
        </CarouselRow>

        {/* ── 10. Action & Adventure ── */}
        <CarouselRow
          title="Action & Adventure"
          seeMoreHref={`/${locale}/movies`}
          exploreHref={`/${locale}/explore?genre=28`}
        >
          {actionList.map((movie) => (
            <PosterCard 
              key={movie.id}
              id={movie.id}
              title={movie.title ?? ''}
              posterPath={movie.poster_path ?? ''}
              rating={movie.vote_average}
              year={movie.release_date ? movie.release_date.split('-')[0] : ''}
              type="movie"
            />
          ))}
        </CarouselRow>
      </div>
    </main>
  );
}
