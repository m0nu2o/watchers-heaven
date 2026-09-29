import { ApiGateway } from '@/lib/api/gateway';
import type { StreamingProvider, StreamPlaybackConfig, MediaType } from './types';

/**
 * Authoritative Streaming Providers Registry
 * Ranked by reliability, uptime, ad-cleanliness, and playback quality.
 */
export const STREAMING_PROVIDERS: StreamingProvider[] = [
  // ─── Top Tier: Fast, Ad-Clean, 1080p ───
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
    getPlaybackUrl: (cfg) => {
      const type = cfg.mediaType === 'movie' ? 'movie' : 'tv';
      return ApiGateway.getVidLinkUrl(cfg.tmdbId, type, cfg.season || 1, cfg.episode || 1);
    },
  },
  {
    id: 'vidsrc-me',
    name: 'VidSrc.me',
    quality: '1080p / Ad-Free / Multi-Sub',
    badge: '⚡',
    priority: 2,
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: true,
    supportsEnglishDub: true,
    getPlaybackUrl: (cfg) => {
      const type = cfg.mediaType === 'movie' ? 'movie' : 'tv';
      return ApiGateway.getVidsrcMeUrl(cfg.tmdbId, type, cfg.season || 1, cfg.episode || 1);
    },
  },
  {
    id: 'embedsu-cinema',
    name: 'Embed.su Ultra HD',
    quality: '1080p / Ad-Free / Ultra',
    badge: '💎',
    priority: 3,
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    supportsEnglishDub: true,
    getPlaybackUrl: (cfg) => {
      const type = cfg.mediaType === 'tv' ? 'tv' : 'movie';
      return ApiGateway.getEmbedSuUrl(cfg.tmdbId, type, cfg.season || 1, cfg.episode || 1);
    },
  },
  {
    id: 'videasy',
    name: 'Videasy HD',
    quality: '1080p / Premium Player / Multi-Sub',
    badge: '🎯',
    priority: 4,
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: true,
    supportsEnglishDub: true,
    getPlaybackUrl: (cfg) => {
      if (cfg.mediaType === 'anime' && cfg.aniListId) {
        return ApiGateway.getVideasyUrl(cfg.tmdbId, 'anime', cfg.season || 1, cfg.episode || 1, cfg.aniListId);
      }
      const type = cfg.mediaType === 'movie' ? 'movie' : 'tv';
      return ApiGateway.getVideasyUrl(cfg.tmdbId, type, cfg.season || 1, cfg.episode || 1);
    },
  },
  {
    id: 'vidsrc-cc',
    name: 'VidSrc.cc',
    quality: '1080p / High Speed',
    badge: '🔥',
    priority: 5,
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: true,
    supportsEnglishDub: true,
    getPlaybackUrl: (cfg) => {
      const type = cfg.mediaType === 'movie' ? 'movie' : 'tv';
      return ApiGateway.getVidSrcCcUrl(cfg.tmdbId, type, cfg.season || 1, cfg.episode || 1);
    },
  },

  // ─── Hindi Dub Priority Providers ───
  {
    id: 'nhd-cinema',
    name: 'NHD Cinema (Hindi Dub)',
    quality: '1080p / Hindi Priority',
    badge: '🇮🇳',
    priority: 6,
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    supportsHindiDub: true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.getNhdEmbedUrl(
        cfg.tmdbId,
        cfg.mediaType === 'tv' ? 'tv' : 'movie',
        cfg.season,
        cfg.episode
      );
    },
  },
  {
    id: 'nhd-anime',
    name: 'NHD Anime (Hindi Dub)',
    quality: '1080p / Hindi Priority',
    badge: '🇮🇳',
    priority: 7,
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    supportsHindiDub: true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.getNhdEmbedUrl(
        cfg.tmdbId,
        'anime',
        cfg.season || 1,
        cfg.episode || 1,
        cfg.aniListId
      );
    },
  },

  // ─── Dedicated Anime Specialized Providers ───
  {
    id: 'miruro-anime',
    name: 'Miruro Anime',
    quality: '1080p / Skip Timestamps / Sub+Dub',
    badge: '✨',
    priority: 8,
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    supportsEnglishDub: true,
    getPlaybackUrl: (cfg) => {
      if (cfg.aniListId) {
        const isDub = cfg.audioTrackId?.startsWith('dub') ?? false;
        return ApiGateway.getMiruroUrl(cfg.aniListId, cfg.episode || 1, isDub);
      }
      return ApiGateway.get2EmbedUrl(cfg.tmdbId, 'tv', cfg.season || 1, cfg.episode || 1);
    },
  },

  // ─── Fallback Tier Providers ───
  {
    id: 'vidsrc',
    name: 'VidSrc.to',
    quality: '1080p / Hindi+EN Dub / Rich Player',
    badge: '🌟',
    priority: 9,
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: true,
    supportsHindiDub: true,
    supportsEnglishDub: true,
    getPlaybackUrl: (cfg) => {
      const type = cfg.mediaType === 'movie' ? 'movie' : 'tv';
      return ApiGateway.getVidSrcUrl(cfg.tmdbId, type, cfg.season || 1, cfg.episode || 1);
    },
  },
  {
    id: 'multiembed',
    name: 'MultiEmbed',
    quality: '1080p / Multi-Audio / Huge Catalog',
    badge: '🎭',
    priority: 10,
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: true,
    supportsHindiDub: true,
    supportsEnglishDub: true,
    getPlaybackUrl: (cfg) => {
      const type = cfg.mediaType === 'movie' ? 'movie' : 'tv';
      return ApiGateway.getMultiEmbedUrl(cfg.tmdbId, type, cfg.season, cfg.episode);
    },
  },
  {
    id: '2embed',
    name: '2Embed Direct',
    quality: '1080p / Wide Catalog',
    badge: '🎬',
    priority: 11,
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: true,
    supportsEnglishDub: true,
    getPlaybackUrl: (cfg) => {
      const type = cfg.mediaType === 'movie' ? 'movie' : 'tv';
      return ApiGateway.get2EmbedUrl(cfg.tmdbId, type, cfg.season || 1, cfg.episode || 1);
    },
  },
  {
    id: '111movies',
    name: '111Movies',
    quality: '1080p / Direct',
    badge: '🎥',
    priority: 12,
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: true,
    supportsEnglishDub: true,
    getPlaybackUrl: (cfg) => {
      const type = cfg.mediaType === 'movie' ? 'movie' : 'tv';
      return ApiGateway.get111MoviesUrl(cfg.tmdbId, type, cfg.season || 1, cfg.episode || 1);
    },
  },
];

export const StreamingRegistry = {
  getAll: (): StreamingProvider[] => STREAMING_PROVIDERS,

  getById: (id: string): StreamingProvider | undefined => {
    return STREAMING_PROVIDERS.find((p) => p.id === id);
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
