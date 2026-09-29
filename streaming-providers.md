# Streaming Providers API Reference

> All embed URLs are generated through `ApiGateway` in `src/lib/api/gateway.ts`.  
> Providers are ordered by best fit per content type. ⭐ = recommended for that type.

---

## Provider Ranking by Content Type

| Rank | 🎬 Movies | 📺 TV Shows | 🎌 Anime |
|------|-----------|-------------|---------|
| 1 ⭐ | VidFast | VidRock | Videasy |
| 2 ⭐ | VidRock | VidFast | VidRock |
| 3 | Videasy | Videasy | VidFast |
| 4 | VidLink | VidLink | VidLink |
| 5 | Vidsrc | Vidsrc | Vidsrc |
| 6 | Vidsrc.to | Vidsrc.to | Vidsrc.to |
| 7 | VidKing | VidKing | VidKing |
| 8 | ScreenScape | ScreenScape | ScreenScape |
| 9 | TouStream | TouStream | TouStream |
| 10 | RiveStream | RiveStream | RiveStream |
| 11 | VidSync (last) | VidSync (last) | — |

### Comparison: Leading Providers

| Feature | VidFast | VidRock | Videasy | VidSync |
|---------|:-------:|:-------:|:-------:|:-------:|
| **Stream type** | iframe | iframe | iframe | iframe |
| **Subtitles (VTT/SRT)** | ✅ `sub=` | ✅ `lang=` | ❌ | ❌ |
| **Resume via param** | ✅ `startAt` | ❌ | ✅ `progress` | ✅ `startTime` |
| **Server picker** | ❌ | ❌ | ❌ | ✅ `defaultServer` |
| **Rich event payload** | ✅ | ✅ | partial | ✅ title+poster |
| **Download endpoint** | ❌ | ✅ | ❌ | ❌ |
| **No auth required** | ✅ | ✅ | ✅ | ✅ |
| **Anime support** | ❌ | ❌ | ✅ AniList | ❌ |
| **IMDB IDs** | ✅ | ✅ | ✅ TMDB | ❌ TMDB only |

---


## VidSync ⭐ Movies

**Base URL:** `https://vidsync.live/embed`  
**Accepts:** TMDB ID only  
**Events:** `VIDSYNC_PLAYER_EVENT` + `VIDSYNC_MEDIA_DATA` (richest payload of all providers)

```
https://vidsync.live/embed/movie/{tmdbId}
https://vidsync.live/embed/tv/{tmdbId}/{season}/{episode}
```

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `autoPlay` | boolean | Auto-start playback |
| `startTime` | number | Resume position in seconds |
| `defaultServer` | string | Preferred server name (e.g. `cinevault`) |
| `theme` | string | Hex color without `#` |
| `nextButton` | boolean | TV only — show next episode button at 90% |
| `autoNext` | boolean | TV only — auto-play next (requires `nextButton`) |

**Gateway method**

```ts
ApiGateway.getVidSyncUrl(id, type, season?, episode?, options?)
```

**Events**

VidSync uses prefixed event types and includes the full normalized progress entry:

```ts
window.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'VIDSYNC_PLAYER_EVENT') {
    const { event: name, currentTime, duration, title, poster, progress } = msg.data;
    // progress.watched, progress.duration, progress.lastUpdated
  }

  if (msg.type === 'VIDSYNC_MEDIA_DATA') {
    // msg.data.entry — full normalized object, ready to persist
    // stored locally under localStorage['vidSyncProgress']
  }
});
```

**On-demand status request** (unique to VidSync):

```ts
iframeRef.contentWindow?.postMessage(
  { type: 'VIDSYNC_PLAYER_COMMAND', action: 'getMediaData' },
  '*'
);
```

**VIDSYNC_PLAYER_EVENT payload shape:**

```json
{
  "type": "VIDSYNC_PLAYER_EVENT",
  "data": {
    "event": "timeupdate",
    "currentTime": 352.42,
    "duration": 2667.23,
    "tmdbId": 533535,
    "mediaType": "movie",
    "title": "Deadpool & Wolverine",
    "poster": "https://image.tmdb.org/...jpg",
    "playing": true,
    "muted": false,
    "volume": 1,
    "progress": {
      "watched": 352.42,
      "duration": 2667.23,
      "lastUpdated": 1746975000000
    }
  }
}
```

