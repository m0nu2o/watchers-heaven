const { chromium } = require('playwright');
const path = require('path');

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'iphone-se-375', width: 375, height: 812 },
    { name: 'iphone-14-390', width: 390, height: 844 },
    { name: 'desktop-1280', width: 1280, height: 800 },
  ];

  const urls = [
    { name: 'anime-watch', url: 'https://watchers-heaven-lime.vercel.app/en/watch/94664?type=tv&s=1&e=1' },
    { name: 'movie-watch', url: 'https://watchers-heaven-lime.vercel.app/en/watch/550' },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    });
    const page = await context.newPage();

    for (const item of urls) {
      console.log(`Capturing ${item.name} at ${vp.name}...`);
      await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(2500);

      const filePath = path.join(__dirname, '..', `tests_shot_${item.name}_${vp.name}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`Saved screenshot to ${filePath}`);
    }

    await context.close();
  }

  await browser.close();
  console.log('Finished capturing all screenshots!');
}

captureScreenshots().catch(console.error);
