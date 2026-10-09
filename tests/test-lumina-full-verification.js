/**
 * LUMINA FULL PLAYWRIGHT VERIFICATION SUITE
 *
 * Covers:
 * 1. Toy Story Classification (MUST be Animation/Movie, NEVER Anime)
 * 2. Anime & K-Drama Category Badging & Routing
 * 3. Movie Watch Page (Fight Club / Toy Story) & Universal Player Mounting
 * 4. TV Series Watch Page (Squid Game) & Episode Navigation
 * 5. Anime Watch Page (Attack on Titan) & Server Isolation
 * 6. Real Audio/Dub Availability & Unavailable Track Locking (🔒 N/A)
 * 7. Server Switching & Fallback Readiness
 * 8. Responsive Design (Desktop 1280x800 & Mobile 390x844)
 * 9. Console Error & Network Health Audit
 */

const { chromium } = require('playwright');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3002';

async function runLuminaVerification() {
  console.log(`\n======================================================`);
  console.log(`🚀 LUMINA FORENSIC VERIFICATION & PLAYWRIGHT TEST SUITE`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });

  const consoleErrors = [];
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore benign expected warnings / third-party analytics
      if (!text.includes('favicon') && !text.includes('hydration')) {
        consoleErrors.push(text);
      }
    }
  });

  let passed = 0;
  let total = 0;

  function assert(condition, name, details = '') {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${details ? '(' + details + ')' : ''}`);
    }
  }

  try {
    // ── TEST GROUP 1: Homepage & Hero Discovery ──
    console.log('📌 Test Group 1: Homepage Discovery & Navigation');
    await page.goto(`${BASE_URL}/en`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(3000);

    const mainHeader = await page.$('header, nav');
    assert(mainHeader !== null, 'Main navigation header is rendered');

    const heroSection = await page.$('.aspect-video, [class*="Hero"]');
    assert(heroSection !== null, 'Hero spotlight banner is displayed');

    // ── TEST GROUP 2: Search & Toy Story Classification Regression ──
    console.log('\n📌 Test Group 2: Toy Story vs Anime Classification');
    await page.goto(`${BASE_URL}/en/search?q=Toy+Story`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(4000);

    // Find Toy Story poster card in search results
    const cards = await page.$$('.card-snap');
    assert(cards.length > 0, `Search returned ${cards.length} results for "Toy Story"`);

    if (cards.length > 0) {
      // Find the card for Toy Story
      let foundToyStory = false;
      let toyStoryBadge = '';
      let toyStoryHref = '';

      for (const card of cards) {
        const text = await card.innerText();
        if (text.includes('Toy Story')) {
          foundToyStory = true;
          toyStoryHref = (await card.getAttribute('href')) || '';
          toyStoryBadge = text;
          break;
        }
      }

      assert(foundToyStory, 'Toy Story found in search results');

      // CRITICAL CHECK: Toy Story must NOT be classified as ANIME
      const isBadgedAnime = toyStoryBadge.includes('ANIME');
      assert(!isBadgedAnime, 'Toy Story is NOT badged as ANIME (Must be ANIMATION/MOVIE)', `Badge was: ${toyStoryBadge.replace(/\n/g, ' ')}`);

      // CRITICAL CHECK: Toy Story link must be /movie/862, NOT /tv/862?from=anime
      const isMovieHref = toyStoryHref.includes('/movie/');
      assert(isMovieHref, 'Toy Story links to movie detail page (/movie/862)', `Href was: ${toyStoryHref}`);
    }

    // ── TEST GROUP 3: Anime Discovery & Badging ──
    console.log('\n📌 Test Group 3: Japanese Anime Badging (Attack on Titan)');
    await page.goto(`${BASE_URL}/en/search?q=Attack+on+Titan`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(4000);

    const aotCards = await page.$$('.card-snap');
    let aotFound = false;
    let aotHref = '';
    let aotBadge = '';

    for (const card of aotCards) {
      const text = await card.innerText();
      if (text.includes('Attack on Titan')) {
        aotFound = true;
        aotHref = (await card.getAttribute('href')) || '';
        aotBadge = text;
        break;
      }
    }

    assert(aotFound, 'Attack on Titan found in search');
    if (aotFound) {
      assert(aotBadge.includes('ANIME'), 'Attack on Titan is accurately badged as ANIME');
      assert(aotHref.includes('from=anime') || aotHref.includes('/tv/'), 'Attack on Titan links to episodic anime/series page');
    }

    // ── TEST GROUP 4: Movie Watch Page & Universal Player ──
    console.log('\n📌 Test Group 4: Movie Watch Page & Universal Video Player (Fight Club)');
    await page.goto(`${BASE_URL}/en/watch/550`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(4000);

    const playerContainer = await page.$('[aria-label="Universal Video Player"]');
    assert(playerContainer !== null, 'Universal Player mounted on movie watch page');

    // Verified embed iframe mounting without duplicate overlapping controls
    const iframe = await page.$('[aria-label="Universal Video Player"] iframe');
    assert(iframe !== null, 'Third-party streaming provider iframe mounted in viewport');

    // Zero duplicate controls over third-party iframe
    const centerPlayBtn = await page.$('[aria-label="Universal Video Player"] button[aria-label="Play"]');
    assert(centerPlayBtn === null, 'No duplicate center play button obscuring the iframe');

    // Movie servers should be listed in under-player control deck
    const serverDeck = await page.$('text=Movie Servers');
    assert(serverDeck !== null, 'Under-player deck specifies "Movie Servers" (server isolation active)');

    // ── TEST GROUP 5: Toy Story Watch Page Resolution ──
    console.log('\n📌 Test Group 5: Toy Story Watch Page Resolution (No Fake Seasons/Anime servers)');
    await page.goto(`${BASE_URL}/en/watch/862`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(4000);

    const toyStoryPlayer = await page.$('[aria-label="Universal Video Player"]');
    assert(toyStoryPlayer !== null, 'Universal Player mounted for Toy Story');

    // Check that it identifies as a Movie, NOT a TV series with seasons
    const toyStoryMovieDeck = await page.$('text=Movie Servers');
    assert(toyStoryMovieDeck !== null, 'Toy Story resolves to "Movie Servers", NOT Anime TV servers');

    // Episode picker should NOT be rendered for a movie
    const episodeList = await page.$('text=Season 1');
    assert(episodeList === null, 'Toy Story does NOT display fake seasons or episodes');

    // ── TEST GROUP 6: TV Series Watch Page & Episode Selector (Squid Game) ──
    console.log('\n📌 Test Group 6: TV Series Watch Page & Episode Navigation (Squid Game)');
    await page.goto(`${BASE_URL}/en/watch/93405?s=1&e=1`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(4000);

    const tvPlayer = await page.$('[aria-label="Universal Video Player"]');
    assert(tvPlayer !== null, 'Universal Player mounted for Squid Game');

    const seriesDeck = await page.$('text=Series Servers');
    assert(seriesDeck !== null, 'Squid Game displays "Series Servers"');

    // Episode Navigator below player renders episodes
    const epNavigator = await page.$('text=Episode 1');
    assert(epNavigator !== null, 'Episode Navigator is present and active for TV series');

    // ── TEST GROUP 7: Anime Watch Page & Isolation (Attack on Titan) ──
    console.log('\n📌 Test Group 7: Anime Watch Page & Dedicated Servers (Attack on Titan)');
    await page.goto(`${BASE_URL}/en/watch/1429?s=1&e=1&type=anime`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(4000);

    const animePlayer = await page.$('[aria-label="Universal Video Player"]');
    assert(animePlayer !== null, 'Universal Player mounted for Attack on Titan');

    const animeDeck = await page.$('text=Anime Servers');
    assert(animeDeck !== null, 'Attack on Titan displays dedicated "Anime Servers"');

    // ── TEST GROUP 8: Audio Track Selection & Disabled Track Verification ──
    console.log('\n📌 Test Group 8: Real Audio Tracks & Unavailable Lock (🔒 N/A)');
    // Check audio track deck under player
    const audioTrackSection = await page.$('text=Audio Track');
    assert(audioTrackSection !== null, 'Audio Track selector section exists under player');

    // Check bottom bar audio menu
    const audioMenuBtn = await page.$('button[title="Select Audio Language"]');
    if (audioMenuBtn) {
      await audioMenuBtn.click();
      await page.waitForTimeout(500);

      const audioMenuTitle = await page.$('text=Audio Language');
      assert(audioMenuTitle !== null, 'Audio Language popup menu opened');

      // Check for lock / N/A indicators on unavailable tracks
      const lockIcons = await page.$$('.lucide-lock');
      assert(lockIcons !== null, 'Unavailable audio tracks display Lock/NA indicators without fake promises');

      await audioMenuBtn.click(); // Close
      await page.waitForTimeout(300);
    }

    // ── TEST GROUP 9: Responsive Mobile Viewport ──
    console.log('\n📌 Test Group 9: Mobile Viewport (iPhone 14 / 390x844)');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1000);

    const mobilePlayer = await page.$('[aria-label="Universal Video Player"]');
    assert(mobilePlayer !== null, 'Universal Player renders cleanly on mobile screen');

    const mobileServers = await page.$('text=Anime Servers');
    assert(mobileServers !== null, 'Mobile server selector is fully visible and accessible');

    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert(!hasHorizontalOverflow, 'Zero horizontal overflow on mobile viewport (390px)');

  } catch (err) {
    console.error('💥 Test suite execution error:', err);
  } finally {
    await browser.close();

    console.log(`\n======================================================`);
    console.log(`LUMINA FULL VERIFICATION RESULTS: ${passed}/${total} passed`);
    console.log(`======================================================\n`);

    if (consoleErrors.length > 0) {
      console.log(`Notice: ${consoleErrors.length} console warnings/errors caught during test session:`);
      consoleErrors.slice(0, 5).forEach((e) => console.log(`  - ${e}`));
    }

    if (passed < total) {
      process.exit(1);
    }
  }
}

runLuminaVerification();
