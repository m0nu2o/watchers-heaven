/**
 * Download proxy — streams the file from a third-party source through
 * our own server so users never leave the site.
 * Usage: GET /api/download?url=<encoded-url>&filename=<name>
 */
import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimiter } from '@/lib/rate-limiter';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// Allowed download origin domains (whitelist)
const ALLOWED_ORIGINS = [
  'rivestream.ru',
  'vidsrc.sh',
  'vidsrc-embed.ru',
  'vidfast.vc',
  'vidfast.pro',
  'embed.su',
  'autoembed.co',
  'autoembed.cc',
  'nhdapi.com',
  'screenscape.me',
  'anyembed.xyz',
  'vidsrc.pm',
  'nyaa.si',
  '1337x.to',
  'yts.mx',
];

export async function GET(request: NextRequest) {
  // Rate limit
  const ip = getClientIp(request);
  if (!apiRateLimiter.hit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = request.nextUrl;
  const rawUrl = searchParams.get('url');
  const filename = searchParams.get('filename') || 'download';

  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Validate the URL
  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (targetUrl.protocol !== 'https:') {
    return NextResponse.json({ error: 'Only HTTPS URLs allowed' }, { status: 400 });
  }

  const isAllowed = ALLOWED_ORIGINS.some((origin) => targetUrl.hostname.endsWith(origin));
  if (!isAllowed) {
    return NextResponse.json({ error: 'Download source not allowed' }, { status: 403 });
  }

  try {
    const controller = new AbortController();
    // 5 min timeout for large files
    const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);

    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Lumina/1.0)',
        'Accept': '*/*',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: upstream.status }
      );
    }

    // Stream the response body through our server
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const contentLength = upstream.headers.get('content-length');

    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });

    if (contentLength) headers.set('Content-Length', contentLength);

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Download timed out' }, { status: 504 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
