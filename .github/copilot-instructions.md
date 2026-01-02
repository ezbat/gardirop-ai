# Copilot / AI Agent instructions — kombin (my-app)

Summary: concise, actionable guidance to help an AI coding agent be productive in this repo.

## Big picture
- Next.js (app router) TypeScript app using Next 16 + React 19. UI is Tailwind + Radix primitives. Main UI lives in `app/` and `components/`.
- Business logic and small services live under `lib/` (weather mock, outfit generation, IDB storage). UI components call these directly from client components.
- Storage is browser-only IndexedDB via `idb` (`lib/storage.ts`) — the DB is named `gardirop-ai`. This implies many helpers are client-side only and can't run in Node or server components.

## Key files & responsibilities (quick reference)
- `app/page.tsx` — app entry/home screen; illustrates how `fetchWeather`, `generateOutfit`, and `getAllClothes` are wired together.
- `lib/storage.ts` — DB schema and all persistence helpers (clothes, outfits, social posts). Uses `openDB` (IDB) and returns async helpers like `getAllClothes()`.
- `lib/outfit-generator.ts` — core outfit selection logic (weather suitability, favorites, recent history). Important for reproducing behavior or tests.
- `lib/weather.ts` — mock `fetchWeather()` (replaceable with real API: keep signature `Promise<WeatherData>`).
- `components/` — UI components; `components/ui/` contains primitives (Radix + cva patterns).

## Project-specific conventions & patterns agents should follow
- "use client" directive: any file that uses browser APIs, hooks, or `idb` must be a client component. Search for `"use client"` to identify client components (e.g., `components/model-preview.tsx`, `app/page.tsx`).
- Storage functions are browser-only; do not call them from server-side code or build-time scripts. If you need server persistence, add a server API and migrate usage carefully.
- Styling: Tailwind + `class-variance-authority` (cva) + `cn()` helper (`lib/utils.ts`). Use existing cva variants for consistent UI (see `components/ui/button.tsx`).
- Filenames: kebab-case for components (e.g., `daily-outfit-card.tsx`, `model-preview.tsx`).
- Strings/UI language is primarily Turkish; follow existing language when adding copy.

## Workflows & commands
- Dev server: `npm run dev` (starts Next dev server on :3000)
- Build: `npm run build` then `npm run start` for production
- Lint: `npm run lint` (eslint configured at repo root)
- Debugging notes: inspect IndexedDB in browser devtools (DB name `gardirop-ai`) for stored clothes/outfits; use console logs for outfit generation flow (`lib/outfit-generator.ts`).

## Integration points & external dependencies
- `idb` (IndexedDB wrapper) — used for local persistence
- `next/image` used in components for images; if you add remote images, update `next.config` `images.remotePatterns` accordingly.
- Weather currently mocked in `lib/weather.ts` — adding a real provider should maintain `WeatherData` shape and keep `fetchWeather()` async.
- Third-party UI libs: Radix UI primitives, cva, framer-motion, lucide-react, tailwind.

## Testing & reproducibility notes
- There are no tests in the repo currently. If you add tests, prefer unit tests for:
  - `lib/outfit-generator.ts` (deterministic scenarios; stub `getAllClothes()`, `getFavoriteOutfits()` and mock weather)
  - `lib/storage.ts` helpers (IDB interactions; use an in-memory/mock IDB or abstraction)
- Outfit generation is randomized (Math.random). For deterministic tests, inject or mock randomness.

## PR & change recommendations for agents
- When changing storage or outfit logic, add a short migration note in the PR: DB name/schema is controlled in `lib/storage.ts` (upgrade function).
- Keep UI language consistent (Turkish copy). When changing copy, update the affected components under `app/` and `components/`.
- Avoid introducing server-side calls to `lib/storage.ts` — instead create new API route(s) if server persistence is required.

## Helpful examples (copy & paste)
- Load clothing items in a client component:

```ts
import { getAllClothes } from '@/lib/storage'

const clothes = await getAllClothes()
```

- Generate an outfit:

```ts
const weather = await fetchWeather()
const { outfit, items } = await generateOutfit(weather)
```

- DB name/schema location: `lib/storage.ts` (search for `openDB('gardirop-ai'`)

## Missing pieces (observations you can act on)
- No automated tests present — prioritize unit tests for `lib/outfit-generator.ts` and `lib/storage.ts` when adding testing.
- `lib/weather.ts` is mocked — flag this in PRs that integrate a real weather API (add env var + read in `fetchWeather()`).

---
Please review: are there any behaviors or files you want the agent to avoid or be extra cautious about (e.g., UI text changes, DB migrations)? If you'd like, I can iterate and tighten this doc to match your preferred review process.