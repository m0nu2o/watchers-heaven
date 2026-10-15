import { NextRequest, NextResponse } from 'next/server';
import { resolveStreamingSources } from '@/lib/anime/streamResolver';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || '';
  const episode = parseInt(searchParams.get('episode') || searchParams.get('e') || '1', 10);
  const isDub = searchParams.get('dub') === 'true' || searchParams.get('dub') === '1';
  const rawId = searchParams.get('id') || searchParams.get('animeId') || searchParams.get('tmdbId');
  const directAnilistId = searchParams.get('anilistId');

  if (!title && !rawId && !directAnilistId) {
    return NextResponse.json(
      { success: false, error: 'id, animeId, anilistId, or title required' },
      { status: 400 }
    );
  }

  try {
    const streamResult = await resolveStreamingSources({
      animeId: directAnilistId || undefined,
      tmdbId: rawId,
      episode,
      isDub,
      title: title || null,
    });

    if (streamResult?.success && streamResult.primaryUrl) {
      return NextResponse.json({
        success: true,
        provider: 'NextGen Anime Server (FlixCloud HD-1 & HD-2)',
        primaryUrl: streamResult.primaryUrl,
        embedUrls: (streamResult.sources || []).map((s: any) => ({
          label: s.serverName || s.label || 'NextGen HD',
          url: s.url,
          serverType: s.serverId || 'nextgen_hd1',
          isDub: Boolean(s.isDub),
        })),
        sources: streamResult.sources || [],
        subAvailable: Boolean(streamResult.hasSub),
        dubAvailable: Boolean(streamResult.hasDub),
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: streamResult?.error || 'No verified stream sources found for this episode',
        sources: [],
        embedUrls: [],
      },
      { status: 404 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Anime Stream API] Resolution error:', msg);
    return NextResponse.json(
      { success: false, error: msg, sources: [], embedUrls: [] },
      { status: 500 }
    );
  }
}
