# AURASTREAM — MULTI-REPOSITORY COMPARISON & BEST-OF-BREED SELECTION MATRIX

**Date:** September 30, 2026  
**Evaluation Scope:** Workspace Sibling Repositories & External Benchmark Projects  
**Target:** Identification and legal adaptation of strongest architectural, provider, streaming, and UI patterns.

---

## 1. Comprehensive Repository Comparison Matrix

| Capability | Repository / Source | Actual Implementation | Concrete Evidence | Reusable? | Selected? | Architectural Adaptation |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **Provider Health & State Machine** | **Taro** (Workspace) | In-memory `ProviderRegistry` with statuses `HEALTHY`, `DEGRADED`, `UNAVAILABLE`, `RATE_LIMITED`, `BLOCKED`, tracking response times, success/failure counts, and cooldown timers. | `Taro/backend/provider-registry.mjs` lines 1–84 | **YES** | **YES** | Adopt into unified `ProviderRegistry` for all streaming servers with auto-cooldown and fallback selection. |
| **Source Byte-Range Validation** | **Taro** (Workspace) | Validates media URLs using `Range: bytes=0-512` preflight checks, verifying `#EXTM3U` playlist signatures and `video/*` content types without buffering the full stream. | `Taro/backend/source-validation.mjs` lines 27–76 | **YES** | **YES** | Integrate into source validation pipeline to test streams before surfacing them in the player. |
| **AniList Multi-Page Discovery & Queries** | **voidanime** (Workspace) | Comprehensive GraphQL schemas with paginated media queries, seasonal trends, format filters (`TV`, `MOVIE`, `OVA`), status, and voice-actor dub extraction. | `voidanime/src/lib/anilistqueries.js` and `Anilistfunctions.js` | **YES** | **YES** | Integrate into `ApiGateway` for multi-page anime catalog discovery beyond simple 15-item trending. |
| **Domain Whitelisting & SSRF Defenses** | **cinepulse** (Workspace) | Domain allowlist table (`TRUSTED_PROVIDER_DOMAINS`) with strict HTTPS enforcement, subdomain suffix matching, and protocol sanitization. | `cinepulse/server/services/provider.service.ts` lines 5–77 | **YES** | **YES** | Apply to watch page ad shield and external API proxy routing to prevent malicious redirects. |
| **Episode Status & Progress Summarization** | **cinepulse** (Workspace) | Pure functional utilities for calculating season completion, next unplayed episode resolution, and watched progress tracking. | `cinepulse/server/episode-status.ts` | **YES** | **YES** | Rebuild Continue Watching and Episode Navigator logic with strict user-scoped state. |
| **Indian & Hindi Anime Dub Scraping** | **Tatakai / TatakaiAPI** (Snozxyx) | Multi-provider scraping aggregating Hindi, Telugu, and Tamil audio tracks from verified regional sources with fallback queuing. | `Snozxyx/TatakaiAPI` (MPL 2.0) | **YES** | **YES** | Adapt episode-level language verification concepts; verify streams per episode instead of static global ID lists. |
| **Stream Manifest Parsing & Track Extraction** | **CloudStream-3** (AniFOSS / CSX) | Native parser for HLS master playlists (`.m3u8`) extracting separate `#EXT-X-MEDIA:TYPE=AUDIO` streams with language tags. | `AniFOSS/CloudStream-3` (GPL 3.0 reference) | **Reference Only** | **Adapted** | Clean-room implementation in TypeScript for parsing M3U8 audio playlists without bundling GPL code. |
| **Regional OTT Catalog Indexing** | **MediaFusion / IndiaStreams** | Aggregates availability metadata for Indian cinema across Netflix, Prime Video, JioCinema, SonyLIV, and regional platforms. | `MediaFusion` Community Addon | **Concept** | **YES** | Utilize TMDB regional provider filters (`watch/providers` endpoint with `watch_region=IN`). |

---

## 2. Best-of-Breed Architecture Synthesis

Combining the evaluated strengths into AuraStream's unified platform:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        AuraStream Core Platform                        │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ 1. Discovery & UI │ 2. Language Engine│ 3. Streaming & Provider Engine │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ • Editorial       │ • 5-Tier Evidence │ • Dynamic Provider Registry    │
│   Cinematic Art   │   Hierarchy       │   (Taro state machine)         │
│   Direction       │ • Episode-Level   │ • Cooldown & Health Recovery   │
│ • Multi-Page      │   Audio Matrix    │ • Preflight Stream Validation  │
│   Pagination      │ • Separate Stream │ • Sandbox-Free Ad Shield       │
│ • Deep Filters    │   from Metadata   │ • Strict Media-Type Isolation  │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

---

## 3. Decision Log

1. **Purge Static ID Sets:** Reject `VERIFIED_HINDI_DUB_IDS` and `VERIFIED_ENGLISH_DUB_ANIME_IDS` in favor of dynamic AniList voice-actor evidence and provider manifest verification.
2. **Standardize Provider Registry:** Migrate from the fragmented registries to a unified registry implementing Taro's health state machine (`STATUS.HEALTHY`, `DEGRADED`, `BLOCKED`, `COOLDOWN`).
3. **Deepen Catalog Discovery:** Upgrade `/anime`, `/movies`, and `/tv` routes with full multi-page cursor and page-number pagination, pulling up to 500+ titles dynamically.
4. **Original Visual Identity:** Create an editorial entertainment layout with bespoke typography, asymmetric cards, and deliberate motion, rejecting generic AI-template aesthetics.
