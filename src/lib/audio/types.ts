/**
 * Normalized Multilingual Audio & Subtitle Types
 * Lumina Media Engine
 */

import type { AudioTrack, AudioTrackType, MediaType } from '@/types/media';

export type { AudioTrack, AudioTrackType, MediaType };


export interface SubtitleTrack {
  code: string; // e.g. 'en', 'hi', 'es', 'fr'
  language: string; // e.g. 'English', 'Hindi', 'Spanish'
  label: string; // e.g. 'English Subtitles'
  url?: string;
}

export interface EpisodeAudioAvailability {
  mediaId: string | number;
  mediaType: 'movie' | 'tv' | 'anime';
  season?: number;
  episode?: number;
  originalLanguage: string;
  originalLanguageName: string;
  tracks: AudioTrack[];
  subtitles: SubtitleTrack[];
  timestamp: number;
}

export interface NormalizedAudioAvailability {
  sub: boolean;
  dub: {
    en: boolean;
    hi: boolean;
    ta: boolean;
    te: boolean;
    bn: boolean;
    [lang: string]: boolean;
  };
  originalLanguage: string;
  isOriginalHindi: boolean;
  isOriginalEnglish: boolean;
  verified: boolean;
  providers: {
    en: string[];
    hi: string[];
    ta?: string[];
    te?: string[];
    bn?: string[];
    [lang: string]: string[] | undefined;
  };
}

export interface GetContentAudioAvailabilityParams {
  id: string | number;
  mediaType?: 'movie' | 'tv' | 'anime';
  season?: number;
  episode?: number;
  originalLanguage?: string;
  title?: string;
  aniListId?: number | null;
}
