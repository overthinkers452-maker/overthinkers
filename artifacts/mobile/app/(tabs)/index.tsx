import React, { useCallback, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useApp, Thought, FeedType } from "@/context/AppContext";
import { ThoughtCard } from "@/components/ThoughtCard";
import { FeedTabs } from "@/components/FeedTabs";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { thoughts } = useApp();
  const [activeFeed, setActiveFeed] = useState<FeedType>("For You");
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const filteredThoughts = useCallback((): Thought[] => {
    switch (activeFeed) {
      case "Following":
        return thoughts.filter(t => ["u4", "u5"].includes(t.authorId));
      case "Trending":
        return [...thoughts].sort((a, b) => b.appreciations - a.appreciations);
      case "Latest":
        return [...thoughts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      default:
        return thoughts;
    }
  }, [thoughts, activeFeed])();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>overthinkers</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.push("/compose")}
          activeOpacity={0.8}
        >
          <Feather name="edit-2" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <FeedTabs active={activeFeed} onChange={setActiveFeed} />

      <FlatList
        data={filteredThoughts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ThoughtCard thought={item} showReason={activeFeed === "For You"} />}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filteredThoughts.length}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={filteredThoughts.length === 0 ? styles.empty : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="wind" size={32} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>
              {activeFeed === "Following"
                ? "Follow more people to see their thoughts here."
                : "Check back later for new thoughts."}
            </Text>
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
    logo: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    headerBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.secondary,
    },
    empty: {
      flex: 1,
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
