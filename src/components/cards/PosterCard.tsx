'use client';
import { Star, Image as ImageIcon, Play } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ContentCategory, getCategoryBadge } from '@/lib/classification';

interface PosterCardProps {
  id: number;
  title: string;
  posterPath: string;
  rating?: number;
  year?: string;
  className?: string;
  type?: 'movie' | 'tv' | 'anime';
  category?: ContentCategory;
  extraBadge?: string;
  hrefOverride?: string;
}

export function PosterCard({ id, title, posterPath, rating, year, className, type = 'movie', category, extraBadge, hrefOverride }: PosterCardProps) {
  const pathname = usePathname() || '/';
  const currentLocale = pathname.split('/').filter(Boolean)[0];
  const locale = ['en', 'am', 'om', 'ti', 'so'].includes(currentLocale) ? currentLocale : 'en';

  const defaultHref = (() => {
    if (category === 'anime' || category === 'donghua') return `/${locale}/tv/${id}?from=anime`;
    if (category === 'anime-movie') return `/${locale}/movie/${id}?from=anime`;
    if (category === 'cartoon') return type === 'tv' ? `/${locale}/tv/${id}` : `/${locale}/movie/${id}`;
    if (category === 'kdrama' || category === 'cdrama' || category === 'asian-drama' || category === 'tv') {
      return `/${locale}/tv/${id}`;
    }
    if (type === 'anime') return `/${locale}/tv/${id}?from=anime`;
    return `/${locale}/${type}/${id}`;
  })();

  const href = hrefOverride || defaultHref;
  const badgeInfo = category ? getCategoryBadge(category) : null;

  const posterUrl = posterPath
    ? posterPath.startsWith('http')
      ? posterPath
      : `https://image.tmdb.org/t/p/w342${posterPath.startsWith('/') ? posterPath : `/${posterPath}`}`
    : null;

  return (
    <Link
      href={href}
      className={`card-snap group relative min-w-[140px] sm:min-w-[160px] md:min-w-[175px] lg:min-w-[190px] aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer bg-slate-200 dark:bg-[#05070c] border border-black/10 dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/[0.25] shadow-lg shadow-black/10 dark:shadow-black/50 transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/20 dark:hover:shadow-black/90 active:scale-[0.98] ${className || ''}`}
    >
      {/* Top Badges */}
      <div className="absolute top-2.5 inset-x-2.5 z-30 flex items-center justify-between pointer-events-none gap-1">
        {/* Rating */}
        {rating !== undefined && rating > 0 ? (
          <div className="flex items-center gap-1 bg-black/70 backdrop-blur-xl text-white text-[10px] font-black px-2 py-0.5 rounded-lg border border-white/10 shadow-md">
            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
            <span className="text-amber-300">{rating.toFixed(1)}</span>
          </div>
        ) : <div />}

        {/* Type / Category / Extra Badge */}
        <div className="flex items-center gap-1">
          {extraBadge ? (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-md shadow-md uppercase tracking-wider backdrop-blur-xl border border-white/15 bg-indigo-600/90 text-white shadow-indigo-600/30">
              {extraBadge}
            </span>
          ) : badgeInfo ? (
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md shadow-md uppercase tracking-wider backdrop-blur-xl border ${badgeInfo.badgeClass}`}>
              {badgeInfo.shortLabel}
            </span>
          ) : (
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md shadow-md uppercase tracking-wider backdrop-blur-xl border border-white/10 ${
              type === 'anime' 
                ? 'bg-rose-500/80 text-white shadow-rose-500/20' 
                : type === 'tv' 
                ? 'bg-indigo-500/80 text-white shadow-indigo-500/20' 
                : 'bg-white/10 text-slate-200'
            }`}>
              {type === 'anime' ? 'ANIME' : type === 'tv' ? 'SERIES' : 'MOVIE'}
            </span>
          )}
        </div>
      </div>

      {/* Fallback */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#07090f] p-3 text-center">
        <ImageIcon className="w-8 h-8 text-slate-700 mb-2" />
        <span className="text-[10px] text-slate-500 font-semibold line-clamp-2">{title}</span>
      </div>

      {posterUrl && (
        <img
          src={posterUrl}
          alt={title}
          className="relative z-10 w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.05]"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          loading="lazy"
        />
      )}
      
      {/* Apple-grade Liquid Glass Hover Overlay */}
      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/95 via-black/45 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3.5 backdrop-blur-[2px]">
        <div className="mb-2 flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
          <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
        </div>
        <h3 className="text-white text-xs sm:text-sm font-bold line-clamp-2 leading-snug drop-shadow-md mb-1">
          {title}
        </h3>
        
        <div className="flex items-center gap-2 text-[10px] text-slate-300 font-medium">
          {year && <span>{year}</span>}
          {rating !== undefined && rating > 0 && (
            <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
            </span>
          )}
          <span className="text-blue-400 ml-auto font-bold tracking-wide">Stream</span>
        </div>
      </div>
    </Link>
  );
}

export default PosterCard;
