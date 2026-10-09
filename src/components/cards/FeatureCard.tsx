'use client';

import React from 'react';
import { Play, Star, Sparkles, Film, Image as ImageIcon } from 'lucide-react';
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
      : `https://image.tmdb.org/t/p/w1280${backdropPath.startsWith('/') ? backdropPath : `/${backdropPath}`}`
    : null;

  const isMasterpiece = rating !== undefined && rating >= 8.0;
  const isCriticsChoice = rating !== undefined && rating >= 7.0 && rating < 8.0;

  return (
    <Link
      href={href}
      className={`card-snap group relative min-w-[290px] sm:min-w-[360px] md:min-w-[420px] lg:min-w-[460px] aspect-video rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer bg-slate-950 border border-white/10 hover:border-white/30 shadow-2xl transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-black/90 active:scale-[0.99] flex-shrink-0 select-none ${className}`}
    >
      {/* ── Fallback Placeholder ── */}
      <div className="absolute inset-0 flex items-center justify-center bg-[#070a12] text-slate-700">
        <Film className="w-12 h-12 opacity-30" />
      </div>

      {/* ── High-Res Theatrical Backdrop ── */}
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

      {/* ── Multi-Layer Theatrical Gradient Vignettes ── */}
      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/95 via-black/50 to-transparent opacity-90 group-hover:opacity-95 transition-opacity duration-300" />
      <div className="absolute inset-0 z-20 bg-gradient-to-r from-black/60 via-transparent to-black/30 opacity-70" />

      {/* ── Top Header Deck: Prestige Category & Score ── */}
      <div className="absolute top-3 sm:top-4 inset-x-3 sm:inset-x-4 z-30 flex items-center justify-between pointer-events-none">
        {/* Prestige Badge */}
        {isMasterpiece ? (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/25 border border-amber-400/40 text-amber-300 text-[10px] sm:text-[11px] font-black uppercase tracking-wider backdrop-blur-xl shadow-lg shadow-amber-500/20">
            <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
            <span>Masterpiece</span>
          </div>
        ) : isCriticsChoice ? (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-600/25 border border-blue-400/40 text-blue-300 text-[10px] sm:text-[11px] font-black uppercase tracking-wider backdrop-blur-xl shadow-lg shadow-blue-500/20">
            <span>Critics' Choice</span>
          </div>
        ) : category ? (
          <span className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-xl border border-white/15 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
            {category}
          </span>
        ) : (
          <div />
        )}

        {/* Rating Star Pill */}
        {rating !== undefined && rating > 0 && (
          <div className="flex items-center gap-1 bg-black/75 backdrop-blur-xl text-white text-[11px] sm:text-xs font-black px-2.5 py-1 rounded-xl border border-white/15 shadow-md">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-amber-300">{rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* ── Hover Apple-Style Floating Play CTA ── */}
      <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/20 hover:bg-blue-600 active:bg-blue-700 backdrop-blur-xl border border-white/30 text-white font-black text-xs sm:text-sm tracking-wide shadow-2xl shadow-black/80 transform scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 ease-out">
          <Play className="w-4 h-4 fill-white ml-0.5" />
          <span>Watch Feature</span>
        </div>
      </div>

      {/* ── Bottom Content: Title & Refined Metadata ── */}
      <div className="absolute bottom-0 inset-x-0 z-30 p-3.5 sm:p-5 flex flex-col justify-end">
        <h3 className="text-white text-base sm:text-lg md:text-xl font-black tracking-tight line-clamp-1 drop-shadow-md group-hover:text-blue-300 transition-colors duration-200">
          {title}
        </h3>

        <div className="flex items-center gap-2 mt-1 sm:mt-1.5 text-xs text-slate-300 font-medium">
          {year && <span className="font-semibold text-slate-200">{year}</span>}
          {type && (
            <>
              <span className="w-1 h-1 rounded-full bg-slate-400" />
              <span className="uppercase text-[10px] tracking-wider text-slate-300 font-bold">
                {type === 'tv' ? 'Series' : type}
              </span>
            </>
          )}
          <span className="w-1 h-1 rounded-full bg-slate-400" />
          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-white/10 text-slate-200 tracking-wider">
            4K HDR
          </span>
        </div>
      </div>
    </Link>
  );
}
