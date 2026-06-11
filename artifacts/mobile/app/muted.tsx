import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { useFeedback } from "@/hooks/useFeedback";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default function MutedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { mutedUsers, unmuteUser } = useApp();
  const { appLanguage } = useSettings();
  const { showToast } = useToast();
  const { tap } = useFeedback();
  const styles = makeStyles(colors);
  const bottomPad = Platform.OS === "web" ? 32 : insets.bottom + 16;

  const onUnmute = (id: string, name: string) => {
    unmuteUser(id);
    tap();
    showToast(`Unmuted ${name}`, { type: "success" });
  };

  return (
    <>
      <Stack.Screen options={{
        title: "Muted Accounts",
        headerStyle: { backgroundColor: colors.background } as any,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground } as any,
        headerTintColor: colors.primary,
      }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}>
        {mutedUsers.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="volume-x" size={28} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>You haven't muted anyone yet. Muted accounts won't appear in your feed.</Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {mutedUsers.map((u, i) => (
              <View key={u.id} style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: i === mutedUsers.length - 1 ? 0 : 1 }]}>
                <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{initials(u.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{u.name}</Text>
                  {u.username ? <Text style={[styles.username, { color: colors.mutedForeground }]}>@{u.username}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => onUnmute(u.id, u.name)} style={[styles.unmuteBtn, { borderColor: colors.border }]} activeOpacity={0.7}>
                  <Text style={[styles.unmuteText, { color: colors.primary }]}>Unmute</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    card: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    name: { fontSize: 15, fontFamily: "Inter_500Medium" },
    username: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
    unmuteBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
    unmuteText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    empty: { alignItems: "center", gap: 12, paddingVertical: 64 },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", maxWidth: 300, lineHeight: 20 },
  });
}
