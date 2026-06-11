import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Metro resolves platform-specific files first:
//   supabase.native.ts  → iOS and Android (no ws, uses native WebSocket)
//   supabase.web.ts     → Expo web (browser + SSR, uses ws polyfill for Node.js 20)
// This file is the generic fallback — kept clean so it never pulls in Node.js modules.

console.log("🔧 SUPABASE (generic): URL value:", supabaseUrl?.length > 0 ? supabaseUrl.substring(0, 20) + "..." : "EMPTY");
console.log("🔧 SUPABASE (generic): Anon Key set:", !!supabaseAnonKey, "length:", supabaseAnonKey?.length);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === "web" ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    transport: undefined,
    heartbeatIntervalMs: 15000,
  },
});

// ─── Diagnostic logging ───────────────────────────────────────────
let loggedSession = false;
supabase.auth.getSession().then(({ data, error }) => {
  if (!loggedSession) {
    console.log("🔧 SESSION (generic):", data?.session ? "Found" : "None");
    if (error) console.log("🔧 SESSION ERROR (generic):", error.message);
    loggedSession = true;
  }
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          bio: string | null;
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
          is_banned: boolean;
          banned_reason: string | null;
          push_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      thoughts: {
        Row: {
          id: string;
          author_id: string;
          content: string;
          category: string;
          posting_mode: "Public" | "Pseudonymous" | "Anonymous";
          alias: string | null;
          type: "standard" | "poll";
          poll_data: unknown | null;
          appreciations: number;
          disagreements: number;
          reposts: number;
          saves: number;
          comments: number;
          report_count: number;
          quality_score: number;
          is_edited: boolean;
          edited_at: string | null;
          is_repost: boolean;
          original_thought_id: string | null;
          original_author_id: string | null;
          is_night_thought: boolean;
          feed_reason: string | null;
          media_url: string | null;
          language: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["thoughts"]["Row"], "created_at" | "updated_at" | "appreciations" | "disagreements" | "reposts" | "saves" | "comments" | "report_count" | "quality_score">;
        Update: Partial<Database["public"]["Tables"]["thoughts"]["Insert"]>;
      };
      comments: {
        Row: {
          id: string;
          thought_id: string;
          author_id: string;
          content: string;
          posting_mode: "Public" | "Pseudonymous" | "Anonymous";
          alias: string | null;
          parent_id: string | null;
          depth: number;
          appreciations: number;
          report_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["comments"]["Row"], "created_at" | "updated_at" | "appreciations" | "report_count">;
        Update: Partial<Database["public"]["Tables"]["comments"]["Insert"]>;
      };
      appreciations: {
        Row: { id: string; user_id: string; thought_id: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["appreciations"]["Row"], "id" | "created_at">;
        Update: never;
      };
      disagreements: {
        Row: { id: string; user_id: string; thought_id: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["disagreements"]["Row"], "id" | "created_at">;
        Update: never;
      };
      saves: {
        Row: { id: string; user_id: string; thought_id: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["saves"]["Row"], "id" | "created_at">;
        Update: never;
      };
      reposts: {
        Row: { id: string; user_id: string; thought_id: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["reposts"]["Row"], "id" | "created_at">;
        Update: never;
      };
      follows: {
        Row: { id: string; follower_id: string; following_id: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["follows"]["Row"], "id" | "created_at">;
        Update: never;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: "appreciation" | "comment" | "repost" | "follow" | "badge" | "reply" | "mention" | "system";
          actor_id: string | null;
          thought_id: string | null;
          comment_id: string | null;
          message: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at" | "read">;
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          thought_id: string | null;
          comment_id: string | null;
          reason: string;
          description: string | null;
          dismissed_at: string | null;
          dismissed_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reports"]["Row"], "id" | "created_at">;
        Update: never;
      };
      blocks: {
        Row: { id: string; blocker_id: string; blocked_id: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["blocks"]["Row"], "id" | "created_at">;
        Update: never;
      };
      poll_votes: {
        Row: { id: string; user_id: string; thought_id: string; option_index: number; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["poll_votes"]["Row"], "id" | "created_at">;
        Update: never;
      };
      comment_appreciations: {
        Row: { id: string; user_id: string; comment_id: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["comment_appreciations"]["Row"], "id" | "created_at">;
        Update: never;
      };
      mutes: {
        Row: { id: string; muter_id: string; muted_id: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["mutes"]["Row"], "id" | "created_at">;
        Update: never;
      };
      security_logs: {
        Row: {
          id: string;
          user_id: string;
          event_type: "login_success" | "login_fail" | "password_change" | "signout" | "signup";
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["security_logs"]["Row"], "id" | "created_at">;
        Update: never;
      };
      hashtags: {
        Row: { id: string; tag: string; usage_count: number; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["hashtags"]["Row"], "id" | "created_at" | "usage_count">;
        Update: Partial<Database["public"]["Tables"]["hashtags"]["Row"]>;
      };
      thought_hashtags: {
        Row: { id: string; thought_id: string; hashtag_id: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["thought_hashtags"]["Row"], "id" | "created_at">;
        Update: never;
      };
      moderation_actions: {
        Row: {
          id: string;
          moderator_id: string | null;
          target_type: "thought" | "comment" | "user";
          target_id: string;
          action: "dismiss" | "remove" | "warn" | "ban";
          note: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["moderation_actions"]["Row"], "id" | "created_at">;
        Update: never;
      };
      user_strikes: {
        Row: {
          id: string;
          user_id: string;
          reason: string;
          issued_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["user_strikes"]["Row"], "id" | "created_at">;
        Update: never;
      };
      // ─── Night Window Tables ─────────────────────────────────
      night_activity: {
        Row: {
          id: string;
          user_id: string;
          session_date: string;
          mood_emoji: string | null;
          thoughts_posted: number;
          appreciations_received: number;
          appreciations_given: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["night_activity"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["night_activity"]["Insert"]>;
      };
      night_streaks: {
        Row: {
          id: string;
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_active_date: string | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["night_streaks"]["Row"], "id" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["night_streaks"]["Insert"]>;
      };
      night_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["night_badges"]["Row"], "id" | "earned_at">;
        Update: never;
      };
      // ─── User Sessions ────────────────────────────────────────
      user_sessions: {
        Row: {
          id: string;
          user_id: string;
          device: string;
          platform: string;
          last_active: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["user_sessions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["user_sessions"]["Insert"]>;
      };
      // ─── Conversations & Messages ─────────────────────────────
      conversations: {
        Row: { id: string; created_at: string; updated_at: string };
        Insert: Omit<Database["public"]["Tables"]["conversations"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["conversations"]["Row"]>;
      };
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          unread_count: number;
          last_read_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["conversation_participants"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["conversation_participants"]["Row"]>;
      };
      messages: {
        Row: { id: string; conversation_id: string; sender_id: string; content: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["messages"]["Row"], "id" | "created_at">;
        Update: never;
      };
      // ─── Realtime Diagnostic ──────────────────────────────────
      realtime_test: {
        Row: { id: number; message: string | null; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["realtime_test"]["Row"], "id" | "created_at">;
        Update: never;
      };
    };
  };
};
