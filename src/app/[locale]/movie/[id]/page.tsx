'use client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Play, Bookmark, RefreshCw, Star, Loader, Image as ImageIcon, Download } from 'lucide-react';
import { ApiGateway } from '@/lib/api/gateway';
import { useState, useEffect } from 'react';
import { PosterCard } from '@/components/cards/PosterCard';
import { isInWatchlist, toggleWatchlistItem } from '@/lib/watchlist';
import { DownloadModal } from '@/components/download/DownloadModal';
import { CastSection } from '@/components/cast/CastSection';
import { AudioBadges } from '@/components/audio/AudioBadges';
import { getContentAudioInfo } from '@/lib/audio';

interface Genre { id: number; name: string; }
interface Language { english_name: string; }
interface Country { name: string; }
interface Company { name: string; }
interface CastMember { id: number; name: string; character: string; profile_path?: string; }

interface MovieData {
  id: number;
  title?: string;
  original_title?: string;
  original_language?: string;
  overview?: string;
  tagline?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  runtime?: number;
  vote_average?: number;
  vote_count?: number;
  genres?: Genre[];
  spoken_languages?: Language[];
  production_countries?: Country[];
  production_companies?: Company[];
}

interface CreditsData {
  cast?: CastMember[];
}

interface RecommendationItem {
  id: number;
  title?: string;
  poster_path?: string;
  vote_average?: number;
  release_date?: string;
}

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const locale = (params.locale as string) || 'en';
  const isAnime = searchParams.get('from') === 'anime';

  const [movie, setMovie] = useState<MovieData | null>(null);
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  
  // Track hovered section: 'left' | 'right' | null for dynamic column expansion
  const [hoveredSection, setHoveredSection] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      try {
        const media = await ApiGateway.getMediaDetails(id, 'movie');
        if (cancelled) return;

        if (!media || !media.data) {
          setMovie(null);
          setLoading(false);
          return;
        }

        // Auto-heal if this ID is actually a TV show
        if (media.resolvedType === 'tv') {
          router.replace(`/${locale}/tv/${id}${isAnime ? '?from=anime' : ''}`);
          return;
        }

        const movieData = media.data;
        const [creditsData, recsData] = await Promise.all([
          ApiGateway.getMovieCredits(id).catch(() => null),
          ApiGateway.getMovieRecommendations(id).catch(() => ({ results: [] }))
        ]);

        if (cancelled) return;

        setMovie(movieData as unknown as MovieData);
        setCredits(creditsData as unknown as CreditsData | null);
        const recsRecord = recsData as unknown as { results?: RecommendationItem[] };
        setRecommendations(recsRecord.results || []);
      } catch (err) {
        console.error('Failed to load movie details', err);
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsBookmarked(isInWatchlist(id));
    }
  }, [id]);

  const toggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined') return;
    const added = toggleWatchlistItem(id, 'movie');
    setIsBookmarked(added);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-main)]">
        <Loader className="w-8 h-8 animate-spin text-accent-blue" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-main)] p-8">
        <p className="text-slate-500 mb-4 font-semibold">Movie details not found.</p>
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

  const voteAverage = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
  const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
  const runtimeHours = movie.runtime ? Math.floor(movie.runtime / 60) : 0;
  const runtimeMins = movie.runtime ? movie.runtime % 60 : 0;

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
    '@type': 'Movie',
    name: movie.title,
    description: movie.overview,
    image: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
    datePublished: movie.release_date,
    aggregateRating: movie.vote_average ? {
      '@type': 'AggregateRating',
      ratingValue: movie.vote_average,
      bestRating: 10,
      worstRating: 1,
      ratingCount: movie.vote_count || 100,
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
        {movie.backdrop_path ? (
          <img 
            src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`} 
            alt={movie.title || ''}
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
            
            {/* Movie Poster Card */}
            <div className="w-48 sm:w-56 md:w-64 lg:w-72 shrink-0 aspect-[2/3] rounded-2xl overflow-hidden bg-[#0b0f17] border border-slate-800 shadow-2xl shadow-black relative group">
              {movie.poster_path ? (
                <img 
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
                  alt={movie.title || ''}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-900 text-center">
                  <ImageIcon className="w-12 h-12 text-slate-700 mb-2" />
                  <span className="text-xs text-slate-400 font-bold">{movie.title}</span>
                </div>
              )}
              
              {/* Rating Badge */}
              {movie.vote_average !== undefined && movie.vote_average > 0 && (
                <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md text-amber-400 text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1 border border-white/10 shadow-lg">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{voteAverage}</span>
                </div>
              )}
            </div>

            {/* Movie Info & Actions */}
            <div className="flex-1 space-y-4">
              
              {/* Category & Quality Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-blue-600/20 border border-blue-500/40 text-blue-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md">
                  FEATURE FILM
                </span>
                <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700">
                  4K ULTRA HD
                </span>
                {movie.original_language && (
                  <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border border-slate-700">
                    {movie.original_language}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                {movie.title}
              </h1>

              {/* Tagline */}
              {movie.tagline && (
                <p className="text-sm md:text-base text-slate-400 italic font-medium">
                  &ldquo;{movie.tagline}&rdquo;
                </p>
              )}

              {/* Metadata Row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-300 font-semibold">
                <span>{releaseYear}</span>
                <span>•</span>
                <span>{movie.runtime ? `${runtimeHours}h ${runtimeMins}m` : 'Feature Length'}</span>
                <span>•</span>
                <span>{movie.genres ? movie.genres.map((g) => g.name).join(', ') : 'Cinema'}</span>
              </div>

              {/* Real Audio Badges */}
              <div className="pt-1">
                <AudioBadges audioInfo={getContentAudioInfo({ id: movie.id, type: isAnime ? 'anime' : 'movie', original_language: movie.original_language })} />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap pt-2">
                <button 
                  onClick={() => router.push(`/${locale}/watch/${id}${isAnime ? '?type=anime' : ''}`)}
                  className="flex items-center gap-2.5 bg-blue-600 hover:bg-blue-500 text-white px-7 py-3.5 rounded-2xl text-sm font-extrabold transition-all shadow-xl shadow-blue-600/30 hover:scale-[1.02] cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white text-white" />
                  <span>Watch Now</span>
                </button>
                
                <button 
                  onClick={() => setShowDownload(true)}
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
              {movie.overview && (
                <div className="pt-2">
                  <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-3xl">
                    {movie.overview}
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* ──────────────── DETAILS, CAST & RECOMMENDATIONS ──────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        
        {/* Cast Members Section */}
        <CastSection credits={credits} />

        {/* Extended Production & Metadata Details */}
        <div className="bg-[#0b0f17] border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <h3 className="text-xs font-black tracking-[0.2em] text-slate-400 uppercase select-none">
            Movie Specifications
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider block">Release Date</span>
              <span className="text-white font-medium text-sm">
                {movie.release_date ? new Date(movie.release_date).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider block">Spoken Languages</span>
              <span className="text-white font-medium text-sm">
                {movie.spoken_languages && movie.spoken_languages.length > 0 
                  ? movie.spoken_languages.map((l) => l.english_name).join(', ') 
                  : 'N/A'}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider block">Production Countries</span>
              <span className="text-white font-medium text-sm">
                {movie.production_countries && movie.production_countries.length > 0 
                  ? movie.production_countries.map((c) => c.name).join(', ') 
                  : 'N/A'}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider block">Studios & Companies</span>
              <span className="text-white font-medium text-sm">
                {movie.production_companies && movie.production_companies.length > 0 
                  ? movie.production_companies.slice(0, 2).map((c) => c.name).join(', ') 
                  : 'N/A'}
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
                title={rec.title ?? ''}
                posterPath={rec.poster_path ?? ''}
                rating={rec.vote_average}
                year={rec.release_date ? rec.release_date.split('-')[0] : ''}
                type="movie"
              />
            ))}
            {recommendations.length === 0 && (
              <p className="text-xs text-slate-500 col-span-full py-6 text-center">No recommendation matches found.</p>
            )}
          </div>
        </div>

      </div>

      {/* Download Modal */}
      {showDownload && (
        <DownloadModal
          id={id}
          title={movie.title ?? `Movie #${id}`}
          type="movie"
          onClose={() => setShowDownload(false)}
        />
      )}
    </div>
  );
}
