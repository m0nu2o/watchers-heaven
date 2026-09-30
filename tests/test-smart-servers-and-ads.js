const { chromium } = require('playwright');

const BASE_URL = process.argv[2] || 'http://localhost:3002';

async function testSmartServersAndAds() {
  console.log(`\n======================================================`);
  console.log(`🎯 TESTING SMART SERVER ISOLATION & SANDBOX-FREE AD SHIELD`);
  console.log(`   Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const testCases = [
    {
      category: 'Anime',
      name: 'Mushoku Tensei',
      url: `${BASE_URL}/en/watch/94664?type=tv&s=1&e=1`,
      expectedHeader: '🎌 Anime Servers',
      expectedMustContain: 'Anime',
      forbiddenServers: ['VidLink HD', 'VidSrc Ultra HD', 'AutoEmbed HD', 'ScreenScape HD'],
    },
    {
      category: 'Movie',
      name: 'Fight Club',
      url: `${BASE_URL}/en/watch/550`,
      expectedHeader: '🎬 Movie Servers',
      expectedMustContain: 'HD',
      forbiddenServers: ['Anime', 'VidLink Anime HD', 'ScreenScape Anime'],
    },
    {
      category: 'TV Series',
      name: 'Breaking Bad',
      url: `${BASE_URL}/en/watch/1396?type=tv&s=1&e=1`,
      expectedHeader: '📺 Series Servers',
      expectedMustContain: 'HD',
      forbiddenServers: ['VidLink Anime HD', 'ScreenScape Anime', 'VidSrc Ultra Anime'],
    },
  ];

  let allPassed = true;

  for (const tc of testCases) {
    console.log(`\n▶️ Checking Server Isolation for: [${tc.category}] "${tc.name}"`);
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    let popupCount = 0;
    page.on('popup', (popup) => {
      popupCount++;
      console.warn(`    ⚠️ Popup opened to: ${popup.url()}`);
      popup.close().catch(() => {});
    });

    try {
      await page.goto(tc.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      // 1. Inspect Server Section Header & Server List
      const serverDetails = await page.evaluate(() => {
        // Find server section title
        const spans = Array.from(document.querySelectorAll('span'));
        const headerSpan = spans.find(s => 
          s.textContent.includes('Anime Servers') || 
          s.textContent.includes('Series Servers') || 
          s.textContent.includes('Movie Servers')
        );

        // Find server buttons
        const allBtns = Array.from(document.querySelectorAll('button'));
        // The server buttons have server names or icons inside the switcher row
        const serverButtons = allBtns.filter(b => {
          const t = b.textContent;
          return t.includes('VidLink') || t.includes('VidSrc') || t.includes('AutoEmbed') || t.includes('ScreenScape') || t.includes('2Embed');
        }).map(b => b.textContent.trim());

        // Check if iframe has sandbox attribute
        const iframe = document.querySelector('iframe');
        const hasSandbox = iframe ? iframe.hasAttribute('sandbox') : false;
        const iframeSrc = iframe ? iframe.src : null;

        // Check Auto-Switch toggle button
        const autoSwitchBtn = allBtns.find(b => 
          b.textContent.includes('Auto-Switch') || 
          b.getAttribute('title')?.includes('Auto-Switch') ||
          b.getAttribute('aria-label')?.includes('Auto-Switch')
        );

        return {
          header: headerSpan ? headerSpan.textContent.trim() : null,
          serverNames: serverButtons,
          hasSandbox,
          iframeSrc,
          hasAutoSwitchBtn: Boolean(autoSwitchBtn),
          autoSwitchText: autoSwitchBtn ? autoSwitchBtn.textContent.trim() : null,
        };
      });

      console.log(`    Header Found: "${serverDetails.header}" (Expected: "${tc.expectedHeader}")`);
      console.log(`    Active Servers (${serverDetails.serverNames.length}):`, serverDetails.serverNames);
      console.log(`    Iframe has sandbox attribute? ${serverDetails.hasSandbox ? 'YES (FAIL - Breaks player)' : 'NO (PASSED)'}`);
      console.log(`    Auto-Switch Button Present? ${serverDetails.hasAutoSwitchBtn ? 'YES (PASSED)' : 'NO'}`);

      // Verify header matches
      if (serverDetails.header && serverDetails.header.includes(tc.expectedHeader.replace(/[^\w\s]/gi, '').trim())) {
        console.log(`    ✅ Correct server header displayed`);
      } else {
        console.error(`    ❌ Server header mismatch: expected ${tc.expectedHeader}, got ${serverDetails.header}`);
        allPassed = false;
      }

      // Verify no forbidden servers appear in the server list
      let forbiddenFound = false;
      for (const forbidden of tc.forbiddenServers) {
        const found = serverDetails.serverNames.some(name => name.toLowerCase().includes(forbidden.toLowerCase()));
        if (found) {
          console.error(`    ❌ Forbidden server "${forbidden}" found in ${tc.category} list!`);
          forbiddenFound = true;
          allPassed = false;
        }
      }
      if (!forbiddenFound) {
        console.log(`    ✅ Server isolation verified: Zero forbidden servers found.`);
      }

      // Verify sandbox attribute is NOT present
      if (serverDetails.hasSandbox) {
        console.error(`    ❌ Sandbox attribute detected on iframe! Must NOT use sandbox.`);
        allPassed = false;
      } else {
        console.log(`    ✅ Clean sandbox-free iframe rendering verified.`);
      }

      // 2. Test ad shield: Try window.open programmatically
      const adBlocked = await page.evaluate(() => {
        const res = window.open('https://popads.net/malicious-redirect', '_blank');
        return res === null;
      });
      console.log(`    🛡️ window.open popup block test: ${adBlocked ? 'BLOCKED (PASSED)' : 'ALLOWED (FAIL)'}`);
      if (!adBlocked) {
        allPassed = false;
      }

    } catch (err) {
      console.error(`    ❌ Error during test:`, err.message);
      allPassed = false;
    } finally {
      await context.close();
    }
  }

  await browser.close();

  console.log(`\n======================================================`);
  if (allPassed) {
    console.log(`🎉 ALL TESTS PASSED! Strict server isolation & sandbox-free shield confirmed.`);
  } else {
    console.log(`⚠️ SOME TESTS FAILED! Check logs above.`);
  }
  console.log(`======================================================\n`);
  process.exit(allPassed ? 0 : 1);
}

testSmartServersAndAds().catch((e) => {
  console.error(e);
  process.exit(1);
});
