'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ApiGateway } from '@/lib/api/gateway';
import { PosterCard } from '@/components/cards/PosterCard';
import { SlidersHorizontal, Loader, Search, X, ChevronLeft, ChevronRight, Compass } from 'lucide-react';
import { filterContentByDubAsync } from '@/lib/audio';
import {
  classifyContent,
  resolveFormat,
  getPlaybackMediaType,
  type ClassifiableMedia,
} from '@/lib/classification';

interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
  original_language?: string;
  genre_ids?: number[];
  origin_country?: string[];
}

const CATEGORIES = [
  { id: 'all', label: 'All Content' },
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'TV Shows' },
  { id: 'anime', label: 'Anime Series' },
  { id: 'donghua', label: 'Donghua' },
  { id: 'anime-movie', label: 'Anime Movies' },
  { id: 'animation', label: 'Animation & Cartoons' },
  { id: 'kdrama', label: 'K-Drama' },
  { id: 'cdrama', label: 'C-Drama' },
  { id: 'bollywood', label: 'Bollywood' },
  { id: 'hollywood', label: 'Hollywood' },
];

const GENRES = [
  { id: 'all', name: 'All Genres' },
  { id: '28', name: 'Action' },
  { id: '12', name: 'Adventure' },
  { id: '16', name: 'Animation' },
  { id: '35', name: 'Comedy' },
  { id: '80', name: 'Crime' },
  { id: '18', name: 'Drama' },
  { id: '14', name: 'Fantasy' },
  { id: '27', name: 'Horror' },
  { id: '9648', name: 'Mystery' },
  { id: '878', name: 'Sci-Fi' },
  { id: '53', name: 'Thriller' },
];

const YEARS = ['all', '2026', '2025', '2024', '2023', '2022', '2021', '2020'];

