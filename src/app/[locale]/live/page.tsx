'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Tv, Search, Play, RefreshCw, AlertTriangle, Wifi, Radio } from 'lucide-react';
import Hls from 'hls.js';
import { BASE_CHANNELS, type LiveChannelData } from '@/app/api/live/route';

type Category = 'all' | 'news' | 'sports' | 'entertainment' | 'kids' | 'science' | 'music' | 'gaming';

const CATEGORY_LABELS: { id: Category; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '📺' },
  { id: 'news', label: 'News', emoji: '📰' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { id: 'kids', label: 'Kids & Cartoons', emoji: '🧒' },
  { id: 'science', label: 'Science & Docs', emoji: '🔬' },
  { id: 'music', label: 'Music & Relax', emoji: '🎵' },
  { id: 'gaming', label: 'Gaming & Tech', emoji: '🎮' },
];

// ─── HLS Video Player Component ──────────────────────────────────────────────

function HlsPlayer({ src, onError }: { src: string; onError: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.muted = true;
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          onError();
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.muted = true;
      video.addEventListener('loadedmetadata', () => video.play().catch(() => {}), { once: true });
      video.addEventListener('error', onError, { once: true });
    } else {
      onError();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, onError]);

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        controls
        autoPlay
        muted={isMuted}
        playsInline
      />
      {isMuted && (
        <button
          onClick={() => {
            if (videoRef.current) {
              videoRef.current.muted = false;
              setIsMuted(false);
            }
          }}
          className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black/90 text-white text-xs font-semibold backdrop-blur shadow-lg border border-white/20 transition-all cursor-pointer"
        >
          🔊 Click to Unmute
        </button>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function LiveTvPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [channels, setChannels] = useState<LiveChannelData[]>(BASE_CHANNELS);
  const [selectedChannel, setSelectedChannel] = useState<LiveChannelData>(BASE_CHANNELS[0]);
  const [hlsFailed, setHlsFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch dynamic channels from /api/live
  useEffect(() => {
    let isCancelled = false;
    const fetchChannels = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (category !== 'all') params.set('category', category);
        if (searchQuery.trim()) params.set('q', searchQuery.trim());

        const res = await fetch(`/api/live?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && Array.isArray(data.channels)) {
            setChannels(data.channels);
          }
        }
      } catch (err) {
        console.warn('Could not fetch dynamic live channels, using baseline catalog:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchChannels, 150);
    return () => {
      isCancelled = true;
      clearTimeout(debounceTimer);
    };
  }, [category, searchQuery]);

  // Reset HLS failure state when channel changes
  useEffect(() => {
    setHlsFailed(false);
  }, [selectedChannel.id]);

  const filtered = channels;

  const categoryCounts = BASE_CHANNELS.reduce<Record<Category, number>>(
    (acc, ch) => {
      const catKey = ch.category === 'others' ? 'science' : (ch.category as Category);
      acc[catKey] = (acc[catKey] || 0) + 1;
      acc.all = (acc.all || 0) + 1;
      return acc;
    },
    { all: 0, news: 0, sports: 0, entertainment: 0, kids: 0, science: 0, music: 0, gaming: 0 }
  );

  // Fallback decision logic:
  // 1. Direct HLS if available and not failed
  // 2. YouTube Embed if HLS failed or if sourceType === 'youtube'
  const isDirectHlsPreferred = selectedChannel.sourceType === 'hls' && Boolean(selectedChannel.hlsUrl) && !hlsFailed;
  const useHls = isDirectHlsPreferred;
  const useEmbed = !useHls && Boolean(selectedChannel.embedUrl);
  const handleHlsError = useCallback(() => setHlsFailed(true), []);

  return (
    <div className="min-h-screen pb-24 px-4 md:px-8 pt-6 bg-[var(--color-main)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Tv className="w-6 h-6 text-accent-blue" />
            Live TV
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {BASE_CHANNELS.length}+ verified 24/7 channels · Stream live in your browser
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search channels, news, streams…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:border-blue-500 text-slate-700 dark:text-slate-200 placeholder-slate-400 transition-colors"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {CATEGORY_LABELS.map(({ id, label, emoji }) => (
          <button
            key={id}
            onClick={() => setCategory(id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
              category === id
                ? 'bg-accent-blue text-white border-transparent shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>{emoji}</span>
            {label}
            {categoryCounts[id] > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  category === id
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {categoryCounts[id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-md overflow-hidden">
            {/* Player Area */}
            <div className="relative aspect-video w-full bg-black">
              {useHls && selectedChannel.hlsUrl ? (
                <HlsPlayer key={`hls-${selectedChannel.id}`} src={selectedChannel.hlsUrl} onError={handleHlsError} />
              ) : useEmbed && selectedChannel.embedUrl ? (
                <iframe
                  key={`embed-${selectedChannel.id}-${selectedChannel.embedUrl}`}
                  src={selectedChannel.embedUrl}
                  className="w-full h-full"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  title={`Live TV – ${selectedChannel.name}`}
                  style={{ border: 'none' }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 p-6 text-center">
                  <AlertTriangle className="w-10 h-10 text-yellow-500" />
                  <p className="text-sm font-semibold">Live broadcast temporarily unavailable</p>
                  <p className="text-xs text-slate-500 max-w-sm">
                    This stream might be offline or undergoing maintenance. Try selecting another channel or retry.
                  </p>
                  <button
                    onClick={() => setHlsFailed(false)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry Stream
                  </button>
                </div>
              )}
            </div>

            {/* Channel Info Bar */}
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {selectedChannel.country && (
                      <span className="text-lg">{selectedChannel.country}</span>
                    )}
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                      {selectedChannel.name}
                    </h2>
                  </div>
                  {selectedChannel.channelTitle && selectedChannel.channelTitle !== selectedChannel.name && (
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{selectedChannel.channelTitle}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      LIVE NOW
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                      <Wifi className="w-3 h-3 text-slate-400" />
                      {selectedChannel.category}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {selectedChannel.sourceType === 'youtube' ? 'YouTube Live' : 'Direct HLS'}
                    </span>
                  </div>
                </div>

                {hlsFailed && selectedChannel.embedUrl && (
                  <span className="self-start sm:self-center text-[11px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full border border-amber-200/50 dark:border-amber-700/50">
                    Switched to verified embed
                  </span>
                )}
              </div>

              {selectedChannel.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 line-clamp-2">
                  {selectedChannel.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Channel List */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-md p-4 max-h-[75vh] overflow-y-auto flex flex-col gap-2">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100 dark:border-slate-800 mb-1">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Radio className="w-4 h-4 text-accent-blue" />
              <span>Channels</span>
              <span className="text-xs font-normal text-slate-400">({filtered.length})</span>
            </h3>
            {isLoading && (
              <span className="text-[10px] text-accent-blue font-medium animate-pulse">Updating…</span>
            )}
          </div>

          {filtered.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {filtered.map((ch) => {
                const isActive = selectedChannel.id === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setSelectedChannel(ch);
                      setHlsFailed(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left border cursor-pointer ${
                      isActive
                        ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-accent-blue dark:text-blue-400 shadow-sm'
                        : 'bg-transparent border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {ch.thumbnail ? (
                        <div className="relative w-12 h-8 rounded-lg overflow-hidden shrink-0 bg-slate-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ch.thumbnail}
                            alt={ch.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        </div>
                      ) : (
                        <span className="text-base shrink-0">{ch.country || '📺'}</span>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs truncate block">{ch.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-red-500 font-bold uppercase tracking-tight">● LIVE</span>
                          {ch.sourceType === 'hls' ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              ● Direct HLS
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                              ● YouTube Live
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <Play className="w-4 h-4 fill-accent-blue dark:fill-blue-400 text-accent-blue dark:text-blue-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-slate-400 flex flex-col items-center gap-2">
              <Tv className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              <span>No live channels match your search.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
