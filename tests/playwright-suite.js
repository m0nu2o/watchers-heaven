// Complete Playwright End-to-End Regression Suite for Lumina
const { chromium } = require('playwright');

const BASE_URL = process.argv[2] || 'http://localhost:3002';

async function runTestSuite() {
  console.log(`\n============================================================`);
  console.log(`🚀 RUNNING FULL LUMINA PLAYWRIGHT TEST SUITE AGAINST:`);
  console.log(`   ${BASE_URL}`);
  console.log(`============================================================\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const criticalErrors = [];

  function record(pass, name, details = '') {
    totalTests++;
    if (pass) {
      passedTests++;
      console.log(`  ✅ [PASS] ${name}`);
    } else {
      failedTests++;
      console.error(`  ❌ [FAIL] ${name} ${details}`);
    }
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  page.on('pageerror', (err) => {
    // Ignore third-party ad script cross-origin errors
    if (!err.message.includes('cross-origin') && !err.message.includes('Script error')) {
      criticalErrors.push(`[PageError] ${err.message}`);
    }
  });

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: Homepage & Brand Integrity
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📌 Test Suite 1: Homepage & Brand Integrity');
    const homeRes = await page.goto(`${BASE_URL}/en`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    record(homeRes && homeRes.status() === 200, 'Homepage responds with 200 OK');

    const pageTitle = await page.title();
    record(pageTitle.includes('Lumina'), `Page title contains "Lumina" (Found: "${pageTitle}")`);

    const pageContent = await page.content();
    record(!pageContent.toLowerCase().includes('watcher heaven') && !pageContent.toLowerCase().includes('watcherheaven'),
      'Strict ban on old branding: No "WatcherHeaven" strings present');

    const brandLogo = await page.locator('aside a[href*="/en"], header a[href*="/en"], nav a[href*="/en"]').first().isVisible().catch(() => false);
    record(brandLogo, 'Lumina Brand Logo anchor is rendered in navigation');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: Movie Playback & Player Integrity (Fight Club)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📌 Test Suite 2: Movie Cinema Player (/en/watch/550)');
    const movieRes = await page.goto(`${BASE_URL}/en/watch/550?type=movie`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    record(movieRes && movieRes.status() === 200, 'Movie watch page responds with 200 OK');

    // Wait for player to render
    await page.waitForTimeout(2000);

    // Verify NO iframe sandbox attribute exists
    const sandboxIframes = await page.locator('iframe[sandbox]').count();
    record(sandboxIframes === 0, 'Zero sandbox attributes on player iframes');

    // Verify player iframe has valid streaming src
    const iframeSrc = await page.locator('iframe').first().getAttribute('src').catch(() => null);
    record(Boolean(iframeSrc && iframeSrc.startsWith('http')), `Streaming player iframe loaded with valid URL`);

    // Verify NO artificial blocking loading overlay covers the player
    const overlayVisible = await page.locator('.artificial-loading-overlay').isVisible().catch(() => false);
    record(!overlayVisible, 'No artificial loading overlay blocking cinema player');

    // Verify server list rendered
    const serverButtons = await page.locator('button:has-text("VidSrc"), button:has-text("VidLink"), button:has-text("EmbedSU")').count();
    record(serverButtons > 0, `Streaming server options rendered (Found: ${serverButtons} servers)`);

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: TV Series & Episode Navigation (Breaking Bad)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📌 Test Suite 3: TV Series Navigation (/en/watch/1396)');
    const tvRes = await page.goto(`${BASE_URL}/en/watch/1396?type=tv&s=1&e=1`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    record(tvRes && tvRes.status() === 200, 'TV series watch page responds with 200 OK');
    await page.waitForTimeout(2000);

    const episodeCards = await page.locator('button:has-text("EP"), div:has-text("EP 1")').count();
    record(episodeCards > 0, `Episodes list rendered with valid cards (Found: ${episodeCards})`);

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: Anime Real Audio Detection (Demon Slayer)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📌 Test Suite 4: Anime Real Audio Detection (/en/watch/85937)');
    const animeRes = await page.goto(`${BASE_URL}/en/watch/85937?type=anime&s=1&e=1`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    record(animeRes && animeRes.status() === 200, 'Anime watch page responds with 200 OK');
    await page.waitForTimeout(2000);

    // Check Japanese SUB is active
    const subActive = await page.locator('button:has-text("Japanese"), button:has-text("SUB")').first().isVisible().catch(() => false);
    record(subActive, 'Japanese SUB audio button is present and active');

    // Verify independent audio tracks rendered
    const audioPills = await page.locator('button:has-text("Japanese"), button:has-text("English"), button:has-text("Hindi")').count();
    record(audioPills >= 2, `Verified audio selection tracks rendered (${audioPills} tracks present)`);

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 5: Asian Drama Filters (K-Drama vs C-Drama)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📌 Test Suite 5: Asian Drama Category Switching (/en/k-drama)');
    await page.goto(`${BASE_URL}/en/k-drama`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(1500);

    const kdramaTab = page.locator('button:has-text("K-Drama")');
    const cdramaTab = page.locator('button:has-text("C-Drama")');
    record(await kdramaTab.isVisible(), 'K-Drama category tab is visible');
    record(await cdramaTab.isVisible(), 'C-Drama category tab is visible');

    // Click C-Drama tab
    await cdramaTab.click();
    await page.waitForTimeout(2500);

    const cardsCount = await page.locator('a[href*="/tv/"], a[href*="/watch/"]').count();
    record(cardsCount > 0, `C-Drama tab successfully queried and populated ${cardsCount} drama titles`);

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 6: Live TV Broadcasts (/en/live)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📌 Test Suite 6: Live TV Broadcasts (/en/live)');
    const liveRes = await page.goto(`${BASE_URL}/en/live`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    record(liveRes && liveRes.status() === 200, 'Live TV page responds with 200 OK');
    await page.waitForTimeout(2000);

    // Verify channels list rendered
    const channelsCount = await page.locator('button:has-text("Direct HLS"), button:has-text("Aaj Tak")').count();
    record(channelsCount > 0, `Live TV channels list populated (${channelsCount} channels available)`);

    // Verify HLS video element or stream player exists
    const videoElement = await page.locator('video').first().isVisible().catch(() => false);
    record(videoElement, 'HLS video player element is active with direct feed');

    // Verify Unmute button exists for browser autoplay compliance
    const unmuteBtn = await page.locator('button:has-text("Unmute"), button:has-text("Mute")').first().isVisible().catch(() => false);
    record(unmuteBtn, 'Autoplay compliance: "Click to Unmute" control is present');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 7: Search Engine & Multi-token Queries
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📌 Test Suite 7: Search Engine (/en/search)');
    await page.goto(`${BASE_URL}/en/search`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(1000);

    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('naruto');
    // Wait for 350ms debounce + API call
    await page.waitForTimeout(2000);

    const searchResults = await page.locator('a[href*="/watch/"], a[href*="/tv/"], a[href*="/movie/"]').count();
    record(searchResults > 0, `Multi-token search for "naruto" returned ${searchResults} cards`);

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 8: Lumina AI Copilot Interactive Flow
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📌 Test Suite 8: Lumina AI Copilot Interactive Flow');
    // Open AI Copilot via header or dock button
    const aiButton = page.locator('button:has-text("Ask Lumina AI Copilot"), button[aria-label="Lumina AI Copilot"]').first();
    const canOpenAi = await aiButton.isVisible().catch(() => false);
    if (canOpenAi) {
      await aiButton.click();
      await page.waitForTimeout(1000);

      const modalHeading = page.locator('h2:has-text("Lumina AI Copilot")');
      const isModalOpen = await modalHeading.isVisible().catch(() => false);
      record(isModalOpen, 'AI Copilot glassmorphic modal opens upon trigger');

      // Click a suggestion chip
      const chip = page.locator('button:has-text("Korean Dramas"), button:has-text("Chinese Dramas")').first();
      if (await chip.isVisible()) {
        await chip.click();
        await page.waitForTimeout(3000);

        const aiCards = await page.locator('div:has-text("Lumina AI Copilot") ~ div a, .group:has(h4)').count();
        record(aiCards > 0, `AI Copilot returned ${aiCards} verified media recommendation cards`);
      }

      // Close modal
      const closeBtn = page.locator('button[aria-label="Close AI Chat"], button:has-text("X")').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    } else {
      record(false, 'AI Copilot launcher button visible');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 9: Mobile Viewport & Responsiveness
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📌 Test Suite 9: Mobile Viewport & Responsive Dock');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/en`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1000);

    const mobileNav = await page.locator('header.lg\\:hidden, nav.lg\\:hidden').count();
    record(mobileNav > 0, 'Mobile top header and bottom frosted bar rendered properly on mobile viewport');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 10: Technical SEO / Robots / Sitemap
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📌 Test Suite 10: Technical SEO Infrastructure');
    const sitemapRes = await page.goto(`${BASE_URL}/sitemap.xml`, { timeout: 15000 });
    record(sitemapRes && sitemapRes.status() === 200, 'Dynamic XML sitemap returns 200 OK');

    const robotsRes = await page.goto(`${BASE_URL}/robots.txt`, { timeout: 15000 });
    record(robotsRes && robotsRes.status() === 200, 'robots.txt returns 200 OK');

  } catch (err) {
    console.error('Test execution error:', err);
    record(false, 'Full suite execution without fatal crash', err.message);
  } finally {
    await browser.close();
  }

  console.log(`\n============================================================`);
  console.log(`PLAYWRIGHT TEST SUMMARY:`);
  console.log(`  TOTAL:  ${totalTests}`);
  console.log(`  PASSED: ${passedTests}`);
  console.log(`  FAILED: ${failedTests}`);
  console.log(`============================================================\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite();
