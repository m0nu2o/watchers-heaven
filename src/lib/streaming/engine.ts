import { StreamingRegistry } from './registry';
import { SourceValidator } from './validator';
import { ApiGateway } from '@/lib/api/gateway';
import type { StreamPlaybackConfig, StreamSource, ServerHealthInfo } from './types';

export interface ResolveSourceResult {
  success: boolean;
  source: StreamSource | null;
  servers: ServerHealthInfo[];
  providerId: string;
  error?: string;
  fallbackCount: number;
}

export const StreamingEngine = {
  /**
   * Resolves and validates a streaming source with automatic multi-stage provider fallback.
   * If Provider A fails, it silently and automatically advances to Provider B, then Provider C,
   * guaranteeing that a single failed provider never breaks playback for the user.
   */
  async resolveAndValidate(config: StreamPlaybackConfig): Promise<ResolveSourceResult> {
    const compatible = StreamingRegistry.getCompatible(config.mediaType, config.audioTrackId);
    if (!compatible.length) {
      return {
        success: false,
        source: null,
        servers: [],
        providerId: '',
        error: 'No compatible streaming providers found for this content type.',
        fallbackCount: 0,
      };
    }

    // Determine initial provider to try
    let candidateProviders = [...compatible];

    // If preferred provider requested, put it at the front of the queue
    if (config.preferredProvider) {
      const preferred = candidateProviders.find((p) => p.id === config.preferredProvider);
      if (preferred) {
        candidateProviders = [
          preferred,
          ...candidateProviders.filter((p) => p.id !== config.preferredProvider),
        ];
      }
    }

    // For anime, if AniList ID is available and user is looking for SUB,
    // check if high-speed direct HLS can be obtained
    if (config.mediaType === 'anime' && (config.preferredProvider === 'miruro-anime' || !config.preferredProvider)) {
      try {
        const directHls = await ApiGateway.getDirectAnimeStream(
          config.tmdbId,
          config.episode || 1,
          Boolean(config.audioTrackId?.startsWith('dub'))
        );
        if (directHls?.url) {
          const validation = await SourceValidator.validateUrl(directHls.url, 2500);
          if (validation.valid) {
            SourceValidator.recordResult('direct-hls', true, validation.latencyMs);
            return {
              success: true,
              providerId: 'direct-hls',
              source: {
                providerId: 'direct-hls',
                providerName: 'Direct HLS Stream',
                quality: '1080p / 0 Ads / Native HLS',
                badge: '⚡',
                url: directHls.url,
                type: 'hls',
                isHealthy: true,
                subtitles: directHls.subtitles,
                skipTimestamps: directHls.skipTimestamps,
              },
              servers: SourceValidator.getServerStatuses(compatible),
              fallbackCount: 0,
            };
          }
        }
      } catch {
        // Fall through to standard provider discovery
      }
    }

    let fallbackCount = 0;
    let lastError = 'No stream found';

    // Automatic Provider Fallback Loop
    for (const provider of candidateProviders) {
      // Check health status from circuit breaker
      const health = SourceValidator.getHealth(provider.id);
      if (health === 'failed' && candidateProviders.length > 1) {
        // Skip failed providers if alternatives exist
        continue;
      }

      try {
        const url = provider.getPlaybackUrl(config);
        if (!url) {
          SourceValidator.recordResult(provider.id, false);
          fallbackCount++;
          continue;
        }

        // Validate source URL
        const validation = await SourceValidator.validateUrl(url, 3500);
        if (validation.valid) {
          SourceValidator.recordResult(provider.id, true, validation.latencyMs);

          const source: StreamSource = {
            providerId: provider.id,
            providerName: provider.name,
            quality: provider.quality,
            badge: provider.badge,
            url,
            type: url.includes('.m3u8') ? 'hls' : 'iframe',
            isHealthy: true,
          };

          return {
            success: true,
            source,
            servers: SourceValidator.getServerStatuses(compatible),
            providerId: provider.id,
            fallbackCount,
          };
        } else {
          SourceValidator.recordResult(provider.id, false);
          lastError = validation.error || `Provider ${provider.name} failed validation.`;
          fallbackCount++;
        }
      } catch (err) {
        SourceValidator.recordResult(provider.id, false);
        lastError = err instanceof Error ? err.message : 'Unknown provider error';
        fallbackCount++;
      }
    }

    // If all providers failed validation, return graceful error
    return {
      success: false,
      source: null,
      servers: SourceValidator.getServerStatuses(compatible),
      providerId: candidateProviders[0]?.id || '',
      error: lastError,
      fallbackCount,
    };
  },

  /**
   * Get the next fallback provider ID for an existing failed stream
   */
  getNextFallbackProviderId(currentProviderId: string, mediaType: StreamPlaybackConfig['mediaType'], failedIds: string[] = []): string | null {
    const compatible = StreamingRegistry.getCompatible(mediaType);
    const failedSet = new Set([...failedIds, currentProviderId]);

    const next = compatible.find((p) => !failedSet.has(p.id) && SourceValidator.getHealth(p.id) !== 'failed');
    if (next) return next.id;

    // If all healthy are exhausted, return any untried provider
    const untried = compatible.find((p) => !failedSet.has(p.id));
    return untried ? untried.id : null;
  },
};
