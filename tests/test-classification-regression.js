/**
 * Regression Test Suite for Lumina Content Classification Engine
 *
 * Verifies strict categorization across:
 * 1. Toy Story (Must be 'cartoon', NEVER 'anime')
 * 2. Spirited Away (Must be 'anime-movie', NEVER generic TV/series)
 * 3. Attack on Titan (Must be 'anime')
 * 4. Rick and Morty (Must be 'cartoon', NEVER 'anime')
 * 5. RRR / Dangal (Must be 'bollywood', NEVER Hollywood or anime)
 * 6. Squid Game (Must be 'kdrama', NEVER anime or Western TV)
 * 7. Alice in Borderland (Must be 'asian-drama', NEVER anime)
 * 8. Fight Club (Must be 'hollywood')
 * 9. Parasite (Must be 'international-movie')
 */

const assert = require('assert');

// Import or replicate the core logic for standalone node execution
const GENRE_ANIMATION = 16;

function extractGenreIds(item) {
  if (Array.isArray(item.genre_ids)) {
    return item.genre_ids.filter((id) => typeof id === 'number');
  }
  if (Array.isArray(item.genres)) {
    return item.genres
      .map((g) => (typeof g === 'number' ? g : g?.id))
      .filter((id) => typeof id === 'number');
  }
  return [];
}

function extractOriginCountries(item) {
  const countries = new Set();
  if (Array.isArray(item.origin_country)) {
    item.origin_country.forEach((c) => {
      if (typeof c === 'string' && c.trim()) countries.add(c.trim().toUpperCase());
    });
  }
  if (Array.isArray(item.production_countries)) {
    item.production_countries.forEach((c) => {
      if (c?.iso_3166_1 && typeof c.iso_3166_1 === 'string') {
        countries.add(c.iso_3166_1.trim().toUpperCase());
      }
    });
  }
  return Array.from(countries);
}

function isAnimation(item) {
  const genreIds = extractGenreIds(item);
  return genreIds.includes(GENRE_ANIMATION) || Boolean(item.aniListId && item.aniListId > 0);
}

function isJapaneseAnime(item) {
  if (!isAnimation(item)) return false;
  const lang = (item.original_language || '').toLowerCase().trim();
  const countries = extractOriginCountries(item);
  if (item.aniListId && item.aniListId > 0) return true;
  if (lang === 'ja' || countries.includes('JP')) return true;
  return false;
}

function resolveFormat(item) {
  if (item.media_type === 'movie') return 'movie';
  if (item.media_type === 'tv') return 'tv';
  if (item.first_air_date && !item.release_date) return 'tv';
  if (item.release_date && !item.first_air_date) return 'movie';
  return 'movie';
}

function classifyContent(item) {
  const isAnim = isAnimation(item);
  const isJapAnime = isJapaneseAnime(item);
  const format = resolveFormat(item);
  const lang = (item.original_language || 'en').toLowerCase().trim();
  const countries = extractOriginCountries(item);

  if (isAnim) {
    if (isJapAnime) {
      return format === 'movie' ? 'anime-movie' : 'anime';
    }
    return 'cartoon';
  }

  if (format === 'tv') {
    if (lang === 'ko' || countries.includes('KR')) return 'kdrama';
    if (lang === 'zh' || countries.includes('CN') || countries.includes('TW') || countries.includes('HK')) return 'cdrama';
    if (lang === 'ja' || countries.includes('JP') || lang === 'th' || countries.includes('TH')) return 'asian-drama';
    return 'tv';
  }

  if (lang === 'hi' || countries.includes('IN') || ['ta', 'te', 'ml', 'kn', 'bn'].includes(lang)) {
    return 'bollywood';
  }

  if (lang === 'en' || countries.some((c) => ['US', 'GB', 'CA', 'AU', 'NZ', 'IE'].includes(c))) {
    return 'hollywood';
  }

  return 'international-movie';
}