**Examples**

```
https://vidsync.live/embed/movie/299534?autoPlay=true&theme=007bff
https://vidsync.live/embed/movie/278?startTime=120&defaultServer=cinevault
https://vidsync.live/embed/tv/66732/1/5?nextButton=true&autoNext=true
```

---

## VidFast ⭐ Movies

**Base URL:** `https://vidfast.pro`  
**Accepts:** TMDB ID or IMDB ID  
**Events:** `PLAYER_EVENT` + `MEDIA_DATA`

```
https://vidfast.pro/movie/{id}
https://vidfast.pro/tv/{id}/{season}/{episode}
```

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `autoPlay` | boolean | Auto-start playback |
| `title` | boolean | Show media title overlay |
| `poster` | boolean | Show poster image |
| `startAt` | number | Resume position in seconds |
| `theme` | string | Hex color without `#` |
| `server` | string | Default server name |
| `hideServer` | boolean | Hide server selector |
| `fullscreenButton` | boolean | Show/hide fullscreen button |
| `chromecast` | boolean | Show/hide Chromecast button |
| `sub` | string | Default subtitle language (`en`, `es`, `fr`) |
| `nextButton` | boolean | TV only — show next episode button at 90% |
| `autoNext` | boolean | TV only — auto-play next (requires `nextButton`) |

**Gateway method**

```ts
ApiGateway.getVidFastUrl(id, type, season?, episode?, options?)
```

**Events**

```ts
const vidfastOrigins = [
  'https://vidfast.pro', 'https://vidfast.in', 'https://vidfast.io',
  'https://vidfast.me', 'https://vidfast.net', 'https://vidfast.pm', 'https://vidfast.xyz'
];

// PLAYER_EVENT
{ type: "PLAYER_EVENT", data: {
    event: "play" | "pause" | "seeked" | "ended" | "timeupdate" | "playerstatus",
    currentTime: number, duration: number,
    tmdbId: number, mediaType: "movie" | "tv",
    season?: number, episode?: number,
    playing: boolean, muted: boolean, volume: number
}}

// MEDIA_DATA — stored to localStorage["vidFastProgress"]
// Structure: { "m{id}": { ...movie }, "t{id}": { ...show } }
```

**Examples**

```
https://vidfast.pro/movie/533535?theme=007bff&autoPlay=true
https://vidfast.pro/tv/63174/1/5?autoPlay=true&sub=en
```

---

## VidRock ⭐ TV Shows

**Base URL:** `https://vidrock.ru`  
**Accepts:** TMDB ID or IMDB ID  
**Events:** `PLAYER_EVENT` + `MEDIA_DATA`

```
https://vidrock.ru/movie/{id}
https://vidrock.ru/tv/{id}/{season}/{episode}
```

**Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `autoplay` | boolean | `false` | Auto-start playback |
| `autonext` | boolean | `false` | Auto-play next TV episode |
| `theme` | string | `ffffff` | Hex color without `#` |
| `download` | boolean | `true` | Show/hide download button |
| `nextbutton` | boolean | `true` | Show/hide next episode notification |
| `episodeselector` | boolean | `true` | Show/hide episode selector |
| `lang` | string | browser | Subtitle language ISO code (`en`, `es`, `fr`) |

**Gateway method**

```ts
ApiGateway.getVidRockUrl(id, type, season?, episode?, options?)
```

**Events**

```ts
// Origin: https://vidrock.ru

// PLAYER_EVENT
{ type: "PLAYER_EVENT", data: {
    event: "play" | "pause" | "seeked" | "ended" | "timeupdate",
    currentTime: number, duration: number,
    tmdbId: number, mediaType: "movie" | "tv",
    season?: number, episode?: number
}}

// MEDIA_DATA — stored to localStorage["vidRockProgress"] as an array
[{
  "id": 52814, "type": "tv", "title": "Halo",
  "progress": { "watched": 0, "duration": 0 },
  "last_season_watched": "1", "last_episode_watched": "1",
  "show_progress": {
    "s1e1": { "season": "1", "episode": "1",
      "progress": { "watched": 3.79, "duration": 3536.79 },
      "last_updated": 1735651642940 }
  }
}]
```

