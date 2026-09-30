import { NormalizedPlaybackSource, PlayerState } from '../types';

export interface PlayerAdapterCallbacks {
  onStateChange: (state: Partial<PlayerState>) => void;
  onError: (error: string) => void;
  onEnded: () => void;
  onFallbackNeeded: (reason: string) => void;
}

export interface PlayerAdapter {
  readonly type: string;
  initialize(
    container: HTMLElement,
    mediaElement: HTMLVideoElement | HTMLIFrameElement,
    source: NormalizedPlaybackSource,
    callbacks: PlayerAdapterCallbacks,
    initialTime?: number
  ): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  seekTo(seconds: number): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  setSpeed(speed: number): void;
  setQuality(qualityId: string): void;
  setAudioTrack(trackId: string): void;
  setSubtitleTrack(trackId: string): void;
  destroy(): void;
}
