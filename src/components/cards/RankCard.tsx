'use client';

import React from 'react';
import { PosterCard } from './PosterCard';
import { Crown, Sparkles } from 'lucide-react';

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
  const isTop1 = rank === 1;
  const isTop3 = rank <= 3;
  const isDoubleDigit = rank >= 10;

  // Editorial numeral gradient based on ranking tier
  const rankGradient = isTop1
    ? 'from-amber-200 via-amber-400 to-amber-600 text-amber-300/90'
    : rank === 2
    ? 'from-slate-100 via-slate-300 to-slate-500 text-slate-200/90'
    : rank === 3
    ? 'from-orange-200 via-amber-600 to-amber-800 text-amber-500/90'
    : 'from-white via-slate-300 to-slate-700 text-slate-300/80';

  // Overlap spacing: double-digit 10 needs tighter negative margin
  const numberOffsetClass = isDoubleDigit
    ? '-mr-7 sm:-mr-9 md:-mr-11'
    : '-mr-5 sm:-mr-7 md:-mr-9';

  return (
    <div className="card-snap relative flex items-end flex-shrink-0 group select-none pr-3 pt-2">
      {/* ── Editorial Metallic Rank Numeral ── */}
      <div
        className={`relative z-0 ${numberOffsetClass} pb-1 pointer-events-none select-none font-black italic tracking-tighter text-7xl sm:text-8xl md:text-9xl leading-none drop-shadow-[0_8px_24px_rgba(0,0,0,0.9)] transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_12px_32px_rgba(0,0,0,1)] ${
          isTop1 ? 'opacity-90 group-hover:opacity-100' : 'opacity-70 group-hover:opacity-95'
        }`}
      >
        <span
          className={`bg-gradient-to-b ${rankGradient} bg-clip-text text-transparent`}
          style={{
            WebkitTextStroke: isTop1
              ? '1px rgba(251, 191, 36, 0.4)'
              : '1px rgba(255, 255, 255, 0.2)',
          }}
        >
          {rank}
        </span>
      </div>

      {/* ── Poster Card with Apple Glass Elevation ── */}
      <div className="relative z-10 transform group-hover:-translate-y-2 transition-transform duration-300 ease-out">
        {/* Top 1 Special Prestige Tag */}
        {isTop1 && (
          <div className="absolute -top-3 left-3 z-30 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[9px] font-black uppercase tracking-wider shadow-lg shadow-amber-500/30 animate-pulse pointer-events-none">
            <Crown className="w-2.5 h-2.5 fill-black" />
            <span>#1 Worldwide</span>
          </div>
        )}

        <PosterCard
          id={id}
          title={title}
          posterPath={posterPath}
          rating={rating}
          year={year}
          type={type}
          extraBadge={isTop1 ? undefined : extraBadge}
          className={`shadow-2xl shadow-black/90 transition-all duration-300 ${
            isTop1
              ? 'ring-1 ring-amber-400/40 group-hover:ring-amber-400/80'
              : isTop3
              ? 'ring-1 ring-white/20 group-hover:ring-white/40'
              : ''
          }`}
        />
      </div>
    </div>
  );
}
