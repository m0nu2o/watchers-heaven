'use client';
import { Play, Bookmark, RefreshCw, Image as ImageIcon, Star } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { isInWatchlist, toggleWatchlistItem } from '@/lib/watchlist';

interface Movie {
  id: number;
  title?: string;
  name?: string;
  backdrop_path?: string;
  poster_path?: string;
  overview?: string;
  media_type?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
}

interface HeroFeatureProps {
  movies: Movie[];
}

export function HeroFeature({ movies }: HeroFeatureProps) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0] && ['en','am','om','ti','so'].includes(segments[0]) ? segments[0] : 'en';

  const [activeIndex, setActiveIndex] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentMovie = movies[activeIndex] || movies[0];
  const isTV = currentMovie?.media_type === 'tv';

  // Auto-slide effect
  useEffect(() => {
    if (movies.length <= 1) return;

    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % movies.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [movies]);

  // Load bookmark state
  useEffect(() => {
    if (typeof window !== 'undefined' && currentMovie) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsBookmarked(isInWatchlist(currentMovie.id));
    }
  }, [currentMovie]);

  const toggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined' || !currentMovie) return;

    const isTV = currentMovie.media_type === 'tv';
    const added = toggleWatchlistItem(currentMovie.id, isTV ? 'tv' : 'movie');
    setIsBookmarked(added);
  };

  const handleWatch = () => {
    if (!currentMovie) return;
    if (isTV) {
      router.push(`/${locale}/watch/${currentMovie.id}?s=1&e=1`);
    } else {
      router.push(`/${locale}/watch/${currentMovie.id}`);
    }
  };

  const handleDetails = () => {
    if (!currentMovie) return;
    if (isTV) {
      router.push(`/${locale}/tv/${currentMovie.id}`);
    } else {
      router.push(`/${locale}/movie/${currentMovie.id}`);
    }
  };

  if (!currentMovie) return null;

  return (
    <section className="relative w-full pt-4 pb-6 px-2 sm:px-4">
      <div className="relative w-full h-[65vh] min-h-[480px] max-h-[720px] rounded-3xl overflow-hidden bg-[#0b0f17] border border-slate-800/60 shadow-2xl shadow-black/80 group/hero">
        
        {/* Fallback Image */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-[#07090e]">
          <ImageIcon className="w-16 h-16 text-slate-700" />
        </div>

        {/* Backdrop Slides with Crossfade */}
        {movies.map((m, idx) => (
          <div
            key={m.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === activeIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <img 
              src={`https://image.tmdb.org/t/p/w1280${m.backdrop_path}`} 
              alt={m.title || m.name || ''}
              loading={idx === 0 ? 'eager' : 'lazy'}
              fetchPriority={idx === 0 ? 'high' : 'low'}
              className={`w-full h-full object-cover object-center transition-transform duration-7000 ease-out ${
                idx === activeIndex ? 'scale-105' : 'scale-100'
              }`}
            />
          </div>
        ))}

        {/* Cinema Vignette Gradients */}
        {/* Bottom Fade */}
        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[#07090e] via-[#07090e]/75 to-transparent z-10 pointer-events-none" />
        {/* Left Fade for text legibility */}
        <div className="absolute inset-y-0 left-0 w-full md:w-3/5 bg-gradient-to-r from-[#07090e]/95 via-[#07090e]/60 to-transparent z-10 pointer-events-none" />
        {/* Top subtle vignette */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent z-10 pointer-events-none" />

        {/* Slide Indicators & Navigation (Top Right) */}
        <div className="absolute top-5 right-5 z-20 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg">
          {movies.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveIndex(idx);
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = setInterval(() => {
                    setActiveIndex((prev) => (prev + 1) % movies.length);
                  }, 6000);
                }
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === activeIndex ? 'w-6 bg-blue-500' : 'w-2 bg-white/40 hover:bg-white/80'
              }`}
              title={`Go to slide ${idx + 1}`}
            />
          ))}
          <button
            onClick={() => setActiveIndex((prev) => (prev + 1) % movies.length)}
            className="text-slate-400 hover:text-white transition-colors ml-1 p-1"
            title="Next Slide"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {/* Content Overlay */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 sm:p-10 md:p-14 max-w-3xl">
          
          {/* Category Pill Tag */}
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center gap-1.5 bg-blue-600/25 border border-blue-500/40 text-blue-400 text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              {isTV ? 'Featured TV Series' : 'Featured Movie'}
            </span>

            {/* Quality badge */}
            <span className="bg-white/10 backdrop-blur-sm text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10">
              4K ULTRA HD
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08] mb-3 drop-shadow-xl line-clamp-2">
            {currentMovie.title || currentMovie.name || 'Featured Title'}
          </h1>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-300 font-semibold mb-3.5 drop-shadow">
            {currentMovie.vote_average !== undefined && currentMovie.vote_average > 0 && (
              <div className="flex items-center gap-1 text-amber-400 font-black">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{currentMovie.vote_average.toFixed(1)}</span>
              </div>
            )}
            
            {(() => {
              const year = (currentMovie.release_date || currentMovie.first_air_date || '').slice(0, 4);
              return year ? <span>• {year}</span> : null;
            })()}

            <span>• {isTV ? 'Multi-Season' : 'Full Feature'}</span>
            <span className="text-emerald-400 font-bold">• 100% Free</span>
          </div>

          {/* Overview Snippet */}
          {currentMovie.overview && (
            <p className="text-xs sm:text-sm md:text-base text-slate-300/90 font-normal leading-relaxed line-clamp-2 sm:line-clamp-3 mb-6 max-w-2xl drop-shadow">
              {currentMovie.overview}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Primary Watch Button */}
            <button 
              onClick={handleWatch}
              className="flex items-center gap-2.5 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-2xl text-sm font-extrabold transition-all duration-200 shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.02] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white text-white" />
              <span>Play Now</span>
            </button>
            
            {/* Details Button */}
            <button 
              onClick={handleDetails}
              className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/90 text-slate-200 hover:text-white px-5 py-3.5 rounded-2xl text-sm font-bold backdrop-blur-md border border-slate-700/60 transition cursor-pointer"
            >
              <span>More Info</span>
            </button>

            {/* Watchlist Toggle Button */}
            <button 
              onClick={toggleBookmark}
              className={`p-3.5 rounded-2xl border backdrop-blur-md transition-all duration-200 cursor-pointer ${
                isBookmarked 
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' 
                  : 'bg-slate-800/80 hover:bg-slate-700/90 border-slate-700/60 text-slate-300 hover:text-white'
              }`}
              title={isBookmarked ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-blue-400' : ''}`} />
            </button>
          </div>

        </div>

      </div>
    </section>
  );
}
