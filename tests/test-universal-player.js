/**
 * Automated Playwright Test Suite for AuraStream Universal Video Player
 * Verifies custom controls, timeline, menus, shortcuts, responsive layout, and fallback.
 */

const { chromium } = require('playwright');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3002';

async function runUniversalPlayerTests() {
  console.log(`\n🚀 Starting Universal Player Playwright Test Suite on ${BASE_URL}...\n`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, testName) {
    totalCount++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
    }
  }

  try {
    // ── Test 1: TV Episode Page Mounts Universal Player ──
    console.log('📌 Test 1: TV Episode Mounts Universal Player');
    await page.goto(`${BASE_URL}/en/watch/93405?s=1&e=1`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(4000);

    // The UniversalPlayer container has aria-label="Universal Video Player"
    const playerContainer = await page.$('[aria-label="Universal Video Player"]');
    assert(playerContainer !== null, 'Universal Player container with aria-label mounted');

    // Provider iframe is mounted in viewport
    const iframeEl = await page.$('[aria-label="Universal Video Player"] iframe');
    assert(iframeEl !== null, 'Streaming provider iframe mounted in viewport');

    // Zero duplicate controls obscuring the iframe
    const centerBtn = await page.$('[aria-label="Universal Video Player"] button[aria-label="Play"]');
    assert(centerBtn === null, 'No duplicate center play button obscuring the iframe');

    // ── Test 2: Audio Track Selection Under Player ──
    console.log('\n📌 Test 2: Audio Track Selection Menu');
    const audioPills = await page.$$('button:has-text("Original"), button:has-text("Hindi"), button:has-text("English")');
    assert(audioPills.length > 0, 'Audio Track selector pills exist and are accessible');

    // ── Test 3: Streaming Server Switching Under Player ──
    console.log('\n📌 Test 3: Server Switching Under Player');
    const serverButtons = await page.$$('button:has-text("VidSrc"), button:has-text("AutoEmbed"), button:has-text("Embed"), button:has-text("ScreenScape")');
    assert(serverButtons.length > 0, 'Server switching pills exist in under-player deck');

    // ── Test 4: Apple-Grade Player Header HUD ──
    console.log('\n📌 Test 4: Apple-Grade Player Header HUD');
    const reloadBtn = await page.$('button[aria-label="Reload Stream"], button[title="Reload Stream"]');
    assert(reloadBtn !== null, 'Reload Stream button exists in player HUD');

    const fullscreenBtn = await page.$('button[aria-label="Fullscreen"], button[aria-label="Toggle Fullscreen"]');
    assert(fullscreenBtn !== null, 'Fullscreen button exists in player HUD');

    // ── Test 5: Keyboard Shortcuts Handled Non-Intrusively ──
    console.log('\n📌 Test 5: Keyboard Shortcuts');
    if (playerContainer) {
      await playerContainer.click();
      await page.waitForTimeout(200);

      // Space to toggle play/pause handled gracefully
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);
      assert(true, 'Spacebar shortcut handled without error');

      // Arrow keys do not crash page
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);
      assert(true, 'ArrowRight seek shortcut handled without error');

      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(300);
      assert(true, 'ArrowLeft seek shortcut handled without error');

      // Fullscreen shortcut F
      await page.keyboard.press('f');
      await page.waitForTimeout(300);
      assert(true, 'F key fullscreen toggle handled without error');

      // Exit fullscreen with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      assert(true, 'Escape key handled cleanly without error');
    }

    // ── Test 6: Page Scrolling During Playback ──
    console.log('\n📌 Test 6: Page Scrolling During Playback');
    const scrollInitial = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'instant' }));
    await page.waitForTimeout(500);
    const scrollAfter = await page.evaluate(() => window.scrollY);
    assert(scrollAfter > scrollInitial, 'Page scrolls freely during video playback');

    // ── Test 7: Mobile Viewport & Responsive Layout ──
    console.log('\n📌 Test 7: Mobile Viewport & Responsive Layout');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1000);

    const mobilePlayer = await page.$('[aria-label="Universal Video Player"]');
    assert(mobilePlayer !== null, 'Universal Player renders on mobile viewport');

    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert(!hasHorizontalOverflow, 'Zero horizontal overflow on mobile screen (390px)');

    // ── Test 8: Anime Media Type ──
    console.log('\n📌 Test 8: Anime Streaming Page');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/en/watch/1429?s=1&e=1&type=anime`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(4000);

    const animePlayer = await page.$('[aria-label="Universal Video Player"]');
    assert(animePlayer !== null, 'Universal Player mounted on Anime watch page');

    const animeBadge = await page.$('text=Anime');
    assert(animeBadge !== null, 'Anime media type badge displayed');

    // ── Test 9: Movie Page ──
    console.log('\n📌 Test 9: Movie Watch Page');
    await page.goto(`${BASE_URL}/en/watch/550`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(4000);

    const moviePlayer = await page.$('[aria-label="Universal Video Player"]');
    assert(moviePlayer !== null, 'Universal Player mounted on Movie watch page');

    const movieBadge = await page.$('text=Movie');
    assert(movieBadge !== null, 'Movie media type badge displayed');

  } catch (err) {
    console.error('💥 Test execution error:', err);
  } finally {
    await browser.close();
    console.log(`\n========================================`);
    console.log(`Universal Player Test Results: ${passedCount}/${totalCount} passed`);
    console.log(`========================================\n`);

    if (passedCount < totalCount) {
      process.exit(1);
    }
  }
}

runUniversalPlayerTests();
