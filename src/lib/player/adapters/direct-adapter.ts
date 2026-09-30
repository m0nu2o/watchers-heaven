import { PlayerAdapter, PlayerAdapterCallbacks } from './base';
import { NormalizedPlaybackSource, PlayerQualityLevel } from '../types';

export class DirectAdapter implements PlayerAdapter {
  readonly type = 'direct';
  private video: HTMLVideoElement | null = null;
  private callbacks: PlayerAdapterCallbacks | null = null;
  private cleanups: (() => void)[] = [];

  async initialize(
    container: HTMLElement,
    mediaElement: HTMLVideoElement | HTMLIFrameElement,
    source: NormalizedPlaybackSource,
    callbacks: PlayerAdapterCallbacks,
    initialTime = 0
  ): Promise<void> {
    this.callbacks = callbacks;

    if (!(mediaElement instanceof HTMLVideoElement)) {
      callbacks.onError('DirectAdapter requires an HTMLVideoElement');
      return;
    }
    this.video = mediaElement;

    callbacks.onStateChange({ loading: true, buffering: true, statusMessage: 'Loading video stream...' });

    // Set src and initial properties
    this.video.src = source.url;

    // Build qualities
    const qualities: PlayerQualityLevel[] = [
      { id: 'direct', label: source.quality || 'Direct 1080p' },
    ];

    callbacks.onStateChange({
      availableQualities: qualities,
      quality: 'direct',
      availableAudioTracks: source.audioTracks || [],
      availableSubtitleTracks: source.subtitleTracks || [{ id: 'off', label: 'Off' }],
    });

    const video = this.video;

    const onLoadedMetadata = () => {
      callbacks.onStateChange({
        loading: false,
        duration: video.duration || 0,
        statusMessage: null,
      });
      if (initialTime > 0) {
        video.currentTime = initialTime;
      }
    };

    const onPlay = () => callbacks.onStateChange({ playing: true, paused: false });
    const onPause = () => callbacks.onStateChange({ playing: false, paused: true });
    const onWaiting = () => callbacks.onStateChange({ buffering: true });
    const onPlaying = () => callbacks.onStateChange({ buffering: false, loading: false });

    const onTimeUpdate = () => {
      if (!video) return;
      const cur = video.currentTime;
      const dur = video.duration || 0;
      let buffered = 0;
      if (video.buffered.length > 0) {
        buffered = video.buffered.end(video.buffered.length - 1);
      }
      const bufferedPercent = dur > 0 ? Math.min(100, (buffered / dur) * 100) : 0;

      callbacks.onStateChange({
        currentTime: cur,
        duration: dur,
        bufferedTime: buffered,
        bufferedPercent,
      });
    };

    const onVolumeChange = () => {
      callbacks.onStateChange({ volume: video.volume, muted: video.muted });
    };

    const onEnded = () => {
      callbacks.onStateChange({ playing: false, paused: true });
      callbacks.onEnded();
    };

    const onError = () => {
      callbacks.onFallbackNeeded('Direct media stream error');
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);

    this.cleanups.push(() => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
    });
  }

  async play(): Promise<void> {
    if (this.video) {
      await this.video.play();
    }
  }

  pause(): void {
    if (this.video) {
      this.video.pause();
    }
  }

  seekTo(seconds: number): void {
    if (this.video) {
      this.video.currentTime = Math.max(0, Math.min(seconds, this.video.duration || seconds));
    }
  }

  setVolume(volume: number): void {
    if (this.video) {
      this.video.volume = Math.max(0, Math.min(1, volume));
      this.video.muted = volume === 0;
    }
  }

  setMuted(muted: boolean): void {
    if (this.video) {
      this.video.muted = muted;
    }
  }

  setSpeed(speed: number): void {
    if (this.video) {
      this.video.playbackRate = speed;
      this.callbacks?.onStateChange({ playbackSpeed: speed });
    }
  }

  setQuality(_qualityId: string): void {
    // Single direct stream quality
  }

  setAudioTrack(_trackId: string): void {
    // Direct file has embedded audio track
  }

  setSubtitleTrack(trackId: string): void {
    if (!this.video) return;
    const tracks = this.video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = trackId === 'off' ? 'disabled' : i.toString() === trackId ? 'showing' : 'disabled';
    }
    this.callbacks?.onStateChange({ activeSubtitleTrack: trackId });
  }

  destroy(): void {
    this.cleanups.forEach((c) => c());
    this.cleanups = [];

    if (this.video) {
      this.video.removeAttribute('src');
      this.video.load();
      this.video = null;
    }
    this.callbacks = null;
  }
}
