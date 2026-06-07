import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Localization from "expo-localization";
import { supabase } from "@/lib/supabase";

export type AppLanguage = "en" | "el" | "es" | "fr" | "hi";

export const APP_LANGUAGES: { code: AppLanguage; label: string }[] = [
  { code: "en", label: "English" },
  { code: "el", label: "Ελληνικά (Greek)" },
  { code: "es", label: "Español (Spanish)" },
  { code: "fr", label: "Français (French)" },
  { code: "hi", label: "हिन्दी (Hindi)" },
];

export interface NotificationPrefs {
  appreciations: boolean;
  comments: boolean;
  follows: boolean;
  reposts: boolean;
}

export interface TwoFactorState {
  enabled: boolean;
  secret: string | null;
  backupCodes: string[];
}

export interface DeviceSession {
  id: string;
  device: string;
  platform: string;
  location: string;
  lastActiveISO: string;
  current: boolean;
}

export interface LoginEvent {
  id: string;
  device: string;
  platform: string;
  timeISO: string;
  status: "success" | "failed";
  location: string;
}

interface SettingsContextType {
  hapticsEnabled: boolean;
  setHapticsEnabled: (v: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  appLanguage: AppLanguage;
  setAppLanguage: (v: AppLanguage) => void;

  // Notifications
  notifications: NotificationPrefs;
  setNotification: (key: keyof NotificationPrefs, v: boolean) => void;

  // Privacy
  privateAccount: boolean;
  setPrivateAccount: (v: boolean) => void;
  hideDisagreements: boolean;
  setHideDisagreements: (v: boolean) => void;
  blockedWords: string[];
  addBlockedWord: (w: string) => void;
  removeBlockedWord: (w: string) => void;

  // Security
  twoFactor: TwoFactorState;
  enableTwoFactor: (secret: string, backupCodes: string[]) => void;
  disableTwoFactor: () => void;
  hasPassword: boolean;
  verifyPassword: (plain: string) => boolean;
  setPassword: (plain: string) => void;

  sessions: DeviceSession[];
  terminateOtherSessions: () => number;
  loginHistory: LoginEvent[];
  recordLogin: (status: "success" | "failed") => void;

  loaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const KEYS = {
  HAPTICS: "@overthinkers/settings/haptics",
  SOUND: "@overthinkers/settings/sound",
  LANG: "@overthinkers/settings/appLanguage",
  LANG_SET: "@overthinkers/settings/appLanguageUserSet",
  NOTIF: "@overthinkers/settings/notifications",
  PRIVATE: "@overthinkers/settings/privateAccount",
  HIDE_DIS: "@overthinkers/settings/hideDisagreements",
  BLOCKED_WORDS: "@overthinkers/settings/blockedWords",
  TWO_FACTOR: "@overthinkers/settings/twoFactor",
  PASSWORD: "@overthinkers/settings/passwordHash",
  SESSIONS: "@overthinkers/settings/sessions",
  LOGIN_HISTORY: "@overthinkers/settings/loginHistory",
};

// Lightweight, deterministic hash for a local-only demo account.
// NOT cryptographically secure — there is no auth backend; this only guards
// the in-app "change password" flow against trivial mismatches.
function simpleHash(s: string): string {
  let h1 = 0xdeadbeef ^ s.length;
  let h2 = 0x41c6ce57 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}

function deviceName(): string {
  return Constants.deviceName || (Platform.OS === "web" ? "Web Browser" : `${Platform.OS} device`);
}

function platformLabel(): string {
  if (Platform.OS === "web") return "Web";
  if (Platform.OS === "ios") return `iOS ${Platform.Version}`;
  if (Platform.OS === "android") return `Android ${Platform.Version}`;
  return String(Platform.OS);
}



const DEFAULT_NOTIF: NotificationPrefs = { appreciations: true, comments: true, follows: true, reposts: false };
const DEFAULT_2FA: TwoFactorState = { enabled: false, secret: null, backupCodes: [] };

function deviceLanguage(): AppLanguage {
  try {
    const locales = Localization.getLocales();
    const code = locales?.[0]?.languageCode?.toLowerCase();
    if (code && ["en", "el", "es", "fr", "hi"].includes(code)) return code as AppLanguage;
  } catch {}
  return "en";
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [hapticsEnabled, setHapticsState] = useState(false);
  const [soundEnabled, setSoundState] = useState(false);
  const [appLanguage, setLangState] = useState<AppLanguage>("en");

  const [notifications, setNotifications] = useState<NotificationPrefs>(DEFAULT_NOTIF);
  const [privateAccount, setPrivateState] = useState(false);
  const [hideDisagreements, setHideDisState] = useState(false);
  const [blockedWords, setBlockedWords] = useState<string[]>([]);
  const [twoFactor, setTwoFactorState] = useState<TwoFactorState>(DEFAULT_2FA);
  const [passwordHash, setPasswordHash] = useState<string | null>(null);
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet([
          KEYS.HAPTICS, KEYS.SOUND, KEYS.LANG, KEYS.LANG_SET, KEYS.NOTIF, KEYS.PRIVATE,
          KEYS.HIDE_DIS, KEYS.BLOCKED_WORDS, KEYS.TWO_FACTOR, KEYS.PASSWORD,
          KEYS.SESSIONS, KEYS.LOGIN_HISTORY,
        ]);
        const map = Object.fromEntries(entries);

        if (map[KEYS.HAPTICS] != null) setHapticsState(map[KEYS.HAPTICS] === "1");
        if (map[KEYS.SOUND] != null) setSoundState(map[KEYS.SOUND] === "1");

        // Language: explicit user choice wins; otherwise fall back to device locale.
        const langVal = map[KEYS.LANG];
        if (map[KEYS.LANG_SET] === "1" && langVal && ["en", "el", "es", "fr", "hi"].includes(langVal)) {
          setLangState(langVal as AppLanguage);
        } else {
          setLangState(deviceLanguage());
        }

        const notifVal = map[KEYS.NOTIF];
        if (notifVal) {
          try { setNotifications({ ...DEFAULT_NOTIF, ...JSON.parse(notifVal) }); } catch {}
        }
        if (map[KEYS.PRIVATE] != null) setPrivateState(map[KEYS.PRIVATE] === "1");
        if (map[KEYS.HIDE_DIS] != null) setHideDisState(map[KEYS.HIDE_DIS] === "1");
        const blockedWordsVal = map[KEYS.BLOCKED_WORDS];
        if (blockedWordsVal) {
          try { const arr = JSON.parse(blockedWordsVal); if (Array.isArray(arr)) setBlockedWords(arr); } catch {}
        }
        const twoFactorVal = map[KEYS.TWO_FACTOR];
        if (twoFactorVal) {
          try { setTwoFactorState({ ...DEFAULT_2FA, ...JSON.parse(twoFactorVal) }); } catch {}
        }
        const passwordVal = map[KEYS.PASSWORD];
        if (passwordVal) setPasswordHash(passwordVal);

        // Sessions: only track the real current device — no mock sessions
        let sess: DeviceSession[] = [];
        const sessionsVal = map[KEYS.SESSIONS];
        if (sessionsVal) {
          try { sess = JSON.parse(sessionsVal); } catch {}
        }
        // Keep only the current-device session; filter out any old mock entries
        const realSess = sess.filter((s: DeviceSession) => s.current);
        if (realSess.length === 0) {
          const currentSess: DeviceSession = {
            id: "current",
            device: deviceName(),
            platform: platformLabel(),
            location: "This device",
            lastActiveISO: new Date().toISOString(),
            current: true,
          };
          sess = [currentSess];
          AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sess)).catch(() => {});
        } else {
          sess = realSess;
        }
        setSessions(sess);

