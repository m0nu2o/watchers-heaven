import { chromium } from 'playwright';

const BASE_URL = process.env.TARGET_URL || 'http://localhost:3002';

async function verifyAllServers() {
  console.log(`========================================================================`);
  console.log(`   VERIFYING SANDBOX ON ALL STREAMING SERVERS IN LUMINA`);
  console.log(`   Target: ${BASE_URL}`);
  console.log(`========================================================================\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // 1. Check Movie Watch Page (Hollywood & Bollywood servers)
  console.log('1. Checking Movie Watch Page (ID: 550)...');
  await page.goto(`${BASE_URL}/en/watch/550?type=movie`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iframe', { timeout: 20000 });
  await page.waitForTimeout(3000);

  // Get all server buttons rendered in the Lumina Server Deck
  const serverButtons = page.locator('button[data-server-id]');
  const serverCount = await serverButtons.count();
  console.log(`Found ${serverCount} server options on Movie watch page`);

  const serversTested = [];

  for (let i = 0; i < serverCount; i++) {
    const btn = serverButtons.nth(i);
    const serverName = (await btn.innerText()).replace(/\n/g, ' ').trim();
    await btn.click();
    await page.waitForTimeout(2500);

    const iframe = page.locator('iframe').first();
    const src = await iframe.getAttribute('src');
    const sandbox = await iframe.getAttribute('sandbox');

    // Check for sandbox error popup text
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasSandboxError = bodyText.toLowerCase().includes('disable sandbox') || bodyText.toLowerCase().includes('restricted embed');

    serversTested.push({ serverName, src: src?.slice(0, 45), sandbox: Boolean(sandbox), hasSandboxError });
    console.log(`  [Server ${i + 1}: ${serverName}] Sandbox set: ${Boolean(sandbox)} | Sandbox Error: ${hasSandboxError} | Src: ${src?.slice(0, 45)}...`);
  }

  // 2. Check Anime Watch Page (NextGen Anime & Anime Ultra servers)
  console.log('\n2. Checking Anime Watch Page (ID: 85937)...');
  await page.goto(`${BASE_URL}/en/watch/85937?s=1&e=1&type=anime`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('iframe', { timeout: 20000 });
  await page.waitForTimeout(3000);

  const animeServerButtons = page.locator('button[data-server-id]');
  const animeServerCount = await animeServerButtons.count();
  console.log(`Found ${animeServerCount} server options on Anime watch page`);

  for (let i = 0; i < animeServerCount; i++) {
    const btn = animeServerButtons.nth(i);
    const serverName = (await btn.innerText()).replace(/\n/g, ' ').trim();
    await btn.click();
    await page.waitForTimeout(2500);

    const iframe = page.locator('iframe').first();
    const src = await iframe.getAttribute('src');
    const sandbox = await iframe.getAttribute('sandbox');

    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasSandboxError = bodyText.toLowerCase().includes('disable sandbox') || bodyText.toLowerCase().includes('restricted embed');

    serversTested.push({ serverName, src: src?.slice(0, 45), sandbox: Boolean(sandbox), hasSandboxError });
    console.log(`  [Anime Server ${i + 1}: ${serverName}] Sandbox set: ${Boolean(sandbox)} | Sandbox Error: ${hasSandboxError} | Src: ${src?.slice(0, 45)}...`);
  }

  await browser.close();

  const allHaveSandbox = serversTested.every(s => s.sandbox);
  const zeroSandboxErrors = serversTested.every(s => !s.hasSandboxError);

  console.log(`\n========================================================================`);
  console.log(`SUMMARY: Tested ${serversTested.length} server configurations`);
  console.log(`- All have sandbox active: ${allHaveSandbox}`);
  console.log(`- Zero "Please Disable Sandbox" errors: ${zeroSandboxErrors}`);
  console.log(`========================================================================\n`);

  if (!allHaveSandbox || !zeroSandboxErrors) {
    process.exit(1);
  }
}

verifyAllServers().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
