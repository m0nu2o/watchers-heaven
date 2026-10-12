'use client';
import { useState, useEffect, useCallback } from 'react';
import { ApiGateway } from '@/lib/api/gateway';
import { PosterCard } from '@/components/cards/PosterCard';
import { Tv, Loader, Search, X, ChevronDown, SlidersHorizontal, ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

const TV_GENRES = [
  { id: '10759', name: 'Action & Adventure' },
  { id: '16', name: 'Animation' },
  { id: '35', name: 'Comedy' },
  { id: '80', name: 'Crime' },
  { id: '99', name: 'Documentary' },
  { id: '18', name: 'Drama' },
  { id: '10751', name: 'Family' },
  { id: '10762', name: 'Kids' },
  { id: '9648', name: 'Mystery' },
  { id: '10763', name: 'News' },
  { id: '10764', name: 'Reality' },
  { id: '10765', name: 'Sci-Fi & Fantasy' },
  { id: '10766', name: 'Soap' },
  { id: '10768', name: 'War & Politics' },
  { id: '37', name: 'Western' },
];

const YEARS = ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015'];

const ITEMS_PER_PAGE = 20;

export default function TvShowsPage() {
  const tCat = useTranslations('Categories');
  const tFil = useTranslations('Filters');

  const [shows, setShows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState(''); // '', 'hollywood', 'bollywood'
  const [sortBy, setSortBy] = useState('popularity.desc');
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // UI
  const [showFilters, setShowFilters] = useState(false);

  const toggleGenre = (genreId: string) => {
    setSelectedGenres(prev => 
      prev.includes(genreId) 
        ? prev.filter(g => g !== genreId) 
        : [...prev, genreId]
    );
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedGenres([]);
    setSelectedYear('');
    setSelectedIndustry('');
    setSortBy('popularity.desc');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters = selectedGenres.length > 0 || selectedYear || selectedIndustry || sortBy !== 'popularity.desc' || searchQuery;

  const loadShows = useCallback(async () => {
    setLoading(true);
    try {
      if (searchQuery.trim()) {
        const data = await ApiGateway.fetchTmdb<{ results: Record<string, unknown>[]; total_pages: number }>('/search/tv', {
          query: searchQuery.trim(),
          page: String(currentPage),
          include_adult: 'false',
        });
        if (data.results) {
          let results: Record<string, unknown>[] = data.results || [];
          if (selectedIndustry === 'hollywood') {
            results = results.filter((r) => r.original_language === 'en');
          } else if (selectedIndustry === 'bollywood') {
            results = results.filter((r) => r.original_language === 'hi');
          } else if (selectedIndustry === 'kdrama') {
            results = results.filter((r) => r.original_language === 'ko' || (r.origin_country as string[])?.includes('KR'));
          }
          setShows(results.slice(0, ITEMS_PER_PAGE));
          setTotalPages(Math.min(data.total_pages || 1, 500));
        }
      } else {
        const params: Record<string, string> = {
          page: String(currentPage),
          sort_by: sortBy,
          include_adult: 'false',
        };

        if (selectedGenres.length > 0) {
          params.with_genres = selectedGenres.join(',');
        }
        if (selectedYear) {
          params.first_air_date_year = selectedYear;
        }
        if (selectedIndustry === 'hollywood') {
          params.with_original_language = 'en';
        } else if (selectedIndustry === 'bollywood') {
          params.with_original_language = 'hi';
        } else if (selectedIndustry === 'kdrama') {
          params.with_original_language = 'ko';
          params.with_origin_country = 'KR';
        }
        if (sortBy === 'vote_average.desc') {
          params['vote_count.gte'] = '200';
        }

        const data = await ApiGateway.fetchTmdb<{ results: Record<string, unknown>[]; total_pages: number }>('/discover/tv', params);
        if (data.results) {
          setShows(data.results.slice(0, ITEMS_PER_PAGE));
          setTotalPages(Math.min(data.total_pages || 1, 500));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedGenres, selectedYear, sortBy, searchQuery, selectedIndustry]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadShows();
  }, [loadShows]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSearching(true);
    const timer = setTimeout(() => {
      setCurrentPage(1);
      setIsSearching(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="min-h-screen py-10 px-4 md:px-8 bg-[var(--color-main)]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <Tv className="w-8 h-8 text-accent-blue" />
                {tCat('tvTitle')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                {tCat('subtitle')}
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-300 border shadow-sm ${
                showFilters 
                  ? 'bg-accent-blue text-white border-transparent shadow-accent-blue/20' 
                  : 'bg-white dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-accent-blue/50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {tFil('filtersBtn')}
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              )}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tFil('searchPlaceholder')}
              className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 transition-all shadow-sm backdrop-blur-md"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {isSearching && (
              <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-accent-blue" />
            )}
          </div>
        </div>

        {/* Modern Filters Panel */}
        {showFilters && (
          <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-100 dark:border-slate-700/80 shadow-xl p-5 space-y-5 animate-fade-in">
            
            {/* Genres — Interactive Chips */}
            <div className="space-y-2.5">
              <h3 className="text-[10px] font-black tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase">{tFil('genre')}</h3>
              <div className="flex flex-wrap gap-2">
                {TV_GENRES.map(g => (
                  <button
                    key={g.id}
                    onClick={() => toggleGenre(g.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                      selectedGenres.includes(g.id)
                        ? 'bg-accent-blue text-white border-transparent shadow-md shadow-accent-blue/20 scale-105'
                        : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:border-accent-blue/40 hover:text-accent-blue'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Industry — Chips */}
            <div className="space-y-2.5">
              <h3 className="text-[10px] font-black tracking-[0.2em] text-slate-400 dark:text-slate-400 uppercase">{tFil('industry')}</h3>
              <div className="flex gap-2">
                {[
                  { id: '', name: tFil('allIndustries') },
                  { id: 'hollywood', name: tFil('hollywood') },
                  { id: 'bollywood', name: 'Hindi TV / Serials' },
                  { id: 'kdrama', name: 'K-Drama' },
                ].map(ind => (
                  <button
                    key={ind.id}
                    onClick={() => { setSelectedIndustry(ind.id); setCurrentPage(1); }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                      selectedIndustry === ind.id
                        ? 'bg-accent-blue text-white border-transparent shadow-md shadow-accent-blue/20 scale-105'
                        : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:border-accent-blue/40 hover:text-accent-blue'
                    }`}
                  >
                    {ind.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Year & Sort Row */}
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase">{tFil('year')}</label>
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
                    className="appearance-none px-4 py-2.5 pr-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent-blue/30 transition shadow-sm cursor-pointer min-w-[120px]"
                  >
                    <option value="">{tFil('allYears')}</option>
                    {YEARS.map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase">{tFil('sortBy')}</label>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                    className="appearance-none px-4 py-2.5 pr-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent-blue/30 transition shadow-sm cursor-pointer min-w-[160px]"
                  >
                    {[
                      { value: 'popularity.desc', label: tFil('sortPopular') },
                      { value: 'vote_average.desc', label: tFil('sortRated') },
                      { value: 'first_air_date.desc', label: tFil('sortLatest') },
                    ].map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 hover:bg-red-100 dark:hover:bg-red-950/50 transition"
                >
                  <X className="w-3.5 h-3.5" />
                  {tFil('clearAll')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active filters summary chips */}
        {(selectedGenres.length > 0 || selectedYear) && !showFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {selectedGenres.map(gId => {
              const genre = TV_GENRES.find(g => g.id === gId);
              return (
                <span key={gId} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-blue/10 text-accent-blue text-[11px] font-bold border border-accent-blue/20">
                  {genre?.name}
                  <button onClick={() => toggleGenre(gId)} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {selectedYear && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-blue/10 text-accent-blue text-[11px] font-bold border border-accent-blue/20">
                {selectedYear}
                <button onClick={() => setSelectedYear('')} className="hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Content grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader className="w-8 h-8 animate-spin text-accent-blue" />
          </div>
        ) : shows.length > 0 ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {shows.map((item) => (
                <PosterCard
                  key={item.id as number}
                  id={item.id as number}
                  title={item.name as string}
                  posterPath={item.poster_path as string}
                  rating={item.vote_average as number}
                  year={item.first_air_date ? (item.first_air_date as string).split('-')[0] : ''}
                  type="tv"
                />
              ))}
            </div>

            {/* Modern Pagination */}
            <div className="flex items-center justify-center gap-3 pt-6">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || loading}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-40 disabled:pointer-events-none transition shadow-sm bg-white dark:bg-slate-900/80"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {tFil('previous')}
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                        pageNum === currentPage
                          ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || loading}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-40 disabled:pointer-events-none transition shadow-sm bg-white dark:bg-slate-900/80"
              >
                {tFil('next')}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-slate-400 dark:text-slate-600">
            {tFil('noResults')}
          </div>
        )}
      </div>
    </div>
  );
}
