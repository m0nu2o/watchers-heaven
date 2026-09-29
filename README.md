<div align="center">

# 🌟 Lumina
### Next-Generation Cinema, TV & Anime Streaming Platform

**A high-performance, ad-shielded streaming and discovery platform.**  
Browse movies, TV series, anime, Asian dramas (K-Drama & C-Drama), and live TV — with verified streams and real-time audio detection.

[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

[Live Production Demo](https://lumina.vercel.app) · [Report Bug](https://github.com/OgBek/watchers-heaven/issues) · [Request Feature](https://github.com/OgBek/watchers-heaven/issues)

</div>

---

## 📖 Table of Contents
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Streaming Architecture & Reliability](#-streaming-architecture--reliability)
- [Lumina AI Copilot](#-lumina-ai-copilot)
- [Live TV Engine](#-live-tv-engine)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Quality Assurance & Playwright Testing](#-quality-assurance--playwright-testing)
- [Vercel Production Deployment](#-vercel-production-deployment)
- [Author & Credits](#-author--credits)

---

## 🚀 Overview

**Lumina** is an advanced open-web streaming platform engineered for seamless playback and verified entertainment discovery. Built on top of Next.js 16 (Turbopack), React 19, and Tailwind CSS 4, Lumina solves common web video hurdles with:

1. **Zero Artificial Overlays**: Direct player initialization with no blocking loading animations.
2. **Strict Ban on Iframe Sandboxing**: Players retain full access to fullscreen, hardware acceleration, and quality selectors without sandbox restrictions.
3. **Genuine Audio Detection**: Server-verified Sub and Dub availability (Japanese, English, Hindi) with non-available languages clearly disabled (`N/A`).
4. **Resilient Provider Fallback**: Automatic failover through prioritized streaming tiers.
5. **Real-time Live TV**: 100% verified, direct 200 OK HLS broadcast feeds with zero black screens.

---

## ✨ Key Features

### 🎬 Cinema & Series Playback
- **Multi-Server Streaming**: Seamless routing between VidLink, VidSrc Me, EmbedSU, Videasy, and VidSrc CC.
- **Auto-Failover**: If a stream stalls or returns an error, Lumina automatically rotates to the next verified provider.
- **Episode Navigator**: Complete season & episode navigation with real TMDB thumbnails, story arcs, and next-episode countdown.
- **Seek & Timestamp Controls**: `-10s` / `+10s` instant seek controls and anime opening skip button.

### 🎌 Anime & Verified Sub/Dub
- **Real Audio Detection**: Queries both TMDB and AniList to accurately determine whether English or Hindi audio dubs exist for each episode.
- **Safe UI Locking**: Unreleased dubs are rendered with a strikethrough and disabled, preventing broken player requests.

### 🌏 Asian Drama Collection
- **K-Drama (`ko`)**: Curated Korean dramas and variety shows.
- **C-Drama (`zh`)**: Dedicated Chinese dramas (e.g. *Against the Current*, *Hello Saturday*, *Who's the Murderer*).
- **All Asian Filter**: Unified discovery across East Asian television.

### 🤖 Lumina AI Copilot
- **Natural Language Discovery**: Ask for specific content or preferences (e.g. *"Find Naruto with English audio"*, *"Popular Chinese Dramas"*).
- **Grounded TMDB Recommendations**: Zero hallucinations with live rating, poster, and audio badges.
- **Interactive Glassmorphic Modal**: Accessible across desktop dock, mobile navbar, and search header.

### 📡 100% Verified Live TV
- Real HLS feeds streaming via `Hls.js`:
  - **News**: Aaj Tak HD, ABP News HD, Republic TV, WION HD, Zee News, Euronews English, RT News.
  - **Sports**: DD Sports Live, Red Bull TV Sports.
  - **Kids & Classic**: Cartoon Classics.
  - **Entertainment & Science**: DD National HD, NASA TV Science.
- Autoplay compliance with one-click **"🔊 Click to Unmute"** toggle.

### 🛡️ Ultra Ad Shield
- Anti-popup wrapper intercepting unauthorized `window.open` requests without using `sandbox`.
- Pop-under defense preventing background window blur without interrupting normal user navigation.

---

## 🏛️ Streaming Architecture & Reliability

```
User Playback Request
       │
       ▼
Provider Registry (Priority Tier)
  1. VidLink HD (Primary adaptive HLS)
  2. VidSrc Me (Universal cinema)
  3. EmbedSU Cinema (Multi-server backup)
  4. Videasy Pro (Ultra-responsive)
  5. VidSrc CC (General fallback)
  6. NHD Cinema / Anime (Verified Hindi Dubs)
  7. Direct HLS (AniList Anime)
       │
       ▼
Source Pre-flight Validator
  ├── DNS / Host Reachability Check
  ├── Dead-domain Blocklist (e.g. autoembed.cc, rivestream.ru)
  └── Circuit Breaker (healthy / degraded / failed)
       │
       ├─► [Healthy]  ──► Direct Cinema Player (Immediate Video)
       └─► [Failed]   ──► Automatic Advance to Next Priority Provider
```

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16.3.5 (Turbopack, App Router)
- **Frontend Core**: React 19.2.4 & React DOM 19
- **Languages**: TypeScript 5 (Strict Mode)
- **Styling**: Tailwind CSS 4 & Custom Glassmorphic Theme Engine
- **Streaming & Video**: Hls.js 1.5.20 (MSE Native Player)
- **State Management**: Zustand 4.5.2 & TanStack Query 5
- **Internationalization**: Next-Intl (5 Locales: `en`, `am`, `om`, `ti`, `so`)
- **Backend / Realtime**: Supabase SSR & Database (Watch Parties)
- **Metadata**: TMDB REST API v3 & AniList GraphQL API

---

## 📂 Project Structure

```text
watchers-heaven/
├── src/
│   ├── app/
│   │   ├── [locale]/             # Localized routes (movies, tv, anime, live, k-drama, watch)
│   │   │   ├── watch/[id]/       # Master Cinema Video Player
│   │   │   ├── live/             # 24/7 Verified Live TV Channels
│   │   │   ├── k-drama/          # Asian Drama Hub (K-Drama & C-Drama)
│   │   │   └── search/           # Token-based multi-search
│   │   ├── api/
│   │   │   ├── ai-search/        # Lumina AI Copilot Natural Language API
│   │   │   ├── tmdb/             # Proxied TMDB Metadata Gateway
│   │   │   └── watch/[id]/       # Real-time Language & Source Discovery
│   │   ├── robots.ts             # Search Engine Directives
│   │   └── sitemap.ts            # Dynamic Multi-locale XML Sitemap
│   ├── components/
│   │   ├── brand/                # Lumina Logo & Vectors
│   │   ├── chat/                 # AiChatModal Component
│   │   ├── layout/               # Desktop Dock, Mobile Header & Footer
│   │   └── player/               # Video Player & EpisodeNavigator
│   └── lib/
│       ├── api/                  # TMDB & AniList API Gateway
│       ├── audio/                # Audio Availability Verification
│       └── streaming/            # Provider Registry, Validator & Engine
```

---

## 💻 Getting Started

### Prerequisites
- Node.js 20+ or 22+
- npm or pnpm

### Installation
```bash
# Clone the repository
git clone https://github.com/OgBek/watchers-heaven.git
cd watchers-heaven

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be live at `http://localhost:3002`.

---

## 🔑 Environment Variables

Create a `.env.local` file in the project root:

```env
# TMDB API Key (Required for metadata and poster artwork)
TMDB_API_KEY=your_tmdb_api_key_here

# Supabase (Required for Watch Parties)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

---

## 🧪 Quality Assurance & Playwright Testing

Lumina comes equipped with an end-to-end test suite testing playback, search, live streams, and SEO:

```bash
# Type check the entire codebase
npm run typecheck

# Build the production application
npm run build
```

---

## 🚀 Vercel Production Deployment

To deploy Lumina on Vercel:

1. Push your changes to GitHub:
   ```bash
   git push origin main
   ```
2. Connect your repository to Vercel.
3. Configure the environment variables (`TMDB_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) in the Vercel Dashboard under **Project Settings > Environment Variables**.
4. Set Build Command: `npm run build` and Output Directory: `.next`.

---

## 👤 Author & Credits

- **Platform**: [Lumina](https://lumina.vercel.app)
- **Creator Handle**: `@itxz_baka`
- **License**: MIT
