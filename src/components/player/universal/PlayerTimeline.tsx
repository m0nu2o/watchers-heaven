'use client';

import React, { useRef, useState, useCallback, useMemo } from 'react';
import { PlayerSkipTimestamps } from '@/lib/player/types';

interface PlayerTimelineProps {
  currentTime: number;
  duration: number;
  bufferedPercent: number;
  skipTimestamps?: PlayerSkipTimestamps;
  onSeek: (seconds: number) => void;
  accentColor?: string;
}

export function formatPlayerTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PlayerTimeline({
  currentTime,
  duration,
  bufferedPercent,
  skipTimestamps,
  onSeek,
  accentColor = '#3b82f6',
}: PlayerTimelineProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const playedPercent = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return Math.min(100, Math.max(0, (currentTime / duration) * 100));
  }, [currentTime, duration]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!barRef.current || !duration || duration <= 0) return;
    setIsScrubbing(true);
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!barRef.current || !duration || duration <= 0) return;
      const rect = barRef.current.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      setHoverPosition(ratio * 100);
      setHoverTime(ratio * duration);

      if (isScrubbing) {
        onSeek(ratio * duration);
      }
    },
    [duration, isScrubbing, onSeek]
  );

  const handlePointerUp = () => {
    setIsScrubbing(false);
  };

  const handlePointerLeave = () => {
    if (!isScrubbing) {
      setHoverPosition(null);
      setHoverTime(null);
    }
  };

  // Intro segment position
  const introMarker = useMemo(() => {
    if (!skipTimestamps?.intro || !duration || duration <= 0) return null;
    const startPct = (skipTimestamps.intro.start / duration) * 100;
    const widthPct = ((skipTimestamps.intro.end - skipTimestamps.intro.start) / duration) * 100;
    return { startPct, widthPct };
  }, [skipTimestamps, duration]);

  return (
    <div
      ref={barRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className="relative w-full h-7 flex items-center cursor-pointer select-none group touch-none"
      role="slider"
      aria-label="Seek timeline"
      aria-valuemin={0}
      aria-valuemax={duration || 100}
      aria-valuenow={currentTime}
    >
      {/* Background Track */}
      <div className="relative w-full h-1 group-hover:h-1.5 transition-all duration-150 rounded-full bg-white/20 overflow-visible">
        {/* Buffered Track */}
        <div
          className="absolute left-0 top-0 bottom-0 bg-white/30 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, bufferedPercent))}%` }}
        />

        {/* Intro Highlight Marker */}
        {introMarker && (
          <div
            className="absolute top-0 bottom-0 bg-amber-400/50 rounded-full z-10"
            style={{ left: `${introMarker.startPct}%`, width: `${introMarker.widthPct}%` }}
            title="Intro"
          />
        )}

        {/* Played Track */}
        <div
          className="absolute left-0 top-0 bottom-0 rounded-full z-20 transition-all duration-75"
          style={{
            width: `${playedPercent}%`,
            backgroundColor: accentColor,
          }}
        />

        {/* Scrubber Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg transition-transform duration-150 z-30 pointer-events-none group-hover:scale-125"
          style={{
            left: `${playedPercent}%`,
            boxShadow: `0 0 10px ${accentColor}`,
          }}
        />
      </div>

      {/* Hover Time Tooltip */}
      {hoverPosition !== null && hoverTime !== null && (
        <div
          className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/90 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold pointer-events-none z-40 shadow-xl"
          style={{ left: `${hoverPosition}%` }}
        >
          {formatPlayerTime(hoverTime)}
        </div>
      )}
    </div>
  );
}
