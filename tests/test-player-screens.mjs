import { chromium } from 'playwright';

async function testPlayerScreens() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  console.log('Testing movie watch page...');
  await page.goto('http://localhost:3002/en/watch/550?type=movie', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // 1. Nova screenshot
  await page.screenshot({ path: 'C:/Users/91951/.gemini/antigravity/brain/b4323427-bc69-4e66-97d9-b7ea70bca18e/scratch/test-server-nova.png' });

  // 2. VidLink
  console.log('Testing VidLink...');
  const vidlinkBtn = page.locator('button[data-server-id="vidlink"]');
  if (await vidlinkBtn.count() > 0) {
    await vidlinkBtn.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'C:/Users/91951/.gemini/antigravity/brain/b4323427-bc69-4e66-97d9-b7ea70bca18e/scratch/test-server-vidlink.png' });
  }

  // 3. VidSrc SU
  console.log('Testing VidSrc SU...');
  const vidsrcSuBtn = page.locator('button[data-server-id="vidsrc-su"]');
  if (await vidsrcSuBtn.count() > 0) {
    await vidsrcSuBtn.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'C:/Users/91951/.gemini/antigravity/brain/b4323427-bc69-4e66-97d9-b7ea70bca18e/scratch/test-server-vidsrc-su.png' });
  }

  // 4. VidSrc PM (Global)
  console.log('Testing VidSrc PM...');
  const vidsrcPmBtn = page.locator('button[data-server-id="vidsrc-pm"]');
  if (await vidsrcPmBtn.count() > 0) {
    await vidsrcPmBtn.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'C:/Users/91951/.gemini/antigravity/brain/b4323427-bc69-4e66-97d9-b7ea70bca18e/scratch/test-server-vidsrc-pm.png' });
  }

  // 5. ScreenScape India
  console.log('Testing ScreenScape...');
  const screenscapeBtn = page.locator('button[data-server-id="screenscape"]');
  if (await screenscapeBtn.count() > 0) {
    await screenscapeBtn.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'C:/Users/91951/.gemini/antigravity/brain/b4323427-bc69-4e66-97d9-b7ea70bca18e/scratch/test-server-screenscape.png' });
  }

  // 6. NextGen Anime
  console.log('Testing Anime NextGen...');
  await page.goto('http://localhost:3002/en/watch/85937?type=anime', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'C:/Users/91951/.gemini/antigravity/brain/b4323427-bc69-4e66-97d9-b7ea70bca18e/scratch/test-server-anime-nextgen.png' });

  await browser.close();
  console.log('Done testing all server screens!');
}

testPlayerScreens().catch(console.error);
