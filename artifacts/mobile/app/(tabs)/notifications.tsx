import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useApp, Notification } from "@/context/AppContext";
import { timeAgo } from "@/utils/format";

const NOTIFICATION_ICONS: Record<Notification["type"], keyof typeof Feather.glyphMap> = {
  appreciation: "arrow-up",
  comment: "message-circle",
  repost: "repeat",
  follow: "user-plus",
  badge: "award",
  reply: "corner-down-right",
};

const NOTIFICATION_LABELS: Record<Notification["type"], string> = {
  appreciation: "appreciated your thought",
  comment: "commented on",
  repost: "reposted your thought",
  follow: "started following you",
  badge: "You earned a new badge",
  reply: "replied to your comment",
};

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notifications, markAllRead } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    const timer = setTimeout(markAllRead, 1500);
    return () => clearTimeout(timer);
  }, [markAllRead]);

  const styles = makeStyles(colors);

  const renderItem = ({ item }: { item: Notification }) => {
    const icon = NOTIFICATION_ICONS[item.type];
    const iconColor =
      item.type === "appreciation" ? colors.appreciate
      : item.type === "disagree" ? colors.disagree
      : item.type === "badge" ? colors.gold
      : item.type === "follow" ? colors.primary
      : colors.mutedForeground;

    return (
      <View style={[styles.item, !item.read && styles.unreadItem]}>
        <View style={[styles.iconWrapper, { backgroundColor: iconColor + "20" }]}>
          <Feather name={icon} size={16} color={iconColor} />
        </View>
        <View style={styles.itemContent}>
          {item.type === "badge" ? (
            <Text style={styles.itemText}>
              <Text style={styles.boldText}>overthinkers </Text>
              gave you a badge
            </Text>
          ) : (
            <Text style={styles.itemText}>
              <Text style={styles.boldText}>{item.actorName} </Text>
              {NOTIFICATION_LABELS[item.type]}
              {item.thoughtContent ? (
                <Text style={styles.thoughtSnippet}> "{item.thoughtContent}"</Text>
              ) : null}
            </Text>
          )}
          <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
        </View>
        {!item.read && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {notifications.some(n => !n.read) && (
          <TouchableOpacity onPress={markAllRead} activeOpacity={0.7}>
            <Text style={[styles.markRead, { color: colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        scrollEnabled={!!notifications.length}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bell" size={32} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>All quiet</Text>
            <Text style={styles.emptyText}>Notifications from your activity will appear here.</Text>
          </View>
        }
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    markRead: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
    },
    item: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    unreadItem: {
      backgroundColor: colors.primary + "08",
    },
    iconWrapper: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    itemContent: {
      flex: 1,
      gap: 3,
    },
    itemText: {
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      lineHeight: 20,
    },
    boldText: {
      fontFamily: "Inter_600SemiBold",
    },
    thoughtSnippet: {
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    time: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 6,
      flexShrink: 0,
    },
    empty: {
      paddingTop: 80,
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginTop: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 20,
    },
  });
}
