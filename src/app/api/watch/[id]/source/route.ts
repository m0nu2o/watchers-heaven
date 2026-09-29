import { NextRequest, NextResponse } from 'next/server';
import { resolveAudioSourceAsync } from '@/lib/audio';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'movie') as 'movie' | 'tv' | 'anime';
    const season = searchParams.get('s') || searchParams.get('season') ? parseInt(searchParams.get('s') || searchParams.get('season')!, 10) : undefined;
    const episode = searchParams.get('e') || searchParams.get('episode') ? parseInt(searchParams.get('e') || searchParams.get('episode')!, 10) : undefined;
    const trackId = searchParams.get('track') || searchParams.get('trackId') || 'sub';
    const provider = searchParams.get('provider') || undefined;
    const aniListId = searchParams.get('aniListId') ? parseInt(searchParams.get('aniListId')!, 10) : undefined;
    const malId = searchParams.get('malId') ? parseInt(searchParams.get('malId')!, 10) : undefined;
    const startTime = searchParams.get('startTime') ? parseFloat(searchParams.get('startTime')!) : 0;
    const accentColor = searchParams.get('accentColor') || undefined;
    const originalLanguage = searchParams.get('origLang') || (type === 'anime' ? 'ja' : 'en');
    const title = searchParams.get('title') || undefined;

    const result = await resolveAudioSourceAsync({
      mediaType: type,
      id,
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
      type = 'movie',
      season,
      episode,
      trackId = 'sub',
      provider,
      aniListId,
      malId,
      startTime,
      accentColor,
      originalLanguage = type === 'anime' ? 'ja' : 'en',
      title,
    } = body;

    const result = await resolveAudioSourceAsync({
      mediaType: type,
      id,
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
    console.error('Failed to resolve audio source (POST):', err);
    return NextResponse.json(
      { success: false, available: false, error: 'Internal error resolving source' },
      { status: 500 }
    );
  }
}

