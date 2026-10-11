/**
 * Targeted Nova Ultra HD & Server Selection Verification
 */
import { ApiGateway } from '../src/lib/api/gateway.ts';
import { ProviderRegistry } from '../src/lib/providers/index.ts';

console.log('================================================================');
console.log('   NOVA ULTRA HD & CONTENT-SPECIFIC SERVER VERIFICATION         ');
console.log('================================================================\n');

// 1. Verify Nova URL generation with IMDb ID
console.log('1. Checking Nova Ultra HD Movie URL generation:');
const movieUrl = ProviderRegistry.resolvePlaybackUrl('nova', {
  mediaType: 'movie',
  tmdbId: 550,
  imdbId: 'tt0137523',
});
console.log('   Movie URL:', movieUrl);
if (!movieUrl.includes('tt0137523')) {
  console.error('❌ Failed: Nova Movie URL does not contain IMDb ID');
  process.exit(1);
}
console.log('   ✅ PASSED: Nova properly generated with IMDb ID tt0137523\n');

// 2. Checking Nova Ultra HD TV Show URL generation
console.log('2. Checking Nova Ultra HD TV Show URL generation:');
const tvUrl = ProviderRegistry.resolvePlaybackUrl('nova', {
  mediaType: 'tv',
  tmdbId: 1396,
  imdbId: 'tt0903747',
  season: 1,
  episode: 1,
});
console.log('   TV URL:', tvUrl);
if (!tvUrl.includes('tt0903747')) {
  console.error('❌ Failed: Nova TV URL does not contain IMDb ID');
  process.exit(1);
}
console.log('   ✅ PASSED: Nova properly generated with TV IMDb ID tt0903747\n');

// 3. Verify Server Filtering: Anime must NOT include Nova
console.log('3. Checking Server Filtering for ANIME:');
const animeServers = ProviderRegistry.getForMediaTypeAndAudio('anime', 'sub');
console.log('   Anime Servers:', animeServers.map(s => s.id).join(', '));
const hasNovaInAnime = animeServers.some(s => s.id === 'nova');
if (hasNovaInAnime) {
  console.error('❌ Failed: Nova is incorrectly present in Anime servers!');
  process.exit(1);
}
console.log('   ✅ PASSED: Nova is strictly excluded from Anime (dedicated anime engines only)\n');

// 4. Verify Server Filtering: Movies MUST include Nova
console.log('4. Checking Server Filtering for MOVIES:');
const movieServers = ProviderRegistry.getForMediaTypeAndAudio('movie', 'sub');
console.log('   Movie Servers:', movieServers.map(s => s.id).join(', '));
const hasNovaInMovies = movieServers.some(s => s.id === 'nova');
if (!hasNovaInMovies) {
  console.error('❌ Failed: Nova is missing from Movie servers!');
  process.exit(1);
}
console.log('   ✅ PASSED: Nova Ultra HD is verified present for Movies\n');

// 5. Verify Server Filtering: TV Series MUST include Nova
console.log('5. Checking Server Filtering for TV SERIES:');
const tvServers = ProviderRegistry.getForMediaTypeAndAudio('tv', 'sub');
console.log('   TV Servers:', tvServers.map(s => s.id).join(', '));
const hasNovaInTv = tvServers.some(s => s.id === 'nova');
if (!hasNovaInTv) {
  console.error('❌ Failed: Nova is missing from TV series servers!');
  process.exit(1);
}
console.log('   ✅ PASSED: Nova Ultra HD is verified present for TV series\n');

// 6. Verify Server Filtering: Hindi Dub for Movies/TV MUST include Nova
console.log('6. Checking Server Filtering for HINDI DUB:');
const hindiMovieServers = ProviderRegistry.getForMediaTypeAndAudio('movie', 'dub-hi');
console.log('   Hindi Movie Servers:', hindiMovieServers.map(s => s.id).join(', '));
const hasNovaInHindi = hindiMovieServers.some(s => s.id === 'nova');
if (!hasNovaInHindi) {
  console.error('❌ Failed: Nova is missing from Hindi Dub movie servers!');
  process.exit(1);
}
console.log('   ✅ PASSED: Nova Ultra HD is verified present for Hindi Dub\n');

// 7. Test live endpoint via fetch
const res = await fetch('http://localhost:3002/api/watch/550/source?provider=nova&type=movie&imdbId=tt0137523');
const json = await res.json();
console.log('7. Live API route response for Nova:');
console.log('   Result:', json);
if (!json.success || !json.url?.includes('tt0137523')) {
  console.error('❌ Failed: Live API did not resolve Nova URL properly');
  process.exit(1);
}
console.log('   ✅ PASSED: Live API successfully resolved Nova Ultra HD stream URL\n');

console.log('================================================================');
console.log('🎉 ALL NOVA ULTRA HD & SERVER FILTER CHECKS PASSED (7/7)!        ');
console.log('================================================================');
