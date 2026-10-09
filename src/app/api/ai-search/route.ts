import { NextRequest, NextResponse } from 'next/server';
import { ApiGateway } from '@/lib/api/gateway';
import { getContentAudioAvailabilityAsync } from '@/lib/audio';
import { isJapaneseAnime, type ClassifiableMedia } from '@/lib/classification';

export async function POST(request: NextRequest) {
  try {
    const { query = '' } = await request.json();
    const rawQuery = query.trim();

    if (!rawQuery) {
      return NextResponse.json({
        reply: 'Please ask a question or search for a title (e.g., "Find Naruto", "Hindi dubbed movies", "Korean dramas").',
        results: [],
      });
    }

    const lowerQuery = rawQuery.toLowerCase();

    // 1. Intent: Korean dramas / K-Drama
    if (lowerQuery.includes('korean') || lowerQuery.includes('k-drama') || lowerQuery.includes('kdrama')) {
      const data = await ApiGateway.fetchTmdb<{ results: Array<Record<string, unknown>> }>('/discover/tv', {
        with_original_language: 'ko',
        sort_by: 'popularity.desc',
        include_adult: 'false',
      });
      const items = (data.results || []).slice(0, 6).map((item) => ({
        id: item.id,
        title: item.name || item.original_name,
        year: item.first_air_date ? String(item.first_air_date).split('-')[0] : '',
        posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : null,
        mediaType: 'tv',
        rating: item.vote_average,
        overview: item.overview,
        audioBadges: ['🇰🇷 Korean (Original)', '🇮🇳 Hindi (Available on Select Titles)'],
      }));

      return NextResponse.json({
        reply: `Here are the top trending Korean Dramas available to stream on Lumina with original Korean audio and multi-subtitles:`,
        results: items,
      });
    }

    // 2. Intent: Chinese dramas / C-Drama
    if (lowerQuery.includes('chinese drama') || lowerQuery.includes('c-drama') || lowerQuery.includes('cdrama')) {
      const data = await ApiGateway.fetchTmdb<{ results: Array<Record<string, unknown>> }>('/discover/tv', {
        with_original_language: 'zh',
        sort_by: 'popularity.desc',
        include_adult: 'false',
      });
      const items = (data.results || []).slice(0, 6).map((item) => ({
        id: item.id,
        title: item.name || item.original_name,
        year: item.first_air_date ? String(item.first_air_date).split('-')[0] : '',
        posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : null,
        mediaType: 'tv',
        rating: item.vote_average,
        overview: item.overview,
        audioBadges: ['🇨🇳 Mandarin (Original)'],
      }));

      return NextResponse.json({
        reply: `Here are popular Chinese Dramas (C-Dramas) available on Lumina:`,
        results: items,
      });
    }

    // 3. Intent: Hindi dubbed movies / Bollywood
    if (lowerQuery.includes('hindi') && (lowerQuery.includes('movie') || lowerQuery.includes('film'))) {
      const data = await ApiGateway.fetchTmdb<{ results: Array<Record<string, unknown>> }>('/discover/movie', {
        with_original_language: 'hi',
        sort_by: 'popularity.desc',
        include_adult: 'false',
      });
      const items = (data.results || []).slice(0, 6).map((item) => ({
        id: item.id,
        title: item.title || item.original_title,
        year: item.release_date ? String(item.release_date).split('-')[0] : '',
        posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : null,
        mediaType: 'movie',
        rating: item.vote_average,
        overview: item.overview,
        audioBadges: ['🇮🇳 Hindi (Original)'],
      }));

      return NextResponse.json({
        reply: `Found top popular Hindi cinema available with native Hindi audio:`,
        results: items,
      });
    }

    // 4. Intent: English dubbed anime
    if (lowerQuery.includes('dubbed anime') || (lowerQuery.includes('anime') && lowerQuery.includes('english'))) {
      const data = await ApiGateway.fetchTmdb<{ results: Array<Record<string, unknown>> }>('/discover/tv', {
        with_genres: '16',
        with_original_language: 'ja',
        sort_by: 'popularity.desc',
        include_adult: 'false',
      });
      const rawList = (data.results || []).slice(0, 6);
      const items = await Promise.all(
        rawList.map(async (item) => {
          const avail = await getContentAudioAvailabilityAsync({
            id: Number(item.id),
            mediaType: 'anime',
            originalLanguage: 'ja',
            title: String(item.name || ''),
          });
          const hasEn = avail.dub.en;
          const badges = ['🇯🇵 Japanese (SUB)'];
          if (hasEn) badges.push('🇬🇧 English (DUB)');
          if (avail.dub.hi) badges.push('🇮🇳 Hindi (DUB)');

          return {
            id: item.id,
            title: item.name || item.original_name,
            year: item.first_air_date ? String(item.first_air_date).split('-')[0] : '',
            posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : null,
            mediaType: 'anime',
            rating: item.vote_average,
            overview: item.overview,
            audioBadges: badges,
          };
        })
      );

      return NextResponse.json({
        reply: `Here are popular anime titles with verified audio availability:`,
        results: items,
      });
    }

    // 5. Standard multi-search for specific title (e.g., "Find Naruto", "Breaking Bad", "Inception")
    const cleanSearch = rawQuery
      .replace(/^(find|search|where can i watch|watch|play|stream)\s+/i, '')
      .trim();

    const searchData = await ApiGateway.fetchTmdb<{ results: Array<Record<string, unknown>> }>(
      '/search/multi',
      { query: cleanSearch || rawQuery }
    );

    const hits = (searchData.results || [])
      .filter((item) => item.poster_path && (item.media_type === 'movie' || item.media_type === 'tv'))
      .slice(0, 5);

    if (!hits.length) {
      return NextResponse.json({
        reply: `I searched the Lumina entertainment catalog for "${rawQuery}", but no matching movies or TV series were found. Please verify the title or try alternate keywords.`,
        results: [],
      });
    }

    const items = await Promise.all(
      hits.map(async (item) => {
        const isAnime = isJapaneseAnime(item as ClassifiableMedia);
        const mediaType = isAnime ? 'anime' : item.media_type === 'tv' ? 'tv' : 'movie';
        const title = (item.title as string) || (item.name as string) || '';

        const avail = await getContentAudioAvailabilityAsync({
          id: Number(item.id),
          mediaType: mediaType as 'movie' | 'tv' | 'anime',
          originalLanguage: (item.original_language as string) || 'en',
          title,
        });

        const badges = [isAnime ? '🇯🇵 Japanese (SUB)' : '🌐 Original (SUB)'];
        if (avail.dub.en) badges.push('🇬🇧 English Audio');
        if (avail.dub.hi) badges.push('🇮🇳 Hindi Audio');

        return {
          id: item.id,
          title,
          year: item.release_date
            ? String(item.release_date).split('-')[0]
            : item.first_air_date
            ? String(item.first_air_date).split('-')[0]
            : '',
          posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : null,
          mediaType,
          rating: item.vote_average,
          overview: item.overview,
          audioBadges: badges,
        };
      })
    );

    return NextResponse.json({
      reply: `Found ${items.length} verified titles for "${cleanSearch || rawQuery}". Click any card to launch the cinema player:`,
      results: items,
    });
  } catch (err) {
    console.error('AI search endpoint error:', err);
    return NextResponse.json(
      {
        reply: 'An error occurred while querying the entertainment catalog. Please try again.',
        results: [],
      },
      { status: 500 }
    );
  }
}
