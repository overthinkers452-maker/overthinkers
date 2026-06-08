import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

// ─── Configure foreground notification behaviour ──────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Register for push and store token ───────────────────────────────────────

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (Platform.OS === "web") return null;
  if (!Device.isDevice) return null;

  const existing = (await Notifications.getPermissionsAsync()) as any;
  let granted: boolean = existing.granted ?? (existing.status === "granted");

  if (!granted) {
    const requested = (await Notifications.requestPermissionsAsync()) as any;
    granted = requested.granted ?? (requested.status === "granted");
  }

  if (!granted) return null;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined,
    });
    const token = tokenData.data;

    await supabase
      .from("profiles")
      .update({ push_token: token })
      .eq("id", userId);

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#5B5BD6",
        showBadge: true,
      });
      await Notifications.setNotificationChannelAsync("appreciations", {
        name: "Appreciations",
        description: "When someone appreciates your thought",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 150],
        lightColor: "#F59E0B",
        showBadge: true,
      });
      await Notifications.setNotificationChannelAsync("comments", {
        name: "Comments",
        description: "When someone comments on your thought",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 150],
        lightColor: "#5B5BD6",
        showBadge: true,
      });
      await Notifications.setNotificationChannelAsync("follows", {
        name: "Follows",
        description: "When someone follows you",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 100],
        lightColor: "#10B981",
        showBadge: true,
      });
    }

    return token;
  } catch {
    return null;
  }
}

// ─── Fetch recipient push token ───────────────────────────────────────────────

async function getRecipientToken(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("push_token")
    .eq("id", userId)
    .single();
  return data?.push_token ?? null;
}

// ─── Send push via Expo Push API ─────────────────────────────────────────────

interface PushPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
  badge?: number;
  sound?: "default" | null;
}

async function sendExpoPush(payload: PushPayload): Promise<void> {
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        sound: payload.sound ?? "default",
      }),
    });
  } catch {
    // Non-critical — silently drop push failures
  }
}

// ─── Notification senders ─────────────────────────────────────────────────────

export async function sendAppreciationNotification(opts: {
  recipientId: string;
  senderName: string;
  thoughtContent: string;
  thoughtId: string;
}) {
  if (Platform.OS === "web") return;
  const token = await getRecipientToken(opts.recipientId);
  if (!token) return;

  const preview = opts.thoughtContent.length > 60
    ? opts.thoughtContent.slice(0, 60) + "…"
    : opts.thoughtContent;

  await sendExpoPush({
    to: token,
    title: `${opts.senderName} appreciated your thought ✨`,
    body: preview,
    channelId: "appreciations",
    data: { type: "appreciation", thoughtId: opts.thoughtId },
  });
}

export async function sendCommentNotification(opts: {
  recipientId: string;
  senderName: string;
  commentContent: string;
  thoughtId: string;
}) {
  if (Platform.OS === "web") return;
  const token = await getRecipientToken(opts.recipientId);
  if (!token) return;

  const preview = opts.commentContent.length > 60
    ? opts.commentContent.slice(0, 60) + "…"
    : opts.commentContent;

  await sendExpoPush({
    to: token,
    title: `${opts.senderName} replied to your thought 💬`,
    body: preview,
    channelId: "comments",
    data: { type: "comment", thoughtId: opts.thoughtId },
  });
}

export async function sendReplyNotification(opts: {
  recipientId: string;
  senderName: string;
  replyContent: string;
  thoughtId: string;
}) {
  if (Platform.OS === "web") return;
  const token = await getRecipientToken(opts.recipientId);
  if (!token) return;

  const preview = opts.replyContent.length > 60
    ? opts.replyContent.slice(0, 60) + "…"
    : opts.replyContent;

  await sendExpoPush({
    to: token,
    title: `${opts.senderName} replied to your comment 💬`,
    body: preview,
    channelId: "comments",
    data: { type: "reply", thoughtId: opts.thoughtId },
  });
}

export async function sendFollowNotification(opts: {
  recipientId: string;
  senderName: string;
  senderId: string;
}) {
  if (Platform.OS === "web") return;
  const token = await getRecipientToken(opts.recipientId);
  if (!token) return;

  await sendExpoPush({
    to: token,
    title: "New follower 👋",
    body: `${opts.senderName} started following you`,
    channelId: "follows",
    data: { type: "follow", actorId: opts.senderId },
  });
}

export async function sendRepostNotification(opts: {
  recipientId: string;
  senderName: string;
  thoughtContent: string;
  thoughtId: string;
}) {
  if (Platform.OS === "web") return;
  const token = await getRecipientToken(opts.recipientId);
  if (!token) return;

  const preview = opts.thoughtContent.length > 60
    ? opts.thoughtContent.slice(0, 60) + "…"
    : opts.thoughtContent;

  await sendExpoPush({
    to: token,
    title: `${opts.senderName} reshared your thought 🔁`,
    body: preview,
    channelId: "default",
    data: { type: "repost", thoughtId: opts.thoughtId },
  });
}

export async function sendMentionNotification(opts: {
  recipientId: string;
  senderName: string;
  thoughtContent: string;
  thoughtId: string;
}) {
  if (Platform.OS === "web") return;
  const token = await getRecipientToken(opts.recipientId);
  if (!token) return;

  const preview = opts.thoughtContent.length > 60
    ? opts.thoughtContent.slice(0, 60) + "…"
    : opts.thoughtContent;

  await sendExpoPush({
    to: token,
    title: `${opts.senderName} mentioned you 💬`,
    body: preview,
    channelId: "default",
    data: { type: "mention", thoughtId: opts.thoughtId },
  });
}
