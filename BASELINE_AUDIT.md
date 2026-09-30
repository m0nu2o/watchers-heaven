# AURASTREAM (LUMINA) — COMPREHENSIVE FORENSIC BASELINE AUDIT
**Date:** September 30, 2026  
**Auditor:** Lead System Architect & Forensic Auditor  
**Audit Target:** `watchers-heaven` Workspace  
**Status:** Audit Completed — Major Deficiencies Identified Across Architecture, Providers, Dub Verification & UI  

---

## 1. Executive Summary

A forensic audit of the `watchers-heaven` codebase reveals that while recent targeted fixes succeeded in isolating media types (Anime vs Movie vs TV) and suppressing iframe popups/ads without the sandbox attribute, the overall platform still suffers from foundational architectural shortcuts:

1. **Hardcoded Language Lists & Fabricated Dub Availability:** Spoken language and dub capabilities were historically inferred using static Sets of IDs (`VERIFIED_HINDI_DUB_IDS`, `VERIFIED_ENGLISH_DUB_ANIME_IDS`) rather than real, episode-level playable stream resolution.
2. **Duplicated & Disconnected Provider Registries:** There are at least three disconnected definitions of providers:
   - `src/lib/providers/index.ts` (Active in Watch page)
   - `src/lib/streaming/registry.ts` (Abandoned parallel implementation)
   - `src/lib/audio/providers.ts` (Legacy provider audio map with mismatched provider IDs)
3. **Absence of Real Playable Stream Extraction:** The system defaults to returning iframe embed URLs (`isHls: false`) rather than extracting direct, playable HLS streams with true audio track control, subtitles, and intros. External proxy endpoints (e.g. `anivexa-api.vercel.app`) fail with anti-bot/DDoS-Guard blocks.
4. **Shallow Catalog Discovery:** Catalog exploration has been constrained to top trending rows (often limiting user navigation to the first 15–20 results) instead of deep, multi-page paginated browsing across genres, years, countries, and audio languages.
5. **Generic Visual Identity:** The UI carries generic glassmorphism and repetitive card patterns typical of template-based streaming frontends, lacking an art-directed, cinematic editorial identity.

---

## 2. Forensic Breakdown of Major Subsystems

### 2.1 Language System & Dub Verification

| Item | Status | Evidence / File | Assessment | Required Fix | Priority |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **Hardcoded Hindi Lists** | ❌ CRITICAL | `src/lib/audio/index.ts` lines 72–199 (`VERIFIED_HINDI_DUB_IDS`) | Hardcoded set of ~60 TMDB/AniList IDs used to declare Hindi availability without verifying actual stream audio. | Purge static sets. Implement 5-tier evidence model (`UNKNOWN`, `METADATA_ONLY`, `PROVIDER_CONFIRMED`, `SOURCE_CONFIRMED`, `PLAYBACK_VERIFIED`). | **P0** |
| **Hardcoded English Dub Lists** | ❌ CRITICAL | `src/lib/audio/index.ts` lines 201–261 (`VERIFIED_ENGLISH_DUB_ANIME_IDS`) | Popular anime IDs assume English dub without checking specific season/episode availability. | Determine availability per Season + Episode dynamically from AniList voice actors and provider manifests. | **P0** |
| **Episode-Level Language Matrix** | ⚠️ PARTIAL | `src/lib/audio/index.ts` lines 340–450 | Episode tracks are generated based on global title flags; an entire anime is marked dubbed if title is in static list. | Build an episode-level capability matrix verifying each episode's audio streams independently. | **P0** |
| **Source Resolution vs Metadata** | ❌ FLAWED | `src/lib/audio/index.ts` lines 1076–1099 | `resolveAudioSourceAsync` marks `isHls: false` and returns iframe embed without verifying audio output. | Validate audio stream payload (M3U8 `#EXT-X-MEDIA:TYPE=AUDIO` or provider stream manifest) prior to claiming dub readiness. | **P0** |

---

### 2.2 Streaming Architecture & Provider System

