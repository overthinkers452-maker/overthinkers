import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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
  changePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<AuthProfile>) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (!error && data) setProfile(data as AuthProfile);
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: trimmed, display_name: trimmed },
      },
    });
    return { error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  }, []);

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
    // Delete all user data from Supabase tables
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
    // Delete profile row
    try { await supabase.from("profiles").delete().eq("id", user.id); } catch {}
    // Sign out (auth user deletion requires service key; best we can do from client is sign out)
    await supabase.auth.signOut();
    setProfile(null);
    return { error: null };
  }, [user]);

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading,
      signUp, signIn, signOut, resetPassword, changePassword, refreshProfile, updateProfile, deleteAccount,
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
