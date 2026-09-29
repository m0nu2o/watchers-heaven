'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Tv,
  Sparkles,
  Star,
  Play,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { ApiGateway } from '@/lib/api/gateway';

interface ScheduleItem {
  id: number;
  title: string;
  posterPath?: string;
  coverImage?: string;
  rating?: number;
  type: 'tv' | 'anime';
  statusBadge: string;
  airDateLabel: string;
  airTimestamp?: number;
  nextEpisodeNum?: number;
  overview?: string;
}

export default function SchedulePage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || 'en';

  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'anime'>('today');
  const [typeFilter, setTypeFilter] = useState<'all' | 'tv' | 'anime'>('all');
  const [loading, setLoading] = useState(true);

  // Raw data from TMDB and AniList
  const [todayTv, setTodayTv] = useState<ScheduleItem[]>([]);
  const [weekTv, setWeekTv] = useState<ScheduleItem[]>([]);
  const [airingAnime, setAiringAnime] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadSchedule() {
      setLoading(true);
      try {
        const [todayRes, weekRes, animeRes] = await Promise.allSettled([
          ApiGateway.getTvAiringToday(1),
          ApiGateway.getTvOnTheAir(1),
          ApiGateway.getAiringAnime(1, 30),
        ]);

        if (!isMounted) return;

        // Process TMDB Airing Today
        if (todayRes.status === 'fulfilled' && todayRes.value?.results) {
          const items: ScheduleItem[] = todayRes.value.results.map((show) => {
            const isAnimeShow =
              show.origin_country?.includes('JP') ||
              show.original_language === 'ja';
            return {
              id: show.id,
              title: show.name || show.original_name || `Show #${show.id}`,
              posterPath: show.poster_path,
              rating: show.vote_average,
              type: isAnimeShow ? 'anime' : 'tv',
              statusBadge: 'Airing Today',
              airDateLabel: 'Today',
              overview: show.overview,
            };
          });
          setTodayTv(items);
        }

        // Process TMDB On The Air (This Week)
        if (weekRes.status === 'fulfilled' && weekRes.value?.results) {
          const items: ScheduleItem[] = weekRes.value.results.map((show) => {
            const isAnimeShow =
              show.origin_country?.includes('JP') ||
              show.original_language === 'ja';
            return {
              id: show.id,
              title: show.name || show.original_name || `Show #${show.id}`,
              posterPath: show.poster_path,
              rating: show.vote_average,
              type: isAnimeShow ? 'anime' : 'tv',
              statusBadge: 'New Episode',
              airDateLabel: 'This Week',
              overview: show.overview,
            };
          });
          setWeekTv(items);
        }

        // Process AniList Releasing Anime
        if (animeRes.status === 'fulfilled' && animeRes.value) {
          const items: ScheduleItem[] = animeRes.value.map((anime) => {
            const title =
              anime.title.english ||
              anime.title.romaji ||
              `Anime #${anime.id}`;
            const ep = anime.nextAiringEpisode?.episode;
            const airTime = anime.nextAiringEpisode?.airingAt;

            let dateLabel = 'Upcoming';
            if (airTime) {
              const diffMs = airTime * 1000 - Date.now();
              const diffHours = Math.round(diffMs / (1000 * 60 * 60));
              const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

              if (diffHours <= 24 && diffHours > 0) {
                dateLabel = `In ${diffHours} hours`;
              } else if (diffDays === 1) {
                dateLabel = 'Tomorrow';
              } else if (diffDays > 1) {
                dateLabel = `In ${diffDays} days`;
              } else {
                dateLabel = 'Airing Soon';
              }
            }

            return {
              id: anime.id,
              title,
              coverImage: anime.coverImage?.large,
              rating: anime.averageScore ? anime.averageScore / 10 : undefined,
              type: 'anime',
              statusBadge: ep ? `Episode ${ep}` : 'Releasing',
              airDateLabel: dateLabel,
              airTimestamp: airTime,
              nextEpisodeNum: ep,
            };
          });
          setAiringAnime(items);
        }
      } catch (err) {
        console.error('Failed to load schedule:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSchedule();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter items based on active tab and type filter
  const displayedItems = useMemo(() => {
    let list: ScheduleItem[] = [];
    if (activeTab === 'today') list = todayTv;
    else if (activeTab === 'week') list = weekTv;
    else if (activeTab === 'anime') list = airingAnime;

    if (typeFilter !== 'all') {
      list = list.filter((item) => item.type === typeFilter);
    }
    return list;
  }, [activeTab, typeFilter, todayTv, weekTv, airingAnime]);

  const handleCardClick = (item: ScheduleItem) => {
    if (item.type === 'anime') {
      router.push(`/${locale}/tv/${item.id}?from=anime`);
    } else {
      router.push(`/${locale}/tv/${item.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans">
      {/* Header Banner */}
      <div className="relative border-b border-slate-800/80 bg-gradient-to-b from-[#0b0f17] via-[#07090e] to-[#07090e] px-4 sm:px-8 pt-10 pb-8 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" />
            <span>Release Schedule</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Broadcast & Airing Calendar
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
            Live release schedules for ongoing television series and currently airing anime. 
            All air dates and episode numbers are verified upstream.
          </p>

          {/* Navigation Tabs & Filter Bar */}
          <div className="pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Primary Time Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[#0b0f17] border border-slate-800/80 rounded-2xl w-max">
              <button
                onClick={() => setActiveTab('today')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'today'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Airing Today</span>
                {todayTv.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20">
                    {todayTv.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('week')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'week'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>This Week</span>
                {weekTv.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20">
                    {weekTv.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('anime')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'anime'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Airing Anime</span>
                {airingAnime.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20">
                    {airingAnime.length}
                  </span>
                )}
              </button>
            </div>

            {/* Media Type Filter Chips */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold hidden sm:inline">Filter:</span>
              <div className="flex items-center gap-1.5 p-1 bg-[#0b0f17] border border-slate-800/80 rounded-xl">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    typeFilter === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setTypeFilter('tv')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    typeFilter === 'tv'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Series
                </button>
                <button
                  onClick={() => setTypeFilter('anime')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    typeFilter === 'anime'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Anime
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 flex-1">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div
                key={idx}
                className="aspect-[2/3] rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <Layers className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">No Broadcasts Found</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                No items match the current tab and filter criteria. Try selecting another filter or tab.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {displayedItems.map((item) => {
              const poster = item.coverImage
                ? item.coverImage
                : item.posterPath
                ? `https://image.tmdb.org/t/p/w342${item.posterPath}`
                : null;

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleCardClick(item)}
                  className="group relative flex flex-col bg-[#0b0f17] border border-slate-800/80 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer"
                >
                  {/* Poster image container */}
                  <div className="relative aspect-[2/3] w-full bg-slate-900 overflow-hidden">
                    {poster ? (
                      <img
                        src={poster}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-[#07090e] p-4 text-center">
                        <Tv className="w-8 h-8 text-slate-700 mb-2" />
                      </div>
                    )}

                    {/* Top Badges */}
                    <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none z-10">
                      {/* Rating */}
                      {item.rating !== undefined && item.rating > 0 ? (
                        <div className="flex items-center gap-1 bg-black/75 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded-lg border border-white/10 shadow-md">
                          <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                          <span className="text-amber-300">{item.rating.toFixed(1)}</span>
                        </div>
                      ) : <div />}

                      {/* Type Badge */}
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded shadow-md uppercase tracking-wider backdrop-blur-md border border-white/10 ${
                          item.type === 'anime'
                            ? 'bg-blue-600/80 text-white'
                            : 'bg-indigo-600/80 text-white'
                        }`}
                      >
                        {item.type === 'anime' ? 'ANIME' : 'SERIES'}
                      </span>
                    </div>

                    {/* Bottom air schedule badge overlay */}
                    <div className="absolute bottom-2 inset-x-2 flex items-center justify-between pointer-events-none z-10">
                      <span className="bg-emerald-500/90 text-black text-[9px] font-black px-2 py-0.5 rounded-md shadow-md backdrop-blur-sm">
                        {item.airDateLabel}
                      </span>
                      <span className="bg-black/80 text-slate-200 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-white/10">
                        {item.statusBadge}
                      </span>
                    </div>

                    {/* Hover cinema overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
                      <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Card metadata footer */}
                  <div className="p-3 flex flex-col justify-between flex-1 bg-[#0b0f17]">
                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">
                        {item.title}
                      </h4>
                      {item.overview && (
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {item.overview}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mt-2.5 pt-2 border-t border-slate-800/60">
                      <span className="text-slate-400">{item.statusBadge}</span>
                      <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center">
                        Details <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

