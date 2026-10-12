import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

/**
 * Lumina HLS / Media Proxy with Obfuscation Decryption.
 * Ported from Taro/Hikari streaming engine.
 *
 * Upstream streaming CDNs require specific headers (Referer / Origin / User-Agent),
 * do not send browser-friendly CORS headers, and may encrypt M3U8 playlists with
 * dynamic XOR keystreams derived from WebAssembly runtime seeds.
 *
 * This route:
 * 1. Proxies playlists, encryption keys, and segments while preserving provider headers.
 * 2. Decrypts obfuscated M3U8 master and child playlists using the provided `pk` key.
 * 3. Rewrites child URIs (#EXT-X-KEY, #EXT-X-MEDIA audio tracks, video sub-playlists)
 *    to route through the proxy with persistent auth and decryption parameters.
 * 4. Enables standard HLS playback across HLS.js, Artplayer, and native browser video players.
 */

const DEFAULT_TIMEOUT_MS = 15000;
const MAX_PROXY_RETRIES = 2;

const PRIVATE_IP_REGEX =
  /^(?:localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|::1|fc00:|fe80:)/i;

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_IP_REGEX.test(hostname);
}

function parseHeaders(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof key === 'string' && typeof value === 'string') {
          headers[key] = value;
        }
      }
      return headers;
    }
  } catch {
    // Ignore malformed JSON headers
  }
  return {};
}

