---
name: Metro + pnpm transitive deps
description: Why some third-party RN libs fail to bundle under pnpm with "Unable to resolve module X", and the fix.
---

# Metro + pnpm can't resolve a library's transitive deps

Under pnpm's strict (non-hoisted) `node_modules`, Metro resolves modules relative to the importing file. A third-party library that imports a transitive dependency it does NOT declare directly will fail to bundle with `UnableToResolveError Unable to resolve module <X>`.

Concrete case in `artifacts/mobile`: `react-native-qrcode-svg` → `qrcode` → `dijkstrajs`. `qrcode` imports `dijkstrajs` but it wasn't reachable, so the 2FA QR screen threw at bundle time even though typecheck passed.

**Why:** pnpm does not flatten transitive deps into a single top-level `node_modules`, and Metro has no automatic peer/transitive hoisting like webpack sometimes does.

**How to apply:** when a RN/Expo library throws `Unable to resolve module <X>` at bundle time (not a typecheck error), add the missing transitive dep directly to the artifact: `pnpm --filter @workspace/<slug> add <X>`, then restart the expo workflow to clear Metro's cache. The error only surfaces at runtime/bundle in the browser console, never in `tsc`.
