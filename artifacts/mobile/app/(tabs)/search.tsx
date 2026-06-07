import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity,
  ScrollView, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useApp, Thought } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { ThoughtCard } from "@/components/ThoughtCard";
import { formatCount } from "@/utils/format";
import * as svc from "@/lib/thoughtsService";

const TRENDING = ["consciousness", "AI relationships", "free will", "loneliness", "identity", "productivity"];
type ResultTab = "Thoughts" | "People";

interface PersonResult {
  id: string;
  display_name: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  followers_count: number;
  thoughts_count: number;
}

export default function SearchTabScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { followedUsers, toggleFollowUser } = useApp();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ResultTab>("Thoughts");
  const [thoughtResults, setThoughtResults] = useState<Thought[]>([]);
  const [peopleResults, setPeopleResults] = useState<PersonResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : 56 + insets.bottom;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setThoughtResults([]);
      setPeopleResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const [tRes, pRes] = await Promise.all([
          svc.searchThoughts(query.trim(), user?.id),
          svc.searchProfiles(query.trim()),
        ]);
        setThoughtResults(tRes);
        setPeopleResults(pRes as PersonResult[]);
      } catch {
        // keep previous results
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, user?.id]);

  const hasQuery = query.trim().length > 0;
  const totalResults = tab === "Thoughts" ? thoughtResults.length : peopleResults.length;
  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { paddingTop: topPad, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Search</Text>
      </View>

      {/* Search input */}
      <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Feather name="search" size={15} color={colors.mutedForeground} />
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          placeholder="Search thoughts, people, topics..."
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {!hasQuery ? (
        /* Trending topics */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TRENDING SEARCHES</Text>
          {TRENDING.map(term => (
            <TouchableOpacity
              key={term}
              onPress={() => setQuery(term)}
              style={[styles.trendRow, { borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={[styles.trendIcon, { backgroundColor: colors.secondary }]}>
                <Feather name="trending-up" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.trendText, { color: colors.foreground }]}>{term}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <>
          {/* Result tabs */}
          <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
            {(["Thoughts", "People"] as ResultTab[]).map(t => (
              <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]} activeOpacity={0.7}>
                <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.mutedForeground, fontFamily: tab === t ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                  {t}
                </Text>
                {tab === t && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
              </TouchableOpacity>
            ))}
            <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>{totalResults} results</Text>
          </View>

          {tab === "Thoughts" ? (
            <FlatList
              data={thoughtResults}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <ThoughtCard thought={item} showReason={false} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: bottomPad }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Feather name="search" size={28} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No thoughts matching "{query}"</Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={peopleResults}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: bottomPad }}
              renderItem={({ item }) => {
                const followed = followedUsers.has(item.id);
                return (
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: "/profile/[userId]", params: { userId: item.id } })}
                    style={[styles.personRow, { borderBottomColor: colors.border }]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.personAvatar, { backgroundColor: colors.primary + "25" }]}>
                      <Text style={[styles.personInitials, { color: colors.primary }]}>
                        {item.display_name.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.personName, { color: colors.foreground }]}>{item.display_name}</Text>
                      <Text style={[styles.personMeta, { color: colors.mutedForeground }]}>
                        @{item.username} · {item.thoughts_count} thoughts · {formatCount(item.followers_count)} followers
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleFollowUser(item.id)}
                      style={[styles.followBtn, { backgroundColor: followed ? "transparent" : colors.primary, borderColor: followed ? colors.border : colors.primary }]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.followText, { color: followed ? colors.foreground : "#fff" }]}>
                        {followed ? "Following" : "Follow"}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Feather name="users" size={28} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No public users matching "{query}"</Text>
                </View>
              }
            />
          )}
        </>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
    title: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
    inputWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 14, marginVertical: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
    input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
    sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
    trendRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
    trendIcon: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    trendText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
    tabBar: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, paddingHorizontal: 16 },
    tab: { paddingVertical: 12, paddingHorizontal: 4, marginRight: 20, position: "relative" },
    tabActive: {},
    tabText: { fontSize: 15 },
    tabIndicator: { position: "absolute", bottom: 0, left: 0, right: 0, height: 2, borderRadius: 1 },
    resultCount: { marginLeft: "auto", fontSize: 12, fontFamily: "Inter_400Regular", paddingVertical: 12 },
    personRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
    personAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    personInitials: { fontSize: 15, fontFamily: "Inter_700Bold" },
    personName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
    personMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
    followBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
    followText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    empty: { paddingTop: 60, alignItems: "center", gap: 10 },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
