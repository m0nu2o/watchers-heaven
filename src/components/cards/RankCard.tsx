'use client';
import { PosterCard } from './PosterCard';

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
  return (
    <div className="card-snap relative flex items-end flex-shrink-0 group select-none pr-3">
      {/* Massive Editorial Rank Number */}
      <div className="relative z-0 -mr-6 sm:-mr-8 md:-mr-10 pb-1 pointer-events-none select-none font-black italic tracking-tighter text-7xl sm:text-8xl md:text-9xl leading-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)] opacity-70 group-hover:opacity-100 transition-opacity">
        <span className="bg-gradient-to-b from-white via-slate-400 to-slate-800 bg-clip-text text-transparent">
          {rank}
        </span>
      </div>

      {/* Overlapping Poster Card */}
      <div className="relative z-10 transform group-hover:-translate-y-1 transition-transform duration-300">
        <PosterCard
          id={id}
          title={title}
          posterPath={posterPath}
          rating={rating}
          year={year}
          type={type}
          extraBadge={extraBadge}
          className="shadow-2xl shadow-black/80"
        />
      </div>
    </div>
  );
}
