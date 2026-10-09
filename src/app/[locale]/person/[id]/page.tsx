'use client';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader, Image as ImageIcon, Film, Tv, Star } from 'lucide-react';
import { ApiGateway } from '@/lib/api/gateway';
import { useState, useEffect, useMemo } from 'react';
import { PosterCard } from '@/components/cards/PosterCard';

import { isJapaneseAnime, classifyContent } from '@/lib/classification';

interface PersonDetails {
  id: number;
  name: string;
  biography?: string;
  profile_path?: string;
  birthday?: string;
  place_of_birth?: string;
  known_for_department?: string;
}

interface CreditItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  character?: string;
  media_type: 'movie' | 'tv';
  genre_ids?: number[];
  original_language?: string;
  origin_country?: string[];
}

function isAnime(item: CreditItem): boolean {
  return isJapaneseAnime(item);
}

// K-Drama: Korean TV
function isKDrama(item: CreditItem): boolean {
  return (
    item.media_type === 'tv' &&
    item.original_language === 'ko'
  );
}

type Tab = 'all' | 'movie' | 'tv' | 'anime' | 'kdrama';

const TABS: { id: Tab; label: string; icon: typeof Film }[] = [
  { id: 'all', label: 'All', icon: Star },
  { id: 'movie', label: 'Movies', icon: Film },
  { id: 'tv', label: 'TV Shows', icon: Tv },
  { id: 'anime', label: 'Anime', icon: Star },
  { id: 'kdrama', label: 'K-Drama', icon: Tv },
];

export default function PersonPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const locale = (params.locale as string) || 'en';

  const [person, setPerson] = useState<PersonDetails | null>(null);
  const [credits, setCredits] = useState<CreditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('all');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [personData, creditsData] = await Promise.all([
          ApiGateway.fetchTmdb<PersonDetails>(`/person/${id}`),
          ApiGateway.fetchTmdb<{ cast: CreditItem[] }>(`/person/${id}/combined_credits`),
        ]);
        setPerson(personData);

        // Deduplicate by id+media_type, sort by popularity/date descending
        const seen = new Set<string>();
        const deduped = (creditsData.cast || [])
          .filter((c) => {
            const key = `${c.media_type}:${c.id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return c.poster_path; // only items with a poster
          })
          .sort((a, b) => {
            const dateA = a.release_date || a.first_air_date || '0';
            const dateB = b.release_date || b.first_air_date || '0';
            return dateB.localeCompare(dateA); // newest first
          });

        setCredits(deduped);
      } catch (err) {
        console.error('Failed to load person', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const filtered = useMemo(() => {
    switch (activeTab) {
      case 'movie': return credits.filter((c) => c.media_type === 'movie');
      case 'tv': return credits.filter((c) => c.media_type === 'tv' && !isAnime(c) && !isKDrama(c));
      case 'anime': return credits.filter(isAnime);
      case 'kdrama': return credits.filter(isKDrama);
      default: return credits;
    }
  }, [credits, activeTab]);

  const tabCounts = useMemo(() => ({
    all: credits.length,
    movie: credits.filter((c) => c.media_type === 'movie').length,
    tv: credits.filter((c) => c.media_type === 'tv' && !isAnime(c) && !isKDrama(c)).length,
    anime: credits.filter(isAnime).length,
    kdrama: credits.filter(isKDrama).length,
  }), [credits]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-main)]">
        <Loader className="w-8 h-8 animate-spin text-accent-blue" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-main)] gap-4">
        <p className="text-slate-500 font-semibold">Person not found.</p>
        <button onClick={() => router.back()} className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-xl text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const year = person.birthday ? person.birthday.split('-')[0] : null;

  return (
    <div className="min-h-screen pb-24 bg-[var(--color-main)] text-slate-800 dark:text-slate-100">
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 space-y-8">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        {/* Person header */}
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Photo */}
          <div className="w-32 h-40 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 shadow-lg">
            {person.profile_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w300${person.profile_path}`}
                alt={person.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-2 flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              {person.name}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
              {person.known_for_department && <span>{person.known_for_department}</span>}
              {year && <span>Born {year}</span>}
              {person.place_of_birth && <span>{person.place_of_birth}</span>}
            </div>
            {person.biography && (
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-4 mt-2">
                {person.biography}
              </p>
            )}
            <p className="text-xs font-bold text-accent-blue">
              {credits.length} credits
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2">
          {TABS.map(({ id: tabId, label }) => {
            const count = tabCounts[tabId];
            if (count === 0 && tabId !== 'all') return null;
            return (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  activeTab === tabId
                    ? 'bg-accent-blue text-white border-transparent shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === tabId
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Credits grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map((item) => (
              <div key={`${item.media_type}:${item.id}`} className="space-y-1">
                <PosterCard
                  id={item.id}
                  title={item.title ?? item.name ?? ''}
                  posterPath={item.poster_path ?? ''}
                  rating={item.vote_average}
                  year={(item.release_date || item.first_air_date || '').slice(0, 4)}
                  type={isAnime(item) ? (item.media_type === 'movie' ? 'movie' : 'anime') : item.media_type === 'tv' ? 'tv' : 'movie'}
                  category={classifyContent(item)}
                />
                {item.character && (
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center truncate px-1">
                    as {item.character}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-slate-400 dark:text-slate-600">
            No {activeTab === 'all' ? '' : activeTab + ' '}credits found.
          </div>
        )}
      </div>
    </div>
  );
}
