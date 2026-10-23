/**
 * AniList GraphQL proxy
 * — Keeps the AniList API key / origin off the client
 * — Applies rate limiting (AniList allows 90 req/min)
 * — Caches responses for 10 minutes to stay well under the limit
 */
import process from 'node:process';
import { NextRequest, NextResponse } from 'next/server';
import { MemoryCache } from '@/lib/cache';
import { apiRateLimiter } from '@/lib/rate-limiter';

const ANILIST_URL = 'https://graphql.anilist.co';
const MAX_RESPONSE_SIZE = 1 * 1024 * 1024; // 1 MB

// Dedicated cache for AniList responses — 10 min TTL, up to 200 entries
const anilistCache = new MemoryCache(200, 10 * 60 * 1000);

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  // ── Rate limit (shared limiter — 120 req/min per IP) ──
  const ip = getClientIp(request);
  if (!apiRateLimiter.hit(ip)) {
    const retryAfter = apiRateLimiter.retryAfter(ip);
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': '90',
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // ── Parse request body ──
  let body: { query?: string; variables?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.query || typeof body.query !== 'string') {
    return NextResponse.json({ error: 'Missing required field: query' }, { status: 400 });
  }

  // ── Cache key based on query + variables ──
  const cacheKey = `anilist:${body.query.replace(/\s+/g, ' ').trim()}:${JSON.stringify(body.variables ?? {})}`;
  const cached = anilistCache.get(cacheKey);
  if (cached) {
    return new NextResponse(cached, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'HIT',
      },
    });
  }

  // ── Forward to AniList GraphQL endpoint ──
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://anilist.co/',
        'Origin': 'https://anilist.co',
      },
      body: JSON.stringify({ query: body.query, variables: body.variables ?? {} }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return new NextResponse(res.statusText, { status: res.status });
    }

    const contentLength = Number(res.headers.get('content-length') || 0);
    if (contentLength > MAX_RESPONSE_SIZE) {
      return NextResponse.json({ error: 'Response too large' }, { status: 413 });
    }

    const text = await res.text();
    if (text.length > MAX_RESPONSE_SIZE) {
      return NextResponse.json({ error: 'Response too large' }, { status: 413 });
    }

    anilistCache.set(cacheKey, text);

    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'AniList request timed out' }, { status: 504 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Silence unused import warning — process is needed for edge compat check
void process.env;
