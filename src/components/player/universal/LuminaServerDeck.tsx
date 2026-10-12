'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Check, Radio, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const hasMovedRef = useRef(false);

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

  // Check scroll boundary state
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  // Sync scroll boundaries on mount and resize
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();

    const handleResize = () => updateScrollState();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [servers, updateScrollState]);

  // Translate vertical wheel scroll to horizontal scroll inside the server deck
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        updateScrollState();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [updateScrollState]);

  // Auto-scroll active server into center view
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const activeEl = el.querySelector<HTMLElement>(`[data-server-id="${activeServerId}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
      setTimeout(updateScrollState, 350);
    }
  }, [activeServerId, updateScrollState]);

  // Scroll buttons (desktop chevrons)
  const scrollStep = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = 240;
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
    setTimeout(updateScrollState, 300);
  };

  // Mouse Drag-to-Scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftStartRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.2;
    if (Math.abs(walk) > 5) {
      hasMovedRef.current = true;
    }
    el.scrollLeft = scrollLeftStartRef.current - walk;
    updateScrollState();
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  return (
    <section
      aria-label="Streaming Server Selection"
      className="w-full rounded-2xl apple-glass p-2.5 sm:p-3 border border-white/[0.08] shadow-xl relative overflow-hidden backdrop-blur-xl group/deck"
    >
      {/* Subtle ambient light glow */}
      <div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none opacity-15 blur-2xl"
        style={{
          background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-2.5 min-w-0">
        {/* Left header tag */}
        <div className="flex items-center gap-2 shrink-0 select-none">
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
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400 hidden sm:inline-block">
              {filterNotice}
            </span>
          </div>
        </div>

        {/* Carousel Container with Scroll Arrows */}
        <div className="relative flex items-center min-w-0 flex-1">
          {/* Left Arrow Button */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollStep('left')}
              aria-label="Scroll servers left"
              className="absolute left-0 z-20 w-7 h-7 rounded-full bg-black/80 hover:bg-blue-600/90 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg transition-all duration-200 -translate-x-1"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}

          {/* Left Gradient Fade Mask */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/80 to-transparent pointer-events-none z-10" />
          )}

          {/* Server Pills Horizontal Carousel / Deck */}
          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            data-lenis-prevent
            className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 w-full min-w-0 scroll-smooth cursor-grab active:cursor-grabbing select-none"
          >
            {servers.map((server) => {
              const isActive = server.id === activeServerId;
              const health = ProviderTelemetry.getHealth(server.id);
              const inCooldown = ProviderTelemetry.isInCooldown(server.id);
              const qualityClean = server.quality.split('/')[0].trim();

              return (
                <button
                  key={server.id}
                  data-server-id={server.id}
                  onClick={() => {
                    // Prevent accidental click during mouse dragging
                    if (hasMovedRef.current) return;
                    onSelectServer(server.id);
                  }}
                  disabled={isLoadingSource && isActive}
                  aria-pressed={isActive}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer shrink-0 select-none border whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600/30 border-blue-400 text-white shadow-md shadow-blue-600/25 ring-1 ring-blue-500/50 scale-[1.02]'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] hover:border-white/20 text-slate-300 hover:text-white'
                  }`}
                >
                  {/* Server Badge & Status Dot */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm shrink-0 leading-none">{server.badge}</span>
                    <span className="font-bold text-xs truncate max-w-[130px] sm:max-w-[160px]">
                      {server.name}
                    </span>
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

          {/* Right Gradient Fade Mask */}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/80 to-transparent pointer-events-none z-10" />
          )}

          {/* Right Arrow Button */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollStep('right')}
              aria-label="Scroll servers right"
              className="absolute right-0 z-20 w-7 h-7 rounded-full bg-black/80 hover:bg-blue-600/90 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg transition-all duration-200 translate-x-1"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
