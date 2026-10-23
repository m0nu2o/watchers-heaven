import { PlayerAdapter, PlayerAdapterCallbacks } from './base';
import { NormalizedPlaybackSource, PlayerQualityLevel } from '../types';

export class EmbedAdapter implements PlayerAdapter {
  readonly type = 'embed';
  private iframe: HTMLIFrameElement | null = null;
  private callbacks: PlayerAdapterCallbacks | null = null;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private cleanups: (() => void)[] = [];
  private currentTime = 0;
  private duration = 0;
  private isConfirmedPlaying = false;

  async initialize(
    container: HTMLElement,
    mediaElement: HTMLVideoElement | HTMLIFrameElement,
    source: NormalizedPlaybackSource,
    callbacks: PlayerAdapterCallbacks,
    initialTime = 0
  ): Promise<void> {
    this.callbacks = callbacks;
    this.currentTime = initialTime;
    this.isConfirmedPlaying = false;

    if (!(mediaElement instanceof HTMLIFrameElement)) {
      callbacks.onError('EmbedAdapter requires an HTMLIFrameElement');
      return;
    }
    this.iframe = mediaElement;

    callbacks.onStateChange({
      loading: true,
      buffering: true,
      statusMessage: `Connecting to ${source.providerName || 'Server'}...`,
      availableQualities: source.qualities || [{ id: '1080p', label: source.quality || '1080p HD' }],
      availableAudioTracks: source.audioTracks || [],
      availableSubtitleTracks: source.subtitleTracks || [{ id: 'off', label: 'Off' }],
    });

    // Set iframe attributes
    if (this.iframe.src !== source.url) {
      this.iframe.src = source.url;
    }
    this.iframe.allowFullscreen = true;
    this.iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
    this.iframe.referrerPolicy = 'no-referrer';

    // Connection watchdog (15s): If iframe fails to load its document within 15s, trigger fallback
    this.watchdogTimer = setTimeout(() => {
      if (!this.isConfirmedPlaying) {
        console.warn(`[EmbedAdapter] Server "${source.providerName}" did not respond within 15s. Requesting fallback.`);
        callbacks.onFallbackNeeded('Server connection timed out');
      }
    }, 15000);

    const onLoad = () => {
      // Clear connection watchdog immediately once iframe DOM finishes loading
      if (this.watchdogTimer) {
        clearTimeout(this.watchdogTimer);
        this.watchdogTimer = null;
      }
      callbacks.onStateChange({ loading: false, buffering: false, statusMessage: null });
    };

    const onError = () => {
      if (this.watchdogTimer) {
        clearTimeout(this.watchdogTimer);
        this.watchdogTimer = null;
      }
      callbacks.onFallbackNeeded('Embed server frame error');
    };

    this.iframe.addEventListener('load', onLoad);
    this.iframe.addEventListener('error', onError);

    // Cross-window postMessage bridge for compatible embed players
    const onWindowMessage = (event: MessageEvent) => {
      let data: Record<string, unknown> | null = null;
      if (typeof event.data === 'string') {
        try {
          data = JSON.parse(event.data);
        } catch {
          // Non-JSON message, ignore
        }
      } else if (typeof event.data === 'object' && event.data !== null) {
        data = event.data as Record<string, unknown>;
      }

      if (!data) return;

      // Only confirm playback from messages with recognizable video player data.
      // Ad scripts and unrelated messages must NOT dismiss the watchdog.
      const isVideoMessage =
        typeof data.currentTime === 'number' ||
        typeof data.playing === 'boolean' ||
        data.event === 'play' ||
        data.event === 'playing' ||
        data.event === 'timeupdate' ||
        data.event === 'ended' ||
        data.type === 'ended' ||
        (typeof data.timestamp === 'number' && data.timestamp > 0);

      if (isVideoMessage && !this.isConfirmedPlaying) {
        this.isConfirmedPlaying = true;
        if (this.watchdogTimer) {
          clearTimeout(this.watchdogTimer);
          this.watchdogTimer = null;
        }
      }

      // Handle VidSync / Playerjs / VidLink timeupdate & play events
      if (typeof data.currentTime === 'number') {
        this.currentTime = data.currentTime;
        const dur = typeof data.duration === 'number' ? data.duration : this.duration;
        this.duration = dur;
        callbacks.onStateChange({
          currentTime: this.currentTime,
          duration: this.duration,
          bufferedPercent: dur > 0 ? (this.currentTime / dur) * 100 : 0,
        });
      }

      if (typeof data.playing === 'boolean') {
        callbacks.onStateChange({ playing: data.playing, paused: !data.playing });
      }

      if (data.event === 'ended' || data.type === 'ended') {
        callbacks.onEnded();
      }
    };

    window.addEventListener('message', onWindowMessage);

    this.cleanups.push(() => {
      mediaElement.removeEventListener('load', onLoad);
      mediaElement.removeEventListener('error', onError);
      window.removeEventListener('message', onWindowMessage);
    });
  }

