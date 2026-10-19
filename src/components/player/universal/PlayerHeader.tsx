'use client';

import React from 'react';
import { ArrowLeft, RefreshCw, FastForward, Maximize2, Minimize2, Tv, Zap, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PlayerHeaderProps {
  title: string;
  season?: number;
  episode?: number;
  episodeName?: string;
  arcName?: string;
  mediaType?: 'movie' | 'tv' | 'anime';
  visible: boolean;
  serverName?: string;
  serverQuality?: string;
  autoSwitchEnabled?: boolean;
  onToggleAutoSwitch?: () => void;
  onReload: () => void;
  onSkipIntro?: () => void;
  hasIntro?: boolean;
  isEmbed?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isTheaterMode?: boolean;
  onToggleTheaterMode?: () => void;
  showBackButton?: boolean;
}

export function PlayerHeader({
  title,
  season,
  episode,
  episodeName,
  arcName,
  mediaType = 'movie',
  visible,
  serverName,
  serverQuality,
  autoSwitchEnabled,
  onToggleAutoSwitch,
  onReload,
  onSkipIntro,
  hasIntro,
  isEmbed = false,
  isFullscreen = false,
  onToggleFullscreen,
  isTheaterMode = false,
  onToggleTheaterMode,
  showBackButton = false,
}: PlayerHeaderProps) {
  const router = useRouter();

  return (
    <div
      className={`absolute top-0 inset-x-0 z-30 px-3 sm:px-6 py-2.5 sm:py-3.5 bg-gradient-to-b from-black/85 via-black/40 to-transparent transition-opacity duration-300 flex items-center justify-between gap-3 pointer-events-none ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* ── Left: Optional Back button & Title Metadata ── */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {showBackButton && (
          <button
            onClick={() => router.back()}
            className="pointer-events-auto w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer shrink-0 shadow-lg"
            title="Back"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/40 shrink-0">
              {mediaType === 'anime' ? 'Anime' : mediaType === 'tv' ? 'Series' : 'Movie'}
            </span>
            <h1 className="text-xs sm:text-sm md:text-base font-black text-white truncate drop-shadow-md">
              {title}
            </h1>
          </div>

          <p className="text-[10px] sm:text-[11px] text-slate-300 font-medium truncate mt-0.5">
            {mediaType === 'tv' || mediaType === 'anime' ? (
              <span>
                Season {season || 1} • Episode {episode || 1}
                {arcName ? <span className="text-blue-400 font-bold"> ({arcName} Arc)</span> : null}
                {episodeName ? ` — ${episodeName}` : ''}
              </span>
            ) : (
              'Theatrical Feature'
            )}
            {isEmbed && (
              <span className="ml-2 text-emerald-400 font-semibold">• Provider Stream</span>
            )}
          </p>
        </div>
      </div>

      {/* ── Right Action Tools: Server Indicator, Reload, Theater, Fullscreen ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Skip Intro (if available) */}
        {hasIntro && onSkipIntro && (
          <button
            onClick={onSkipIntro}
            className="pointer-events-auto flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer backdrop-blur-md"
            title="Skip Intro (+85s)"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Skip Intro</span>
          </button>
        )}

        {/* Ad Shield Active Badge */}
        <div
          className="hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 backdrop-blur-md border border-emerald-500/30 text-emerald-400 text-[11px] font-bold"
          title="Lumina Ad Shield Active — popups, redirects, and sandbox bypass are blocked"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Ad Shield</span>
        </div>

        {/* Server Indicator Pill */}
        {serverName && (
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white text-[11px] font-bold"
            title="Active Streaming Server"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="truncate max-w-[110px]">{serverName}</span>
            {serverQuality && (
              <span className="text-[10px] text-blue-400 font-semibold">{serverQuality}</span>
            )}
          </div>
        )}

        {/* Reload Stream */}
        <button
          onClick={onReload}
          className="pointer-events-auto w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer shadow-lg"
          title="Reload Stream"
          aria-label="Reload Stream"
        >
          <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Theater Mode Toggle */}
        {onToggleTheaterMode && (
          <button
            onClick={onToggleTheaterMode}
            className={`pointer-events-auto w-8 h-8 sm:w-9 sm:h-9 rounded-xl active:scale-95 border backdrop-blur-md hidden md:flex items-center justify-center transition-all cursor-pointer shadow-lg ${
              isTheaterMode
                ? 'bg-blue-600/30 border-blue-400/50 text-blue-300'
                : 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
            }`}
            title={isTheaterMode ? 'Exit Theater Mode (T)' : 'Theater Mode (T)'}
            aria-label="Theater Mode"
          >
            <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        )}

        {/* Fullscreen Toggle */}
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="pointer-events-auto w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer shadow-lg"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            aria-label="Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
