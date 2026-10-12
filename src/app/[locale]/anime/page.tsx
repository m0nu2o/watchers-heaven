'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ApiGateway } from '@/lib/api/gateway';
import { PosterCard } from '@/components/cards/PosterCard';
import { filterContentByDub } from '@/lib/audio';
import { isJapaneseAnime, type ClassifiableMedia } from '@/lib/classification';
import {
  Play,
  Info,
  Star,
  Search,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Flame,
  Award,
  Mic,
  Languages,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const ANIME_GENRES = [
  { id: 'all', name: 'All Anime' },
  { id: '10759', name: 'Action & Adventure' },
  { id: '16', name: 'Animation' },
  { id: '35', name: 'Comedy' },
  { id: '18', name: 'Drama' },
  { id: '10765', name: 'Sci-Fi & Fantasy' },
  { id: '9628', name: 'Mystery' },
];

const SORT_OPTIONS = [
  { id: 'popularity.desc', label: 'Trending' },
  { id: 'vote_average.desc', label: 'Top Rated' },
  { id: 'first_air_date.desc', label: 'Newest' },
];

const ITEMS_PER_PAGE = 20;

interface AnimeShow {
  id: number;
  name?: string;
  original_name?: string;
  overview?: string;
  backdrop_path?: string;
  poster_path?: string;
  vote_average?: number;
  first_air_date?: string;
  original_language?: string;
}

export default function AnimePage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || 'en';

  const tCat = useTranslations('Categories');
  const tFil = useTranslations('Filters');

  // Hero Spotlight state
  const [heroAnime, setHeroAnime] = useState<AnimeShow | null>(null);
  const [trendingList, setTrendingList] = useState<AnimeShow[]>([]);
  const [topRatedList, setTopRatedList] = useState<AnimeShow[]>([]);

  // Main catalog state
  const [shows, setShows] = useState<AnimeShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter state
  const [animationTab, setAnimationTab] = useState<'anime' | 'donghua' | 'all'>('anime');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState('');
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [audioFilter, setAudioFilter] = useState<'all' | 'sub' | 'dub'>('all');

  const displayedShows = useMemo(() => {
    if (audioFilter === 'dub') {
      return filterContentByDub(shows as unknown as Record<string, unknown>[], 'english', 'anime') as unknown as AnimeShow[];
    }
    return shows;
  }, [shows, audioFilter]);

  // ── Load Curated Rails & Hero Spotlight (Once on Mount) ──
  useEffect(() => {
    async function loadCurated() {
      try {
        const trendingRes = await ApiGateway.fetchTmdb<{ results: AnimeShow[] }>('/discover/tv', {
          sort_by: 'popularity.desc',
          with_genres: '16',
          with_original_language: 'ja',
          'vote_count.gte': '20',
        });

        if (trendingRes?.results && trendingRes.results.length > 0) {
          const validBackdrops = trendingRes.results.filter((i) => Boolean(i.backdrop_path && i.overview));
          if (validBackdrops.length > 0) {
            setHeroAnime(validBackdrops[0]);
            setTrendingList(trendingRes.results.slice(0, 14));
          } else {
            setHeroAnime(trendingRes.results[0]);
            setTrendingList(trendingRes.results.slice(0, 14));
          }
        }

        const topRes = await ApiGateway.fetchTmdb<{ results: AnimeShow[] }>('/discover/tv', {
          sort_by: 'vote_average.desc',
          with_genres: '16',
          with_original_language: 'ja',
          'vote_count.gte': '200',
        });

        if (topRes?.results) {
          setTopRatedList(topRes.results.slice(0, 14));
        }
      } catch (err) {
        console.warn('Could not load anime spotlight collections:', err);
      }
    }
    loadCurated();
  }, []);

  // ── Load Filtered Catalog ──
  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      if (searchQuery.trim()) {
        const data = await ApiGateway.fetchTmdb<{ results: AnimeShow[]; total_pages: number }>(
          '/search/tv',
          {
            query: searchQuery.trim(),
            page: String(currentPage),
            include_adult: 'false',
          }
        );
        if (data.results) {
          const filtered = data.results.filter((item) => {
            const rec = item as unknown as ClassifiableMedia;
            if (animationTab === 'anime') return isJapaneseAnime(rec);
            if (animationTab === 'donghua') return rec.original_language === 'zh' || rec.origin_country?.includes('CN');
            return isJapaneseAnime(rec) || rec.original_language === 'zh' || rec.origin_country?.includes('CN');
          });
          setShows(filtered.slice(0, ITEMS_PER_PAGE));
          setTotalPages(Math.min(data.total_pages || 1, 500));
        }
      } else {
        const genres = selectedGenre === 'all' ? ['16'] : ['16', selectedGenre];
        const langParam = animationTab === 'anime' ? 'ja' : animationTab === 'donghua' ? 'zh' : 'ja|zh';
        const fetchParams: Record<string, string> = {
          page: String(currentPage),
          sort_by: sortBy,
          with_genres: genres.join(','),
          with_original_language: langParam,
          include_adult: 'false',
        };

        if (selectedYear) {
          fetchParams.first_air_date_year = selectedYear;
        }
        if (sortBy === 'vote_average.desc') {
          fetchParams['vote_count.gte'] = '50';
        }

        const data = await ApiGateway.fetchTmdb<{ results: AnimeShow[]; total_pages: number }>(
          '/discover/tv',
          fetchParams
        );
        if (data.results) {
          setShows(data.results.slice(0, ITEMS_PER_PAGE));
          setTotalPages(Math.min(data.total_pages || 1, 500));
        }
      }
    } catch (err) {
      console.error('Failed to load anime catalog:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedGenre, selectedYear, sortBy, searchQuery, animationTab]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery) return;
    setIsSearching(true);
    const timer = setTimeout(() => {
      setCurrentPage(1);
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[var(--color-main)] text-slate-900 dark:text-slate-100 font-sans pb-24 selection:bg-blue-600/30 transition-colors duration-300">
      
      {/* ──────────────── 1. CINEMATIC APPLE TV+ HERO SPOTLIGHT ──────────────── */}
      {heroAnime && (
        <div className="relative w-full h-[65vh] md:h-[75vh] lg:h-[80vh] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8">
          {/* Panoramic Backdrop */}
          {heroAnime.backdrop_path && (
            <img
              src={`https://image.tmdb.org/t/p/original${heroAnime.backdrop_path}`}
              alt={heroAnime.name || 'Hero Anime'}
              className="absolute inset-0 w-full h-full object-cover object-center scale-105 transition-transform duration-1000 ease-out"
            />
          )}

          {/* Vignette & Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent w-full md:w-3/4" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.15),transparent_60%)]" />

          {/* Content Block */}
          <div className="absolute bottom-12 left-6 md:left-16 lg:left-24 right-6 max-w-2xl space-y-4 z-10 animate-fade-in">
            {/* Badges */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="apple-glass text-blue-400 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full border border-blue-400/20 shadow-md">
                Featured Anime
              </span>
              <div className="flex items-center rounded-full bg-black/60 backdrop-blur-md p-0.5 border border-white/10 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setAudioFilter('sub')}
                  className={`px-2.5 py-0.5 rounded-full transition cursor-pointer ${
                    audioFilter === 'sub'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Filter Japanese Subbed"
                >
                  🇯🇵 SUB
                </button>
                <button
                  type="button"
                  onClick={() => setAudioFilter('dub')}
                  className={`px-2.5 py-0.5 rounded-full transition cursor-pointer ${
                    audioFilter === 'dub'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Filter English Dubbed"
                >
                  🎙️ DUB
                </button>
              </div>
              {heroAnime.vote_average !== undefined && heroAnime.vote_average > 0 && (
                <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md text-amber-300 text-[11px] font-black px-2.5 py-1 rounded-full border border-amber-400/20">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{heroAnime.vote_average.toFixed(1)}</span>
                </div>
              )}
              {heroAnime.first_air_date && (
                <span className="text-slate-300 text-xs font-semibold">
                  {heroAnime.first_air_date.slice(0, 4)}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none drop-shadow-2xl">
              {heroAnime.name || heroAnime.original_name}
            </h1>

            {/* Synopsis */}
            <p className="text-slate-300 text-xs sm:text-sm md:text-base line-clamp-3 leading-relaxed max-w-xl font-normal drop-shadow-md">
              {heroAnime.overview}
            </p>

            {/* Apple-grade CTA Actions */}
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button
                onClick={() => {
                  const trackParam = audioFilter === 'dub' ? 'dub-en' : 'sub';
                  router.push(`/${locale}/watch/${heroAnime.id}?s=1&e=1&type=anime&track=${trackParam}`);
                }}
                className="flex items-center gap-2.5 bg-white hover:bg-slate-100 text-black font-extrabold px-6 py-3.5 rounded-full text-xs sm:text-sm transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-white/20 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-black text-black" />
                <span>Stream Episode 1 {audioFilter === 'dub' ? '(Dubbed)' : '(Subbed)'}</span>
              </button>

              <button
                onClick={() => {
                  router.push(`/${locale}/watch/${heroAnime.id}?s=1&e=1&type=anime&track=dub-en`);
                }}
                className="flex items-center gap-2 apple-glass hover:bg-white/[0.1] text-amber-300 font-bold px-4 py-3.5 rounded-full text-xs sm:text-sm transition-all duration-200 cursor-pointer border border-amber-400/25 shadow-lg"
              >
                <span>🎙️ Stream English Dub</span>
              </button>

              <Link
                href={`/${locale}/tv/${heroAnime.id}?from=anime`}
                className="flex items-center gap-2 apple-glass hover:bg-white/[0.1] text-white font-bold px-5 py-3.5 rounded-full text-xs sm:text-sm transition-all duration-200 cursor-pointer border border-white/15"
              >
                <Info className="w-4 h-4 text-slate-300" />
                <span>Details & Arcs</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── 2. CURATED SPOTLIGHT RAILS ──────────────── */}
      <div className="space-y-12 mt-8 max-w-7xl mx-auto px-2 sm:px-4">
        
        {/* Rail 1: Trending Right Now */}
        {trendingList.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Trending in Anime
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Most watched Japanese releases this week</p>
                </div>
              </div>
            </div>

            <div
              className="flex items-center gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none"
              data-lenis-prevent
            >
              {trendingList.map((item) => {
                const track = audioFilter === 'dub' ? 'dub-en' : 'sub';
                const badge = audioFilter === 'dub' ? '🎙️ DUB' : '🇯🇵 SUB';
                return (
                  <PosterCard
                    key={item.id}
                    id={item.id}
                    title={item.name || item.original_name || 'Anime'}
                    posterPath={item.poster_path || ''}
                    rating={item.vote_average}
                    year={item.first_air_date ? item.first_air_date.slice(0, 4) : undefined}
                    type="anime"
                    extraBadge={badge}
                    hrefOverride={`/${locale}/watch/${item.id}?s=1&e=1&type=anime&track=${track}`}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Rail 2: Top Rated Shonen & Masterpieces */}
        {topRatedList.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    All-Time Masterpieces
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Critically acclaimed story arcs & series</p>
                </div>
              </div>
            </div>

            <div
              className="flex items-center gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none"
              data-lenis-prevent
            >
              {topRatedList.map((item) => {
                const track = audioFilter === 'dub' ? 'dub-en' : 'sub';
                const badge = audioFilter === 'dub' ? '🎙️ DUB' : '🇯🇵 SUB';
                return (
                  <PosterCard
                    key={item.id}
                    id={item.id}
                    title={item.name || item.original_name || 'Anime'}
                    posterPath={item.poster_path || ''}
                    rating={item.vote_average}
                    year={item.first_air_date ? item.first_air_date.slice(0, 4) : undefined}
                    type="anime"
                    extraBadge={badge}
                    hrefOverride={`/${locale}/watch/${item.id}?s=1&e=1&type=anime&track=${track}`}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* ──────────────── 3. APPLE-STYLE MINIMALIST FILTER BAR ──────────────── */}
        <div className="pt-6 border-t border-black/[0.08] dark:border-white/[0.08] space-y-5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                <span>Explore Complete Anime Catalog</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Stream with verified Japanese audio, English dubs, and story arc navigation
              </p>
            </div>

            {/* Apple Search Capsule */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anime title..."
                className="w-full pl-10 pr-9 py-2.5 rounded-full apple-glass text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Segmented Glass Genre & Sort Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 apple-glass p-2 rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
            {/* Category Selector: Anime vs Donghua vs All */}
            <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-xl border border-black/[0.06] dark:border-white/[0.08] shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setAnimationTab('anime');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  animationTab === 'anime'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🇯🇵</span>
                <span>Anime</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnimationTab('donghua');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  animationTab === 'donghua'
                    ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🇨🇳</span>
                <span>Donghua</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnimationTab('all');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  animationTab === 'all'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All
              </button>
            </div>

            {/* Audio Format Pills (All / Subbed / Dubbed) */}
            <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-xl border border-black/[0.06] dark:border-white/[0.08] shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setAudioFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  audioFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🌐 All Formats
              </button>
              <button
                type="button"
                onClick={() => {
                  setAudioFilter('sub');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  audioFilter === 'sub'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🇯🇵</span>
                <span>Subbed</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAudioFilter('dub');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  audioFilter === 'dub'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🎙️</span>
                <span>Dubbed</span>
              </button>
            </div>

            {/* Genre Pills */}
            <div
              className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 flex-1 min-w-0"
              data-lenis-prevent
            >
              {ANIME_GENRES.map((g) => {
                const isActive = selectedGenre === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      setSelectedGenre(g.id);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="apple-glass text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ──────────────── 4. MAIN CATALOG GRID ──────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-blue-500 animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold animate-pulse">Loading anime series...</p>
          </div>
        ) : displayedShows.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
            {displayedShows.map((item) => {
              const track = audioFilter === 'dub' ? 'dub-en' : 'sub';
              const badge = audioFilter === 'dub' ? '🎙️ DUB' : '🇯🇵 SUB';
              return (
                <PosterCard
                  key={item.id}
                  id={item.id}
                  title={item.name || item.original_name || 'Anime'}
                  posterPath={item.poster_path || ''}
                  rating={item.vote_average}
                  year={item.first_air_date ? item.first_air_date.slice(0, 4) : undefined}
                  type="anime"
                  extraBadge={badge}
                  hrefOverride={`/${locale}/watch/${item.id}?s=1&e=1&type=anime&track=${track}`}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center apple-glass rounded-3xl p-8 space-y-3 border border-black/10 dark:border-white/10">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No anime matching your search criteria</p>
            <button
              onClick={() => {
                setSelectedGenre('all');
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* ──────────────── 5. APPLE-STYLE PAGINATION ──────────────── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-8 pb-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2.5 rounded-xl apple-glass text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white border border-black/10 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition hover:scale-105 active:scale-95 cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-3 py-1.5 apple-glass rounded-xl border border-black/10 dark:border-white/10">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-xl apple-glass text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white border border-black/10 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition hover:scale-105 active:scale-95 cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
