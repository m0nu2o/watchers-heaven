'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Play, Star, Crown, Flame } from 'lucide-react';

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

  return (
    <div
      className={`card-snap relative flex items-end flex-shrink-0 group select-none py-3 pr-2 transition-transform duration-300 ${
        isDoubleDigit
          ? 'w-[230px] sm:w-[265px] md:w-[295px] lg:w-[315px]'
          : 'w-[210px] sm:w-[245px] md:w-[275px] lg:w-[295px]'
      }`}
    >
      {/* ── 1. Netflix/Apple Signature 3D Metallic SVG Numeral (Layered Behind Card) ── */}
      <svg
        className={`absolute left-0 bottom-1 z-0 h-[86%] sm:h-[90%] md:h-[94%] ${
          isDoubleDigit
            ? 'w-[155px] sm:w-[180px] md:w-[200px] lg:w-[215px]'
            : 'w-[125px] sm:w-[145px] md:w-[165px] lg:w-[175px]'
        } pointer-events-none select-none overflow-visible transition-all duration-300 ease-out group-hover:scale-105 ${
          isTop1
            ? 'drop-shadow-[0_12px_28px_rgba(245,158,11,0.55)]'
            : rank === 2
            ? 'drop-shadow-[0_12px_28px_rgba(255,255,255,0.4)]'
            : rank === 3
            ? 'drop-shadow-[0_12px_28px_rgba(234,88,12,0.5)]'
            : 'drop-shadow-[0_10px_24px_rgba(56,189,248,0.35)]'
        }`}
        viewBox={isDoubleDigit ? '0 0 160 135' : '0 0 100 135'}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`rank-grad-${rank}`} x1="0" y1="0" x2="0" y2="135" gradientUnits="userSpaceOnUse">
            {isTop1 ? (
              <>
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="35%" stopColor="#fbbf24" />
                <stop offset="70%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#b45309" />
              </>
            ) : rank === 2 ? (
              <>
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#e2e8f0" />
                <stop offset="75%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#64748b" />
              </>
            ) : rank === 3 ? (
              <>
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="40%" stopColor="#f97316" />
                <stop offset="75%" stopColor="#c2410c" />
                <stop offset="100%" stopColor="#9a3412" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="45%" stopColor="#38bdf8" />
                <stop offset="80%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0369a1" />
              </>
            )}
          </linearGradient>
        </defs>
        <text
          x={rank === 1 ? '18' : isDoubleDigit ? '6' : '10'}
          y="120"
          className="font-black italic tracking-tighter"
          fontFamily="Impact, 'Arial Black', 'Bricolage Grotesque', sans-serif"
          fontWeight="900"
          fontSize="140"
          fontStyle="italic"
          fill="#080c16"
          stroke={`url(#rank-grad-${rank})`}
          strokeWidth={isTop1 ? '5' : '4'}
          strokeLinejoin="round"
          letterSpacing={isDoubleDigit ? '-10' : '-6'}
        >
          {rank}
        </text>
      </svg>

      {/* ── 2. The Overlapping Luxury Poster Card (Layered Above Numeral) ── */}
      <Link
        href={href}
        className={`relative z-10 ml-auto w-[135px] sm:w-[155px] md:w-[175px] lg:w-[190px] aspect-[2/3] rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer bg-slate-950 border transition-all duration-300 ease-out transform group-hover:-translate-y-2.5 group-hover:scale-[1.02] shadow-[0_12px_36px_rgba(0,0,0,0.85)] group-hover:shadow-[0_20px_48px_rgba(0,0,0,0.95)] ${
          isTop1
            ? 'border-amber-400/60 group-hover:border-amber-400 shadow-amber-500/15 group-hover:shadow-amber-500/35 ring-1 ring-amber-400/30'
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
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[9px] font-black uppercase tracking-wider shadow-lg shadow-amber-500/40">
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

export default RankCard;
