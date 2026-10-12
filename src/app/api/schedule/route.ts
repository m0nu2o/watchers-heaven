import { NextRequest, NextResponse } from 'next/server';
import { ApiGateway } from '@/lib/api/gateway';

export const dynamic = 'force-dynamic';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const ANILIST_SCHEDULE_QUERY = `
query($page: Int, $perPage: Int, $from: Int, $to: Int){
  Page(page: $page, perPage: $perPage){
    pageInfo{
      hasNextPage
    }
    airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME){
      id
      episode
      timeUntilAiring
      airingAt
      media{
        id
        idMal
        title {
          romaji
          english
          userPreferred
        }
        coverImage{
          large
          extraLarge
          color
        }
        bannerImage
        format
        status
        genres
        averageScore
        studios(isMain: true) {
          nodes {
            name
          }
        }
      }
    }
  }
}`;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'anime';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // ── 1. Anime Airing Schedule (AniList GraphQL) ──
    if (type === 'anime') {
      const now = Math.floor(Date.now() / 1000);
      const fromTime = searchParams.get('start')
        ? parseInt(searchParams.get('start')!, 10)
        : now - 86400; // past 24h
      const toTime = searchParams.get('end')
        ? parseInt(searchParams.get('end')!, 10)
        : now + 7 * 86400; // next 7 days

      const allSchedules: any[] = [];
      const pageSize = 50;
      const maxPages = Math.min(Math.ceil(limit / pageSize), 3);

      for (let page = 1; page <= maxPages; page++) {
        const res = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': USER_AGENT,
          },
          body: JSON.stringify({
            query: ANILIST_SCHEDULE_QUERY,
            variables: {
              from: fromTime,
              to: toTime,
              page,
              perPage: pageSize,
            },
          }),
        });

        if (!res.ok) break;

        const data = await res.json();
        const schedules = data?.data?.Page?.airingSchedules;
        if (Array.isArray(schedules) && schedules.length > 0) {
          allSchedules.push(...schedules);
          if (!data?.data?.Page?.pageInfo?.hasNextPage) break;
        } else {
          break;
        }
      }

      const schedule = allSchedules
        .filter((item) => item?.media?.id && (item.media.title?.english || item.media.title?.romaji || item.media.title?.userPreferred))
        .map((item) => {
          const media = item.media;
          const title =
            media.title?.english ||
            media.title?.romaji ||
            media.title?.userPreferred ||
            'Untitled Anime';

          const image =
            media.coverImage?.extraLarge ||
            media.coverImage?.large ||
            '/placeholder.png';

          const score = media.averageScore
            ? (media.averageScore / 10).toFixed(1)
            : null;

          const studio = media.studios?.nodes?.[0]?.name || null;

          return {
            id: media.id,
            idMal: media.idMal,
            title,
            image,
            banner: media.bannerImage,
            episode: item.episode,
            airingAt: item.airingAt,
            timeUntilAiring: item.timeUntilAiring,
            format: media.format || 'TV',
            status: media.status || 'RELEASING',
            genres: media.genres || [],
            score,
            studio,
            category: 'anime',
            href: `/watch/${media.id}?s=1&e=${item.episode}&type=anime`,
          };
        });

      return NextResponse.json(
        {
          success: true,
          type: 'anime',
          count: schedule.length,
          schedule,
          updatedAt: new Date().toISOString(),
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
          },
        }
      );
    }

    // ── 2. K-Drama or TV Shows Upcoming Schedule (TMDB API via ApiGateway) ──
    const isKdrama = type === 'kdrama';
    let results: any[] = [];

    try {
      if (isKdrama) {
        const tmdbData = await ApiGateway.fetchTmdb<{ results?: any[] }>('/discover/tv', {
          with_origin_country: 'KR',
          sort_by: 'popularity.desc',
          page: '1',
          include_adult: 'false',
        });
        results = tmdbData?.results || [];
      } else {
        const tmdbData = await ApiGateway.fetchTmdb<{ results?: any[] }>('/tv/on_the_air', {
          page: '1',
        });
        results = tmdbData?.results || [];
      }
    } catch (err: any) {
      console.warn('TMDB schedule fetch error:', err?.message || err);
      return NextResponse.json({ success: false, error: 'TMDB schedule request failed' }, { status: 502 });
    }

    // Map each show into calendar item
    const schedule = results.slice(0, 30).map((show: any) => {
      const title = show.name || show.original_name || 'TV Show';
      const image = show.poster_path
        ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
        : '/placeholder.png';
      const banner = show.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${show.backdrop_path}`
        : null;

      // Estimate air timestamp based on first_air_date or current week
      const airDateStr = show.first_air_date || new Date().toISOString().split('T')[0];
      const airDate = new Date(airDateStr);
      const airingAt = Math.floor(airDate.getTime() / 1000);

      return {
        id: show.id,
        title,
        image,
        banner,
        episode: 1,
        season: 1,
        airingAt,
        airDate: airDateStr,
        format: 'TV',
        score: show.vote_average ? show.vote_average.toFixed(1) : null,
        overview: show.overview,
        category: isKdrama ? 'kdrama' : 'tv',
        country: show.origin_country?.[0] || (isKdrama ? 'KR' : 'US'),
        href: `/watch/${show.id}?s=1&e=1&type=tv`,
      };
    });

    return NextResponse.json(
      {
        success: true,
        type,
        count: schedule.length,
        schedule,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error: any) {
    console.error('Schedule route error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch upcoming schedule' },
      { status: 500 }
    );
  }
}
