'use client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Play, Bookmark, RefreshCw, Star, Loader, Image as ImageIcon, Download, Layers } from 'lucide-react';
import { ApiGateway } from '@/lib/api/gateway';
import { useState, useEffect, useMemo } from 'react';
import { PosterCard } from '@/components/cards/PosterCard';
import { isInWatchlist, toggleWatchlistItem } from '@/lib/watchlist';
import { DownloadModal } from '@/components/download/DownloadModal';
import { CastSection } from '@/components/cast/CastSection';
import { AudioBadges } from '@/components/audio/AudioBadges';
import { getContentAudioInfo } from '@/lib/audio';
import { getArcsForSeason, getCurrentArcForEpisode } from '@/lib/anime/arcs';

interface Genre { id: number; name: string; }
interface Network { name: string; }
interface Season { id: number; season_number: number; name?: string; }
interface Episode {
  id: number;
  episode_number: number;
  name: string;
  overview?: string;
  still_path?: string;
  air_date?: string;
}
interface CastMember { id: number; name: string; character: string; profile_path?: string; }

interface ShowData {
  id: number;
  name?: string;
  original_name?: string;
  original_language?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  first_air_date?: string;
  vote_average?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  episode_run_time?: number[];
  genres?: Genre[];
  networks?: Network[];
  seasons?: Season[];
}

interface CreditsData {
  cast?: CastMember[];
}

interface SeasonData {
  episodes?: Episode[];
}

interface RecommendationItem {
  id: number;
  name?: string;
  poster_path?: string;
  vote_average?: number;
  first_air_date?: string;
}

