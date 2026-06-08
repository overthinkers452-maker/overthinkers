---
name: Supabase SSR WebSocket crash
description: Supabase createClient() throws "Node.js 20 detected without native WebSocket support" during Expo web SSR, crashing every page with a 500. Fix requires the `ws` package + conditional transport.
---

**Rule:** Any Expo web project using Supabase Realtime must provide a fallback WebSocket transport for Node.js 20 SSR, otherwise `createClient()` throws at module initialization time and the entire SSR render fails with a 500.

**Why:** Node.js 20 has no native `WebSocket` global. Supabase's realtime client detects this and throws immediately. Expo web uses Node.js for server-side rendering (SSR lambda), so the throw happens before any React component even renders, producing a blank page.

**How to apply:**
1. `pnpm --filter @workspace/mobile add ws`
2. In `lib/supabase.ts`, add before `createClient`:
   ```ts
   function getWsTransport() {
     if (typeof WebSocket !== "undefined") return undefined; // browser or RN — native WS
     try { return require("ws"); } catch { return undefined; }
   }
   ```
3. Pass `realtime: { transport: getWsTransport() }` to `createClient`.

The `typeof WebSocket !== "undefined"` guard ensures this only activates in the Node.js SSR context — browsers and React Native both have native WebSocket and skip the require entirely.
