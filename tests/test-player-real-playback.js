const { chromium } = require('playwright');

const BASE_URL = process.argv[2] || 'http://localhost:3002';

async function testRealPlayback() {
  console.log(`\n======================================================`);
  console.log(`🎬 TESTING REAL PLAYBACK ACROSS ALL MEDIA TYPES`);
  console.log(`   Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const testCases = [
    { type: 'Hollywood Movie', name: 'Fight Club', url: `${BASE_URL}/en/watch/550` },
    { type: 'Bollywood Movie', name: 'RRR', url: `${BASE_URL}/en/watch/579974` },
    { type: 'TV Series', name: 'Breaking Bad', url: `${BASE_URL}/en/watch/1396?type=tv&s=1&e=1` },
    { type: 'K-Drama', name: 'Squid Game', url: `${BASE_URL}/en/watch/93405?type=tv&s=1&e=1` },
    { type: 'C-Drama', name: 'The Untamed', url: `${BASE_URL}/en/watch/91363?type=tv&s=1&e=1` },
    { type: 'Anime', name: 'Mushoku Tensei (Jobless Reincarnation)', url: `${BASE_URL}/en/watch/94664?type=tv&s=1&e=1` },
    { type: 'Anime', name: 'Demon Slayer', url: `${BASE_URL}/en/watch/85937?type=tv&s=1&e=1` },
  ];

  for (const tc of testCases) {
    console.log(`\n▶️ Testing ${tc.type}: "${tc.name}"`);
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    let popupOpened = false;
    page.on('popup', (popup) => {
      popupOpened = true;
      console.warn(`    ⚠️ Popup opened to: ${popup.url()}`);
      popup.close().catch(() => {});
    });

    try {
      await page.goto(tc.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(3000);

      // Check iframe or video element
      const playerInfo = await page.evaluate(() => {
        const iframe = document.querySelector('iframe');
        const video = document.querySelector('video');
        const err = document.querySelector('.bg-\\[\\#0b0f17\\]'); // error card

        return {
          hasIframe: Boolean(iframe),
          iframeSrc: iframe ? iframe.src : null,
          hasVideo: Boolean(video),
          videoSrc: video ? video.src : null,
          errorMessage: err ? err.textContent : null,
        };
      });

      console.log(`    Player: hasIframe=${playerInfo.hasIframe}, hasVideo=${playerInfo.hasVideo}`);
      if (playerInfo.iframeSrc) console.log(`    Iframe src: ${playerInfo.iframeSrc}`);
      if (playerInfo.errorMessage) console.log(`    Error: ${playerInfo.errorMessage}`);
      console.log(`    Popup/Ad attempt detected: ${popupOpened ? 'YES (BLOCKED)' : 'NO'}`);

      // Now test Audio Buttons if present
      const audioButtons = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button')).filter(b => 
          b.textContent.includes('Original') || 
          b.textContent.includes('SUB') || 
          b.textContent.includes('ENG') || 
          b.textContent.includes('HIN') || 
          b.textContent.includes('English') || 
          b.textContent.includes('Hindi')
        );
        return btns.map(b => ({
          text: b.textContent.trim(),
          disabled: b.disabled,
        }));
      });

      console.log(`    Audio tracks rendered:`, audioButtons);

      // Test clicking English DUB or Hindi DUB if available
      for (const btn of audioButtons) {
        if (!btn.disabled && (btn.text.includes('ENG') || btn.text.includes('HIN') || btn.text.includes('English') || btn.text.includes('Hindi'))) {
          console.log(`    🖱️ Clicking audio track: "${btn.text}"`);
          const trackBtn = page.locator(`button:has-text("${btn.text.slice(0, 5)}")`).first();
          if ((await trackBtn.count()) > 0) {
            await trackBtn.click();
            await page.waitForTimeout(2000);

            const newSrc = await page.evaluate(() => {
              const iframe = document.querySelector('iframe');
              return iframe ? iframe.src : null;
            });
            console.log(`    -> Resolved new stream URL: ${newSrc}`);
          }
        }
      }

    } catch (e) {
      console.error(`    ❌ Test error on ${tc.name}:`, e.message);
    } finally {
      await context.close();
    }
  }

  await browser.close();
  console.log(`\n======================================================`);
  console.log(`Playback verification complete.`);
  console.log(`======================================================\n`);
}

testRealPlayback().catch(console.error);
