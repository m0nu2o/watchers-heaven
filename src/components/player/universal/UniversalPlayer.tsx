'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { Zap, RotateCw } from 'lucide-react';
import { UniversalPlayerEngine } from '@/lib/player/engine';
import {
  NormalizedPlaybackSource,
  PlayerState,
  PlayerPreferences,
} from '@/lib/player/types';
import { ProviderAdapter } from '@/types/media';
import { PlayerPreferencesStore } from '@/lib/player/preferences';
import { PlayerHeader } from './PlayerHeader';
import { PlayerControls } from './PlayerControls';
import { PlayerCenterControls } from './PlayerCenterControls';
import { PlayerNextEpisodeOverlay } from './PlayerNextEpisodeOverlay';
import { PlayerResumePrompt } from './PlayerResumePrompt';
import { PlayerLoadingOverlay } from './PlayerLoadingOverlay';
import { PlayerErrorOverlay } from './PlayerErrorOverlay';

export interface UniversalPlayerProps {
  source: NormalizedPlaybackSource;
  mediaTitle: string;
  season?: number;
  episode?: number;
  episodeName?: string;
  arcName?: string;
  mediaType: 'movie' | 'tv' | 'anime';
  availableServers: ProviderAdapter[];
  onSelectServer: (serverId: string) => void;
  autoSwitchEnabled: boolean;
  onToggleAutoSwitch: () => void;
  onNextServerFallback: (isManual?: boolean, isWatchdog?: boolean) => void;
  onPreviousEpisode?: () => void;
  onNextEpisode?: () => void;
  hasPreviousEpisode?: boolean;
  hasNextEpisode?: boolean;
  nextEpisodeMeta?: { season: number; episode: number; title?: string };
  savedProgress?: number;
  onProgressSave?: (seconds: number) => void;
  accentColor?: string;
  externalError?: string | null;
  isLoadingSource?: boolean;
  activeAudioTrack?: string;
  onSelectAudioTrack?: (trackId: string) => void;
  onRetry?: () => void;
}

