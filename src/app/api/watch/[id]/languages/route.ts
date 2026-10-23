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
    let originalLanguage = searchParams.get('origLang') || (mediaType === 'anime' ? 'ja' : 'en');
    let title = searchParams.get('title') || undefined;
    const aniListId = searchParams.get('aniListId') ? parseInt(searchParams.get('aniListId')!, 10) : undefined;
    const malId = searchParams.get('malId') ? parseInt(searchParams.get('malId')!, 10) : undefined;

    if (!title && !aniListId) {
      try {
        const apiKey = process.env.TMDB_API_KEY || '493425cbd908e787bf8746644c42bf66';
        if (apiKey) {
          const endpoint = mediaType === 'movie' ? `/movie/${id}` : `/tv/${id}`;
          const res = await fetch(`https://api.tmdb.org/3${endpoint}?api_key=${apiKey}`, {
            next: { revalidate: 3600 },
          });
          if (res.ok) {
            const data = await res.json();
            title = data.name || data.title || data.original_name || data.original_title;
            if (data.original_language) {
              originalLanguage = data.original_language;
            }
          }
        }
      } catch {
        // ignore
      }
    }

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

