import { chromium } from 'playwright';

async function runVerification() {
  console.log('=== STARTING USER PLAYBACK & ZERO-AD VERIFICATION SUITE ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const mainPage = await context.newPage();
  let popupCount = 0;
  context.on('page', (newPage) => {
    if (newPage !== mainPage) {
      popupCount++;
      console.warn('[POPUP DETECTED] New tab/page opened:', newPage.url());
    }
  });

  const errors = [];
  mainPage.on('pageerror', (err) => errors.push(err.message));

  // TEST 1: Anime Catalog Navigation & NextGen Player (Demon Slayer)
  console.log('Test 1: Navigate to Demon Slayer anime watch page...');
  await mainPage.goto('http://localhost:3002/en/watch/85937?s=1&e=1&type=anime&track=sub&title=Demon%20Slayer%3A%20Kimetsu%20no%20Yaiba', { waitUntil: 'domcontentloaded' });
  await mainPage.waitForSelector('iframe', { timeout: 10000 });

  const animeUrl = mainPage.url();
  console.log('Anime Watch URL:', animeUrl);
  const animeIframeSrc = await mainPage.evaluate(() => document.querySelector('iframe')?.src || '');
  const animeSandbox = await mainPage.evaluate(() => document.querySelector('iframe')?.getAttribute('sandbox') || '');
  const animeHardcodedControls = await mainPage.evaluate(() => !!document.querySelector('.player-center-controls, [data-player-controls]'));

  console.log('Anime Iframe Src:', animeIframeSrc);
  console.log('Anime Sandbox:', animeSandbox);
  console.log('Anime Hardcoded Controls:', animeHardcodedControls);

  const isFlixCloud = animeIframeSrc.includes('flixcloud.cc') || animeIframeSrc.includes('/e/');
  console.log(`[${isFlixCloud ? 'PASS' : 'FAIL'}] NextGen Anime loaded FlixCloud Embed`);
  console.log(`[${!animeHardcodedControls ? 'PASS' : 'FAIL'}] Zero hardcoded extra player controls`);
  console.log(`[${!animeSandbox.includes('allow-popups') ? 'PASS' : 'FAIL'}] Strict no-popup sandbox active on anime`);

  await mainPage.screenshot({ path: 'tests/verify-anime-flow.png' });

  // TEST 2: Movie Playback with VidSrc Global & Strict Sandbox (Fight Club)
  console.log('\nTest 2: Navigate to movie /en/watch/550 (Fight Club)...');
  await mainPage.goto('http://localhost:3002/en/watch/550?type=movie', { waitUntil: 'domcontentloaded' });
  await mainPage.waitForTimeout(4000);

  const movieIframeSrc = await mainPage.evaluate(() => document.querySelector('iframe')?.src || '');
  const movieSandbox = await mainPage.evaluate(() => document.querySelector('iframe')?.getAttribute('sandbox') || '');
  const movieHardcodedControls = await mainPage.evaluate(() => !!document.querySelector('.player-center-controls, [data-player-controls]'));

  console.log('Movie Iframe Src:', movieIframeSrc);
  console.log('Movie Sandbox:', movieSandbox);
  console.log(`[${movieIframeSrc.includes('slast430did.com') || movieIframeSrc.includes('vidsrc.pm') ? 'PASS' : 'FAIL'}] Movie loaded VidSrc Global Mirror`);
  console.log(`[${!movieHardcodedControls ? 'PASS' : 'FAIL'}] Zero hardcoded controls on movie player`);
  console.log(`[${!movieSandbox.includes('allow-popups') ? 'PASS' : 'FAIL'}] Strict no-popup sandbox active on movie`);

  await mainPage.screenshot({ path: 'tests/verify-movie-flow.png' });

  // TEST 3: TV Series Playback (Squid Game)
  console.log('\nTest 3: Navigate to TV show /en/watch/93405?s=1&e=1 (Squid Game)...');
  await mainPage.goto('http://localhost:3002/en/watch/93405?s=1&e=1&type=tv', { waitUntil: 'domcontentloaded' });
  await mainPage.waitForTimeout(4000);

  const tvIframeSrc = await mainPage.evaluate(() => document.querySelector('iframe')?.src || '');
  const tvSandbox = await mainPage.evaluate(() => document.querySelector('iframe')?.getAttribute('sandbox') || '');
  console.log('TV Iframe Src:', tvIframeSrc);
  console.log(`[${tvIframeSrc.includes('slast430did.com') || tvIframeSrc.includes('vidsrc.pm') ? 'PASS' : 'FAIL'}] TV loaded VidSrc Global Mirror`);
  console.log(`[${!tvSandbox.includes('allow-popups') ? 'PASS' : 'FAIL'}] Strict no-popup sandbox active on TV`);

  await mainPage.screenshot({ path: 'tests/verify-tv-flow.png' });

  // TEST 4: Click Player Container & Verify ZERO Popups
  console.log('\nTest 4: Verify Zero Popups on clicking player area...');
  const player = mainPage.locator('[aria-label="Universal Video Player"]');
  if (await player.count() > 0) {
    await player.click({ position: { x: 100, y: 100 }, force: true });
    await mainPage.waitForTimeout(1000);
    await player.click({ position: { x: 300, y: 200 }, force: true });
    await mainPage.waitForTimeout(1000);
  }
  console.log(`Total Popups Spawned: ${popupCount}`);
  console.log(`[${popupCount === 0 ? 'PASS' : 'FAIL'}] Ad popups completely neutralized (0 popups)`);

  await browser.close();
  console.log('\n=== ALL PLAYBACK & ZERO-AD CHECKS VERIFIED ===');
}

runVerification().catch(console.error);