**List all available content**

```
GET https://vidrock.ru/list/movie.json
GET https://vidrock.ru/list/tv.json
```

**Examples**

```
https://vidrock.ru/movie/tt4154796
https://vidrock.ru/tv/tt0903747/1/1?autoplay=true&theme=007bff&episodeselector=true
```

---

## Videasy ⭐ Anime

**Base URL:** `https://player.videasy.net`  
**Accepts:** TMDB ID (movie/tv) or AniList ID (anime)  
**Events:** JSON-stringified `postMessage`

```
https://player.videasy.net/movie/{tmdbId}
https://player.videasy.net/tv/{tmdbId}/{season}/{episode}
https://player.videasy.net/anime/{anilistId}/{episode}   ← anime show
https://player.videasy.net/anime/{anilistId}             ← anime movie
```

> Anime requires an **AniList ID**, not a TMDB ID. The watch page automatically resolves TMDB anime titles → AniList IDs via the `/api/anilist` proxy before building the Videasy URL.

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `color` | string | Hex color without `#` |
| `progress` | number | Resume start position in seconds |
| `nextEpisode` | boolean | Show next episode button |
| `episodeSelector` | boolean | Built-in season/episode selector |
| `autoplayNextEpisode` | boolean | Auto-play next episode when current ends |
| `overlay` | boolean | Netflix-style overlay on pause (5s delay) |

**Gateway method**

```ts
ApiGateway.getVideasyUrl(id, type, season?, episode?, options?)
// type: 'movie' | 'tv' | 'anime'
```

**Events**

```ts
window.addEventListener("message", (event) => {
  const data = JSON.parse(event.data as string);
  // {
  //   id: string,
  //   type: 'movie' | 'tv' | 'anime',
  //   progress: number,     — 0–100
  //   timestamp: number,    — seconds
  //   duration: number,     — seconds
  //   season?: number,
  //   episode?: number,
  // }
});
```

**Finding content IDs**

- Movies / TV: [themoviedb.org](https://www.themoviedb.org) — `themoviedb.org/movie/{id}` or `themoviedb.org/tv/{id}`
- Anime: [anilist.co](https://anilist.co) — `anilist.co/anime/{id}`

**Examples**

```
https://player.videasy.net/movie/299534
https://player.videasy.net/tv/1399/1/1?nextEpisode=true&episodeSelector=true
https://player.videasy.net/anime/21/1
https://player.videasy.net/anime/145139
https://player.videasy.net/tv/1399/1/1?autoplayNextEpisode=true&overlay=true&color=8B5CF6
```

---

## AniList GraphQL API (via `/api/anilist` proxy)

**Endpoint:** `POST /api/anilist`  
**Upstream:** `https://graphql.anilist.co`  
**Rate limit:** 90 requests/min (AniList) — server proxy caches responses for 10 min  

The AniList proxy is used internally to resolve anime titles to AniList IDs for Videasy embeds. All queries go through the server to keep rate limits under control and cache results.

**Usage**

```ts
// Resolve a single anime ID by title
const anilistId = await ApiGateway.getAniListId('Attack on Titan');
// → 16498 (or null if not found)

// Search AniList for a list of anime
const results = await ApiGateway.searchAniList('demon slayer', 1, 20);
// → [{ id, title: { romaji, english }, coverImage: { large }, episodes, averageScore }]
```

**Direct proxy usage**

```ts
const res = await fetch('/api/anilist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      query ($search: String) {
        Media(search: $search, type: ANIME) {
          id
          title { romaji english }
          episodes
          averageScore
        }
      }
    `,
    variables: { search: 'One Piece' }
  })
});
const { data } = await res.json();
// data.Media.id → 21
```

**Caching**

| Layer | TTL | Storage |
|-------|-----|---------|
| Server proxy | 10 min | In-memory `MemoryCache` (200 entries) |
| Client `getAniListId` | 1 hour | `clientCache` + `sessionStorage` |
| Client `searchAniList` | 10 min | `clientCache` + `sessionStorage` |

---

## VidLink

**Base URL:** `https://vidlink.pro`  
**Events:** `PLAYER_EVENT` + `MEDIA_DATA` (same structure as VidFast)

