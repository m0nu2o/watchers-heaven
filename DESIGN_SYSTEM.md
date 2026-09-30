# AURASTREAM — ORIGINAL CINEMATIC EDITORIAL DESIGN SYSTEM

**Brand Identity:** AuraStream (Lumina Entertainment Engine)  
**Design Philosophy:** Cinematic Editorial Minimalism  
**Guiding Principle:** Confident, Content-First Architecture without AI-Generated Tropes  

---

## 1. Brand Identity & Creative Direction

AuraStream rejects the cookie-cutter "AI SaaS Streaming Template" look (random neon glow, excessive floating pills, identical rounded cards, ubiquitous purplish-blue gradients). Instead, it adopts a **high-end editorial, cinematic visual language** inspired by prestige film journals, physical film typography, and refined museum-grade digital interfaces.

### Core Visual Tenets:
1. **Art-Directed Hierarchy:** Asymmetric editorial layouts rather than endless uniform card rows.
2. **Typography with Weight & Character:** High-contrast display headlines balanced by crisp geometric sans metadata.
3. **Restrained Atmosphere:** Deep neutral obsidian canvas (`#08090C`, `#0E1015`) punctuated by precise, content-driven ambient light rather than artificial CSS glow.
4. **Information Density without Noise:** Real, verified data (audio capabilities, release year, runtime, studio, aspect ratio) cleanly organized with zero vanity badges.
5. **Tactile Interaction:** Subtly dampened spring physics and micro-transitions that acknowledge user input without distracting from media.

---

## 2. Color System

### Base Neutral Spectrum (Obsidian & Platinum)
- **Void Canvas (`--bg-void`):** `#060709` (true deep background, eliminates washed-out blacks on OLED displays)
- **Surface Elevation 1 (`--surface-1`):** `#0B0D12` (containers, editorial modules)
- **Surface Elevation 2 (`--surface-2`):** `#12151D` (cards, navigation bars, control decks)
- **Surface Elevation 3 (`--surface-3`):** `#1B1F2A` (interactive hover states, dropdown menus)
- **Border Subtle (`--border-subtle`):** `rgba(255, 255, 255, 0.07)`
- **Border Prominent (`--border-prominent`):** `rgba(255, 255, 255, 0.16)`

### Text & Content Values
- **Primary Ink (`--text-primary`):** `#F3F4F6` (96% luminance, razor-sharp legibility)
- **Secondary Ink (`--text-secondary`):** `#9CA3AF` (editorial metadata, synopses, season tags)
- **Tertiary Ink (`--text-tertiary`):** `#6B7280` (timestamps, episode numbers, copyright)

### Editorial Accent Palette
Rather than an arbitrary neon gradient, AuraStream uses deliberate, filmic accents:
- **Cinematic Amber / Gold (`--accent-gold`):** `#E5A93C` (awards, verified audio, featured editorial)
- **Electric Cyan (`--accent-cyan`):** `#2DD4BF` (direct HLS stream, verified 1080p stream)
- **Signal Red (`--accent-red`):** `#F43F5E` (live broadcasting, recording indicators)
- **Safety Emerald (`--accent-emerald`):** `#10B981` (provider healthy, playback active)

---

## 3. Typography Architecture

### Font Stack
- **Display & Headlines:** `Cinzel` / `Outfit` / `Inter Display` with heavy black weights (`font-black`, `tracking-tight`).
- **Body & Editorial Copy:** `Inter` / `Geist Sans` (`tracking-normal`, high-legibility leading `leading-relaxed`).
- **Technical & Playback Telemetry:** `JetBrains Mono` / `SF Mono` (`tabular-nums`, uppercase `text-[11px] font-mono tracking-wider`).

### Scale & Hierarchy
- **Hero Title:** `clamp(2.5rem, 5vw, 4.5rem)` with tight letter-spacing (`-0.03em`).
- **Section Editorial Headline:** `clamp(1.25rem, 2.5vw, 2rem)` (`font-bold`, uppercase subtle subtitle preceding).
- **Card Title:** `0.9375rem` (15px) (`font-semibold`, 2-line clamp).
- **Metadata Badges & Tags:** `0.6875rem` (11px) (`font-medium`, uppercase tracking `+0.05em`).

---

## 4. Component Standards

### 4.1 Cards & Rails
- **No Uniformity:** The homepage features a mix of:
  - **Cinematic Spotlight Cards:** 16:9 widescreen editorial frames showcasing hero art with title overlays.
  - **Standard Portrait Posters:** 2:3 high-density posters with progressive metadata reveal on hover.
  - **Wide Horizontal Rail Cards:** Compact 16:9 cards for "Continue Watching" with active progress bars.
  - **Dense Grid Explorations:** Clean tabular grid for deep catalog pagination.
- **Card Hover:** Subtle elevation scale (`scale-[1.025]`), image brightness bump (`brightness-105`), and smooth border illumination. No spinning gradients.

### 4.2 Hero Section
- **Composition:** Asymmetric, editorial layout. 60% widescreen key-art canvas seamlessly blending into obsidian background via linear-vignette curves.
- **Content:** Title typography, genre chips, release year, IMDb/TMDB rating, verified audio indicators (`SUB`, `ENG DUB`, `HIN DUB`), and clear action triggers (`Watch Now`, `Save to Watchlist`, `View Details`).

### 4.3 Navigation Architecture
- **Desktop:** Minimal top-rail navbar with brand mark, curated category links (`Home`, `Anime`, `Movies`, `Series`, `Explore`), interactive instant-search trigger, and user profile drawer.
- **Mobile:** Dedicated thumb-accessible bottom bar (`Home`, `Discover`, `Search`, `Library`, `Settings`) optimized for one-handed operation.

### 4.4 Player Control Deck
- **Under-Player Command Deck:** Floating glassmorphic tray directly beneath video.
- **Server Selector:** Media-isolated badges showing server nickname, resolution (`1080p`), CDN latency, and verified health badge.
- **Audio & Subtitle Picker:** Explicit tabs showing **only verified tracks**. Disabled tracks display lock indicators (`🔒 Unavailable on this episode`).
- **Playback Telemetry:** Real-time stream format indicator (`HLS Direct` vs `Iframe Bridge`), auto-switch toggle with countdown ring, and audio mode switcher.

---

## 5. Elimination of AI-Slop Checklist

| AI-Slop Trope | AuraStream Replacement |
| :--- | :--- |
| Giant purple-to-pink gradient backgrounds | Clean, deep OLED obsidian canvas with subtle radial lens falloffs |
| Pill badges on literally every piece of text | Structured tabular typography with clean dot-separators (`·`) |
| Repetitive cards with identical 12-item rows | Asymmetrical editorial sections (Spotlight, Wide Rail, Compact Grid, Focus Banner) |
| Generic "Experience the Ultimate Entertainment" copy | Concise, factual metadata (Director, Cast, Studios, Airing Status, Synopsis) |
| Fake "4K HDR Dolby Vision" badges on web embeds | Exact verified stream resolution (`1080p Web Stream`, `720p Backup`) |
| Centered floating modal with rainbow borders | Purpose-built slide-over drawers and clean anchored dropdowns |
