/**
 * Lumina - Canonical Media & Provider Identity Types
 */

export type MediaType = 'movie' | 'tv' | 'anime';

export interface AnimeIdentity {
  tmdbId?: string | number | null;
  aniListId?: number | null;
  malId?: number | null;
  title?: string | null;
}

export interface AniListMediaDetails {
  id: number;
  malId: number | null;
  hasEnglishDub: boolean;
  spokenLanguages: string[];
}

export type AudioTrackType = 'sub' | 'dub';

export interface AudioTrack {
  id: string; // e.g. 'sub', 'dub-en', 'dub-hi'
  language: string; // e.g. 'Japanese', 'English', 'Hindi'
  languageCode: string; // e.g. 'ja', 'en', 'hi'
  type: AudioTrackType; // 'sub' or 'dub'
  label: string; // UI label: 'SUB (Japanese)', 'English Dub', 'Hindi Dub'
  provider: string; // Provider ID serving this track
  url?: string;
  sourceId?: string;
  available: boolean;
  isOriginal: boolean;
}

export interface MediaPlaybackConfig {
  mediaType: MediaType;
  tmdbId: string | number;
  season?: number;
  episode?: number;
  title?: string;
  poster?: string;
  provider?: string;
  aniListId?: number | null;
  malId?: number | null;
  audioTrack?: 'original' | 'hindi' | 'english';
  audioTrackId?: string; // 'sub', 'dub-en', 'dub-hi', etc.
  audioLanguageCode?: string; // 'ja', 'en', 'hi', etc.
  accentColor?: string;
  startTime?: number;
}

export interface ProviderAdapter {
  id: string;
  name: string;
  quality: string;
  badge?: string;
  supportsMovie: boolean;
  supportsTV: boolean;
  supportsAnime: boolean;
  requiresApiKey: boolean;
  isConfigured: () => boolean;
  getPlaybackUrl: (config: MediaPlaybackConfig) => string;
  isDirectHls?: boolean;
  isHindiPriority?: boolean;
}

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

export interface ResolveAudioSourceResult {
  success: boolean;
  available: boolean;
  provider?: string;
  url?: string;
  isHls?: boolean;
  track?: AudioTrack;
  error?: string;
  fallbackTrack?: string;
  subtitles?: SubtitleTrack[];
  skipTimestamps?: SkipTimestamps;
}
