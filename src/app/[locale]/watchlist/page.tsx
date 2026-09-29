'use client';
import { useEffect, useState, useCallback } from 'react';
import { ApiGateway } from '@/lib/api/gateway';
import { PosterCard } from '@/components/cards/PosterCard';
import { Eye, Loader, Trash2 } from 'lucide-react';
import { getWatchlist, removeFromWatchlist, WatchlistItem } from '@/lib/watchlist';

export default function WatchlistPage() {
  const [items, setItems] = useState<(WatchlistItem & { data?: Record<string, unknown> })[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWatchlist = useCallback(async () => {
    setLoading(true);
    const watchlist = getWatchlist();

    if (watchlist.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Batch fetch in groups of 4 to avoid rate limiting
    const BATCH_SIZE = 4;
    const results: (WatchlistItem & { data?: Record<string, unknown> })[] = [];

    for (let i = 0; i < watchlist.length; i += BATCH_SIZE) {
      const batch = watchlist.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          try {
            const preferred = item.type === 'anime' ? 'anime' : item.type === 'tv' ? 'tv' : 'movie';
            const media = await ApiGateway.getMediaDetails(item.id, preferred);
            if (!media || !media.data) {
              return { ...item, data: undefined };
            }
            return {
              ...item,
              type: (item.type === 'anime' ? 'anime' : media.resolvedType) as 'movie' | 'tv' | 'anime',
              data: media.data as Record<string, unknown>,
            };
          } catch {
            return { ...item, data: undefined };
          }
        })
      );
      results.push(...batchResults);

      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < watchlist.length) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    setItems(results.filter((r) => r.data !== undefined));
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWatchlist();
  }, [loadWatchlist]);

  const handleRemove = (id: string) => {
    removeFromWatchlist(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen py-10 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Eye className="w-8 h-8 text-accent-blue" />
            My Watchlist
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Keep track of movies and shows you want to watch</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader className="w-8 h-8 animate-spin text-accent-blue" />
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((item) => (
              <div key={item.id} className="relative group/card">
                <PosterCard
                  id={item.data!.id as number}
                  title={(item.data!.title as string) || (item.data!.name as string)}
                  posterPath={item.data!.poster_path as string}
                  rating={item.data!.vote_average as number}
                  year={
                    item.data!.release_date
                      ? (item.data!.release_date as string).split('-')[0]
                      : item.data!.first_air_date
                        ? (item.data!.first_air_date as string).split('-')[0]
                        : ''
                  }
                  type={item.type}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item.id);
                  }}
                  className="absolute top-2 right-2 z-40 p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-red-500/80"
                  title="Remove from watchlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-slate-400 dark:text-slate-500">
            Your watchlist is empty. Add titles from details or hero sections.
          </div>
        )}
      </div>
    </div>
  );
}
