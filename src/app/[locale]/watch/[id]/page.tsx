'use client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Play,
  RefreshCw,
  SkipForward,
  ArrowLeftCircle,
  RotateCcw,
  RotateCw,
  FastForward,
  ShieldCheck,
  X,
  Download,
  Users,
  Volume2,
  AlertTriangle,
} from 'lucide-react';
import { ApiGateway } from '@/lib/api/gateway';
import { ProviderRegistry, ProviderTelemetry } from '@/lib/providers';
import { UniversalPlayer } from '@/components/player/universal';
import { LuminaServerDeck } from '@/components/player/universal/LuminaServerDeck';
import { UniversalPlayerEngine } from '@/lib/player/engine';
import type { NormalizedPlaybackSource, PlayerAudioTrack } from '@/lib/player/types';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DownloadModal } from '@/components/download/DownloadModal';
import { supabase } from '@/lib/supabase/client';
import { EpisodeNavigator, EpisodeItem, SeasonSummary } from '@/components/player/EpisodeNavigator';
import { AudioBadges } from '@/components/audio/AudioBadges';
import { PosterCard } from '@/components/cards/PosterCard';
import {
  getContentAudioInfo,
  ContentAudioInfo,
  getEpisodeAudioTracks,
  AudioAvailabilityCache,
  EpisodeAudioAvailability,
} from '@/lib/audio';
import { getCurrentArcForEpisode } from '@/lib/anime/arcs';

