/**
 * Live Audit Script for all 13 Streaming Server Adapters
 */

const testCases = [
  {
    name: 'Movie (Fight Club - TMDB 550, IMDb tt0137523)',
    type: 'movie',
    tmdbId: 550,
    imdbId: 'tt0137523',
    providers: {
      'vidlink': 'https://vidlink.pro/movie/550',
      'vidsrc-pm': 'https://vidsrc.pm/embed/movie/550',
      'autoembed-co': 'https://autoembed.co/movie/tmdb/550',
      'screenscape': 'https://screenscape.me/embed?tmdb=550&type=movie',
      '2embed-skin': 'https://2embed.skin/embed/550',
      '2embed-cc': 'https://www.2embed.cc/embed/550',
      'vidsrc-su': 'https://vidsrc.su/embed/movie/550',
      'nova': 'https://slast430did.com/play/tt0137523',
    }
  },
  {
    name: 'TV Series (Squid Game - TMDB 93405, IMDb tt10919420 S1E1)',
    type: 'tv',
    tmdbId: 93405,
    imdbId: 'tt10919420',
    season: 1,
    episode: 1,
    providers: {
      'vidlink': 'https://vidlink.pro/tv/93405/1/1',
      'vidsrc-pm': 'https://vidsrc.pm/embed/tv/93405/1/1',
      'autoembed-co': 'https://autoembed.co/tv/tmdb/93405-1-1',
      'screenscape': 'https://screenscape.me/embed?tmdb=93405&type=tv&s=1&e=1',
      '2embed-skin': 'https://2embed.skin/embedtv/93405&s=1&e=1',
      '2embed-cc': 'https://www.2embed.cc/embedtv/93405&s=1&e=1',
      'vidsrc-su': 'https://vidsrc.su/embed/tv/93405/1/1',
      'nova': 'https://slast430did.com/play/tt10919420?season=1&episode=1',
    }
  },
  {
    name: 'Anime (Demon Slayer - TMDB 85937, MAL 38000 S1E1)',
    type: 'anime',
    tmdbId: 85937,
    malId: 38000,
    season: 1,
    episode: 1,
    providers: {
      'vidlink-anime': 'https://vidlink.pro/anime/38000/1/1',
      'vidsrc-pm-anime': 'https://vidsrc.pm/embed/tv/85937/1/1',
      'autoembed-co-anime': 'https://autoembed.co/tv/tmdb/85937-1-1',
      '2embed-skin-anime': 'https://2embed.skin/embedtv/85937&s=1&e=1',
      'screenscape-anime': 'https://screenscape.me/embed?tmdb=85937&type=tv&s=1&e=1&lan=jap',
      'vidsrc-su-anime': 'https://vidsrc.su/embed/tv/85937/1/1',
    }
  }
];

async function probeUrl(url) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Sec-Fetch-Dest': 'iframe',
        'Sec-Fetch-Mode': 'navigate',
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const duration = Date.now() - start;
    const xFrame = res.headers.get('x-frame-options');
    const csp = res.headers.get('content-security-policy');
    const isFrameBlocked = xFrame && (xFrame.toLowerCase().includes('deny') || xFrame.toLowerCase().includes('sameorigin'));

    return {
      ok: res.ok,
      status: res.status,
      duration,
      isFrameBlocked,
      xFrame: xFrame || 'none',
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      duration: Date.now() - start,
      error: err.name === 'AbortError' ? 'TIMEOUT (6s)' : err.message,
    };
  }
}

async function auditAll() {
  console.log('AUDITING ALL STREAMING PROVIDERS...\n');

  for (const tc of testCases) {
    console.log(`=== ${tc.name} ===`);
    for (const [id, url] of Object.entries(tc.providers)) {
      const result = await probeUrl(url);
      const icon = result.ok ? '✅' : '❌';
      console.log(
        `${icon} [${id.padEnd(18)}] ${String(result.status).padEnd(4)} (${result.duration}ms) ` +
        `${result.isFrameBlocked ? '🚫 BLOCKED BY X-FRAME' : ''} ${result.error || ''}`
      );
    }
    console.log('');
  }
}

auditAll();
