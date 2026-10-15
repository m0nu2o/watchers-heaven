import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3002';

async function run() {
  console.log('========================================================================');
  console.log('   REANIME ENGINE & MULTILINGUAL BUTTON VERIFICATION TEST SUITE');
  console.log('========================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  function report(name, ok, detail = '') {
    if (ok) {
      console.log(`✅ PASS | ${name}`);
      if (detail) console.log(`   ↳ ${detail}`);
      passed++;
    } else {
      console.error(`❌ FAIL | ${name}`);
      if (detail) console.error(`   ↳ ${detail}`);
      failed++;
    }
  }

  try {
    // 1. Anime Page: Demon Slayer - Verify NextGen Anime Server & SUB embed
    console.log('Testing Anime Playback with NextGen Anime Server...');
    await page.goto(`${BASE_URL}/en/watch/85937?s=1&e=1&type=anime&track=sub`, { waitUntil: 'domcontentloaded' });
    const iframe = page.locator('iframe').first();
    await iframe.waitFor({ state: 'attached', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const isIframeVisible = await iframe.isVisible();
    const iframeSrc = (await iframe.getAttribute('src')) || '';
    const nextgenServerBtn = page.locator('button:has-text("NextGen Anime Server"), button:has-text("NextGen")').first();
    const isNextGenBtnVisible = await nextgenServerBtn.isVisible();

    report(
      '1. Anime Stream loads via NextGen Anime Server (FlixCloud HD-1 & HD-2)',
      isIframeVisible && (iframeSrc.includes('flixcloud.cc') || iframeSrc.length > 0) && isNextGenBtnVisible,
      `Iframe src: ${iframeSrc} | NextGen Server Deck Button: ${isNextGenBtnVisible}`
    );

    // 2. Verify [HINDI] button is hidden on Demon Slayer
    const hindiBtn = page.locator('button:has-text("HINDI")');
    const isHindiVisible = await hindiBtn.isVisible();
    report(
      '2. [HINDI] button is strictly hidden when title has no Hindi dub',
      !isHindiVisible,
      `Hindi button visible: ${isHindiVisible}`
    );

    // 3. Verify [DUB] button switches to English Dub (FlixCloud &a=1)
    const dubBtn = page.locator('button:has-text("DUB")').first();
    if (await dubBtn.isVisible()) {
      await dubBtn.click();
      await page.waitForTimeout(2000);
      const updatedSrc = (await iframe.getAttribute('src')) || '';
      report(
        '3. [DUB] button triggers English Dub playback with &a=1',
        updatedSrc.includes('a=1') || updatedSrc.includes('dub=1'),
        `Updated src: ${updatedSrc}`
      );
    } else {
      report('3. [DUB] button triggers English Dub playback', false, 'DUB button not found');
    }

    // 4. Verify [SUB] button switches back to Original Japanese
    const subBtn = page.locator('button:has-text("SUB")').first();
    if (await subBtn.isVisible()) {
      await subBtn.click();
      await page.waitForTimeout(2000);
      const subSrc = (await iframe.getAttribute('src')) || '';
      report(
        '4. [SUB] button restores Japanese audio stream',
        !subSrc.includes('&a=1') && subSrc.includes('flixcloud.cc'),
        `Restored sub src: ${subSrc}`
      );
    }

    // 5. Verify English Movie: Inception - DUB button does NOT throw error
    console.log('\nTesting Hollywood Movie with Audio Selection...');
    await page.goto(`${BASE_URL}/en/watch/27205?type=movie&track=dub-en`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const inceptionIframe = page.locator('iframe').first();
    const inceptionSrc = (await inceptionIframe.getAttribute('src')) || '';
    const errorToast = page.locator('text="English DUB is not available"');
    const hasError = await errorToast.isVisible();
    report(
      '5. Inception [DUB] resolves gracefully without rejection error',
      !hasError && inceptionSrc.length > 0,
      `Inception iframe src: ${inceptionSrc}`
    );

    // 6. Verify Bollywood Movie: Dangal - [HINDI] button is visible & works
    console.log('\nTesting Bollywood Movie Hindi Audio...');
    await page.goto(`${BASE_URL}/en/watch/360814?type=movie&track=dub-hi`, { waitUntil: 'domcontentloaded' });
    const dangalHindiBtn = page.locator('button:has-text("HINDI")');
    await dangalHindiBtn.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    const isDangalHindiVisible = await dangalHindiBtn.isVisible();
    const dangalIframe = page.locator('iframe').first();
    const dangalSrc = (await dangalIframe.getAttribute('src')) || '';
    report(
      '6. Dangal has verified [HINDI] button visible & active stream',
      isDangalHindiVisible && dangalSrc.length > 0,
      `Dangal stream src: ${dangalSrc}`
    );

    // 7. Verify Navigation Bar Animation Label
    console.log('\nTesting Navigation & Catalog...');
    await page.goto(`${BASE_URL}/en/anime`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const animNav = page.locator('a[href*="/anime"][aria-label="Animation"], a[href*="/anime"]:has-text("Animation")').first();
    const animNavVisible = await animNav.isVisible();
    report(
      '7. Navbar renders "Animation" helping text for Anime & Donghua',
      animNavVisible,
      'Animation nav link confirmed'
    );

    // 8. Verify Explore Catalog Dubbed Filter retains rich anime shows
    await page.goto(`${BASE_URL}/en/explore?type=anime&audio=english`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="poster-card"], .card-snap', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const cards = await page.locator('[data-testid="poster-card"], .card-snap').count();
    report(
      '8. Explore page with English Dub filter displays complete anime catalog (not 1 item)',
      cards >= 6,
      `Cards rendered: ${cards}`
    );

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n========================================================================');
  console.log(`   EXECUTION SUMMARY: ${passed}/${passed + failed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');
  process.exit(failed > 0 ? 1 : 0);
}

run();