export function UniversalPlayer({
  source,
  mediaTitle,
  season,
  episode,
  episodeName,
  arcName,
  mediaType,
  availableServers,
  onSelectServer,
  autoSwitchEnabled,
  onToggleAutoSwitch,
  onNextServerFallback,
  onPreviousEpisode,
  onNextEpisode,
  hasPreviousEpisode,
  hasNextEpisode,
  nextEpisodeMeta,
  savedProgress = 0,
  onProgressSave,
  accentColor = '#3b82f6',
  externalError,
  isLoadingSource,
  activeAudioTrack,
  onSelectAudioTrack,
  onRetry,
}: UniversalPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const engineRef = useRef<UniversalPlayerEngine>(new UniversalPlayerEngine());
  const currentLoadedSourceRef = useRef<string>('');

  const isEmbed = source.type === 'embed';

  // Compute fine-tuned, server-aware iframe sandbox policy
  // 1. VidLink requires allow-top-navigation-by-user-activation to avoid "Please Disable Sandbox"
  // 2. VidSrc SU requires allow-popups without escape to prevent "Restricted Embed Detected"
  // 3. VidSrc Global (vidsrc-pm), ScreenScape India (screenscape), NextGen Anime (flixcloud), Nova:
  //    STRICT NO-POPUPS: completely drops allow-popups and allow-popups-to-escape-sandbox,
  //    guaranteeing ZERO ad popups and zero redirects at the browser engine level!
  const sandboxPolicy = useMemo(() => {
    if (source.providerId === 'vidlink' || source.url.includes('vidlink.pro')) {
      return 'allow-scripts allow-same-origin allow-forms allow-presentation allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation';
    }
    if (source.providerId?.includes('vidsrc-su') || source.url.includes('vidsrc.su')) {
      return 'allow-scripts allow-same-origin allow-forms allow-presentation allow-popups';
    }
    // VidSrc Global (vidsrc.pm), ScreenScape India (screenscape.me), NextGen Anime (flixcloud.cc), Nova (smashystream.com):
    return 'allow-scripts allow-same-origin allow-forms allow-presentation';
  }, [source.providerId, source.url]);

  // Parent-level AdShield Protection: Neutralize popups, top navigation hijacks, and focus theft
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Block popup windows at parent level
    const originalOpen = window.open;
    window.open = function (...args) {
      console.warn('[Lumina AdShield] Neutralized popup window attempt:', args[0]);
      return null;
    };

    // 2. Block top-level navigation hijack from within iframes
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (document.activeElement instanceof HTMLIFrameElement) {
        e.preventDefault();
        return (e.returnValue = '');
      }
    };

    // 3. Keep focus locked to Lumina if an iframe attempts an unfocus/new-tab deflection
    const handleBlur = () => {
      if (document.activeElement instanceof HTMLIFrameElement) {
        setTimeout(() => {
          window.focus();
        }, 100);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.open = originalOpen;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Player Preferences
  const [preferences, setPreferences] = useState<PlayerPreferences>(() =>
    PlayerPreferencesStore.get()
  );

  // Core Player State
  const [state, setState] = useState<PlayerState>({
    playing: false,
    paused: true,
    buffering: false,
    loading: true,
    currentTime: 0,
    duration: 0,
    bufferedTime: 0,
    bufferedPercent: 0,
    volume: preferences.volume,
    muted: preferences.muted,
    playbackSpeed: preferences.speed,
    quality: preferences.preferredQuality || 'auto',
    availableQualities: source.qualities || [],
    activeAudioTrack: source.audioTracks?.[0]?.id || 'sub',
    availableAudioTracks: source.audioTracks || [],
    activeSubtitleTrack: preferences.preferredSubtitle || 'off',
    availableSubtitleTracks: source.subtitleTracks || [{ id: 'off', label: 'Off' }],
    isFullscreen: false,
    isTheaterMode: preferences.theaterMode || false,
    isPip: false,
    error: null,
    statusMessage: `Connecting to ${source.providerName || 'Server'}...`,
  });

  // UI Interactive States
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);
  const nextCountdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<{
    side: 'left' | 'right';
    count: number;
  } | null>(null);
  const doubleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const lastProgressSaveRef = useRef<number>(0);

  // Update State helper
  const handleStateChange = useCallback((patch: Partial<PlayerState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  // Check resume prompt on source load (only for direct streams)
  useEffect(() => {
    if (!isEmbed && savedProgress > 15) {
      setShowResumePrompt(true);
    }
  }, [savedProgress, source.sourceId, isEmbed]);

  // Sync external active audio track if provided
  useEffect(() => {
    if (activeAudioTrack && activeAudioTrack !== state.activeAudioTrack) {
      handleStateChange({ activeAudioTrack });
    }
  }, [activeAudioTrack, state.activeAudioTrack, handleStateChange]);

  // Load Source into Universal Player Engine
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isCancelled = false;
    const mediaEl = isEmbed ? iframeRef.current : videoRef.current;

    if (!mediaEl || !source.url) return;

    const sourceKey = `${source.type}:${source.url}:${source.providerId}`;
    if (currentLoadedSourceRef.current === sourceKey) {
      // Just update track and quality metadata without tearing down player engine
      handleStateChange({
        availableQualities: source.qualities || state.availableQualities,
        availableAudioTracks: source.audioTracks || state.availableAudioTracks,
        availableSubtitleTracks: source.subtitleTracks || state.availableSubtitleTracks,
      });
      return;
    }
    currentLoadedSourceRef.current = sourceKey;

    const init = async () => {
      handleStateChange({
        loading: true,
        error: null,
        statusMessage: `Connecting to ${source.providerName || 'Server'}...`,
      });

      try {
        await engineRef.current.loadSource(
          container,
          mediaEl,
          source,
          {
            onStateChange: (patch) => {
              if (!isCancelled) handleStateChange(patch);
            },
            onError: (err) => {
              if (!isCancelled) {
                handleStateChange({ error: err, loading: false, buffering: false });
              }
            },
            onEnded: () => {
              if (hasNextEpisode && preferences.autoNext) {
                setNextCountdown(10);
              }
            },
            onFallbackNeeded: (reason) => {
              if (!isCancelled) {
                console.warn('[UniversalPlayer] Fallback requested:', reason);
                onNextServerFallback(false, true);
              }
            },
          },
          savedProgress > 15 && !isEmbed ? 0 : savedProgress
        );
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to initialize player stream';
          handleStateChange({ error: msg, loading: false, buffering: false });
        }
      }
    };

    void init();

    return () => {
      isCancelled = true;
    };
  }, [source, onNextServerFallback, hasNextEpisode, preferences.autoNext, savedProgress, isEmbed, handleStateChange]);

  // Periodic Progress Reporting (every 5 seconds for direct playback)
  useEffect(() => {
    if (!state.playing || state.currentTime <= 0 || !onProgressSave || isEmbed) return;
    const now = Date.now();
    if (now - lastProgressSaveRef.current > 5000) {
      lastProgressSaveRef.current = now;
      onProgressSave(state.currentTime);
    }
  }, [state.currentTime, state.playing, onProgressSave, isEmbed]);

  // Next Episode Countdown Timer
  useEffect(() => {
    if (nextCountdown === null) return;
    if (nextCountdown <= 0) {
      setNextCountdown(null);
      if (onNextEpisode) onNextEpisode();
      return;
    }

    nextCountdownTimerRef.current = setTimeout(() => {
      setNextCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => {
      if (nextCountdownTimerRef.current) clearTimeout(nextCountdownTimerRef.current);
    };
  }, [nextCountdown, onNextEpisode]);

  // Controls Visibility & Inactivity Auto-Hide
  const resetControlsTimeout = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    // Auto-hide: 1.4s when playing, 2.5s when paused for clean cinematic frame inspection
    const hideDelay = state.playing ? 1400 : 2500;
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, hideDelay);
  }, [state.playing]);

  const handleMouseMove = useCallback(() => {
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handleMouseLeave = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 400);
  }, []);

  // Reset controls timer when play state changes
  useEffect(() => {
    resetControlsTimeout();
  }, [state.playing, resetControlsTimeout]);

  // Play / Pause Toggle
  const togglePlay = useCallback(() => {
    const adapter = engineRef.current.getAdapter();
    if (!adapter) return;
    if (state.playing) {
      adapter.pause();
    } else {
      void adapter.play();
    }
  }, [state.playing]);

  // Seek relative
  const seekRelative = useCallback(
    (seconds: number) => {
      const adapter = engineRef.current.getAdapter();
      if (!adapter) return;
      const target = Math.max(0, Math.min(state.duration || Infinity, state.currentTime + seconds));
      adapter.seekTo(target);
    },
    [state.currentTime, state.duration]
  );

  // Seek to absolute time
  const seekTo = useCallback((seconds: number) => {
    const adapter = engineRef.current.getAdapter();
    if (!adapter) return;
    adapter.seekTo(seconds);
  }, []);

  // Volume Change
  const handleVolumeChange = useCallback(
    (vol: number) => {
      const adapter = engineRef.current.getAdapter();
      if (!adapter) return;
      adapter.setVolume(vol);
      PlayerPreferencesStore.set({ volume: vol, muted: vol === 0 });
      setPreferences((prev) => ({ ...prev, volume: vol, muted: vol === 0 }));
    },
    []
  );

  // Toggle Mute
  const toggleMute = useCallback(() => {
    const adapter = engineRef.current.getAdapter();
    if (!adapter) return;
    const newMuted = !state.muted;
    adapter.setMuted(newMuted);
    PlayerPreferencesStore.set({ muted: newMuted });
    setPreferences((prev) => ({ ...prev, muted: newMuted }));
  }, [state.muted]);

  // Change Playback Speed
  const handleSelectSpeed = useCallback((speed: number) => {
    const adapter = engineRef.current.getAdapter();
    if (!adapter) return;
    adapter.setSpeed(speed);
    PlayerPreferencesStore.set({ speed });
    setPreferences((prev) => ({ ...prev, speed }));
  }, []);

  // Quality Change
  const handleSelectQuality = useCallback((qualityId: string) => {
    const adapter = engineRef.current.getAdapter();
    if (!adapter) return;
    adapter.setQuality(qualityId);
    PlayerPreferencesStore.set({ preferredQuality: qualityId });
    setPreferences((prev) => ({ ...prev, preferredQuality: qualityId }));
  }, []);

  // Audio Track Change
  const handleSelectAudio = useCallback(
    (trackId: string) => {
      if (onSelectAudioTrack) {
        onSelectAudioTrack(trackId);
      } else {
        const adapter = engineRef.current.getAdapter();
        if (adapter) adapter.setAudioTrack(trackId);
      }
      PlayerPreferencesStore.set({ preferredAudio: trackId });
      setPreferences((prev) => ({ ...prev, preferredAudio: trackId }));
      handleStateChange({ activeAudioTrack: trackId });
    },
    [onSelectAudioTrack, handleStateChange]
  );

  // Subtitle Track Change
  const handleSelectSubtitle = useCallback(
    (subId: string) => {
      const adapter = engineRef.current.getAdapter();
      if (adapter) adapter.setSubtitleTrack(subId);
      PlayerPreferencesStore.set({ preferredSubtitle: subId });
      setPreferences((prev) => ({ ...prev, preferredSubtitle: subId }));
      handleStateChange({ activeSubtitleTrack: subId });
    },
    [handleStateChange]
  );

  // Subtitle Style Customization
  const handleUpdateSubtitleStyles = useCallback(
    (styles: Partial<PlayerPreferences['subtitleStyles']>) => {
      const updated = { ...preferences.subtitleStyles, ...styles };
      PlayerPreferencesStore.set({ subtitleStyles: updated });
      setPreferences((prev) => ({ ...prev, subtitleStyles: updated }));
    },
    [preferences.subtitleStyles]
  );

  // Toggle Theater Mode
  const toggleTheaterMode = useCallback(() => {
    const next = !state.isTheaterMode;
    handleStateChange({ isTheaterMode: next });
    PlayerPreferencesStore.set({ theaterMode: next });
    setPreferences((prev) => ({ ...prev, theaterMode: next }));
  }, [state.isTheaterMode, handleStateChange]);

  // Toggle Fullscreen & Sync Body Scroll Lock
  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      try {
        await container.requestFullscreen();
        handleStateChange({ isFullscreen: true });
        document.body.style.overflow = 'hidden';
      } catch {
        // CSS Fullscreen fallback
        const next = !state.isFullscreen;
        handleStateChange({ isFullscreen: next });
        if (next) {
          document.body.style.overflow = 'hidden';
        } else {
          document.body.style.overflow = '';
        }
      }
    } else {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore
      }
      handleStateChange({ isFullscreen: false });
      document.body.style.overflow = '';
    }
  }, [state.isFullscreen, handleStateChange]);

  // Sync fullscreen state with native browser events
  useEffect(() => {
    const onFullscreenChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
          (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
      );
      handleStateChange({ isFullscreen: isFs });
      if (isFs) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.body.style.overflow = '';
    };
  }, [handleStateChange]);

  // Picture in Picture (direct streams only)
  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      handleStateChange({ isPip: false });
    } else if (document.pictureInPictureEnabled) {
      await video.requestPictureInPicture();
      handleStateChange({ isPip: true });
    }
  }, [handleStateChange]);

  // Keyboard Shortcuts Listener (Non-Intrusive, never intercepts page scroll!)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const container = containerRef.current;
      const isContainerFocused =
        container && (container === document.activeElement || container.contains(document.activeElement));

      // In embed mode or when outside fullscreen, let arrows and space scroll the webpage freely!
      if (isEmbed && !state.isFullscreen) {
        if (['ArrowUp', 'ArrowDown', ' ', 'PageUp', 'PageDown'].includes(e.key)) return;
      }

      switch (e.key) {
        case ' ':
          if ((isContainerFocused || state.isFullscreen) && !isEmbed) {
            e.preventDefault();
            togglePlay();
          }
          break;
        case 'ArrowLeft':
          if ((isContainerFocused || state.isFullscreen) && !isEmbed) {
            e.preventDefault();
            seekRelative(-10);
          }
          break;
        case 'ArrowRight':
          if ((isContainerFocused || state.isFullscreen) && !isEmbed) {
            e.preventDefault();
            seekRelative(10);
          }
          break;
        case 'ArrowUp':
          if ((isContainerFocused || state.isFullscreen) && !isEmbed) {
            e.preventDefault();
            handleVolumeChange(Math.min(1, state.volume + 0.1));
          }
          break;
        case 'ArrowDown':
          if ((isContainerFocused || state.isFullscreen) && !isEmbed) {
            e.preventDefault();
            handleVolumeChange(Math.max(0, state.volume - 0.1));
          }
          break;
        case 'f':
        case 'F':
          if (isContainerFocused || state.isFullscreen) {
            e.preventDefault();
            void toggleFullscreen();
          }
          break;
        case 't':
        case 'T':
          if (isContainerFocused || state.isFullscreen) {
            e.preventDefault();
            toggleTheaterMode();
          }
          break;
        case 'm':
        case 'M':
          if ((isContainerFocused || state.isFullscreen) && !isEmbed) {
            e.preventDefault();
            toggleMute();
          }
          break;
        case 'Escape':
          if (state.isFullscreen) {
            void toggleFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    state.isFullscreen,
    state.volume,
    isEmbed,
    togglePlay,
    seekRelative,
    handleVolumeChange,
    toggleFullscreen,
    toggleTheaterMode,
    toggleMute,
  ]);

  // Touch Handlers for Mobile (direct streams only)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEmbed) return;
    const now = Date.now();
    const touch = e.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = touch.clientX - rect.left;
    const width = rect.width;

    if (now - lastTapTimeRef.current < 300) {
      if (x < width * 0.35) {
        seekRelative(-10);
        setDoubleTapFeedback({ side: 'left', count: 1 });
      } else if (x > width * 0.65) {
        seekRelative(10);
        setDoubleTapFeedback({ side: 'right', count: 1 });
      }

      if (doubleTapTimeoutRef.current) clearTimeout(doubleTapTimeoutRef.current);
      doubleTapTimeoutRef.current = setTimeout(() => setDoubleTapFeedback(null), 800);
    } else {
      setControlsVisible((prev) => !prev);
    }
    lastTapTimeRef.current = now;
  };

  // Skip Intro (+85s)
  const handleSkipIntro = () => {
    seekRelative(85);
  };

  const handleUpdatePreferences = (prefs: Partial<PlayerPreferences>) => {
    PlayerPreferencesStore.set(prefs);
    setPreferences((prev) => ({ ...prev, ...prefs }));
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      aria-label="Universal Video Player"
      className={`relative bg-black flex items-center justify-center overflow-hidden select-none isolation-isolate ${
        state.isFullscreen
          ? 'fixed inset-0 z-[9999] w-screen h-[100dvh] m-0 p-0'
          : state.isTheaterMode
          ? 'w-full aspect-[21/9] max-h-[85vh] min-h-[380px] shadow-2xl'
          : 'w-full aspect-video max-h-[75vh] sm:max-h-[80vh] min-h-[220px] sm:min-h-[360px] md:min-h-[480px] rounded-2xl shadow-2xl border border-white/10'
      }`}
    >
      {/* ── 1. Video / Iframe Stream Element ── */}
      {isEmbed ? (
        <iframe
          ref={iframeRef}
          src={source.url}
          sandbox={sandboxPolicy}
          data-player-adapter="embed"
          className="w-full h-full border-0 absolute inset-0 bg-black pointer-events-auto z-0"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; web-share"
          referrerPolicy="no-referrer"
          loading="eager"
          title="Streaming Player"
        />
      ) : (
        <video
          key={source.url}
          ref={videoRef}
          playsInline
          autoPlay={preferences.autoPlay}
          onClick={togglePlay}
          className="w-full h-full object-contain absolute inset-0 bg-black z-0 pointer-events-auto cursor-pointer"
        />
      )}

      {/* ── 2. Top Header HUD Overlay (ONLY in Fullscreen or Theater Mode — Never duplicates inline header!) ── */}
      {(state.isFullscreen || state.isTheaterMode) && (
        <PlayerHeader
          title={mediaTitle}
          season={season}
          episode={episode}
          episodeName={episodeName}
          arcName={arcName}
          mediaType={mediaType}
          visible={controlsVisible}
          serverName={source.providerName}
          serverQuality={source.quality}
          autoSwitchEnabled={autoSwitchEnabled}
          onToggleAutoSwitch={onToggleAutoSwitch}
          onReload={() => {
            if (isEmbed && iframeRef.current) {
              iframeRef.current.src = source.url;
            } else {
              seekTo(state.currentTime);
            }
          }}
          onSkipIntro={handleSkipIntro}
          hasIntro={Boolean(source.skipTimestamps?.intro || episode)}
          isEmbed={isEmbed}
          isFullscreen={state.isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          isTheaterMode={state.isTheaterMode}
          onToggleTheaterMode={toggleTheaterMode}
        />
      )}

      {/* ── 3. Direct Playback Custom Controls (ONLY for direct/HLS streams — Never over third-party iframes!) ── */}
      {!isEmbed && (
        <>
          {/* Center Play, Seek, Prev/Next Controls (Always available when paused so user can start playback) */}
          {(!state.loading || !state.playing) && (
            <PlayerCenterControls
              playing={state.playing}
              onTogglePlay={togglePlay}
              onSeekRelative={seekRelative}
              onPreviousEpisode={onPreviousEpisode}
              onNextEpisode={onNextEpisode}
              hasPreviousEpisode={hasPreviousEpisode}
              hasNextEpisode={hasNextEpisode}
              doubleTapFeedback={doubleTapFeedback}
              visible={controlsVisible}
            />
          )}

          {/* Bottom Control Deck (Timeline, Audio, Subtitles, Quality, Server, Speed) */}
          <PlayerControls
            playing={state.playing}
            onTogglePlay={togglePlay}
            onSeekRelative={seekRelative}
            onSeekTo={seekTo}
            currentTime={state.currentTime}
            duration={state.duration}
            bufferedPercent={state.bufferedPercent}
            skipTimestamps={source.skipTimestamps}
            volume={state.volume}
            muted={state.muted}
            onVolumeChange={handleVolumeChange}
            onToggleMute={toggleMute}
            activeQuality={state.quality}
            qualities={state.availableQualities}
            onSelectQuality={handleSelectQuality}
            activeAudioId={state.activeAudioTrack}
            audioTracks={state.availableAudioTracks}
            onSelectAudio={handleSelectAudio}
            activeSubtitleId={state.activeSubtitleTrack}
            subtitles={state.availableSubtitleTracks}
            onSelectSubtitle={handleSelectSubtitle}
            subtitleStyles={preferences.subtitleStyles}
            onUpdateSubtitleStyles={handleUpdateSubtitleStyles}
            availableServers={availableServers}
            activeServerId={source.providerId}
            onSelectServer={onSelectServer}
            playbackSpeed={state.playbackSpeed}
            onSelectSpeed={handleSelectSpeed}
            isFullscreen={state.isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            isTheaterMode={state.isTheaterMode}
            onToggleTheaterMode={toggleTheaterMode}
            onTogglePip={togglePip}
            preferences={preferences}
            onUpdatePreferences={handleUpdatePreferences}
            visible={controlsVisible}
            accentColor={accentColor}
          />
        </>
      )}

      {/* ── 4. Status & Loading Overlay (Apple Blur with Spinner, only for direct streams to avoid blocking iframes) ── */}
      {!isEmbed && (state.loading || isLoadingSource) && !state.error && !externalError && (
        <PlayerLoadingOverlay statusMessage={state.statusMessage} />
      )}

      {/* ── 5. Error & Recovery Overlay ── */}
      {(state.error || externalError) && (
        <PlayerErrorOverlay
          error={state.error || externalError || 'Playback unavailable'}
          onTryNextServer={() => onNextServerFallback(true)}
          onSwitchToSub={() => handleSelectAudio('sub')}
          onRetry={
            onRetry ||
            (() => {
              if (isEmbed && iframeRef.current) {
                iframeRef.current.src = source.url;
              } else {
                seekTo(state.currentTime);
              }
            })
          }
          isDubActive={state.activeAudioTrack !== 'sub'}
        />
      )}

      {/* ── 6. Resume Watching Modal (Direct streams only) ── */}
      {!isEmbed && showResumePrompt && (
        <PlayerResumePrompt
          timestamp={savedProgress}
          onResume={() => {
            setShowResumePrompt(false);
            seekTo(savedProgress);
            void engineRef.current.getAdapter()?.play();
          }}
          onRestart={() => {
            setShowResumePrompt(false);
            seekTo(0);
            void engineRef.current.getAdapter()?.play();
          }}
          onDismiss={() => setShowResumePrompt(false)}
        />
      )}

      {/* ── 7. Next Episode Auto-Countdown Overlay ── */}
      {nextCountdown !== null && nextEpisodeMeta && (
        <PlayerNextEpisodeOverlay
          nextSeason={nextEpisodeMeta.season}
          nextEpisode={nextEpisodeMeta.episode}
          nextEpisodeTitle={nextEpisodeMeta.title}
          countdown={nextCountdown}
          onPlayNext={() => {
            setNextCountdown(null);
            if (onNextEpisode) onNextEpisode();
          }}
          onRewatch={() => {
            setNextCountdown(null);
            seekTo(0);
            void engineRef.current.getAdapter()?.play();
          }}
          onCancel={() => setNextCountdown(null)}
          accentColor={accentColor}
        />
      )}
    </div>
  );
}
