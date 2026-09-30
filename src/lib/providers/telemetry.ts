/**
 * Provider Telemetry & Health Tracker
 * Inspired by Taro's resilient ProviderRegistry state machine.
 * Tracks live provider latency, error rates, and manages intelligent auto-cooldowns.
 */

export type ProviderStatus = 'HEALTHY' | 'DEGRADED' | 'RATE_LIMITED' | 'BLOCKED' | 'COOLDOWN' | 'UNKNOWN';

export interface ProviderHealthRecord {
  providerId: string;
  status: ProviderStatus;
  lastChecked: number | null;
  responseTimeMs: number | null;
  avgLatencyMs: number | null;
  successCount: number;
  failureCount: number;
  lastError: string | null;
  cooldownUntil: number | null;
}

// In-memory registry (singleton across client session)
const healthStateMap = new Map<string, ProviderHealthRecord>();

function getOrCreateRecord(providerId: string): ProviderHealthRecord {
  let record = healthStateMap.get(providerId);
  if (!record) {
    record = {
      providerId,
      status: 'UNKNOWN',
      lastChecked: null,
      responseTimeMs: null,
      avgLatencyMs: null,
      successCount: 0,
      failureCount: 0,
      lastError: null,
      cooldownUntil: null,
    };
    healthStateMap.set(providerId, record);
  }
  return record;
}

export const ProviderTelemetry = {
  /**
   * Record a successful stream initialization or playback start
   */
  recordSuccess(providerId: string, latencyMs?: number): void {
    const record = getOrCreateRecord(providerId);
    record.status = 'HEALTHY';
    record.lastChecked = Date.now();
    record.successCount += 1;
    record.failureCount = 0;
    record.lastError = null;
    record.cooldownUntil = null;

    if (latencyMs !== undefined && latencyMs >= 0) {
      record.responseTimeMs = latencyMs;
      record.avgLatencyMs = record.avgLatencyMs !== null
        ? Math.round((record.avgLatencyMs * 0.7) + (latencyMs * 0.3)) // EMA
        : latencyMs;
    }
  },

  /**
   * Record an error or playback timeout with exponential cooldown
   */
  recordFailure(providerId: string, error?: string): void {
    const record = getOrCreateRecord(providerId);
    const now = Date.now();
    record.failureCount += 1;
    record.lastChecked = now;
    record.lastError = error || 'Provider failed to initialize playback';

    // 1 failure = DEGRADED, 2+ consecutive failures = COOLDOWN (30s * failures, max 3 min)
    if (record.failureCount >= 2) {
      const cooldownDurationMs = Math.min(30_000 * (record.failureCount - 1), 180_000);
      record.cooldownUntil = now + cooldownDurationMs;
      record.status = 'COOLDOWN';
    } else {
      record.status = 'DEGRADED';
    }
  },

  /**
   * Check if provider is currently in active cooldown
   */
  isInCooldown(providerId: string): boolean {
    const record = healthStateMap.get(providerId);
    if (!record || !record.cooldownUntil) return false;
    return record.cooldownUntil > Date.now();
  },

  /**
   * Get health record for a provider
   */
  getHealth(providerId: string): ProviderHealthRecord {
    const record = getOrCreateRecord(providerId);
    // Check if cooldown has expired
    if (record.status === 'COOLDOWN' && record.cooldownUntil && record.cooldownUntil <= Date.now()) {
      record.status = 'DEGRADED';
      record.cooldownUntil = null;
    }
    return { ...record };
  },

  /**
   * Get all provider health states
   */
  getAllHealth(): ProviderHealthRecord[] {
    return Array.from(healthStateMap.keys()).map((id) => ProviderTelemetry.getHealth(id));
  },

  /**
   * Reset health statistics (e.g. for testing)
   */
  reset(): void {
    healthStateMap.clear();
  },
};
