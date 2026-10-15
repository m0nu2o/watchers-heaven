'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Check, Radio, ChevronLeft, ChevronRight, Volume2, Mic, Subtitles } from 'lucide-react';
import { ProviderAdapter, MediaType } from '@/types/media';
import { ProviderTelemetry } from '@/lib/providers';

export interface LuminaServerDeckProps {
  servers: ProviderAdapter[];
  activeServerId: string;
  onSelectServer: (serverId: string) => void;
  mediaType: MediaType;
  selectedAudioTrack?: string;
  onSelectAudioTrack?: (trackId: string) => void;
  accentColor?: string;
  isLoadingSource?: boolean;
  hasHindiDub?: boolean;
  hasEnglishDub?: boolean;
}

export function LuminaServerDeck({
  servers,
  activeServerId,
  onSelectServer,
  mediaType,
  selectedAudioTrack = 'sub',
  onSelectAudioTrack,
  accentColor = '#3b82f6',
  isLoadingSource = false,
  hasHindiDub = false,
  hasEnglishDub = true,
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
  const isSubSelected = !isHindiDubSelected && !isEnglishDubSelected;

  const categoryLabel = isAnime
    ? 'Anime Engines'
    : mediaType === 'tv'
    ? 'Series Relays'
    : 'Cinema Network';

  // Check scroll boundary state
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
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

  // Auto-scroll active server into center view without viewport thrashing or screen shaking
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const activeEl = el.querySelector<HTMLElement>(`[data-server-id="${activeServerId}"]`);
    if (activeEl) {
      const targetLeft = activeEl.offsetLeft - (el.clientWidth / 2) + (activeEl.clientWidth / 2);
      el.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: 'smooth',
      });
      setTimeout(updateScrollState, 300);
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
    setTimeout(updateScrollState, 280);
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
    if (Math.abs(walk) > 14) {
      hasMovedRef.current = true;
    }
    el.scrollLeft = scrollLeftStartRef.current - walk;
    updateScrollState();
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    setTimeout(() => {
      hasMovedRef.current = false;
    }, 80);
  };

  return (
    <section
      aria-label="Streaming Server Selection"
      className="w-full rounded-2xl apple-glass p-2.5 sm:p-3 border border-black/10 dark:border-white/[0.08] shadow-xl relative overflow-hidden backdrop-blur-xl group/deck"
    >
      {/* Subtle ambient light glow */}
      <div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none opacity-15 blur-2xl"
        style={{
          background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex flex-col gap-2.5 min-w-0">
        {/* Row 1: Left category header tag + Right Sub/Dub Mode Selector */}
        <div className="flex items-center justify-between gap-3 select-none flex-wrap sm:flex-nowrap px-0.5">
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <div className="w-6 h-6 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white whitespace-nowrap">
                {categoryLabel}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping inline-block" />
                {servers.length} Online
              </span>
            </div>
          </div>

          {/* ── Sub & Dub Direct 1-Click Toggle ── */}
          {onSelectAudioTrack && (
            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/[0.06] p-0.5 rounded-xl border border-black/5 dark:border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => onSelectAudioTrack('sub')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  isSubSelected
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 ring-1 ring-blue-500/50'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                title="Original Language / Subtitles"
              >
                <Subtitles className="w-3 h-3" />
                <span>SUB</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectAudioTrack('dub-en')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  isEnglishDubSelected
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30 ring-1 ring-purple-500/50'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                title="English Audio / Dubbed"
              >
                <Mic className="w-3 h-3" />
                <span>DUB</span>
              </button>

              {/* Only show HINDI button if title genuinely has Hindi dub/audio */}
              {(hasHindiDub || isHindiDubSelected) && (
                <button
                  type="button"
                  onClick={() => onSelectAudioTrack('dub-hi')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    isHindiDubSelected
                      ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30 ring-1 ring-amber-500/50'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  title="Hindi Dubbed / Audio"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>HINDI</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Row 2: Full-Width Carousel Container with Adaptive Chevrons */}
        <div className="relative flex items-center min-w-0 w-full">
          {/* Left Arrow Button */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollStep('left')}
              aria-label="Scroll servers left"
              className="absolute left-0 z-20 w-7 h-7 rounded-full bg-slate-900/10 hover:bg-slate-900/20 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white flex items-center justify-center backdrop-blur-xl border border-black/10 dark:border-white/15 shadow-sm transition-all duration-150 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}

          {/* Left Gradient Fade Mask */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-100/80 via-slate-100/40 dark:from-slate-950/80 dark:via-slate-950/40 to-transparent pointer-events-none z-10" />
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
                  className={`group relative flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer shrink-0 select-none border whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600/35 border-blue-500 text-slate-900 dark:text-white shadow-md shadow-blue-600/20 ring-1 ring-blue-500/50'
                      : 'bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] border-black/10 dark:border-white/[0.12] hover:border-black/20 dark:hover:border-white/25 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {/* Server Badge & Status Dot */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm shrink-0 leading-none">{server.badge}</span>
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[130px] sm:max-w-[160px] tracking-wide">
                      {server.name}
                    </span>
                  </div>

                  {/* Badges / Active Pill */}
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {isActive ? (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-600 text-white font-black uppercase text-[9px] tracking-wide shadow-sm">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        Live
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-black/[0.06] dark:bg-white/10 text-slate-700 dark:text-slate-200 font-semibold text-[9px]">
                        {qualityClean}
                      </span>
                    )}

                    {/* Language Badges if available */}
                    {server.supportsHindiDub && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 dark:bg-amber-500/30 text-amber-700 dark:text-amber-200 border border-amber-500/30 font-black text-[9px]">
                        HI
                      </span>
                    )}
                    {server.supportsEnglishDub && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 dark:bg-blue-500/30 text-blue-700 dark:text-blue-200 border border-blue-500/30 font-bold text-[9px]">
                        EN
                      </span>
                    )}

                    {/* Latency Ping */}
                    <span className="flex items-center gap-1 text-[9.5px] text-slate-500 dark:text-slate-300 font-mono font-medium">
                      {inCooldown ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
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
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-100/80 via-slate-100/40 dark:from-slate-950/80 dark:via-slate-950/40 to-transparent pointer-events-none z-10" />
          )}

          {/* Right Arrow Button */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollStep('right')}
              aria-label="Scroll servers right"
              className="absolute right-0 z-20 w-7 h-7 rounded-full bg-slate-900/10 hover:bg-slate-900/20 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white flex items-center justify-center backdrop-blur-xl border border-black/10 dark:border-white/15 shadow-sm transition-all duration-150 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
