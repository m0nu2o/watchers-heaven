'use client';

import React from 'react';
import { Check, Radio, Zap, Shield, Sparkles } from 'lucide-react';
import { ProviderAdapter, MediaType } from '@/types/media';
import { ProviderTelemetry } from '@/lib/providers';

export interface LuminaServerDeckProps {
  servers: ProviderAdapter[];
  activeServerId: string;
  onSelectServer: (serverId: string) => void;
  mediaType: MediaType;
  selectedAudioTrack?: string;
  accentColor?: string;
  isLoadingSource?: boolean;
}

export function LuminaServerDeck({
  servers,
  activeServerId,
  onSelectServer,
  mediaType,
  selectedAudioTrack = 'sub',
  accentColor = '#3b82f6',
  isLoadingSource = false,
}: LuminaServerDeckProps) {
  const isAnime = mediaType === 'anime';
  const isHindiDubSelected = selectedAudioTrack === 'dub-hi' || selectedAudioTrack === 'hindi';
  const isEnglishDubSelected = selectedAudioTrack === 'dub-en' || selectedAudioTrack === 'dub';

  const categoryLabel = isAnime
    ? 'Anime Engines'
    : mediaType === 'tv'
    ? 'Series Relays'
    : 'Cinema Network';

  const filterNotice = isHindiDubSelected
    ? 'Hindi DUB'
    : isEnglishDubSelected
    ? 'English DUB'
    : isAnime
    ? 'Sub & Dub'
    : 'Multi-Audio';

  return (
    <section
      aria-label="Streaming Server Selection"
      className="w-full rounded-2xl apple-glass p-2.5 sm:p-3 border border-white/[0.08] shadow-xl relative overflow-hidden backdrop-blur-xl"
    >
      {/* Subtle ambient light glow */}
      <div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none opacity-15 blur-2xl"
        style={{
          background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Left header tag */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-black uppercase tracking-wider text-white truncate">
              {categoryLabel}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1 shrink-0">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping inline-block" />
              {servers.length} Online
            </span>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400 hidden md:inline-block">
              {filterNotice}
            </span>
          </div>
        </div>

        {/* Server Pills Horizontal Carousel / Deck */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 sm:justify-end">
          {servers.map((server) => {
            const isActive = server.id === activeServerId;
            const health = ProviderTelemetry.getHealth(server.id);
            const inCooldown = ProviderTelemetry.isInCooldown(server.id);
            const qualityClean = server.quality.split('/')[0].trim();

            return (
              <button
                key={server.id}
                onClick={() => onSelectServer(server.id)}
                disabled={isLoadingSource && isActive}
                aria-pressed={isActive}
                className={`group relative flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer shrink-0 select-none border ${
                  isActive
                    ? 'bg-blue-600/25 border-blue-400/70 text-white shadow-md shadow-blue-600/20 ring-1 ring-blue-500/40'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] hover:border-white/20 text-slate-300 hover:text-white'
                }`}
              >
                {/* Server Badge & Status Dot */}
                <div className="flex items-center gap-1.5">
                  <span className="text-sm shrink-0 leading-none">{server.badge}</span>
                  <span className="font-bold text-xs truncate">{server.name}</span>
                </div>

                {/* Badges / Active Pill */}
                <div className="flex items-center gap-1.5 text-[10px]">
                  {isActive ? (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-500 text-white font-black uppercase text-[9px] tracking-wide shadow-sm">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      Live
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.08] text-slate-400 font-medium text-[9px]">
                      {qualityClean}
                    </span>
                  )}

                  {/* Language Badges if available */}
                  {server.supportsHindiDub && (
                    <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-black text-[9px]">
                      HI
                    </span>
                  )}
                  {server.supportsEnglishDub && (
                    <span className="px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold text-[9px]">
                      EN
                    </span>
                  )}

                  {/* Latency Ping */}
                  <span className="flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                    {inCooldown ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                    {health.avgLatencyMs ? `${health.avgLatencyMs}ms` : 'Fast'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
