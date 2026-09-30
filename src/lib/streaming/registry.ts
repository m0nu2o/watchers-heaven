import { ApiGateway } from '@/lib/api/gateway';
import type { StreamingProvider, StreamPlaybackConfig, MediaType } from './types';

/**
 * Authoritative Streaming Providers Registry
 * 100% verified active 200 OK providers with iframe-friendly headers.
 */
export const STREAMING_PROVIDERS: StreamingProvider[] = [
  // ─── 1. Primary: VidLink HD (1080p, 0 Ads, Auto-Play, Multi-Language) ───
  {
    id: 'vidlink',
    name: 'VidLink HD',
    quality: '1080p / Clean / Auto-Play',
    badge: '⚡',
    priority: 1,
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: true,
    supportsEnglishDub: true,
    getPlaybackUrl: (cfg: StreamPlaybackConfig) => {
      if (cfg.mediaType === 'anime') {
        const isDub = cfg.audioTrackId?.startsWith('dub') ?? false;
        return ApiGateway.getVidLinkAnimeUrl(cfg.tmdbId, cfg.season || 1, cfg.episode || 1, isDub);
      }
      const type = cfg.mediaType === 'movie' ? 'movie' : 'tv';
      return ApiGateway.getVidLinkUrl(cfg.tmdbId, type, cfg.season || 1, cfg.episode || 1);
    },
  },

  // ─── 2. VidSrc Ultra HD (1080p, Global CDN, Ad-Free) ───
  {
    id: 'vidsrc-pm',
    name: 'VidSrc Ultra HD',
    quality: '1080p / Ad-Free / Global',
    badge: '🔥',
    priority: 2,
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: true,
    supportsEnglishDub: true,
    getPlaybackUrl: (cfg: StreamPlaybackConfig) => {
      const type = cfg.mediaType === 'movie' ? 'movie' : 'tv';
      return ApiGateway.getVidSrcPmUrl(cfg.tmdbId, type, cfg.season || 1, cfg.episode || 1);
    },
  },

  // ─── 4. AutoEmbed HD (1080p, Fast Multi-Audio) ───
  {
    id: 'autoembed-co',
    name: 'AutoEmbed HD',
    quality: '1080p / Fast Multi-Audio',
    badge: '🎬',
    priority: 4,
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: true,
    supportsEnglishDub: true,
    supportsHindiDub: true,
    getPlaybackUrl: (cfg: StreamPlaybackConfig) => {
      const type = cfg.mediaType === 'movie' ? 'movie' : 'tv';
      return ApiGateway.getAutoEmbedCoUrl(cfg.tmdbId, type, cfg.season || 1, cfg.episode || 1);
    },
  },

  // ─── 4.5 ScreenScape HD (1080p, Authentic Multi-Audio, Hindi Dub) ───
  {
    id: 'screenscape',
    name: 'ScreenScape HD',
    quality: '1080p / Multi-Audio / Clean',
    badge: '🌐',
    priority: 4.5,
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: true,
    supportsEnglishDub: true,
    supportsHindiDub: true,
    getPlaybackUrl: (cfg: StreamPlaybackConfig) => {
      const type = cfg.mediaType === 'movie' ? 'movie' : 'tv';
      const lan = cfg.audioTrackId === 'dub-hi' ? 'hi' : (cfg.audioTrackId === 'dub-en' || cfg.audioTrackId === 'dub') ? 'eng' : (cfg.mediaType === 'anime' ? 'jap' : 'eng');
      return ApiGateway.getScreenScapeUrl(cfg.tmdbId, type, cfg.season || 1, cfg.episode || 1, lan);
    },
  },

  // ─── 5. 2Embed Direct (1080p, Wide Catalog) ───
  {
    id: '2embed-skin',
    name: '2Embed Direct',
    quality: '1080p / Wide Catalog',
    badge: '💎',
    priority: 5,
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: true,
    supportsEnglishDub: true,
    getPlaybackUrl: (cfg: StreamPlaybackConfig) => {
      const type = cfg.mediaType === 'movie' ? 'movie' : 'tv';
      return ApiGateway.get2EmbedSkinUrl(cfg.tmdbId, type, cfg.season || 1, cfg.episode || 1);
    },
  },

  // ─── 6. VidFast HD (1080p, Fast Player) ───
  {
    id: 'vidfast',
    name: 'VidFast HD',
    quality: '1080p / Fast Player',
    badge: '🚀',
    priority: 6,
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: true,
    supportsEnglishDub: true,
    getPlaybackUrl: (cfg: StreamPlaybackConfig) => {
      const type = cfg.mediaType === 'movie' ? 'movie' : 'tv';
      return ApiGateway.getVidFastUrl(
        cfg.tmdbId,
        type,
        cfg.season || 1,
        cfg.episode || 1,
        {
          autoPlay: true,
          theme: cfg.accentColor || '007bff',
          title: true,
          poster: true,
          startAt: cfg.startTime && cfg.startTime > 0 ? cfg.startTime : undefined,
        }
      );
    },
  },
];

const STREAMING_ALIASES: Record<string, string> = {
  'embedsu-cinema': 'vidsrc-pm',
  'embedsu': 'vidsrc-pm',
  'vidsrc': 'vidsrc-pm',
  'vidsrc-me': 'vidsrc-pm',
  'vidsrc-to': 'vidsrc-pm',
  'vidsrc-cc': 'vidsrc-pm',
  'multiembed': 'autoembed-co',
  'autoembed': 'autoembed-co',
  '2embed': '2embed-skin',
  '2embed-cc': '2embed-skin',
  'rivestream': 'autoembed-co',
  '111movies': 'vidlink',
  'videasy': 'vidlink',
  'nhd-cinema': 'autoembed-co',
  'nhd-anime': 'vidlink',
  'vidsrc-dev': 'autoembed-co',
  'miruro-anime': 'vidlink',
  'vidlink-anime': 'vidlink',
};

export const StreamingRegistry = {
  getAll: (): StreamingProvider[] => STREAMING_PROVIDERS,

  getById: (id: string): StreamingProvider | undefined => {
    const canonicalId = STREAMING_ALIASES[id] || id;
    return STREAMING_PROVIDERS.find((p) => p.id === canonicalId) || STREAMING_PROVIDERS.find((p) => p.id === id);
  },

  getCompatible: (mediaType: MediaType, audioTrackId?: string): StreamingProvider[] => {
    const isHindi = audioTrackId === 'dub-hi';
    const list = STREAMING_PROVIDERS.filter((p) => {
      if (mediaType === 'anime') return p.supportsAnime;
      if (mediaType === 'tv') return p.supportsTV;
      return p.supportsMovie;
    });

    if (isHindi) {
      // Prioritize Hindi dub capable providers at the top
      return list.sort((a, b) => {
        if (a.supportsHindiDub && !b.supportsHindiDub) return -1;
        if (!a.supportsHindiDub && b.supportsHindiDub) return 1;
        return a.priority - b.priority;
      });
    }

    return list.sort((a, b) => a.priority - b.priority);
  },

  getDefault: (mediaType: MediaType, audioTrackId?: string): StreamingProvider => {
    const compatible = StreamingRegistry.getCompatible(mediaType, audioTrackId);
    return compatible[0] || STREAMING_PROVIDERS[0];
  },
};