function ExploreContent() {
  const searchParams = useSearchParams();

  const initialType = searchParams.get('type') || 'all';
  const initialGenre = searchParams.get('genre') || 'all';
  const initialYear = searchParams.get('year') || 'all';
  const initialAudio = searchParams.get('audio') || 'all';
  const initialSort = searchParams.get('sort') || 'popularity.desc';

  const [activeType, setActiveType] = useState<string>(initialType);
  const [selectedGenre, setSelectedGenre] = useState<string>(initialGenre);
  const [selectedYear, setSelectedYear] = useState<string>(initialYear);
  const [dubFilter, setDubFilter] = useState<'all' | 'hindi' | 'english' | 'both'>(
    initialAudio === 'hi' ? 'hindi' : initialAudio === 'en' ? 'english' : 'all'
  );
  const [sortBy, setSortBy] = useState<string>(initialSort);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  useEffect(() => {
    let cancelled = false;

    async function loadExploreData() {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);

      try {
        let endpoint = '/discover/movie';
        const queryParams: Record<string, string> = {
          page: String(page),
          sort_by: sortBy,
          include_adult: 'false',
        };

        if (selectedGenre !== 'all') {
          queryParams.with_genres = selectedGenre;
        }
        if (selectedYear !== 'all') {
          queryParams.primary_release_year = selectedYear;
          queryParams.first_air_date_year = selectedYear;
        }

        if (activeType === 'tv') {
          endpoint = '/discover/tv';
        } else if (activeType === 'anime') {
          endpoint = '/discover/tv';
          queryParams.with_genres = '16';
          queryParams.with_original_language = 'ja';
        } else if (activeType === 'donghua') {
          endpoint = '/discover/tv';
          queryParams.with_genres = '16';
          queryParams.with_original_language = 'zh';
        } else if (activeType === 'anime-movie') {
          endpoint = '/discover/movie';
          queryParams.with_genres = '16';
          queryParams.with_original_language = 'ja';
        } else if (activeType === 'animation' || activeType === 'cartoon') {
          endpoint = '/discover/movie';
          queryParams.with_genres = '16';
          queryParams.without_original_language = 'ja';
        } else if (activeType === 'kdrama') {
          endpoint = '/discover/tv';
          queryParams.with_original_language = 'ko';
        } else if (activeType === 'cdrama') {
          endpoint = '/discover/tv';
          queryParams.with_original_language = 'zh';
        } else if (activeType === 'bollywood') {
          endpoint = '/discover/movie';
          queryParams.with_original_language = 'hi';
        } else if (activeType === 'hollywood') {
          endpoint = '/discover/movie';
          queryParams.with_original_language = 'en';
        } else if (activeType === 'all') {
          endpoint = '/trending/all/week';
        }

        let resultsList: MediaItem[] = [];
        let totalPagesResolved = 1;

        if (dubFilter === 'all') {
          const res = await ApiGateway.fetchTmdb<{ results?: MediaItem[]; total_pages?: number }>(endpoint, queryParams);
          resultsList = res.results || [];
          totalPagesResolved = Math.min(res.total_pages || 1, 100);
        } else {
          // When a dub filter is active, fetch multiple underlying pages to assemble a rich, full dataset
          const pageOffset = (page - 1) * 2 + 1;
          const [res1, res2] = await Promise.all([
            ApiGateway.fetchTmdb<{ results?: MediaItem[]; total_pages?: number }>(endpoint, {
              ...queryParams,
              page: String(pageOffset),
            }).catch(() => ({ results: [] as MediaItem[], total_pages: 1 })),
            ApiGateway.fetchTmdb<{ results?: MediaItem[]; total_pages?: number }>(endpoint, {
              ...queryParams,
              page: String(pageOffset + 1),
            }).catch(() => ({ results: [] as MediaItem[], total_pages: 1 })),
          ]);

          const combined = [...(res1.results || []), ...(res2.results || [])];
          const uniqueMap = new Map<string | number, MediaItem>();
          combined.forEach((item) => {
            if (item && item.id) uniqueMap.set(item.id, item);
          });
          const deduplicated = Array.from(uniqueMap.values());

          const filtered = await filterContentByDubAsync(
            deduplicated as unknown as Record<string, unknown>[],
            dubFilter,
            activeType === 'anime' ? 'anime' : activeType === 'tv' ? 'tv' : 'movie'
          );
          resultsList = filtered as unknown as MediaItem[];
          totalPagesResolved = Math.min(Math.ceil((res1.total_pages || 1) / 2), 50);
        }

        if (!cancelled) {
          setItems(resultsList);
          setTotalPages(totalPagesResolved);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Explore load error:', err);
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadExploreData();
    return () => {
      cancelled = true;
    };
  }, [activeType, selectedGenre, selectedYear, sortBy, dubFilter, page]);

  // Client search filtering
  const displayedItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const title = (item.title || item.name || '').toLowerCase();
    return title.includes(q);
  });

  return (
    <div className="min-h-screen pb-24 bg-[var(--color-main)] text-slate-900 dark:text-white">
      {/* Header Banner */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-accent-blue/10 text-accent-blue">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">Explore & Discover</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Browse Movies, TV, Anime, K-Drama, Bollywood and verified dubs
                </p>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search within explore..."
                className="w-full pl-10 pr-8 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
            {CATEGORIES.map((cat) => {
              const isActive = activeType === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveType(cat.id);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-accent-blue text-white shadow-md shadow-blue-500/20'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-400/40 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Filters Bar: Genre, Year, Audio Dub, Sort */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[10px] mr-1">
              <SlidersHorizontal className="w-3 h-3" />
              Filters:
            </div>

            {/* Audio / Dub Filter Chips */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              {[
                { id: 'all', label: 'All Audio' },
                { id: 'hindi', label: '🇮🇳 Hindi Dub' },
                { id: 'english', label: '🇬🇧 English Dub' },
                { id: 'both', label: 'Hindi + English' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => {
                    const newFilter = btn.id as 'all' | 'hindi' | 'english' | 'both';
                    setDubFilter(newFilter);
                    setPage(1);
                    if (typeof window !== 'undefined') {
                      const params = new URLSearchParams(window.location.search);
                      if (newFilter === 'all') params.delete('audio');
                      else params.set('audio', newFilter);
                      const str = params.toString();
                      window.history.replaceState(null, '', str ? `?${str}` : window.location.pathname);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    dubFilter === btn.id
                      ? 'bg-accent-blue text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Genre Select */}
            <select
              value={selectedGenre}
              onChange={(e) => {
                setSelectedGenre(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {GENRES.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>

            {/* Year Select */}
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Years</option>
              {YEARS.filter((y) => y !== 'all').map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs focus:outline-none focus:border-blue-500 cursor-pointer ml-auto"
            >
              <option value="popularity.desc">Most Popular</option>
              <option value="vote_average.desc">Highest Rated</option>
              <option value="primary_release_date.desc">Newest Releases</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Results Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 space-y-8">
        {loading ? (
          <div className="flex justify-center py-28">
            <Loader className="w-8 h-8 animate-spin text-accent-blue" />
          </div>
        ) : displayedItems.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {displayedItems.map((item) => {
                const classifiable = item as ClassifiableMedia;
                const category = classifyContent(classifiable);
                const format = resolveFormat(classifiable);
                const itemType = getPlaybackMediaType(category, format);

                return (
                  <PosterCard
                    key={item.id}
                    id={item.id}
                    title={item.title || item.name || ''}
                    posterPath={item.poster_path || ''}
                    rating={item.vote_average}
                    year={item.release_date ? item.release_date.split('-')[0] : (item.first_air_date ? item.first_air_date.split('-')[0] : '')}
                    type={itemType}
                    category={category}
                  />
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
              <button
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={page <= 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <span className="text-xs font-bold text-slate-500">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={page >= totalPages}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer shadow-sm"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-24 space-y-4">
            <p className="text-slate-400 text-sm">No titles found matching your explore filters.</p>
            <button
              onClick={() => {
                setActiveType('all');
                setSelectedGenre('all');
                setSelectedYear('all');
                setDubFilter('all');
                setSearchQuery('');
                setPage(1);
              }}
              className="px-4 py-2 rounded-xl bg-accent-blue text-white text-xs font-bold hover:bg-blue-600 transition"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-main)]">
        <Loader className="w-8 h-8 animate-spin text-accent-blue" />
      </div>
    }>
      <ExploreContent />
    </Suspense>
  );
}
