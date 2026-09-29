import process from 'node:process';
import { NextRequest, NextResponse } from 'next/server';
import { tmdbCache, channelsCache, MemoryCache } from '@/lib/cache';
import { apiRateLimiter } from '@/lib/rate-limiter';

const TMDB_DEFAULT_BASE_URL = 'https://api.tmdb.org/3';
// Adaptive preferred host for rapid failover
let activeTmdbHost = 'api.themoviedb.org';

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}
const MAX_RESPONSE_SIZE = 4 * 1024 * 1024; // 4 MB — reject oversized payloads

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// ---------- TMDB proxy ----------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'TMDB_API_KEY environment variable is required' },
      { status: 500 }
    );
  }

  // ── Rate limit ──
  const ip = getClientIp(request);
  if (!apiRateLimiter.hit(ip)) {
    const retryAfter = apiRateLimiter.retryAfter(ip);
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': '120',
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join('/');
    const searchParams = request.nextUrl.searchParams;

    // ── Cache lookup ──
    const cacheKey = MemoryCache.buildKey(path, searchParams);
    const cached = tmdbCache.get(cacheKey);
    if (cached) {
      return new NextResponse(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
        },
      });
    }

    // ── Build upstream URL ──
    const customBase = process.env.TMDB_BASE_URL;
    const targetHost = customBase ? new URL(customBase).hostname : activeTmdbHost;
    const targetUrl = new URL(`https://${targetHost}/3/${path}`);
    targetUrl.searchParams.append('api_key', apiKey);
    searchParams.forEach((value, key) => {
      if (key !== 'api_key') {
        targetUrl.searchParams.append(key, value);
      }
    });

    // ── Fetch with fast 3s timeout + instant domain fallback ──
    let res: Response | null = null;
    let fetchError: unknown = null;

    try {
      res = await fetchWithTimeout(targetUrl.toString(), 3200);
    } catch (err) {
      fetchError = err;
      // Primary host failed or timed out; switch to alternate host instantly
      const alternateHost = targetHost === 'api.tmdb.org' ? 'api.themoviedb.org' : 'api.tmdb.org';
      const fallbackUrl = new URL(targetUrl.toString());
      fallbackUrl.hostname = alternateHost;
      try {
        res = await fetchWithTimeout(fallbackUrl.toString(), 3500);
        if (res && res.ok) {
          activeTmdbHost = alternateHost; // Adapt to working host
        }
      } catch {
        // Keep original error
      }
    }

    if (!res) {
      throw fetchError;
    }

    if (!res.ok) {
      const errorBody = await res.text();

      // Only log server/upstream errors (5xx/401/403), skip normal 404s to avoid log noise
      if (res.status !== 404) {
        console.error('TMDB API ERROR:', {
          status: res.status,
          statusText: res.statusText,
          path,
          body: errorBody,
        });
      }

      const headers: Record<string, string> = {};
      const retryAfter = res.headers.get('retry-after');

      if (retryAfter) {
        headers['Retry-After'] = retryAfter;
      }

      let errorMessage = `TMDB API request failed (${res.status})`;
      try {
        const parsed = JSON.parse(errorBody);
        if (parsed?.status_message) {
          errorMessage = parsed.status_message;
        } else if (parsed?.error) {
          errorMessage = parsed.error;
        }
      } catch {
        if (errorBody && errorBody.length < 150) {
          errorMessage = errorBody;
        }
      }

      return NextResponse.json(
        {
          error: errorMessage,
          status: res.status,
          details: errorBody,
        },
        { status: res.status, headers }
      );
    }

    // Check Content-Length before reading the body
    const contentLength = Number(res.headers.get('content-length') || 0);
    if (contentLength > MAX_RESPONSE_SIZE) {
      return NextResponse.json(
        { error: 'Response too large' },
        { status: 413 }
      );
    }

    const text = await res.text();

    // Double-check actual size
    if (text.length > MAX_RESPONSE_SIZE) {
      return NextResponse.json(
        { error: 'Response too large' },
        { status: 413 }
      );
    }

    // ── Store in cache ──
    tmdbCache.set(cacheKey, text);

    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Upstream request timed out' },
        { status: 504 }
      );
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------- TouStream channels proxy (avoids 12 MB client-side parse crash) ----------

export async function POST(request: NextRequest) {
  // Re-use rate limiter
  const ip = getClientIp(request);
  if (!apiRateLimiter.hit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body || body.action !== 'get-channels') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const limit = Math.min(Math.max(Number(body.limit) || 500, 10), 500);
  const cacheKey = `toustream-channels:${limit}`;

  try {
    // Check cache first
    const cached = channelsCache.get(cacheKey);
    if (cached) {
      return new NextResponse(cached, {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000); // 90s — large upstream payload

    // TouStream confirmed endpoint — only one URL, but add retry + User-Agent
    let res: Response | null = null;
    let lastError = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch('https://toustream.xyz/tou/api/channels', {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; Lumina/1.0)',
          },
        });
        if (r.ok) { res = r; break; }
        lastError = `HTTP ${r.status}`;
        // Don't retry 4xx — only transient 5xx
        if (r.status < 500) break;
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'fetch error';
      }
      // Small delay before retry
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }

    clearTimeout(timeout);
    if (!res) throw new Error(lastError || 'TouStream endpoint unavailable');

    const text = await res.text();

    // Parse and trim to just the fields we need (slug + name only)
    try {
      const json = JSON.parse(text);
      const channels = Array.isArray(json)
        ? json.slice(0, limit).map((ch: Record<string, unknown>) => ({
            slug: (ch.slug as string) ?? '',
            name: (ch.name as string) ?? '',
          }))
        : [];

      if (channels.length === 0) {
        throw new Error('No channels found in response');
      }

      const safeText = JSON.stringify(channels);
      channelsCache.set(cacheKey, safeText);

      return new NextResponse(safeText, {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
      });
    } catch (parseErr: unknown) {
      const message = parseErr instanceof Error ? parseErr.message : 'Parse error';
      return NextResponse.json(
        { error: `Failed to parse channels: ${message}` },
        { status: 502 }
      );
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Channel fetch timed out' },
        { status: 504 }
      );
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