function b64toU8(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function decryptPlaylist(rawText: string, pk: string): string {
  if (!pk) return rawText;
  const trimmed = rawText.trim();
  if (trimmed.startsWith('#EXTM3U')) return rawText;

  try {
    const keyBuf = b64toU8(pk);
    const cipherBuf = b64toU8(trimmed);
    if (!cipherBuf.length || !keyBuf.length) return rawText;

    const decryptedBytes = new Uint8Array(cipherBuf.length);
    for (let i = 0; i < cipherBuf.length; i++) {
      decryptedBytes[i] = cipherBuf[i] ^ keyBuf[i % keyBuf.length];
    }
    const decryptedText = new TextDecoder().decode(decryptedBytes);
    if (decryptedText.includes('#EXTM3U') || decryptedText.includes('#EXT-X-')) {
      return decryptedText;
    }
  } catch {
    // If decryption fails, fall back to raw text
  }
  return rawText;
}

function formatAssTime(timeStr: string): string {
  const parts = String(timeStr || '').split(':');
  if (parts.length === 3) {
    const h = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const [s, cs] = (parts[2] || '').split('.');
    const sec = (s || '00').padStart(2, '0');
    const ms = (cs || '00').padEnd(3, '0').slice(0, 3);
    return `${h}:${m}:${sec}.${ms}`;
  }
  return timeStr;
}

function assToVtt(assText: string): string {
  const lines = assText.split(/\r?\n/);
  const cues: string[] = [];
  for (const line of lines) {
    if (line.startsWith('Dialogue:')) {
      const parts = line.substring(9).split(',');
      if (parts.length >= 10) {
        const start = parts[1].trim();
        const end = parts[2].trim();
        const rawText = parts.slice(9).join(',').trim();
        const clean = rawText
          .replace(/\{[^}]*\}/g, '')
          .replace(/\\N/gi, '\n')
          .replace(/\\n/gi, '\n')
          .trim();
        if (clean && start && end) {
          cues.push(`${formatAssTime(start)} --> ${formatAssTime(end)}\n${clean}`);
        }
      }
    }
  }
  return `WEBVTT\n\n${cues.join('\n\n')}`;
}

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: 'Invalid url parameter' }, { status: 400 });
  }

  if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
    return NextResponse.json({ error: 'Unsupported url protocol' }, { status: 400 });
  }

  if (isPrivateHost(targetUrl.hostname)) {
    return NextResponse.json({ error: 'Forbidden target host' }, { status: 403 });
  }

  const rawHeadersParam = req.nextUrl.searchParams.get('headers') || '';
  const providerHeaders = parseHeaders(rawHeadersParam);
  const pkParam = req.nextUrl.searchParams.get('pk') || providerHeaders['pk'] || '';
  const isDubParam = req.nextUrl.searchParams.get('dub') === '1';

  const requestHeaders: Record<string, string> = {
    Accept: '*/*',
    'User-Agent':
      providerHeaders['User-Agent'] ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    ...providerHeaders,
  };

  const clientRange = req.headers.get('range');
  if (clientRange) {
    requestHeaders['Range'] = clientRange;
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_PROXY_RETRIES; attempt += 1) {
    try {
      const response = await fetch(targetUrl.href, {
        method: 'GET',
        headers: requestHeaders,
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });

      const contentType = response.headers.get('content-type') || '';
      const isM3U8 =
        contentType.includes('mpegurl') ||
        contentType.includes('x-mpegurl') ||
        targetUrl.pathname.endsWith('.m3u8') ||
        targetUrl.pathname.endsWith('.m3u') ||
        targetUrl.pathname.endsWith('.txt');
      const body = await response.arrayBuffer();

      if (isM3U8) {
        let text = new TextDecoder().decode(body);
        text = decryptPlaylist(text, pkParam);

        if (text.includes('#EXTM3U') || text.includes('#EXT-X-')) {
          const rewritten = rewritePlaylist(text, targetUrl.href, rawHeadersParam, pkParam, isDubParam);
          return new NextResponse(rewritten, {
            status: 200,
            headers: {
              'Content-Type': 'application/vnd.apple.mpegurl',
              'Cache-Control': 'public, max-age=1800',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': '*',
              'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
            },
          });
        }

        return new NextResponse(text, {
          status: response.status,
          headers: {
            'Content-Type': contentType || 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
          },
        });
      }

      const isAssSubtitle = targetUrl.pathname.endsWith('.ass') || targetUrl.pathname.endsWith('.ssa');
      if (isAssSubtitle) {
        const text = new TextDecoder().decode(body);
        const vtt = assToVtt(text);
        return new NextResponse(vtt, {
          status: 200,
          headers: {
            'Content-Type': 'text/vtt; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
          },
        });
      }

      let finalContentType = contentType || 'application/octet-stream';
      if (targetUrl.pathname.endsWith('.vtt')) {
        finalContentType = 'text/vtt; charset=utf-8';
      }

      const isMediaSegment =
        targetUrl.pathname.includes('/seg-') ||
        targetUrl.pathname.endsWith('.ts') ||
        (targetUrl.pathname.includes('seg') && (targetUrl.pathname.endsWith('.png') || targetUrl.pathname.endsWith('.webp')));

      if (isMediaSegment) {
        finalContentType = 'video/mp2t';
      }

      const responseHeaders: Record<string, string> = {
        'Content-Type': finalContentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
      };
      const acceptRanges = response.headers.get('accept-ranges');
      if (acceptRanges) {
        responseHeaders['Accept-Ranges'] = acceptRanges;
      }
      const contentRange = response.headers.get('content-range');
      if (contentRange) {
        responseHeaders['Content-Range'] = contentRange;
      }

      return new NextResponse(body, {
        status: response.status,
        headers: responseHeaders,
      });
    } catch (error) {
      lastError = error;
      if (attempt < MAX_PROXY_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }
  }

  const errorMsg = lastError instanceof Error ? lastError.message : 'Unknown stream proxy error';
  console.error('Stream proxy error:', errorMsg);
  return NextResponse.json(
    { error: 'Failed to proxy stream', detail: errorMsg },
    { status: 502 }
  );
}

/**
 * Rewrites URLs inside an m3u8 playlist so all child playlists, audio tracks,
 * encryption keys (#EXT-X-KEY), and init segments (#EXT-X-MAP) route through
 * this proxy preserving the provider's required authentication headers and decryption key.
 */
