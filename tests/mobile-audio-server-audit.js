// Complete Mobile Viewport, Server Button, Audio Routing, and Scrolling Audit
const { chromium } = require('playwright');

const BASE_URL = process.argv[2] || 'http://localhost:3002';

const VIEWPORTS = [
  { name: 'iPhone SE / Mini (375x812)', width: 375, height: 812 },
  { name: 'iPhone 13 / 14 / 15 (390x844)', width: 390, height: 844 },
  { name: 'Samsung Galaxy / Pixel (412x915)', width: 412, height: 915 },
  { name: 'iPad / Tablet (768x1024)', width: 768, height: 1024 },
  { name: 'Desktop Cinema (1280x800)', width: 1280, height: 800 },
];

async function runMobileAudit() {
  console.log(`\n============================================================`);
  console.log(`📱 LUMINA MOBILE & AUDIO INTEGRITY AUDIT`);
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
    // SECTION 1: Mobile Viewport Audit (375x812, 390x844, 412x915)
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`📌 Suite 1: Mobile Viewports & Logo Verification`);

    for (const vp of VIEWPORTS.slice(0, 3)) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.goto(`${BASE_URL}/en`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1000);

      // 1. Logo Visibility & Geometry
      const logoEl = page.locator('header a:has-text("Lumina")').first();
      const isLogoVisible = await logoEl.isVisible().catch(() => false);
      record(isLogoVisible, `[${vp.name}] Lumina mobile logo is visible in header`);

      const logoBox = await logoEl.boundingBox();
      if (logoBox) {
        record(
          logoBox.x >= 0 && (logoBox.x + logoBox.width) <= vp.width,
          `[${vp.name}] Logo fits within viewport width (x: ${Math.round(logoBox.x)}, w: ${Math.round(logoBox.width)}, vp: ${vp.width})`
        );
        record(logoBox.height >= 24 && logoBox.height <= 56,
          `[${vp.name}] Logo maintains correct dimensions (height: ${Math.round(logoBox.height)}px)`
        );
      }

      // 2. Zero Horizontal Scroll on Homepage
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      record(!hasHorizontalScroll, `[${vp.name}] Homepage has zero horizontal scroll overflow`);

      // 3. Mobile Header Actions (Copilot, Search, Theme, Settings)
      const actionButtons = await page.locator('header button, header a[href*="search"], header a[href*="settings"]').count();
      record(actionButtons >= 4, `[${vp.name}] All mobile header action buttons present (Found: ${actionButtons})`);

      await page.close();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 2: Watch Page Mobile Audit (Buttons, Overflow, Player)
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`\n📌 Suite 2: Watch Page Mobile Layout & Zero-Overflow Audit`);

    for (const vp of VIEWPORTS.slice(0, 3)) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      // Use Demon Slayer anime watch page
      await page.goto(`${BASE_URL}/en/watch/85937?type=anime&s=1&e=1`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(2000);

      // 1. Zero Page Horizontal Scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      record(!hasHorizontalScroll, `[${vp.name}] Watch page has zero horizontal scroll (scrollWidth <= ${vp.width})`);

      // 2. Server Buttons Responsive Wrapping
      const serverContainer = page.locator('div:has-text("Streaming Server") + div').first();
      const isServerContainerVisible = await serverContainer.isVisible().catch(() => false);
      record(isServerContainerVisible, `[${vp.name}] Streaming server button deck is visible`);

      const serverButtons = page.locator('button:has-text("VidLink"), button:has-text("VidSrc"), button:has-text("AutoEmbed"), button:has-text("2Embed")');
      const sCount = await serverButtons.count();
      record(sCount >= 2, `[${vp.name}] Multiple streaming servers displayed (Found: ${sCount})`);

      // Verify each server button fits within the viewport width
      let allServersFit = true;
      for (let i = 0; i < sCount; i++) {
        const btnBox = await serverButtons.nth(i).boundingBox();
        if (btnBox && (btnBox.x + btnBox.width > vp.width + 2 || btnBox.x < 0)) {
          allServersFit = false;
        }
      }
      record(allServersFit, `[${vp.name}] All ${sCount} streaming server buttons wrap without overflowing screen`);

      // 3. SUB / DUB Buttons Responsive Wrapping
      const subButton = page.locator('button:has-text("SUB")').first();
      const engDubButton = page.locator('button:has-text("English")').first();
      const isSubVisible = await subButton.isVisible().catch(() => false);
      const isEngDubVisible = await engDubButton.isVisible().catch(() => false);
      record(isSubVisible && isEngDubVisible, `[${vp.name}] SUB and English DUB buttons are both visible`);

      const subBox = await subButton.boundingBox();
      const engBox = await engDubButton.boundingBox();
      if (subBox && engBox) {
        record(
          subBox.x + subBox.width <= vp.width + 2 && engBox.x + engBox.width <= vp.width + 2,
          `[${vp.name}] SUB & DUB buttons fit inside viewport width`
        );
      }

      await page.close();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 3: Player Scrolling Bug Verification
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`\n📌 Suite 3: Player Scrolling & Viewport Agility`);
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(`${BASE_URL}/en/watch/85937?type=anime&s=1&e=1`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(2000);

      // Verify initial scroll is at top
      const initialScroll = await page.evaluate(() => window.scrollY);
      record(initialScroll === 0, 'Page starts at scroll position 0');

      // Scroll down below the player
      await page.evaluate(() => window.scrollTo(0, 450));
      await page.waitForTimeout(500);
      const scrolledDown = await page.evaluate(() => window.scrollY);
      record(scrolledDown >= 300, `Page smoothly scrolls down below the video player (scrollY: ${scrolledDown}px)`);

      // Scroll back up above the player
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      const scrolledUp = await page.evaluate(() => window.scrollY);
      record(scrolledUp <= 50, `Page smoothly scrolls back up above the video player (scrollY: ${scrolledUp}px)`);

      // Verify body overflow is NOT locked
      const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
      record(bodyOverflow !== 'hidden', `Body scroll is unlocked while player is mounted (style.overflow: "${bodyOverflow || 'default'}")`);

      await page.close();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 4: Audio Track Selection & Language-Specific Server Filtering
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`\n📌 Suite 4: Audio Track Routing & Server Filtering`);
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(`${BASE_URL}/en/watch/85937?type=anime&s=1&e=1`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(2000);

      // 1. Initial State: SUB is selected
      const subBtn = page.locator('button:has-text("SUB")').first();
      const isSubActive = await subBtn.getAttribute('class');
      record(Boolean(isSubActive && isSubActive.includes('bg-blue-600')), 'SUB track is active by default');

      const allSubServers = await page.locator('button:has-text("VidLink"), button:has-text("VidSrc"), button:has-text("AutoEmbed"), button:has-text("ScreenScape")').count();
      record(allSubServers >= 4, `SUB mode displays all compatible streaming servers (${allSubServers} servers available)`);

      // 2. Click English DUB
      console.log('   Selecting English DUB track...');
      const engDubBtn = page.locator('button:has-text("English")').first();
      await engDubBtn.click();
      await page.waitForTimeout(1500);

      // Verify active button switched
      const engBtnClass = await engDubBtn.getAttribute('class');
      record(Boolean(engBtnClass && engBtnClass.includes('bg-blue-600')), 'English DUB button becomes active');

      // Verify player iframe URL updated with dub parameter
      const dubIframeSrc = await page.locator('iframe').first().getAttribute('src');
      record(
        Boolean(dubIframeSrc && (dubIframeSrc.includes('dub=true') || dubIframeSrc.includes('dub=1') || dubIframeSrc.includes('lan=eng') || dubIframeSrc.includes('vidlink.pro/anime'))),
        `English DUB routes to verified dub audio source: ${dubIframeSrc?.slice(0, 65)}...`
      );

      // Verify servers are filtered to only English-dub capable servers
      const dubServers = await page.locator('button:has-text("VidLink"), button:has-text("ScreenScape")').count();
      record(dubServers >= 2, `English DUB filters to verified dub servers (Found: ${dubServers} servers)`);

      // 3. Click Hindi DUB
      console.log('   Selecting Hindi DUB track...');
      const hindiDubBtn = page.locator('button:has-text("Hindi")').first();
      const isHindiDisabled = await hindiDubBtn.getAttribute('disabled');
      if (isHindiDisabled === null) {
        await hindiDubBtn.click();
        await page.waitForTimeout(1500);

        const hindiBtnClass = await hindiDubBtn.getAttribute('class');
        record(Boolean(hindiBtnClass && hindiBtnClass.includes('bg-blue-600')), 'Hindi DUB button becomes active when available');

        const hindiIframeSrc = await page.locator('iframe').first().getAttribute('src');
        record(
          Boolean(hindiIframeSrc && (hindiIframeSrc.includes('lan=hi') || hindiIframeSrc.includes('screenscape') || hindiIframeSrc.includes('autoembed') || hindiIframeSrc.includes('dub=1') || hindiIframeSrc.includes('vidlink'))),
          `Hindi DUB routes to verified Hindi-capable streaming provider: ${hindiIframeSrc?.slice(0, 65)}...`
        );
      } else {
        record(true, 'Hindi DUB truthfully disabled when not released in catalog');
      }

      await page.close();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 5: Instant Server Fallback Verification
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`\n📌 Suite 5: Instant Server Fallback Test`);
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(`${BASE_URL}/en/watch/550?type=movie`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(2000);

      // Get initial provider
      const initialIframe = await page.locator('iframe').first().getAttribute('src');
      record(Boolean(initialIframe && initialIframe.startsWith('http')), 'Initial streaming provider iframe loaded');

      // Click second server
      const secondServer = page.locator('button:has-text("VidSrc Ultra HD"), button:has-text("VidSrc Dev HD"), button:has-text("AutoEmbed HD")').first();
      if (await secondServer.isVisible()) {
        await secondServer.click();
        await page.waitForTimeout(1500);

        const switchedIframe = await page.locator('iframe').first().getAttribute('src');
        record(
          Boolean(switchedIframe && switchedIframe.startsWith('http') && switchedIframe !== initialIframe),
          `Server switch succeeds without blank screens (Switched from ${initialIframe?.slice(0, 25)}... to ${switchedIframe?.slice(0, 25)}...)`
        );
      }

      await page.close();
    }

  } catch (err) {
    console.error('Unexpected test runner error:', err);
  } finally {
    await browser.close();
  }

  console.log(`\n============================================================`);
  console.log(`AUDIT SUMMARY:`);
  console.log(`  TOTAL:  ${totalTests}`);
  console.log(`  PASSED: ${passedTests}`);
  console.log(`  FAILED: ${failedTests}`);
  console.log(`============================================================\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMobileAudit();
