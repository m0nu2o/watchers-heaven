
const servers = [
  // Anime
  { name: 'VidLink Anime HD', url: 'https://vidlink.pro/anime/85937/1/1?primaryColor=3b82f6&autoplay=true' },
  { name: 'VidLink Anime (MAL 38000)', url: 'https://vidlink.pro/anime/38000/1/1?primaryColor=3b82f6&autoplay=true' },
  { name: 'VidSrc Ultra Anime', url: 'https://vidsrc.pm/embed/tv/85937/1/1' },
  { name: 'AutoEmbed Anime', url: 'https://autoembed.co/tv/tmdb/85937-1-1' },
  { name: '2Embed Anime', url: 'https://2embed.skin/embedtv/85937&s=1&e=1' },
  { name: 'ScreenScape Anime', url: 'https://screenscape.me/embed?tmdb=85937&type=tv&s=1&e=1&lan=jap' },
  
  // Movies (Fight Club 550)
  { name: 'VidLink Movie', url: 'https://vidlink.pro/movie/550?autoplay=true&primaryColor=3b82f6' },
  { name: 'VidSrc Ultra Movie', url: 'https://vidsrc.pm/embed/movie/550' },
  { name: 'AutoEmbed Movie', url: 'https://autoembed.co/movie/tmdb/550' },
  { name: 'ScreenScape Movie', url: 'https://screenscape.me/embed?tmdb=550&type=movie&lan=eng' },
  { name: '2Embed Movie', url: 'https://2embed.skin/embed/550' },
  { name: 'Nova Movie (tt0137523)', url: 'https://slast430did.com/play/tt0137523' },

  // TV (Breaking Bad 1396)
  { name: 'VidLink TV', url: 'https://vidlink.pro/tv/1396/1/1?autoplay=true&primaryColor=3b82f6' },
  { name: 'VidSrc Ultra TV', url: 'https://vidsrc.pm/embed/tv/1396/1/1' },
  { name: 'AutoEmbed TV', url: 'https://autoembed.co/tv/tmdb/1396-1-1' },
  { name: 'ScreenScape TV', url: 'https://screenscape.me/embed?tmdb=1396&type=tv&s=1&e=1&lan=eng' },
  { name: '2Embed TV', url: 'https://2embed.skin/embedtv/1396&s=1&e=1' },
  { name: 'Nova TV (tt0903747)', url: 'https://slast430did.com/play/tt0903747?season=1&episode=1' },
];

console.log('Testing live server status and response headers:\n');

for (const s of servers) {
  try {
    const t0 = Date.now();
    const res = await fetch(s.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Referer': 'https://watch-lumina.vercel.app/',
      },
      timeout: 10000,
    });
    const dt = Date.now() - t0;
    const body = await res.text();
    const xfo = res.headers.get('x-frame-options');
    const csp = res.headers.get('content-security-policy');
    
    // Check if body is empty or error
    const isError = body.includes('404 Not Found') || body.includes('Not Available') || body.length < 200;
    
    console.log(`${s.name.padEnd(28)} | ${res.status} | ${dt}ms | BodyLen: ${body.length} | XFO: ${xfo || 'none'} | Status: ${isError ? '⚠️ Content Error' : '✅ OK'}`);
    if (isError) {
      console.log(`   Sample: ${body.slice(0, 150).replace(/\s+/g, ' ')}`);
    }
  } catch (err) {
    console.log(`${s.name.padEnd(28)} | ❌ ERROR: ${err.message}`);
  }
}
