'use client';

import React from 'react';
import { ArrowLeft, RefreshCw, FastForward, ShieldCheck, Zap } from 'lucide-react';
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
  autoSwitchEnabled: boolean;
  onToggleAutoSwitch: () => void;
  onReload: () => void;
  onSkipIntro?: () => void;
  hasIntro?: boolean;
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
}: PlayerHeaderProps) {
  const router = useRouter();

  return (
    <div
      className={`absolute top-0 inset-x-0 z-30 px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-b from-black/90 via-black/45 to-transparent transition-opacity duration-300 flex items-center justify-between gap-3 pointer-events-auto ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Left: Back button & Title Metadata */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer shrink-0 shadow-lg"
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/40 shrink-0">
              {mediaType === 'anime' ? 'Anime' : mediaType === 'tv' ? 'Series' : 'Movie'}
            </span>
            <h1 className="text-xs sm:text-sm md:text-base font-black text-white truncate drop-shadow-md">
              {title}
            </h1>
          </div>
          <p className="text-[11px] text-slate-300 font-medium truncate mt-0.5">
            {mediaType === 'tv' || mediaType === 'anime' ? (
              <span>
                Season {season || 1} • Episode {episode || 1}
                {arcName ? <span className="text-blue-400 font-bold"> ({arcName} Arc)</span> : null}
                {episodeName ? ` — ${episodeName}` : ''}
              </span>
            ) : (
              'Theatrical Feature'
            )}
          </p>
        </div>
      </div>

      {/* Right Action Tools: Skip Intro, Auto-Switch Toggle, Server Badge & Reload */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Skip Intro */}
        {hasIntro && onSkipIntro && (
          <button
            onClick={onSkipIntro}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer backdrop-blur-md"
            title="Skip Intro (+85s)"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Skip Intro</span>
          </button>
        )}

        {/* Dedicated Auto-Switch Toggle */}
        <button
          onClick={onToggleAutoSwitch}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all backdrop-blur-md border cursor-pointer ${
            autoSwitchEnabled
              ? 'bg-blue-600/25 border-blue-500/40 text-blue-300'
              : 'bg-white/10 border-white/15 text-slate-400 hover:text-white'
          }`}
          title={autoSwitchEnabled ? 'Auto-Switching is ON' : 'Auto-Switching is OFF'}
        >
          <Zap className={`w-3.5 h-3.5 ${autoSwitchEnabled ? 'text-blue-400' : 'text-slate-400'}`} />
          <span className="hidden sm:inline">Auto-Switch: {autoSwitchEnabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* Server Indicator Pill */}
        {serverName && (
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white text-[11px] font-bold"
            title="Active Streaming Server"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="truncate max-w-[120px]">{serverName}</span>
            {serverQuality && <span className="text-[10px] text-blue-400 font-semibold">{serverQuality}</span>}
          </div>
        )}

        {/* Reload */}
        <button
          onClick={onReload}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer shadow-lg"
          title="Reload Stream"
          aria-label="Reload Stream"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
