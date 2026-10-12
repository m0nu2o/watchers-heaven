const anilistRes = await fetch('https://graphql.anilist.co', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `query {
      Page(page: 1, perPage: 5) {
        media(search: "Soul Land", type: ANIME) {
          id
          idMal
          title { romaji english native }
          countryOfOrigin
          externalLinks { site url }
          streamingEpisodes { title url site }
        }
      }
    }`
  })
});
const anilistData = await anilistRes.json();
console.log('AniList Soul Land:', JSON.stringify(anilistData.data?.Page?.media, null, 2));

const tmdbRes = await fetch('http://localhost:3002/api/tmdb/search/tv?query=Soul+Land');
const tmdbData = await tmdbRes.json();
console.log('TMDB Soul Land:', tmdbData.results?.map(r => ({ id: r.id, name: r.name, orig_lang: r.original_language, orig_country: r.origin_country })));
