import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity,
  ScrollView, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
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
  name: string;
  username: string;
  thoughtCount: number;
  appreciations: number;
}

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { followedUsers, toggleFollowUser } = useApp();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ResultTab>("Thoughts");
  const [thoughtResults, setThoughtResults] = useState<Thought[]>([]);
  const [peopleResults, setPeopleResults] = useState<PersonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomPad = Platform.OS === "web" ? 84 : insets.bottom + 16;

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setThoughtResults([]);
      setPeopleResults([]);
      return;
    }
    setLoading(true);
    const [thoughts, profiles] = await Promise.all([
      svc.searchThoughts(q, user?.id),
      svc.searchProfiles(q),
    ]);
    setThoughtResults(thoughts);
    setPeopleResults(profiles.map((p: any) => ({
      id: p.id,
      name: p.display_name ?? p.username ?? "Unknown",
      username: p.username ?? "",
      thoughtCount: p.thoughts_count ?? 0,
      appreciations: p.reputation ?? 0,
    })));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setThoughtResults([]);
      setPeopleResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => doSearch(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  const styles = makeStyles(colors);
  const hasQuery = query.trim().length > 0;
  const totalResults = tab === "Thoughts" ? thoughtResults.length : peopleResults.length;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : insets.top, backgroundColor: colors.background }]}>
        <View style={[styles.searchBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="search" size={15} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Search thoughts, people, topics..."
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Feather name="x" size={15} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!hasQuery ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>TRENDING SEARCHES</Text>
              {TRENDING.map(term => (
                <TouchableOpacity key={term} onPress={() => setQuery(term)} style={[styles.trendRow, { borderBottomColor: colors.border }]} activeOpacity={0.7}>
                  <View style={[styles.trendIcon, { backgroundColor: colors.secondary }]}>
                    <Feather name="trending-up" size={14} color={colors.primary} />
                  </View>
                  <Text style={[styles.trendText, { color: colors.foreground }]}>{term}</Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <>
            <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
              {(["Thoughts", "People"] as ResultTab[]).map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTab(t)}
                  style={[styles.tab, tab === t && styles.tabActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.mutedForeground, fontFamily: tab === t ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                    {t}
                  </Text>
                  {tab === t && (
                    <View style={[styles.tabDot, { backgroundColor: colors.primary }]} />
                  )}
                </TouchableOpacity>
              ))}
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: "auto", paddingVertical: 12 }} />
              ) : (
                <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>{totalResults} results</Text>
              )}
            </View>

            {tab === "Thoughts" ? (
              <FlatList
                data={thoughtResults}
                keyExtractor={item => item.id}
                renderItem={({ item }) => <ThoughtCard thought={item} showReason={false} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: bottomPad }}
                ListEmptyComponent={
                  !loading ? (
                    <View style={styles.empty}>
                      <Feather name="search" size={28} color={colors.mutedForeground} />
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No thoughts matching "{query}"</Text>
                    </View>
                  ) : null
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
                      onPress={() => router.push({ pathname: "/profile/[userId]", params: { userId: item.id, name: item.name } })}
                      style={[styles.personRow, { borderBottomColor: colors.border }]}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.personAvatar, { backgroundColor: colors.primary + "25" }]}>
                        <Text style={[styles.personInitials, { color: colors.primary }]}>
                          {item.name.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.personName, { color: colors.foreground }]}>{item.name}</Text>
                        <Text style={[styles.personMeta, { color: colors.mutedForeground }]}>
                          {item.thoughtCount} thoughts · {formatCount(item.appreciations)} rep
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
                  !loading ? (
                    <View style={styles.empty}>
                      <Feather name="users" size={28} color={colors.mutedForeground} />
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No public users matching "{query}"</Text>
                    </View>
                  ) : null
                }
              />
            )}
          </>
        )}
      </View>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    searchBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
    backBtn: { padding: 4 },
    inputWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
    input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
    section: { paddingTop: 16 },
    sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, paddingHorizontal: 16, marginBottom: 8 },
    trendRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
    trendIcon: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    trendText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
    tabBar: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, paddingHorizontal: 16 },
    tab: { paddingVertical: 12, paddingHorizontal: 4, marginRight: 20, position: "relative" },
    tabActive: {},
    tabText: { fontSize: 15 },
    tabDot: { position: "absolute", bottom: 0, left: 0, right: 0, height: 2, borderRadius: 1 },
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
