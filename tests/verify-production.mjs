async function verifyProduction() {
  const tests = [
    { name: '1. Production Movie (Inception SUB)', url: 'https://watch-lumina.vercel.app/api/watch/tt1375666/source?type=movie&track=sub' },
    { name: '2. Production Movie (Inception Hindi DUB)', url: 'https://watch-lumina.vercel.app/api/watch/tt1375666/source?type=movie&track=dub-hi' },
    { name: '3. Production Anime (Demon Slayer SUB)', url: 'https://watch-lumina.vercel.app/api/watch/85937/source?type=anime&s=1&e=1&track=sub' },
    { name: '4. Production Anime (Demon Slayer English DUB)', url: 'https://watch-lumina.vercel.app/api/watch/85937/source?type=anime&s=1&e=1&track=dub-en' },
    { name: '5. Production K-Drama (Squid Game)', url: 'https://watch-lumina.vercel.app/api/watch/93405/source?type=tv&s=1&e=1&track=sub' },
    { name: '6. Production C-Drama (The Untamed)', url: 'https://watch-lumina.vercel.app/api/watch/90290/source?type=tv&s=1&e=1&track=sub' },
    { name: '7. Production Bollywood (3 Idiots)', url: 'https://watch-lumina.vercel.app/api/watch/20453/source?type=movie&track=sub' },
  ];

  console.log('=== VERCEL PRODUCTION VERIFICATION ===\n');
  for (const t of tests) {
    try {
      const res = await fetch(t.url);
      const json = await res.json();
      console.log(`[${json.success ? 'PASS' : 'FAIL'}] ${t.name} -> HTTP ${res.status} | Provider: ${json.provider} | URL: ${json.url?.slice(0, 45)}...`);
    } catch (e) {
      console.log(`[ERROR] ${t.name}: ${e.message}`);
    }
  }
}
verifyProduction();
