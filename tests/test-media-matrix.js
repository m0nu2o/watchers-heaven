const https = require('https');

const TEST_MEDIA_ITEMS = [
  { category: 'Hollywood Movie', title: 'Fight Club', id: 550, type: 'movie' },
  { category: 'Hollywood Blockbuster (Dubbed)', title: 'Deadpool & Wolverine', id: 533535, type: 'movie' },
  { category: 'Bollywood Movie', title: 'RRR', id: 579974, type: 'movie' },
  { category: 'Bollywood Hit', title: 'Jawan', id: 872906, type: 'movie' },
  { category: 'TV Series', title: 'Breaking Bad', id: 1396, type: 'tv', s: 1, e: 1 },
  { category: 'K-Drama', title: 'Squid Game', id: 93405, type: 'tv', s: 1, e: 1 },
  { category: 'C-Drama', title: 'The Untamed', id: 91363, type: 'tv', s: 1, e: 1 },
  { category: 'Anime (Solo Leveling)', title: 'Solo Leveling', id: 94664, malId: 52299, type: 'anime', s: 1, e: 1 },
  { category: 'Anime (Demon Slayer)', title: 'Demon Slayer', id: 85937, malId: 40748, type: 'anime', s: 1, e: 1 },
];

const SERVERS = [
  { id: 'vidlink', name: 'VidLink HD', getUrl: (m) => m.type === 'movie' ? `https://vidlink.pro/movie/${m.id}?primaryColor=3b82f6` : m.type === 'anime' ? `https://vidlink.pro/anime/${m.malId || m.id}/1/${m.e}?primaryColor=3b82f6` : `https://vidlink.pro/tv/${m.id}/${m.s}/${m.e}?primaryColor=3b82f6` },
  { id: 'vidsrc-pm', name: 'VidSrc Ultra HD', getUrl: (m) => m.type === 'movie' ? `https://vidsrc.pm/embed/movie/${m.id}` : `https://vidsrc.pm/embed/tv/${m.id}/${m.s}/${m.e}` },
  { id: 'vidsrc-su', name: 'VidSrc Direct (vidsrc.su)', getUrl: (m) => m.type === 'movie' ? `https://vidsrc.su/embed/movie/${m.id}` : `https://vidsrc.su/embed/tv/${m.id}/${m.s}/${m.e}` },
  { id: 'autoembed-co', name: 'AutoEmbed HD', getUrl: (m) => m.type === 'movie' ? `https://autoembed.co/movie/tmdb/${m.id}` : `https://autoembed.co/tv/tmdb/${m.id}-${m.s}-${m.e}` },
  { id: 'screenscape', name: 'ScreenScape (Multi-Audio)', getUrl: (m) => m.type === 'movie' ? `https://screenscape.me/embed?tmdb=${m.id}&type=movie` : `https://screenscape.me/embed?tmdb=${m.id}&type=tv&s=${m.s}&e=${m.e}` },
  { id: '2embed-skin', name: '2Embed Direct', getUrl: (m) => m.type === 'movie' ? `https://2embed.skin/embed/${m.id}` : `https://2embed.skin/embedtv/${m.id}&s=${m.s}&e=${m.e}` },
];

function checkUrl(url) {
  return new Promise((resolve) => {
    try {
      const req = https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://watch-lumina.vercel.app/',
        },
        timeout: 4000,
      }, (res) => {
        let text = '';
        res.on('data', chunk => { if (text.length < 2000) text += chunk; });
        res.on('end', () => {
          const isNotFound = text.includes("We Couldn't Find This Episode") || text.includes("Video not found") || text.includes("404 Not Found");
          resolve({ status: res.statusCode, isNotFound });
        });
      });
      req.on('error', (e) => resolve({ error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ error: 'TIMEOUT' }); });
    } catch (e) {
      resolve({ error: e.message });
    }
  });
}

async function testAll() {
  console.log('Testing all media categories against top 6 streaming servers...\n');
  for (const m of TEST_MEDIA_ITEMS) {
    console.log(`🎬 ${m.category}: "${m.title}" (TMDB: ${m.id})`);
    for (const s of SERVERS) {
      const url = s.getUrl(m);
      const res = await checkUrl(url);
      const ok = res.status >= 200 && res.status < 400 && !res.isNotFound;
      console.log(`   ${ok ? '✅' : '❌'} ${s.name}: ${res.status || res.error} ${res.isNotFound ? '(Not Found)' : ''}`);
    }
    console.log('');
  }
}

testAll().catch(console.error);
