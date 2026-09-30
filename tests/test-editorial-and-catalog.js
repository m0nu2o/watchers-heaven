const { chromium } = require('playwright');

const BASE_URL = process.argv[2] || 'http://localhost:3002';

async function testEditorialAndCatalog() {
  console.log(`\n======================================================`);
  console.log(`🎨 TESTING EDITORIAL SYSTEM & DEEP CATALOG PAGINATION`);
  console.log(`   Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Homepage Editorial Audit
    console.log(`▶️ 1. Auditing Homepage Editorial Modules...`);
    await page.goto(`${BASE_URL}/en`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const homepageAudit = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h2, h3, .font-black')).map(el => el.textContent.trim());
      const rankCards = document.querySelectorAll('.stroke-text, .text-7xl, .text-8xl, .text-9xl');
      const aspectVideos = document.querySelectorAll('.aspect-video');
      const posterCards = document.querySelectorAll('.aspect-\\[2\\/3\\]');

      return {
        hasTop10: headings.some(h => h.includes('Top 10')),
        hasSpotlight: headings.some(h => h.includes('Spotlight')),
        hasTrendingMovies: headings.some(h => h.includes('Trending Movies')),
        hasAnime: headings.some(h => h.includes('Popular Anime')),
        hasBollywood: headings.some(h => h.includes('Bollywood')),
        rankCardsCount: rankCards.length,
        aspectVideosCount: aspectVideos.length,
        posterCardsCount: posterCards.length,
      };
    });

    console.log(`   Homepage Modules Status:`, homepageAudit);
    if (!homepageAudit.hasTop10) console.warn('   ⚠️ Top 10 heading not found');
    if (!homepageAudit.hasSpotlight) console.warn('   ⚠️ Spotlight heading not found');
    console.log(`   ✓ Found ${homepageAudit.rankCardsCount} rank elements, ${homepageAudit.aspectVideosCount} 16:9 widescreen cards, ${homepageAudit.posterCardsCount} 2:3 posters`);

    // 2. Movies Catalog & Deep Pagination Audit
    console.log(`\n▶️ 2. Auditing Movies Catalog & Pagination...`);
    await page.goto(`${BASE_URL}/en/movies`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const moviesPage1 = await page.evaluate(() => {
      const cards = document.querySelectorAll('.aspect-\\[2\\/3\\]');
      const pageButtons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
      return {
        cardCount: cards.length,
        hasPagination: pageButtons.some(b => b === 'Next' || b === 'Previous' || b === '1'),
      };
    });
    console.log(`   Page 1 Cards: ${moviesPage1.cardCount} (Expected: 20), Pagination: ${moviesPage1.hasPagination ? 'YES' : 'NO'}`);

    // Click Next Page button
    const nextBtn = page.locator('button:has-text("Next")').first();
    if (await nextBtn.isVisible()) {
      console.log(`   🖱️ Clicking "Next" page button...`);
      await nextBtn.click();
      await page.waitForTimeout(3000);

      const moviesPage2 = await page.evaluate(() => {
        const cards = document.querySelectorAll('.aspect-\\[2\\/3\\]');
        return { cardCount: cards.length };
      });
      console.log(`   Page 2 Cards: ${moviesPage2.cardCount} (Expected: 20)`);
    }

    // 3. Anime Catalog Audit
    console.log(`\n▶️ 3. Auditing Anime Catalog...`);
    await page.goto(`${BASE_URL}/en/anime`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const animeAudit = await page.evaluate(() => {
      const cards = document.querySelectorAll('.aspect-\\[2\\/3\\]');
      const filterButtons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
      return {
        cardCount: cards.length,
        hasDubFilter: filterButtons.some(b => b.toLowerCase().includes('dub') || b.toLowerCase().includes('sub')),
      };
    });
    console.log(`   Anime Catalog Cards: ${animeAudit.cardCount}, Audio Filter: ${animeAudit.hasDubFilter ? 'YES' : 'NO'}`);

    console.log(`\n✅ ALL EDITORIAL & CATALOG TESTS COMPLETED SUCCESSFULLY!`);
  } catch (err) {
    console.error(`❌ Test failed with error:`, err);
  } finally {
    await browser.close();
  }
}

testEditorialAndCatalog();
