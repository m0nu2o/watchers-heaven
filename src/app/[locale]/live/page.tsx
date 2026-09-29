'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Tv, Search, Play, RefreshCw, Loader, AlertTriangle, Wifi } from 'lucide-react';
import Hls from 'hls.js';

// ─── Channel Database ───────────────────────────────────────────────────────
// Free public HLS streams from iptv-org and other open sources.
// Primary: direct m3u8 HLS (played via Hls.js, no black screen).
// Fallback: toustream iframe if HLS fails.

interface LiveChannel {
  id: string;
  name: string;
  category: 'news' | 'sports' | 'entertainment' | 'kids' | 'others';
  logo?: string;
  hlsUrl?: string;          // Direct HLS stream — preferred (Hls.js)
  embedUrl?: string;        // iframe fallback
  country?: string;
}

const CHANNELS: LiveChannel[] = [
  // ── News ─────────────────────────────────────────────────────────────────
  { id: 'aaj-tak', name: 'Aaj Tak HD', category: 'news', country: '🇮🇳',
    hlsUrl: 'https://feeds.intoday.in/aajtak/api/master.m3u8' },
  { id: 'abp-news', name: 'ABP News HD', category: 'news', country: '🇮🇳',
    hlsUrl: 'https://d2l4ar6y3mrs4k.cloudfront.net/live-streaming/abpnews-livetv/master.m3u8' },
  { id: 'republic-tv', name: 'Republic TV', category: 'news', country: '🇮🇳',
    hlsUrl: 'https://vg-republictvlive.akamaized.net/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/vglive-sk-275673/main.m3u8' },
  { id: 'wion', name: 'WION News HD', category: 'news', country: '🇮🇳',
    hlsUrl: 'https://wion-klowdtv.amagi.tv/playlist.m3u8' },
  { id: 'zee-news', name: 'Zee News', category: 'news', country: '🇮🇳',
    hlsUrl: 'https://dt3lrqnyx3dks.cloudfront.net/index.m3u8' },
  { id: 'euronews', name: 'Euronews English', category: 'news', country: '🇪🇺',
    hlsUrl: 'https://cdn-euronews.akamaized.net/live/eds/euronews-en/25002/index.m3u8' },
  { id: 'rt-news', name: 'RT News International', category: 'news', country: '🌍',
    hlsUrl: 'https://rt-glb.rttv.com/live/rtnews/playlist.m3u8' },

  // ── Sports ────────────────────────────────────────────────────────────────
  { id: 'dd-sports', name: 'DD Sports Live', category: 'sports', country: '🇮🇳',
    hlsUrl: 'https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index.m3u8' },
  { id: 'redbull-tv', name: 'Red Bull TV Sports', category: 'sports', country: '🌍',
    hlsUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8' },

  // ── Kids & Cartoons ───────────────────────────────────────────────────────
  { id: 'pokemon-tv', name: 'Pokémon Live 24/7', category: 'kids', country: '🌍',
    embedUrl: 'https://www.youtube.com/embed/86YLFOog4GM?autoplay=1' },
  { id: 'tom-jerry', name: 'WB Kids · Tom & Jerry', category: 'kids', country: '🌍',
    embedUrl: 'https://www.youtube.com/embed/Y0A-X0G483U?autoplay=1' },
  { id: 'classic-cartoons', name: 'Classic Retro Cartoons 24/7', category: 'kids', country: '🌍',
    embedUrl: 'https://www.youtube.com/embed/75x6DncZDZk?autoplay=1' },
  { id: 'abc-kids', name: 'ABC Kids HD', category: 'kids', country: '🇦🇺',
    hlsUrl: 'https://c.mjh.nz/abc-kids.m3u8' },
  { id: '3abn-kids', name: '3ABN Kids TV', category: 'kids', country: '🇺🇸',
    hlsUrl: 'https://3abn.bozztv.com/3abn2/Kids_live/smil:Kids_live.smil/playlist.m3u8' },

  // ── Entertainment & Science ───────────────────────────────────────────────
  { id: 'dd-national', name: 'DD National HD', category: 'entertainment', country: '🇮🇳',
    hlsUrl: 'https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/40492a64c1db4a1385ba1a397d357d3a/index.m3u8' },
  { id: 'dw-doc', name: 'DW Documentary Science HD', category: 'others', country: '🇩🇪',
    embedUrl: 'https://www.youtube.com/embed/nv_m_yq9mvg?autoplay=1',
    hlsUrl: 'https://dwamdstream104.akamaized.net/hls/live/2015530/dwstream104/index.m3u8' },
  { id: 'nasa-live', name: 'NASA Earth & Space Station 24/7', category: 'others', country: '🚀',
    embedUrl: 'https://www.youtube.com/embed/21X5lGlDOfg?autoplay=1' },
  { id: 'nasa-tv', name: 'NASA TV Live HD', category: 'others', country: '🚀',
    embedUrl: 'https://www.youtube.com/embed/xRPjKQtRXR8?autoplay=1',
    hlsUrl: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8' },
];

type Category = 'all' | 'news' | 'sports' | 'entertainment' | 'kids' | 'others';

const CATEGORY_LABELS: { id: Category; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '📺' },
  { id: 'news', label: 'News', emoji: '📰' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { id: 'kids', label: 'Kids & Cartoons', emoji: '🧒' },
  { id: 'others', label: 'Science & Docs', emoji: '🔬' },
];

// ─── HLS Video Player Component ──────────────────────────────────────────────

function HlsPlayer({ src, onError }: { src: string; onError: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Destroy any existing HLS instance
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
      // Safari native HLS
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
  const [selectedChannel, setSelectedChannel] = useState<LiveChannel>(CHANNELS[0]);
  const [hlsFailed, setHlsFailed] = useState(false);

  // Reset HLS failure state when channel changes
  useEffect(() => {
    setHlsFailed(false);
  }, [selectedChannel.id]);

  const filtered = CHANNELS.filter((ch) => {
    const matchSearch = ch.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = category === 'all' || ch.category === category;
    return matchSearch && matchCat;
  });

  const categoryCounts = CHANNELS.reduce<Record<Category, number>>(
    (acc, ch) => {
      acc[ch.category] = (acc[ch.category] || 0) + 1;
      acc.all = (acc.all || 0) + 1;
      return acc;
    },
    { all: 0, news: 0, sports: 0, entertainment: 0, kids: 0, others: 0 }
  );

  // Determine which player to use for selected channel
  const useHls = selectedChannel.hlsUrl && !hlsFailed;
  const useEmbed = !useHls && selectedChannel.embedUrl;
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
            {CHANNELS.length} channels · Stream live in your browser
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search channels…"
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
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
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
                <HlsPlayer src={selectedChannel.hlsUrl} onError={handleHlsError} />
              ) : useEmbed && selectedChannel.embedUrl ? (
                <iframe
                  key={selectedChannel.id}
                  src={selectedChannel.embedUrl}
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay; fullscreen; picture-in-picture"
                  title={`Live TV – ${selectedChannel.name}`}
                  style={{ border: 'none' }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                  <AlertTriangle className="w-10 h-10 text-yellow-500" />
                  <p className="text-sm font-semibold">Stream unavailable</p>
                  <button
                    onClick={() => setHlsFailed(false)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                  </button>
                </div>
              )}
            </div>

            {/* Channel Info Bar */}
            <div className="px-5 py-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  {selectedChannel.country && (
                    <span className="text-base">{selectedChannel.country}</span>
                  )}
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                    {selectedChannel.name}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-red-500 font-bold uppercase tracking-wide">Live</span>
                  <span className="text-slate-300 dark:text-slate-600 mx-1">·</span>
                  <Wifi className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {selectedChannel.category}
                  </span>
                </div>
              </div>
              {hlsFailed && selectedChannel.hlsUrl && selectedChannel.embedUrl && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                  Using embed fallback
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Channel List */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-md p-4 max-h-[70vh] overflow-y-auto flex flex-col gap-2">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 px-2 pb-2 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center gap-2">
            <span>Channels</span>
            <span className="text-xs font-normal text-slate-400">({filtered.length})</span>
          </h3>

          {filtered.length > 0 ? (
            <div className="flex flex-col gap-1">
              {filtered.map((ch) => {
                const isActive = selectedChannel.id === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setSelectedChannel(ch);
                      setHlsFailed(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left border ${
                      isActive
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-100/50 dark:border-blue-900/50 text-accent-blue dark:text-blue-400'
                        : 'bg-transparent border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {ch.country && <span className="text-base shrink-0">{ch.country}</span>}
                      <div className="min-w-0">
                        <span className="font-semibold text-sm truncate block">{ch.name}</span>
                        {ch.hlsUrl && (
                          <span className="text-[10px] text-green-500 font-semibold">● Direct HLS</span>
                        )}
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
            <div className="text-center py-10 text-xs text-slate-400">
              No channels match your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
