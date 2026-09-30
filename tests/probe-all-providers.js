const https = require('https');
const http = require('http');

const TEST_MEDIA = {
  movie_hollywood: { id: 550, imdb: 'tt0137523', title: 'Fight Club', type: 'movie' },
  movie_bollywood: { id: 579974, imdb: 'tt8178634', title: 'RRR', type: 'movie' },
  tv_series: { id: 1396, imdb: 'tt0903747', title: 'Breaking Bad', type: 'tv', s: 1, e: 1 },
  kdrama: { id: 93405, imdb: 'tt10919420', title: 'Squid Game', type: 'tv', s: 1, e: 1 },
  cdrama: { id: 91363, imdb: 'tt10554904', title: 'The Untamed', type: 'tv', s: 1, e: 1 },
  anime_shonen: { id: 85937, malId: 40748, title: 'Demon Slayer', type: 'tv', s: 1, e: 1, isAnime: true },
  anime_sololeveling: { id: 94664, malId: 52299, title: 'Solo Leveling', type: 'tv', s: 1, e: 1, isAnime: true }
};

const PROVIDER_URL_TEMPLATES = [
  // ─── Movies & TV ───
  { id: 'vidlink', name: 'VidLink Pro', getUrl: (m) => m.type === 'movie' ? `https://vidlink.pro/movie/${m.id}?primaryColor=3b82f6` : `https://vidlink.pro/tv/${m.id}/${m.s}/${m.e}?primaryColor=3b82f6` },
  { id: 'vidsrc-pm', name: 'VidSrc PM', getUrl: (m) => m.type === 'movie' ? `https://vidsrc.pm/embed/movie/${m.id}` : `https://vidsrc.pm/embed/tv/${m.id}/${m.s}/${m.e}` },
  { id: 'vidsrc-cc', name: 'VidSrc CC', getUrl: (m) => m.type === 'movie' ? `https://vidsrc.cc/v2/embed/movie/${m.id}` : `https://vidsrc.cc/v2/embed/tv/${m.id}/${m.s}/${m.e}` },
  { id: 'vidsrc-vip', name: 'VidSrc VIP', getUrl: (m) => m.type === 'movie' ? `https://vidsrc.vip/embed/movie/${m.id}` : `https://vidsrc.vip/embed/tv/${m.id}/${m.s}/${m.e}` },
  { id: 'vidsrc-su', name: 'VidSrc SU', getUrl: (m) => m.type === 'movie' ? `https://vidsrc.su/embed/movie/${m.id}` : `https://vidsrc.su/embed/tv/${m.id}/${m.s}/${m.e}` },
  { id: 'autoembed-co', name: 'AutoEmbed CO', getUrl: (m) => m.type === 'movie' ? `https://autoembed.co/movie/tmdb/${m.id}` : `https://autoembed.co/tv/tmdb/${m.id}-${m.s}-${m.e}` },
  { id: 'autoembed-cc', name: 'AutoEmbed CC', getUrl: (m) => m.type === 'movie' ? `https://player.autoembed.cc/embed/movie/${m.id}` : `https://player.autoembed.cc/embed/tv/${m.id}/${m.s}/${m.e}` },
  { id: 'smashystream', name: 'SmashyStream', getUrl: (m) => m.type === 'movie' ? `https://player.smashy.stream/movie/${m.id}` : `https://player.smashy.stream/tv/${m.id}?s=${m.s}&e=${m.e}` },
  { id: 'screenscape', name: 'ScreenScape (Multi-Audio)', getUrl: (m) => m.type === 'movie' ? `https://screenscape.me/embed?tmdb=${m.id}&type=movie` : `https://screenscape.me/embed?tmdb=${m.id}&type=tv&s=${m.s}&e=${m.e}` },
  { id: '2embed-skin', name: '2Embed Skin', getUrl: (m) => m.type === 'movie' ? `https://2embed.skin/embed/${m.id}` : `https://2embed.skin/embedtv/${m.id}&s=${m.s}&e=${m.e}` },
  { id: '2embed-cc', name: '2Embed CC', getUrl: (m) => m.type === 'movie' ? `https://www.2embed.cc/embed/${m.id}` : `https://www.2embed.cc/embedtv/${m.id}&s=${m.s}&e=${m.e}` },
  { id: 'vidfast', name: 'VidFast', getUrl: (m) => m.type === 'movie' ? `https://vidfast.pro/movie/${m.id}` : `https://vidfast.pro/tv/${m.id}/${m.s}/${m.e}` },
  { id: 'multiembed', name: 'MultiEmbed', getUrl: (m) => m.type === 'movie' ? `https://multiembed.mov/?video_id=${m.id}&tmdb=1` : `https://multiembed.mov/?video_id=${m.id}&tmdb=1&s=${m.s}&e=${m.e}` },

  // ─── Dedicated Anime (Sub/Dub) ───
  { id: 'vidlink-anime-sub', name: 'VidLink Anime (SUB)', getUrl: (m) => `https://vidlink.pro/anime/${m.malId || m.id}/1/${m.e}?primaryColor=3b82f6&autoplay=true` },
  { id: 'vidlink-anime-dub', name: 'VidLink Anime (DUB)', getUrl: (m) => `https://vidlink.pro/anime/${m.malId || m.id}/1/${m.e}?primaryColor=3b82f6&autoplay=true&dub=true` },
  { id: 'screenscape-anime-dub-en', name: 'ScreenScape Anime (Eng DUB)', getUrl: (m) => `https://screenscape.me/embed?tmdb=${m.id}&type=tv&s=${m.s}&e=${m.e}&lan=eng` },
  { id: 'screenscape-anime-dub-hi', name: 'ScreenScape Anime (Hindi DUB)', getUrl: (m) => `https://screenscape.me/embed?tmdb=${m.id}&type=tv&s=${m.s}&e=${m.e}&lan=hi` },
];

