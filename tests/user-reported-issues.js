const { chromium } = require('playwright');

const BASE_URL = process.argv[2] || 'http://localhost:3002';

async function testUserIssues() {
  console.log(`\n======================================================`);
  console.log(`🔍 INVESTIGATING USER ISSUES AGAINST: ${BASE_URL}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const viewports = [
    { name: 'iPhone SE (375x812)', width: 375, height: 812 },
    { name: 'iPhone 14 / 15 (390x844)', width: 390, height: 844 },
    { name: 'Pixel 7 (412x915)', width: 412, height: 915 },
    { name: 'Desktop (1280x800)', width: 1280, height: 800 },
  ];

  const testUrls = [
    { name: 'Anime (Solo Leveling)', url: `${BASE_URL}/en/watch/94664?type=tv&s=1&e=1` },
    { name: 'Movie (Fight Club)', url: `${BASE_URL}/en/watch/550` },
  ];

  let passed = 0;
  let failed = 0;

  function report(ok, title, details = '') {
    if (ok) {
      passed++;
      console.log(`  ✅ [PASS] ${title}`);
    } else {
      failed++;
      console.error(`  ❌ [FAIL] ${title} -> ${details}`);
    }
  }

  for (const vp of viewports) {
    console.log(`\n📱 VIEWPORT: ${vp.name}`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    });
    const page = await context.newPage();

    for (const target of testUrls) {
      console.log(`  🌐 Loading ${target.name}: ${target.url}`);
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1500);

      // 1. Check Horizontal Overflow (Space in the side)
      const overflowInfo = await page.evaluate(() => {
        const docW = document.documentElement.clientWidth;
        const scrollW = document.documentElement.scrollWidth;
        const bodyScrollW = document.body.scrollWidth;
        const windowW = window.innerWidth;

        // Find elements that stick out beyond clientWidth
        const overflowingEls = [];
        const all = document.querySelectorAll('*');
        for (const el of all) {
          const rect = el.getBoundingClientRect();
          if (rect.right > docW + 1) {
            overflowingEls.push({
              tag: el.tagName,
              className: (el.className || '').toString().slice(0, 50),
              right: rect.right,
              width: rect.width,
              docW,
            });
          }
        }

        return {
          docW,
          scrollW,
          bodyScrollW,
          windowW,
          hasOverflow: scrollW > docW || bodyScrollW > docW,
          overflowCount: overflowingEls.length,
          sampleOverflows: overflowingEls.slice(0, 3),
        };
      });

      report(
        !overflowInfo.hasOverflow,
        `No horizontal overflow on ${vp.name} (${target.name})`,
        overflowInfo.hasOverflow ? `scrollW=${overflowInfo.scrollW}, clientW=${overflowInfo.docW}, items=${JSON.stringify(overflowInfo.sampleOverflows)}` : ''
      );

      // 2. Check Audio Section Box Container Bounds
      const audioDeckInfo = await page.evaluate(() => {
        // Look for audio track buttons container
        const audioHeading = Array.from(document.querySelectorAll('span')).find(s => s.textContent.trim().toUpperCase() === 'AUDIO TRACK');
        if (!audioHeading) return { found: false };

        const deck = audioHeading.closest('.apple-glass');
        const container = audioHeading.parentElement?.parentElement;
        const buttons = container ? Array.from(container.querySelectorAll('button')) : [];

        const deckRect = deck ? deck.getBoundingClientRect() : null;
        let anyButtonOutside = false;
        let outsideDetails = null;

        for (const btn of buttons) {
          const r = btn.getBoundingClientRect();
          if (deckRect && (r.right > deckRect.right + 2 || r.left < deckRect.left - 2)) {
            anyButtonOutside = true;
            outsideDetails = { btnRight: r.right, deckRight: deckRect.right, text: btn.textContent };
            break;
          }
        }

        return {
          found: true,
          buttonCount: buttons.length,
          anyButtonOutside,
          outsideDetails,
        };
      });

      if (audioDeckInfo.found) {
        report(
          !audioDeckInfo.anyButtonOutside,
          `Audio section stays strictly inside container on ${vp.name} (${target.name})`,
          audioDeckInfo.anyButtonOutside ? JSON.stringify(audioDeckInfo.outsideDetails) : `(${audioDeckInfo.buttonCount} buttons fit inside deck)`
        );
      } else {
        console.log(`    ℹ️ Audio section heading not found or still loading`);
      }

      // 3. Check Auto-Switch Toggle Button
      const autoSwitchBtn = await page.locator('button:has-text("Auto-Switch")').first();
      const hasAutoSwitch = (await autoSwitchBtn.count()) > 0;
      report(hasAutoSwitch, `Dedicated Auto-Switch button rendered on ${vp.name} (${target.name})`);

      if (hasAutoSwitch) {
        const textBefore = await autoSwitchBtn.textContent();
        await autoSwitchBtn.click();
        await page.waitForTimeout(300);
        const textAfter = await autoSwitchBtn.textContent();
        const toggled = textBefore !== textAfter;
        report(toggled, `Auto-Switch button toggles state on click: "${textBefore.trim()}" -> "${textAfter.trim()}"`);
        // Click back to preserve initial
        await autoSwitchBtn.click();
      }

      // 4. Check for dead vidsrc.dev requests
      const deadDomainUsed = await page.evaluate(() => {
        const iframes = Array.from(document.querySelectorAll('iframe'));
        return iframes.map(i => i.src).filter(src => src.includes('vidsrc.dev'));
      });
      report(deadDomainUsed.length === 0, `No dead "vidsrc.dev" iframe loaded (${target.name})`, deadDomainUsed.join(', '));
    }

    await context.close();
  }

  console.log(`\n======================================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  await browser.close();
}

testUserIssues().catch(console.error);