export default function TvShowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const locale = (params.locale as string) || 'en';
  const isAnime = searchParams.get('from') === 'anime';

  const [show, setShow] = useState<ShowData | null>(null);
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [downloadEpisode, setDownloadEpisode] = useState<{ season: number; episode: number } | null>(null);

  // Seasons and Episodes
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [seasonDetails, setSeasonDetails] = useState<SeasonData | null>(null);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [activeRangeIndex, setActiveRangeIndex] = useState(0);
  const [selectedArcId, setSelectedArcId] = useState<string>('all');
  const [prevSeason, setPrevSeason] = useState(selectedSeason);

  const seasonArcs = useMemo(() => getArcsForSeason(id, selectedSeason), [id, selectedSeason]);

  if (prevSeason !== selectedSeason) {
    setPrevSeason(selectedSeason);
    setActiveRangeIndex(0);
    setSelectedArcId('all');
  }

  // Track hovered section: 'left' | 'right' | null for dynamic column expansion
  const [hoveredSection, setHoveredSection] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      try {
        const media = await ApiGateway.getMediaDetails(id, 'tv');
        if (cancelled) return;

        if (!media || !media.data) {
          setShow(null);
          setLoading(false);
          return;
        }

        // Auto-heal if this ID is actually a movie
        if (media.resolvedType === 'movie') {
          router.replace(`/${locale}/movie/${id}${isAnime ? '?from=anime' : ''}`);
          return;
        }

        const showData = media.data;
        const [creditsData, recsData] = await Promise.all([
          ApiGateway.getTvCredits(id).catch(() => null),
          ApiGateway.getTvRecommendations(id).catch(() => ({ results: [] }))
        ]);

        if (cancelled) return;

        setShow(showData as unknown as ShowData);
        setCredits(creditsData as unknown as CreditsData | null);
        const recsRecord = recsData as unknown as { results?: RecommendationItem[] };
        setRecommendations(recsRecord.results || []);
        
        // Default to first season if available
        const showRecord = showData as unknown as ShowData;
        if (showRecord.seasons && Array.isArray(showRecord.seasons) && showRecord.seasons.length > 0) {
          const firstSeason = showRecord.seasons[0].season_number;
          setSelectedSeason(firstSeason);
        }
      } catch (err) {
        console.error('Failed to load TV show details', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [id, isAnime, locale, router]);

  // Load season details when selected season changes
  useEffect(() => {
    if (!show) return;
    async function loadSeason() {
      setLoadingEpisodes(true);
      try {
        const data = await ApiGateway.getTvSeasonDetails(id, selectedSeason);
        setSeasonDetails(data as unknown as SeasonData);
      } catch (e) {
        console.error('Failed to fetch season details', e);
      } finally {
        setLoadingEpisodes(false);
      }
    }
    loadSeason();
  }, [selectedSeason, show, id]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsBookmarked(isInWatchlist(id));
    }
  }, [id]);

  const toggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined') return;
    const added = toggleWatchlistItem(id, 'tv');
    setIsBookmarked(added);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-main)]">
        <Loader className="w-8 h-8 animate-spin text-accent-blue" />
      </div>
    );
  }

  if (!show) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-main)] p-8">
        <p className="text-slate-500 mb-4 font-semibold">TV Show details not found.</p>
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    );
  }

  const voteAverage = show.vote_average ? show.vote_average.toFixed(1) : 'N/A';
  const releaseYear = show.first_air_date ? show.first_air_date.split('-')[0] : 'N/A';

  // Compute dynamic column widths based on hovered section
  let leftColWidth = 'lg:w-[32%]';
  let rightColWidth = 'lg:w-[68%]';

  if (hoveredSection === 'left') {
    leftColWidth = 'lg:w-[45%]';
    rightColWidth = 'lg:w-[55%]';
  } else if (hoveredSection === 'right') {
    leftColWidth = 'lg:w-[22%]';
    rightColWidth = 'lg:w-[78%]';
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: show.name,
    description: show.overview,
    image: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : undefined,
    datePublished: show.first_air_date,
    numberOfSeasons: show.number_of_seasons,
    numberOfEpisodes: show.number_of_episodes,
    aggregateRating: show.vote_average ? {
      '@type': 'AggregateRating',
      ratingValue: show.vote_average,
      bestRating: 10,
      worstRating: 1,
      ratingCount: 100,
    } : undefined,
  };

  return (
    <div className="min-h-screen pb-24 bg-[#07090e] text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* ──────────────── CINEMA HERO BACKDROP ──────────────── */}
      <section className="relative w-full min-h-[480px] lg:min-h-[580px] bg-[#0b0f17] overflow-hidden border-b border-slate-800/80">
        {/* Full Backdrop Image */}
        {show.backdrop_path ? (
          <img 
            src={`https://image.tmdb.org/t/p/original${show.backdrop_path}`} 
            alt={show.name || ''}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-35"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-[#07090e]" />
        )}

        {/* Cinema Vignette Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/80 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-full md:w-2/3 bg-gradient-to-r from-[#07090e] via-[#07090e]/80 to-transparent" />

        {/* Header content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
          {/* Back button */}
          <button 
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition shadow-sm mb-6 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Hero Content: Poster + Main Info */}
          <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* Show Poster Card */}
            <div className="w-48 sm:w-56 md:w-64 lg:w-72 shrink-0 aspect-[2/3] rounded-2xl overflow-hidden bg-[#0b0f17] border border-slate-800 shadow-2xl shadow-black relative group">
              {show.poster_path ? (
                <img 
                  src={`https://image.tmdb.org/t/p/w500${show.poster_path}`} 
                  alt={show.name || ''}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-900 text-center">
                  <ImageIcon className="w-12 h-12 text-slate-700 mb-2" />
                  <span className="text-xs text-slate-400 font-bold">{show.name}</span>
                </div>
              )}
              
              {/* Rating Badge */}
              {show.vote_average !== undefined && show.vote_average > 0 && (
                <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md text-amber-400 text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1 border border-white/10 shadow-lg">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{voteAverage}</span>
                </div>
              )}
            </div>

            {/* Show Info & Actions */}
            <div className="flex-1 space-y-4">
              
              {/* Category & Quality Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-purple-600/20 border border-purple-500/40 text-purple-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md">
                  {isAnime ? 'ANIME SERIES' : 'TV SERIES'}
                </span>
                <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700">
                  HD / 4K
                </span>
                {show.original_language && (
                  <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border border-slate-700">
                    {show.original_language}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                {show.name}
              </h1>

              {/* Metadata Row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-300 font-semibold">
                <span>{releaseYear}</span>
                <span>•</span>
                <span>{show.number_of_seasons} {show.number_of_seasons === 1 ? 'Season' : 'Seasons'}</span>
                <span>•</span>
                <span>{show.number_of_episodes} Episodes</span>
                <span>•</span>
                <span>{show.genres ? show.genres.map((g) => g.name).join(', ') : 'Series'}</span>
              </div>

              {/* Real Audio Badges */}
              <div className="pt-1">
                <AudioBadges audioInfo={getContentAudioInfo({ id: show.id, type: isAnime ? 'anime' : 'tv', original_language: show.original_language })} />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap pt-2">
                <button 
                  onClick={() => router.push(`/${locale}/watch/${id}?s=1&e=1${isAnime ? '&type=anime' : ''}`)}
                  className="flex items-center gap-2.5 bg-blue-600 hover:bg-blue-500 text-white px-7 py-3.5 rounded-2xl text-sm font-extrabold transition-all shadow-xl shadow-blue-600/30 hover:scale-[1.02] cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white text-white" />
                  <span>{isAnime ? 'Watch Anime' : 'Watch S1E1'}</span>
                </button>
                
                <button
                  onClick={() => { setDownloadEpisode({ season: selectedSeason, episode: 1 }); setShowDownload(true); }}
                  className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white px-5 py-3.5 rounded-2xl text-sm font-bold border border-slate-700/80 transition cursor-pointer"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>

                <button 
                  onClick={toggleBookmark}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                    isBookmarked 
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' 
                      : 'bg-slate-800/90 hover:bg-slate-750 border-slate-700/80 text-slate-300 hover:text-white'
                  }`}
                  title={isBookmarked ? 'Remove from Watchlist' : 'Add to Watchlist'}
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-blue-400' : ''}`} />
                </button>

                <button 
                  onClick={() => router.refresh()}
                  className="p-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Refresh metadata"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Overview */}
              {show.overview && (
                <div className="pt-2">
                  <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-3xl">
                    {show.overview}
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* ──────────────── 3-TIER EPISODE BROWSER & DETAILS ──────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        
        {/* 3-Tier Episode Browser Box */}
        <section className="bg-[#0b0f17] border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          {/* Tier 1 Header: Season Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Episode Guide
              </h2>
            </div>

            {/* Season Selector Tabs/Dropdown */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Season:</span>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(parseInt(e.target.value, 10))}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-blue-500 transition shadow-sm cursor-pointer"
              >
                {show.seasons
                  ? show.seasons.map((s) => (
                    <option key={s.id} value={s.season_number}>
                      {show.seasons && show.seasons.length <= 1 ? 'Main Series' : (s.name || `Season ${s.season_number}`)}
                    </option>
                  ))
                  : null}
              </select>
            </div>
          </div>

          {/* Episode Content */}
          {loadingEpisodes ? (
            <div className="flex justify-center py-16">
              <Loader className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : seasonDetails?.episodes && seasonDetails.episodes.length > 0 ? (() => {
            const activeArc = selectedArcId !== 'all' ? seasonArcs.find(a => a.id === selectedArcId) : null;
            const allEpisodes = activeArc 
              ? seasonDetails.episodes.filter(ep => ep.episode_number >= activeArc.startEpisode && ep.episode_number <= activeArc.endEpisode)
              : seasonDetails.episodes;

            const EPISODES_PER_RANGE = 50;
            const totalRanges = Math.ceil(allEpisodes.length / EPISODES_PER_RANGE);
            const displayedEpisodes = totalRanges > 1
              ? allEpisodes.slice(activeRangeIndex * EPISODES_PER_RANGE, (activeRangeIndex + 1) * EPISODES_PER_RANGE)
              : allEpisodes;

            return (
              <div className="space-y-5">
                
                {/* Tier 2: Story Arc Selector Chips (Only when arcs exist) */}
                {seasonArcs.length > 0 && (
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

                    <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedArcId('all');
                          setActiveRangeIndex(0);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                          selectedArcId === 'all'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                        }`}
                      >
                        All Arcs ({seasonDetails.episodes.length})
                      </button>

                      {seasonArcs.map((arc) => {
                        const isArcActive = selectedArcId === arc.id;
                        return (
                          <button
                            key={arc.id}
                            type="button"
                            onClick={() => {
                              setSelectedArcId(arc.id);
                              setActiveRangeIndex(0);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                              isArcActive
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                            }`}
                            title={arc.name}
                          >
                            <span>{arc.shortName}</span>
                            <span className="text-[10px] opacity-75 font-normal">
                              ({arc.startEpisode}–{arc.endEpisode})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Range Pagination if >50 episodes */}
                {totalRanges > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800" style={{ scrollbarWidth: 'thin' }}>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Range:</span>
                    {Array.from({ length: totalRanges }, (_, idx) => {
                      const start = idx * EPISODES_PER_RANGE + 1;
                      const end = Math.min((idx + 1) * EPISODES_PER_RANGE, allEpisodes.length);
                      const isActive = idx === activeRangeIndex;
                      return (
                        <button
                          key={idx}
                          onClick={() => setActiveRangeIndex(idx)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                          }`}
                        >
                          {start} - {end}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Tier 3: Episodes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 max-h-[750px] overflow-y-auto pr-1">
                  {displayedEpisodes.map((ep) => {
                    const isUpcoming = ep.air_date ? new Date(ep.air_date) > new Date() : false;
                    const epArc = getCurrentArcForEpisode(id, selectedSeason, ep.episode_number);
                    return (
                      <div 
                        key={ep.id}
                        onClick={() => {
                          if (isUpcoming) return;
                          router.push(`/${locale}/watch/${id}?s=${selectedSeason}&e=${ep.episode_number}${isAnime ? '&type=anime' : ''}`);
                        }}
                        className={`group relative rounded-2xl p-3 bg-[#07090e] border border-slate-800 hover:border-slate-700 flex flex-col justify-between transition-all duration-200 ${
                          isUpcoming
                            ? 'opacity-60 cursor-not-allowed'
                            : 'cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-black/80'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="w-full aspect-video rounded-xl bg-slate-950 overflow-hidden relative mb-2.5">
                          {ep.still_path ? (
                            <img 
                              src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                              alt={ep.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-bold tracking-wider uppercase">
                              Lumina
                            </div>
                          )}

                          {/* Episode pill */}
                          <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded-lg border border-white/10">
                            EP {ep.episode_number}
                          </div>

                          {/* Play overlay on hover */}
                          {!isUpcoming && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                                <Play className="w-4 h-4 fill-white text-white translate-x-0.5" />
                              </div>
                            </div>
                          )}

                          {/* Arc badge */}
                          {epArc && (
                            <div className="absolute bottom-2 left-2 bg-blue-950/90 text-blue-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-800">
                              {epArc.shortName}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">
                            {ep.name || `Episode ${ep.episode_number}`}
                          </h4>

                          {ep.overview && (
                            <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                              {ep.overview}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-1.5 text-[10px] text-slate-500">
                            <span>{ep.air_date || ''}</span>
                            {!isUpcoming && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDownloadEpisode({ season: selectedSeason, episode: ep.episode_number });
                                  setShowDownload(true);
                                }}
                                className="p-1 text-slate-400 hover:text-white transition"
                                title="Download episode"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })() : (
            <p className="text-xs text-slate-400 py-6 text-center">No episodes found for this season.</p>
          )}
        </section>

        {/* Cast Members Section */}
        <CastSection credits={credits} />

        {/* Extended Show Specifications */}
        <div className="bg-[#0b0f17] border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <h3 className="text-xs font-black tracking-[0.2em] text-slate-400 uppercase select-none">
            Series Specifications
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider block">First Air Date</span>
              <span className="text-white font-medium text-sm">
                {show.first_air_date ? new Date(show.first_air_date).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider block">Networks</span>
              <span className="text-white font-medium text-sm truncate block" title={show.networks ? show.networks.map((n) => n.name).join(', ') : 'N/A'}>
                {show.networks && show.networks.length > 0 ? show.networks.map((n) => n.name).join(', ') : 'N/A'}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider block">Status</span>
              <span className="text-white font-medium text-sm">
                {show.status || 'N/A'}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider block">Episode Runtime</span>
              <span className="text-white font-medium text-sm">
                {show.episode_run_time && show.episode_run_time.length > 0 ? `${show.episode_run_time[0]}m` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Recommendations Grid */}
        <div className="space-y-4">
          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
            More Like This
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
            {recommendations.slice(0, 12).map((rec) => (
              <PosterCard
                key={rec.id}
                id={rec.id}
                title={rec.name ?? ''}
                posterPath={rec.poster_path ?? ''}
                rating={rec.vote_average}
                year={rec.first_air_date ? rec.first_air_date.split('-')[0] : ''}
                type="tv"
              />
            ))}
            {recommendations.length === 0 && (
              <p className="text-xs text-slate-500 col-span-full py-6 text-center">No recommendation matches found.</p>
            )}
          </div>
        </div>

      </div>

      {/* Download Modal */}
      {showDownload && downloadEpisode && (
        <DownloadModal
          id={id}
          title={show.name ?? `Show #${id}`}
          type="tv"
          season={downloadEpisode.season}
          episode={downloadEpisode.episode}
          onClose={() => { setShowDownload(false); setDownloadEpisode(null); }}
        />
      )}
    </div>
  );
}
