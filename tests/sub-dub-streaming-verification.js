// Comprehensive Sub/Dub Playback & Language Verification Suite
const { chromium } = require('playwright');

const BASE_URL = process.argv[2] || 'http://localhost:3002';

async function runSubDubVerification() {
  console.log(`\n============================================================`);
  console.log(`🎙️ LUMINA REAL SUB/DUB & STREAMING CAPABILITY VERIFICATION`);
  console.log(`   Target: ${BASE_URL}`);
  console.log(`============================================================\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

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
    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: Mushoku Tensei (TMDB 94664) — Verified English DUB Playback
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`📌 Test 1: Mushoku Tensei — English DUB & SUB Verification`);
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(`${BASE_URL}/en/watch/94664?type=anime&s=1&e=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);

      // 1. Initial State: SUB is active and player loads SUB source
      const subBtn = page.locator('button:has-text("SUB")').first();
      const isSubActive = await subBtn.getAttribute('class');
      record(Boolean(isSubActive && isSubActive.includes('bg-blue-600')), 'Mushoku Tensei: SUB track is active by default');

      const initialIframe = await page.locator('iframe').first().getAttribute('src');
      record(
        Boolean(initialIframe && initialIframe.startsWith('http')),
        `Mushoku Tensei: Initial SUB stream loads: ${initialIframe?.slice(0, 50)}...`
      );

      // 2. English DUB button exists and is ENABLED (not disabled)
      const engDubBtn = page.locator('button:has-text("English")').first();
      const isDubDisabled = await engDubBtn.getAttribute('disabled');
      record(isDubDisabled === null, 'Mushoku Tensei: English DUB is correctly recognized as AVAILABLE and enabled');

      // 3. Click English DUB
      console.log('   Clicking English DUB...');
      await engDubBtn.click();
      await page.waitForTimeout(2000);

      // Verify active button switched to English DUB
      const engBtnClass = await engDubBtn.getAttribute('class');
      record(Boolean(engBtnClass && engBtnClass.includes('bg-blue-600')), 'English DUB button becomes active');

      // Verify player iframe URL updated to real dub stream
      const dubIframeSrc = await page.locator('iframe').first().getAttribute('src');
      const isDubUrl = dubIframeSrc && (
        dubIframeSrc.includes('dub=true') ||
        dubIframeSrc.includes('dub=1') ||
        dubIframeSrc.includes('/dub') ||
        dubIframeSrc.includes('lan=eng')
      );
      record(Boolean(isDubUrl), `Mushoku Tensei: Player switches to genuine English DUB stream: ${dubIframeSrc?.slice(0, 60)}...`);

      // 4. Verify Server list in English DUB mode only shows DUB-capable servers
      const serverNames = await page.locator('div:has-text("Streaming Server") + div button span.truncate').allTextContents();
      const nonDubServers = serverNames.filter(name =>
        name.includes('VidSrc Ultra') || name.includes('AutoEmbed') || name.includes('2Embed') || name.includes('VidFast')
      );
      record(
        nonDubServers.length === 0,
        `English DUB hides SUB-only servers (Found ${serverNames.length} DUB servers: ${serverNames.join(', ')})`
      );

      // 5. Test Fallback within English DUB
      const switchServerBtn = page.locator('button:has-text("Switch Server")').first();
      if (await switchServerBtn.isVisible() && serverNames.length > 1) {
        console.log('   Testing same-language server switch...');
        await switchServerBtn.click();
        await page.waitForTimeout(1500);

        const fallbackIframeSrc = await page.locator('iframe').first().getAttribute('src');
        const fallbackIsDub = fallbackIframeSrc && (
          fallbackIframeSrc.includes('dub=true') ||
          fallbackIframeSrc.includes('dub=1') ||
          fallbackIframeSrc.includes('/dub') ||
          fallbackIframeSrc.includes('lan=eng')
        );
        record(
          Boolean(fallbackIsDub && fallbackIframeSrc !== dubIframeSrc),
          `Server switch remains strictly inside English DUB: ${fallbackIframeSrc?.slice(0, 60)}...`
        );
      }

      await page.close();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: Movie Hindi Dub (Avengers: Endgame TMDB 299534)
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`\n📌 Test 2: Avengers: Endgame — Hindi DUB Verification`);
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(`${BASE_URL}/en/watch/299534?type=movie`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);

      // Verify Hindi DUB button is present and enabled
      const hindiBtn = page.locator('button:has-text("Hindi")').first();
      const isHindiDisabled = await hindiBtn.getAttribute('disabled');
      record(isHindiDisabled === null, 'Avengers: Endgame: Hindi DUB button is verified and enabled');

      // Click Hindi DUB
      console.log('   Clicking Hindi DUB...');
      await hindiBtn.click();
      await page.waitForTimeout(2000);

      const hindiBtnClass = await hindiBtn.getAttribute('class');
      record(Boolean(hindiBtnClass && hindiBtnClass.includes('bg-blue-600')), 'Hindi DUB button becomes active');

      // Verify player iframe URL updated to Hindi source
      const hindiIframe = await page.locator('iframe').first().getAttribute('src');
      const isHindiUrl = hindiIframe && (
        hindiIframe.includes('autoembed.co') ||
        hindiIframe.includes('screenscape') ||
        hindiIframe.includes('lan=hi') ||
        hindiIframe.includes('dub=1')
      );
      record(Boolean(isHindiUrl), `Avengers: Endgame: Player routes to verified Hindi DUB source: ${hindiIframe?.slice(0, 60)}...`);

      // Verify Server list for Hindi DUB only contains Hindi-capable servers
      const hindiServerNames = await page.locator('div:has-text("Streaming Server") + div button span.truncate').allTextContents();
      const invalidHindiServers = hindiServerNames.filter(name =>
        name.includes('VidFast') || name.includes('2Embed')
      );
      record(
        invalidHindiServers.length === 0,
        `Hindi DUB hides servers without Hindi support (Found: ${hindiServerNames.join(', ')})`
      );

      await page.close();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: Language-Aware API Validation (/api/watch/[id]/languages & /source)
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`\n📌 Test 3: Language & Source API Contracts`);
    {
      // 1. Mushoku Tensei Language API check
      const langRes = await fetch(`${BASE_URL}/api/watch/94664/languages?type=anime&s=1&e=1&origLang=ja`);
      record(langRes.ok, `Language API returns 200 OK (Status: ${langRes.status})`);
      const langData = await langRes.json();
      record(Array.isArray(langData.tracks), 'Language API returns tracks array');

      const engTrack = langData.tracks.find(t => t.id === 'dub-en');
      record(Boolean(engTrack && engTrack.available === true), 'Mushoku Tensei: English DUB track marked available: true in API');

      // 2. Mushoku Tensei Source API check for dub-en
      const sourceRes = await fetch(`${BASE_URL}/api/watch/94664/source?type=anime&s=1&e=1&track=dub-en&origLang=ja`);
      record(sourceRes.ok, `Source API returns 200 OK for dub-en (Status: ${sourceRes.status})`);
      const sourceData = await sourceRes.json();
      record(sourceData.success === true, 'Source API returns success: true for English DUB');
      record(
        Boolean(sourceData.url && (sourceData.url.includes('dub=true') || sourceData.url.includes('/dub') || sourceData.url.includes('lan=eng'))),
        `Source API returns genuine English DUB URL: ${sourceData.url?.slice(0, 50)}...`
      );

      // 3. SUB source check
      const subSourceRes = await fetch(`${BASE_URL}/api/watch/94664/source?type=anime&s=1&e=1&track=sub&origLang=ja`);
      const subSourceData = await subSourceRes.json();
      record(subSourceData.success === true, 'Source API returns success: true for SUB');
      record(!subSourceData.url.includes('dub=true'), 'SUB source does NOT accidentally contain dub parameter');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: Mobile Responsive Sub/Dub Buttons & No Overflow
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`\n📌 Test 4: Mobile Viewport Audit for Sub/Dub Controls`);
    {
      for (const width of [375, 390, 412]) {
        const page = await browser.newPage({ viewport: { width, height: 844 } });
        await page.goto(`${BASE_URL}/en/watch/94664?type=anime&s=1&e=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        record(!hasHorizontalScroll, `[Viewport ${width}px] Zero horizontal scroll on watch page`);

        const subDubContainer = page.locator('div:has-text("Audio Track") + div').first();
        const isVisible = await subDubContainer.isVisible();
        record(isVisible, `[Viewport ${width}px] Audio Track picker is visible`);

        const containerBox = await subDubContainer.boundingBox();
        if (containerBox) {
          record(
            containerBox.x >= 0 && (containerBox.x + containerBox.width) <= width + 5,
            `[Viewport ${width}px] Audio Track deck fits within viewport (width: ${Math.round(containerBox.width)}px, vp: ${width}px)`
          );
        }

        await page.close();
      }
    }

  } catch (err) {
    console.error('Fatal error during test run:', err);
    record(false, `Test run crashed: ${err.message}`);
  } finally {
    await browser.close();
  }

  console.log(`\n============================================================`);
  console.log(`AUDIT RESULTS:`);
  console.log(`  TOTAL:  ${totalTests}`);
  console.log(`  PASSED: ${passedTests}`);
  console.log(`  FAILED: ${failedTests}`);
  console.log(`============================================================\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSubDubVerification();