  async play(): Promise<void> {
    this.postToIframe({ type: 'PLAYER_COMMAND', action: 'play' });
    this.postToIframe({ type: 'VIDSYNC_PLAYER_COMMAND', action: 'play' });
    this.postToIframe({ event: 'command', func: 'playVideo' });
    this.callbacks?.onStateChange({ playing: true, paused: false });
  }

  pause(): void {
    this.postToIframe({ type: 'PLAYER_COMMAND', action: 'pause' });
    this.postToIframe({ type: 'VIDSYNC_PLAYER_COMMAND', action: 'pause' });
    this.postToIframe({ event: 'command', func: 'pauseVideo' });
    this.callbacks?.onStateChange({ playing: false, paused: true });
  }

  seekTo(seconds: number): void {
    this.currentTime = seconds;
    this.postToIframe({ type: 'PLAYER_COMMAND', action: 'seek', time: seconds });
    this.postToIframe({ type: 'VIDSYNC_PLAYER_COMMAND', action: 'seek', time: seconds });
    this.postToIframe({ event: 'command', func: 'seekTo', args: [seconds, true] });
    this.postToIframe({ type: 'seek', value: seconds });
    this.callbacks?.onStateChange({ currentTime: seconds });
  }

  setVolume(volume: number): void {
    this.postToIframe({ type: 'PLAYER_COMMAND', action: 'setVolume', value: volume });
    this.postToIframe({ event: 'command', func: 'setVolume', args: [volume * 100] });
    this.callbacks?.onStateChange({ volume, muted: volume === 0 });
  }

  setMuted(muted: boolean): void {
    this.postToIframe({ type: 'PLAYER_COMMAND', action: 'setMute', value: muted });
    this.callbacks?.onStateChange({ muted });
  }

  setSpeed(speed: number): void {
    this.postToIframe({ type: 'PLAYER_COMMAND', action: 'setPlaybackRate', value: speed });
    this.callbacks?.onStateChange({ playbackSpeed: speed });
  }

  setQuality(_qualityId: string): void {
    // Handled by embed provider selector or server switcher
  }

  setAudioTrack(_trackId: string): void {
    // Managed at server / URL parameter level
  }

  setSubtitleTrack(_trackId: string): void {
    // Managed by embed internal menu or URL parameter
  }

  private postToIframe(message: unknown): void {
    if (this.iframe?.contentWindow) {
      try {
        this.iframe.contentWindow.postMessage(message, '*');
      } catch {
        // Cross-origin restriction ignore
      }
    }
  }

  destroy(): void {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    this.cleanups.forEach((c) => c());
    this.cleanups = [];

    if (this.iframe) {
      this.iframe.src = 'about:blank';
      this.iframe = null;
    }
    this.callbacks = null;
  }
}