function probeUrl(url) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.request(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://watch-lumina.vercel.app/',
        },
        timeout: 5000,
      }, (res) => {
        const xFrame = res.headers['x-frame-options'];
        const csp = res.headers['content-security-policy'];
        const isFrameBlocked = (xFrame && (xFrame.includes('DENY') || xFrame.includes('SAMEORIGIN'))) ||
                               (csp && csp.includes('frame-ancestors') && !csp.includes('*') && !csp.includes('vercel.app'));

        let data = '';
        res.on('data', chunk => {
          if (data.length < 5000) data += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            isFrameBlocked: Boolean(isFrameBlocked),
            xFrame: xFrame || null,
            hasPlayerOrVideo: data.includes('player') || data.includes('video') || data.includes('hls') || data.includes('iframe') || data.includes('stream'),
            isForSale: data.includes('for sale') || data.includes('buy this domain') || data.includes('domain parking'),
            len: data.length,
          });
        });
      });

      req.on('error', (e) => resolve({ error: e.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ error: 'TIMEOUT' });
      });
      req.end();
    } catch (err) {
      resolve({ error: err.message });
    }
  });
}

async function runProbes() {
  console.log(`\n=============================================================`);
  console.log(`🔬 PROBING ALL STREAMING PROVIDER ENDPOINTS`);
  console.log(`=============================================================\n`);

  for (const prov of PROVIDER_URL_TEMPLATES) {
    const isAnimeOnly = prov.id.includes('anime');
    const testItem = isAnimeOnly ? TEST_MEDIA.anime_sololeveling : TEST_MEDIA.movie_hollywood;
    const url = prov.getUrl(testItem);

    const result = await probeUrl(url);
    const ok = result.statusCode >= 200 && result.statusCode < 400 && !result.isFrameBlocked && !result.isForSale;

    const statusBadge = ok ? '✅ [ALIVE]' : '❌ [DEAD/BLOCKED]';
    console.log(`${statusBadge} ${prov.name} (${prov.id}):`);
    console.log(`    URL: ${url}`);
    if (result.error) {
      console.log(`    Error: ${result.error}`);
    } else {
      console.log(`    Status: ${result.statusCode} | FrameBlocked: ${result.isFrameBlocked} | HasPlayer: ${result.hasPlayerOrVideo} | ForSale: ${result.isForSale}`);
    }
    console.log('');
  }
}

runProbes().catch(console.error);
