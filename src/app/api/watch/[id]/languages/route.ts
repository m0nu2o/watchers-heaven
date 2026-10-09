import { NextRequest, NextResponse } from 'next/server';
import { getEpisodeAudioTracksAsync } from '@/lib/audio';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    let mediaType = (searchParams.get('type') || 'movie') as 'movie' | 'tv' | 'anime';
    const season = searchParams.get('s') ? parseInt(searchParams.get('s')!, 10) : undefined;
    const episode = searchParams.get('e') ? parseInt(searchParams.get('e')!, 10) : undefined;
    const originalLanguage = searchParams.get('origLang') || (mediaType === 'anime' ? 'ja' : 'en');
    const title = searchParams.get('title') || undefined;
    const aniListId = searchParams.get('aniListId') ? parseInt(searchParams.get('aniListId')!, 10) : undefined;
    const malId = searchParams.get('malId') ? parseInt(searchParams.get('malId')!, 10) : undefined;

    const availability = await getEpisodeAudioTracksAsync({
      mediaId: id,
      mediaType,
      season,
      episode,
      originalLanguage,
      title,
      aniListId,
      malId,
    });

    const languages = availability.tracks.map((t) => ({
      id: t.id,
      label: t.label,
      language: t.language,
      languageCode: t.languageCode,
      type: t.type,
      isOriginal: t.isOriginal,
      provider: t.provider,
      available: t.available,
    }));

    return NextResponse.json(
      {
        success: true,
        ...availability,
        languages,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (err) {
    console.error('Failed to get episode audio tracks:', err);
    return NextResponse.json({ success: false, error: 'Failed to retrieve audio tracks' }, { status: 500 });
  }
}

