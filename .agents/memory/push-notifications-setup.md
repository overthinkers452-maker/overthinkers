---
name: Push notifications + pnpm + Metro
description: How push notifications are wired in overthinkers and the pnpm/Metro gotchas encountered during setup.
---

## Rule
expo-notifications and expo-device must be added to the **mobile artifact's** package.json (not just the workspace root). After changing versions, clear `.expo/metro-cache` and `node_modules/.cache` before restarting, otherwise Metro serves stale transform cache and reports UnableToResolveError even though the symlink exists.

**Why:** pnpm workspaces hoist packages but Metro resolves from the file's directory outward. If the version changes while Metro is running, the old transform cache holds a reference to the old module path which no longer symlinks correctly.

**How to apply:** Any time expo-notifications (or any native module) is installed or version-bumped:
1. `pnpm --filter @workspace/mobile add <pkg>@<version>`
2. `rm -rf artifacts/mobile/.expo/metro-cache node_modules/.cache`
3. Restart the expo workflow

## Architecture — overthinkers push notification system

- **`lib/pushNotifications.ts`** — all push logic. Calls `Notifications.getExpoPushTokenAsync()`, stores token in `profiles.push_token`, sends via Expo Push API (`https://exp.host/--/api/v2/push/send`). All functions guard `Platform.OS === "web"` and are fire-and-forget (never throw to callers).
- **`_layout.tsx` → `PushNotificationManager`** — mounts after `AuthGate`. Registers token whenever `user.id` changes. Sets up `addNotificationResponseReceivedListener` to navigate on tap: `data.thoughtId` → `/thought/[id]`, `data.actorId` → `/profile/[userId]`.
- **`lib/thoughtsService.ts`** — push calls added to: `toggleAppreciation` (sends to thought author), `createComment` (sends to thought author, respects posting mode for display name), `toggleFollow` (sends to followed user), `toggleRepost` (sends to original author, skips anonymous posts).
- **`app.json`** — expo-notifications plugin registered with brand color `#5B5BD6`; Android permissions `VIBRATE` + `RECEIVE_BOOT_COMPLETED`.
- **`supabase/schema.sql`** — `push_token text` column added to profiles table.

## Android notification channels
Four channels registered on Android: `default`, `appreciations` (amber), `comments` (indigo), `follows` (green).

## Permission API quirk
`expo-notifications@0.32.x` — `getPermissionsAsync()` / `requestPermissionsAsync()` return `NotificationPermissionsStatus` which extends `PermissionResponse`. TypeScript may fail to resolve `granted`/`status` properties due to version skew between expo and expo-modules-core. Safe workaround: cast result to `any` and read `result.granted ?? (result.status === 'granted')`.

## Correct package versions (expo 54.x)
- `expo-notifications@~0.32.17`
- `expo-device@~8.0.10`
