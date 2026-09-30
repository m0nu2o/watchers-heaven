/**
 * Universal Streaming Player - Core Types & Interfaces
 */

export type PlaybackStreamType = 'hls' | 'dash' | 'direct' | 'embed';

export interface PlayerQualityLevel {
  id: string; // 'auto', '1080p', '720p', etc.
  label: string;
  bitrate?: number;
  width?: number;
  height?: number;
  index?: number;
}

export interface PlayerAudioTrack {
  id: string; // 'sub', 'dub-en', 'dub-hi', or index
  label: string;
  language: string;
  languageCode: string;
  isOriginal?: boolean;
  available?: boolean;
}

export interface PlayerSubtitleTrack {
  id: string; // 'off', or url/index
  label: string;
  language?: string;
  file?: string;
  kind?: string;
  default?: boolean;
}

export interface PlayerSkipTimestamps {
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

export interface SubtitleStyleSettings {
  fontSize: 'small' | 'medium' | 'large';
  color: string; // '#ffffff', '#ffff00', etc.
  backgroundColor: string; // 'transparent', 'rgba(0,0,0,0.6)', etc.
  textShadow: boolean;
}

export interface PlayerPreferences {
  preferredAudio?: string;
  preferredSubtitle?: string;
  preferredQuality?: string;
  speed: number;
  volume: number;
  muted: boolean;
  autoPlay: boolean;
  autoNext: boolean;
  autoSkipIntro: boolean;
  theaterMode: boolean;
  subtitleStyles: SubtitleStyleSettings;
}

export interface NormalizedPlaybackSource {
  sourceId: string;
  providerId: string;
  providerName: string;
  type: PlaybackStreamType;
  url: string;
  headers?: Record<string, string>;
  quality?: string;
  isDirect: boolean;
  supportsSeek: boolean;
  qualities?: PlayerQualityLevel[];
  audioTracks?: PlayerAudioTrack[];
  subtitleTracks?: PlayerSubtitleTrack[];
  skipTimestamps?: PlayerSkipTimestamps;
  duration?: number;
}

export interface PlayerState {
  playing: boolean;
  paused: boolean;
  buffering: boolean;
  loading: boolean;
  currentTime: number;
  duration: number;
  bufferedTime: number;
  bufferedPercent: number;
  volume: number;
  muted: boolean;
  playbackSpeed: number;
  quality: string;
  availableQualities: PlayerQualityLevel[];
  activeAudioTrack: string;
  availableAudioTracks: PlayerAudioTrack[];
  activeSubtitleTrack: string;
  availableSubtitleTracks: PlayerSubtitleTrack[];
  isFullscreen: boolean;
  isTheaterMode: boolean;
  isPip: boolean;
  error: string | null;
  statusMessage: string | null;
}

export type PlayerEventCallback = (state: Partial<PlayerState>) => void;
