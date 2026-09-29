/**
 * Provider Audio Capability Matrix
 * Lumina Media Engine
 *
 * Defines authoritative audio and dub capabilities for each supported streaming provider.
 */

export interface ProviderAudioCapability {
  id: string;
  name: string;
  mediaTypes: ('movie' | 'tv' | 'anime')[];
  supportsSub: boolean;
  supportsOriginalAudio: boolean;
  supportedDubLanguages: string[]; // ISO 639-1: 'en', 'hi', 'ta', 'te', 'bn', etc.
  notes?: string;
}

export const PROVIDER_AUDIO_CAPABILITIES: Record<string, ProviderAudioCapability> = {
  'vidsrc-anime': {
    id: 'vidsrc-anime',
    name: 'AnimeStream HD',
    mediaTypes: ['anime'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en'],
    notes: 'Dedicated anime player supporting Japanese SUB and English DUB.',
  },
  'vidsrc-mirror': {
    id: 'vidsrc-mirror',
    name: 'Vidsrc Mirror',
    mediaTypes: ['movie', 'tv', 'anime'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en'],
  },
  'vidfast-anime': {
    id: 'vidfast-anime',
    name: 'VidFast Anime',
    mediaTypes: ['anime'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en'],
    notes: 'Fast HLS anime stream.',
  },
  'screenscape-anime': {
    id: 'screenscape-anime',
    name: 'ScreenScape Anime',
    mediaTypes: ['anime'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en', 'hi'],
  },
  'rivestream-anime': {
    id: 'rivestream-anime',
    name: 'RiveStream Anime',
    mediaTypes: ['anime'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en'],
  },
  '111movies-anime': {
    id: '111movies-anime',
    name: '111Movies Anime',
    mediaTypes: ['anime'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en'],
  },
  screenscape: {
    id: 'screenscape',
    name: 'ScreenScape',
    mediaTypes: ['movie', 'tv'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['hi', 'en', 'ta', 'te', 'bn'],
    notes: 'Multi-Audio server with authentic Indian regional and Hindi dubs.',
  },
  vidfast: {
    id: 'vidfast',
    name: 'VidFast HD',
    mediaTypes: ['movie', 'tv'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en'],
    notes: 'Fast HLS stream for Movies and TV shows.',
  },
  vidsrc: {
    id: 'vidsrc',
    name: 'Vidsrc HD',
    mediaTypes: ['movie', 'tv'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en'],
  },
  rivestream: {
    id: 'rivestream',
    name: 'VidSrc.net HD',
    mediaTypes: ['movie', 'tv'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en'],
  },
  '111movies': {
    id: '111movies',
    name: '111Movies',
    mediaTypes: ['movie', 'tv'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en'],
  },
  'vidsrc-me': {
    id: 'vidsrc-me',
    name: 'VidSrc.me',
    mediaTypes: ['movie', 'tv', 'anime'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en'],
    notes: 'Ad-free, reliable, iframe-friendly. Great multi-subtitle support.',
  },
  'vidsrc-net': {
    id: 'vidsrc-net',
    name: 'VidSrc.net',
    mediaTypes: ['movie', 'tv'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en'],
  },
  videasy: {
    id: 'videasy',
    name: 'Videasy HD',
    mediaTypes: ['movie', 'tv'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en'],
    notes: 'Premium built-in player. Multi-subtitle. Clean UI.',
  },
  'videasy-anime': {
    id: 'videasy-anime',
    name: 'Videasy Anime',
    mediaTypes: ['anime'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en'],
    notes: 'Premium anime player. Uses AniList ID for best episode mapping.',
  },
  multiembed: {
    id: 'multiembed',
    name: 'MultiEmbed',
    mediaTypes: ['movie', 'tv'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en', 'hi'],
    notes: 'Huge catalog. Multi-audio support.',
  },
};

/**
 * Get all providers that support a specific dub language for a given media type.
 */
export function getProvidersForDubLanguage(
  languageCode: string,
  mediaType: 'movie' | 'tv' | 'anime' = 'movie'
): string[] {
  const normLang = languageCode.toLowerCase().trim();
  const matched: string[] = [];

  for (const [providerId, cap] of Object.entries(PROVIDER_AUDIO_CAPABILITIES)) {
    if (cap.mediaTypes.includes(mediaType) && cap.supportedDubLanguages.includes(normLang)) {
      matched.push(providerId);
    }
  }

  return matched;
}

/**
 * Check whether any supported provider can stream a dub in the specified language.
 */
export function isDubLanguageSupportedByProviders(
  languageCode: string,
  mediaType: 'movie' | 'tv' | 'anime' = 'movie'
): boolean {
  return getProvidersForDubLanguage(languageCode, mediaType).length > 0;
}
