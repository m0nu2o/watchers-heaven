'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Play, Star, Crown, Flame, Sparkles } from 'lucide-react';

interface RankCardProps {
  rank: number;
  id: number;
  title: string;
  posterPath: string;
  rating?: number;
  year?: string;
  type?: 'movie' | 'tv' | 'anime';
  extraBadge?: string;
}

export function RankCard({
  rank,
  id,
  title,
  posterPath,
  rating,
  year,
  type = 'movie',
  extraBadge,
}: RankCardProps) {
  const pathname = usePathname() || '/';
  const currentLocale = pathname.split('/').filter(Boolean)[0];
  const locale = ['en', 'am', 'om', 'ti', 'so'].includes(currentLocale) ? currentLocale : 'en';

  const href = type === 'anime'
    ? `/${locale}/tv/${id}?from=anime`
    : `/${locale}/${type}/${id}`;

  const posterUrl = posterPath
    ? posterPath.startsWith('http')
      ? posterPath
      : `https://image.tmdb.org/t/p/w500${posterPath.startsWith('/') ? posterPath : `/${posterPath}`}`
    : null;

  const isTop1 = rank === 1;
  const isTop3 = rank <= 3;
  const isDoubleDigit = rank >= 10;

  // Editorial numeral metallic gradients
  const rankGradient = isTop1
    ? 'from-amber-200 via-amber-400 to-amber-600'
    : rank === 2
    ? 'from-slate-100 via-slate-300 to-slate-500'
    : rank === 3
    ? 'from-amber-100 via-amber-500 to-amber-800'
    : 'from-white/90 via-slate-300 to-slate-600';

  // Negative margin overlap so numeral and card interlock smoothly
  const numberOffsetClass = isDoubleDigit
    ? '-mr-8 sm:-mr-11 md:-mr-13 lg:-mr-15'
    : '-mr-6 sm:-mr-8 md:-mr-10 lg:-mr-12';

  return (
    <div className="card-snap relative flex items-end flex-shrink-0 group select-none pr-2 sm:pr-4 pt-4 pb-2">
      {/* ── 1. Giant Signature 3D Editorial Rank Numeral ── */}
      <div
        className={`relative z-0 ${numberOffsetClass} pb-0 sm:pb-1 pointer-events-none select-none font-black italic tracking-tighter leading-none transition-all duration-300 group-hover:scale-105 ${
          isTop1
            ? 'text-8xl sm:text-9xl md:text-[11rem] lg:text-[12rem] opacity-95 group-hover:opacity-100 drop-shadow-[0_12px_28px_rgba(251,191,36,0.25)]'
            : 'text-7xl sm:text-8xl md:text-9xl lg:text-[10.5rem] opacity-70 group-hover:opacity-95 drop-shadow-[0_10px_24px_rgba(0,0,0,0.9)]'
        }`}
      >
        <span
          className={`bg-gradient-to-b ${rankGradient} bg-clip-text text-transparent`}
          style={{
            WebkitTextStroke: isTop1
              ? '1.5px rgba(251, 191, 36, 0.6)'
              : '1.2px rgba(255, 255, 255, 0.25)',
          }}
        >
          {rank}
        </span>
      </div>

      {/* ── 2. The Overlapping Apple-Grade Poster Card ── */}
      <Link
        href={href}
        className={`relative z-10 w-[150px] sm:w-[175px] md:w-[195px] lg:w-[215px] aspect-[2/3] rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer bg-slate-950 border transition-all duration-300 ease-out transform group-hover:-translate-y-2.5 group-hover:scale-[1.02] shadow-[0_12px_36px_rgba(0,0,0,0.85)] group-hover:shadow-[0_20px_48px_rgba(0,0,0,0.95)] ${
          isTop1
            ? 'border-amber-400/50 group-hover:border-amber-400 shadow-amber-500/10 group-hover:shadow-amber-500/25 ring-1 ring-amber-400/20'
            : isTop3
            ? 'border-white/20 group-hover:border-white/40 shadow-black/80'
            : 'border-white/10 group-hover:border-white/25 shadow-black/70'
        }`}
      >
        {/* Poster Image */}
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-700">
            <span className="text-xs font-bold uppercase">{title}</span>
          </div>
        )}

        {/* Theatrical Multi-Layer Gradient Scrims */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent opacity-85 group-hover:opacity-95 transition-opacity duration-300 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent opacity-60 pointer-events-none" />

        {/* ── Top Floating Header Badges ── */}
        <div className="absolute top-2.5 sm:top-3 inset-x-2.5 sm:inset-x-3 flex items-center justify-between pointer-events-none z-20">
          {/* Rank 1 Crown or Format Tag */}
          {isTop1 ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[9px] font-black uppercase tracking-wider shadow-lg shadow-amber-500/30">
              <Crown className="w-2.5 h-2.5 fill-black" />
              <span>#1 Hit</span>
            </div>
          ) : rank <= 3 ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-white text-[9px] font-black uppercase tracking-wider">
              <Flame className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
              <span>Top 3</span>
            </div>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white text-[9px] font-black uppercase tracking-wider">
              {type === 'tv' ? 'Series' : type}
            </span>
          )}

          {/* Rating Pill */}
          {rating !== undefined && rating > 0 && (
            <div className="flex items-center gap-1 bg-black/70 backdrop-blur-xl text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-white/15 shadow-md">
              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
              <span className="text-amber-300">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* ── Hover Apple-Style Floating Play Button ── */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-blue-600/90 text-white font-black text-xs tracking-wide backdrop-blur-md border border-white/25 shadow-xl shadow-blue-600/40 transform scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 ease-out">
            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
            <span>Play</span>
          </div>
        </div>

        {/* ── Bottom Content: Title & Metadata ── */}
        <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-3.5 flex flex-col justify-end z-20 pointer-events-none">
          <h3 className="text-white text-xs sm:text-sm font-black tracking-tight line-clamp-1 drop-shadow-md group-hover:text-blue-300 transition-colors duration-200">
            {title}
          </h3>

          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-300 font-medium">
            {year && <span className="font-semibold text-slate-200">{year}</span>}
            <span className="w-1 h-1 rounded-full bg-slate-400" />
            <span className="uppercase tracking-wider text-slate-300 font-bold">
              {type === 'tv' ? 'Series' : type}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-400" />
            <span className="font-extrabold px-1 py-0.2 rounded bg-white/10 text-slate-200">
              4K
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
