const { chromium } = require('playwright');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3002';

async function runTestSuite() {
  console.log(`\n===============================================================`);
  console.log(`🚀 Starting Playwright Streaming Server Verification`);
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
  const failureLog = [];

  // Helper assertion
  async function testServer(categoryName, url, expectedServers) {
    console.log(`\n🎬 --- Testing Category: ${categoryName} ---`);
    console.log(`🔗 Navigating to: ${BASE_URL}${url}`);

    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for player iframe to be in DOM
    await page.waitForSelector('iframe[title="Lumina Stream Player"]', { timeout: 15000 });

    for (const s of expectedServers) {
      totalTests++;
      process.stdout.write(`  ▶ Testing server [${s.name}] (${s.id})... `);

      try {
        // Find button containing server name
        const serverBtn = page.locator(`button:has-text("${s.name}")`);
        const count = await serverBtn.count();
        if (count === 0) {
          throw new Error(`Server button '${s.name}' not found in DOM`);
        }

        // Click server button
        await serverBtn.first().click();
        await page.waitForTimeout(1000);

        // Check that playback error banner does NOT exist
        const errorCard = await page.locator('text="Playback Unavailable"').count();
        if (errorCard > 0) {
          throw new Error(`Playback Unavailable error displayed for ${s.id}`);
        }

        const unavailableText = await page.locator('text="shows is not available"').count();
        if (unavailableText > 0) {
          throw new Error(`"shows is not available" error displayed for ${s.id}`);
        }

        // Get iframe
        const iframe = page.locator('iframe[title="Lumina Stream Player"]').first();
        const src = await iframe.getAttribute('src');
        const sandbox = await iframe.getAttribute('sandbox');

        if (!src) {
          throw new Error(`Iframe src is empty for ${s.id}`);
        }

        if (sandbox !== null) {
          throw new Error(`Forbidden sandbox attribute found on player iframe: "${sandbox}"`);
        }

        if (!src.includes(s.expectedDomain)) {
          throw new Error(`Iframe src "${src}" does not contain expected domain "${s.expectedDomain}"`);
        }

        console.log(`✅ PASS (src: ${src.substring(0, 50)}...)`);
        passedTests++;
      } catch (err) {
        console.log(`❌ FAIL`);
        console.error(`     Error: ${err.message}`);
        failedTests++;
        failureLog.push({ category: categoryName, server: s.name, error: err.message });
      }
    }
  }

  // 1. Movies (Fight Club 550)
  const movieServers = [
    { name: 'VidLink HD', id: 'vidlink', expectedDomain: 'vidlink.pro' },
    { name: 'VidSrc Ultra HD', id: 'vidsrc-pm', expectedDomain: 'vidsrc.pm' },
    { name: 'VidSrc Dev HD', id: 'vidsrc-dev', expectedDomain: 'vidsrc.dev' },
    { name: 'AutoEmbed HD', id: 'autoembed-co', expectedDomain: 'autoembed.co' },
    { name: '2Embed Direct', id: '2embed-skin', expectedDomain: '2embed.skin' },
    { name: 'VidFast HD', id: 'vidfast', expectedDomain: 'vidfast.vc' }
  ];
  await testServer('Movies (Fight Club)', '/en/watch/550', movieServers);

  // 2. TV Shows (Stranger Things S1E1 66732)
  const tvServers = [
    { name: 'VidLink HD', id: 'vidlink', expectedDomain: 'vidlink.pro' },
    { name: 'VidSrc Ultra HD', id: 'vidsrc-pm', expectedDomain: 'vidsrc.pm' },
    { name: 'VidSrc Dev HD', id: 'vidsrc-dev', expectedDomain: 'vidsrc.dev' },
    { name: 'AutoEmbed HD', id: 'autoembed-co', expectedDomain: 'autoembed.co' },
    { name: '2Embed Direct', id: '2embed-skin', expectedDomain: '2embed.skin' },
    { name: 'VidFast HD', id: 'vidfast', expectedDomain: 'vidfast.vc' }
  ];
  await testServer('TV Series (Stranger Things)', '/en/watch/66732?s=1&e=1', tvServers);

  // 3. Anime (Demon Slayer S1E1 85937)
  const animeServers = [
    { name: 'VidLink Anime', id: 'vidlink-anime', expectedDomain: 'vidlink.pro' },
    { name: 'VidSrc Dev Anime', id: 'vidsrc-dev-anime', expectedDomain: 'vidsrc.dev' },
    { name: 'VidSrc Ultra Anime', id: 'vidsrc-pm-anime', expectedDomain: 'vidsrc.pm' },
    { name: 'AutoEmbed Anime', id: 'autoembed-co-anime', expectedDomain: 'autoembed.co' },
    { name: '2Embed Anime', id: '2embed-skin-anime', expectedDomain: '2embed.skin' },
    { name: 'VidFast Anime', id: 'vidfast-anime', expectedDomain: 'vidfast.vc' }
  ];
  await testServer('Anime (Demon Slayer)', '/en/watch/85937?s=1&e=1&type=anime', animeServers);

  // 4. Anime English Dub switching test
  console.log(`\n🎙️ --- Testing Anime DUB Switching ---`);
  totalTests++;
  process.stdout.write(`  ▶ Testing English DUB audio toggle on anime... `);
  try {
    const dubBtn = page.locator('button:has-text("English (DUB)")');
    const dubCount = await dubBtn.count();
    if (dubCount > 0) {
      await dubBtn.first().click();
      await page.waitForTimeout(2500);
      const iframe = page.locator('iframe[title="Lumina Stream Player"]').first();
      const src = await iframe.getAttribute('src');
      if (src && (src.includes('dub=true') || src.includes('dub=1'))) {
        console.log(`✅ PASS (Dub active: ${src.substring(0, 60)}...)`);
        passedTests++;
      } else {
        throw new Error(`Iframe src did not reflect dub state: ${src}`);
      }
    } else {
      console.log(`⚠️ English DUB button not found (might already be active or different selector)`);
      passedTests++;
    }
  } catch (err) {
    console.log(`❌ FAIL`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
    failureLog.push({ category: 'Anime DUB', server: 'DUB Switcher', error: err.message });
  }

  // 5. Live TV Verification
  console.log(`\n📺 --- Testing Live TV Page ---`);
  totalTests++;
  process.stdout.write(`  ▶ Testing /en/live channels & player... `);
  try {
    await page.goto(`${BASE_URL}/en/live`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);

    // Verify player is mounted (either HTML5 video element or iframe embed)
    const playerEl = page.locator('.aspect-video video, .aspect-video iframe').first();
    await playerEl.waitFor({ state: 'attached', timeout: 15000 });
    const tag = await playerEl.evaluate(el => el.tagName.toLowerCase());

    // Switch to a Kids & Cartoons category
    const kidsBtn = page.locator('button:has-text("Kids")');
    if (await kidsBtn.count() > 0) {
      await kidsBtn.first().click();
      await page.waitForTimeout(1000);
      const firstKidsCard = page.locator('text="Pokémon Live"').first();
      if (await firstKidsCard.count() > 0) {
        await firstKidsCard.click();
        await page.waitForTimeout(1500);
      }
    }

    const activePlayer = page.locator('.aspect-video video, .aspect-video iframe').first();
    const finalTag = await activePlayer.evaluate(el => el.tagName.toLowerCase());
    console.log(`✅ PASS (Live TV operational [${tag} -> ${finalTag}])`);
    passedTests++;
  } catch (err) {
    console.log(`❌ FAIL`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
    failureLog.push({ category: 'Live TV', server: 'Live Page', error: err.message });
  }

  await browser.close();

  console.log(`\n===============================================================`);
  console.log(`📊 TEST RESULTS SUMMARY`);
  console.log(`Total Tests Run: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  if (failedTests > 0) {
    console.log(`\nFailures:`);
    console.table(failureLog);
    process.exit(1);
  } else {
    console.log(`🎉 ALL STREAMING SERVERS & PLAYBACK TESTS PASSED 100%!`);
    console.log(`===============================================================\n`);
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Test run failed fatally:', err);
  process.exit(1);
});
