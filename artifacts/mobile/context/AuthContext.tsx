import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { logSecurityEvent, upsertUserSession } from "@/lib/thoughtsService";

function currentDevice(): string {
  if (Platform.OS === "web") return "Web Browser";
  if (Platform.OS === "ios") return "iPhone";
  if (Platform.OS === "android") return "Android";
  return Platform.OS ?? "Unknown";
}
function currentPlatform(): string {
  if (Platform.OS === "web") return "Web";
  if (Platform.OS === "ios") return `iOS ${Platform.Version}`;
  if (Platform.OS === "android") return `Android ${Platform.Version}`;
  return Platform.OS ?? "Unknown";
}

export interface AuthProfile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  banner_url: string | null;
  reputation: number;
  badge: string;
  followers_count: number;
  following_count: number;
  thoughts_count: number;
  username_changed_at: string | null;
  is_private: boolean;
  hide_appreciations: boolean;
  hide_reposts: boolean;
  is_admin: boolean;
  is_moderator: boolean;
  strike_count: number;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: AuthError | Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  resendVerification: (email: string) => Promise<{ error: AuthError | null }>;
  changePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<AuthProfile>) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Retry fetching the profile a few times — the DB trigger may be slightly
// delayed right after a new user signs up.
async function fetchProfileWithRetry(userId: string, attempts = 4): Promise<AuthProfile | null> {
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (!error && data) return data as AuthProfile;
    if (i < attempts - 1) {
      await new Promise(res => setTimeout(res, 600 * (i + 1)));
    }
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const data = await fetchProfileWithRetry(userId);
    if (data) setProfile(data);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchProfile(s.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    const trimmed = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) {
      return { error: new Error("Username must be 3–20 characters: letters, numbers, or underscores.") };
    }

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", trimmed)
      .maybeSingle();
    if (existing) return { error: new Error("That username is already taken.") };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: trimmed, display_name: trimmed },
      },
    });

    if (!error && data.user) {
      // Upsert profile as a fallback in case the DB trigger hasn't been set up
      // or hasn't fired yet. The trigger (if present) uses ON CONFLICT DO NOTHING,
      // so running both is safe.
      await supabase.from("profiles").upsert({
        id: data.user.id,
        username: trimmed,
        display_name: trimmed,
        bio: "",
        reputation: 0,
        badge: "Newcomer",
        followers_count: 0,
        following_count: 0,
        thoughts_count: 0,
      }, { onConflict: "id", ignoreDuplicates: false }).then(undefined, () => {});
      logSecurityEvent(data.user.id, "signup").catch(() => {});
    }

    return { error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const device = currentDevice();
    const platform = currentPlatform();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (data?.user) {
      logSecurityEvent(data.user.id, "login_success", { device, platform }).catch(() => {});
      upsertUserSession(data.user.id, device, platform).catch(() => {});
    } else if (error) {
      const { data: { user: maybeUser } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      if (maybeUser) logSecurityEvent(maybeUser.id, "login_fail", { device, platform }).catch(() => {});
    }
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    const uid = user?.id;
    await supabase.auth.signOut();
    if (uid) logSecurityEvent(uid, "signout", { device: currentDevice(), platform: currentPlatform() }).catch(() => {});
    setProfile(null);
  }, [user]);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    return { error };
  }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error && user?.id) logSecurityEvent(user.id, "password_change").catch(() => {});
    return { error };
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<AuthProfile>) => {
    if (!user) return { error: new Error("Not authenticated") };

    if (updates.username) {
      const trimmed = updates.username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) {
        return { error: new Error("Username must be 3–20 characters: letters, numbers, or underscores.") };
      }
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", trimmed)
        .neq("id", user.id)
        .maybeSingle();
      if (existing) return { error: new Error("That username is already taken.") };

      if (profile?.username_changed_at) {
        const cooldown = 14 * 24 * 3600000;
        const elapsed = Date.now() - new Date(profile.username_changed_at).getTime();
        if (elapsed < cooldown) {
          const next = new Date(new Date(profile.username_changed_at).getTime() + cooldown);
          return { error: new Error(`You can change your username again after ${next.toLocaleDateString()}.`) };
        }
      }
      updates.username_changed_at = new Date().toISOString();
    }

    const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
    if (!error) await refreshProfile();
    return { error: error ? new Error(error.message) : null };
  }, [user, profile, refreshProfile]);

  const deleteAccount = useCallback(async () => {
    if (!user) return { error: new Error("Not authenticated") };
    try {
      await Promise.all([
        supabase.from("thoughts").delete().eq("author_id", user.id),
        supabase.from("comments").delete().eq("author_id", user.id),
        supabase.from("appreciations").delete().eq("user_id", user.id),
        supabase.from("saves").delete().eq("user_id", user.id),
        supabase.from("follows").delete().eq("follower_id", user.id),
        supabase.from("blocks").delete().eq("blocker_id", user.id),
        supabase.from("notifications").delete().eq("user_id", user.id),
      ]);
    } catch {}
    try { await supabase.from("profiles").delete().eq("id", user.id); } catch {}
    await supabase.auth.signOut();
    setProfile(null);
    return { error: null };
  }, [user]);

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading,
      signUp, signIn, signOut, resetPassword, resendVerification, changePassword, refreshProfile, updateProfile, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
