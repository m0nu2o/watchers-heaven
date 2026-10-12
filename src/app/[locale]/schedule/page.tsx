'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Clock,
  Search,
  Sparkles,
  Tv,
  Film,
  RefreshCw,
  Star,
  Play,
  Globe,
  ChevronRight,
} from 'lucide-react';

const DAYS_OF_WEEK = [
  'All Days',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

interface ScheduleItem {
  id: number;
  idMal?: number | null;
  title: string;
  image: string;
  banner?: string | null;
  episode?: number;
  season?: number;
  airingAt?: number;
  airDate?: string;
  timeUntilAiring?: number;
  format?: string;
  score?: string | null;
  studio?: string | null;
  overview?: string;
  category: 'anime' | 'kdrama' | 'tv';
  country?: string;
  href: string;
}

export default function SchedulePage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const [activeTab, setActiveTab] = useState<'anime' | 'kdrama' | 'tv'>('anime');
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('All Days');
  const [searchQuery, setSearchQuery] = useState('');
  const [userTimezone, setUserTimezone] = useState<string>('Local');
  const [todayName, setTodayName] = useState<string>('');
  const [nowTimestamp, setNowTimestamp] = useState<number>(Math.floor(Date.now() / 1000));

  // Detect user's timezone & current day of week on mount
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
      setUserTimezone(tz);
      const curDay = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
      setTodayName(curDay);
      setSelectedDay('All Days');
    } catch {
      setUserTimezone('Local');
      setTodayName('Monday');
      setSelectedDay('All Days');
    }
  }, []);

  // Update clock every 30s for live countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Math.floor(Date.now() / 1000));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch schedule whenever active tab changes
  const fetchSchedule = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/schedule?type=${activeTab}&limit=120`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.schedule)) {
        setScheduleData(data.schedule);
      } else {
        throw new Error(data.error || 'No schedule returned');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load schedule');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Convert air dates into user's local timezone & attach local weekday
  const processedItems = useMemo(() => {
    return scheduleData.map((item) => {
      let localWeekday = 'Unknown';
      let localTime = 'TBA';
      let localDateLabel = '';

      if (item.airingAt && item.airingAt > 0) {
        const dateObj = new Date(item.airingAt * 1000);
        try {
          const tzOption = userTimezone === 'Local' ? undefined : userTimezone;
          localWeekday = new Intl.DateTimeFormat('en-US', {
            timeZone: tzOption,
            weekday: 'long',
          }).format(dateObj);

          localTime = dateObj.toLocaleTimeString([], {
            timeZone: tzOption,
            hour: '2-digit',
            minute: '2-digit',
          });

          localDateLabel = dateObj.toLocaleDateString([], {
            timeZone: tzOption,
            month: 'short',
            day: 'numeric',
          });
        } catch {
          // fallback
        }
      }

      return {
        ...item,
        localWeekday,
        localTime,
        localDateLabel,
      };
    });
  }, [scheduleData, userTimezone]);

  // Filter by selected day and search query
  const filteredItems = useMemo(() => {
    return processedItems.filter((item) => {
      const matchDay = selectedDay === 'All Days' || item.localWeekday === selectedDay;
      const matchSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchDay && matchSearch;
    });
  }, [processedItems, selectedDay, searchQuery]);

  // Format countdown string for live airing ticker
  const formatCountdown = (airingAt?: number) => {
    if (!airingAt) return null;
    const diff = airingAt - nowTimestamp;
    if (diff <= 0) return 'Aired today';
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `In ${days}d ${hours % 24}h`;
    }
    if (hours > 0) return `In ${hours}h ${minutes}m`;
    return `In ${minutes}m`;
  };

  return (
    <div className="min-h-screen py-10 px-4 md:px-8 bg-[var(--color-main)] text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ── 1. Header Banner & Title ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-md shadow-blue-500/20">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-blue-400">
                Lumina Broadcast Radar
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Upcoming Release Calendar
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              Track live airing countdowns, weekly broadcast schedules, and episode premieres across Anime, K-Drama, and Series.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="apple-glass px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 text-xs text-slate-300">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-mono">{userTimezone}</span>
            </div>
            <button
              onClick={() => fetchSchedule()}
              disabled={isLoading}
              className="apple-glass p-2.5 rounded-xl border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition active:scale-95"
              title="Refresh Schedule"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── 2. Top Multi-Category Tab Selector ── */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'anime', label: '🎌 Anime Airing Schedule', badge: 'Live Countdowns' },
            { id: 'kdrama', label: '🇰🇷 K-Drama Releases', badge: 'Korean TV' },
            { id: 'tv', label: '📺 Global TV Series', badge: 'Western & Web Series' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedDay('All Days');
                }}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-500/80 shadow-lg shadow-blue-600/25 ring-1 ring-blue-400/40'
                    : 'apple-glass text-slate-400 hover:text-white border-white/[0.08] hover:border-white/20'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-black/20 text-blue-100' : 'bg-white/[0.06] text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── 3. Controls & Filter Deck (Days + Search Bar) ── */}
        <div className="apple-glass p-3 rounded-2xl border border-white/[0.08] shadow-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Day of Week Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 flex-1 min-w-0" data-lenis-prevent>
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = selectedDay === day;
              const isToday = todayName === day && day !== 'All Days';

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`relative px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <span>{day}</span>
                  {isToday && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 absolute top-1.5 right-1.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Title Search Input */}
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title..."
              className="w-full pl-9 pr-4 py-2 rounded-xl apple-glass text-xs text-white placeholder:text-slate-500 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        </div>

        {/* ── 4. Main Schedule Grid ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-sm font-semibold text-slate-400">Loading airing broadcast schedules...</p>
          </div>
        ) : error ? (
          <div className="apple-glass p-8 rounded-3xl border border-red-500/20 text-center max-w-md mx-auto space-y-3">
            <p className="text-sm text-red-400 font-semibold">{error}</p>
            <button
              onClick={() => fetchSchedule()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition"
            >
              Retry
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="apple-glass p-12 rounded-3xl border border-white/10 text-center max-w-lg mx-auto space-y-3">
            <CalendarIcon className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">No releases found</h3>
            <p className="text-xs text-slate-400">
              No shows are scheduled to broadcast on {selectedDay} matching your search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredItems.map((item) => {
              const countdownStr = activeTab === 'anime' ? formatCountdown(item.airingAt) : null;
              const isToday = item.localWeekday === todayName;

              return (
                <Link
                  key={`${item.id}-${item.airingAt || item.title}`}
                  href={`/${locale}${item.href}`}
                  className="group relative flex flex-col rounded-2xl apple-glass border border-white/[0.08] hover:border-blue-500/50 overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-600/10"
                >
                  {/* Poster Image Frame */}
                  <div className="relative aspect-[2/3] w-full bg-slate-900 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                      {item.episode !== undefined && (
                        <span className="px-2 py-0.5 rounded-lg bg-blue-600/90 text-white font-black text-[10px] shadow-md backdrop-blur-md">
                          EP {item.episode}
                        </span>
                      )}
                      {item.score && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-black/60 text-amber-300 text-[10px] font-bold backdrop-blur-md">
                          <Star className="w-2.5 h-2.5 fill-amber-300" />
                          {item.score}
                        </span>
                      )}
                    </div>

                    {/* Bottom Countdown or Time Tag */}
                    <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1">
                      {countdownStr && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/80 text-white font-bold text-[9px] w-fit backdrop-blur-md flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {countdownStr}
                        </span>
                      )}
                      {item.localTime && item.localTime !== 'TBA' && (
                        <span className="text-[10px] font-mono text-slate-300">
                          {item.localWeekday.slice(0, 3)} • {item.localTime}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Info Details */}
                  <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-xs text-white line-clamp-2 group-hover:text-blue-400 transition-colors">
                        {item.title}
                      </h3>
                      {item.studio && (
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{item.studio}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-[10px] text-slate-400">
                      <span className="capitalize">{item.format || 'Series'}</span>
                      <span className="flex items-center gap-0.5 text-blue-400 font-bold group-hover:translate-x-0.5 transition-transform">
                        <span>Watch</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