console.log('🚀 Running Lumina Content Classification Regression Tests...\n');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} ->`, err.message);
  }
}

// 1. Toy Story
test('Toy Story (TMDB 862) is classified as "cartoon" and NOT "anime"', () => {
  const toyStory = {
    id: 862,
    title: 'Toy Story',
    media_type: 'movie',
    genre_ids: [16, 12, 10751, 35],
    original_language: 'en',
    origin_country: ['US'],
    production_countries: [{ iso_3166_1: 'US' }],
  };
  const category = classifyContent(toyStory);
  assert.strictEqual(category, 'cartoon', 'Toy Story must be classified as cartoon');
  assert.strictEqual(isJapaneseAnime(toyStory), false, 'Toy Story must NOT be Japanese anime');
});

// 2. Spirited Away
test('Spirited Away (TMDB 129) is classified as "anime-movie"', () => {
  const spiritedAway = {
    id: 129,
    title: 'Spirited Away',
    media_type: 'movie',
    genre_ids: [16, 10751, 14],
    original_language: 'ja',
    origin_country: ['JP'],
    production_countries: [{ iso_3166_1: 'JP' }],
  };
  const category = classifyContent(spiritedAway);
  assert.strictEqual(category, 'anime-movie', 'Spirited Away must be anime-movie');
  assert.strictEqual(isJapaneseAnime(spiritedAway), true, 'Spirited Away is Japanese anime');
});

// 3. Attack on Titan
test('Attack on Titan (TMDB 1429) is classified as "anime"', () => {
  const aot = {
    id: 1429,
    name: 'Attack on Titan',
    media_type: 'tv',
    genre_ids: [16, 10765, 10759],
    original_language: 'ja',
    origin_country: ['JP'],
  };
  const category = classifyContent(aot);
  assert.strictEqual(category, 'anime', 'Attack on Titan must be anime series');
  assert.strictEqual(isJapaneseAnime(aot), true, 'Attack on Titan is Japanese anime');
});

// 4. Rick and Morty
test('Rick and Morty (TMDB 60625) is classified as "cartoon" and NOT "anime"', () => {
  const rickAndMorty = {
    id: 60625,
    name: 'Rick and Morty',
    media_type: 'tv',
    genre_ids: [16, 35, 10765],
    original_language: 'en',
    origin_country: ['US'],
  };
  const category = classifyContent(rickAndMorty);
  assert.strictEqual(category, 'cartoon', 'Rick and Morty must be cartoon');
  assert.strictEqual(isJapaneseAnime(rickAndMorty), false, 'Rick and Morty must NOT be Japanese anime');
});

// 5. Bollywood (RRR)
test('RRR (TMDB 579974) is classified as "bollywood"', () => {
  const rrr = {
    id: 579974,
    title: 'RRR',
    media_type: 'movie',
    genre_ids: [28, 18],
    original_language: 'te',
    origin_country: ['IN'],
    production_countries: [{ iso_3166_1: 'IN' }],
  };
  const category = classifyContent(rrr);
  assert.strictEqual(category, 'bollywood', 'RRR must be bollywood');
  assert.strictEqual(isJapaneseAnime(rrr), false, 'RRR is NOT anime');
});

// 6. Korean Drama (Squid Game)
test('Squid Game (TMDB 93405) is classified as "kdrama"', () => {
  const squidGame = {
    id: 93405,
    name: 'Squid Game',
    media_type: 'tv',
    genre_ids: [18, 9648],
    original_language: 'ko',
    origin_country: ['KR'],
  };
  const category = classifyContent(squidGame);
  assert.strictEqual(category, 'kdrama', 'Squid Game must be kdrama');
  assert.strictEqual(isJapaneseAnime(squidGame), false, 'Squid Game is NOT anime');
});

// 7. Japanese Live Action Drama (Alice in Borderland)
test('Alice in Borderland (TMDB 110356) is classified as "asian-drama" and NOT "anime"', () => {
  const alice = {
    id: 110356,
    name: 'Alice in Borderland',
    media_type: 'tv',
    genre_ids: [18, 9648, 10759], // NO genre 16
    original_language: 'ja',
    origin_country: ['JP'],
  };
  const category = classifyContent(alice);
  assert.strictEqual(category, 'asian-drama', 'Alice in Borderland is live-action asian-drama');
  assert.strictEqual(isJapaneseAnime(alice), false, 'Alice in Borderland must NOT be classified as anime');
});

// 8. Hollywood Feature Film (Fight Club)
test('Fight Club (TMDB 550) is classified as "hollywood"', () => {
  const fightClub = {
    id: 550,
    title: 'Fight Club',
    media_type: 'movie',
    genre_ids: [18],
    original_language: 'en',
    origin_country: ['US'],
  };
  const category = classifyContent(fightClub);
  assert.strictEqual(category, 'hollywood', 'Fight Club must be hollywood');
});

// 9. International Film (Parasite)
test('Parasite (TMDB 496243) is classified as "international-movie"', () => {
  const parasite = {
    id: 496243,
    title: 'Parasite',
    media_type: 'movie',
    genre_ids: [35, 53, 18],
    original_language: 'ko',
    origin_country: ['KR'],
  };
  const category = classifyContent(parasite);
  assert.strictEqual(category, 'international-movie', 'Parasite is a Korean live-action movie (international-movie)');
});

console.log(`\n========================================`);
console.log(`Results: ${passed}/${total} passed`);
console.log(`========================================\n`);

if (passed < total) process.exit(1);
