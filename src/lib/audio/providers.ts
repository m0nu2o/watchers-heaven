/**
 * Provider Audio Capability Matrix
 * AuraStream Media Engine
 *
 * Defines authoritative audio and dub capabilities for each supported streaming provider.
 * Aligned 100% with PROVIDER_ADAPTERS in src/lib/providers/index.ts.
 */

export interface ProviderAudioCapability {
  id: string;
  name: string;
  mediaTypes: ('movie' | 'tv' | 'anime')[];
  supportsSub: boolean;
  supportsOriginalAudio: boolean;
  supportedDubLanguages: string[]; // ISO 639-1: 'en', 'hi', 'ta', 'te', etc.
  notes?: string;
}

export const PROVIDER_AUDIO_CAPABILITIES: Record<string, ProviderAudioCapability> = {
  // ─── 1. Dedicated Anime Providers ───
  'vidlink-anime': {
    id: 'vidlink-anime',
    name: 'VidLink Anime HD',
    mediaTypes: ['anime'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en'],
    notes: 'Dedicated anime player supporting Japanese SUB and English DUB via ?dub=true.',
  },
  'vidsrc-pm-anime': {
    id: 'vidsrc-pm-anime',
    name: 'VidSrc Ultra Anime',
    mediaTypes: ['anime'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: [],
    notes: 'High-speed anime CDN, SUB priority.',
  },
  'autoembed-co-anime': {
    id: 'autoembed-co-anime',
    name: 'AutoEmbed Anime',
    mediaTypes: ['anime'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: [],
    notes: 'Fast anime mirror, SUB priority.',
  },
  '2embed-skin-anime': {
    id: '2embed-skin-anime',
    name: '2Embed Anime',
    mediaTypes: ['anime'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: [],
    notes: 'Deep anime catalog, SUB priority.',
  },
  'screenscape-anime': {
    id: 'screenscape-anime',
    name: 'ScreenScape Anime',
    mediaTypes: ['anime'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en', 'hi'],
    notes: 'Multi-audio anime server with verified English and Hindi dub options where available.',
  },
  'vidsrc-su-anime': {
    id: 'vidsrc-su-anime',
    name: 'VidSrc Direct Anime',
    mediaTypes: ['anime'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: [],
    notes: 'Direct anime stream, SUB priority.',
  },

  // ─── 2. Movies & TV Series Providers ───
  vidlink: {
    id: 'vidlink',
    name: 'VidLink HD',
    mediaTypes: ['movie', 'tv'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en'],
    notes: 'Clean 1080p stream for movies and TV series, English original/dub.',
  },
  'vidsrc-pm': {
    id: 'vidsrc-pm',
    name: 'VidSrc Ultra HD',
    mediaTypes: ['movie', 'tv'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en'],
    notes: 'Global CDN, high uptime, English original/dub.',
  },
  'autoembed-co': {
    id: 'autoembed-co',
    name: 'AutoEmbed HD',
    mediaTypes: ['movie', 'tv'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en', 'hi'],
    notes: 'Multi-language server supporting English and Hindi dub tracks where available.',
  },
  screenscape: {
    id: 'screenscape',
    name: 'ScreenScape HD',
    mediaTypes: ['movie', 'tv'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en', 'hi'],
    notes: 'Multi-audio server with verified Hindi and English dub options.',
  },
  '2embed-skin': {
    id: '2embed-skin',
    name: '2Embed Direct',
    mediaTypes: ['movie', 'tv'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en'],
    notes: 'Wide catalog of movies and series.',
  },
  'vidsrc-su': {
    id: 'vidsrc-su',
    name: 'VidSrc Direct HD',
    mediaTypes: ['movie', 'tv'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en'],
    notes: 'Direct 1080p stream.',
  },
  nova: {
    id: 'nova',
    name: 'Nova Ultra HD',
    mediaTypes: ['movie', 'tv', 'anime'],
    supportsSub: true,
    supportsOriginalAudio: true,
    supportedDubLanguages: ['en', 'hi'],
    notes: 'NovaAPI engine with multi-audio, subtitle, and HLS support.',
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
