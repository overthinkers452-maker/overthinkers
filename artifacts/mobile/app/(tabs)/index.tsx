import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useApp, Thought, FeedType } from "@/context/AppContext";
import { useSettings } from "@/context/SettingsContext";
import { ThoughtCard } from "@/components/ThoughtCard";
import { applyFeedFilters } from "@/utils/feedFilter";
import { t } from "@/utils/i18n";

type FeedTypeNew = "For You" | "Trending" | "Latest" | "Following";
const FEED_TYPES: FeedTypeNew[] = ["For You", "Trending", "Latest", "Following"];
const FEED_TAB_KEYS: Record<FeedTypeNew, string> = {
  "For You": "feed.tab.forYou",
  "Trending": "feed.tab.trending",
  "Latest": "feed.tab.latest",
  "Following": "feed.tab.following",
};

const CATEGORIES = ["Love", "Life", "Career", "Friendship", "Family", "Motivation", "Anxiety", "Funny", "Confessions", "Other"];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { thoughts, unreadCount, isBlocked, isMuted, currentUser, feedLoading, refreshFeed, loadMoreFeed, hasMoreFeed, followingIds } = useApp();
  const { blockedWords, appLanguage } = useSettings();
  const [activeFeed, setActiveFeed] = useState<FeedTypeNew>("For You");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<"en" | "hi" | "hinglish" | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [feedError, setFeedError] = useState<"offline" | "error" | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : 56 + insets.bottom;

  const getFiltered = (): Thought[] => {
    let base: Thought[];
    switch (activeFeed) {
      case "Following":
        base = followingIds.length > 0
          ? thoughts.filter(t => followingIds.includes(t.authorId))
          : [];
        break;
      case "Trending":
        base = [...thoughts].sort((a, b) => b.appreciations - a.appreciations);
        break;
      case "Latest":
        base = [...thoughts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        base = thoughts;
    }
    if (activeCategory) {
      base = base.filter(t => t.category.toLowerCase() === activeCategory.toLowerCase());
    }
    if (activeLanguage) {
      base = base.filter(t => (t.language ?? "en") === activeLanguage);
    }
    return applyFeedFilters(base, { blockedWords, isBlocked, isMuted, currentUserId: currentUser.id });
  };

  const filteredThoughts = getFiltered();

  const detectOffline = () => {
    if (typeof navigator !== "undefined" && "onLine" in navigator) {
      return !navigator.onLine;
    }
    return false;
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setFeedError(null);
    try {
      await refreshFeed(activeFeed as any, activeCategory);
    } catch {
      setFeedError(detectOffline() ? "offline" : "error");
    }
    setRefreshing(false);
  }, [refreshFeed, activeFeed, activeCategory]);

  const onEndReached = useCallback(() => {
    loadMoreFeed(activeFeed as any, activeCategory);
  }, [loadMoreFeed, activeFeed, activeCategory]);

  useEffect(() => {
    setFeedError(null);
    refreshFeed(activeFeed as any, activeCategory).catch(() => {
      setFeedError(detectOffline() ? "offline" : "error");
    });
  }, [activeFeed, activeCategory]);

  const renderThought = useCallback(
    ({ item }: { item: Thought }) => (
      <ThoughtCard thought={item} showReason={activeFeed === "For You" && !activeCategory} />
    ),
    [activeFeed, activeCategory]
  );

  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>overthinkers</Text>
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => router.push("/(tabs)/notifications")}
          activeOpacity={0.8}
        >
          <Feather name="bell" size={22} color={colors.foreground} />
          {unreadCount > 0 && (
            <View style={[styles.bellBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.bellBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.feedTabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.feedTabsContent}
        >
          {FEED_TYPES.map(feed => {
            const isActive = feed === activeFeed;
            return (
              <TouchableOpacity
                key={feed}
                onPress={() => setActiveFeed(feed)}
                style={[styles.feedTab, isActive && styles.feedTabActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.feedTabText, isActive && styles.feedTabTextActive]}>
                  {t(appLanguage, FEED_TAB_KEYS[feed])}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.categoryWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContent}
        >
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(isActive ? null : cat)}
                style={[
                  styles.categoryChip,
                  {
                    borderColor: isActive ? colors.primary : colors.border,
                    backgroundColor: isActive ? colors.primary + "15" : colors.card,
                  }
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoryChipText, { color: isActive ? colors.primary : colors.foreground }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.langWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.langContent}
        >
          {(
            [
              { value: "en" as const, label: "English" },
              { value: "hi" as const, label: "हिंदी" },
              { value: "hinglish" as const, label: "Hinglish" },
            ] as const
          ).map(lang => {
            const isActive = activeLanguage === lang.value;
            return (
              <TouchableOpacity
                key={lang.value}
                onPress={() => setActiveLanguage(isActive ? null : lang.value)}
                style={[
                  styles.langChip,
                  {
                    borderColor: isActive ? colors.primary : colors.border,
                    backgroundColor: isActive ? colors.primary + "15" : colors.card,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.langChipText, { color: isActive ? colors.primary : colors.mutedForeground }]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {feedError && (
        <View style={[styles.errorBanner, {
          backgroundColor: feedError === "offline" ? "#FEF3C7" : "#FEE2E2",
          borderColor: feedError === "offline" ? "#FCD34D" : "#FECACA",
        }]}>
          <Feather
            name={feedError === "offline" ? "wifi-off" : "alert-circle"}
            size={15}
            color={feedError === "offline" ? "#D97706" : "#DC2626"}
          />
          <Text style={[styles.errorBannerText, { color: feedError === "offline" ? "#92400E" : "#991B1B" }]}>
            {feedError === "offline" ? "No internet connection." : "Couldn't load feed."}
          </Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryBtn} activeOpacity={0.7}>
            <Text style={[styles.retryText, { color: feedError === "offline" ? "#D97706" : "#DC2626" }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {feedLoading && !refreshing && !feedError && (
        <View style={{ alignItems: "center", paddingVertical: 12 }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      <FlatList
        data={filteredThoughts}
        keyExtractor={item => item.id}
        renderItem={renderThought}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filteredThoughts.length}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: bottomPad + 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          hasMoreFeed && filteredThoughts.length > 0
            ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="wind" size={32} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>
              {activeFeed === "Following"
                ? "Follow more people to see their thoughts here."
                : activeCategory
                ? `No thoughts in ${activeCategory} yet.`
                : "Check back later for new thoughts."}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: bottomPad + 16 }]}
        onPress={() => router.push("/compose")}
        activeOpacity={0.85}
      >
        <Feather name="edit-2" size={20} color="#FFFFFF" />
      </TouchableOpacity>
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
      paddingVertical: 10,
    },
    logo: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    bellBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    bellBadge: {
      position: "absolute",
      top: 3,
      right: 3,
      minWidth: 17,
      height: 17,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
    },
    bellBadgeText: {
      color: "#fff",
      fontSize: 10,
      fontFamily: "Inter_700Bold",
    },
    feedTabsWrapper: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    feedTabsContent: {
      paddingHorizontal: 14,
      gap: 4,
    },
    feedTab: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
      marginBottom: -1,
    },
    feedTabActive: {
      borderBottomColor: colors.primary,
    },
    feedTabText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
    },
    feedTabTextActive: {
      color: colors.primary,
      fontFamily: "Inter_700Bold",
    },
    categoryWrapper: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    categoryContent: {
      paddingHorizontal: 12,
      gap: 6,
    },
    categoryChip: {
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    categoryChipText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
    langWrapper: {
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    langContent: {
      paddingHorizontal: 12,
      gap: 6,
    },
    langChip: {
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    langChipText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
    },
    fab: {
      position: "absolute",
      right: 18,
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#7C3AED",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 8,
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 12,
      marginTop: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    errorBannerText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
    retryBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    retryText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
    },
    emptyState: {
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