import type { MediaType, SubtitleTrack, SkipTimestamps } from '@/types/media';
import {
  classifyContent,
  resolveFormat,
  isJapaneseAnime,
  getPlaybackMediaType,
  getCategoryBadge,
  type ClassifiableMedia,
  type ContentCategory,
} from '@/lib/classification';

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const locale = (params.locale as string) || 'en';

  // Get season and episode if they exist in query params (e.g. for TV shows)
  const seasonParam = searchParams.get('s') ? parseInt(searchParams.get('s')!, 10) : undefined;
  const episodeParam = searchParams.get('e') ? parseInt(searchParams.get('e')!, 10) : undefined;
  const isTv = seasonParam !== undefined || episodeParam !== undefined;
  const isAnime = searchParams.get('type') === 'anime';

  const season = seasonParam ?? (isTv || isAnime ? 1 : undefined);
  const episode = episodeParam ?? (isTv || isAnime ? 1 : undefined);

  const contentType: MediaType = isAnime ? 'anime' : isTv ? 'tv' : 'movie';
  const defaultProvider = ProviderRegistry.getDefault(contentType).id;

  const [provider, setProvider] = useState<string>(defaultProvider);
  const [resolvedContentType, setResolvedContentType] = useState<MediaType>(contentType);
  const [isActuallyTv, setIsActuallyTv] = useState<boolean>(isTv || isAnime);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [savedProgress, setSavedProgress] = useState<number>(0);
  const savedProgressRef = useRef(savedProgress);
  savedProgressRef.current = savedProgress;
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [initialProgressApplied, setInitialProgressApplied] = useState(false);
  const [accentColor, setAccentColor] = useState<string>('007bff');
  const [isCreatingParty, setIsCreatingParty] = useState(false);

  const [mediaTitle, setMediaTitle] = useState<string>('');
  const [imdbId, setImdbId] = useState<string | null>(() => ApiGateway.getCachedImdbId(id) || null);
  const [mediaOriginalLang, setMediaOriginalLang] = useState<string>(isAnime ? 'ja' : 'en');
  const isActuallyAnime = resolvedContentType === 'anime';
  const currentMediaType: MediaType = isActuallyAnime ? 'anime' : isActuallyTv ? 'tv' : 'movie';
  const [audioInfo, setAudioInfo] = useState<ContentAudioInfo | null>(null);
  const [audioAvailability, setAudioAvailability] = useState<EpisodeAudioAvailability | null>(() => {
    try {
      return getEpisodeAudioTracks({
        mediaId: id,
        mediaType: isAnime ? 'anime' : isTv ? 'tv' : 'movie',
        season: season || 1,
        episode: episode || 1,
        originalLanguage: isAnime ? 'ja' : 'en',
      });
    } catch {
      return null;
    }
  });
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<string>(() => {
    const trackParam = searchParams.get('track');
    if (trackParam === 'dub' || trackParam === 'dub-en') return 'dub-en';
    if (trackParam === 'dub-hi' || trackParam === 'hindi') return 'dub-hi';
    if (trackParam === 'sub' || trackParam === 'original') return 'sub';
    return AudioAvailabilityCache.getPreferredLanguage();
  });
  const [audioError, setAudioError] = useState<string | null>(null);
  const [showAudioMenu, setShowAudioMenu] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<Array<{ id: number; title?: string; name?: string; poster_path?: string; vote_average?: number; release_date?: string; first_air_date?: string }>>([]);

  // Canonical Story Arc for current episode
  const currentArc = useMemo(() => {
    if (isActuallyTv) {
      return getCurrentArcForEpisode(id, season || 1, episode || 1);
    }
    return null;
  }, [id, season, episode, isActuallyTv]);

  // Auto-next episode state (Phase 13)
  const [autoNextEnabled, setAutoNextEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('watch-auto-next');
      if (stored !== null) {
        const val = stored === 'true';
        queueMicrotask(() => setAutoNextEnabled(val));
      }
    }
  }, []);

  const handleToggleAutoNext = (enabled: boolean) => {
    setAutoNextEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('watch-auto-next', String(enabled));
    }
  };

  // Auto server-switching toggle — defaults ON, persists across sessions
  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lumina-auto-switch');
      if (stored !== null) {
        queueMicrotask(() => setAutoSwitchEnabled(stored !== 'false'));
      }
    }
  }, []);

  const handleToggleAutoSwitch = () => {
    const next = !autoSwitchEnabled;
    setAutoSwitchEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lumina-auto-switch', String(next));
    }
    // Cancel any pending watchdog when user turns it off
    if (!next && watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  };

  // Seasons and episodes state
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isDirectHls, setIsDirectHls] = useState<boolean>(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [skipTimestamps, setSkipTimestamps] = useState<SkipTimestamps | null>(null);

  // AniList & MAL IDs — kept strictly separate per Rule 4
  const [aniListId, setAniListId] = useState<number | null>(null);
  const [malId, setMalId] = useState<number | null>(null);

  // Apple Cinema HUD Seek Feedback Toast
  const [seekFeedback, setSeekFeedback] = useState<string | null>(null);
  const seekFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSeekFeedback = useCallback((msg: string) => {
    if (seekFeedbackTimerRef.current) {
      clearTimeout(seekFeedbackTimerRef.current);
    }
    setSeekFeedback(msg);
    seekFeedbackTimerRef.current = setTimeout(() => {
      setSeekFeedback(null);
    }, 1200);
  }, []);

  // Fetch Media Details (Title, Seasons, Audio)
  useEffect(() => {
    async function loadMediaDetails() {
      try {
        const preferredType: 'movie' | 'tv' | 'anime' = isAnime ? 'anime' : isTv ? 'tv' : 'movie';
        const media = await ApiGateway.getMediaDetails(id, preferredType);

        if (!media || !media.data) {
          console.warn(`Media ${id} details could not be loaded from TMDB`);
          return;
        }

        const data = media.data;
        const isTvResult = media.resolvedType === 'tv';
        const origLang = (data.original_language as string) || (isAnime ? 'ja' : 'en');
        setMediaOriginalLang(origLang);

        const classifiable: ClassifiableMedia = {
          id,
          media_type: isTvResult ? 'tv' : 'movie',
          genres: data.genres as Array<{ id: number }> | undefined,
          original_language: origLang,
          origin_country: data.origin_country as string[] | undefined,
          production_countries: data.production_countries as Array<{ iso_3166_1?: string }> | undefined,
        };

        const category = classifyContent(classifiable);
        const isDetectedAnimeSeries = category === 'anime' || category === 'donghua';
        const isDetectedAnimeMovie = category === 'anime-movie';
        const isDetectedAnime = isDetectedAnimeSeries || isDetectedAnimeMovie;
        const isDetectedTv = isTvResult && !isDetectedAnimeMovie;

        setIsActuallyTv(isDetectedTv);
        setResolvedContentType(isDetectedAnimeSeries ? 'anime' : isDetectedTv ? 'tv' : 'movie');

        const title =
          (data.name as string) ||
          (data.title as string) ||
          (data.original_name as string) ||
          (data.original_title as string) ||
          (isDetectedAnime ? `Anime #${id}` : isDetectedTv ? `Show #${id}` : `Movie #${id}`);
        setMediaTitle(title);

        const directImdb = (data.imdb_id as string) || null;
        if (directImdb) {
          setImdbId(directImdb);
          ApiGateway.setCachedImdbId(id, directImdb);
        } else {
          ApiGateway.getImdbId(id, isTvResult ? 'tv' : 'movie')
            .then((resolved) => {
              if (resolved) {
                setImdbId(resolved);
                ApiGateway.setCachedImdbId(id, resolved);
              }
            })
            .catch(() => {});
        }

        if (isDetectedTv) {
          const rawSeasons = (data.seasons as SeasonSummary[]) || [];
          const validSeasons = rawSeasons.filter((s) => (s.episode_count ?? 1) > 0);
          setSeasons(
            validSeasons.length > 0
              ? validSeasons
              : [{ id: 1, season_number: 1, name: 'Season 1', episode_count: 1 }]
          );
        } else {
          setSeasons([]);
        }

        const audio = getContentAudioInfo({
          id,
          type: isDetectedAnime ? 'anime' : isTvResult ? 'tv' : 'movie',
          original_language: origLang,
          provider,
        });
        setAudioInfo(audio);

        // AniList title & dub resolution for anime
        if (isDetectedAnime) {
          try {
            const aniDetails = await ApiGateway.getAniListMediaDetails(title);
            if (aniDetails) {
              setAniListId(aniDetails.id);
              setMalId(aniDetails.malId ?? null);
              AudioAvailabilityCache.setKnownDubLanguages(aniDetails.id, aniDetails.spokenLanguages);
              AudioAvailabilityCache.setKnownDubLanguages(id, aniDetails.spokenLanguages);
            } else {
              setAniListId(-1);
              setMalId(null);
            }
          } catch {
            setAniListId(-1);
            setMalId(null);
          }
        }

        if (isTvResult) {
          ApiGateway.getTvRecommendations(id)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then((r: any) => {
              if (r?.results) setRecommendations(r.results.slice(0, 10));
            })
            .catch(() => {});
        } else {
          ApiGateway.getMovieRecommendations(id)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then((r: any) => {
              if (r?.results) setRecommendations(r.results.slice(0, 10));
            })
            .catch(() => {});
        }
      } catch (err) {
        console.warn('Failed to load media details for watch page:', err);
      }
    }

    loadMediaDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isTv, isAnime]);

  // Sync Episode Audio Availability whenever episode, season, or language metadata updates
  useEffect(() => {
    let isMounted = true;
    const mediaType = isActuallyAnime ? 'anime' : isActuallyTv ? 'tv' : 'movie';

    // 1. Synchronous preliminary check from cache / verified catalog
    const initialAvail = getEpisodeAudioTracks({
      mediaId: id,
      mediaType,
      season,
      episode,
      originalLanguage: mediaOriginalLang,
      title: mediaTitle,
      aniListId,
      malId,
    });
    setAudioAvailability(initialAvail);

    // 2. Fetch authoritative verified tracks from API / AniList
    const qParams = new URLSearchParams({
      type: mediaType,
      s: String(season || 1),
      e: String(episode || 1),
      origLang: mediaOriginalLang,
    });
    if (mediaTitle) qParams.set('title', mediaTitle);
    if (aniListId && aniListId > 0) qParams.set('aniListId', String(aniListId));
    qParams.set('_t', String(Date.now()));

    fetch(`/api/watch/${id}/languages?${qParams.toString()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data || !data.tracks) return;
        setAudioAvailability(data);
        // If current selected track is unavailable on this content, auto-revert to sub
        const current = data.tracks.find((t: { id: string; available?: boolean }) => t.id === selectedAudioTrack);
        if (current && current.available === false) {
          setSelectedAudioTrack('sub');
        }
      })
      .catch((err) => {
        console.warn('Could not fetch dynamic audio tracks:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [id, season, episode, isActuallyTv, isActuallyAnime, mediaOriginalLang, mediaTitle, aniListId, malId, selectedAudioTrack]);

  // Fetch Season Episodes when season changes
  useEffect(() => {
    if (!isActuallyTv) {
      setEpisodes([]);
      return;
    }
    const targetSeason = season || 1;

    async function loadEpisodes() {
      setLoadingEpisodes(true);
      try {
        const seasonData = (await ApiGateway.getTvSeasonDetails(id, targetSeason)) as {
          episodes?: EpisodeItem[];
        };
        setEpisodes(seasonData.episodes || []);
      } catch (err) {
        console.warn('Failed to fetch season episodes:', err);
        setEpisodes([]);
      } finally {
        setLoadingEpisodes(false);
      }
    }

    loadEpisodes();
  }, [id, season, isActuallyTv]);

  const handleCreateParty = async () => {
    setIsCreatingParty(true);
    try {
      let guestId = typeof window !== 'undefined' ? localStorage.getItem('lumina-guest-id') : null;
      if (!guestId) {
        guestId = crypto.randomUUID();
        if (typeof window !== 'undefined') localStorage.setItem('lumina-guest-id', guestId);
      }

      let {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        try {
          const { data } = await supabase.auth.signInAnonymously();
          if (data?.session) session = data.session;
        } catch {
          // Supabase anonymous sign-in disabled; proceed with guestUserId
        }
      }

      const partyTitle = isActuallyTv
        ? `${mediaTitle || `Show #${id}`} (S${season}E${episode})`
        : `${mediaTitle || `Movie #${id}`}`;

      const res = await fetch('/api/party', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          movieId: id,
          movieTitle: partyTitle,
          mediaType: isActuallyTv ? 'tv' : 'movie',
          season,
          episode,
          provider,
          guestUserId: session?.user?.id || guestId,
        }),
      });

      if (!res.ok) throw new Error('Failed to create party');
      const data = await res.json();
      router.push(`/${locale}/party/${data.roomCode}`);
    } catch (err) {
      console.error('Watch party creation error:', err);
      alert('Failed to create Watch Party. Please try again.');
      setIsCreatingParty(false);
    }
  };

  // Next episode auto-play state
  const [showNextEpisodePopup, setShowNextEpisodePopup] = useState(false);
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState(15);
  const nextEpisodeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredNextRef = useRef(false);

  // Generate storage key — tracks progress per media item and provider
  const storageKey = `watch-progress:${id}:${season || 0}:${episode || 0}:${provider}`;

  // ── Async playback source resolution ──
  // Always use the server-side async resolver so the player URL is based on
  // the same authoritative episode-level audio availability as the API.
  const [embedUrl, setEmbedUrl] = useState<string | null>(() => {
    try {
      const mediaType = isAnime ? 'anime' : isTv ? 'tv' : 'movie';
      return ProviderRegistry.resolvePlaybackUrl(defaultProvider, {
        mediaType,
        tmdbId: id,
        imdbId: ApiGateway.getCachedImdbId(id) || undefined,
        season,
        episode,
        audioTrackId: 'sub',
      });
    } catch {
      return null;
    }
  });
  const [isResolvingSource, setIsResolvingSource] = useState(false);

  const resolveCurrentSource = useCallback(
    async (trackId: string = selectedAudioTrack, overrideProvider?: string) => {
      const mediaType = isActuallyAnime ? 'anime' : isActuallyTv ? 'tv' : 'movie';
      const startProgress = initialProgressApplied ? (savedProgressRef.current ?? 0) : 0;
      const activeProvider = overrideProvider || provider;

      try {
        setIsResolvingSource(true);
        setAudioError(null);

        const effectiveImdb = imdbId || ApiGateway.getCachedImdbId(id) || undefined;
        const qParams = new URLSearchParams({
          type: mediaType,
          track: trackId,
          ...(effectiveImdb ? { imdbId: effectiveImdb } : {}),
          ...(season !== undefined ? { s: String(season) } : {}),
          ...(episode !== undefined ? { e: String(episode) } : {}),
          ...(aniListId && aniListId > 0 ? { aniListId: String(aniListId) } : {}),
          ...(malId && malId > 0 ? { malId: String(malId) } : {}),
          ...(mediaOriginalLang ? { origLang: mediaOriginalLang } : {}),
          ...(mediaTitle ? { title: mediaTitle } : {}),
          ...(activeProvider ? { provider: activeProvider } : {}),
          ...(startProgress > 0 ? { startTime: String(startProgress) } : {}),
          ...(accentColor ? { accentColor } : {}),
        });

        const response = await fetch(`/api/watch/${id}/source?${qParams.toString()}`, {
          cache: 'no-store',
        });

        const result = await response.json();

        if (!response.ok || !result.success || !result.url) {
          throw new Error(
            result.error || `Unable to resolve ${trackId} for this episode.`
          );
        }

        return result as {
          success: boolean;
          available: boolean;
          provider?: string;
          url?: string;
          track?: { id: string; label: string };
          error?: string;
          isHls?: boolean;
          subtitles?: SubtitleTrack[];
          skipTimestamps?: SkipTimestamps;
        };
      } catch (error) {
        console.error('Failed to resolve playback source:', error);
        setAudioError(
          error instanceof Error
            ? error.message
            : 'Unable to resolve playback source.'
        );
        return null;
      } finally {
        setIsResolvingSource(false);
      }
    },
    [
      selectedAudioTrack,
      isActuallyAnime,
      isActuallyTv,
      initialProgressApplied,
      season,
      episode,
      aniListId,
      malId,
      mediaOriginalLang,
      mediaTitle,
      provider,
      accentColor,
      id,
      imdbId,
    ]
  );

  // Dedicated Instant Server Switch Handler (0ms UI latency)
  const handleSelectServer = useCallback(
    (newProviderId: string) => {
      setProvider(newProviderId);
      setPlaybackError(null);
      setAudioError(null);

      const effectiveImdb = imdbId || ApiGateway.getCachedImdbId(id) || undefined;
      const mediaType = isActuallyAnime ? 'anime' : isActuallyTv ? 'tv' : 'movie';

      if (newProviderId === 'nextgen-anime' || newProviderId === 'direct-hls') {
        void resolveCurrentSource(selectedAudioTrack, 'nextgen-anime').then((result) => {
          if (result?.url) {
            setEmbedUrl(result.url);
            setIsDirectHls(Boolean(result.isHls));
            if (result.subtitles) setSubtitles(result.subtitles);
            if (result.skipTimestamps) setSkipTimestamps(result.skipTimestamps);
          } else {
            setIsDirectHls(false);
            const fallbackUrl = ProviderRegistry.resolvePlaybackUrl('vidsrc-su-anime', {
              mediaType,
              tmdbId: id,
              imdbId: effectiveImdb,
              season,
              episode,
              title: mediaTitle,
              audioTrackId: selectedAudioTrack,
            });
            if (fallbackUrl) setEmbedUrl(fallbackUrl);
          }
        });
      } else {
        setIsDirectHls(false);
        const instantUrl = ProviderRegistry.resolvePlaybackUrl(newProviderId, {
          mediaType,
          tmdbId: id,
          imdbId: effectiveImdb,
          season,
          episode,
          title: mediaTitle,
          audioTrackId: selectedAudioTrack,
          accentColor,
        });
        if (instantUrl) {
          setEmbedUrl(instantUrl);
        }
      }
    },
    [isActuallyAnime, isActuallyTv, id, imdbId, season, episode, mediaTitle, selectedAudioTrack, accentColor, resolveCurrentSource]
  );

  const triedServersRef = useRef<Set<string>>(new Set());
  const streamConfirmedPlayingRef = useRef(false);
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset tried servers when episode/media or audio track changes
  useEffect(() => {
    triedServersRef.current.clear();
  }, [id, season, episode, selectedAudioTrack]);

  // Fallback to next available server within the selected audio track
  const handleNextServerFallback = useCallback(
    (isManual = false, isWatchdog = false) => {
      triedServersRef.current.add(provider);
      const next = ProviderRegistry.getFallbackProvider(provider, currentMediaType, selectedAudioTrack);

      if (next && next.id !== provider && (!triedServersRef.current.has(next.id) || isManual)) {
        triggerSeekFeedback(
          isWatchdog
            ? `⚡ Stream stalled. Auto-switching to ${next.name}...`
            : `⚡ Switching to ${next.name}...`
        );
        handleSelectServer(next.id);
      } else {
        const trackName = selectedAudioTrack === 'dub-hi' ? 'Hindi DUB' : selectedAudioTrack === 'dub-en' ? 'English DUB' : 'Original / SUB';
        if (selectedAudioTrack !== 'sub') {
          triggerSeekFeedback(`⚠️ ${trackName} stream unavailable on alternate servers. You can try another server below.`);
          setPlaybackError(`${trackName} stream is currently unavailable on verified servers. Please try another server or switch audio track.`);
        } else {
          if (isWatchdog) {
            triggerSeekFeedback('⚠️ Server taking longer than expected. You can try another server below.');
          } else {
            setPlaybackError('Stream is unavailable on all tested servers. Please check back later.');
          }
        }
      }
    },
    [provider, currentMediaType, selectedAudioTrack, handleSelectServer, triggerSeekFeedback]
  );

  // Stream confirmed playing ref is set by postMessage bridge in UniversalPlayer.
  // The EmbedAdapter has its own 4.5s watchdog — no duplicate timer here.
  useEffect(() => {
    streamConfirmedPlayingRef.current = false;
  }, [embedUrl, provider]);

  // Resolve the initial/current source whenever the episode, provider,
  // or selected audio track changes.
  useEffect(() => {
    let cancelled = false;

    const loadSource = async () => {
      setPlaybackError(null);

      if (provider === 'nextgen-anime' || provider === 'direct-hls') {
        const result = await resolveCurrentSource(selectedAudioTrack, 'nextgen-anime');
        if (!cancelled && result?.url) {
          setEmbedUrl(result.url);
          setIsDirectHls(Boolean(result.isHls));
          if (result.subtitles) setSubtitles(result.subtitles);
          if (result.skipTimestamps) setSkipTimestamps(result.skipTimestamps);
          setPlaybackError(null);
        } else if (!cancelled) {
          setIsDirectHls(false);
          const effectiveImdb = imdbId || ApiGateway.getCachedImdbId(id) || undefined;
          const fallbackUrl = ProviderRegistry.resolvePlaybackUrl('vidsrc-su-anime', {
            mediaType: currentMediaType,
            tmdbId: id,
            imdbId: effectiveImdb,
            season,
            episode,
            title: mediaTitle,
            audioTrackId: selectedAudioTrack,
          });
          if (fallbackUrl) setEmbedUrl(fallbackUrl);
        }
      } else {
        const effectiveImdb = imdbId || ApiGateway.getCachedImdbId(id) || undefined;
        const instantUrl = ProviderRegistry.resolvePlaybackUrl(provider, {
          mediaType: currentMediaType,
          tmdbId: id,
          imdbId: effectiveImdb,
          season,
          episode,
          title: mediaTitle,
          audioTrackId: selectedAudioTrack,
        });
        if (!cancelled && instantUrl) {
          setEmbedUrl(instantUrl);
          setIsDirectHls(false);
          setPlaybackError(null);
        }
      }
    };

    loadSource();

    return () => {
      cancelled = true;
    };
  }, [resolveCurrentSource, selectedAudioTrack, provider, season, episode, currentMediaType, handleSelectServer]);

  // ── Real Audio Switching with Verified Dub Availability ──
  const handleSelectAudioTrack = useCallback(
    async (trackId: string) => {
      // Guard: Do NOT block anime dub tracks (handled gracefully by providers)
      const trackObj = audioAvailability?.tracks?.find((t) => t.id === trackId);
      if (trackObj && trackObj.available === false && !isActuallyAnime) {
        triggerSeekFeedback(`⚠️ ${trackObj.label} is not available for this title`);
        return;
      }

      setShowAudioMenu(false);
      setAudioError(null);
      setSelectedAudioTrack(trackId);

      const feedbackMsg = trackId === 'sub'
        ? '🎌 Switching to Original (SUB)...'
        : trackId === 'dub-hi'
        ? '🇮🇳 Switching to Hindi DUB...'
        : '🇬🇧 Switching to English DUB...';
      triggerSeekFeedback(feedbackMsg);

      // Auto-route to the correct DUB-capable provider while preserving NextGen Anime Server
      let overrideProv: string | undefined = undefined;
      const currentAdapter = ProviderRegistry.getById(provider);

      if (trackId === 'dub-en' || trackId === 'dub') {
        if (isActuallyAnime) {
          // NextGen Anime Server supports both SUB & DUB natively — keep on or route to nextgen-anime!
          overrideProv = 'nextgen-anime';
        } else {
          overrideProv = currentAdapter?.supportsEnglishDub
            ? provider
            : (provider === 'vidlink' ? 'vidlink' : 'vidsrc-pm');
        }
      } else if (trackId === 'dub-hi') {
        // Hindi DUB: nova or current provider if it supports Hindi
        overrideProv = currentAdapter?.supportsHindiDub ? provider : 'nova';
      } else {
        // SUB: keep current provider or nextgen-anime for anime
        overrideProv = isActuallyAnime && (provider === 'nextgen-anime' || provider === 'direct-hls') ? 'nextgen-anime' : provider;
      }

      if (overrideProv && overrideProv !== provider) {
        setProvider(overrideProv);
      }

      const result = await resolveCurrentSource(trackId, overrideProv);

      if (!result?.success || !result.url) {
        triggerSeekFeedback(`⚠️ ${trackId === 'dub-hi' ? 'Hindi DUB' : trackId === 'dub-en' ? 'English DUB' : 'Selected audio'} source not found. Try a different server.`);
        return;
      }

      const newProv = isActuallyAnime && (overrideProv === 'nextgen-anime' || overrideProv === 'direct-hls') ? 'nextgen-anime' : (result.provider || overrideProv);
      if (newProv && newProv !== provider) {
        setProvider(newProv);
      }

      setEmbedUrl(result.url);
      setIsDirectHls(Boolean(result.isHls || result.url.includes('.m3u8')));
      if (result.subtitles) setSubtitles(result.subtitles);
      if (result.skipTimestamps) setSkipTimestamps(result.skipTimestamps);
    },
    [audioAvailability, isActuallyAnime, provider, resolveCurrentSource, triggerSeekFeedback]
  );

  // ── Navigation callbacks ──
  const handleSelectEpisode = useCallback(
    (targetSeason: number, targetEpisode: number) => {
      router.push(
        `/${locale}/watch/${id}?s=${targetSeason}&e=${targetEpisode}${isAnime ? '&type=anime' : ''}`
      );
    },
    [id, isAnime, locale, router]
  );

  const handleSelectSeason = useCallback(
    (targetSeason: number) => {
      router.push(`/${locale}/watch/${id}?s=${targetSeason}&e=1${isAnime ? '&type=anime' : ''}`);
    },
    [id, isAnime, locale, router]
  );

  const goToNextEpisode = useCallback(() => {
    if (nextEpisodeTimerRef.current) {
      clearInterval(nextEpisodeTimerRef.current);
      nextEpisodeTimerRef.current = null;
    }
    setShowNextEpisodePopup(false);
    const nextEp = (episode || 1) + 1;
    handleSelectEpisode(season || 1, nextEp);
  }, [episode, season, handleSelectEpisode]);

  const goToPrevEpisode = useCallback(() => {
    if (!episode || episode <= 1) return;
    handleSelectEpisode(season || 1, episode - 1);
  }, [episode, season, handleSelectEpisode]);

  const hasPrevEpisode = Boolean(isActuallyTv && episode !== undefined && episode > 1);
  const hasNextEpisode = Boolean(
    isActuallyTv &&
      (episodes.length > 0
        ? episodes.some((e) => e.episode_number === (episode || 1) + 1)
        : true)
  );

  const nextEpisodeItem = useMemo(() => {
    if (!isActuallyTv) return undefined;
    return episodes.find((e) => e.episode_number === (episode || 1) + 1);
  }, [isActuallyTv, episodes, episode]);

  const availableProviders = useMemo(() => {
    return ProviderRegistry.getRankedForMediaTypeAndAudio(currentMediaType, selectedAudioTrack);
  }, [currentMediaType, selectedAudioTrack]);

  // Ensure active provider is compatible with current media type AND selected audio track
  useEffect(() => {
    const isSupported = availableProviders.some((p) => p.id === provider);
    if (!isSupported && availableProviders.length > 0) {
      setProvider(availableProviders[0].id);
    }
  }, [availableProviders, provider]);

  const normalizedSource: NormalizedPlaybackSource = useMemo(() => {
    const streamType = UniversalPlayerEngine.detectStreamType(embedUrl || '', isDirectHls);
    const activeAdapter = availableProviders.find((p) => p.id === provider);

    const audioTracks: PlayerAudioTrack[] = isActuallyAnime && (provider === 'nextgen-anime' || provider === 'direct-hls')
      ? [
          { id: 'sub', label: '🇯🇵 Japanese (SUB)', language: 'Japanese', languageCode: 'ja', isOriginal: true, available: true },
          { id: 'dub-en', label: '🇬🇧 English (DUB)', language: 'English', languageCode: 'en', isOriginal: false, available: true },
        ]
      : (audioAvailability?.tracks || []).map((t) => ({
          id: t.id,
          label: t.label,
          language: t.language,
          languageCode: t.languageCode,
          isOriginal: t.isOriginal,
          available: isActuallyAnime ? true : t.available !== false,
        }));

    return {
      sourceId: `${provider}-${id}-${season || 1}-${episode || 1}-${selectedAudioTrack}`,
      providerId: provider,
      providerName: activeAdapter?.name || provider,
      type: streamType,
      url: embedUrl || '',
      quality: activeAdapter?.quality.split('/')[0].trim() || '1080p',
      isDirect: streamType !== 'embed',
      supportsSeek: true,
      audioTracks: audioTracks.length > 0 ? audioTracks : undefined,
      subtitleTracks: subtitles?.map((s, idx) => ({
        id: String(idx),
        label: s.label,
        file: s.file,
        default: s.default,
      })),
      skipTimestamps: skipTimestamps || undefined,
    };
  }, [
    embedUrl,
    isDirectHls,
    provider,
    availableProviders,
    id,
    season,
    episode,
    selectedAudioTrack,
    audioAvailability,
    subtitles,
    skipTimestamps,
  ]);

  const handleProgressSave = useCallback(
    (seconds: number) => {
      if (typeof window === 'undefined' || seconds <= 0) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify({ timestamp: Math.floor(seconds) }));
      } catch {
        // Ignore quota errors
      }
    },
    [storageKey]
  );

  // Load accent color from settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('setting-accent-color');
      if (stored) {
        const val = stored.replace('#', '');
        queueMicrotask(() => setAccentColor(val));
      }
    }
  }, []);

  // ─── Ultra Ad Shield — no sandbox, maximum protection ─────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isAllowed = (url: string) => {
      try {
        const u = new URL(url, window.location.origin);
        return (
          u.origin === window.location.origin ||
          u.hostname.endsWith('instagram.com') ||
          u.hostname.endsWith('google.com') ||
          u.hostname.endsWith('youtube.com')
        );
      } catch {
        return false;
      }
    };

    // 1. Block ALL unwanted popups / new-tab ads
    const originalOpen = window.open.bind(window);
    window.open = (url?: string | URL, target?: string, features?: string) => {
      const urlStr = url ? String(url) : '';
      if (urlStr && isAllowed(urlStr)) return originalOpen(url, target, features);
      triggerSeekFeedback('🛡️ Ad Popup Blocked');
      return null;
    };

    // 2. Intercept programmatic hidden anchor click redirects
    const originalAnchorClick = HTMLAnchorElement.prototype.click;
    let isUserNavigating = false;
    let navTimer: NodeJS.Timeout | null = null;

    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      const href = this.href || '';
      if (!href || isAllowed(href) || isUserNavigating) {
        return originalAnchorClick.call(this);
      }
      triggerSeekFeedback('🛡️ Ad Redirect Blocked');
      return;
    };

    // 3. MutationObserver to strip malicious injected ad tags
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement) {
            const tag = node.tagName.toLowerCase();
            const html = (node.outerHTML || '').toLowerCase();
            if (
              tag === 'script' &&
              (html.includes('popads') ||
                html.includes('propeller') ||
                html.includes('adsterra') ||
                html.includes('onclickmega') ||
                html.includes('deloton') ||
                html.includes('1xbet') ||
                html.includes('bet365'))
            ) {
              node.remove();
            }
          }
        }
      }
    });

    try {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    } catch {
      // Ignored in non-browser environments
    }

    return () => {
      window.open = originalOpen;
      HTMLAnchorElement.prototype.click = originalAnchorClick;
      if (navTimer) clearTimeout(navTimer);
      observer.disconnect();
    };
  }, [triggerSeekFeedback]);

  const sendSeekCommand = useCallback((newTime: number) => {
    if (typeof document === 'undefined') return;
    const video = document.querySelector('video');
    if (video) {
      video.currentTime = newTime;
      return;
    }
    const iframe = document.querySelector('iframe');
    if (iframe?.contentWindow) {
      const win = iframe.contentWindow;
      win.postMessage({ type: 'PLAYER_COMMAND', action: 'seek', time: newTime }, '*');
      win.postMessage({ type: 'VIDSYNC_PLAYER_COMMAND', action: 'seek', time: newTime }, '*');
      win.postMessage({ event: 'command', func: 'seekTo', args: [newTime, true] }, '*');
      win.postMessage({ type: 'seek', value: newTime }, '*');
    }
  }, []);

  const handleSkipBackward10 = useCallback(() => {
    triggerSeekFeedback('⏪ -10s');
    const newTime = Math.max(0, (savedProgressRef.current || 0) - 10);
    setSavedProgress(newTime);
    sendSeekCommand(newTime);
  }, [triggerSeekFeedback, sendSeekCommand]);

  const handleSkipForward10 = useCallback(() => {
    triggerSeekFeedback('⏩ +10s');
    const newTime = (savedProgressRef.current || 0) + 10;
    setSavedProgress(newTime);
    sendSeekCommand(newTime);
  }, [triggerSeekFeedback, sendSeekCommand]);

  const handleSkipIntro85 = useCallback(() => {
    triggerSeekFeedback('⚡ Intro Skipped (+85s)');
    const targetTime = skipTimestamps?.intro?.end ?? ((savedProgressRef.current || 0) + 85);
    setSavedProgress(targetTime);
    sendSeekCommand(targetTime);
  }, [skipTimestamps, triggerSeekFeedback, sendSeekCommand]);

  // Load saved progress from localStorage (provider-specific)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { timestamp?: number };
          if (parsed && parsed.timestamp && parsed.timestamp > 0) {
            setSavedProgress(parsed.timestamp);
            setShowResumePrompt(true);
            setInitialProgressApplied(false);
            return;
          }
        } catch (e) {
          console.error('Error parsing saved progress', e);
        }
      }
      setShowResumePrompt(false);
      setSavedProgress(0);
    }, 0);
    return () => clearTimeout(timer);
  }, [storageKey]);

  // Reset next episode trigger when episode changes
  useEffect(() => {
    hasTriggeredNextRef.current = false;
    const timer = setTimeout(() => {
      setShowNextEpisodePopup(false);
    }, 0);
    if (nextEpisodeTimerRef.current) {
      clearInterval(nextEpisodeTimerRef.current);
      nextEpisodeTimerRef.current = null;
    }
    return () => clearTimeout(timer);
  }, [season, episode]);

  const saveProgress = useCallback(
    (currentTime: number, duration: number) => {
      if (duration <= 0) return;
      const progressPercent = (currentTime / duration) * 100;

      const data = {
        id,
        type: isActuallyTv ? 'tv' : 'movie',
        season,
        episode,
        timestamp: Math.floor(currentTime),
        duration: Math.floor(duration),
        progress: progressPercent,
        updatedAt: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(data));

      // Auto-play next episode detection
      if (
        isActuallyTv &&
        autoNextEnabled &&
        progressPercent > 95 &&
        !hasTriggeredNextRef.current &&
        !showNextEpisodePopup
      ) {
        hasTriggeredNextRef.current = true;
        setShowNextEpisodePopup(true);
        setNextEpisodeCountdown(15);

        nextEpisodeTimerRef.current = setInterval(() => {
          setNextEpisodeCountdown((prev) => {
            if (prev <= 1) {
              if (nextEpisodeTimerRef.current) clearInterval(nextEpisodeTimerRef.current);
              goToNextEpisode();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    },
    [id, isActuallyTv, season, episode, storageKey, showNextEpisodePopup, autoNextEnabled, goToNextEpisode]
  );

  const goBackToShow = useCallback(() => {
    if (nextEpisodeTimerRef.current) {
      clearInterval(nextEpisodeTimerRef.current);
      nextEpisodeTimerRef.current = null;
    }
    setShowNextEpisodePopup(false);
    router.push(`/${locale}/tv/${id}`);
  }, [id, locale, router]);

  const rewatchEpisode = useCallback(() => {
    if (nextEpisodeTimerRef.current) {
      clearInterval(nextEpisodeTimerRef.current);
      nextEpisodeTimerRef.current = null;
    }
    setShowNextEpisodePopup(false);
    hasTriggeredNextRef.current = false;
    localStorage.removeItem(storageKey);
    setSavedProgress(0);
    void resolveCurrentSource(selectedAudioTrack).then((result) => {
      if (result?.url) {
        setEmbedUrl(result.url);
      }
    });
  }, [storageKey, resolveCurrentSource, selectedAudioTrack]);

  const dismissNextPopup = useCallback(() => {
    if (nextEpisodeTimerRef.current) {
      clearInterval(nextEpisodeTimerRef.current);
      nextEpisodeTimerRef.current = null;
    }
    setShowNextEpisodePopup(false);
    hasTriggeredNextRef.current = false;
  }, []);

  // Listen for progress events from player iframes
  useEffect(() => {
    const handlePlayerMessage = (event: MessageEvent) => {
      let eventData: Record<string, unknown> | null = null;

      if (typeof event.data === 'string') {
        try {
          eventData = JSON.parse(event.data) as Record<string, unknown>;
        } catch {
          // Not JSON
        }
      } else if (typeof event.data === 'object' && event.data !== null) {
        eventData = event.data as Record<string, unknown>;
      }

      if (!eventData) return;

      // Check for explicit player error events
      if (
        eventData.type === 'PLAYER_ERROR' ||
        eventData.event === 'error' ||
        eventData.status === 'error'
      ) {
        console.warn('Iframe player reported playback error, triggering fallback:', eventData);
        handleNextServerFallback(false, true);
        return;
      }

      // Stream liveness confirmed ONLY on genuine playback progress or play event (never on static metadata like MEDIA_DATA)
      const dataPayload = (eventData.data || {}) as Record<string, unknown>;
      const isPlaybackConfirmed =
        (eventData.type === 'PLAYER_EVENT' && dataPayload.event === 'play') ||
        (eventData.type === 'PLAYER_EVENT' && typeof dataPayload.currentTime === 'number' && dataPayload.currentTime > 0) ||
        (eventData.type === 'VIDSYNC_PLAYER_EVENT' && typeof dataPayload.currentTime === 'number' && dataPayload.currentTime > 0) ||
        (typeof eventData.timestamp === 'number' && eventData.timestamp > 0);

      if (isPlaybackConfirmed) {
        streamConfirmedPlayingRef.current = true;
        if (watchdogTimerRef.current) {
          clearTimeout(watchdogTimerRef.current);
          watchdogTimerRef.current = null;
        }
      }

      // Videasy progress events
      if (
        eventData.id !== undefined &&
        eventData.type !== undefined &&
        eventData.timestamp !== undefined &&
        eventData.duration !== undefined
      ) {
        const currentTime = eventData.timestamp as number;
        const duration = eventData.duration as number;
        if (duration > 0) saveProgress(currentTime, duration);
      }

      // VidSync VIDSYNC_PLAYER_EVENT
      if (eventData.type === 'VIDSYNC_PLAYER_EVENT' && eventData.data) {
        const d = eventData.data as Record<string, unknown>;
        const currentTime = d.currentTime as number | undefined;
        const duration = d.duration as number | undefined;
        if (currentTime !== undefined && duration !== undefined) {
          saveProgress(currentTime, duration);
        }
      }

      // PLAYER_EVENT (VidFast, VidLink, VidRock)
      if (eventData.type === 'PLAYER_EVENT' && eventData.data) {
        const playerData = eventData.data as Record<string, unknown>;
        const currentTime = playerData.currentTime as number | undefined;
        const duration = playerData.duration as number | undefined;
        if (currentTime !== undefined && duration !== undefined) {
          saveProgress(currentTime, duration);
        }
      }

      // MEDIA_DATA
      if (eventData.type === 'MEDIA_DATA' && eventData.data) {
        const mediaData = eventData.data as Record<string, unknown>;
        const continueWatchingKey = 'continue-watching';
        try {
          const existing = localStorage.getItem(continueWatchingKey);
          const list: Record<string, unknown>[] = existing ? JSON.parse(existing) : [];
          const idx = list.findIndex(
            (item) => item.id === id && item.season === (season || 0) && item.episode === (episode || 0)
          );
          const entry = {
            id,
            type: isActuallyTv ? 'tv' : 'movie',
            season: season || 0,
            episode: episode || 0,
            title: (mediaData.title as string) || mediaTitle || `#${id}`,
            poster: (mediaData.poster_path as string) || (mediaData.poster as string) || '',
            updatedAt: Date.now(),
          };
          if (idx >= 0) {
            list[idx] = entry;
          } else {
            list.unshift(entry);
          }
          localStorage.setItem(continueWatchingKey, JSON.stringify(list.slice(0, 50)));
        } catch (e) {
          console.error('Error saving continue watching data', e);
        }
      }
    };

    globalThis.addEventListener('message', handlePlayerMessage);
    return () => {
      globalThis.removeEventListener('message', handlePlayerMessage);
    };
  }, [id, season, episode, storageKey, isActuallyTv, mediaTitle, saveProgress]);

  const handleResume = () => {
    setInitialProgressApplied(true);
    setShowResumePrompt(false);
  };

  const handleSkipResume = () => {
    setSavedProgress(0);
    setInitialProgressApplied(true);
    setShowResumePrompt(false);
  };

  // Fullscreen implementation with standard and vendor prefix support
  const toggleFullscreen = useCallback(async () => {
    const el = playerContainerRef.current;
    if (!el) return;

    const doc = document as unknown as {
      fullscreenElement?: Element;
      webkitFullscreenElement?: Element;
      mozFullScreenElement?: Element;
      msFullscreenElement?: Element;
      exitFullscreen?: () => Promise<void>;
      webkitExitFullscreen?: () => Promise<void>;
      mozCancelFullScreen?: () => Promise<void>;
      msExitFullscreen?: () => Promise<void>;
    };

    const isNativeFullscreen = Boolean(
      doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
    );

    if (isNativeFullscreen || isFullscreen) {
      // Exit fullscreen
      try {
        if (isNativeFullscreen) {
          if (doc.exitFullscreen) {
            await doc.exitFullscreen();
          } else if (doc.webkitExitFullscreen) {
            await doc.webkitExitFullscreen();
          } else if (doc.mozCancelFullScreen) {
            await doc.mozCancelFullScreen();
          } else if (doc.msExitFullscreen) {
            await doc.msExitFullscreen();
          }
        }
      } catch (err) {
        console.warn('Error exiting fullscreen:', err);
      } finally {
        setIsFullscreen(false);
      }
    } else {
      // Enter fullscreen
      try {
        const targetEl = el as unknown as {
          requestFullscreen?: (options?: { navigationUI?: string }) => Promise<void>;
          webkitRequestFullscreen?: () => Promise<void>;
          mozRequestFullScreen?: () => Promise<void>;
          msRequestFullscreen?: () => Promise<void>;
        };

        if (targetEl.requestFullscreen) {
          await targetEl.requestFullscreen({ navigationUI: 'hide' });
        } else if (targetEl.webkitRequestFullscreen) {
          await targetEl.webkitRequestFullscreen();
        } else if (targetEl.mozRequestFullScreen) {
          await targetEl.mozRequestFullScreen();
        } else if (targetEl.msRequestFullscreen) {
          await targetEl.msRequestFullscreen();
        } else {
          setIsFullscreen(true);
        }
      } catch (err) {
        console.warn('Native fullscreen request failed, using CSS fullscreen fallback:', err);
        setIsFullscreen(true);
      }
    }
  }, [isFullscreen]);

  // Sync fullscreen state with native browser events
  useEffect(() => {
    const onFullscreenChange = () => {
      const doc = document as unknown as {
        fullscreenElement?: Element;
        webkitFullscreenElement?: Element;
        mozFullScreenElement?: Element;
        msFullscreenElement?: Element;
      };
      const fsElement =
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement;
      setIsFullscreen(Boolean(fsElement));
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('mozfullscreenchange', onFullscreenChange);
      document.removeEventListener('MSFullscreenChange', onFullscreenChange);
    };
  }, []);

  // Global ESC key listener to exit pseudo or native fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, toggleFullscreen]);

  // Lock body scrolling ONLY when fullscreen is genuinely active, and ALWAYS unlock on exit / unmount
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07090e] flex flex-col text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 w-full max-w-full overflow-x-clip">
      {/* Top Controller Bar (Canonical Title, Reload & Fullscreen ONLY) */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-4 px-2.5 sm:px-6 py-2 sm:py-3 bg-white/90 dark:bg-[#0b0f17]/95 backdrop-blur-xl border-b border-black/[0.08] dark:border-slate-800/80 z-10 w-full max-w-full overflow-hidden">
        {/* Left Side: Back & Canonical Title */}
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white transition-colors text-xs font-bold bg-black/[0.04] dark:bg-slate-900 hover:bg-black/[0.08] dark:hover:bg-slate-850 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-black/[0.08] dark:border-slate-800 cursor-pointer shadow-sm shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="min-w-0 flex-1">
            {(() => {
              const currentEpMeta = episodes.find((e) => e.episode_number === episode);
              return (
                <>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-500 dark:text-blue-400 border border-blue-500/30 shrink-0">
                      {isAnime ? 'Anime' : isActuallyTv ? 'Series' : 'Movie'}
                    </span>
                    <h1 className="text-xs sm:text-sm md:text-base font-black text-slate-900 dark:text-white truncate">
                      {mediaTitle || (isAnime ? `Anime #${id}` : isActuallyTv ? `Show #${id}` : `Movie #${id}`)}
                    </h1>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                    {isActuallyTv ? (
                      <span>
                        {seasons.length <= 1 ? 'Main Series' : `Season ${season}`}{' '}
                        {currentArc ? (
                          <span className="text-blue-500 dark:text-blue-400 font-semibold">• {currentArc.shortName} Arc </span>
                        ) : null}
                        • Episode {episode}
                        {currentEpMeta?.name ? ` — ${currentEpMeta.name}` : ''}
                      </span>
                    ) : (
                      'Theatrical Feature Stream'
                    )}
                  </p>
                </>
              );
            })()}
          </div>
        </div>

        {/* Right Side: Popup Guard & Fullscreen */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 dark:text-emerald-400 text-[11px] font-bold tracking-wide"
            title="Popup Guard: protects this app from opening unwanted top-level tabs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span>Popup Guard</span>
          </div>
          <button
            onClick={toggleFullscreen}
            className="text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white p-2.5 bg-black/[0.04] dark:bg-slate-900 hover:bg-black/[0.08] dark:hover:bg-slate-850 border border-black/[0.08] dark:border-slate-800 rounded-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Toggle Fullscreen"
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Audio Error / Unavailable Language Fallback Banner */}
      {audioError && (
        <div className="bg-amber-500/10 border-y border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-600 dark:text-amber-200 animate-fade-in z-20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
            <span>{audioError}</span>
          </div>
          <button
            onClick={() => handleSelectAudioTrack('sub')}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs transition cursor-pointer"
          >
            Switch to SUB
          </button>
        </div>
      )}

      {/* ── LUMINA UNIVERSAL CUSTOM STREAMING PLAYER ── */}
      <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-6 pt-0 sm:pt-2">
        <UniversalPlayer
          source={normalizedSource}
          mediaTitle={mediaTitle || (isActuallyAnime ? `Anime #${id}` : isActuallyTv ? `Show #${id}` : `Movie #${id}`)}
          season={season}
          episode={episode}
          episodeName={episodes.find((e) => e.episode_number === episode)?.name}
          arcName={currentArc?.shortName}
          mediaType={currentMediaType}
          availableServers={availableProviders}
          onSelectServer={handleSelectServer}
          autoSwitchEnabled={autoSwitchEnabled}
          onToggleAutoSwitch={handleToggleAutoSwitch}
          onNextServerFallback={handleNextServerFallback}
          onPreviousEpisode={hasPrevEpisode ? goToPrevEpisode : undefined}
          onNextEpisode={hasNextEpisode ? goToNextEpisode : undefined}
          hasPreviousEpisode={hasPrevEpisode}
          hasNextEpisode={hasNextEpisode}
          nextEpisodeMeta={
            nextEpisodeItem
              ? {
                  season: season || 1,
                  episode: (episode || 1) + 1,
                  title: nextEpisodeItem.name,
                }
              : undefined
          }
          savedProgress={savedProgress}
          onProgressSave={handleProgressSave}
          accentColor={accentColor.startsWith('#') ? accentColor : `#${accentColor}`}
          externalError={playbackError}
          isLoadingSource={isResolvingSource}
          activeAudioTrack={selectedAudioTrack}
          onSelectAudioTrack={handleSelectAudioTrack}
          onRetry={() => {
            void resolveCurrentSource(selectedAudioTrack).then((result) => {
              if (result?.url) {
                setEmbedUrl(result.url);
                setPlaybackError(null);
              }
            });
          }}
        />
      </div>

      {/* ──────────────── APPLE-GRADE UNDER-PLAYER CONTROL DECK ──────────────── */}
      <div className="max-w-7xl w-full mx-auto px-2.5 sm:px-6 pt-3 pb-2 flex flex-col gap-3">
        {/* 1. Lumina Apple-Grade Server Selection Deck */}
        <LuminaServerDeck
          servers={availableProviders}
          activeServerId={provider}
          onSelectServer={handleSelectServer}
          mediaType={currentMediaType}
          selectedAudioTrack={selectedAudioTrack}
          onSelectAudioTrack={handleSelectAudioTrack}
          accentColor={accentColor.startsWith('#') ? accentColor : `#${accentColor}`}
          isLoadingSource={isResolvingSource}
          hasHindiDub={mediaOriginalLang === 'hi' || selectedAudioTrack === 'dub-hi' || audioAvailability?.tracks?.some((t) => t.id === 'dub-hi' && t.available !== false)}
          hasEnglishDub={mediaOriginalLang === 'en' || selectedAudioTrack === 'dub-en' || audioAvailability?.tracks?.some((t) => (t.id === 'dub-en' || t.id === 'dub') && t.available !== false)}
        />

        {/* 2. Apple Quick Action Bar */}
        <div className="apple-glass rounded-2xl p-2.5 sm:p-3 border border-black/10 dark:border-white/10 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          {/* Left: Active Server Indicator & Ad Shield Badge */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Server:
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {availableProviders.find((p) => p.id === provider)?.name || provider}
              </span>
            </div>

            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold shadow-sm"
              title="Lumina Ad Shield Active — popups, malicious redirect chains, and sandbox bypass errors are blocked."
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Ad Shield Active</span>
            </div>
          </div>

          {/* Right: Actions (Auto-Switch, Quick Switch, Download, Party) */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Auto-Switch Toggle */}
            <button
              onClick={handleToggleAutoSwitch}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                autoSwitchEnabled
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-500/10 hover:bg-slate-500/20 text-slate-500 dark:text-slate-400 border-slate-500/25'
              }`}
              title={autoSwitchEnabled ? 'Auto server-switching is ON — click to disable' : 'Auto server-switching is OFF — click to enable'}
            >
              <span className="text-[10px]">{autoSwitchEnabled ? '🟢' : '🔴'}</span>
              <span>Auto-Switch: {autoSwitchEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Quick Next Server */}
            <button
              onClick={() => handleNextServerFallback(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="Stream slow or not playing? Switch to next streaming server"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Next Server</span>
            </button>

            {/* Download */}
            <button
              onClick={() => setShowDownload(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.1] dark:hover:bg-white/[0.15] text-slate-800 dark:text-slate-200 border border-black/10 dark:border-white/10 transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="Download Media"
            >
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Watch Party */}
            <button
              onClick={handleCreateParty}
              disabled={isCreatingParty}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
              title="Start Watch Party"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isCreatingParty ? 'Starting...' : 'Watch Party'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ──────────────── CONTENT INFO & EPISODES ──────────────── */}
      <div className="max-w-7xl w-full mx-auto px-4 md:px-8 py-4 space-y-8">

        {/* ──────────────── 3-TIER EPISODE SYSTEM BELOW PLAYER ──────────────── */}
        {isActuallyTv && (
          <EpisodeNavigator
            tmdbId={id}
            currentSeason={season || 1}
            currentEpisode={episode || 1}
            seasons={seasons}
            episodes={episodes}
            loadingEpisodes={loadingEpisodes}
            onSelectEpisode={handleSelectEpisode}
            onSelectSeason={handleSelectSeason}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            accentColor={accentColor}
            isAnime={isActuallyAnime}
            autoNextEnabled={autoNextEnabled}
            onToggleAutoNext={handleToggleAutoNext}
          />
        )}

        {/* ──────────────── MORE LIKE THIS / RECOMMENDATIONS ──────────────── */}
        {recommendations.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
              More Like This
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
              {recommendations.slice(0, 6).map((rec) => (
                <PosterCard
                  key={rec.id}
                  id={rec.id}
                  title={rec.title ?? rec.name ?? ''}
                  posterPath={rec.poster_path ?? ''}
                  rating={rec.vote_average}
                  year={rec.release_date ? rec.release_date.split('-')[0] : (rec.first_air_date ? rec.first_air_date.split('-')[0] : '')}
                  type={isActuallyAnime ? 'anime' : isActuallyTv ? 'tv' : 'movie'}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info notice */}
      <div className="px-6 py-4 pb-20 lg:pb-4 bg-[#0b0f17] border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 mt-auto">
        <span>If the player shows a loading error, switch servers directly below the player.</span>
        <span>Watch History & playback progress are synchronized locally.</span>
      </div>

      {/* Download Modal */}
      {showDownload && (
        <DownloadModal
          id={id}
          title={isActuallyTv ? mediaTitle || `Show #${id}` : mediaTitle || `Movie #${id}`}
          type={isActuallyTv ? 'tv' : 'movie'}
          season={season}
          episode={episode}
          onClose={() => setShowDownload(false)}
        />
      )}
    </div>
  );
}
