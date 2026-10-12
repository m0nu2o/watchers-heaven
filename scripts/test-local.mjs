async function test() {
  const base = "http://localhost:3002";
  
  // Test schedule anime
  const sRes = await fetch(base + "/api/schedule?type=anime");
  const sData = await sRes.json();
  console.log("[TEST] Anime Schedule:", sRes.status, "count:", sData.schedule?.length);

  // Test schedule kdrama
  const kRes = await fetch(base + "/api/schedule?type=kdrama");
  const kData = await kRes.json();
  console.log("[TEST] KDrama Schedule:", kRes.status, "count:", kData.schedule?.length);

  // Test schedule tv
  const tRes = await fetch(base + "/api/schedule?type=tv");
  const tData = await tRes.json();
  console.log("[TEST] TV Schedule:", tRes.status, "count:", tData.schedule?.length);

  // Test direct HLS anime
  const aRes = await fetch(base + "/api/watch/151807/source?type=anime&aniListId=151807&e=1");
  const aData = await aRes.json();
  console.log("[TEST] Anime Source:", aRes.status, "provider:", aData.provider, "isHls:", aData.isHls, "subs:", aData.subtitles?.length);

  // Test Donghua
  const dRes = await fetch(base + "/api/watch/76572/source?type=anime&title=Soul+Land&e=1");
  const dData = await dRes.json();
  console.log("[TEST] Donghua Source:", dRes.status, "provider:", dData.provider, "url:", dData.url?.slice(0, 50));
}
test().catch(console.error);
