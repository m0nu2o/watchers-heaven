'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ApiGateway } from '@/lib/api/gateway';
import { Search, Loader, AlertCircle, Bot, Sparkles } from 'lucide-react';
import { PosterCard } from '@/components/cards/PosterCard';
import { useTranslations } from 'next-intl';
import { filterContentByDubAsync } from '@/lib/audio';
import { AiChatModal } from '@/components/chat/AiChatModal';
import { classifyContent, resolveFormat, getPlaybackMediaType, type ClassifiableMedia } from '@/lib/classification';

const normalizeString = (str: string) => {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const getQueryVariations = (q: string): string[] => {
  const normalized = q.trim();
  if (!normalized) return [];
  const variations = [normalized];
  
  // If no space, split common prefixes
  if (!normalized.includes(' ')) {
    const splitPattern = /^(spider|iron|bat|super|star|dark|john|die|fast|tom|x)(.+)$/i;
    const match = normalized.match(splitPattern);
    if (match) {
      variations.push(`${match[1]} ${match[2]}`);
    }
  }
  return [...new Set(variations)];
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialQuery = searchParams.get('q') || '';
  const initialAudio = (searchParams.get('audio') as 'all' | 'hindi' | 'english' | 'both') || 'all';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [trending, setTrending] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dubFilter, setDubFilterState] = useState<'all' | 'hindi' | 'english' | 'both'>(
    ['all', 'hindi', 'english', 'both'].includes(initialAudio) ? initialAudio : 'all'
  );

  const [filteredResults, setFilteredResults] = useState<Record<string, unknown>[]>([]);
  const [filteredTrending, setFilteredTrending] = useState<Record<string, unknown>[]>([]);
  const [filteringResults, setFilteringResults] = useState(false);
  const [filteringTrending, setFilteringTrending] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  
  const t = useTranslations('Search');

  const updateUrlParams = useCallback(
    (newQuery: string, newFilter: 'all' | 'hindi' | 'english' | 'both') => {
      const params = new URLSearchParams();
      if (newQuery.trim()) params.set('q', newQuery.trim());
      if (newFilter !== 'all') params.set('audio', newFilter);
      const str = params.toString();
      router.replace(str ? `${pathname}?${str}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  const handleSetDubFilter = (newFilter: 'all' | 'hindi' | 'english' | 'both') => {
    setDubFilterState(newFilter);
    updateUrlParams(query, newFilter);
  };

  // Load trending or language-specific preview
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      try {
        setFilteringTrending(true);
        if (dubFilter === 'hindi') {
          // Direct fetch of top popular Hindi catalog
          const [moviesRes, tvRes] = await Promise.all([
            ApiGateway.fetchTmdb<{ results: Record<string, unknown>[] }>('/discover/movie', {
              with_original_language: 'hi',
              sort_by: 'popularity.desc',
            }).catch(() => ({ results: [] })),
            ApiGateway.fetchTmdb<{ results: Record<string, unknown>[] }>('/discover/tv', {
              with_original_language: 'hi',
              sort_by: 'popularity.desc',
            }).catch(() => ({ results: [] })),
          ]);
          
          if (!isMounted) return;
          const merged = [...(moviesRes.results || []), ...(tvRes.results || [])]
            .filter((item) => item.poster_path)
            .slice(0, 18);
          setFilteredTrending(merged);
          setTrending(merged);
          return;
        }

        if (dubFilter === 'english') {
          const moviesRes = await ApiGateway.fetchTmdb<{ results: Record<string, unknown>[] }>('/discover/movie', {
            with_original_language: 'en',
            sort_by: 'popularity.desc',
          }).catch(() => ({ results: [] }));

          if (!isMounted) return;
          const merged = (moviesRes.results || []).filter((item) => item.poster_path).slice(0, 18);
          setFilteredTrending(merged);
          setTrending(merged);
          return;
        }

        // Default 'all'
        const data = await ApiGateway.fetchTmdb<{ results: Record<string, unknown>[] }>('/trending/movie/week');
        if (!isMounted) return;
        if (data.results) {
          const list = data.results.slice(0, 18);
          setTrending(list);
          setFilteredTrending(list);
        }
      } catch (err) {
        console.warn('Catalog fetch failed:', err instanceof Error ? err.message : err);
      } finally {
        if (isMounted) setFilteringTrending(false);
      }
    }
    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, [dubFilter]);

  useEffect(() => {
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setError(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const variations = getQueryVariations(query);
        const fetches = variations.map(v => 
          ApiGateway.fetchTmdb<{ results: Record<string, unknown>[] }>('/search/multi', { query: v }).catch(() => ({ results: [] as Record<string, unknown>[] }))
        );
        const responses = await Promise.all(fetches);
        
        // Merge results
        const allResults = responses.flatMap(res => res.results || []);
        
        // Remove duplicates
        const uniqueResultsMap = new Map<unknown, Record<string, unknown>>();
        allResults.forEach(item => {
          if (item && item.id) {
            uniqueResultsMap.set(item.id, item);
          }
        });
        let merged = Array.from(uniqueResultsMap.values());

        // Token-based matching & precision ranking
        const normQuery = normalizeString(query);
        const queryTokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

        merged = merged.filter((item) => {
          if (!item.poster_path) return false;
          const title = ((item.title as string) || (item.name as string) || '').toLowerCase();
          const originalTitle = ((item.original_title as string) || (item.original_name as string) || '').toLowerCase();
          const combined = `${title} ${originalTitle}`;

          const matchesNormalized =
            normalizeString(title).includes(normQuery) ||
            normalizeString(originalTitle).includes(normQuery);
          const matchesTokens =
            queryTokens.length > 0 && queryTokens.every((token) => combined.includes(token));

          return matchesNormalized || matchesTokens;
        });

        setResults(merged);
      } catch (err) {
        console.warn('Search query failed:', err instanceof Error ? err.message : err);
        setError('Connection timed out or returned an error. Please adjust your query or check your connection.');
      } finally {
        setLoading(false);
      }
    }, 350); // Fast 350ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  // Async filter search results whenever results or dubFilter changes
  useEffect(() => {
    let isMounted = true;
    if (dubFilter === 'all') {
      setFilteredResults(results);
      setFilteringResults(false);
      return;
    }

    setFilteringResults(true);
    filterContentByDubAsync(results, dubFilter)
      .then((filtered) => {
        if (isMounted) {
          setFilteredResults(filtered);
          setFilteringResults(false);
        }
      })
      .catch((err) => {
        console.warn('Filter results error:', err);
      if (isMounted) {
        // Keep search usable when optional audio verification is unavailable.
        setFilteredResults(results);
        setFilteringResults(false);
      }
      });

    return () => {
      isMounted = false;
    };
  }, [results, dubFilter]);

  return (
    <div className="min-h-screen py-10 px-4 md:px-8 bg-[var(--color-main)] animate-lumina-fade-in">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">{t('title')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('subtitle')}</p>
          </div>
          <button
            onClick={() => setIsAiOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all w-fit cursor-pointer hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ask Lumina AI Copilot</span>
          </button>
        </div>

        {/* Input bar */}
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={t('placeholder')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              updateUrlParams(e.target.value, dubFilter);
            }}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 shadow-sm transition-colors text-base"
          />
        </div>

        {/* Audio / Dub Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
            Audio / Dub:
          </span>
          {[
            { id: 'all', label: 'All' },
            { id: 'hindi', label: '🇮🇳 Hindi Dub' },
            { id: 'english', label: '🇬🇧 English Dub' },
            { id: 'both', label: 'Hindi + English Dub' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => handleSetDubFilter(btn.id as 'all' | 'hindi' | 'english' | 'both')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                dubFilter === btn.id
                  ? 'bg-accent-blue text-white shadow-blue-500/20 shadow-md'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-400/40 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-2xl text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="flex-1">{error}</div>
            <button
              onClick={() => {
                const current = query;
                setQuery('');
                setTimeout(() => setQuery(current), 50);
              }}
              className="px-3 py-1.5 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 rounded-xl text-xs font-bold transition"
            >
              Retry
            </button>
          </div>
        )}

        {loading || filteringResults ? (
          <div className="flex min-h-56 items-center justify-center py-20" aria-live="polite">
            <Loader className="w-8 h-8 animate-spin text-accent-blue" />
          </div>
        ) : query.trim() ? (
          (() => {
            if (filteredResults.length > 0) {
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredResults.map((item) => {
                    const classifiable = item as ClassifiableMedia;
                    const category = classifyContent(classifiable);
                    const format = resolveFormat(classifiable);
                    const itemType = getPlaybackMediaType(category, format);

                    return (
                      <PosterCard
                        key={item.id as number}
                        id={item.id as number}
                        title={(item.title as string) || (item.name as string)}
                        posterPath={item.poster_path as string}
                        rating={item.vote_average as number}
                        year={
                          item.release_date
                            ? (item.release_date as string).split('-')[0]
                            : item.first_air_date
                            ? (item.first_air_date as string).split('-')[0]
                            : ''
                        }
                        type={itemType}
                        category={category}
                      />
                    );
                  })}
                </div>
              );
            }
            if (results.length > 0 && dubFilter !== 'all') {
              return (
                <div className="text-center py-20 space-y-3 animate-lumina-fade-in">
                  <p className="text-slate-400 text-sm">No results match the selected Dub filter.</p>
                  <p className="text-slate-500 text-xs">Try All or choose a title with a verified audio track.</p>
                  <button
                    onClick={() => handleSetDubFilter('all')}
                    className="px-4 py-2 bg-accent-blue text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition cursor-pointer"
                  >
                    Reset Audio Filter
                  </button>
                </div>
              );
            }
            return (
              <div className="text-center py-20 space-y-2 text-slate-400 animate-lumina-fade-in">
                <p>{t('noResults', { query })}</p>
                <p className="text-xs text-slate-500">Try a shorter title or check the spelling.</p>
              </div>
            );
          })()
        ) : !error && (
          (() => {
            return (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  {t('trending')}
                  {filteringTrending && <Loader className="w-4 h-4 animate-spin text-accent-blue" />}
                </h2>
                {filteredTrending.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredTrending.map((item) => (
                      <PosterCard
                        key={item.id as number}
                        id={item.id as number}
                        title={(item.title as string) || (item.name as string)}
                        posterPath={item.poster_path as string}
                        rating={item.vote_average as number}
                        year={
                          item.release_date
                            ? (item.release_date as string).split('-')[0]
                            : item.first_air_date
                            ? (item.first_air_date as string).split('-')[0]
                            : ''
                        }
                        type={item.media_type === 'tv' ? 'tv' : 'movie'}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-3">
                    <p className="text-slate-400 text-sm">No trending titles match the selected Dub filter.</p>
                    <button
                      onClick={() => handleSetDubFilter('all')}
                      className="px-4 py-2 bg-accent-blue text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition cursor-pointer"
                    >
                      Reset Audio Filter
                    </button>
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>

      {/* Lumina AI Chat Copilot Modal */}
      <AiChatModal isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </div>
  );
}
