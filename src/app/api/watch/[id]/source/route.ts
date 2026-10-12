import { NextRequest, NextResponse } from 'next/server';
import { resolveAudioSourceAsync } from '@/lib/audio';
import { ApiGateway } from '@/lib/api/gateway';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    let type = (searchParams.get('type') || 'movie') as 'movie' | 'tv' | 'anime';
    const season = searchParams.get('s') || searchParams.get('season') ? parseInt(searchParams.get('s') || searchParams.get('season')!, 10) : undefined;
    const episode = searchParams.get('e') || searchParams.get('episode') ? parseInt(searchParams.get('e') || searchParams.get('episode')!, 10) : undefined;
    const trackId = searchParams.get('track') || searchParams.get('trackId') || 'sub';
    const provider = searchParams.get('provider') || undefined;
    let aniListId = searchParams.get('aniListId') ? parseInt(searchParams.get('aniListId')!, 10) : undefined;
    let malId = searchParams.get('malId') ? parseInt(searchParams.get('malId')!, 10) : undefined;
    const startTime = searchParams.get('startTime') ? parseFloat(searchParams.get('startTime')!) : 0;
    const accentColor = searchParams.get('accentColor') || undefined;
    const originalLanguage = searchParams.get('origLang') || (type === 'anime' ? 'ja' : 'en');
    let title = searchParams.get('title') || undefined;

    const imdbId = searchParams.get('imdbId') || searchParams.get('imdb') || undefined;

    if (!title && !aniListId) {
      try {
        const apiKey = process.env.TMDB_API_KEY;
        if (apiKey) {
          const tmdbEndpoint = type === 'movie' ? `/movie/${id}` : `/tv/${id}`;
          const res = await fetch(`https://api.tmdb.org/3${tmdbEndpoint}?api_key=${apiKey}`, {
            next: { revalidate: 3600 },
          });
          if (res.ok) {
            const data = await res.json();
            title = data.name || data.title || data.original_name || data.original_title;
          }
        }
      } catch {
        // ignore
      }
    }

    if (type === 'anime' && !aniListId && title) {
      try {
        const anilistDetails = await ApiGateway.getAniListMediaDetails(title);
        if (anilistDetails?.id) {
          aniListId = anilistDetails.id;
          if (!malId && anilistDetails.malId) {
            malId = anilistDetails.malId;
          }
        }
      } catch {
        // ignore
      }
    }

    const result = await resolveAudioSourceAsync({
      mediaType: type,
      id,
      imdbId,
      audioTrackId: trackId,
      season,
      episode,
      preferredProvider: provider,
      aniListId,
      malId,
      startTime,
      accentColor,
      originalLanguage,
      title,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Failed to resolve audio source (GET):', err);
    return NextResponse.json(
      { success: false, available: false, error: 'Internal error resolving source' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const {
      season,
      episode,
      trackId = 'sub',
      provider,
      aniListId,
      malId,
      startTime,
      accentColor,
      title,
    } = body;
    const imdbId = body.imdbId || body.imdb || undefined;
    let type = (body.type || 'movie') as 'movie' | 'tv' | 'anime';
    const originalLanguage = body.originalLanguage || (type === 'anime' ? 'ja' : 'en');
    let resolvedTitle = title;

    if (!resolvedTitle && !aniListId) {
      try {
        const apiKey = process.env.TMDB_API_KEY;
        if (apiKey) {
          const tmdbEndpoint = type === 'movie' ? `/movie/${id}` : `/tv/${id}`;
          const res = await fetch(`https://api.tmdb.org/3${tmdbEndpoint}?api_key=${apiKey}`, {
            next: { revalidate: 3600 },
          });
          if (res.ok) {
            const data = await res.json();
            resolvedTitle = data.name || data.title || data.original_name || data.original_title;
          }
        }
      } catch {
        // ignore
      }
    }

    let resolvedAniListId = aniListId;
    let resolvedMalId = malId;

    if (type === 'anime' && !resolvedAniListId && resolvedTitle) {
      try {
        const anilistDetails = await ApiGateway.getAniListMediaDetails(resolvedTitle);
        if (anilistDetails?.id) {
          resolvedAniListId = anilistDetails.id;
          if (!resolvedMalId && anilistDetails.malId) {
            resolvedMalId = anilistDetails.malId;
          }
        }
      } catch {
        // ignore
      }
    }

    const result = await resolveAudioSourceAsync({
      mediaType: type,
      id,
      imdbId,
      audioTrackId: trackId,
      season,
      episode,
      preferredProvider: provider,
      aniListId: resolvedAniListId,
      malId: resolvedMalId,
      startTime,
      accentColor,
      originalLanguage,
      title: resolvedTitle,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Failed to resolve audio source (POST):', err);
    return NextResponse.json(
      { success: false, available: false, error: 'Internal error resolving source' },
      { status: 500 }
    );
  }
}