| Item | Status | Evidence / File | Assessment | Required Fix | Priority |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **Dead/Divergent Streaming Code** | ❌ CRITICAL | `src/lib/streaming/engine.ts`, `registry.ts`, `validator.ts` | Dead code module completely unimported by the main application (`0` active references in `src/`). | Unify all streaming logic into a single resilient engine; remove dead duplicate registries. | **P1** |
| **Provider ID Mismatches** | ❌ HIGH | `src/lib/audio/providers.ts` vs `src/lib/providers/index.ts` | `PROVIDER_AUDIO_CAPABILITIES` references IDs like `vidfast`, `rivestream-anime`, `111movies` that do not exist in `PROVIDER_ADAPTERS`. | Align provider IDs across all configurations and adapters into a canonical registry. | **P1** |
| **Direct HLS Stream Extraction** | ⚠️ BLOCKED | `src/lib/api/gateway.ts` lines 423–450 | Calls `anivexa-api.vercel.app` which returns `HTTP 403 / DDoS-Guard clearance cookie missing`. | Replace brittle third-party Vercel endpoints with local Consumet/Tatakai extractors and native resolvers. | **P0** |
| **Provider Health & Cooldown** | ⚠️ BASIC | `src/app/[locale]/watch/[id]/page.tsx` lines 610–660 | Active fallback exists on watchdog timer, but provider health is not persisted across sessions or tracked by latency/success metrics. | Implement a dynamic Provider Health Monitor with latency tracking, circuit breaker, and cooldown recovery. | **P1** |
| **Ad Shield (Sandbox-Free)** | ✅ VERIFIED | `src/app/[locale]/watch/[id]/page.tsx` lines 810–930 | Upgraded Ultra Ad Shield blocks `window.open`, hidden programmatic clicks, `auxclick`, and injects MutationObserver. Fullscreen & player tokens remain intact. | Retain and optimize; ensure low runtime overhead. | **P2** |

---

### 2.3 Discovery, Catalog & Library Depth

| Item | Status | Evidence / File | Assessment | Required Fix | Priority |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **Pagination & Depth** | ❌ LOW DEPTH | `src/app/[locale]/page.tsx`, `movies/page.tsx`, `anime/page.tsx` | Pages display single-page lists (15–20 items) without infinite scroll, cursor pagination, or multi-page navigation. | Build scalable multi-page pagination (infinite scroll + page jump) using TMDB & AniList page parameters. | **P0** |
| **AniList Integration** | ⚠️ BASIC | `src/lib/api/gateway.ts` | Limited to trending/popular/airing queries; missing rich seasonal, format, tag, and advanced filter matrices. | Adopt comprehensive AniList GraphQL queries (adapted from `voidanime/src/lib/anilistqueries.js`). | **P1** |
| **Cross-Source ID Mapping** | ⚠️ BASIC | `src/lib/audio/index.ts` | TMDB <-> AniList mapping is performed via basic title search without robust title normalization or fuzzy matching. | Adapt `string-similarity` and title normalization algorithms from sibling project `Taro`. | **P1** |

---

### 2.4 User Experience, Navigation & Design System

| Item | Status | Evidence / File | Assessment | Required Fix | Priority |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **Visual Identity** | ⚠️ GENERIC | `src/components/layout/Navbar.tsx`, `HeroFeature.tsx`, `PosterCard.tsx` | Standard dark SaaS look with excessive blur, generic gradients, and repetitive pill styling. | Create an editorial, cinema-grade design system (`DESIGN_SYSTEM.md`) with bespoke typography, refined rhythm, and clear hierarchy. | **P1** |
| **Responsive Mobile Layout** | ✅ IMPROVED | `src/app/[locale]/watch/[id]/page.tsx` | Mobile player deck, episode bar, and server list tested cleanly on 375px/390px. | Extend clean mobile touch gestures and responsive patterns across Homepage, Explore, and Search. | **P2** |
| **Empty & Error States** | ⚠️ MINIMAL | Various pages | Generic spinner or basic fallback message when queries return empty. | Implement informative, actionable empty states ("No Hindi dub released for this season yet", "Checking backup mirrors..."). | **P1** |

---

### 2.5 Security, Database & State Management

| Item | Status | Evidence / File | Assessment | Required Fix | Priority |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **Database Architecture** | ⚠️ PARTIAL | `supabase/migrations/001_watch_parties.sql` | Only watch party synchronization is in SQL; user history/watchlist relies primarily on `localStorage`. | Ensure robust Supabase backend schema for authenticated users while maintaining clean guest offline storage. | **P2** |
| **SSRF & Proxy Security** | ✅ SECURE | `src/app/api/` | TMDB and AniList routes proxy to trusted upstream domains only. No open redirect or SSRF vulnerabilities detected. | Retain strict domain allowlisting. | **P2** |

---

## 3. Prioritized Action Plan

1. **Step 1:** Establish `PROGRESS.md`, `REPOSITORY_COMPARISON.md`, and `DESIGN_SYSTEM.md`.
2. **Step 2:** Purge static ID lists (`VERIFIED_HINDI_DUB_IDS`, `VERIFIED_ENGLISH_DUB_ANIME_IDS`) and implement the **5-Tier Language Evidence System** (`UNKNOWN`, `METADATA_ONLY`, `PROVIDER_CONFIRMED`, `SOURCE_CONFIRMED`, `PLAYBACK_VERIFIED`).
3. **Step 3:** Consolidate streaming providers into a single canonical architecture with dynamic health monitoring, latency scoring, and cooldown recovery.
4. **Step 4:** Integrate direct multi-page catalog discovery across TMDB and AniList with infinite scroll and deep filtering.
5. **Step 5:** Revamp the UI with a distinct editorial visual identity, removing generic AI tropes.
6. **Step 6:** Run end-to-end Playwright verification and deploy live to production.