function rewritePlaylist(
  text: string,
  baseUrl: string,
  rawHeadersParam: string,
  pk: string,
  isDub = false
): string {
  const base = new URL(baseUrl);
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  const audioLines: { line: string; isEng: boolean }[] = [];

  const headersQuery = rawHeadersParam ? `&headers=${encodeURIComponent(rawHeadersParam)}` : '';
  const pkQuery = pk ? `&pk=${encodeURIComponent(pk)}` : '';
  const dubQuery = isDub ? '&dub=1' : '';

  function makeProxyUrl(relativeOrAbsoluteUrl: string, isSubPlaylist = false): string {
    let resolved: URL;
    try {
      resolved = new URL(relativeOrAbsoluteUrl, base);
    } catch {
      return relativeOrAbsoluteUrl;
    }
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return relativeOrAbsoluteUrl;
    }
    const extra = isSubPlaylist ? `${headersQuery}${pkQuery}${dubQuery}` : headersQuery;
    return `/api/proxy/stream?url=${encodeURIComponent(resolved.href)}${extra}`;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push(line);
      continue;
    }

    // Rewrite URI in #EXT-X-KEY:METHOD=...,URI="..." and #EXT-X-MAP:URI="..."
    if (trimmed.startsWith('#EXT-X-KEY:') || trimmed.startsWith('#EXT-X-MAP:')) {
      const rewrittenLine = line.replace(/URI=(["'])(.*?)\1/i, (_, quote, uri) => {
        return `URI=${quote}${makeProxyUrl(uri, false)}${quote}`;
      });
      out.push(rewrittenLine);
      continue;
    }

    // Rewrite URI in #EXT-X-MEDIA:TYPE=AUDIO and prioritize audio track based on isDub
    if (trimmed.startsWith('#EXT-X-MEDIA:TYPE=AUDIO') || trimmed.startsWith('#EXT-X-MEDIA:TYPE="AUDIO"')) {
      let rewrittenLine = line.replace(/URI=(["'])(.*?)\1/i, (_, quote, uri) => {
        return `URI=${quote}${makeProxyUrl(uri, true)}${quote}`;
      });

      const isEng = /LANGUAGE=["']?eng/i.test(rewrittenLine) || /NAME=["']?(?:English|Dub)/i.test(rewrittenLine);
      const isJpn = /LANGUAGE=["']?jpn/i.test(rewrittenLine) || /NAME=["']?(?:Native|Japanese)/i.test(rewrittenLine);

      if (isDub) {
        if (isEng) {
          rewrittenLine = /DEFAULT=/i.test(rewrittenLine)
            ? rewrittenLine.replace(/DEFAULT=NO/i, 'DEFAULT=YES')
            : `${rewrittenLine},DEFAULT=YES`;
        } else if (isJpn) {
          rewrittenLine = /DEFAULT=/i.test(rewrittenLine)
            ? rewrittenLine.replace(/DEFAULT=YES/i, 'DEFAULT=NO')
            : `${rewrittenLine},DEFAULT=NO`;
        }
      } else {
        if (isEng) {
          rewrittenLine = /DEFAULT=/i.test(rewrittenLine)
            ? rewrittenLine.replace(/DEFAULT=YES/i, 'DEFAULT=NO')
            : `${rewrittenLine},DEFAULT=NO`;
        } else if (isJpn) {
          rewrittenLine = /DEFAULT=/i.test(rewrittenLine)
            ? rewrittenLine.replace(/DEFAULT=NO/i, 'DEFAULT=YES')
            : `${rewrittenLine},DEFAULT=YES`;
        }
      }

      audioLines.push({ line: rewrittenLine, isEng });
      continue;
    }

    // Rewrite URI in other #EXT-X-MEDIA:TYPE=... (subtitles / other tracks)
    if (trimmed.startsWith('#EXT-X-MEDIA:')) {
      const rewrittenLine = line.replace(/URI=(["'])(.*?)\1/i, (_, quote, uri) => {
        return `URI=${quote}${makeProxyUrl(uri, true)}${quote}`;
      });
      out.push(rewrittenLine);
      continue;
    }

    // Pass through all other comments / tags
    if (trimmed.startsWith('#')) {
      out.push(line);
      continue;
    }

    // Rewrite media segment or sub-playlist URI (video.m3u8)
    const isSubPlaylist =
      trimmed.includes('.m3u8') ||
      (!trimmed.includes('.png') &&
        !trimmed.includes('.webp') &&
        !trimmed.includes('.ts') &&
        !trimmed.includes('.m4s') &&
        !trimmed.includes('.mp4'));
    out.push(makeProxyUrl(trimmed, isSubPlaylist));
  }

  // Place audio tracks back into the playlist, ordered by preference
  if (audioLines.length > 0) {
    if (isDub) {
      audioLines.sort((a, b) => (b.isEng ? 1 : 0) - (a.isEng ? 1 : 0));
    } else {
      audioLines.sort((a, b) => (a.isEng ? 1 : 0) - (b.isEng ? 1 : 0));
    }

    const headerIdx = out.findIndex((l) => !l.startsWith('#EXTM3U') && !l.startsWith('#EXT-X-VERSION'));
    const insertIdx = headerIdx >= 0 ? headerIdx : 1;
    out.splice(insertIdx, 0, ...audioLines.map((a) => a.line));
  }

  return out.join('\n');
}
