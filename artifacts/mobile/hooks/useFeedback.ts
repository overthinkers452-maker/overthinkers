import { useCallback } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useSettings } from "@/context/SettingsContext";

type Tone = "tap" | "success" | "select";

/** Play a short, unobtrusive tone using the Web Audio API (web preview only).
 *  On native we have no bundled audio asset, so this is a graceful no-op there. */
function playTone(tone: Tone) {
  if (Platform.OS !== "web") return;
  try {
    const AudioCtx = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const freq = tone === "success" ? 660 : tone === "select" ? 440 : 520;
    osc.frequency.value = freq;
    osc.type = "sine";
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.start(now);
    osc.stop(now + 0.18);
    osc.onended = () => ctx.close().catch(() => {});
  } catch {}
}

/** Centralised, user-controllable feedback. Haptics and sound are both OFF by
 *  default and only fire when the user has explicitly enabled them in Settings. */
export function useFeedback() {
  const { hapticsEnabled, soundEnabled } = useSettings();

  const tap = useCallback(() => {
    if (hapticsEnabled && Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (soundEnabled) playTone("tap");
  }, [hapticsEnabled, soundEnabled]);

  const select = useCallback(() => {
    if (hapticsEnabled && Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    if (soundEnabled) playTone("select");
  }, [hapticsEnabled, soundEnabled]);

  const success = useCallback(() => {
    if (hapticsEnabled && Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (soundEnabled) playTone("success");
  }, [hapticsEnabled, soundEnabled]);

  return { tap, select, success };
}
