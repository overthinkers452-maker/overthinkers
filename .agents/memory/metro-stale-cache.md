---
name: Metro phantom SyntaxError from stale cache
description: When Metro reports a Babel parse error that tsc and standalone babel-parser cannot reproduce, it is a stale transform cache, not a real syntax error.
---

# Metro phantom SyntaxError from stale transform cache

If Metro/Expo reports `SyntaxError: ... Unexpected token (L:C)` for a file but
`pnpm --filter @workspace/mobile run typecheck` passes AND parsing the same file
directly with `@babel/parser` (`plugins: ["typescript","jsx"]`) returns `PARSE OK`,
the error is a **stale Metro transform cache** — usually left over from a file that
was saved mid-edit (e.g. during a large rewrite).

**Why:** Metro caches per-file transforms; a restart alone does not always purge the
cache, so it keeps replaying the broken intermediate version. The reported line/col
points at valid code, which is the tell that it is stale, not real.

**How to apply:** Clear Metro caches, then restart the workflow:
`rm -rf $TMPDIR/metro-* /tmp/metro-* artifacts/mobile/.expo/cache node_modules/.cache/metro`
then `restart_workflow "artifacts/mobile: expo"`. Confirm via fresh logs (no
SyntaxError, "Web Bundled ... modules") and a clean browser console.
