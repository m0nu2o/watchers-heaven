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
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [initialProgressApplied, setInitialProgressApplied] = useState(false);
  const [accentColor, setAccentColor] = useState<string>('007bff');
  const [isCreatingParty, setIsCreatingParty] = useState(false);

  const [mediaTitle, setMediaTitle] = useState<string>('');
  const [mediaOriginalLang, setMediaOriginalLang] = useState<string>(isAnime ? 'ja' : 'en');
  const isActuallyAnime = isAnime || resolvedContentType === 'anime' || mediaOriginalLang === 'ja';
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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

        const isGenreAnimation = Array.isArray(data.genres) && data.genres.some((g: { id?: number }) => g.id === 16);
        const isOriginJapan = Array.isArray(data.origin_country) && data.origin_country.includes('JP');
        const isDetectedAnime = isAnime || origLang === 'ja' || (origLang === 'ja' && (isGenreAnimation || isOriginJapan));

        setIsActuallyTv(isTvResult || isDetectedAnime);
        setResolvedContentType(isDetectedAnime ? 'anime' : isTvResult ? 'tv' : 'movie');

        const title =
          (data.name as string) ||
          (data.title as string) ||
          (data.original_name as string) ||
          (data.original_title as string) ||
          (isDetectedAnime ? `Anime #${id}` : isTvResult ? `Show #${id}` : `Movie #${id}`);
        setMediaTitle(title);

        if (isTvResult || isDetectedAnime) {
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
  }, [id, isTv, isAnime, provider]);

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
      const startProgress = initialProgressApplied ? savedProgress : 0;
      const activeProvider = overrideProvider || provider;

      try {
        setIsResolvingSource(true);
        setAudioError(null);

        const qParams = new URLSearchParams({
          type: mediaType,
          track: trackId,
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
      savedProgress,
      season,
      episode,
      aniListId,
      malId,
      mediaOriginalLang,
      mediaTitle,
      provider,
      accentColor,
      id,
    ]
  );

  // Dedicated Instant Server Switch Handler (0ms UI latency)
  const handleSelectServer = useCallback(
    (newProviderId: string) => {
      setProvider(newProviderId);
      setPlaybackError(null);
      setAudioError(null);

      try {
        const mediaType = isActuallyAnime ? 'anime' : isActuallyTv ? 'tv' : 'movie';
        const instantUrl = ProviderRegistry.resolvePlaybackUrl(newProviderId, {
          mediaType,
          tmdbId: id,
          season,
          episode,
          title: mediaTitle,
          aniListId: aniListId && aniListId > 0 ? aniListId : undefined,
          malId: malId && malId > 0 ? malId : undefined,
          audioTrackId: selectedAudioTrack,
          accentColor,
        });

        if (instantUrl) {
          setEmbedUrl(instantUrl);
          setIsDirectHls(Boolean(instantUrl.includes('.m3u8')));
          if (iframeRef.current) {
            iframeRef.current.src = instantUrl;
          }
        }
      } catch (err) {
        console.warn('Instant server switch resolution failed:', err);
      }
    },
    [isActuallyAnime, isActuallyTv, id, season, episode, mediaTitle, aniListId, malId, selectedAudioTrack, accentColor]
  );

  const triedServersRef = useRef<Set<string>>(new Set());
  const streamConfirmedPlayingRef = useRef(false);
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset tried servers when episode/media changes
  useEffect(() => {
    triedServersRef.current.clear();
  }, [id, season, episode]);

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

  // Stream health watchdog: auto-switch server if iframe stream doesn't start
  useEffect(() => {
    streamConfirmedPlayingRef.current = false;
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }

    if (!embedUrl || isDirectHls || !autoSwitchEnabled) return;

    // Give the server 15 seconds to start playback or emit player event
    watchdogTimerRef.current = setTimeout(() => {
      if (!streamConfirmedPlayingRef.current) {
        console.warn(`[Watchdog] Stream on server "${provider}" did not start within 15s. Auto-switching...`);
        ProviderTelemetry.recordFailure(provider, 'Stream watchdog timed out');
        handleNextServerFallback(false, true);
      }
    }, 15000);

    return () => {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
    };
  }, [embedUrl, provider, isDirectHls, autoSwitchEnabled, handleNextServerFallback]);

  // Resolve the initial/current source whenever the episode, provider,
  // or selected audio track changes.
  useEffect(() => {
    let cancelled = false;

    const loadSource = async () => {
      setPlaybackError(null);
      const result = await resolveCurrentSource(selectedAudioTrack);

      if (!cancelled) {
        if (result?.url) {
          if (result.provider && result.provider !== provider) {
            setProvider(result.provider);
          }
          setEmbedUrl(result.url);
          setIsDirectHls(Boolean(result.isHls || result.url.includes('.m3u8')));
          if (result.subtitles) setSubtitles(result.subtitles);
          if (result.skipTimestamps) setSkipTimestamps(result.skipTimestamps);
          setPlaybackError(null);
          if (iframeRef.current && iframeRef.current.src !== result.url) {
            iframeRef.current.src = result.url;
          }
        } else {
          // Automatic Provider Fallback: Try next compatible server for this audio track
          const next = ProviderRegistry.getFallbackProvider(provider, currentMediaType, selectedAudioTrack);
          if (next && next.id !== provider && !triedServersRef.current.has(next.id)) {
            handleSelectServer(next.id);
          } else {
            const trackName = selectedAudioTrack === 'dub-hi' ? 'Hindi DUB' : selectedAudioTrack === 'dub-en' ? 'English DUB' : 'Original / SUB';
            setPlaybackError(`${trackName} stream is unavailable on all tested servers. Please try another audio track or server.`);
          }
        }
      }
    };

    loadSource();

    return () => {
      cancelled = true;
    };
  }, [resolveCurrentSource, selectedAudioTrack, provider, season, episode, currentMediaType, handleSelectServer]);

  // Initialize HLS.js for direct .m3u8 playback without iframes or ads
  useEffect(() => {
    if (!isDirectHls || !embedUrl || !videoRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let hlsInstance: any = null;
    const video = videoRef.current;

    const onLoadedMetadata = () => {
      if (savedProgress && savedProgress > 0 && video.currentTime === 0) {
        video.currentTime = savedProgress;
      }
    };
    video.addEventListener('loadedmetadata', onLoadedMetadata);

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = embedUrl;
    } else {
      import('hls.js')
        .then(({ default: Hls }) => {
          if (Hls.isSupported() && videoRef.current) {
            hlsInstance = new Hls({ enableWorker: true, lowLatencyMode: true });
            hlsInstance.loadSource(embedUrl);
            hlsInstance.attachMedia(videoRef.current);
          }
        })
        .catch((err) => {
          console.warn('Failed to load Hls.js:', err);
        });
    }

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [isDirectHls, embedUrl, savedProgress]);

  // ── Real Audio Switching with Verified Dub Availability ──
  const handleSelectAudioTrack = useCallback(
    async (trackId: string) => {
      // Guard: Do NOT proceed if the track is marked unavailable
      const trackObj = audioAvailability?.tracks?.find((t) => t.id === trackId);
      if (trackObj && trackObj.available === false) {
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

      // Auto-route to the correct DUB-capable provider
      let overrideProv: string | undefined = undefined;
      if (trackId === 'dub-en' || trackId === 'dub') {
        // For anime, vidlink-anime is the verified English DUB provider
        overrideProv = isActuallyAnime ? 'vidlink-anime' : (provider === 'vidlink' ? 'vidlink' : 'vidsrc-pm');
      } else if (trackId === 'dub-hi') {
        // Hindi DUB: screenscape-anime for anime, autoembed-co for movies/TV
        overrideProv = isActuallyAnime ? 'screenscape-anime' : 'autoembed-co';
      } else {
        // SUB: default provider for media type
        overrideProv = isActuallyAnime ? 'vidlink-anime' : 'vidlink';
      }

      if (overrideProv && overrideProv !== provider) {
        setProvider(overrideProv);
      }

      const result = await resolveCurrentSource(trackId, overrideProv);

      if (!result?.success || !result.url) {
        triggerSeekFeedback(`⚠️ ${trackId === 'dub-hi' ? 'Hindi DUB' : trackId === 'dub-en' ? 'English DUB' : 'Selected audio'} source not found. Try a different server.`);
        return;
      }

      const newProv = result.provider || overrideProv;
      if (newProv && newProv !== provider) {
        setProvider(newProv);
      }

      setEmbedUrl(result.url);
      setIsDirectHls(Boolean(result.isHls || result.url.includes('.m3u8')));
      if (result.subtitles) setSubtitles(result.subtitles);
      if (result.skipTimestamps) setSkipTimestamps(result.skipTimestamps);

      if (iframeRef.current) {
        iframeRef.current.src = result.url;
      }
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

    // 3. Block middle-click pop-unders (mouse button 1) and auxiliary clicks
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        const el = e.target as HTMLElement;
        if (!el.closest('a[href], button')) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    const handleAuxClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest('a[href], button')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // 4. Anti-hijack protection: prevent third-party iframes from redirecting the top window
    const handleUserClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest('a') || target?.closest('button')) {
        isUserNavigating = true;
        if (navTimer) clearTimeout(navTimer);
        navTimer = setTimeout(() => {
          isUserNavigating = false;
        }, 3000);
      }
    };

    // 5. Pop-under defense: if page blurs without user navigation, refocus top window
    let blurTimer: NodeJS.Timeout | null = null;
    const handleBlur = () => {
      if (!isUserNavigating) {
        blurTimer = setTimeout(() => {
          window.focus();
        }, 80);
      }
    };
    const handleFocus = () => {
      if (blurTimer) {
        clearTimeout(blurTimer);
        blurTimer = null;
      }
    };

    // 6. Anti-hijack beforeunload guard
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isUserNavigating) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    // 7. MutationObserver to instantly strip malicious injected ad tags
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

    window.addEventListener('click', handleUserClick, { capture: true });
    window.addEventListener('mousedown', handleMouseDown, { capture: true });
    window.addEventListener('auxclick', handleAuxClick, { capture: true });
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.open = originalOpen;
      HTMLAnchorElement.prototype.click = originalAnchorClick;
      if (navTimer) clearTimeout(navTimer);
      if (blurTimer) clearTimeout(blurTimer);
      observer.disconnect();
      window.removeEventListener('click', handleUserClick, { capture: true });
      window.removeEventListener('mousedown', handleMouseDown, { capture: true });
      window.removeEventListener('auxclick', handleAuxClick, { capture: true });
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [triggerSeekFeedback]);

  const handleSkipBackward10 = useCallback(() => {
    triggerSeekFeedback('⏪ -10s');
    if (isDirectHls && videoRef.current) {
      const newTime = Math.max(0, videoRef.current.currentTime - 10);
      videoRef.current.currentTime = newTime;
      setSavedProgress(newTime);
      return;
    }
    const newTime = Math.max(0, (savedProgress || 0) - 10);
    setSavedProgress(newTime);
    if (iframeRef.current?.contentWindow) {
      const win = iframeRef.current.contentWindow;
      win.postMessage({ type: 'PLAYER_COMMAND', action: 'seek', time: newTime }, '*');
      win.postMessage({ type: 'VIDSYNC_PLAYER_COMMAND', action: 'seek', time: newTime }, '*');
      win.postMessage({ event: 'command', func: 'seekTo', args: [newTime, true] }, '*');
      win.postMessage({ type: 'seek', value: newTime }, '*');
    }
  }, [isDirectHls, savedProgress, triggerSeekFeedback]);

  const handleSkipForward10 = useCallback(() => {
    triggerSeekFeedback('⏩ +10s');
    if (isDirectHls && videoRef.current) {
      const newTime = videoRef.current.currentTime + 10;
      videoRef.current.currentTime = newTime;
      setSavedProgress(newTime);
      return;
    }
    const newTime = (savedProgress || 0) + 10;
    setSavedProgress(newTime);
    if (iframeRef.current?.contentWindow) {
      const win = iframeRef.current.contentWindow;
      win.postMessage({ type: 'PLAYER_COMMAND', action: 'seek', time: newTime }, '*');
      win.postMessage({ type: 'VIDSYNC_PLAYER_COMMAND', action: 'seek', time: newTime }, '*');
      win.postMessage({ event: 'command', func: 'seekTo', args: [newTime, true] }, '*');
      win.postMessage({ type: 'seek', value: newTime }, '*');
    }
  }, [isDirectHls, savedProgress, triggerSeekFeedback]);

  const handleSkipIntro85 = useCallback(() => {
    triggerSeekFeedback('⚡ Intro Skipped (+85s)');
    if (isDirectHls && videoRef.current) {
      const targetTime = skipTimestamps?.intro?.end ?? (videoRef.current.currentTime + 85);
      videoRef.current.currentTime = targetTime;
      setSavedProgress(targetTime);
      return;
    }
    const newTime = (savedProgress || 0) + 85;
    setSavedProgress(newTime);
    if (iframeRef.current?.contentWindow) {
      const win = iframeRef.current.contentWindow;
      win.postMessage({ type: 'PLAYER_COMMAND', action: 'seek', time: newTime }, '*');
      win.postMessage({ type: 'VIDSYNC_PLAYER_COMMAND', action: 'seek', time: newTime }, '*');
      win.postMessage({ event: 'command', func: 'seekTo', args: [newTime, true] }, '*');
      win.postMessage({ type: 'seek', value: newTime }, '*');
    }
  }, [isDirectHls, skipTimestamps, savedProgress, triggerSeekFeedback]);

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

  // Reload iframe when provider changes or resume is confirmed.
  // Source resolution is asynchronous and always goes through the API.
  useEffect(() => {
    if (iframeRef.current && !showResumePrompt && embedUrl) {
      iframeRef.current.src = embedUrl;
    }
  }, [provider, initialProgressApplied, showResumePrompt, embedUrl]);

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
      if (result?.url && iframeRef.current) {
        setEmbedUrl(result.url);
        iframeRef.current.src = result.url;
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

        {/* Center: Apple Cinema Quick Skip Controls (Visible on screens >= 480px) */}
        <div className="hidden min-[480px]:flex items-center gap-1 sm:gap-1.5 shrink-0 bg-black/50 dark:bg-black/60 backdrop-blur-md p-1 rounded-2xl border border-white/15 shadow-sm">
          <button
            onClick={handleSkipBackward10}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
            title="Skip 10 seconds backward"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>-10s</span>
          </button>
          <button
            onClick={handleSkipForward10}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
            title="Skip 10 seconds forward"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>+10s</span>
          </button>
          {isActuallyTv && (
            <button
              onClick={handleSkipIntro85}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 transition-all cursor-pointer shadow-sm"
              title="Skip Intro / Recap (+85s)"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Skip Intro</span>
              <span className="xs:hidden">Intro</span>
            </button>
          )}
        </div>

        {/* Right Side: Popup Guard, Reload & Fullscreen */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 dark:text-emerald-400 text-[11px] font-bold tracking-wide"
            title="Popup Guard: protects this app from opening unwanted top-level tabs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span>Popup Guard</span>
          </div>
          <button
            onClick={() => {
              void resolveCurrentSource(selectedAudioTrack).then((result) => {
                if (result?.url && iframeRef.current) {
                  setEmbedUrl(result.url);
                  iframeRef.current.src = result.url;
                }
              });
            }}
            className="text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white p-2.5 bg-black/[0.04] dark:bg-slate-900 hover:bg-black/[0.08] dark:hover:bg-slate-850 border border-black/[0.08] dark:border-slate-800 rounded-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Reload Stream"
            aria-label="Reload Stream"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
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

      {/* Main Video Player Container (Dedicated Fullscreen Target) */}
      <div
        ref={playerContainerRef}
        className={`relative bg-black flex items-center justify-center transition-all ${
          isFullscreen
            ? 'fixed inset-0 z-[9999] w-screen h-[100dvh] m-0 p-0 overflow-hidden'
            : 'w-full aspect-video max-h-[75vh] sm:max-h-[80vh] min-h-[220px] sm:min-h-[360px] md:min-h-[480px]'
        }`}
      >
        {/* On-Screen Seek Feedback HUD Toast */}
        {seekFeedback && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-3 rounded-2xl bg-black/85 backdrop-blur-2xl border border-white/20 text-white font-black text-sm sm:text-base shadow-2xl flex items-center gap-2.5">
              <span>{seekFeedback}</span>
            </div>
          </div>
        )}
        {/* Floating Exit Fullscreen Button */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 z-50 bg-black/80 hover:bg-black text-white p-2.5 rounded-xl backdrop-blur-md border border-white/20 shadow-2xl transition cursor-pointer"
            title="Exit Fullscreen (ESC)"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        )}

        {/* Resume Watching Prompt */}
        {showResumePrompt && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 animate-fade-in">
            <div className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 max-w-sm w-full shadow-2xl shadow-black/50 flex flex-col items-center space-y-6">
              <button
                onClick={handleSkipResume}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-500 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="35" fill="none" stroke="#1e293b" strokeWidth="4" />
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    fill="none"
                    stroke={`#${accentColor}`}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 35}`}
                    strokeDashoffset={`${2 * Math.PI * 35 * (1 - Math.min(savedProgress / 3600, 1))}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Play className="w-6 h-6 text-white fill-white" />
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-xl font-black text-white mb-1">Resume Watching?</h3>
                <p className="text-slate-400 text-sm">
                  Pick up from{' '}
                  <span className="text-white font-semibold">
                    {Math.floor(savedProgress / 60)}m {savedProgress % 60}s
                  </span>{' '}
                  on{' '}
                  <span className="text-white font-semibold">
                    {availableProviders.find((p) => p.id === provider)?.name || provider}
                  </span>
                </p>
              </div>

              <div className="flex flex-col gap-2.5 w-full">
                <button
                  onClick={handleResume}
                  className="w-full flex items-center justify-center gap-2.5 hover:brightness-110 text-white font-bold py-3.5 px-4 rounded-2xl text-sm transition-all shadow-lg cursor-pointer"
                  style={{ backgroundColor: `#${accentColor}` }}
                >
                  <Play className="w-4 h-4 fill-white" />
                  Yes, Resume
                </button>
                <button
                  onClick={handleSkipResume}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-2xl text-sm transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Start Over
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Next Episode Auto-play Popup */}
        {showNextEpisodePopup && isActuallyTv && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 animate-fade-in">
            <div className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-black/50 flex flex-col items-center space-y-6">
              <button
                onClick={dismissNextPopup}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-500 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="35" fill="none" stroke="#1e293b" strokeWidth="4" />
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    fill="none"
                    stroke={`#${accentColor}`}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 35}`}
                    strokeDashoffset={`${2 * Math.PI * 35 * (nextEpisodeCountdown / 15)}`}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-black text-white">{nextEpisodeCountdown}</span>
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-xl font-black text-white mb-1">Episode Finished</h3>
                <p className="text-slate-400 text-sm">
                  Up next:{' '}
                  <span className="text-white font-semibold">
                    S{season}E{(episode || 1) + 1}
                  </span>
                </p>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${((15 - nextEpisodeCountdown) / 15) * 100}%`,
                    backgroundColor: `#${accentColor}`,
                  }}
                />
              </div>

              <div className="flex flex-col gap-2.5 w-full">
                <button
                  onClick={goToNextEpisode}
                  className="w-full flex items-center justify-center gap-2.5 hover:brightness-110 text-white font-bold py-3.5 px-4 rounded-2xl text-sm transition-all shadow-lg cursor-pointer"
                  style={{ backgroundColor: `#${accentColor}` }}
                >
                  <SkipForward className="w-4 h-4" />
                  Play Next Episode
                </button>

                <div className="flex gap-2.5">
                  <button
                    onClick={rewatchEpisode}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-2xl text-sm transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Rewatch
                  </button>
                  <button
                    onClick={goBackToShow}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-2xl text-sm transition-colors cursor-pointer"
                  >
                    <ArrowLeftCircle className="w-3.5 h-3.5" />
                    Show Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {playbackError || (!embedUrl && !isResolvingSource) ? (
          <div className="w-full h-full min-h-[50vh] md:min-h-[70vh] lg:min-h-[75vh] flex flex-col items-center justify-center bg-[#07090e] p-6 text-center animate-fade-in z-20">
            <div className="bg-[#0b0f17] border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1.5">Playback Unavailable</h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  {playbackError || 'This streaming server is currently unreachable or does not have this title.'}
                </p>
              </div>
              <div className="flex flex-col gap-2.5 w-full pt-2">
                <button
                  onClick={() => handleNextServerFallback(true)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition shadow-lg cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Next Server</span>
                </button>
                {selectedAudioTrack !== 'sub' && (
                  <button
                    onClick={() => handleSelectAudioTrack('sub')}
                    className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
                  >
                    <span>Switch to Original / SUB</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    void resolveCurrentSource(selectedAudioTrack).then((r) => {
                      if (r?.url) {
                        setEmbedUrl(r.url);
                        setPlaybackError(null);
                      }
                    });
                  }}
                  className="w-full text-slate-500 hover:text-slate-300 py-1.5 text-xs transition cursor-pointer"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        ) : isDirectHls && embedUrl ? (
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            className={`transition-all bg-black object-contain ${
              isFullscreen
                ? 'w-full h-full absolute inset-0'
                : 'w-full h-full'
            }`}
            onTimeUpdate={(e) => {
              const cur = e.currentTarget.currentTime;
              setSavedProgress(cur);
              if (
                skipTimestamps?.outro?.start &&
                cur >= skipTimestamps.outro.start &&
                !hasTriggeredNextRef.current &&
                autoNextEnabled &&
                isActuallyTv
              ) {
                hasTriggeredNextRef.current = true;
                setShowNextEpisodePopup(true);
              }
            }}
            onEnded={() => {
              if (autoNextEnabled && isActuallyTv) {
                goToNextEpisode();
              }
            }}
          >
            {subtitles.map((sub, idx) => (
              <track
                key={idx}
                kind="subtitles"
                label={sub.label}
                src={sub.file}
                default={idx === 0}
              />
            ))}
          </video>
        ) : embedUrl ? (
          <iframe
            key={provider}
            ref={iframeRef}
            src={embedUrl}
            className={`border-0 transition-all ${
              isFullscreen
                ? 'w-full h-full absolute inset-0'
                : 'w-full h-full'
            }`}
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            referrerPolicy="no-referrer"
            title="Lumina Stream Player"
            style={{ border: 'none' }}
            onLoad={() => {
              streamConfirmedPlayingRef.current = true;
              ProviderTelemetry.recordSuccess(provider);
              if (watchdogTimerRef.current) {
                clearTimeout(watchdogTimerRef.current);
                watchdogTimerRef.current = null;
              }
            }}
            onError={() => {
              ProviderTelemetry.recordFailure(provider, 'Iframe connection error');
              handleNextServerFallback();
            }}
          />
        ) : (
          <div className="w-full h-full bg-black" />
        )}
      </div>

      {/* ──────────────── APPLE-GRADE UNDER-PLAYER CONTROL DECK ──────────────── */}
      <div className="max-w-7xl w-full mx-auto px-2.5 sm:px-6 pt-3 pb-2 overflow-hidden">
        <div className="apple-glass rounded-2xl p-3 sm:p-4 border border-black/10 dark:border-white/10 shadow-2xl flex flex-col gap-3.5 w-full max-w-full overflow-hidden">
          
          {/* Top Section: Server Picker & Audio Track Picker */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-start justify-between gap-3 w-full">
            
            {/* 1. Streaming Server Picker */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0 max-w-full">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {currentMediaType === 'anime' ? '🎌 Anime Servers' : currentMediaType === 'tv' ? '📺 Series Servers' : '🎬 Movie Servers'} ({availableProviders.length} Available)
                </span>
                <span className="text-[10px] text-blue-500 font-semibold truncate max-w-[160px]">
                  {availableProviders.find((p) => p.id === provider)?.quality || '1080p'}
                </span>
              </div>

              <div
                className="flex flex-wrap items-center gap-1.5 w-full max-w-full py-0.5"
                data-lenis-prevent
              >
                {availableProviders.map((p) => {
                  const isActive = provider === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectServer(p.id)}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 max-w-full ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-[1.02]'
                          : 'text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1]'
                      }`}
                    >
                      <span>{p.badge}</span>
                      <span className="truncate">{p.name}</span>
                      <span className="text-[10px] text-emerald-400 font-extrabold" title="Verified Server">✓</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-md ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-black/10 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {p.quality.split('/')[0].trim()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vertical Divider on large screens */}
            <div className="hidden lg:block w-px self-stretch bg-black/[0.08] dark:bg-white/[0.08] shrink-0" />

            {/* 2. Unified Audio Track Picker */}
            <div className="flex flex-col gap-1.5 flex-initial min-w-0 max-w-full">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Audio Track
                </span>
                <span className="text-[10px] text-emerald-500 font-semibold uppercase">
                  {selectedAudioTrack.replace('dub-', '')}
                </span>
              </div>

              {(() => {
                // Synchronously evaluate default tracks from catalog so verified titles never flash N/A
                const defaultTracks = (() => {
                  try {
                    const initial = getEpisodeAudioTracks({
                      mediaId: id,
                      mediaType: isActuallyAnime ? 'anime' : isActuallyTv ? 'tv' : 'movie',
                      season,
                      episode,
                      originalLanguage: mediaOriginalLang,
                      title: mediaTitle,
                      aniListId,
                      malId,
                    });
                    if (initial?.tracks && initial.tracks.length > 0) return initial.tracks;
                  } catch {}
                  return isActuallyAnime
                    ? [
                        { id: 'sub', label: '🇯🇵 Japanese (SUB)', available: true, languageCode: 'ja' },
                        { id: 'dub-en', label: '🇬🇧 English (DUB)', available: false, languageCode: 'en' },
                        { id: 'dub-hi', label: '🇮🇳 Hindi (DUB)', available: false, languageCode: 'hi' },
                      ]
                    : [
                        { id: 'sub', label: '🌐 Original', available: true, languageCode: mediaOriginalLang || 'en' },
                        { id: 'dub-hi', label: '🇮🇳 Hindi DUB', available: false, languageCode: 'hi' },
                      ];
                })();

                // Use audioAvailability tracks once loaded — do NOT override availability
                const rawTracks =
                  audioAvailability?.tracks && audioAvailability.tracks.length > 0
                    ? audioAvailability.tracks
                    : defaultTracks;

                // Eliminate redundant English dub track if original language is already English
                const tracksToRender = rawTracks.filter((t, _idx, arr) => {
                  if (t.id === 'dub-en' && arr.some((o) => o.id === 'sub' && (o as { languageCode?: string }).languageCode === 'en')) {
                    return false;
                  }
                  return true;
                });

                return (
                  <div className={`grid ${tracksToRender.length === 2 ? 'grid-cols-2' : tracksToRender.length === 1 ? 'grid-cols-1' : 'grid-cols-3'} gap-1.5 sm:flex sm:flex-wrap items-center bg-black/[0.04] dark:bg-white/[0.06] p-1.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] w-full max-w-full`}>
                    {tracksToRender.map((track) => {
                      const isSelected = selectedAudioTrack === track.id;
                      // Respect the verified availability field — no blanket overrides
                      const isAvailable = track.available !== false;
                      return (
                        <button
                          key={track.id}
                          disabled={!isAvailable}
                          onClick={() => isAvailable && handleSelectAudioTrack(track.id)}
                          className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap select-none flex items-center justify-center gap-1 min-w-0 max-w-full ${
                            !isAvailable
                              ? 'opacity-35 cursor-not-allowed text-slate-400 dark:text-slate-600 line-through'
                              : isSelected
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-[1.02] ring-2 ring-blue-400/40 cursor-pointer'
                              : 'text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08] cursor-pointer'
                          }`}
                          title={isAvailable ? track.label : `${track.label} — Not available for this title`}
                        >
                          <span className="block truncate min-w-0">
                            <span className="sm:hidden">
                              {track.id === 'sub' ? (isActuallyAnime ? '🇯🇵 SUB' : '🌐 Original') : track.id === 'dub-en' ? '🇬🇧 ENG' : track.id === 'dub-hi' ? '🇮🇳 HIN' : track.label}
                            </span>
                            <span className="hidden sm:inline">
                              {track.label}
                            </span>
                          </span>
                          {!isAvailable && (
                            <span className="text-[8px] sm:text-[9px] px-1 py-0.2 bg-black/10 dark:bg-white/10 rounded font-normal no-underline shrink-0">
                              N/A
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Bottom Action Deck: Auto-Switch Toggle + Quick Switch Server + Download + Watch Party */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06] flex-wrap w-full">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Dedicated Auto-Switch ON/OFF toggle */}
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

              <button
                onClick={() => handleNextServerFallback(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Stream slow or not playing? Switch to next streaming server"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Switch Server</span>
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <button
                onClick={() => setShowDownload(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.1] dark:hover:bg-white/[0.15] text-slate-800 dark:text-slate-200 border border-black/10 dark:border-white/10 transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Download Episode"
              >
                <Download className="w-3.5 h-3.5 text-blue-500" />
                <span>Download</span>
              </button>

              <button
                onClick={handleCreateParty}
                disabled={isCreatingParty}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50 hover:scale-105 active:scale-95"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{isCreatingParty ? 'Creating...' : 'Watch Party'}</span>
              </button>
            </div>
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
