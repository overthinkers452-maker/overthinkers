import { createClient, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

// ─── Log Supabase URL at module load ───────────────────────────────
console.log("🔧 SUPABASE URL:", supabaseUrl);
console.log("🔧 SUPABASE ANON KEY SET:", !!supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    // On React Native, the native WebSocket global is available.
    // No need for a custom transport. Leave undefined to use the
    // platform's built-in WebSocket.
    transport: undefined,
    // Enable heartbeat to detect stale connections
    heartbeatIntervalMs: 15000,
  },
});

// ─── Connection status logging ─────────────────────────────────────
let loggedSession = false;

supabase.auth.getSession().then(({ data, error }) => {
  if (!loggedSession) {
    console.log("🔧 SESSION:", data?.session ? "Found" : "None");
    console.log("🔧 SESSION USER:", data?.session?.user?.id ?? "N/A");
    if (error) console.log("🔧 SESSION ERROR:", error.message);
    loggedSession = true;
  }
});

// ─── Auth state change logging ─────────────────────────────────────
supabase.auth.onAuthStateChange((event, session) => {
  console.log("🔧 AUTH EVENT:", event);
  console.log("🔧 AUTH SESSION:", session ? `User ${session.user.id}` : "None");
});

// ─── Realtime Diagnostic Channel ──────────────────────────────────
// This channel tests Realtime connectivity by subscribing to
// postgres_changes on a test table, then inserting a test row
// to verify end-to-end event delivery.
// It exercises the full Realtime code path:
//   WebSocket connect → channel → subscription → payload receipt
(async function diagnosticRealtimeTest() {
  // Wait for auth to settle before creating diagnostic channel
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log("🔧 REALTIME DIAGNOSTIC: Starting test...");
  console.log("🔧 REALTIME DIAGNOSTIC: WebSocket available:", typeof WebSocket !== "undefined");
  console.log("🔧 REALTIME DIAGNOSTIC: supabaseUrl:", supabaseUrl ? supabaseUrl.substring(0, 30) + "..." : "EMPTY");

  let eventCount = 0;
  const testTimestamp = Date.now().toString();

  const diagChannel = supabase
    .channel("diagnostic-test", {
      config: {
        broadcast: { ack: true, self: true },
        presence: { key: "" },
      },
    })
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "realtime_test",
      },
      (payload: any) => {
        eventCount++;
        console.log("🔧 REALTIME PAYLOAD RECEIVED #" + eventCount + ":", JSON.stringify(payload));
        console.log("🔧 REALTIME PAYLOAD eventType:", payload.eventType);
        console.log("🔧 REALTIME PAYLOAD new:", JSON.stringify(payload.new));
        console.log("🔧 REALTIME PAYLOAD old:", JSON.stringify(payload.old));
      },
    )
    .subscribe(async (status: string, err?: any) => {
      console.log("🔧 REALTIME DIAGNOSTIC STATUS:", status);
      if (err) {
        console.log("🔧 REALTIME DIAGNOSTIC ERROR:", JSON.stringify(err));
        console.log("🔧 REALTIME DIAGNOSTIC ERROR CODE:", err?.code);
        console.log("🔧 REALTIME DIAGNOSTIC ERROR MESSAGE:", err?.message);
        return;
      }

      if (status === "SUBSCRIBED") {
        console.log("🔧 REALTIME DIAGNOSTIC: ✅ Channel subscribed");
        console.log("🔧 REALTIME DIAGNOSTIC: ✅ WebSocket connection OK");

        // Wait a moment for subscription to fully register on the server
        await new Promise(r => setTimeout(r, 1000));

        // Insert a test row to verify end-to-end event delivery
        console.log("🔧 REALTIME DIAGNOSTIC: Inserting test row...");
        const { data: insertResult, error: insertError } = await supabase
          .from("realtime_test")
          .insert({ message: "DIAGNOSTIC_TEST_" + testTimestamp })
          .select()
          .single();

        if (insertError) {
          console.log("🔧 REALTIME DIAGNOSTIC: ❌ INSERT failed:", insertError.message);
          console.log("🔧 REALTIME DIAGNOSTIC:   Check RLS on realtime_test table");
          return;
        }

        console.log("🔧 REALTIME DIAGNOSTIC: ✅ INSERT succeeded, id=" + insertResult.id);

        // If we haven't received the event within 5 seconds, flag it
        setTimeout(() => {
          if (eventCount === 0) {
            console.log("🔧 REALTIME DIAGNOSTIC: ❌ No realtime event received after 5s");
            console.log("🔧 REALTIME DIAGNOSTIC:   Check publication includes realtime_test:");
            console.log("🔧 REALTIME DIAGNOSTIC:   ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_test;");
          } else {
            console.log("🔧 REALTIME DIAGNOSTIC: ✅ Realtime events received: " + eventCount);
          }

          // Clean up the diagnostic channel
          supabase.removeChannel(diagChannel);

          // Also clean up the test row
          supabase.from("realtime_test").delete().eq("id", insertResult.id).then(() => {}, () => {});
        }, 5000);
      }

      if (status === "CHANNEL_ERROR") {
        console.log("🔧 REALTIME DIAGNOSTIC: ❌ Channel error - root causes:");
        console.log("  🔴 The channel has NO .on('postgres_changes') listeners?");
        console.log("  🔴 realtime_test table missing from supabase_realtime publication?");
        console.log("  🔴 RLS blocking the subscription?");
        console.log("  🔴 WebSocket connection rejected by server?");
        console.log("  Run migration: ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_test;");
      }
    });

  // Keep a reference for cleanup (though module-level will persist)
  (globalThis as any).__diagnosticChannel = diagChannel;
})();

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
