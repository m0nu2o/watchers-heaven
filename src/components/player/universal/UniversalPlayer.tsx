'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
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
    statusMessage: 'Connecting to server...',
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

  // Check resume prompt on source load
  useEffect(() => {
    if (savedProgress > 15) {
      setShowResumePrompt(true);
    }
  }, [savedProgress, source.sourceId]);

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
    const mediaEl =
      source.type === 'embed' ? iframeRef.current : videoRef.current;

    if (!mediaEl) return;

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
          savedProgress > 15 ? 0 : savedProgress
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
  }, [source, onNextServerFallback, hasNextEpisode, preferences.autoNext, savedProgress, handleStateChange]);

  // Periodic Progress Reporting (every 5 seconds)
  useEffect(() => {
    if (!state.playing || state.currentTime <= 0 || !onProgressSave) return;
    const now = Date.now();
    if (now - lastProgressSaveRef.current > 5000) {
      lastProgressSaveRef.current = now;
      onProgressSave(state.currentTime);
    }
  }, [state.currentTime, state.playing, onProgressSave]);

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
    // Only auto-hide when actively playing and no modals open
    if (state.playing && !showResumePrompt && nextCountdown === null) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3200);
    }
  }, [state.playing, showResumePrompt, nextCountdown]);

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  // Playback Control Actions
  const togglePlay = useCallback(() => {
    const adapter = engineRef.current.getAdapter();
    if (!adapter) return;
    if (state.playing) {
      adapter.pause();
    } else {
      void adapter.play();
    }
    resetControlsTimeout();
  }, [state.playing, resetControlsTimeout]);

  const seekRelative = useCallback((seconds: number) => {
    const adapter = engineRef.current.getAdapter();
    if (!adapter) return;
    const target = Math.max(0, Math.min(state.currentTime + seconds, state.duration || 9999));
    adapter.seekTo(target);
    resetControlsTimeout();
  }, [state.currentTime, state.duration, resetControlsTimeout]);

  const seekTo = useCallback((seconds: number) => {
    const adapter = engineRef.current.getAdapter();
    if (!adapter) return;
    adapter.seekTo(seconds);
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handleVolumeChange = useCallback((vol: number) => {
    const adapter = engineRef.current.getAdapter();
    if (adapter) adapter.setVolume(vol);
    const updated = PlayerPreferencesStore.set({ volume: vol, muted: vol === 0 });
    setPreferences(updated);
    handleStateChange({ volume: vol, muted: vol === 0 });
  }, [handleStateChange]);

  const toggleMute = useCallback(() => {
    const adapter = engineRef.current.getAdapter();
    const nextMuted = !state.muted;
    if (adapter) adapter.setMuted(nextMuted);
    const updated = PlayerPreferencesStore.set({ muted: nextMuted });
    setPreferences(updated);
    handleStateChange({ muted: nextMuted });
  }, [state.muted, handleStateChange]);

  const handleSelectQuality = useCallback((qId: string) => {
    const adapter = engineRef.current.getAdapter();
    if (adapter) adapter.setQuality(qId);
    handleStateChange({ quality: qId });
    PlayerPreferencesStore.set({ preferredQuality: qId });
  }, [handleStateChange]);

  const handleSelectAudio = useCallback((trackId: string) => {
    const adapter = engineRef.current.getAdapter();
    if (adapter) adapter.setAudioTrack(trackId);
    handleStateChange({ activeAudioTrack: trackId });
    PlayerPreferencesStore.set({ preferredAudio: trackId });
    if (onSelectAudioTrack) {
      onSelectAudioTrack(trackId);
    }
  }, [handleStateChange, onSelectAudioTrack]);

  const handleSelectSubtitle = useCallback((subId: string) => {
    const adapter = engineRef.current.getAdapter();
    if (adapter) adapter.setSubtitleTrack(subId);
    handleStateChange({ activeSubtitleTrack: subId });
    PlayerPreferencesStore.set({ preferredSubtitle: subId });
  }, [handleStateChange]);

  const handleSelectSpeed = useCallback((spd: number) => {
    const adapter = engineRef.current.getAdapter();
    if (adapter) adapter.setSpeed(spd);
    handleStateChange({ playbackSpeed: spd });
    PlayerPreferencesStore.set({ speed: spd });
  }, [handleStateChange]);

  const handleUpdatePreferences = useCallback((prefs: Partial<PlayerPreferences>) => {
    const updated = PlayerPreferencesStore.set(prefs);
    setPreferences(updated);
  }, []);

  const handleUpdateSubtitleStyles = useCallback((styles: Partial<PlayerPreferences['subtitleStyles']>) => {
    const current = PlayerPreferencesStore.get();
    const updatedStyles = { ...current.subtitleStyles, ...styles };
    const updated = PlayerPreferencesStore.set({ subtitleStyles: updatedStyles });
    setPreferences(updated);
  }, []);

  // Fullscreen Handler
  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      try {
        await el.requestFullscreen();
        handleStateChange({ isFullscreen: true });
      } catch {
        handleStateChange({ isFullscreen: true });
      }
    } else {
      try {
        await document.exitFullscreen();
        handleStateChange({ isFullscreen: false });
      } catch {
        handleStateChange({ isFullscreen: false });
      }
    }
  }, [handleStateChange]);

  // Sync fullscreen change event
  useEffect(() => {
    const onFsChange = () => {
      handleStateChange({ isFullscreen: Boolean(document.fullscreenElement) });
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [handleStateChange]);

  // Theater Mode Handler
  const toggleTheaterMode = useCallback(() => {
    const nextTheater = !state.isTheaterMode;
    handleStateChange({ isTheaterMode: nextTheater });
    PlayerPreferencesStore.set({ theaterMode: nextTheater });
  }, [state.isTheaterMode, handleStateChange]);

  // Picture in Picture
  const togglePip = useCallback(async () => {
    if (videoRef.current && document.pictureInPictureEnabled) {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        handleStateChange({ isPip: false });
      } else {
        await videoRef.current.requestPictureInPicture();
        handleStateChange({ isPip: true });
      }
    }
  }, [handleStateChange]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, state.volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, state.volume - 0.1));
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          void toggleFullscreen();
          break;
        case 't':
        case 'T':
          e.preventDefault();
          toggleTheaterMode();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
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
  }, [togglePlay, seekRelative, handleVolumeChange, toggleFullscreen, toggleTheaterMode, toggleMute, state.volume, state.isFullscreen]);

  // Touch & Double-Tap Detection for Mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    const touch = e.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = touch.clientX - rect.left;
    const width = rect.width;

    if (now - lastTapTimeRef.current < 280) {
      // Double tap detected!
      if (x < width * 0.35) {
        // Left double tap: -10s
        seekRelative(-10);
        setDoubleTapFeedback({ side: 'left', count: 1 });
      } else if (x > width * 0.65) {
        // Right double tap: +10s
        seekRelative(10);
        setDoubleTapFeedback({ side: 'right', count: 1 });
      }

      if (doubleTapTimeoutRef.current) clearTimeout(doubleTapTimeoutRef.current);
      doubleTapTimeoutRef.current = setTimeout(() => setDoubleTapFeedback(null), 800);
    } else {
      // Single tap: toggle controls
      setControlsVisible((prev) => !prev);
    }
    lastTapTimeRef.current = now;
  };

  // Skip Intro (+85s)
  const handleSkipIntro = () => {
    seekRelative(85);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      aria-label="Universal Video Player"
      className={`relative bg-black flex items-center justify-center overflow-hidden select-none transition-all duration-300 ${
        state.isFullscreen
          ? 'fixed inset-0 z-[9999] w-screen h-[100dvh] m-0 p-0'
          : state.isTheaterMode
          ? 'w-full aspect-[21/9] max-h-[85vh] min-h-[380px] shadow-2xl'
          : 'w-full aspect-video max-h-[75vh] sm:max-h-[80vh] min-h-[220px] sm:min-h-[360px] md:min-h-[480px] rounded-2xl shadow-2xl border border-white/10'
      }`}
    >
      {/* ── 1. Video / Iframe Stream Element ── */}
      {source.type === 'embed' ? (
        <iframe
          key={source.url}
          ref={iframeRef}
          src={source.url}
          className="w-full h-full border-0 absolute inset-0 bg-black"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          referrerPolicy="no-referrer"
          title="Streaming Player"
        />
      ) : (
        <video
          key={source.url}
          ref={videoRef}
          playsInline
          autoPlay={preferences.autoPlay}
          className="w-full h-full object-contain absolute inset-0 bg-black"
        />
      )}

      {/* ── 2. Top Header HUD Overlay ── */}
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
          seekTo(state.currentTime);
        }}
        onSkipIntro={handleSkipIntro}
        hasIntro={Boolean(source.skipTimestamps?.intro || episode)}
      />

      {/* ── 3. Center Controls (Play, Seek, Prev/Next) ── */}
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

      {/* ── 4. Bottom Control Deck (Timeline, Audio, Subtitles, Quality, Server, Speed) ── */}
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
        onTogglePip={source.type !== 'embed' ? togglePip : undefined}
        preferences={preferences}
        onUpdatePreferences={handleUpdatePreferences}
        visible={controlsVisible}
        accentColor={accentColor}
      />

      {/* ── 5. Status & Loading Overlay ── */}
      {(state.loading || isLoadingSource) && !state.error && !externalError && (
        <PlayerLoadingOverlay statusMessage={state.statusMessage} />
      )}

      {/* ── 6. Error & Recovery Overlay ── */}
      {(state.error || externalError) && (
        <PlayerErrorOverlay
          error={state.error || externalError || 'Playback unavailable'}
          onTryNextServer={() => onNextServerFallback(true)}
          onSwitchToSub={() => handleSelectAudio('sub')}
          onRetry={onRetry || (() => seekTo(state.currentTime))}
          isDubActive={state.activeAudioTrack !== 'sub'}
        />
      )}

      {/* ── 7. Resume Watching Modal ── */}
      {showResumePrompt && (
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

      {/* ── 8. Next Episode Auto-Countdown Overlay ── */}
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
