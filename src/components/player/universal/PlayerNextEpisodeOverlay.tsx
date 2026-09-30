'use client';

import React from 'react';
import { SkipForward, RotateCcw, X } from 'lucide-react';

interface PlayerNextEpisodeOverlayProps {
  nextSeason: number;
  nextEpisode: number;
  nextEpisodeTitle?: string;
  countdown: number;
  onPlayNext: () => void;
  onRewatch: () => void;
  onCancel: () => void;
  accentColor?: string;
}

export function PlayerNextEpisodeOverlay({
  nextSeason,
  nextEpisode,
  nextEpisodeTitle,
  countdown,
  onPlayNext,
  onRewatch,
  onCancel,
  accentColor = '#3b82f6',
}: PlayerNextEpisodeOverlayProps) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - countdown / 10);

  return (
    <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative bg-[#0c101c]/95 border border-white/15 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center flex flex-col items-center gap-4">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Circular Countdown Ring */}
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={radius} fill="none" stroke="#1e293b" strokeWidth="4" />
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke={accentColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-black text-white">{countdown}</span>
          </div>
        </div>

        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
            Episode Finished
          </span>
          <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
            Up Next: Season {nextSeason} Episode {nextEpisode}
          </h3>
          {nextEpisodeTitle && (
            <p className="text-xs text-slate-400 font-medium truncate max-w-[240px] mt-0.5">
              {nextEpisodeTitle}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 w-full pt-1">
          <button
            onClick={onPlayNext}
            className="w-full py-3 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
            style={{ backgroundColor: accentColor }}
          >
            <SkipForward className="w-4 h-4" />
            <span>Play Next Episode Now</span>
          </button>

          <button
            onClick={onRewatch}
            className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Rewatch Current Episode</span>
          </button>
        </div>
      </div>
    </div>
  );
}
