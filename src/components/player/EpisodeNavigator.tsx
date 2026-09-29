'use client';
import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Maximize2,
  Minimize2,
  Calendar,
  Clock,
  Sparkles,
  Search,
  X,
  Zap,
  Layers,
} from 'lucide-react';
import { getArcsForSeason, getCurrentArcForEpisode, StoryArc } from '@/lib/anime/arcs';

export interface EpisodeItem {
  id: number;
  episode_number: number;
  name: string;
  overview?: string;
  still_path?: string;
  air_date?: string;
  runtime?: number;
}

export interface SeasonSummary {
  id: number;
  season_number: number;
  name?: string;
  episode_count?: number;
}

interface EpisodeNavigatorProps {
  tmdbId?: string | number;
  currentSeason: number;
  currentEpisode: number;
  seasons: SeasonSummary[];
  episodes: EpisodeItem[];
  loadingEpisodes?: boolean;
  onSelectEpisode: (season: number, episode: number) => void;
  onSelectSeason: (season: number) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  accentColor?: string;
  isAnime?: boolean;
  autoNextEnabled?: boolean;
  onToggleAutoNext?: (enabled: boolean) => void;
}

const RANGE_SIZE = 50;

export function EpisodeNavigator({
  tmdbId,
  currentSeason,
  currentEpisode,
  seasons,
  episodes,
  loadingEpisodes = false,
  onSelectEpisode,
  onSelectSeason,
  isFullscreen = false,
  onToggleFullscreen,
  accentColor = '007bff',
  isAnime = false,
  autoNextEnabled = false,
  onToggleAutoNext,
}: EpisodeNavigatorProps) {
  // Sort episodes by episode_number ascending
  const sortedEpisodes = useMemo(() => {
    return [...episodes].sort((a, b) => a.episode_number - b.episode_number);
  }, [episodes]);

  const totalEpisodes = sortedEpisodes.length;

  // ── Canonical Story Arcs (Tier 2) ──
  const seasonArcs = useMemo(() => {
    if (!tmdbId) return [];
    return getArcsForSeason(tmdbId, currentSeason);
  }, [tmdbId, currentSeason]);

  const currentEpArc = useMemo(() => {
    if (!tmdbId) return null;
    return getCurrentArcForEpisode(tmdbId, currentSeason, currentEpisode);
  }, [tmdbId, currentSeason, currentEpisode]);

  // Selected Arc filter: 'all' or specific arc id
  const [selectedArcId, setSelectedArcId] = useState<string>('all');
  const [prevSeasonTrack, setPrevSeasonTrack] = useState(currentSeason);

  if (prevSeasonTrack !== currentSeason) {
    setPrevSeasonTrack(currentSeason);
    setSelectedArcId('all');
  }

  // Active arc object
  const activeArc = useMemo(() => {
    if (selectedArcId === 'all') return null;
    return seasonArcs.find((a) => a.id === selectedArcId) || null;
  }, [selectedArcId, seasonArcs]);

  // Filter episodes by selected arc if one is chosen
  const arcFilteredEpisodes = useMemo(() => {
    if (!activeArc) return sortedEpisodes;
    return sortedEpisodes.filter(
      (ep) => ep.episode_number >= activeArc.startEpisode && ep.episode_number <= activeArc.endEpisode
    );
  }, [activeArc, sortedEpisodes]);

  // Find min and max episode number for this arc / season
  const minEpNum = arcFilteredEpisodes.length > 0 ? arcFilteredEpisodes[0].episode_number : 1;
  const maxEpNum = arcFilteredEpisodes.length > 0 ? arcFilteredEpisodes[arcFilteredEpisodes.length - 1].episode_number : 1;

  // Compute episode ranges (e.g. 1-50, 51-100, etc.)
  const ranges = useMemo(() => {
    if (arcFilteredEpisodes.length === 0) return [];
    const result: { start: number; end: number; label: string }[] = [];

    let rangeStart = minEpNum;
    while (rangeStart <= maxEpNum) {
      const rangeEnd = Math.min(rangeStart + RANGE_SIZE - 1, maxEpNum);
      result.push({
        start: rangeStart,
        end: rangeEnd,
        label: `${rangeStart}–${rangeEnd}`,
      });
      rangeStart += RANGE_SIZE;
    }
    return result;
  }, [minEpNum, maxEpNum, arcFilteredEpisodes]);

  // Determine active range based on currentEpisode
  const defaultRangeIndex = useMemo(() => {
    if (ranges.length === 0) return 0;
    const foundIdx = ranges.findIndex(
      (r) => currentEpisode >= r.start && currentEpisode <= r.end
    );
    return foundIdx !== -1 ? foundIdx : 0;
  }, [currentEpisode, ranges]);

  const [selectedRangeIndex, setSelectedRangeIndex] = useState<number | null>(null);
  const [prevEpSeason, setPrevEpSeason] = useState({ season: currentSeason, episode: currentEpisode });

  if (prevEpSeason.season !== currentSeason || prevEpSeason.episode !== currentEpisode) {
    setPrevEpSeason({ season: currentSeason, episode: currentEpisode });
    setSelectedRangeIndex(null);
  }

  const activeRangeIndex = selectedRangeIndex !== null ? selectedRangeIndex : defaultRangeIndex;

  // Visible episodes capped at RANGE_SIZE = 50
  const visibleEpisodes = useMemo(() => {
    if (ranges.length === 0) return arcFilteredEpisodes;
    const currentRange = ranges[activeRangeIndex] || ranges[0];
    return arcFilteredEpisodes.filter(
      (ep) => ep.episode_number >= currentRange.start && ep.episode_number <= currentRange.end
    );
  }, [arcFilteredEpisodes, ranges, activeRangeIndex]);

  // Search query state
  const [searchQuery, setSearchQuery] = useState('');
  const isSearching = searchQuery.trim().length > 0;

  const displayedEpisodes = useMemo(() => {
    if (!isSearching) return visibleEpisodes;
    const q = searchQuery.toLowerCase().trim();
    return sortedEpisodes.filter((ep) => {
      const matchNum = String(ep.episode_number) === q || String(ep.episode_number).includes(q);
      const matchName = ep.name && ep.name.toLowerCase().includes(q);
      const matchOverview = ep.overview && ep.overview.toLowerCase().includes(q);
      return matchNum || matchName || matchOverview;
    });
  }, [isSearching, searchQuery, sortedEpisodes, visibleEpisodes]);

  // Episode watch progress reader
  const getEpisodeProgress = (epNum: number): number => {
    if (typeof window === 'undefined') return 0;
    try {
      const cw = localStorage.getItem('continue-watching');
      if (cw) {
        const list = JSON.parse(cw) as Array<{ season?: number; episode?: number; progress?: number }>;
        const match = list.find((item) => item.season === currentSeason && item.episode === epNum);
        if (match?.progress && match.progress > 0) return Math.min(Math.round(match.progress), 100);
      }
    } catch {
      return 0;
    }
    return 0;
  };

  // Current episode metadata
  const currentEpMeta = useMemo(() => {
    return sortedEpisodes.find((ep) => ep.episode_number === currentEpisode);
  }, [sortedEpisodes, currentEpisode]);

  // Navigation handlers
  const hasPrevious = useMemo(() => {
    const currentIndex = sortedEpisodes.findIndex((ep) => ep.episode_number === currentEpisode);
    if (currentIndex > 0) return true;
    const currentSeasonIdx = seasons.findIndex((s) => s.season_number === currentSeason);
    return currentSeasonIdx > 0;
  }, [sortedEpisodes, currentEpisode, seasons, currentSeason]);

  const hasNext = useMemo(() => {
    const currentIndex = sortedEpisodes.findIndex((ep) => ep.episode_number === currentEpisode);
    if (currentIndex >= 0 && currentIndex < sortedEpisodes.length - 1) return true;
    const currentSeasonIdx = seasons.findIndex((s) => s.season_number === currentSeason);
    return currentSeasonIdx >= 0 && currentSeasonIdx < seasons.length - 1;
  }, [sortedEpisodes, currentEpisode, seasons, currentSeason]);

  const handlePreviousEpisode = () => {
    const currentIndex = sortedEpisodes.findIndex((ep) => ep.episode_number === currentEpisode);
    if (currentIndex > 0) {
      const prevEp = sortedEpisodes[currentIndex - 1];
      onSelectEpisode(currentSeason, prevEp.episode_number);
      return;
    }
    const currentSeasonIdx = seasons.findIndex((s) => s.season_number === currentSeason);
    if (currentSeasonIdx > 0) {
      const prevSeason = seasons[currentSeasonIdx - 1];
      onSelectSeason(prevSeason.season_number);
    }
  };

  const handleNextEpisode = () => {
    const currentIndex = sortedEpisodes.findIndex((ep) => ep.episode_number === currentEpisode);
    if (currentIndex >= 0 && currentIndex < sortedEpisodes.length - 1) {
      const nextEp = sortedEpisodes[currentIndex + 1];
      onSelectEpisode(currentSeason, nextEp.episode_number);
      return;
    }
    const currentSeasonIdx = seasons.findIndex((s) => s.season_number === currentSeason);
    if (currentSeasonIdx >= 0 && currentSeasonIdx < seasons.length - 1) {
      const nextSeason = seasons[currentSeasonIdx + 1];
      onSelectSeason(nextSeason.season_number);
    }
  };

  const [todayIso] = useState(() => new Date().toISOString().slice(0, 10));

  const isUpcoming = (ep: EpisodeItem): boolean => {
    if (!ep.air_date) return false;
    return ep.air_date > todayIso;
  };

  return (
    <div className="w-full space-y-4">
      {/* ──────────────── QUICK CONTROLLER BAR DIRECTLY BELOW PLAYER ──────────────── */}
      <div className="bg-[#0b0f17] border border-slate-800/80 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-xl">
        {/* Previous Episode Button */}
        <button
          onClick={handlePreviousEpisode}
          disabled={!hasPrevious}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold transition disabled:opacity-30 disabled:pointer-events-none border border-slate-850 shadow-sm cursor-pointer"
          title="Previous Episode"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Center: Canonical Episode & Arc Label */}
        <div className="text-center min-w-0 flex-1 px-2">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span
              className="text-xs font-black tracking-wide uppercase px-2 py-0.5 rounded-md text-white shadow-sm"
              style={{ backgroundColor: `#${accentColor}` }}
            >
              EP {currentEpisode}
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              {seasons.length <= 1 ? 'Main Series' : `Season ${currentSeason}`}
              {currentEpArc ? (
                <span className="text-blue-400 ml-1">
                  • {currentEpArc.shortName} Arc
                </span>
              ) : null}
            </span>
          </div>
          <h2 className="text-xs md:text-sm font-bold text-white truncate mt-0.5 max-w-sm md:max-w-md mx-auto">
            {currentEpMeta?.name || `Episode ${currentEpisode}`}
          </h2>
        </div>

        {/* Right: Next Episode + Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleNextEpisode}
            disabled={!hasNext}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-30 disabled:pointer-events-none shadow-md cursor-pointer"
            title="Next Episode"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-850 transition cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Player'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* ──────────────── DEDICATED EPISODES SECTION BELOW PLAYER ──────────────── */}
      <div className="bg-[#0b0f17] border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-2xl space-y-5">
        {/* Tier 1 Header: Season Picker, Auto Next, and Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Sparkles className="w-4 h-4 text-accent-blue" />
            <h3 className="text-sm font-black tracking-wider text-white uppercase select-none">
              Episodes
            </h3>
            <span className="text-[11px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-lg">
              {totalEpisodes} {totalEpisodes === 1 ? 'Episode' : 'Episodes'}
            </span>

            {/* Auto Next Toggle */}
            {onToggleAutoNext && (
              <button
                onClick={() => onToggleAutoNext(!autoNextEnabled)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
                  autoNextEnabled
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                }`}
                title="Automatically advance to the next episode when finished"
              >
                <Zap className={`w-3 h-3 ${autoNextEnabled ? 'fill-amber-400 text-amber-400' : ''}`} />
                <span>Auto Next: {autoNextEnabled ? 'ON' : 'OFF'}</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Episode Search Bar */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search episode # or title..."
                className="w-full pl-8 pr-7 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Tier 1: Canonical Season Selector */}
            {seasons.length > 1 && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400 font-semibold">Season:</span>
                <select
                  value={currentSeason}
                  onChange={(e) => {
                    setSearchQuery('');
                    setSelectedArcId('all');
                    onSelectSeason(parseInt(e.target.value));
                  }}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
                >
                  {seasons.map((s) => (
                    <option key={s.id} value={s.season_number}>
                      {s.name || `Season ${s.season_number}`} {s.episode_count ? `(${s.episode_count} eps)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ──────────────── TIER 2: STORY ARC SELECTOR (Shown when Arcs exist) ──────────────── */}
        {seasonArcs.length > 0 && !isSearching && (
          <div className="space-y-2.5 bg-[#07090e] border border-slate-800/80 rounded-2xl p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Story Arcs ({seasonArcs.length})</span>
              </div>
              {activeArc && (
                <span className="text-[10px] text-blue-400 font-semibold">
                  Episodes {activeArc.startEpisode}–{activeArc.endEpisode}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none" data-lenis-prevent>
              <button
                type="button"
                onClick={() => {
                  setSelectedArcId('all');
                  setSelectedRangeIndex(0);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedArcId === 'all'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                All Arcs ({totalEpisodes})
              </button>

              {seasonArcs.map((arc) => {
                const isArcActive = selectedArcId === arc.id;
                const isCurrentEpInside = currentEpisode >= arc.startEpisode && currentEpisode <= arc.endEpisode;

                return (
                  <button
                    key={arc.id}
                    type="button"
                    onClick={() => {
                      setSelectedArcId(arc.id);
                      setSelectedRangeIndex(0);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      isArcActive
                        ? 'text-white shadow-md'
                        : 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800'
                    }`}
                    style={isArcActive ? { backgroundColor: `#${accentColor}` } : {}}
                    title={arc.name}
                  >
                    <span>{arc.shortName}</span>
                    <span className="text-[10px] opacity-75 font-normal">
                      ({arc.startEpisode}–{arc.endEpisode})
                    </span>
                    {isCurrentEpInside && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Current Episode" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Results Notice OR Episode Range Tabs */}
        {isSearching ? (
          <div className="flex items-center justify-between bg-blue-950/30 border border-blue-900/40 px-3.5 py-2 rounded-xl text-xs text-blue-200">
            <span>
              Found <strong>{displayedEpisodes.length}</strong> matching episode{displayedEpisodes.length === 1 ? '' : 's'} for &ldquo;{searchQuery}&rdquo;
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
            >
              Reset Search
            </button>
          </div>
        ) : ranges.length > 1 && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Episode Range
            </span>
            <div className="flex flex-wrap items-center gap-1.5 max-h-28 overflow-y-auto pr-1 custom-scrollbar" data-lenis-prevent>
              {ranges.map((range, idx) => {
                const isActive = activeRangeIndex === idx;
                return (
                  <button
                    key={range.label}
                    onClick={() => setSelectedRangeIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'text-white shadow-md'
                        : 'bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                    style={isActive ? { backgroundColor: `#${accentColor}` } : {}}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tier 3: Episode Cards Grid */}
        {loadingEpisodes ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 rounded-full border-2 border-slate-700 border-t-accent-blue animate-spin" />
          </div>
        ) : displayedEpisodes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar" data-lenis-prevent>
            {displayedEpisodes.map((ep) => {
              const isActive = ep.episode_number === currentEpisode;
              const upcoming = isUpcoming(ep);
              const progress = getEpisodeProgress(ep.episode_number);

              return (
                <div
                  key={ep.id}
                  onClick={() => {
                    if (upcoming) return;
                    onSelectEpisode(currentSeason, ep.episode_number);
                  }}
                  className={`group relative rounded-2xl p-2.5 transition-all duration-200 flex flex-col justify-between border ${
                    isActive
                      ? 'bg-slate-900 border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
                      : upcoming
                      ? 'bg-slate-950/40 border-slate-900 opacity-60 cursor-not-allowed'
                      : 'bg-[#07090e] hover:bg-slate-900 border-slate-800 hover:border-slate-750 cursor-pointer hover:-translate-y-0.5 shadow-sm'
                  }`}
                >
                  {/* Thumbnail Banner */}
                  <div className="w-full aspect-video rounded-xl bg-slate-950 overflow-hidden relative mb-2">
                    {ep.still_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                        alt={ep.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px] font-semibold">
                        Lumina
                      </div>
                    )}

                    {/* EP Pill Badge */}
                    <div className="absolute top-1.5 left-1.5 bg-black/75 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded-lg border border-white/10">
                      EP {ep.episode_number}
                    </div>

                    {/* Upcoming or Active Playing Badge */}
                    {upcoming ? (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black px-2 py-0.5 rounded-md">
                          Upcoming
                        </span>
                      </div>
                    ) : isActive ? (
                      <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
                          <Play className="w-3.5 h-3.5 fill-white text-white translate-x-0.5" />
                        </div>
                      </div>
                    ) : null}

                    {/* Episode Progress Bar */}
                    {progress > 0 && !upcoming && (
                      <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-950/80">
                        <div
                          className="h-full rounded-r-full"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: `#${accentColor}`,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Title & Metadata */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">
                      {ep.name || `Episode ${ep.episode_number}`}
                    </h4>

                    {ep.overview && (
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                        {ep.overview}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1 text-[9px] text-slate-500 font-medium">
                      {ep.air_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {ep.air_date}
                        </span>
                      )}
                      {ep.runtime ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {ep.runtime}m
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-xs font-semibold">
            {isSearching
              ? `No episodes found matching "${searchQuery}".`
              : activeArc
              ? `No episodes found for ${activeArc.name}.`
              : 'No episodes found for this season.'}
          </div>
        )}
      </div>
    </div>
  );
}
