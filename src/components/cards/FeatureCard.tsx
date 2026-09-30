'use client';
import { Play, Star, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface FeatureCardProps {
  id?: number;
  title: string;
  backdropPath: string;
  category?: string;
  rating?: number;
  year?: string;
  type?: 'movie' | 'tv' | 'anime';
  className?: string;
  hrefOverride?: string;
}

export function FeatureCard({
  id,
  title,
  backdropPath,
  category,
  rating,
  year,
  type = 'movie',
  className = '',
  hrefOverride,
}: FeatureCardProps) {
  const pathname = usePathname() || '/';
  const currentLocale = pathname.split('/').filter(Boolean)[0];
  const locale = ['en', 'am', 'om', 'ti', 'so'].includes(currentLocale) ? currentLocale : 'en';

  const defaultHref = id
    ? type === 'anime'
      ? `/${locale}/tv/${id}?from=anime`
      : `/${locale}/${type}/${id}`
    : '#';
  const href = hrefOverride || defaultHref;

  const backdropUrl = backdropPath
    ? backdropPath.startsWith('http')
      ? backdropPath
      : `https://image.tmdb.org/t/p/w780${backdropPath.startsWith('/') ? backdropPath : `/${backdropPath}`}`
    : null;

  return (
    <Link
      href={href}
      className={`card-snap group relative min-w-[280px] sm:min-w-[340px] md:min-w-[400px] lg:min-w-[440px] aspect-video rounded-2xl overflow-hidden cursor-pointer bg-slate-900 border border-white/10 hover:border-white/25 shadow-xl transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/80 active:scale-[0.99] flex-shrink-0 ${className}`}
    >
      {/* Fallback */}
      <div className="absolute inset-0 flex items-center justify-center bg-[#070a12] text-slate-700">
        <ImageIcon className="w-12 h-12 opacity-30" />
      </div>

      {backdropUrl && (
        <img
          src={backdropUrl}
          alt={title}
          className="relative z-10 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
          loading="lazy"
        />
      )}

      {/* Atmospheric Gradient Overlays */}
      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-85 group-hover:opacity-95 transition-opacity duration-300" />
      <div className="absolute inset-0 z-20 bg-gradient-to-r from-black/60 via-transparent to-transparent opacity-60" />

      {/* Badges / Header info */}
      <div className="absolute top-3 inset-x-3 z-30 flex items-center justify-between pointer-events-none">
        {category ? (
          <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
            {category}
          </span>
        ) : <div />}

        <div className="flex items-center gap-1.5">
          {rating !== undefined && rating > 0 && (
            <div className="flex items-center gap-1 bg-black/70 backdrop-blur-xl text-white text-[11px] font-black px-2 py-0.5 rounded-lg border border-white/10 shadow-md">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-amber-300">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Center Play Button on hover */}
      <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
        <div className="w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 transform scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm border border-white/20">
          <Play className="w-5 h-5 fill-white ml-0.5" />
        </div>
      </div>

      {/* Title & Metadata Details */}
      <div className="absolute bottom-0 inset-x-0 z-30 p-4 flex flex-col justify-end">
        <h3 className="text-white text-base md:text-lg font-black tracking-tight line-clamp-1 drop-shadow-md group-hover:text-blue-300 transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-slate-300 font-medium">
          {year && <span>{year}</span>}
          {type && (
            <>
              <span className="w-1 h-1 rounded-full bg-slate-500" />
              <span className="uppercase text-[10px] tracking-wider text-slate-400 font-semibold">{type}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
