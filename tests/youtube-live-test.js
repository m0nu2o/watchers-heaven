const { chromium } = require('playwright');

const BASE_URL = process.argv[2] || process.env.TEST_URL || 'http://localhost:3002';

async function runLiveTvTestSuite() {
  console.log(`\n===============================================================`);
  console.log(`🚀 Dedicated YouTube Live TV & HLS Streaming Verification`);
  console.log(`🎯 Target URL: ${BASE_URL}`);
  console.log(`===============================================================\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

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

  try {
    // 1. Navigate to Live TV
    console.log('📌 Test 1: Navigation & Page Initialization');
    const res = await page.goto(`${BASE_URL}/en/live`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    record(res && res.status() === 200, 'Live TV page responds with 200 OK');
    await page.waitForTimeout(2000);

    // 2. Verify Channel Cards & Metadata
    console.log('\n📌 Test 2: Channel Cards, Thumbnails & Live Badges');
    const channelCards = await page.locator('.aspect-video ~ div button, div[class*="overflow-y-auto"] button');
    const count = await channelCards.count();
    record(count >= 15, `Found ${count} populated channels (minimum 15 required)`);

    // Verify first card has image thumbnail and live badge
    const firstImg = page.locator('div[class*="overflow-y-auto"] button img').first();
    record(await firstImg.isVisible(), 'Channel card displays valid image thumbnail');

    const liveBadge = page.locator('text="LIVE NOW"').first();
    record(await liveBadge.isVisible(), 'Active stream information bar displays LIVE NOW badge');

    // 3. Test Direct HLS initial playback
    console.log('\n📌 Test 3: Direct HLS Playback & Autoplay Compliance');
    const videoEl = page.locator('video').first();
    record(await videoEl.isVisible(), 'HTML5 video element active for direct HLS broadcast');

    const unmuteBtn = page.locator('button:has-text("Click to Unmute"), button:has-text("Unmute")').first();
    record(await unmuteBtn.isVisible(), 'Autoplay compliance "Click to Unmute" button is rendered');

    // 4. Test YouTube Live Channel: Sky News
    console.log('\n📌 Test 4: YouTube Live Channel Switching (Sky News)');
    const skyBtn = page.locator('button:has-text("Sky News Live")').first();
    if (await skyBtn.isVisible()) {
      await skyBtn.click();
      await page.waitForTimeout(2500);

      const ytIframe = page.locator('iframe[title*="Sky News"]').first();
      const iframeSrc = await ytIframe.getAttribute('src');
      record(Boolean(iframeSrc && iframeSrc.includes('youtube.com/embed/')), `Sky News YouTube embed loaded: ${iframeSrc}`);

      const referrerPolicy = await ytIframe.getAttribute('referrerpolicy');
      record(referrerPolicy === 'strict-origin-when-cross-origin', 'Iframe configured with strict-origin-when-cross-origin to prevent Error 153');
    } else {
      record(false, 'Sky News channel button not found');
    }

    // 5. Test YouTube Live Channel: NASA Space Station
    console.log('\n📌 Test 5: YouTube Live Channel Switching (NASA Earth & Space Station)');
    const nasaBtn = page.locator('button:has-text("NASA Earth")').first();
    if (await nasaBtn.isVisible()) {
      await nasaBtn.click();
      await page.waitForTimeout(2500);

      const nasaIframe = page.locator('iframe[title*="NASA"]').first();
      const nasaSrc = await nasaIframe.getAttribute('src');
      record(Boolean(nasaSrc && nasaSrc.includes('youtube.com/embed/')), `NASA YouTube embed loaded: ${nasaSrc}`);
    } else {
      record(false, 'NASA channel button not found');
    }

    // 6. Test Category Filter Switching (Kids & Cartoons)
    console.log('\n📌 Test 6: Category Filter Switching');
    const kidsCategoryBtn = page.locator('button:has-text("Kids & Cartoons"), button:has-text("Kids")').first();
    await kidsCategoryBtn.click();
    await page.waitForTimeout(1000);

    const pokemonCard = page.locator('button:has-text("Pokémon Live")').first();
    record(await pokemonCard.isVisible(), 'Kids category successfully filtered Pokémon Live 24/7');

    await pokemonCard.click();
    await page.waitForTimeout(2000);
    const pokemonIframe = page.locator('iframe[title*="Pokémon"]').first();
    record(await pokemonIframe.isVisible(), 'Pokémon player iframe mounted successfully');

    // 7. Test Real-time Channel Search
    const allCategoryBtn = page.locator('button[data-category="all"], button:has-text("All")').first();
    await allCategoryBtn.click();
    await page.waitForTimeout(500);

    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('lofi');
    await page.waitForTimeout(1000);

    const lofiCard = page.locator('button:has-text("Lofi Girl")').first();
    record(await lofiCard.isVisible(), 'Search query "lofi" returned Lofi Girl channel');

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(1000);
    const restoredCount = await page.locator('div[class*="overflow-y-auto"] button').count();
    record(restoredCount >= 15, `Search cleared: channels list restored to ${restoredCount} channels`);

    // 8. Test Channel Switching Cleanup (Switch back to HLS)
    console.log('\n📌 Test 8: Player Cleanup & HLS Restoration');
    const aajTakBtn = page.locator('button:has-text("Aaj Tak HD")').first();
    await aajTakBtn.click();
    await page.waitForTimeout(2000);

    const restoredVideo = page.locator('video').first();
    record(await restoredVideo.isVisible(), 'Previous YouTube player cleanly destroyed and HLS video player restored');

  } catch (err) {
    console.error('Test run error:', err);
    record(false, 'Live TV test suite executed without crash', err.message);
  } finally {
    await browser.close();
  }

  console.log(`\n===============================================================`);
  console.log(`📊 LIVE TV TEST RESULTS SUMMARY`);
  console.log(`Total Tests Run: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  if (failedTests > 0) {
    console.log(`\n❌ Failures detected in Live TV test suite.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL LIVE TV & YOUTUBE LIVE TESTS PASSED 100%!`);
    console.log(`===============================================================\n`);
    process.exit(0);
  }
}

runLiveTvTestSuite();
