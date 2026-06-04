import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { ThoughtCard } from "@/components/ThoughtCard";
import { formatCount } from "@/utils/format";

const TRENDING_TOPICS = [
  { id: "1", name: "Philosophy", count: 3412, trend: "+24%" },
  { id: "2", name: "Technology", count: 2891, trend: "+18%" },
  { id: "3", name: "Mental Health", count: 2234, trend: "+31%" },
  { id: "4", name: "Culture", count: 1987, trend: "+12%" },
  { id: "5", name: "Politics", count: 1654, trend: "+9%" },
  { id: "6", name: "Science", count: 1432, trend: "+15%" },
  { id: "7", name: "Education", count: 1201, trend: "+22%" },
  { id: "8", name: "Economics", count: 987, trend: "+7%" },
];

const SUGGESTED_CREATORS = [
  { id: "u2", name: "Aryan Kapoor", username: "aryankapoor", category: "Philosophy", reputation: 892, followed: false },
  { id: "u4", name: "Vikram N.", username: "vikramnair", category: "Culture", reputation: 1204, followed: true },
  { id: "u5", name: "Meera T.", username: "meera_t", category: "Mental Health", reputation: 2341, followed: true },
  { id: "u7", name: "Divya R.", username: "divya_r", category: "Technology", reputation: 567, followed: false },
];

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { thoughts } = useApp();
  const [search, setSearch] = useState("");
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set(["u4", "u5"]));

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const topThoughts = thoughts.filter(t => t.qualityScore >= 90).slice(0, 3);

  const filteredThoughts = search.trim()
    ? thoughts.filter(t =>
        t.content.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase()) ||
        t.authorName.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const styles = makeStyles(colors);

  const toggleFollow = (id: string) => {
    setFollowedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color={colors.mutedForeground} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search thoughts, topics, people..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {filteredThoughts ? (
        <FlatList
          data={filteredThoughts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ThoughtCard thought={item} showReason={false} />}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!filteredThoughts.length}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="search" size={28} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>No results for "{search}"</Text>
            </View>
          }
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trending Topics</Text>
            <View style={styles.topicsGrid}>
              {TRENDING_TOPICS.map(topic => (
                <TouchableOpacity
                  key={topic.id}
                  style={styles.topicChip}
                  activeOpacity={0.7}
                  onPress={() => setSearch(topic.name)}
                >
                  <Text style={styles.topicName}>{topic.name}</Text>
                  <View style={styles.topicMeta}>
                    <Text style={styles.topicCount}>{formatCount(topic.count)}</Text>
                    <Text style={[styles.topicTrend, { color: colors.appreciate }]}>{topic.trend}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Thoughts</Text>
            {topThoughts.map(t => (
              <ThoughtCard key={t.id} thought={t} showReason={false} />
            ))}
          </View>

          <View style={[styles.section, { paddingBottom: 40 }]}>
            <Text style={styles.sectionTitle}>Who to Follow</Text>
            {SUGGESTED_CREATORS.map(creator => {
              const followed = followedIds.has(creator.id);
              return (
                <View key={creator.id} style={styles.creatorRow}>
                  <View style={[styles.creatorAvatar, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[styles.creatorAvatarText, { color: colors.primary }]}>
                      {creator.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.creatorInfo}>
                    <Text style={styles.creatorName}>{creator.name}</Text>
                    <Text style={styles.creatorMeta}>{creator.category} · {formatCount(creator.reputation)} rep</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => toggleFollow(creator.id)}
                    style={[
                      styles.followBtn,
                      {
                        backgroundColor: followed ? colors.secondary : colors.primary,
                        borderColor: followed ? colors.border : colors.primary,
                      }
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.followText, { color: followed ? colors.foreground : colors.primaryForeground }]}>
                      {followed ? "Following" : "Follow"}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
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
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      margin: 12,
      paddingHorizontal: 12,
      paddingVertical: 9,
      backgroundColor: colors.secondary,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      padding: 0,
    },
    section: {
      paddingHorizontal: 16,
      paddingTop: 4,
    },
    sectionTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 10,
      marginTop: 8,
    },
    topicsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
    },
    topicChip: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    topicName: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    topicMeta: {
      flexDirection: "row",
      gap: 6,
      marginTop: 2,
    },
    topicCount: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    topicTrend: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
    },
    creatorRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    creatorAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    creatorAvatarText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    creatorInfo: {
      flex: 1,
    },
    creatorName: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    creatorMeta: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 1,
    },
    followBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
    },
    followText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
    },
    emptyState: {
      paddingTop: 60,
      alignItems: "center",
      gap: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
  });
}