```
https://vidlink.pro/movie/{id}
https://vidlink.pro/tv/{id}/{season}/{episode}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `primaryColor` | string | Hex color without `#` |
| `secondaryColor` | string | Hex color |
| `iconColor` | string | Hex color |
| `autoplay` | boolean | Auto-start |
| `nextButton` | boolean | Show next episode button |
| `title` | boolean | Show title overlay |

```ts
ApiGateway.getVidLinkUrl(id, type, season?, episode?, options?)
```

---

## Vidsrc

**Base URL:** `https://vidsrc-embed.ru/embed`

```
https://vidsrc-embed.ru/embed/movie/{id}
https://vidsrc-embed.ru/embed/tv/{id}/{season}-{episode}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `sub_url` | string | External subtitle file URL |
| `ds_lang` | string | Display language |
| `autoplay` | `0` \| `1` | Auto-start |

```ts
ApiGateway.getVidsrcEmbedUrl(id, type, season?, episode?, options?)
```

---

## Vidsrc.to

**Base URL:** `https://vidsrc.to/embed`

```
https://vidsrc.to/embed/movie/{id}
https://vidsrc.to/embed/tv/{id}/{season}/{episode}
```

No extra parameters.

```ts
ApiGateway.getVidsrcToUrl(id, type, season?, episode?)
```

---

## VidKing

**Base URL:** `https://www.vidking.net/embed`

```
https://www.vidking.net/embed/movie/{id}
https://www.vidking.net/embed/tv/{id}/{season}/{episode}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `color` | string | Hex color |
| `autoPlay` | boolean | Auto-start |
| `nextEpisode` | boolean | Show next episode button |
| `episodeSelector` | boolean | Show episode selector |
| `progress` | number | Resume timestamp in seconds |

```ts
ApiGateway.getVidKingUrl(id, type, season?, episode?, options?)
```

---

## ScreenScape

**Base URL:** `https://screenscape.me/embed`

```
https://screenscape.me/embed?tmdb={id}&type=movie
https://screenscape.me/embed?tmdb={id}&type=tv&s={season}&e={episode}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `lan` | string | Language code (`eng`, `spa`, …) |

```ts
ApiGateway.getScreenScapeUrl(id, type, season?, episode?, language?, isImdb?)
```

---

## TouStream

**Base URL:** `https://toustream.xyz/tou`

```
https://toustream.xyz/tou/movies/{tmdbId}
https://toustream.xyz/tou/live/{channelSlug}
```

```ts
ApiGateway.getTouStreamMovieUrl(tmdbId)
ApiGateway.getTouStreamLiveUrl(channelSlug)
ApiGateway.getTouStreamChannels(limit?)   // fetches channels via server proxy, limit 10–200
```

---

## RiveStream

**Base URL:** `https://rivestream.ru`

```
https://rivestream.ru/embed?type=movie&id={tmdbId}
https://rivestream.ru/embed?type=tv&id={tmdbId}&season={s}&episode={e}
https://rivestream.ru/embed/torrent?type=movie&id={tmdbId}
https://rivestream.ru/embed/agg?type=movie&id={tmdbId}
```

```ts
ApiGateway.getMovieEmbedUrl(tmdbId, type?)
ApiGateway.getTvEmbedUrl(tmdbId, season, episode, type?)
ApiGateway.getMovieDownloadUrl(tmdbId)
ApiGateway.getTvDownloadUrl(tmdbId, season, episode)
```

> RiveStream iframes are sandboxed with `allow-scripts allow-same-origin allow-forms allow-popups`.
