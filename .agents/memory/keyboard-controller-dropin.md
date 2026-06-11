---
name: react-native-keyboard-controller drop-in for KeyboardAvoidingView
description: Why and how to swap RN's KeyboardAvoidingView for the keyboard-controller version.
---

React Native's built-in `KeyboardAvoidingView` with `behavior="height"` misbehaves on Android (especially in stacked navigation screens).

**Why:** The native module in `react-native-keyboard-controller` uses Android `WindowInsets` for precise keyboard height, while RN's version guesses.

**How to apply:**
- Replace `import { KeyboardAvoidingView } from "react-native"` with `import { KeyboardAvoidingView } from "react-native-keyboard-controller"` — identical API, drop-in swap.
- Applied to `app/thought/[id].tsx` (comment input screen).
- For modals (`KeyboardAvoidingView` from `react-native` wrapping a Modal): must add `behavior={Platform.OS === "ios" ? "padding" : "height"}` — `"padding"` alone silently fails on Android.
- Applied to `latenight.tsx` ComposeModal.
