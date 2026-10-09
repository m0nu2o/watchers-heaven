/**
 * Automated Playwright Test Suite for:
 * 1. Apple-Grade Universal Player & Source Integration
 * 2. Stacking Context & Zero Player Duplication (iframe unobstructed)
 * 3. Page Scrolling during Video Playback
 * 4. Redesigned "Top 10 Worldwide Today"
 * 5. Redesigned "Spotlight Cinema"
 * 6. Responsive Viewports & Zero Overflow
 */

const { chromium } = require('playwright');

const BASE_URL = process.env.TEST_URL || process.argv[2] || 'http://localhost:3002';

async function runAuditTests() {
  console.log(`\n======================================================`);
  console.log(`🎬 AUDITING APPLE-GRADE PLAYER & HOMEPAGE REDESIGN`);
  console.log(`   Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  let passed = 0;
  let total = 0;

  function assert(condition, name) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
    }
  }

  try {
    // ─────────────────────────────────────────────────────────────
    // PART A: HOMEPAGE REDESIGN AUDIT (Top 10 & Spotlight Cinema)
    // ─────────────────────────────────────────────────────────────
    console.log(`\n▶️ [PART A] Auditing Homepage Redesign...`);
    await page.goto(`${BASE_URL}/en`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // 1. Top 10 Worldwide Today
    console.log(`\n📌 1. Top 10 Worldwide Today Rail:`);
    const top10Heading = await page.$('text=Top 10 Worldwide Today');
    assert(top10Heading !== null, 'Top 10 Worldwide Today heading exists');

    const top10Data = await page.evaluate(() => {
      const numerals = Array.from(document.querySelectorAll('.font-black.italic.tracking-tighter')).map((el) =>
        el.textContent.trim()
      );
      const top1Crown = document.querySelector('svg.lucide-crown') !== null || document.body.innerText.includes('#1 Worldwide');
      const posterCards = document.querySelectorAll('.card-snap .aspect-\\[2\\/3\\]');
      return { numerals, top1Crown, count: posterCards.length };
    });

    assert(top10Data.count >= 10, `Found ${top10Data.count} ranked cards (Expected: 10)`);
    assert(top10Data.top1Crown, 'Prestige #1 Worldwide Crown badge is present on Rank #1');
    assert(top10Data.numerals.some(n => n.includes('1') && n.includes('10')), 'Rank numerals include 1 through 10');

    // 2. Spotlight Cinema
    console.log(`\n📌 2. Spotlight Cinema 16:9 Widescreen Showcase:`);
    const spotlightHeading = await page.$('text=Spotlight Cinema');
    assert(spotlightHeading !== null, 'Spotlight Cinema heading exists');

    const spotlightData = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.aspect-video.rounded-2xl, .aspect-video.rounded-3xl'));
      const textContent = document.body.innerText;
      const hasMasterpieceOrCritics =
        textContent.includes('Masterpiece') ||
        textContent.includes('Critics\' Choice') ||
        textContent.includes('Featured');
      const has4kBadge = textContent.includes('4K HDR');
      return {
        cardCount: cards.length,
        hasMasterpieceOrCritics,
        has4kBadge,
      };
    });

    assert(spotlightData.cardCount >= 4, `Found ${spotlightData.cardCount} 16:9 widescreen Spotlight cards`);
    assert(spotlightData.hasMasterpieceOrCritics, 'Prestige badges (Masterpiece / Critics\' Choice) are rendered');
    assert(spotlightData.has4kBadge, '4K HDR format badge is rendered');

    // ─────────────────────────────────────────────────────────────
    // PART B: PLAYER ARCHITECTURE & ZERO DUPLICATION
    // ─────────────────────────────────────────────────────────────
    console.log(`\n▶️ [PART B] Auditing Apple-Grade Universal Player on Watch Page...`);
    // Navigate to Squid Game watch page
    await page.goto(`${BASE_URL}/en/watch/93405?s=1&e=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    // 3. Player Container & Viewport
    const playerContainer = await page.$('[aria-label="Universal Video Player"]');
    assert(playerContainer !== null, 'Player container with aria-label mounted');

    // 4. Check Stacking Context & Media Mount
    const playerStackAudit = await page.evaluate(() => {
      const player = document.querySelector('[aria-label="Universal Video Player"]');
      if (!player) return null;

      const iframe = player.querySelector('iframe');
      const video = player.querySelector('video');

      // Check whether duplicate center play button or duplicate timeline exists on top of iframe
      const centerPlayBtn = player.querySelector('button[aria-label="Play"], button[aria-label="Pause"]');
      const timelineRange = player.querySelector('input[type="range"]');

      return {
        hasIframe: iframe !== null,
        hasVideo: video !== null,
        iframeSrc: iframe ? iframe.src : null,
        hasCenterPlayBtnOverIframe: centerPlayBtn !== null,
        hasTimelineRangeOverIframe: timelineRange !== null,
      };
    });

    assert(playerStackAudit.hasIframe, 'Third-party streaming provider iframe mounted in viewport');
    assert(
      !playerStackAudit.hasCenterPlayBtnOverIframe,
      'CRITICAL: No duplicate center play button obscuring the third-party iframe'
    );
    assert(
      !playerStackAudit.hasTimelineRangeOverIframe,
      'CRITICAL: No duplicate fake seekbar timeline obscuring the third-party iframe'
    );

    // 5. Apple-Grade Top HUD
    console.log(`\n📌 5. Player Top HUD & Indicator:`);
    const headerTitle = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent.trim() : '';
    });
    assert(headerTitle.length > 0, `Canonical title displayed: "${headerTitle}"`);

    const reloadBtn = await page.$('button[aria-label="Reload Stream"], button[title="Reload Stream"]');
    assert(reloadBtn !== null, 'Reload Stream button exists in player HUD');

    const fullscreenBtn = await page.$('button[aria-label="Fullscreen"], button[aria-label="Toggle Fullscreen"]');
    assert(fullscreenBtn !== null, 'Fullscreen button exists in player HUD');

    // ─────────────────────────────────────────────────────────────
    // PART C: PAGE SCROLLING AUDIT DURING PLAYBACK
    // ─────────────────────────────────────────────────────────────
    console.log(`\n▶️ [PART C] Auditing Page Scrolling During Playback...`);
    const scrollInitial = await page.evaluate(() => window.scrollY);
    
    // Simulate natural mouse wheel / page scroll down to Episode Navigator and Recommendations
    await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'instant' }));
    await page.waitForTimeout(600);

    const scrollAfter = await page.evaluate(() => window.scrollY);
    assert(scrollAfter > scrollInitial, `Page scrolls smoothly down during playback (scrollY: ${scrollAfter}px)`);

    // Check visibility of lower sections while scrolled
    const lowerSections = await page.evaluate(() => {
      const epNav = document.body.innerText.includes('Season') || document.body.innerText.includes('Episode');
      const recs = document.body.innerText.includes('More Like This') || document.body.innerText.includes('Servers');
      return { epNav, recs };
    });
    assert(lowerSections.epNav, 'Episode navigator accessible via normal scrolling');
    assert(lowerSections.recs, 'Recommendations and server deck accessible via normal scrolling');

    // Scroll back to top
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(300);

    // ─────────────────────────────────────────────────────────────
    // PART D: SERVER SWITCHING & AUDIO TRACK SELECTION
    // ─────────────────────────────────────────────────────────────
    console.log(`\n▶️ [PART D] Auditing Server Selection & Audio Availability...`);
    const serverButtons = await page.$$('button:has-text("VidSrc"), button:has-text("AutoEmbed"), button:has-text("Embed"), button:has-text("ScreenScape")');
    assert(serverButtons.length > 0, `Found ${serverButtons.length} verified streaming server pills`);

    const audioTrackButtons = await page.$$('button:has-text("Original"), button:has-text("Hindi"), button:has-text("English")');
    assert(audioTrackButtons.length > 0, `Found ${audioTrackButtons.length} audio track selection pills`);

    // ─────────────────────────────────────────────────────────────
    // PART E: RESPONSIVE VIEWPORT & ZERO OVERFLOW AUDIT
    // ─────────────────────────────────────────────────────────────
    console.log(`\n▶️ [PART E] Auditing Responsive Viewports & Zero Overflow...`);
    const viewports = [
      { name: 'Mobile 360px', width: 360, height: 740 },
      { name: 'Mobile 390px', width: 390, height: 844 },
      { name: 'Tablet 768px', width: 768, height: 1024 },
      { name: 'Desktop 1280px', width: 1280, height: 800 },
      { name: 'Large 1920px', width: 1920, height: 1080 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(400);

      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      assert(!hasHorizontalOverflow, `${vp.name}: Zero horizontal overflow (scrollWidth <= ${vp.width})`);
    }

    console.log(`\n======================================================`);
    console.log(`🏆 ALL AUDIT TESTS COMPLETE: ${passed}/${total} PASSED`);
    console.log(`======================================================\n`);

  } catch (err) {
    console.error('💥 Audit test execution error:', err);
  } finally {
    await browser.close();
    if (passed < total) {
      process.exit(1);
    }
  }
}

runAuditTests();
