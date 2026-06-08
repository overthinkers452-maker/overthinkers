import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

// Node.js 20 has no native WebSocket. When running in SSR (Expo web server-side
// render) we supply the `ws` package as the realtime transport so that
// createClient() does not throw and crash the SSR page with a 500.
// In browsers and React Native, `WebSocket` is always defined natively, so we
// leave the transport undefined and let Supabase use its default.
function getWsTransport() {
  if (typeof WebSocket !== "undefined") return undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("ws");
  } catch {
    return undefined;
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === "web" ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    transport: getWsTransport(),
  },
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
          type: "appreciation" | "comment" | "repost" | "follow" | "badge" | "reply";
          actor_id: string | null;
          thought_id: string | null;
          comment_id: string | null;
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
    };
  };
};
