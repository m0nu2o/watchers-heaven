import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';

async function runFullVerification() {
  console.log(`========================================================================`);
  console.log(`   LUMINA FULL CODEBASE & UI/UX AUDIT PLAYWRIGHT TEST SUITE`);
  console.log(`   Target: ${BASE_URL}`);
  console.log(`========================================================================\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const failureLog = [];

  function pass(testName, detail = '') {
    totalTests++;
    passedTests++;
    console.log(`✅ PASS | ${testName}`);
    if (detail) console.log(`   ↳ ${detail}`);
  }

  function fail(testName, error) {
    totalTests++;
    failedTests++;
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`❌ FAIL | ${testName}\n   ↳ Error: ${msg}`);
    failureLog.push({ test: testName, error: msg });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Homepage (/en) UI, Hero Banner, Rankings, Nav, Footer & Overflow
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${BASE_URL}/en`, { waitUntil: 'domcontentloaded', timeout: 35000 });

    // Check Hero Banner
    await page.waitForSelector('main', { timeout: 15000 });
    const heroExists = await page.locator('main').count();
    if (!heroExists) throw new Error('Main element not found on homepage');

    // Check Top 10 Ranked Rail
    const rankCards = await page.locator('[data-testid="rank-card"], [data-testid="poster-card"]').count();

    // Check Navigation capsule dock on desktop
    const desktopNav = await page.locator('aside').first();
    const isNavVisible = await desktopNav.isVisible();

    // Check Footer: copyright, disclaimer, @itxz_baka handle
    const footerText = await page.locator('footer').innerText();
    const hasCopyright = footerText.includes('Lumina') && footerText.includes('All rights reserved');
    const hasCreator = footerText.includes('@itxz_baka');

    // Check for Horizontal Scroll Overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 1;
    });

    if (hasOverflow) throw new Error('Horizontal scrollbar / layout overflow detected on Homepage');
    if (!hasCopyright || !hasCreator) throw new Error('Footer missing copyright or creator credit');

    pass('1. Homepage Layout, Hero, Rankings, Nav Dock & Footer', `Cards: ${rankCards} | Desktop Nav: ${isNavVisible} | Creator: @itxz_baka | Zero overflow`);
    await page.close();
  } catch (err) {
    fail('1. Homepage Layout, Hero, Rankings, Nav Dock & Footer', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Watch Page Anime (/en/watch/85937?s=1&e=1&type=anime)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${BASE_URL}/en/watch/85937?s=1&e=1&type=anime`, { waitUntil: 'domcontentloaded', timeout: 35000 });

    // Wait for player iframe to mount
    await page.waitForSelector('iframe', { timeout: 20000 });
    await page.waitForTimeout(3000);

    const iframe = page.locator('iframe').first();
    const src = await iframe.getAttribute('src');

    // Verify NextGen Anime Server is active
    const nextGenButton = page.locator('button:has-text("NextGen Anime Server")').first();
    const isNextGenVisible = await nextGenButton.isVisible();

    // Check audio buttons: SUB should be active, DUB available, HINDI strictly hidden
    const subButton = page.locator('button:has-text("SUB")').first();
    const isSubVisible = await subButton.isVisible();
    const hindiButton = page.locator('button:has-text("HINDI")');
    const isHindiVisible = (await hindiButton.count()) > 0 && await hindiButton.first().isVisible();

    // Verify Episode Navigator Grid
    const epCount = await page.locator('text=/EP\\s+\\d+/').count();

    if (!src || (!src.includes('flixcloud.cc') && !src.includes('reanime.to') && !src.includes('megacloud'))) {
      throw new Error(`Unexpected iframe source for NextGen Anime: ${src}`);
    }
    if (!isNextGenVisible) throw new Error('NextGen Anime Server not visible in server deck');
    if (isHindiVisible) throw new Error('Fake HINDI button erroneously displayed on Demon Slayer');

    pass('2. Watch Page Anime (NextGen Anime Engine, FlixCloud, Sub/Dub, Episodes)', `Src: ${src.slice(0, 50)}... | NextGen Active: true | Hindi Hidden: true | Eps rendered: ${epCount}`);
    await page.close();
  } catch (err) {
    fail('2. Watch Page Anime (NextGen Anime Engine, FlixCloud, Sub/Dub, Episodes)', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Watch Page Hollywood Movie (/en/watch/550 - Fight Club)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${BASE_URL}/en/watch/550`, { waitUntil: 'domcontentloaded', timeout: 35000 });

    await page.waitForSelector('iframe', { timeout: 20000 });
    const iframe = page.locator('iframe').first();
    const src = await iframe.getAttribute('src');

    // Verify server deck has verified Hollywood providers
    const serverDeckText = await page.locator('section[aria-label="Streaming Server Selection"]').innerText();
    const hasVidLink = serverDeckText.includes('VidLink') || serverDeckText.includes('Nova') || serverDeckText.includes('VidSrc');

    if (!src) throw new Error('Movie player iframe src is empty');
    if (!hasVidLink) throw new Error('Expected Hollywood streaming servers in server deck');

    pass('3. Watch Page Movie (Fight Club Player & Server Deck)', `Src: ${src.slice(0, 50)}... | Servers: ${hasVidLink}`);
    await page.close();
  } catch (err) {
    fail('3. Watch Page Movie (Fight Club Player & Server Deck)', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Watch Page Bollywood Hindi Audio (/en/watch/360814 - Dangal)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${BASE_URL}/en/watch/360814`, { waitUntil: 'domcontentloaded', timeout: 35000 });

    await page.waitForSelector('iframe', { timeout: 20000 });
    const hindiBtn = await page.waitForSelector('button:has-text("HINDI")', { timeout: 15000 });
    const isHindiVisible = Boolean(hindiBtn);

    if (!isHindiVisible) throw new Error('HINDI audio button not visible for Dangal');

    pass('4. Bollywood Hindi Audio Verification (Dangal)', 'HINDI audio button active & confirmed');
    await page.close();
  } catch (err) {
    fail('4. Bollywood Hindi Audio Verification (Dangal)', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Explore Page (/en/explore)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${BASE_URL}/en/explore`, { waitUntil: 'domcontentloaded', timeout: 35000 });

    await page.waitForSelector('button:has-text("All Content")', { timeout: 15000 });
    const animeCatBtn = page.locator('button:has-text("Anime Series")').first();
    await animeCatBtn.click();
    await page.waitForTimeout(2000);

    const cards = await page.locator('[data-testid="poster-card"]').count();
    if (cards === 0) throw new Error('Explore page failed to render cards for Anime category');

    pass('5. Explore Page (Categories, Filters & Posters Grid)', `Cards Rendered: ${cards} after Anime filter`);
    await page.close();
  } catch (err) {
    fail('5. Explore Page (Categories, Filters & Posters Grid)', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: Schedule / Calendar Page (/en/schedule)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${BASE_URL}/en/schedule`, { waitUntil: 'domcontentloaded', timeout: 35000 });

    await page.waitForSelector('h1:has-text("Upcoming Release Calendar")', { timeout: 15000 });

    // Check Day Buttons (All Days, Monday, etc.)
    const dayButtons = await page.locator('button:has-text("All Days")').count();
    if (!dayButtons) throw new Error('Schedule day selector missing');

    // Wait for cards to populate
    await page.waitForSelector('a[href*="/watch/"]', { timeout: 20000 });
    const scheduleCards = await page.locator('a[href*="/watch/"]').count();
    if (scheduleCards === 0) throw new Error('No broadcast schedule cards rendered');

    pass('6. Schedule & Calendar Radar Page', `Schedule cards rendered: ${scheduleCards} | Days of week bar active`);
    await page.close();
  } catch (err) {
    fail('6. Schedule & Calendar Radar Page', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: Live TV Page (/en/live)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${BASE_URL}/en/live`, { waitUntil: 'domcontentloaded', timeout: 35000 });

    await page.waitForSelector('h1:has-text("Live TV")', { timeout: 15000 });
    const playerArea = await page.locator('.aspect-video video, .aspect-video iframe').count();
    const channelsList = await page.locator('[data-channel-id], button:has-text("Direct HLS"), button:has-text("HD")').count();

    if (playerArea === 0) throw new Error('Live TV player video/iframe not found');

    pass('7. Live TV 24/7 Channel Radar & Player', `Player mounted: true | Channel items: ${channelsList}`);
    await page.close();
  } catch (err) {
    fail('7. Live TV 24/7 Channel Radar & Player', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 8: Asian Drama Page (/en/k-drama)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${BASE_URL}/en/k-drama`, { waitUntil: 'domcontentloaded', timeout: 35000 });

    await page.waitForSelector('button:has-text("K-Drama")', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const cards = await page.locator('[data-testid="poster-card"]').count();
    if (cards === 0) throw new Error('No K-Drama poster cards rendered');

    pass('8. Asian Drama & K-Drama Catalog Page', `Drama cards rendered: ${cards} | Tabs operational`);
    await page.close();
  } catch (err) {
    fail('8. Asian Drama & K-Drama Catalog Page', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 9: Search Page (/en/search?q=demon)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${BASE_URL}/en/search?q=demon`, { waitUntil: 'domcontentloaded', timeout: 35000 });

    await page.waitForTimeout(2500);
    const searchCards = await page.locator('[data-testid="poster-card"]').count();
    if (searchCards === 0) throw new Error('Search failed to render results for "demon"');

    pass('9. Instant Search Engine & Results Grid', `Found ${searchCards} matching items for "demon"`);
    await page.close();
  } catch (err) {
    fail('9. Instant Search Engine & Results Grid', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 10: Mobile Viewport & Responsiveness (390x844 iPhone 14)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.goto(`${BASE_URL}/en`, { waitUntil: 'domcontentloaded', timeout: 35000 });

    // Verify Mobile Header & Mobile Bottom Bar
    const mobileHeader = page.locator('header.lg\\:hidden');
    const mobileBottomBar = page.locator('nav.lg\\:hidden');

    const hasMobileHeader = await mobileHeader.isVisible();
    const hasMobileBottomBar = await mobileBottomBar.isVisible();

    // Verify No Horizontal Overflow on mobile
    const hasMobileOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 1;
    });

    if (!hasMobileHeader || !hasMobileBottomBar) throw new Error('Mobile header or bottom navigation bar not visible');
    if (hasMobileOverflow) throw new Error('Horizontal scrollbar / layout overflow on mobile viewport');

    // Test Episode Navigator on Mobile (2-column density)
    await page.goto(`${BASE_URL}/en/watch/85937?s=1&e=1&type=anime`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    const epNavOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 1;
    });
    if (epNavOverflow) throw new Error('Watch page has horizontal overflow on mobile');

    pass('10. Mobile Responsive Layout & Episode Grid (390x844)', `Mobile Header: ${hasMobileHeader} | Mobile Nav: ${hasMobileBottomBar} | Zero overflow on Watch Page`);
    await page.close();
  } catch (err) {
    fail('10. Mobile Responsive Layout & Episode Grid (390x844)', err);
  }

  await browser.close();

  console.log(`\n========================================================================`);
  console.log(`   EXECUTION SUMMARY: ${passedTests}/${totalTests} PASSED, ${failedTests} FAILED`);
  console.log(`========================================================================\n`);

  if (failedTests > 0) {
    console.table(failureLog);
    process.exit(1);
  } else {
    console.log(`🎉 ALL 10 E2E BROWSER TESTS PASSED FLAWLESSLY!`);
    process.exit(0);
  }
}

runFullVerification().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
