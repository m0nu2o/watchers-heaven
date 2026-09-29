/**
 * Lumina Streaming Engine - Core Types
 */

export type MediaType = 'movie' | 'tv' | 'anime';

export type StreamType = 'iframe' | 'hls' | 'dash';

export type ProviderHealthStatus = 'healthy' | 'degraded' | 'failed';

export interface SubtitleTrack {
  label: string;
  file: string;
  kind?: string;
  default?: boolean;
}

export interface SkipTimestamps {
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

export interface StreamSource {
  providerId: string;
  providerName: string;
  quality: string;
  badge: string;
  url: string;
  type: StreamType;
  isHealthy: boolean;
  subtitles?: SubtitleTrack[];
  skipTimestamps?: SkipTimestamps;
  error?: string;
}

export interface ServerHealthInfo {
  id: string;
  name: string;
  quality: string;
  badge: string;
  status: ProviderHealthStatus;
  latencyMs?: number;
  lastChecked?: number;
}

export interface StreamPlaybackConfig {
  mediaType: MediaType;
  tmdbId: string | number;
  season?: number;
  episode?: number;
  title?: string;
  aniListId?: number | null;
  malId?: number | null;
  audioTrackId?: string; // 'sub', 'dub-en', 'dub-hi', etc.
  audioLanguageCode?: string;
  originalLanguage?: string;
  preferredProvider?: string;
  accentColor?: string;
  startTime?: number;
}

export interface StreamingProvider {
  id: string;
  name: string;
  quality: string;
  badge: string;
  priority: number; // lower number = higher priority
  supportsMovie: boolean;
  supportsTV: boolean;
  supportsAnime: boolean;
  supportsHindiDub?: boolean;
  supportsEnglishDub?: boolean;
  getPlaybackUrl: (config: StreamPlaybackConfig) => string;
}
