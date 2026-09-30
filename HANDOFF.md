# 🚀 AURASTREAM (LUMINA) — ENGINEERING HANDOFF
**Version:** 3.0.0-verified  
**Date:** September 30, 2026  
**Repository:** `watchers-heaven` (Deployed to: `https://watch-lumina.vercel.app`)

---

## 1. Quick Start & Development

### 1.1 Prerequisites
- Node.js >= 18.17.0
- npm >= 9.0.0

### 1.2 Installation & Startup
```bash
# Install dependencies
npm install

# Start development server on port 3002
npm run dev

# Run TypeScript compiler check (Zero errors allowed)
npx tsc --noEmit
```

### 1.3 Running Automated Test Suites
```bash
# Comprehensive Playwright playback test across all 7 media types
node tests/test-player-real-playback.js http://localhost:3002

# Editorial modules, ranked rail & deep catalog pagination audit
node tests/test-editorial-and-catalog.js http://localhost:3002

# Server isolation & sandbox-free ad shield verification
node tests/test-smart-servers-and-ads.js http://localhost:3002
```

---

## 2. Key Architecture Files

- **`src/lib/providers/index.ts`**: Master provider registry, alias redirects, and active server adapters.
- **`src/lib/providers/telemetry.ts`**: In-memory health tracker, EMA latency recording, and auto-cooldown state machine.
- **`src/lib/audio/index.ts`**: 5-Tier language evidence engine and AniList voice actor resolution.
- **`src/app/[locale]/watch/[id]/page.tsx`**: Unified video player with smart server isolation, watchdog auto-switch, and responsive control deck.
- **`src/components/cards/RankCard.tsx`**: Top 10 editorial ranked card with massive italic numeral typography.
- **`src/components/cards/FeatureCard.tsx`**: 16:9 widescreen cinema spotlight card.

---

## 3. Production Deployment (Vercel)

The target production URL is:
`https://watch-lumina.vercel.app`

*(Note: `watchers-heaven-lime.vercel.app` has been retired per user instructions).*

To deploy to production:
```bash
npx vercel --prod --yes
```

---

## 4. Verification Checklists for Future Developers

1. **Never re-add `sandbox` attribute to video iframes**: Sandbox flags break native browser Picture-in-Picture, MSE audio buffers, and hardware-accelerated fullscreen.
2. **Never hardcode static lists of anime dub IDs**: Always use the 5-Tier Evidence System (`AudioAvailabilityCache` and dynamic voice actor queries).
3. **Keep smart server isolation**: Anime servers must never leak into Movie/TV views, and vice versa.
