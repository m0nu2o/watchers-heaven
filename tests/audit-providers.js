const https = require('https');
const http = require('http');

const testUrls = [
  // 1. VidLink
  { id: 'vidlink', url: 'https://vidlink.pro/movie/533535' },
  { id: 'vidlink-anime', url: 'https://vidlink.pro/anime/85937/1/1' },
  // 2. VidSrc PM
  { id: 'vidsrc-pm', url: 'https://vidsrc.pm/embed/movie/533535' },
  // 3. AutoEmbed CO
  { id: 'autoembed-co', url: 'https://autoembed.co/movie/tmdb/533535' },
  // 4. ScreenScape
  { id: 'screenscape', url: 'https://screenscape.me/embed?tmdb=533535&type=movie' },
  // 5. 2Embed Skin
  { id: '2embed-skin', url: 'https://2embed.skin/embed/533535' },
  // 6. VidSrc SU
  { id: 'vidsrc-su', url: 'https://vidsrc.su/embed/movie/533535' },
];

async function checkUrl(item) {
  return new Promise((resolve) => {
    const parsed = new URL(item.url);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.request(
      item.url,
      {
        method: 'HEAD',
        timeout: 8000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://watch-lumina.vercel.app/',
        },
      },
      (res) => {
        resolve({
          id: item.id,
          status: res.statusCode,
          xFrame: res.headers['x-frame-options'] || 'NONE',
          csp: res.headers['content-security-policy'] ? 'PRESENT' : 'NONE',
        });
      }
    );

    req.on('error', (err) => {
      resolve({ id: item.id, status: 'ERROR', error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ id: item.id, status: 'TIMEOUT' });
    });

    req.end();
  });
}

async function run() {
  console.log('Auditing provider endpoints...');
  for (const item of testUrls) {
    const res = await checkUrl(item);
    console.log(`[${res.id}] Status: ${res.status}, X-Frame: ${res.xFrame || 'N/A'}, Error: ${res.error || 'None'}`);
  }
}

run();
