const { chromium } = require('playwright');

async function verifyUserFixes(baseUrl) {
  console.log(`\n============================================================`);
  console.log(`🔍 VERIFYING USER ISSUES FIX ON: ${baseUrl}`);
  console.log(`============================================================\n`);

  const browser = await chromium.launch();
  let passed = 0;
  let failed = 0;

  function record(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.log(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // Test 1: Side Space / Horizontal Scroll Audit across 3 mobile viewports
    // ─────────────────────────────────────────────────────────────────────────
    const viewports = [
      { name: 'iPhone SE (375x812)', width: 375, height: 812 },
      { name: 'iPhone 14 (390x844)', width: 390, height: 844 },
      { name: 'Galaxy S21 (412x915)', width: 412, height: 915 },
    ];

    for (const vp of viewports) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.goto(`${baseUrl}/en/watch/550?type=movie`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(2000);

      const overflowMetrics = await page.evaluate((width) => {
        const docScrollWidth = document.documentElement.scrollWidth;
        const bodyScrollWidth = document.body.scrollWidth;
        const innerWidth = window.innerWidth;

        const overflowingElements = [];
        document.querySelectorAll('*').forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.right > width + 1) {
            overflowingElements.push({
              tag: el.tagName,
              className: (el.className || '').toString().slice(0, 40),
              right: Math.round(rect.right),
              text: (el.innerText || '').slice(0, 30).replace(/\n/g, ' ')
            });
          }
        });

        return {
          docScrollWidth,
          bodyScrollWidth,
          innerWidth,
          overflowCount: overflowingElements.length,
          overflowingElements
        };
      }, vp.width);

      record(
        overflowMetrics.docScrollWidth <= vp.width && overflowMetrics.bodyScrollWidth <= vp.width,
        `[${vp.name}] Zero side space/gap (scrollWidth: ${overflowMetrics.docScrollWidth}px <= viewport: ${vp.width}px)`
      );
      record(
        overflowMetrics.overflowCount === 0,
        `[${vp.name}] Exactly 0 overflowing DOM elements (Found: ${overflowMetrics.overflowCount})`
      );

      // ───────────────────────────────────────────────────────────────────────
      // Test 2: Audio section box containment audit
      // ───────────────────────────────────────────────────────────────────────
      const audioBoxContainment = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.apple-glass.rounded-2xl'));
        const underPlayerCard = cards[0];
        if (!underPlayerCard) return { foundCard: false };

        const cardRect = underPlayerCard.getBoundingClientRect();
        const audioButtons = Array.from(underPlayerCard.querySelectorAll('button')).filter((b) =>
          b.textContent.includes('Original') ||
          b.textContent.includes('SUB') ||
          b.textContent.includes('DUB') ||
          b.textContent.includes('English') ||
          b.textContent.includes('Hindi')
        );

        const buttonResults = audioButtons.map((btn) => {
          const r = btn.getBoundingClientRect();
          return {
            text: btn.textContent.trim(),
            btnLeft: Math.round(r.left),
            btnRight: Math.round(r.right),
            cardLeft: Math.round(cardRect.left),
            cardRight: Math.round(cardRect.right),
            isContained: r.right <= cardRect.right + 2 && r.left >= cardRect.left - 2
          };
        });

        return {
          foundCard: true,
          buttonCount: audioButtons.length,
          allContained: buttonResults.every((b) => b.isContained),
          buttonResults
        };
      });

      record(
        audioBoxContainment.foundCard && audioBoxContainment.allContained,
        `[${vp.name}] All ${audioBoxContainment.buttonCount} audio track buttons are 100% inside container card`
      );

      await page.close();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 3: "Server Not Loading? Switch Server" Manual Fallback Button
    // ─────────────────────────────────────────────────────────────────────────
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(`${baseUrl}/en/watch/550?type=movie`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(2000);

      const switchBtn = page.locator('button:has-text("Switch Server")').first();
      const isSwitchBtnVisible = await switchBtn.isVisible();
      record(isSwitchBtnVisible, 'Instant "Server Not Loading? Switch Server" button is rendered');

      const initialSrc = await page.locator('iframe').first().getAttribute('src');
      record(Boolean(initialSrc && initialSrc.startsWith('http')), `Initial streaming provider active (${initialSrc?.slice(0, 30)}...)`);

      if (isSwitchBtnVisible) {
        await switchBtn.click();
        await page.waitForTimeout(1000);

        const nextSrc = await page.locator('iframe').first().getAttribute('src');
        record(
          Boolean(nextSrc && nextSrc !== initialSrc),
          `Switch Server button cycles instantly to next server (${nextSrc?.slice(0, 30)}...)`
        );
      }

      await page.close();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 4: Dedicated Auto-Switch Toggle & Error Fallback Verification
    // ─────────────────────────────────────────────────────────────────────────
    {
      console.log('\n⏳ Testing Dedicated Auto Server Switching Toggle & Fallback...');
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(`${baseUrl}/en/watch/550?type=movie`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(1500);

      // Verify dedicated Auto-Switch button exists
      const autoSwitchBtn = page.locator('button:has-text("Auto-Switch")').first();
      const isAutoSwitchVisible = await autoSwitchBtn.isVisible();
      record(isAutoSwitchVisible, 'Dedicated Auto-Switch button is rendered and visible');

      // Verify default ON state
      const initialText = await autoSwitchBtn.textContent();
      record(Boolean(initialText && initialText.includes('ON')), `Auto-Switch button defaults to ON (${initialText?.trim()})`);

      // Toggle to OFF
      await autoSwitchBtn.click();
      await page.waitForTimeout(500);
      const offText = await autoSwitchBtn.textContent();
      record(Boolean(offText && offText.includes('OFF')), `Auto-Switch button toggles cleanly to OFF (${offText?.trim()})`);

      // Toggle back to ON
      await autoSwitchBtn.click();
      await page.waitForTimeout(500);
      const onAgainText = await autoSwitchBtn.textContent();
      record(Boolean(onAgainText && onAgainText.includes('ON')), `Auto-Switch button toggles back to ON (${onAgainText?.trim()})`);

      // Verify error-triggered auto-fallback
      const startSrc = await page.locator('iframe').first().getAttribute('src');
      await page.evaluate(() => {
        window.postMessage({ type: 'PLAYER_ERROR', event: 'error' }, '*');
      });
      await page.waitForTimeout(1500);

      const afterErrorSrc = await page.locator('iframe').first().getAttribute('src');
      record(
        Boolean(afterErrorSrc && afterErrorSrc !== startSrc),
        `Playback error triggers automatic fallback to next server (From: ${startSrc?.slice(0, 25)}... To: ${afterErrorSrc?.slice(0, 25)}...)`
      );

      await page.close();
    }

  } catch (err) {
    console.error('Test runner encountered error:', err);
  } finally {
    await browser.close();
  }

  console.log(`\n============================================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`============================================================\n`);

  if (failed > 0) process.exit(1);
}

const targetUrl = process.argv[2] || 'http://localhost:3002';
verifyUserFixes(targetUrl);
