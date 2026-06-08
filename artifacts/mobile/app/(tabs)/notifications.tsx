import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useApp, Notification } from "@/context/AppContext";
import { timeAgo } from "@/utils/format";

type Filter = "All" | "Appreciation" | "Comments" | "Follows" | "Mentions";
const FILTERS: Filter[] = ["All", "Appreciation", "Comments", "Follows", "Mentions"];

const FILTER_ICONS: Record<Filter, keyof typeof Feather.glyphMap> = {
  All: "inbox", Appreciation: "heart", Comments: "message-circle", Follows: "user-plus", Mentions: "at-sign",
};
const NOTIFICATION_ICON: Record<Notification["type"], keyof typeof Feather.glyphMap> = {
  appreciation: "heart", comment: "message-circle", repost: "repeat",
  follow: "user-plus", badge: "award", reply: "corner-down-right", mention: "at-sign",
};
const NOTIFICATION_BG: Record<Notification["type"], string> = {
  appreciation: "#EDE9FE", comment: "#EDE9FE", repost: "#D1FAE5",
  follow: "#D1FAE5", badge: "#FEF3C7", reply: "#EDE9FE", mention: "#FEF9C3",
};
const NOTIFICATION_COLOR: Record<Notification["type"], string> = {
  appreciation: "#7C3AED", comment: "#7C3AED", repost: "#059669",
  follow: "#059669", badge: "#D97706", reply: "#7C3AED", mention: "#B45309",
};

function notifMatchesFilter(n: Notification, filter: Filter): boolean {
  if (filter === "All") return true;
  if (filter === "Appreciation") return n.type === "appreciation";
  if (filter === "Comments") return n.type === "comment" || n.type === "reply";
  if (filter === "Follows") return n.type === "follow";
  if (filter === "Mentions") return n.type === "mention";
  return true;
}

const ACTOR_LABELS: Record<Notification["type"], string> = {
  appreciation: "appreciated your thought",
  comment: "commented on your thought",
  repost: "reposted your thought",
  follow: "started following you",
  badge: "You earned the Regular badge. Your thoughts are gaining traction.",
  reply: "replied to your comment",
  mention: "mentioned you in a thought",
};

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notifications, markAllRead, refreshNotifications } = useApp();

  useEffect(() => {
    refreshNotifications();
  }, []);

  const [filter, setFilter] = useState<Filter>("All");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : 56 + insets.bottom;

  useEffect(() => {
    const hasUnread = notifications.some(n => !n.read);
    if (!hasUnread) return;
    const timer = setTimeout(markAllRead, 1500);
    return () => clearTimeout(timer);
  }, [markAllRead, notifications]);

  const filtered = notifications.filter(n => notifMatchesFilter(n, filter));
  const styles = makeStyles(colors);

  const onNotifPress = (item: Notification) => {
    if (item.thoughtId) {
      router.push({ pathname: "/thought/[id]", params: { id: item.thoughtId } });
    } else if (item.actorId && item.type === "follow") {
      router.push({ pathname: "/profile/[userId]", params: { userId: item.actorId } });
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const bg = NOTIFICATION_BG[item.type];
    const iconColor = NOTIFICATION_COLOR[item.type];
    const icon = NOTIFICATION_ICON[item.type];
    const isBadge = item.type === "badge";
    const tappable = !!(item.thoughtId || (item.actorId && item.type === "follow"));

    return (
      <TouchableOpacity
        onPress={() => onNotifPress(item)}
        activeOpacity={tappable ? 0.7 : 1}
        disabled={!tappable}
        style={[styles.item, !item.read && { backgroundColor: colors.primary + "06" }]}
      >
        <View style={[styles.iconCircle, { backgroundColor: bg }]}>
          <Feather name={icon} size={17} color={iconColor} />
        </View>
        <View style={styles.itemBody}>
          {isBadge ? (
            <Text style={styles.itemText}>{ACTOR_LABELS["badge"]}</Text>
          ) : (
            <>
              <Text style={styles.itemText}>
                <Text style={styles.actorName}>{item.actorName} </Text>
                {ACTOR_LABELS[item.type]}
              </Text>
              {item.thoughtContent && (
                <Text style={styles.thoughtSnippet}>"{item.thoughtContent}"</Text>
              )}
            </>
          )}
          <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{timeAgo(item.createdAt)}</Text>
        </View>
        {tappable && <Feather name="chevron-right" size={15} color={colors.mutedForeground} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Alerts</Text>
        <TouchableOpacity
          onPress={() => router.push("/search")}
          style={[styles.searchBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Feather name="search" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {FILTERS.map(f => {
            const isActive = f === filter;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterChip, { backgroundColor: isActive ? colors.primary : colors.secondary, borderColor: isActive ? colors.primary : colors.border }]}
                activeOpacity={0.8}
              >
                <Feather name={FILTER_ICONS[f]} size={13} color={isActive ? "#fff" : colors.mutedForeground} />
                <Text style={[styles.filterText, { color: isActive ? "#fff" : colors.foreground }]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        scrollEnabled={!!filtered.length}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 70 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bell" size={32} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>All quiet</Text>
            <Text style={styles.emptyText}>
              {filter === "All" ? "Notifications from your activity will appear here." : `No ${filter.toLowerCase()} notifications yet.`}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: -0.5 },
    searchBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
    filterWrapper: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    filterContent: { paddingHorizontal: 14, gap: 8 },
    filterChip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
    filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
    item: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
    iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    itemBody: { flex: 1, gap: 3 },
    itemText: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    actorName: { fontFamily: "Inter_700Bold" },
    thoughtSnippet: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontStyle: "italic" },
    timeText: { fontSize: 12, fontFamily: "Inter_400Regular" },
    empty: { paddingTop: 80, alignItems: "center", gap: 8, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginTop: 8 },
    emptyText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  });
}
