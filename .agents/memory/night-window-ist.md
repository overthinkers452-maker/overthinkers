---
name: 4AM feed window — IST timezone
description: How the 4AM feed window is calculated and enforced across the app.
---

The 4AM feed (latenight tab) is open 10 PM – 4 AM **Asia/Kolkata** (IST, UTC+5:30), regardless of user's device timezone.

**Why:** `d.getHours()` uses device local time; Indian users on non-IST devices saw the wrong window. The spec says the window is IST.

**How to apply:**
- `utils/nightWindow.ts` exports `isNightOpenIST()`, `minutesUntilOpenIST()`, `minutesUntilCloseIST()`. Uses manual UTC+5:30 offset (avoids `Intl` cross-platform edge cases in RN).
- `latenight.tsx` imports from nightWindow; local OPEN_HOUR/CLOSE_HOUR constants and functions were removed.
- `FlatList data={status.isOpen ? nightThoughts : []}` — visibility gated in the UI; DB data is kept, never deleted.
- `thoughtsService.fetchFeed` always adds `.eq("is_night_thought", false)` — night thoughts never appear in the main feed (they have a dedicated tab).
- `thoughtsService.searchThoughts` and `fetchProfileThoughts` add `.eq("is_night_thought", false)` only when `!isNightOpenIST()` — visible during window, hidden outside.
