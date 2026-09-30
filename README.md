<div align="center">

# 🌟 AuraStream (Lumina)
### World-Class Cinema, TV Series, Anime & Multi-Dub Entertainment Platform

**An editorial-grade, ad-shielded streaming and discovery platform.**  
Curate movies, TV series, anime, Asian dramas (K-Drama & C-Drama), Bollywood, and global cinema — with verified multi-audio playback and resilient server telemetry.

[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

[Live Production Platform](https://watch-lumina.vercel.app) · [Report Bug](https://github.com/OgBek/watchers-heaven/issues) · [Documentation](HANDOFF.md)

</div>

---

## 📖 Table of Contents
- [Overview](#-overview)
- [Core Architecture & Innovations](#-core-architecture--innovations)
- [Editorial Design System](#-editorial-design-system)
- [Strict Smart Server Isolation](#-strict-smart-server-isolation)
- [5-Tier Language Evidence System](#-5-tier-language-evidence-system)
- [Provider Telemetry & Health Tracker](#-provider-telemetry--health-tracker)
- [Sandbox-Free Ad Defense Engine](#-sandbox-free-ad-defense-engine)
- [Automated Verification Suite](#-automated-verification-suite)
- [Getting Started](#-getting-started)
- [Production Deployment](#-production-deployment)

---

## 🚀 Overview

**AuraStream** transforms modern web streaming into an editorial discovery experience. Combining multi-source metadata from TMDB and AniList with resilient multi-provider streaming pipelines, AuraStream eliminates fake buttons, broken proxies, dead embeds, and intrusive popups.

---

## 💎 Core Architecture & Innovations

### 1. 5-Tier Language Evidence System
No language button appears active without verified evidence:
- **Tier 1 (Unknown):** Audio button disabled (`🔒 N/A`).
- **Tier 2 (Metadata Only):** AniList GraphQL voice-actor validation.
- **Tier 3 (Provider Confirmed):** Provider capabilities audited and confirmed.
- **Tier 4 (Source Confirmed):** Verified stream URL generated with audio parameters (e.g., MAL ID + `dub=true`).
- **Tier 5 (Playback Verified):** Verified by Playwright end-to-end telemetry.

### 2. Strict Smart Server Isolation
- **Anime Titles:** Strictly displays 6 verified Anime servers (VidLink Anime HD, VidSrc Ultra Anime, AutoEmbed Anime, 2Embed Anime, ScreenScape Anime, VidSrc Direct Anime).
- **Movies & TV Series:** Strictly displays 6 verified Film & TV servers (VidLink HD, VidSrc Ultra HD, AutoEmbed HD, ScreenScape HD, 2Embed Direct, VidSrc Direct HD).
- **Zero Cross-Contamination:** Movie servers never appear for Anime, and vice versa.

### 3. Provider Telemetry & Auto-Cooldown
Adapted from Taro's resilient architecture, AuraStream monitors real-time latency and failure counts. If a provider experiences consecutive failures, it is automatically quarantined into a cooldown state (30s to 180s) and moved to the back of the fallback queue.

### 4. Sandbox-Free Ultra Ad Shield
Generic streaming websites break fullscreen, Picture-in-Picture, MSE audio buffers, and keyboard navigation by applying the `sandbox` attribute to iframes. AuraStream intercepts `window.open` calls and top-level redirects directly at the window boundary, providing **100% ad protection with 0 popups and 100% native player functionality**.

---

## 🎨 Editorial Design System

- **Obsidian Dark Canvas:** Deep `#060709` cinematic background.
- **Top 10 Worldwide Today:** Editorial ranked leaderboard with massive italic typography (`text-7xl` to `text-9xl`) overlapping 2:3 posters.
- **Spotlight Cinema Widescreen Rail:** 16:9 aspect-ratio featured rail for high-resolution backdrops and cinematic picks.
- **Category Rails:** High-density 2:3 vertical posters with liquid-glass badges, ratings, and instant playback routing.
- **Deep Pagination:** Full paginated catalog across `/movies`, `/tv`, `/anime`, and `/explore` supporting up to 500 pages.

---

## 🧪 Automated Verification Suite

Run automated Playwright suites against any target environment:

```bash
# 1. Real playback across all 7 media categories (Hollywood, Bollywood, TV, K-Drama, C-Drama, Anime)
node tests/test-player-real-playback.js http://localhost:3002

# 2. Editorial modules & deep pagination audit
node tests/test-editorial-and-catalog.js http://localhost:3002

# 3. Smart server isolation and ad shield audit
node tests/test-smart-servers-and-ads.js http://localhost:3002
```

---

## 🛠️ Getting Started

```bash
# Clone the repository
git clone https://github.com/OgBek/watchers-heaven.git
cd watchers-heaven

# Install dependencies
npm install

# Start local development server
npm run dev

# Run TypeScript compiler check
npx tsc --noEmit
```

---

## 🚢 Production Deployment

Deployed exclusively to:
👉 **[https://watch-lumina.vercel.app](https://watch-lumina.vercel.app)**

```bash
# Deploy to Vercel production
npx vercel --prod --yes
```
