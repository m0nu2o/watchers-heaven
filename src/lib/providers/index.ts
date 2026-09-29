import { ApiGateway } from '@/lib/api/gateway';
import type { MediaType, MediaPlaybackConfig, ProviderAdapter } from '@/types/media';

export type { MediaType, MediaPlaybackConfig, ProviderAdapter };

export const PROVIDER_ADAPTERS: ProviderAdapter[] = [
  // ─── Dedicated Anime Providers (High Speed, Wide Support, Multi-Subtitles) ───
  {
    id: 'kuhi-hls',
    name: 'VidSrc Stream',
    quality: '1080p / Ad-Free / Sub+Dub',
    badge: '⚡',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      // vidsrc.me covers anime via TMDB ID — ad-free, multi-sub, huge catalog
      return ApiGateway.getVidsrcMeUrl(cfg.tmdbId, 'tv', cfg.season || 1, cfg.episode || 1);
    },
  },
  {
    id: 'anivexa-hls',
    name: 'VidSrc Premium',
    quality: '1080p / Hindi+EN Dub / Rich Player',
    badge: '🌟',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      // vidsrc.to handles anime TV shows via TMDB ID
      return ApiGateway.getVidSrcUrl(cfg.tmdbId, 'tv', cfg.season || 1, cfg.episode || 1);
    },
  },
  {
    id: 'miruro-anime',
    name: 'Miruro Anime',
    quality: '1080p / Skip Timestamps / Sub+Dub',
    badge: '✨',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      // miruro.tv uses AniList ID — best skip-timestamps support; fallback to 2embed if no aniListId
      if (cfg.aniListId) {
        const isDub = cfg.audioTrackId?.startsWith('dub') ?? false;
        return ApiGateway.getMiruroUrl(cfg.aniListId, cfg.episode || 1, isDub);
      }
      return ApiGateway.get2EmbedUrl(cfg.tmdbId, 'tv', cfg.season || 1, cfg.episode || 1);
    },
  },
  {
    id: 'autoembed-anime',
    name: '2Embed Anime',
    quality: '1080p / Wide Catalog',
    badge: '🎬',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.get2EmbedUrl(cfg.tmdbId, 'tv', cfg.season || 1, cfg.episode || 1);
    },
  },
  {
    id: 'autoembed-anime-pro',
    name: 'MultiEmbed Anime',
    quality: '1080p / Multi-Audio / Huge Catalog',
    badge: '💎',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.getAutoEmbedAnimeProUrl(cfg.tmdbId, cfg.season || 1, cfg.episode || 1);
    },
  },
  {
    id: 'nhd-anime',
    name: 'NHD Anime',
    quality: '1080p / Multi-Audio',
    badge: '🇮🇳',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.getNhdEmbedUrl(cfg.tmdbId, 'anime', cfg.season || 1, cfg.episode || 1, cfg.aniListId);
    },
  },
  {
    id: '2embed-anime',
    name: '2Embed Anime',
    quality: '1080p / Wide Catalog',
    badge: '🎬',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.get2EmbedUrl(cfg.tmdbId, 'tv', cfg.season || 1, cfg.episode || 1);
    },
  },
  {
    id: 'rivestream-anime',
    name: 'VidSrc.net Anime',
    quality: '1080p / Ad-Free / Huge Catalog',
    badge: '🔥',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.getVidSrcNetUrl(cfg.tmdbId, 'tv', cfg.season || 1, cfg.episode || 1);
    },
  },
  {
    id: 'vidfast-anime',
    name: 'VidFast Anime',
    quality: '1080p / Fast HLS',
    badge: '🚀',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.getVidFastUrl(
        cfg.tmdbId,
        'tv',
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
  {
    id: '111movies-anime',
    name: '111Movies Anime',
    quality: '1080p / Direct',
    badge: '🎥',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.get111MoviesUrl(cfg.tmdbId, 'tv', cfg.season || 1, cfg.episode || 1);
    },
  },
  {
    id: 'videasy-anime',
    name: 'Videasy Anime',
    quality: '1080p / Premium Player / Sub+Dub',
    badge: '🎯',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.getVideasyUrl(cfg.tmdbId, 'anime', cfg.season || 1, cfg.episode || 1, cfg.aniListId);
    },
  },
  {
    id: 'vidlink-anime',
    name: 'VidLink Anime',
    quality: '1080p / 0 Ads / Auto-Play',
    badge: '⚡',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.getVidLinkUrl(cfg.tmdbId, 'tv', cfg.season || 1, cfg.episode || 1);
    },
  },
  {
    id: 'vidsrc-cc-anime',
    name: 'VidSrc.cc Anime',
    quality: '1080p / Ultra Fast',
    badge: '🔥',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.getVidSrcCcUrl(cfg.tmdbId, 'tv', cfg.season || 1, cfg.episode || 1);
    },
  },

  // ─── Movies & TV Series Providers (Fast, 1080p, Multi-Audio, Multi-Subtitles) ───
  {
    id: 'embedsu-cinema',
    name: 'Embed.su Ultra HD',
    quality: '1080p / Ad-Free / Ultra',
    badge: '💎',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.getEmbedSuUrl(
        cfg.tmdbId,
        cfg.mediaType === 'tv' ? 'tv' : 'movie',
        cfg.season,
        cfg.episode
      );
    },
  },
  {
    id: 'nhd-cinema',
    name: 'NHD Cinema (Hindi Dub)',
    quality: '1080p / Hindi Priority',
    badge: '🇮🇳',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    isHindiPriority: true,
    requiresApiKey: false,
    isConfigured: () => true,
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
    id: 'vidfast',
    name: 'VidFast HD',
    quality: '1080p / Fast HLS',
    badge: '🚀',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.getVidFastUrl(
        cfg.tmdbId,
        cfg.mediaType === 'tv' ? 'tv' : 'movie',
        cfg.season,
        cfg.episode,
        {
          autoPlay: true,
          theme: cfg.accentColor || '007bff',
          title: true,
          poster: true,
          nextButton: false,
          autoNext: false,
          startAt: cfg.startTime && cfg.startTime > 0 ? cfg.startTime : undefined,
        }
      );
    },
  },
  {
    id: 'rivestream',
    name: 'VidSrc.net HD',
    quality: '1080p / Ad-Free / Huge Catalog',
    badge: '🔥',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.getVidSrcNetUrl(
        cfg.tmdbId,
        cfg.mediaType === 'tv' ? 'tv' : 'movie',
        cfg.season,
        cfg.episode
      );
    },
  },
  {
    id: '2embed',
    name: '2Embed Direct',
    quality: '1080p / Wide Catalog',
    badge: '🎬',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.get2EmbedUrl(
        cfg.tmdbId,
        cfg.mediaType === 'tv' ? 'tv' : 'movie',
        cfg.season,
        cfg.episode
      );
    },
  },
  {
    id: '111movies',
    name: '111Movies',
    quality: '1080p / Direct',
    badge: '🎥',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.get111MoviesUrl(
        cfg.tmdbId,
        cfg.mediaType === 'tv' ? 'tv' : 'movie',
        cfg.season,
        cfg.episode
      );
    },
  },
  {
    id: 'vidsrc',
    name: 'VidSrc.to',
    quality: '1080p / Hindi+EN Dub / Rich Player',
    badge: '🌟',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.getVidSrcUrl(
        cfg.tmdbId,
        cfg.mediaType === 'tv' ? 'tv' : 'movie',
        cfg.season,
        cfg.episode
      );
    },
  },
  {
    id: 'vidsrc-me',
    name: 'VidSrc.me',
    quality: '1080p / Ad-Free / Multi-Sub',
    badge: '⚡',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.getVidsrcMeUrl(
        cfg.tmdbId,
        cfg.mediaType === 'tv' ? 'tv' : 'movie',
        cfg.season,
        cfg.episode
      );
    },
  },
  {
    id: 'multiembed',
    name: 'MultiEmbed',
    quality: '1080p / Multi-Audio / Huge Catalog',
    badge: '🎭',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.getMultiEmbedUrl(
        cfg.tmdbId,
        cfg.mediaType === 'tv' ? 'tv' : 'movie',
        cfg.season,
        cfg.episode
      );
    },
  },
  {
    id: 'videasy',
    name: 'Videasy HD',
    quality: '1080p / Premium Player / Multi-Sub',
    badge: '🎯',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.getVideasyUrl(
        cfg.tmdbId,
        cfg.mediaType === 'tv' ? 'tv' : 'movie',
        cfg.season,
        cfg.episode
      );
    },
  },
  {
    id: 'vidlink',
    name: 'VidLink HD',
    quality: '1080p / 0 Ads / Auto-Play',
    badge: '⚡',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.getVidLinkUrl(
        cfg.tmdbId,
        cfg.mediaType === 'tv' ? 'tv' : 'movie',
        cfg.season,
        cfg.episode
      );
    },
  },
  {
    id: 'vidsrc-cc',
    name: 'VidSrc.cc',
    quality: '1080p / Ultra Fast',
    badge: '🔥',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    requiresApiKey: false,
    isConfigured: () => true,
    getPlaybackUrl: (cfg) => {
      return ApiGateway.getVidSrcCcUrl(
        cfg.tmdbId,
        cfg.mediaType === 'tv' ? 'tv' : 'movie',
        cfg.season,
        cfg.episode
      );
    },
  },
];

