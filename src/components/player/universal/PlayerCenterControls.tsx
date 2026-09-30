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

      {/* Main Center Action Deck */}
      <div
        className={`flex items-center gap-3 sm:gap-6 transition-all duration-300 transform pointer-events-auto ${
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        {/* Previous Episode (if available) */}
        {hasPreviousEpisode && onPreviousEpisode && (
          <button
            onClick={onPreviousEpisode}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-90 shadow-xl cursor-pointer"
            title="Previous Episode"
            aria-label="Previous Episode"
          >
            <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* -10s Replay */}
        <button
          onClick={() => onSeekRelative(-10)}
          className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-90 shadow-xl cursor-pointer"
          title="Replay 10 Seconds (Left Arrow)"
          aria-label="Replay 10 Seconds"
        >
          <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Big Center Play / Pause Button */}
        <button
          onClick={onTogglePlay}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white flex items-center justify-center shadow-2xl shadow-blue-600/50 transition-all duration-200 hover:scale-108 active:scale-95 border border-white/25 cursor-pointer"
          title={playing ? 'Pause (Space)' : 'Play (Space)'}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <Pause className="w-7 h-7 sm:w-9 sm:h-9 fill-white" />
          ) : (
            <Play className="w-7 h-7 sm:w-9 sm:h-9 fill-white ml-1" />
          )}
        </button>

        {/* +10s Forward */}
        <button
          onClick={() => onSeekRelative(10)}
          className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-90 shadow-xl cursor-pointer"
          title="Forward 10 Seconds (Right Arrow)"
          aria-label="Forward 10 Seconds"
        >
          <RotateCw className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Next Episode (if available) */}
        {hasNextEpisode && onNextEpisode && (
          <button
            onClick={onNextEpisode}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-90 shadow-xl cursor-pointer"
            title="Next Episode"
            aria-label="Next Episode"
          >
            <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
