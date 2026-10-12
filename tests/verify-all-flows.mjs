async function testAllFlows() {
  const tests = [
    { name: '1. Hollywood Movie (Inception)', url: 'http://localhost:3002/api/watch/tt1375666/source?type=movie&track=sub', expectAvailable: true },
    { name: '2. Hollywood Movie Hindi DUB (Inception)', url: 'http://localhost:3002/api/watch/tt1375666/source?type=movie&track=dub-hi', expectAvailable: true },
    { name: '3. Western TV Series (Breaking Bad S1E1)', url: 'http://localhost:3002/api/watch/1396/source?type=tv&s=1&e=1&track=sub', expectAvailable: true },
    { name: '4. Anime Series (Demon Slayer S1E1 SUB)', url: 'http://localhost:3002/api/watch/85937/source?type=anime&s=1&e=1&track=sub', expectAvailable: true },
    { name: '5. Anime Series English DUB (Demon Slayer S1E1)', url: 'http://localhost:3002/api/watch/85937/source?type=anime&s=1&e=1&track=dub-en', expectAvailable: true },
    { name: '6. Anime Series Hindi DUB (Demon Slayer - correctly rejected, no fake audio)', url: 'http://localhost:3002/api/watch/85937/source?type=anime&s=1&e=1&track=dub-hi', expectAvailable: false },
    { name: '7. K-Drama (Squid Game S1E1)', url: 'http://localhost:3002/api/watch/93405/source?type=tv&s=1&e=1&track=sub', expectAvailable: true },
    { name: '8. C-Drama (The Untamed S1E1)', url: 'http://localhost:3002/api/watch/90290/source?type=tv&s=1&e=1&track=sub', expectAvailable: true },
    { name: '9. Bollywood Movie (3 Idiots)', url: 'http://localhost:3002/api/watch/20453/source?type=movie&track=sub', expectAvailable: true },
    { name: '10. Languages Metadata (Demon Slayer)', url: 'http://localhost:3002/api/watch/85937/languages?type=anime&s=1&e=1', expectAvailable: true },
    { name: '11. Languages Metadata (Inception)', url: 'http://localhost:3002/api/watch/tt1375666/languages?type=movie', expectAvailable: true },
    { name: '12. TMDB Media Details (Inception)', url: 'http://localhost:3002/api/tmdb/movie/tt1375666', expectAvailable: true },
  ];

  console.log('=== LUMINA STREAMING & DISCOVERY AUDIT TEST RUNNER ===\n');
  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      const res = await fetch(t.url);
      const json = await res.json();
      
      let isSuccess = false;
      if (t.expectAvailable === false) {
        // Negative test: expect available to be false and meaningful error
        isSuccess = res.status === 200 && json.available === false && Boolean(json.error);
      } else {
        isSuccess = res.status === 200 && (json.success !== false) && (json.available !== false);
      }

      const statusIcon = isSuccess ? '✅ PASS' : '❌ FAIL';
      if (isSuccess) passed++; else failed++;
      
      const details = json.url 
        ? `[URL: ${json.url.slice(0, 55)}...] [Provider: ${json.provider}]`
        : json.tracks
        ? `[Tracks: ${json.tracks.map(tr => tr.language).join(', ')}]`
        : json.error
        ? `[Handled: "${json.error}"]`
        : `[Title: ${json.title || json.name || 'OK'}]`;

      console.log(`${statusIcon} | ${t.name}`);
      console.log(`       Status: HTTP ${res.status} | Details: ${details}\n`);
    } catch (err) {
      failed++;
      console.log(`❌ FAIL | ${t.name}`);
      console.log(`       Error: ${err.message}\n`);
    }
  }

  console.log(`=== SUMMARY: ${passed}/${tests.length} PASSED, ${failed} FAILED ===`);
}

testAllFlows();
