const { chromium } = require('playwright');

async function snap() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3002/en', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Scroll the rail to the end
  await page.evaluate(() => {
    const rail = document.querySelector('.horizontal-rail');
    if (rail) rail.scrollLeft = rail.scrollWidth;
  });
  await page.waitForTimeout(800);

  const top10Section = await page.$('.horizontal-rail');
  if (top10Section) {
    await top10Section.screenshot({ path: 'tests/top10-end-scroll.png' });
    console.log('Saved screenshot to tests/top10-end-scroll.png');
  }
  await browser.close();
}

snap();