export const ProviderRegistry = {
  getAll: (): ProviderAdapter[] => PROVIDER_ADAPTERS,

  getForMediaType: (mediaType: MediaType): ProviderAdapter[] => {
    return PROVIDER_ADAPTERS.filter((p) => {
      if (p.requiresApiKey && !p.isConfigured()) return false;
      if (mediaType === 'anime') return p.supportsAnime;
      if (mediaType === 'tv') return p.supportsTV;
      return p.supportsMovie;
    });
  },

  getDefault: (mediaType: MediaType, audioTrackId?: string): ProviderAdapter => {
    if (mediaType === 'anime') {
      return (
        PROVIDER_ADAPTERS.find((p) => p.id === 'kuhi-hls') ||
        PROVIDER_ADAPTERS.find((p) => p.id === 'vidlink-anime') ||
        PROVIDER_ADAPTERS.find((p) => p.id === 'videasy-anime') ||
        PROVIDER_ADAPTERS.find((p) => p.id === 'vidsrc-cc-anime') ||
        PROVIDER_ADAPTERS[0]
      );
    }
    if (audioTrackId === 'dub-hi') {
      return (
        PROVIDER_ADAPTERS.find((p) => p.id === 'nhd-cinema') ||
        PROVIDER_ADAPTERS.find((p) => p.id === 'embedsu-cinema') ||
        PROVIDER_ADAPTERS[0]
      );
    }
    // Default for movie/TV: vidsrc-me -> vidlink -> embedsu-cinema
    return (
      PROVIDER_ADAPTERS.find((p) => p.id === 'vidsrc-me') ||
      PROVIDER_ADAPTERS.find((p) => p.id === 'vidlink') ||
      PROVIDER_ADAPTERS.find((p) => p.id === 'embedsu-cinema') ||
      PROVIDER_ADAPTERS.find((p) => p.id === 'vidsrc-cc') ||
      PROVIDER_ADAPTERS[0]
    );
  },

  getById: (id: string): ProviderAdapter | undefined => {
    return PROVIDER_ADAPTERS.find((p) => p.id === id);
  },

  resolvePlaybackUrl: (providerId: string, config: MediaPlaybackConfig): string => {
    const adapter = ProviderRegistry.getById(providerId);
    if (adapter) {
      const isCompatible =
        (config.mediaType === 'anime' && adapter.supportsAnime) ||
        (config.mediaType === 'tv' && adapter.supportsTV) ||
        (config.mediaType === 'movie' && adapter.supportsMovie);
      if (isCompatible) {
        return adapter.getPlaybackUrl(config);
      }
    }
    const defaultAdapter = ProviderRegistry.getDefault(config.mediaType);
    return defaultAdapter.getPlaybackUrl(config);
  },

  getFallbackProvider: (currentProviderId: string, mediaType: MediaType): ProviderAdapter | null => {
    const compatible = ProviderRegistry.getForMediaType(mediaType);
    const currentIndex = compatible.findIndex((p) => p.id === currentProviderId);
    if (currentIndex >= 0 && currentIndex < compatible.length - 1) {
      return compatible[currentIndex + 1];
    }
    if (compatible.length > 0 && compatible[0].id !== currentProviderId) {
      return compatible[0];
    }
    return null;
  },
};

export default ProviderRegistry;
