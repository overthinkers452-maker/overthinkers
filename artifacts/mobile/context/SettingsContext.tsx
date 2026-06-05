import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppLanguage = "en" | "el" | "es" | "fr" | "hi";

export const APP_LANGUAGES: { code: AppLanguage; label: string }[] = [
  { code: "en", label: "English" },
  { code: "el", label: "Ελληνικά (Greek)" },
  { code: "es", label: "Español (Spanish)" },
  { code: "fr", label: "Français (French)" },
  { code: "hi", label: "हिन्दी (Hindi)" },
];

interface SettingsContextType {
  hapticsEnabled: boolean;
  setHapticsEnabled: (v: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  appLanguage: AppLanguage;
  setAppLanguage: (v: AppLanguage) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const KEYS = {
  HAPTICS: "@overthinkers/settings/haptics",
  SOUND: "@overthinkers/settings/sound",
  LANG: "@overthinkers/settings/appLanguage",
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // Defaults: haptics OFF, sound OFF, English.
  const [hapticsEnabled, setHapticsState] = useState(false);
  const [soundEnabled, setSoundState] = useState(false);
  const [appLanguage, setLangState] = useState<AppLanguage>("en");

  useEffect(() => {
    (async () => {
      try {
        const [h, s, l] = await Promise.all([
          AsyncStorage.getItem(KEYS.HAPTICS),
          AsyncStorage.getItem(KEYS.SOUND),
          AsyncStorage.getItem(KEYS.LANG),
        ]);
        if (h != null) setHapticsState(h === "1");
        if (s != null) setSoundState(s === "1");
        if (l && ["en", "el", "es", "fr", "hi"].includes(l)) setLangState(l as AppLanguage);
      } catch {}
    })();
  }, []);

  const setHapticsEnabled = useCallback((v: boolean) => {
    setHapticsState(v);
    AsyncStorage.setItem(KEYS.HAPTICS, v ? "1" : "0").catch(() => {});
  }, []);

  const setSoundEnabled = useCallback((v: boolean) => {
    setSoundState(v);
    AsyncStorage.setItem(KEYS.SOUND, v ? "1" : "0").catch(() => {});
  }, []);

  const setAppLanguage = useCallback((v: AppLanguage) => {
    setLangState(v);
    AsyncStorage.setItem(KEYS.LANG, v).catch(() => {});
  }, []);

  return (
    <SettingsContext.Provider
      value={{ hapticsEnabled, setHapticsEnabled, soundEnabled, setSoundEnabled, appLanguage, setAppLanguage }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
