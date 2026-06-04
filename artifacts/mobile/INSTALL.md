# overthinkers — Installation Guide

> A quality-first anonymous and pseudonymous discussion platform.
> Think freely. Post honestly.

---

## App Features

- **Three posting modes** — Public (your name), Pseudonymous (alias), Anonymous (no trace)
- **Quality Score ranking** — thoughts ranked by a formula, not raw popularity
- **Four feed types** — For You, Trending, Latest, Following
- **Polls** — up to 4 options, 24h / 48h / 7d durations
- **Threaded comments** — up to 3 levels deep, with appreciation on comments
- **30-minute edit window** — edit any thought within 30 minutes of posting
- **Report system** — report thoughts; score penalised at −10 per report
- **Live leaderboard** — ranked by total appreciations from non-anonymous posts
- **Gamification** — Newcomer → Thoughtful → Insightful → Elder badges
- **Dark / light mode** — follows system preference

---

## Option A — Progressive Web App (Android, iOS, Desktop)

The fastest way to install. No app store needed.

**Live URL:**
```
https://<your-replit-domain>/mobile/
```

### Android (Chrome)

1. Open Chrome on your Android device
2. Navigate to the URL above
3. Tap the three-dot menu (⋮) → **"Add to Home Screen"**
4. Tap **Add** — the app icon appears on your home screen
5. Launch it from the home screen — it opens in full-screen, no browser chrome

### iOS (Safari)

1. Open Safari on your iPhone or iPad
2. Navigate to the URL above
3. Tap the Share button (□↑) at the bottom
4. Scroll down and tap **"Add to Home Screen"**
5. Tap **Add** — the app icon appears on your home screen

### Desktop (Chrome / Edge)

1. Navigate to the URL in Chrome or Edge
2. Click the install icon (⊕) in the address bar
3. Click **Install**
4. The app opens as a standalone window

**Permissions required:** None  
**Storage:** ~2 MB (local AsyncStorage for your posts and settings)  
**Offline:** Works offline once loaded; changes sync on reconnect

---

## Option B — Native Android APK (via EAS Build)

Generates a real `.apk` file installable on any Android device.

### Prerequisites

- Node.js 18+ and pnpm installed
- A free [Expo account](https://expo.dev/signup)
- EAS CLI: `npm install -g eas-cli`

### Steps

```bash
# 1. Clone the project or open it in your dev environment

# 2. Log in to Expo
eas login

# 3. Navigate to the mobile artifact
cd artifacts/mobile

# 4. Build the APK (free tier, no signing key needed for sideloading)
eas build --platform android --profile preview

# 5. Wait ~10–15 minutes. EAS emails you when done.
# Download the .apk from https://expo.dev/accounts/<you>/projects/mobile/builds

# 6. Transfer the .apk to your Android device and install it
#    (You may need to enable "Install unknown apps" in Settings → Security)
```

**Build profiles available:**
| Profile | Output | Use for |
|---|---|---|
| `preview` | `.apk` | Direct sideloading on any Android |
| `production` | `.aab` | Google Play Store submission |
| `development` | `.apk` (debug) | Testing with Expo Dev Client |

**Permissions:**
- No special permissions are required. The app does not access Camera, Microphone, Contacts, or Location.

---

## Option C — iOS IPA (via EAS Build)

Requires an **Apple Developer account** ($99/year).

```bash
# From artifacts/mobile/
eas build --platform ios --profile preview
```

You will be prompted to link your Apple Developer account. EAS handles signing automatically.

For TestFlight distribution:
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

---

## System Requirements

| Platform | Minimum |
|---|---|
| Android PWA | Chrome 80+, Android 8.0+ |
| iOS PWA | Safari 14+, iOS 14.0+ |
| Android APK | Android 8.0+ (API 26+) |
| iOS native | iOS 16.0+ |
| Desktop PWA | Chrome 80+ or Edge 80+ |

**Data:** All data is stored locally on your device using AsyncStorage. Nothing is sent to a server.

---

## Updating

**PWA:** Automatically updates when you open it — no action needed.

**APK:** Re-run `eas build --platform android --profile preview` and reinstall the new `.apk`.

---

## Troubleshooting

**PWA won't install on Android:**
→ Make sure you're using Chrome (not Samsung Internet or Firefox for PWA prompts)

**"Install unknown apps" not available:**
→ Settings → Apps → Special app access → Install unknown apps → Chrome → Allow

**APK build fails:**
→ Run `eas whoami` to confirm you're logged in
→ Check [expo.dev](https://expo.dev) for build logs

---

## Support

For issues, open the app and use the feedback option in your Profile settings.
