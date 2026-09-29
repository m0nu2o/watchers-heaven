import type { ProviderHealthStatus, ServerHealthInfo, StreamingProvider } from './types';

interface HealthRecord {
  status: ProviderHealthStatus;
  consecutiveFailures: number;
  lastChecked: number;
  latencyMs: number;
}

// In-memory circuit breaker & health table
const healthStore = new Map<string, HealthRecord>();

// TTL constants
const HEALTHY_TTL_MS = 5 * 60 * 1000;   // 5 minutes for healthy status
const FAILURE_TTL_MS = 60 * 1000;        // 1 minute retry for failed status

// Known dead/broken domains that should fail fast without wasting time
const KNOWN_DEAD_HOSTS = new Set([
  'player.autoembed.cc',
  'anime.autoembed.cc',
  'autoembed.cc',
  'rivestream.ru', // Blocks iframes with X-Frame-Options: SAMEORIGIN
]);

export const SourceValidator = {
  /**
   * Fast validation of a URL
   */
  async validateUrl(url: string, timeoutMs = 3500): Promise<{ valid: boolean; latencyMs: number; error?: string }> {
    if (!url || typeof url !== 'string') {
      return { valid: false, latencyMs: 0, error: 'Empty URL' };
    }

    try {
      const parsed = new URL(url);

      // Check against known dead hosts
      if (KNOWN_DEAD_HOSTS.has(parsed.hostname.toLowerCase())) {
        return { valid: false, latencyMs: 0, error: 'Known dead or blocked provider host' };
      }

      const startTime = Date.now();

      // For direct HLS manifest URLs, execute HEAD request to verify HTTP 200
      if (url.includes('.m3u8')) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const res = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });
          clearTimeout(timeout);
          const latencyMs = Date.now() - startTime;

          if (res.ok) {
            return { valid: true, latencyMs };
          }
          return { valid: false, latencyMs, error: `HTTP ${res.status}` };
        } catch (fetchErr) {
          clearTimeout(timeout);
          return { valid: false, latencyMs: Date.now() - startTime, error: 'HLS manifest unreachable' };
        }
      }

      // For embed iframe URLs: perform syntax and protocol verification
      // (Cross-origin iframes have their own internal players and scripts; verifying host validity and protocol is standard)
      if (parsed.protocol === 'https:' && parsed.hostname.length > 3) {
        return { valid: true, latencyMs: 10 };
      }

      return { valid: false, latencyMs: 0, error: 'Invalid URL format' };
    } catch {
      return { valid: false, latencyMs: 0, error: 'Malformed URL' };
    }
  },

  /**
   * Record health metrics for a provider
   */
  recordResult(providerId: string, success: boolean, latencyMs = 0): void {
    const existing = healthStore.get(providerId) || {
      status: 'healthy',
      consecutiveFailures: 0,
      lastChecked: 0,
      latencyMs: 0,
    };

    if (success) {
      existing.status = 'healthy';
      existing.consecutiveFailures = 0;
      existing.lastChecked = Date.now();
      existing.latencyMs = latencyMs;
    } else {
      existing.consecutiveFailures += 1;
      existing.lastChecked = Date.now();
      existing.status = existing.consecutiveFailures >= 3 ? 'failed' : 'degraded';
    }

    healthStore.set(providerId, existing);
  },

  /**
   * Get health status for a provider
   */
  getHealth(providerId: string): ProviderHealthStatus {
    const record = healthStore.get(providerId);
    if (!record) return 'healthy';

    const now = Date.now();
    const ttl = record.status === 'healthy' ? HEALTHY_TTL_MS : FAILURE_TTL_MS;

    // Reset if expired
    if (now - record.lastChecked > ttl) {
      record.status = 'healthy';
      record.consecutiveFailures = 0;
      healthStore.set(providerId, record);
      return 'healthy';
    }

    return record.status;
  },

  /**
   * Return health overview for all providers in list
   */
  getServerStatuses(providers: StreamingProvider[]): ServerHealthInfo[] {
    return providers.map((p) => {
      const rec = healthStore.get(p.id);
      const status = SourceValidator.getHealth(p.id);
      return {
        id: p.id,
        name: p.name,
        quality: p.quality,
        badge: p.badge,
        status,
        latencyMs: rec?.latencyMs,
        lastChecked: rec?.lastChecked,
      };
    });
  },
};