        // Login history: start from current login only, no mock history
        let hist: LoginEvent[] = [];
        const historyVal = map[KEYS.LOGIN_HISTORY];
        if (historyVal) {
          try { hist = JSON.parse(historyVal); } catch {}
        }
        // Filter out any mock entries (those with hardcoded device names)
        const realHist = hist.filter((h: LoginEvent) => h.id !== "lh1" && h.id !== "lh2" && h.id !== "lh3" && h.id !== "lh4");
        if (realHist.length === 0 && hist.length === 0) {
          // First ever load — record this login
          const firstLogin: LoginEvent = {
            id: Date.now().toString(),
            device: deviceName(),
            platform: platformLabel(),
            timeISO: new Date().toISOString(),
            status: "success",
            location: "This device",
          };
          hist = [firstLogin];
          AsyncStorage.setItem(KEYS.LOGIN_HISTORY, JSON.stringify(hist)).catch(() => {});
        } else if (realHist.length > 0) {
          hist = realHist;
          AsyncStorage.setItem(KEYS.LOGIN_HISTORY, JSON.stringify(hist)).catch(() => {});
        }
        setLoginHistory(hist);
      } catch {}
      setLoaded(true);
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
    AsyncStorage.multiSet([[KEYS.LANG, v], [KEYS.LANG_SET, "1"]]).catch(() => {});
  }, []);

  const setNotification = useCallback((key: keyof NotificationPrefs, v: boolean) => {
    setNotifications((prev) => {
      const next = { ...prev, [key]: v };
      AsyncStorage.setItem(KEYS.NOTIF, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setPrivateAccount = useCallback((v: boolean) => {
    setPrivateState(v);
    AsyncStorage.setItem(KEYS.PRIVATE, v ? "1" : "0").catch(() => {});
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from("profiles").update({ is_private: v }).eq("id", data.user.id).then(undefined, () => {});
      }
    }).catch(() => {});
  }, []);

  const setHideDisagreements = useCallback((v: boolean) => {
    setHideDisState(v);
    AsyncStorage.setItem(KEYS.HIDE_DIS, v ? "1" : "0").catch(() => {});
  }, []);

  const addBlockedWord = useCallback((w: string) => {
    const word = w.trim().toLowerCase();
    if (!word) return;
    setBlockedWords((prev) => {
      if (prev.includes(word)) return prev;
      const next = [...prev, word];
      AsyncStorage.setItem(KEYS.BLOCKED_WORDS, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const removeBlockedWord = useCallback((w: string) => {
    setBlockedWords((prev) => {
      const next = prev.filter((x) => x !== w);
      AsyncStorage.setItem(KEYS.BLOCKED_WORDS, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const enableTwoFactor = useCallback((secret: string, backupCodes: string[]) => {
    const next: TwoFactorState = { enabled: true, secret, backupCodes };
    setTwoFactorState(next);
    AsyncStorage.setItem(KEYS.TWO_FACTOR, JSON.stringify(next)).catch(() => {});
  }, []);

  const disableTwoFactor = useCallback(() => {
    setTwoFactorState(DEFAULT_2FA);
    AsyncStorage.setItem(KEYS.TWO_FACTOR, JSON.stringify(DEFAULT_2FA)).catch(() => {});
  }, []);

  const setPassword = useCallback((plain: string) => {
    const hash = simpleHash(plain);
    setPasswordHash(hash);
    AsyncStorage.setItem(KEYS.PASSWORD, hash).catch(() => {});
  }, []);

  const verifyPassword = useCallback((plain: string) => {
    if (!passwordHash) return false;
    return simpleHash(plain) === passwordHash;
  }, [passwordHash]);

  const terminateOtherSessions = useCallback(() => {
    let removed = 0;
    setSessions((prev) => {
      removed = prev.filter((s) => !s.current).length;
      const next = prev.filter((s) => s.current);
      AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(next)).catch(() => {});
      return next;
    });
    return removed;
  }, []);

  const recordLogin = useCallback((status: "success" | "failed") => {
    const entry: LoginEvent = {
      id: Date.now().toString(),
      device: deviceName(),
      platform: platformLabel(),
      timeISO: new Date().toISOString(),
      status,
      location: "This device",
    };
    setLoginHistory((prev) => {
      const next = [entry, ...prev].slice(0, 50);
      AsyncStorage.setItem(KEYS.LOGIN_HISTORY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<SettingsContextType>(() => ({
    hapticsEnabled, setHapticsEnabled,
    soundEnabled, setSoundEnabled,
    appLanguage, setAppLanguage,
    notifications, setNotification,
    privateAccount, setPrivateAccount,
    hideDisagreements, setHideDisagreements,
    blockedWords, addBlockedWord, removeBlockedWord,
    twoFactor, enableTwoFactor, disableTwoFactor,
    hasPassword: passwordHash != null,
    verifyPassword, setPassword,
    sessions, terminateOtherSessions,
    loginHistory, recordLogin,
    loaded,
  }), [
    hapticsEnabled, setHapticsEnabled, soundEnabled, setSoundEnabled, appLanguage, setAppLanguage,
    notifications, setNotification, privateAccount, setPrivateAccount, hideDisagreements, setHideDisagreements,
    blockedWords, addBlockedWord, removeBlockedWord, twoFactor, enableTwoFactor, disableTwoFactor,
    passwordHash, verifyPassword, setPassword, sessions, terminateOtherSessions, loginHistory, recordLogin, loaded,
  ]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
