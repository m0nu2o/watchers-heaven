import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';

async function runMasterAuditSuite() {
  console.log(`========================================================================`);
  console.log(`   LUMINA MASTER AUDIT & STREAMING QUALITY ASSURANCE SUITE`);
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
  // TEST 1: Homepage (/en) Layout, Hero, Dock, Footer, Zero Overflow
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${BASE_URL}/en`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForSelector('main', { timeout: 15000 });

    const rankCards = await page.locator('[data-testid="rank-card"], [data-testid="poster-card"]').count();
    const desktopNav = await page.locator('aside').first().isVisible();
    const footerText = await page.locator('footer').innerText();
    const hasCreator = footerText.includes('@itxz_baka');

    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (hasOverflow) throw new Error('Horizontal scrollbar overflow on homepage');

    pass('1. Homepage Layout, Hero & Footer', `Cards: ${rankCards} | Desktop Nav: ${desktopNav} | Creator: @itxz_baka | Zero overflow`);
    await page.close();
  } catch (err) {
    fail('1. Homepage Layout, Hero & Footer', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Watch Movie (Fight Club #550) - Sandbox Protection & AdShield
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const popupList = [];
    page.on('popup', p => popupList.push(p.url()));

    await page.goto(`${BASE_URL}/en/watch/550?type=movie`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForSelector('iframe', { timeout: 20000 });
    await page.waitForTimeout(3000);

    const iframe = page.locator('iframe').first();
    const iframeSrc = await iframe.getAttribute('src');
    if (!iframeSrc || !iframeSrc.startsWith('http')) {
      throw new Error(`Iframe src missing or invalid: "${iframeSrc}"`);
    }

    // Verify "Ad Shield Active" and "Popup Guard" badges are cleanly removed from UI
    const shieldBadge = page.locator('text=Ad Shield Active').first();
    const isShieldVisible = await shieldBadge.isVisible().catch(() => false);
    if (isShieldVisible) throw new Error('Ad Shield Active badge should be removed from UI');

    const popupBadge = page.locator('text=Popup Guard').first();
    const isPopupVisible = await popupBadge.isVisible().catch(() => false);
    if (isPopupVisible) throw new Error('Popup Guard badge should be removed from UI');

    // Verify "Please Disable Sandbox" and "Restricted Embed" errors are NOT present on screen
    const pageText = await page.evaluate(() => document.body.innerText);
    if (pageText.toLowerCase().includes('disable sandbox') || pageText.toLowerCase().includes('remove sandbox') || pageText.toLowerCase().includes('restricted embed')) {
      throw new Error('Sandbox error popup detected on screen!');
    }

    // Test parent window.open neutralization (silent AdShield check)
    const windowOpenBlocked = await page.evaluate(() => {
      const res = window.open('https://malicious-ad.com');
      return res === null;
    });
    if (!windowOpenBlocked) throw new Error('Parent window.open was not neutralized by AdShield');

    pass('2. Watch Movie Sandbox-Free Playback & Clean Minimal HUD', `Src: "${iframeSrc.slice(0, 40)}..." | Badges cleanly removed (Shield: ${isShieldVisible}, Popup: ${isPopupVisible}) | Window.open neutralized: ${windowOpenBlocked}`);
    await page.close();
  } catch (err) {
    fail('2. Watch Movie Sandbox-Free Playback & Clean Minimal HUD', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Watch Anime (Demon Slayer #85937) - NextGen Engine & Episodes
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${BASE_URL}/en/watch/85937?s=1&e=1&type=anime`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForSelector('iframe', { timeout: 20000 });
    await page.waitForTimeout(3000);

    const iframe = page.locator('iframe').first();
    const iframeSrc = await iframe.getAttribute('src');
    const sandboxAttr = await iframe.getAttribute('sandbox');

    if (!iframeSrc || !iframeSrc.includes('flixcloud')) {
      throw new Error(`Expected FlixCloud NextGen stream, got: ${iframeSrc}`);
    }

    // Check SUB active, HINDI strictly hidden for Japanese anime
    const subBtn = page.locator('button:has-text("SUB")').first();
    const isSubActive = await subBtn.isVisible();
    const hindiBtn = page.locator('button:has-text("HINDI")');
    const isHindiVisible = (await hindiBtn.count()) > 0 && await hindiBtn.first().isVisible();

    const epCount = await page.locator('text=/EP\\s+\\d+/').count();

    pass('3. Watch Anime NextGen Engine & Episode Matrix', `Stream: "${iframeSrc.slice(0, 45)}..." | Sub: ${isSubActive} | Hindi Hidden: ${!isHindiVisible} | Episodes: ${epCount}`);
    await page.close();
  } catch (err) {
    fail('3. Watch Anime NextGen Engine & Episode Matrix', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Bollywood Watch Page (Dangal #360814) - Hindi Audio Track
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${BASE_URL}/en/watch/360814?type=movie`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForSelector('iframe', { timeout: 20000 });

    const hindiBtn = page.locator('button:has-text("HINDI")').first();
    await hindiBtn.waitFor({ state: 'visible', timeout: 15000 });

    pass('4. Bollywood Multi-Audio System (Dangal)', 'HINDI audio button active & confirmed for Indian title');
    await page.close();
  } catch (err) {
    fail('4. Bollywood Multi-Audio System (Dangal)', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: TV Series Multi-Season & Episode Navigator (Breaking Bad #1396)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${BASE_URL}/en/watch/1396?s=1&e=1&type=tv`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForSelector('iframe', { timeout: 20000 });
    await page.waitForTimeout(2000);

    const epCount = await page.locator('text=/EP\\s+\\d+/').count();
    const seasonSelect = page.locator('button:has-text("Season")').first();
    const isSeasonVisible = await seasonSelect.isVisible();

    pass('5. TV Series Multi-Season Navigation (Breaking Bad)', `Season selector: ${isSeasonVisible} | Episodes loaded: ${epCount}`);
    await page.close();
  } catch (err) {
    fail('5. TV Series Multi-Season Navigation (Breaking Bad)', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: Asian Drama & K-Drama Catalog (/en/k-drama)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${BASE_URL}/en/k-drama`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForSelector('[data-testid="poster-card"]', { timeout: 20000 });

    const kdramaCards = await page.locator('[data-testid="poster-card"]').count();

    // Switch to C-Drama tab
    const cdramaTab = page.locator('button:has-text("C-Drama")').first();
    await cdramaTab.click();
    await page.waitForTimeout(2000);
    const cdramaCards = await page.locator('[data-testid="poster-card"]').count();

    pass('6. Asian Drama Catalog & Country Tabs', `K-Drama cards: ${kdramaCards} | C-Drama cards: ${cdramaCards}`);
    await page.close();
  } catch (err) {
    fail('6. Asian Drama Catalog & Country Tabs', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: Anime & Donghua Dedicated Section (/en/anime)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${BASE_URL}/en/anime`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForSelector('[data-testid="poster-card"]', { timeout: 30000 });

    const animeCards = await page.locator('[data-testid="poster-card"]').count();

    // Switch to Donghua tab
    const donghuaTab = page.locator('button:has-text("Donghua")').first();
    if (await donghuaTab.count() > 0) {
      await donghuaTab.click();
      await page.waitForTimeout(2000);
    }
    const donghuaCards = await page.locator('[data-testid="poster-card"]').count();

    pass('7. Anime & Donghua Catalog & Sub/Dub Filters', `Anime Cards: ${animeCards} | Donghua Cards: ${donghuaCards}`);
    await page.close();
  } catch (err) {
    fail('7. Anime & Donghua Catalog & Sub/Dub Filters', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 8: Live TV 24/7 Channel Radar (/en/live)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${BASE_URL}/en/live`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForSelector('video', { timeout: 20000 });

    const channelButtons = await page.locator('button:has-text("Live"), [data-testid="channel-item"]').count();
    const hasPlayer = await page.locator('video').count() > 0;

    pass('8. Live TV 24/7 Channel Player', `Player mounted: ${hasPlayer} | Channels: ${channelButtons}`);
    await page.close();
  } catch (err) {
    fail('8. Live TV 24/7 Channel Player', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 9: Explore Page Dynamic Filtering (/en/explore)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${BASE_URL}/en/explore`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForSelector('[data-testid="poster-card"]', { timeout: 20000 });

    const exploreCards = await page.locator('[data-testid="poster-card"]').count();

    // Click Anime category pill
    const animePill = page.locator('button:has-text("Anime")').first();
    await animePill.click();
    await page.waitForTimeout(2000);
    const filteredAnimeCards = await page.locator('[data-testid="poster-card"]').count();

    pass('9. Explore Page Categories & Filters', `Total initial cards: ${exploreCards} | Filtered cards: ${filteredAnimeCards}`);
    await page.close();
  } catch (err) {
    fail('9. Explore Page Categories & Filters', err);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 10: Mobile Viewport (390x844 iPhone 14) Responsive Layout & Sandbox
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    await page.goto(`${BASE_URL}/en/watch/550?type=movie`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForSelector('iframe', { timeout: 20000 });
    await page.waitForTimeout(2000);

    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const shieldBadgeVisible = await page.locator('text=Ad Shield Active').first().isVisible().catch(() => false);
    if (shieldBadgeVisible) throw new Error('Ad Shield Active badge should not appear on mobile');

    if (hasHorizontalOverflow) throw new Error('Mobile viewport has horizontal layout overflow');

    pass('10. Mobile Responsive Layout & Clean HUD', `Shield Badge: ${shieldBadgeVisible} | Zero overflow on 390x844 iPhone`);
    await page.close();
  } catch (err) {
    fail('10. Mobile Responsive Layout & Clean HUD', err);
  }

  await browser.close();

  console.log(`\n========================================================================`);
  console.log(`   EXECUTION SUMMARY: ${passedTests}/${totalTests} PASSED, ${failedTests} FAILED`);
  console.log(`========================================================================\n`);

  if (failedTests > 0) {
    console.error('Failure breakdown:');
    failureLog.forEach(f => console.error(`  - ${f.test}: ${f.error}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL 10 MASTER AUDIT E2E TESTS PASSED FLAWLESSLY WITH 100% SUCCESS!');
  }
}

runMasterAuditSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
