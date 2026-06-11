---
name: Supabase SSR WebSocket crash + Android ws bundling
description: Two related issues — Expo web SSR crashes on Node.js 20 without ws, but putting ws in a shared supabase.ts causes Android UnableToResolveError for "stream". Proper fix is platform-specific files.
---

**Rule:** Never put `require("ws")` in a shared `supabase.ts`. Use Metro platform-specific file resolution instead.

**Why:** Metro does *static* analysis of `require()` calls. A runtime guard like `typeof WebSocket !== "undefined"` does NOT prevent Metro from bundling `ws` into the Android/iOS bundle. `ws` depends on Node.js-only modules (`stream`, `net`, `tls`, `http`, etc.) which Metro cannot resolve on Android → `UnableToResolveError: stream`.

**Proper fix — platform-specific files:**
- `lib/supabase.native.ts` → React Native (iOS + Android). No `ws`, no `getWsTransport`. Metro picks this automatically for `platform=android` and `platform=ios`.
- `lib/supabase.web.ts` → Expo web (browser + SSR Node.js 20). Includes `getWsTransport()` which `require("ws")` only in SSR. Metro picks this for `platform=web`.
- `lib/supabase.ts` → Clean fallback (no `ws`). Metro only uses this if no platform-specific file matches.

**What NOT to do:** A single `supabase.ts` with `require("ws")` behind any runtime guard — Metro bundles `ws` regardless.

**Env vars:** `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` — both are public (anon key is safe to expose). Set as `shared` env vars via `setEnvVars`, not secrets.
