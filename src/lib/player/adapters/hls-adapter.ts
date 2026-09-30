import Hls from 'hls.js';
import { PlayerAdapter, PlayerAdapterCallbacks } from './base';
import { NormalizedPlaybackSource, PlayerQualityLevel, PlayerAudioTrack, PlayerSubtitleTrack } from '../types';

export class HlsAdapter implements PlayerAdapter {
  readonly type = 'hls';
  private hls: Hls | null = null;
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
      callbacks.onError('HlsAdapter requires an HTMLVideoElement');
      return;
    }
    this.video = mediaElement;

    callbacks.onStateChange({ loading: true, buffering: true, statusMessage: 'Connecting HLS stream...' });

    // 1. Check Hls.js support
    if (Hls.isSupported()) {
      const hls = new Hls({
        capLevelToPlayerSize: true,
        autoStartLoad: true,
        startLevel: -1, // Auto
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      this.hls = hls;

      hls.attachMedia(this.video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(source.url);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        // Build real available qualities
        const qualities: PlayerQualityLevel[] = [
          { id: 'auto', label: 'Auto' },
          ...data.levels.map((lvl, index) => {
            const h = lvl.height || 0;
            const label = h >= 1080 ? '1080p' : h >= 720 ? '720p' : h >= 480 ? '480p' : h > 0 ? `${h}p` : `Level ${index + 1}`;
            return {
              id: String(index),
              label,
              height: lvl.height,
              width: lvl.width,
              bitrate: lvl.bitrate,
              index,
            };
          }),
        ];

        // Build real audio tracks from manifest
        const audioTracks: PlayerAudioTrack[] = hls.audioTracks.map((t, idx) => ({
          id: String(idx),
          label: t.name || `Track ${idx + 1}`,
          language: t.lang || t.name || 'Audio',
          languageCode: t.lang || 'en',
          isOriginal: idx === 0,
        }));

        // Build real subtitle tracks
        const subtitleTracks: PlayerSubtitleTrack[] = [
          { id: 'off', label: 'Off' },
          ...hls.subtitleTracks.map((st, idx) => ({
            id: String(idx),
            label: st.name || st.lang || `Sub ${idx + 1}`,
            language: st.lang,
          })),
        ];

        callbacks.onStateChange({
          loading: false,
          availableQualities: qualities,
          availableAudioTracks: audioTracks.length > 0 ? audioTracks : source.audioTracks || [],
          availableSubtitleTracks: subtitleTracks,
          activeAudioTrack: audioTracks.length > 0 ? String(hls.audioTrack) : '0',
          quality: 'auto',
          statusMessage: null,
        });

        if (initialTime > 0 && this.video) {
          this.video.currentTime = initialTime;
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const currentLevel = hls.levels[data.level];
        if (currentLevel) {
          const h = currentLevel.height;
          callbacks.onStateChange({
            quality: h ? `${h}p` : String(data.level),
          });
        }
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
        callbacks.onStateChange({ activeAudioTrack: String(data.id) });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[HLS] Fatal network error, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HLS] Fatal media error, recovering...');
              hls.recoverMediaError();
              break;
            default:
              console.error('[HLS] Unrecoverable error:', data);
              hls.destroy();
              callbacks.onFallbackNeeded('HLS stream failed to play');
              break;
          }
        }
      });
    } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple Safari HLS
      this.video.src = source.url;
    } else {
      callbacks.onFallbackNeeded('Browser does not support HLS playback');
      return;
    }

    // Attach native HTML5 video event listeners
    const video = this.video;

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

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('ended', onEnded);

    this.cleanups.push(() => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('ended', onEnded);
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

  setQuality(qualityId: string): void {
    if (!this.hls) return;
    if (qualityId === 'auto') {
      this.hls.currentLevel = -1;
      this.callbacks?.onStateChange({ quality: 'auto' });
    } else {
      const lvlIndex = parseInt(qualityId, 10);
      if (!isNaN(lvlIndex)) {
        this.hls.currentLevel = lvlIndex;
        const lvl = this.hls.levels[lvlIndex];
        this.callbacks?.onStateChange({ quality: lvl?.height ? `${lvl.height}p` : qualityId });
      }
    }
  }

  setAudioTrack(trackId: string): void {
    if (!this.hls) return;
    const trackIndex = parseInt(trackId, 10);
    if (!isNaN(trackIndex)) {
      this.hls.audioTrack = trackIndex;
    }
  }

  setSubtitleTrack(trackId: string): void {
    if (!this.hls) return;
    if (trackId === 'off') {
      this.hls.subtitleTrack = -1;
      this.callbacks?.onStateChange({ activeSubtitleTrack: 'off' });
    } else {
      const subIndex = parseInt(trackId, 10);
      if (!isNaN(subIndex)) {
        this.hls.subtitleTrack = subIndex;
        this.callbacks?.onStateChange({ activeSubtitleTrack: trackId });
      }
    }
  }

  destroy(): void {
    this.cleanups.forEach((c) => c());
    this.cleanups = [];

    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.video) {
      this.video.removeAttribute('src');
      this.video.load();
      this.video = null;
    }
    this.callbacks = null;
  }
}
