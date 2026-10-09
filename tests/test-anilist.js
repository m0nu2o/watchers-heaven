async function testAniList() {
  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        id
        idMal
        title { romaji english }
        characters(perPage: 12) {
          edges {
            node { id }
            voiceActors {
              id
              languageV2
            }
          }
        }
      }
    }
  `;

  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { search: 'Mushoku Tensei: Jobless Reincarnation' } }),
  });

  const data = await res.json();
  const media = data?.data?.Media;
  console.log('AniList Media:', {
    id: media?.id,
    idMal: media?.idMal,
    title: media?.title,
  });

  const langs = new Set();
  (media?.characters?.edges || []).forEach((e) => {
    e.voiceActors?.forEach((v) => {
      if (v.languageV2) langs.add(v.languageV2);
    });
  });
  console.log('Spoken Languages:', Array.from(langs));
}

testAniList();
