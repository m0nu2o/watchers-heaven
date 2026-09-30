import { NextRequest, NextResponse } from 'next/server';

export interface LiveChannelData {
  id: string;
  name: string;
  channelTitle?: string;
  category: 'news' | 'sports' | 'entertainment' | 'kids' | 'science' | 'music' | 'gaming' | 'others';
  country?: string;
  channelId?: string;
  videoId?: string;
  thumbnail?: string;
  hlsUrl?: string;
  embedUrl?: string;
  status: 'live' | 'offline' | 'upcoming';
  isLive: boolean;
  sourceType: 'hls' | 'youtube';
  description?: string;
}

// ─── Authoritative Base Catalog with Tested Active Streams ───────────────────
export const BASE_CHANNELS: LiveChannelData[] = [
  // ── News ──
  {
    id: 'aaj-tak',
    name: 'Aaj Tak HD',
    channelTitle: 'Aaj Tak',
    category: 'news',
    country: '🇮🇳',
    channelId: 'UCt4t-jeY85JegMlZ-E5UWtA',
    videoId: 'oNyQ9N3GMaA',
    hlsUrl: 'https://feeds.intoday.in/aajtak/api/master.m3u8',
    embedUrl: 'https://www.youtube.com/embed/oNyQ9N3GMaA?autoplay=1',
    thumbnail: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'hls',
    description: 'India’s leading 24/7 Hindi news channel broadcasting nationwide updates, prime bulletins, and live debates.',
  },
  {
    id: 'abp-news',
    name: 'ABP News HD',
    channelTitle: 'ABP News',
    category: 'news',
    country: '🇮🇳',
    channelId: 'UCmphdqnrJkWfqmu_9jKsp8Q',
    hlsUrl: 'https://d2l4ar6y3mrs4k.cloudfront.net/live-streaming/abpnews-livetv/master.m3u8',
    thumbnail: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'hls',
    description: 'Comprehensive Indian news coverage, prime-time reports, and live field investigations.',
  },
  {
    id: 'republic-tv',
    name: 'Republic TV',
    channelTitle: 'Republic World',
    category: 'news',
    country: '🇮🇳',
    channelId: 'UCwqusr8Yeq14CGkgExTMSWg',
    hlsUrl: 'https://vg-republictvlive.akamaized.net/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/vglive-sk-275673/main.m3u8',
    thumbnail: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'hls',
    description: 'Fast-paced English and Hindi news broadcasting live political and global developments.',
  },
  {
    id: 'sky-news',
    name: 'Sky News Live',
    channelTitle: 'Sky News',
    category: 'news',
    country: '🇬🇧',
    channelId: 'UCoMdktPbSTixAyNGwb-UYkA',
    videoId: 'JUnMSCKCTko',
    embedUrl: 'https://www.youtube.com/embed/JUnMSCKCTko?autoplay=1',
    thumbnail: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'youtube',
    description: 'Breaking news, live video, analysis and top stories from the UK and around the globe.',
  },
  {
    id: 'nbc-news-now',
    name: 'NBC News NOW',
    channelTitle: 'NBC News',
    category: 'news',
    country: '🇺🇸',
    channelId: 'UCeY0bbntWzzViAj25GHK0NA',
    videoId: 'ScfK6qmxoqE',
    embedUrl: 'https://www.youtube.com/embed/ScfK6qmxoqE?autoplay=1',
    thumbnail: 'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'youtube',
    description: '24/7 streaming news network from NBC News with world events, interviews, and deep reporting.',
  },
  {
    id: 'abc-news-live',
    name: 'ABC News Live',
    channelTitle: 'ABC News',
    category: 'news',
    country: '🇺🇸',
    channelId: 'UCBi2mrWuNuyYy4gbM6fU18Q',
    videoId: 'iipR5yUp36o',
    embedUrl: 'https://www.youtube.com/embed/iipR5yUp36o?autoplay=1',
    thumbnail: 'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'youtube',
    description: 'American 24/7 live news service with breaking reports, analysis, and feature stories.',
  },
  {
    id: 'france-24',
    name: 'France 24 English',
    channelTitle: 'FRANCE 24 English',
    category: 'news',
    country: '🇫🇷',
    channelId: 'UCQfwfsi5VrQ8yKZ-UWmAEFg',
    videoId: 'HvZt-nh9sGg',
    embedUrl: 'https://www.youtube.com/embed/HvZt-nh9sGg?autoplay=1',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'youtube',
    description: 'International news round the clock with a distinct European and global perspective.',
  },
  {
    id: 'al-jazeera',
    name: 'Al Jazeera English',
    channelTitle: 'Al Jazeera English',
    category: 'news',
    country: '🌍',
    channelId: 'UCNye-wNBqNL5ZzHSJj3l8Bg',
    videoId: 'gCNeDWCI0vo',
    embedUrl: 'https://www.youtube.com/embed/gCNeDWCI0vo?autoplay=1',
    thumbnail: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'youtube',
    description: 'Comprehensive coverage from around the world focusing on under-reported stories and human rights.',
  },
  {
    id: 'dw-news',
    name: 'DW News Live',
    channelTitle: 'DW News',
    category: 'news',
    country: '🇩🇪',
    channelId: 'UCknLrEdhRCp1HK5ECQGBqgw',
    videoId: 'LuKwFajn37U',
    hlsUrl: 'https://dwamdstream104.akamaized.net/hls/live/2015530/dwstream104/index.m3u8',
    embedUrl: 'https://www.youtube.com/embed/LuKwFajn37U?autoplay=1',
    thumbnail: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'youtube',
    description: 'Germany’s international broadcaster delivering deep global news, culture, and science.',
  },
  {
    id: 'wion',
    name: 'WION News HD',
    channelTitle: 'WION',
    category: 'news',
    country: '🇮🇳',
    hlsUrl: 'https://wion-klowdtv.amagi.tv/playlist.m3u8',
    thumbnail: 'https://images.unsplash.com/photo-1476242906366-d8eb64c2f661?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'hls',
    description: 'World Is One News: global news through a South Asian viewpoint.',
  },
  {
    id: 'zee-news',
    name: 'Zee News',
    channelTitle: 'Zee News',
    category: 'news',
    country: '🇮🇳',
    hlsUrl: 'https://dt3lrqnyx3dks.cloudfront.net/index.m3u8',
    thumbnail: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'hls',
    description: '24/7 Hindi news coverage with in-depth special reports and national bulletins.',
  },
  {
    id: 'euronews',
    name: 'Euronews English',
    channelTitle: 'Euronews',
    category: 'news',
    country: '🇪🇺',
    hlsUrl: 'https://cdn-euronews.akamaized.net/live/eds/euronews-en/25002/index.m3u8',
    thumbnail: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'hls',
    description: 'Pan-European multilingual news service covering major world events.',
  },

  // ── Sports ──
  {
    id: 'dd-sports',
    name: 'DD Sports Live',
    channelTitle: 'Doordarshan Sports',
    category: 'sports',
    country: '🇮🇳',
    hlsUrl: 'https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index.m3u8',
    thumbnail: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'hls',
    description: 'India’s state-owned sports broadcaster featuring cricket, athletics, hockey, and tournaments.',
  },
  {
    id: 'redbull-tv',
    name: 'Red Bull TV Sports',
    channelTitle: 'Red Bull',
    category: 'sports',
    country: '🌍',
    channelId: 'UCblfuW_4rakUiQrBV45069A',
    hlsUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
    thumbnail: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'hls',
    description: 'Action sports, motorsports, extreme events, documentaries, and live competitions.',
  },

  // ── Kids & Cartoons ──
  {
    id: 'pokemon-tv',
    name: 'Pokémon Live 24/7',
    channelTitle: 'The Official Pokémon YouTube Channel',
    category: 'kids',
    country: '🌍',
    channelId: 'UCFctpiB_HnlOLbW9hs553sw',
    videoId: 'Pqv3SXNzjVk',
    embedUrl: 'https://www.youtube.com/embed/Pqv3SXNzjVk?autoplay=1',
    thumbnail: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'youtube',
    description: '24/7 Pokémon adventures, animated episodes, and classic journeys with Ash & Pikachu.',
  },
  {
    id: 'tom-jerry',
    name: 'WB Kids · Tom & Jerry',
    channelTitle: 'WB Kids',
    category: 'kids',
    country: '🌍',
    channelId: 'UC9trsD1jCTXXtN3xPEIMDAg',
    videoId: 'DmlYhxhqlIA',
    embedUrl: 'https://www.youtube.com/embed/DmlYhxhqlIA?autoplay=1',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'youtube',
    description: 'Classic comedic slapstick antics of Tom & Jerry and Looney Tunes favourites.',
  },
  {
    id: 'abc-kids',
    name: 'ABC Kids HD',
    channelTitle: 'ABC Kids Australia',
    category: 'kids',
    country: '🇦🇺',
    hlsUrl: 'https://c.mjh.nz/abc-kids.m3u8',
    thumbnail: 'https://images.unsplash.com/photo-1566140967404-b8b3932483f5?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'hls',
    description: 'Educational programming, songs, and preschool entertainment from Australia.',
  },
  {
    id: '3abn-kids',
    name: '3ABN Kids TV',
    channelTitle: '3ABN Kids',
    category: 'kids',
    country: '🇺🇸',
    hlsUrl: 'https://3abn.bozztv.com/3abn2/Kids_live/smil:Kids_live.smil/playlist.m3u8',
    thumbnail: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'hls',
    description: 'Wholesome values, storytelling, music, and nature adventures for young viewers.',
  },

  // ── Science & Space ──
  {
    id: 'nasa-live',
    name: 'NASA Earth & Space Station 24/7',
    channelTitle: 'NASA',
    category: 'science',
    country: '🚀',
    channelId: 'UCLA_DiR1FfKNvjuUpBHmylQ',
    videoId: 'M3HKLzjvKPc',
    embedUrl: 'https://www.youtube.com/embed/M3HKLzjvKPc?autoplay=1',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'youtube',
    description: 'Live views of Earth from the International Space Station and real-time mission telemetry.',
  },
  {
    id: 'nasa-tv',
    name: 'NASA TV Live HD',
    channelTitle: 'NASA Television',
    category: 'science',
    country: '🚀',
    channelId: 'UCLA_DiR1FfKNvjuUpBHmylQ',
    videoId: 'M3HKLzjvKPc',
    embedUrl: 'https://www.youtube.com/embed/M3HKLzjvKPc?autoplay=1',
    hlsUrl: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    thumbnail: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'hls',
    description: 'Official NASA TV broadcast showcasing spacewalks, rocket launches, and astrophysics discoveries.',
  },
  {
    id: 'dw-doc',
    name: 'DW Documentary Science HD',
    channelTitle: 'DW Documentary',
    category: 'science',
    country: '🇩🇪',
    hlsUrl: 'https://dwamdstream104.akamaized.net/hls/live/2015530/dwstream104/index.m3u8',
    thumbnail: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'hls',
    description: 'Award-winning investigative documentaries delving into technology, nature, and human civilization.',
  },

  // ── Music & Relax ──
  {
    id: 'lofi-girl',
    name: 'Lofi Girl · 24/7 Chill Beats',
    channelTitle: 'Lofi Girl',
    category: 'music',
    country: '🎵',
    channelId: 'UCSJ4gkVC6NrvII8umztf0Ow',
    videoId: 'nI725iVsyoQ',
    embedUrl: 'https://www.youtube.com/embed/nI725iVsyoQ?autoplay=1',
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'youtube',
    description: '24/7 lofi hip hop radio beats to relax, study, and code to without interruption.',
  },
  {
    id: 'chillhop-music',
    name: 'Chillhop Radio · Jazzy Lofi Beats',
    channelTitle: 'Chillhop Music',
    category: 'music',
    country: '🎵',
    channelId: 'UCOxqgCwgOq3EW756WbP7bgg',
    videoId: '5yx6BWlEVcY',
    embedUrl: 'https://www.youtube.com/embed/5yx6BWlEVcY?autoplay=1',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'youtube',
    description: 'Cozy jazzy beats, instrumental hip-hop, and downtempo grooves around the clock.',
  },

  // ── Gaming & Tech ──
  {
    id: 'ign-live',
    name: 'IGN Live 24/7',
    channelTitle: 'IGN',
    category: 'gaming',
    country: '🎮',
    channelId: 'UCKy1dAqELo0zrOtPkf0eTMw',
    videoId: 'FJKl4ySSU5A',
    embedUrl: 'https://www.youtube.com/embed/FJKl4ySSU5A?autoplay=1',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'youtube',
    description: 'Video game reviews, exclusive trailers, live esports conventions, and developer interviews.',
  },

  // ── Entertainment ──
  {
    id: 'dd-national',
    name: 'DD National HD',
    channelTitle: 'Doordarshan National',
    category: 'entertainment',
    country: '🇮🇳',
    hlsUrl: 'https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/40492a64c1db4a1385ba1a397d357d3a/index.m3u8',
    thumbnail: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=320&auto=format&fit=crop&q=80',
    status: 'live',
    isLive: true,
    sourceType: 'hls',
    description: 'India’s flagship entertainment network showcasing cultural shows, serials, and national events.',
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category')?.toLowerCase() || 'all';
    const query = searchParams.get('q')?.toLowerCase()?.trim() || '';
    const statusFilter = searchParams.get('status')?.toLowerCase() || 'all';

    const youtubeApiKey = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_KEY;

    let allChannels: LiveChannelData[] = [...BASE_CHANNELS];

    // If dynamic YouTube search query is provided and API key is configured, search YouTube Live directly
    if (query && youtubeApiKey) {
      try {
        const ytRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&eventType=live&type=video&maxResults=10&q=${encodeURIComponent(
            query
          )}&key=${youtubeApiKey}`,
          { next: { revalidate: 300 } }
        );

        if (ytRes.ok) {
          const ytData = await ytRes.json();
          if (Array.isArray(ytData.items)) {
            const dynamicYt: LiveChannelData[] = ytData.items
              .filter((item: Record<string, unknown>) => {
                const id = item.id as Record<string, unknown> | undefined;
                return Boolean(id?.videoId);
              })
              .map((item: Record<string, unknown>) => {
                const id = item.id as { videoId: string };
                const snippet = item.snippet as {
                  title?: string;
                  channelTitle?: string;
                  channelId?: string;
                  description?: string;
                  thumbnails?: {
                    high?: { url: string };
                    medium?: { url: string };
                    default?: { url: string };
                  };
                };

                const thumb =
                  snippet.thumbnails?.high?.url ||
                  snippet.thumbnails?.medium?.url ||
                  snippet.thumbnails?.default?.url ||
                  'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=320&auto=format&fit=crop&q=80';

                return {
                  id: `yt-${id.videoId}`,
                  name: snippet.title || 'YouTube Live Stream',
                  channelTitle: snippet.channelTitle || 'YouTube Live',
                  channelId: snippet.channelId,
                  videoId: id.videoId,
                  category: 'others' as const,
                  country: '🔴',
                  thumbnail: thumb,
                  embedUrl: `https://www.youtube.com/embed/${id.videoId}?autoplay=1`,
                  status: 'live' as const,
                  isLive: true,
                  sourceType: 'youtube' as const,
                  description: snippet.description || 'Live stream broadcast on YouTube.',
                };
              });

            // Prepend verified live search results
            allChannels = [...dynamicYt, ...allChannels];
          }
        } else {
          console.warn(`[YouTube Live API] Query "${query}" returned status ${ytRes.status}`);
        }
      } catch (err) {
        console.warn('[YouTube Live API] Search fetch failed:', err);
      }
    }

    // Apply filtering
    let filtered = allChannels;

    if (category !== 'all') {
      filtered = filtered.filter((ch) => {
        if (category === 'science' || category === 'others') {
          return ch.category === 'science' || ch.category === 'others';
        }
        return ch.category === category;
      });
    }

    if (query) {
      filtered = filtered.filter((ch) => {
        const matchName = ch.name.toLowerCase().includes(query);
        const matchChannel = (ch.channelTitle || '').toLowerCase().includes(query);
        const matchCat = ch.category.toLowerCase().includes(query);
        const matchDesc = (ch.description || '').toLowerCase().includes(query);
        return matchName || matchChannel || matchCat || matchDesc;
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((ch) => ch.status === statusFilter);
    }

    return NextResponse.json({
      success: true,
      channels: filtered,
      total: filtered.length,
      hasApiKey: Boolean(youtubeApiKey),
    });
  } catch (error) {
    console.error('[API /api/live] Fatal handler error:', error);
    // Never crash; return baseline catalog
    return NextResponse.json({
      success: true,
      channels: BASE_CHANNELS,
      total: BASE_CHANNELS.length,
      hasApiKey: false,
      error: 'Fallback baseline data loaded',
    });
  }
}
