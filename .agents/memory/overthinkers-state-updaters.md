---
name: overthinkers AppContext state-updater purity
description: Why nested/impure setState updaters in AppContext caused a returning-user crash, and the rule to avoid it.
---

# Impure / nested state updaters crash returning users

The `overthinkers` Expo app enables **React Compiler** (see `babel.config.js`).
React Compiler + Strict Mode treat `useState` updater functions as pure and may
double-invoke them. Calling another setter (or side effects like AsyncStorage
writes) *inside* an updater is a violation.

**The bug that bit us:** the publish-tick effect called `setThoughts(...)` nested
inside the `setScheduledThoughts(prev => { ... })` updater. It was a no-op on a
fresh preview (no scheduled items are ever immediately due — `publishAt` is always
a future 1 AM), so every screen rendered fine. But a **returning user** who had a
scheduled thought persisted in AsyncStorage with a now-past `publishAt` would hit
the due branch on mount → nested setState → runtime crash. This is why it was
invisible to screenshot-on-load debugging.

**Rule:** never call one state setter inside another setter's updater. Read the
"previous" value from a ref (synced via a small effect) or from current state,
compute the next values, then call each setter **sequentially** at the top level
of the handler. Also dedupe by id when moving items between lists so a
double-invoke can't insert duplicates.

**Where:** `artifacts/mobile/context/AppContext.tsx` — publish-tick `useEffect`
plus `scheduledRef` synced to `scheduledThoughts`.
