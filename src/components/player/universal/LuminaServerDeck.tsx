'use client';

import React from 'react';
import { Server, Check, Zap, Shield, Sparkles, Globe, Radio } from 'lucide-react';
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

  // Dynamic category title & badge
  const categoryLabel = isAnime
    ? 'Anime Streaming Engines'
    : mediaType === 'tv'
    ? 'Series Streaming Relays'
    : 'Cinema Streaming Network';

  const filterNotice = isHindiDubSelected
    ? 'Verified Hindi DUB Servers'
    : isEnglishDubSelected
    ? 'Verified English DUB Servers'
    : isAnime
    ? 'Dedicated High-Speed Anime Engines'
    : 'Universal High-Bitrate Multi-Audio CDN';

  return (
    <section
      aria-label="Streaming Server Selection"
      className="w-full flex flex-col gap-3 rounded-2xl apple-glass p-3.5 sm:p-5 border border-white/[0.08] shadow-2xl relative overflow-hidden"
    >
      {/* Ambient gradient glow in background */}
      <div
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none opacity-20 blur-3xl"
        style={{
          background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
        }}
      />

      {/* Header bar: Title, verified count, filter badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
            <Radio className="w-4 h-4 text-blue-400 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-black tracking-wide uppercase text-white truncate">
                {categoryLabel}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                {servers.length} Online
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
              {filterNotice}
            </p>
          </div>
        </div>

        {/* Feature badges */}
        <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-300 shrink-0 self-start sm:self-auto">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08]">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Instant Switch</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08]">
            <Shield className="w-3 h-3 text-blue-400" />
            <span>Ad Guard</span>
          </div>
        </div>
      </div>

      {/* Server Cards Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 relative z-10">
        {servers.map((server) => {
          const isActive = server.id === activeServerId;
          const health = ProviderTelemetry.getHealth(server.id);
          const inCooldown = ProviderTelemetry.isInCooldown(server.id);
          const qualityClean = server.quality.split('/')[0].trim();

          // Server highlight descriptors
          const isNova = server.id === 'nova';
          const isVidLink = server.id.includes('vidlink');
          const isScreenScape = server.id.includes('screenscape');
          const isAutoEmbed = server.id.includes('autoembed');
          const isVidSrc = server.id.includes('vidsrc');

          return (
            <button
              key={server.id}
              onClick={() => onSelectServer(server.id)}
              disabled={isLoadingSource && isActive}
              className={`group relative flex flex-col justify-between p-3 sm:p-3.5 rounded-xl text-left transition-all duration-200 cursor-pointer overflow-hidden border ${
                isActive
                  ? 'bg-blue-600/15 dark:bg-blue-600/20 border-blue-500/70 shadow-lg shadow-blue-500/15 ring-1 ring-blue-500/50'
                  : 'bg-white/[0.03] dark:bg-black/30 hover:bg-white/[0.07] dark:hover:bg-white/[0.06] border-white/[0.08] hover:border-white/20 hover:scale-[1.01] active:scale-[0.99]'
              }`}
            >
              {/* Card Top: Badge, Title & Active Tag */}
              <div className="flex items-start justify-between gap-2 w-full">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base sm:text-lg shrink-0 select-none">
                    {server.badge}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-blue-300 transition-colors">
                        {server.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {isNova
                        ? '1080p Ultra HD • Multi-Audio'
                        : isVidLink
                        ? 'Zero Ads • Lowest Latency'
                        : isScreenScape
                        ? 'Multi-Lang • Hindi Dub'
                        : isAutoEmbed
                        ? 'High-Speed Stream CDN'
                        : isVidSrc
                        ? 'Global Edge Mirror'
                        : 'Verified 1080p Stream'}
                    </span>
                  </div>
                </div>

                {/* Active Indicator or Quality Tag */}
                <div className="shrink-0 flex items-center">
                  {isActive ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500 text-white shadow-sm shadow-blue-500/30">
                      <Check className="w-3 h-3 stroke-[3]" />
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/[0.08] text-slate-300 border border-white/[0.08]">
                      {qualityClean}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Bottom: Features, Languages & Speed Health */}
              <div className="flex items-center justify-between gap-2 pt-2.5 mt-2.5 border-t border-white/[0.06] w-full text-[10px]">
                {/* Audio/Capability Badges */}
                <div className="flex items-center gap-1 flex-wrap">
                  {server.supportsHindiDub && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                      🇮🇳 HI
                    </span>
                  )}
                  {server.supportsEnglishDub && (
                    <span className="px-1.5 py-0.2 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300 font-bold">
                      EN
                    </span>
                  )}
                  <span className="px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400 font-medium">
                    SUB
                  </span>
                </div>

                {/* Health & Ping Indicator */}
                <div className="flex items-center gap-1.5 shrink-0 text-slate-400 font-medium">
                  {inCooldown ? (
                    <span className="text-red-400 flex items-center gap-1 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      Cooldown
                    </span>
                  ) : health.status === 'DEGRADED' ? (
                    <span className="text-amber-400 flex items-center gap-1 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Degraded
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {health.avgLatencyMs ? `${health.avgLatencyMs}ms` : 'Fast CDN'}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/[0.06] text-[11px] text-slate-400 relative z-10">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>
            <strong className="text-slate-200">Pro Tip:</strong> Nova Ultra HD and VidLink provide the fastest buffering. If a server is slow on your network, switch with 1-click.
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 text-[10px] shrink-0">
          <Globe className="w-3 h-3 text-slate-500" />
          <span>All servers filtered for compatibility</span>
        </div>
      </div>
    </section>
  );
}
