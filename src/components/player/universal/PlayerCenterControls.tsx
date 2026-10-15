'use client';

import React from 'react';
import { Play, Pause, RotateCcw, RotateCw, SkipBack, SkipForward } from 'lucide-react';

interface PlayerCenterControlsProps {
  playing: boolean;
  onTogglePlay: () => void;
  onSeekRelative: (seconds: number) => void;
  onPreviousEpisode?: () => void;
  onNextEpisode?: () => void;
  hasPreviousEpisode?: boolean;
  hasNextEpisode?: boolean;
  doubleTapFeedback?: { side: 'left' | 'right'; count: number } | null;
  visible: boolean;
}

export function PlayerCenterControls({
  playing,
  onTogglePlay,
  onSeekRelative,
  onPreviousEpisode,
  onNextEpisode,
  hasPreviousEpisode,
  hasNextEpisode,
  doubleTapFeedback,
  visible,
}: PlayerCenterControlsProps) {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
      {/* Mobile Double Tap Feedback Animation */}
      {doubleTapFeedback && (
        <div
          className={`absolute inset-y-0 ${
            doubleTapFeedback.side === 'left' ? 'left-0 justify-start pl-12' : 'right-0 justify-end pr-12'
          } w-1/3 flex items-center bg-white/5 animate-pulse`}
        >
          <div className="flex flex-col items-center gap-1 bg-black/70 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/10 text-white shadow-2xl">
            {doubleTapFeedback.side === 'left' ? (
              <RotateCcw className="w-6 h-6 text-blue-400" />
            ) : (
              <RotateCw className="w-6 h-6 text-blue-400" />
            )}
            <span className="text-xs font-black tracking-wider">
              {doubleTapFeedback.side === 'left' ? '-' : '+'}
              {doubleTapFeedback.count * 10}s
            </span>
          </div>
        </div>
      )}

      {/* Main Center Action Deck — Apple Cinema Frosted Glass */}
      <div
        className={`flex items-center gap-3 sm:gap-5 transition-all duration-300 ease-out transform pointer-events-auto select-none ${
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        {/* Previous Episode (if available) */}
        {hasPreviousEpisode && onPreviousEpisode && (
          <button
            type="button"
            onClick={onPreviousEpisode}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/60 active:bg-black/80 backdrop-blur-2xl border border-white/15 text-white/90 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
            title="Previous Episode"
            aria-label="Previous Episode"
          >
            <SkipBack className="w-4 h-4 stroke-[2.2]" />
          </button>
        )}

        {/* -10s Replay */}
        <button
          type="button"
          onClick={() => onSeekRelative(-10)}
          className="group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/60 active:bg-black/80 backdrop-blur-2xl border border-white/20 hover:border-white/40 text-white flex flex-col items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
          title="Replay 10 Seconds (Left Arrow)"
          aria-label="Replay 10 Seconds"
        >
          <RotateCcw className="w-4 h-4 stroke-[2.2] group-hover:-rotate-12 transition-transform duration-200" />
          <span className="text-[8.5px] font-black tracking-tight leading-none text-slate-300 group-hover:text-white mt-0.5">
            10s
          </span>
        </button>

        {/* Big Center Play / Pause Button — Apple Cinema Glass */}
        <button
          type="button"
          onClick={onTogglePlay}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-2xl border border-white/30 hover:border-white/50 text-white flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-200 hover:scale-108 active:scale-95 cursor-pointer ring-1 ring-white/20"
          title={playing ? 'Pause (Space)' : 'Play (Space)'}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-white stroke-white" />
          ) : (
            <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-white stroke-white ml-0.5" />
          )}
        </button>

        {/* +10s Forward */}
        <button
          type="button"
          onClick={() => onSeekRelative(10)}
          className="group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/60 active:bg-black/80 backdrop-blur-2xl border border-white/20 hover:border-white/40 text-white flex flex-col items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
          title="Forward 10 Seconds (Right Arrow)"
          aria-label="Forward 10 Seconds"
        >
          <RotateCw className="w-4 h-4 stroke-[2.2] group-hover:rotate-12 transition-transform duration-200" />
          <span className="text-[8.5px] font-black tracking-tight leading-none text-slate-300 group-hover:text-white mt-0.5">
            10s
          </span>
        </button>

        {/* Next Episode (if available) */}
        {hasNextEpisode && onNextEpisode && (
          <button
            type="button"
            onClick={onNextEpisode}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/60 active:bg-black/80 backdrop-blur-2xl border border-white/15 text-white/90 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
            title="Next Episode"
            aria-label="Next Episode"
          >
            <SkipForward className="w-4 h-4 stroke-[2.2]" />
          </button>
        )}
      </div>
    </div>
  );
}
