import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { useFeedback } from "@/hooks/useFeedback";
import { t } from "@/utils/i18n";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

export default function ContentFiltersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { appLanguage, blockedWords, addBlockedWord, removeBlockedWord } = useSettings();
  const { showToast } = useToast();
  const { tap } = useFeedback();
  const [text, setText] = useState("");
  const styles = makeStyles(colors);
  const bottomPad = Platform.OS === "web" ? 32 : insets.bottom + 16;

  const onAdd = () => {
    const word = text.trim();
    if (!word) return;
    addBlockedWord(word);
    setText("");
    tap();
    showToast(t(appLanguage, "toast.wordBlocked"), { type: "success" });
  };

  const onRemove = (w: string) => {
    removeBlockedWord(w);
    tap();
    showToast(t(appLanguage, "toast.wordRemoved"), { type: "info" });
  };

  return (
    <>
      <Stack.Screen options={{
        title: t(appLanguage, "filters.title"),
        headerStyle: { backgroundColor: colors.background } as any,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground } as any,
        headerTintColor: colors.primary,
      }} />
      <KeyboardAwareScrollViewCompat style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }} keyboardShouldPersistTaps="handled">
        <Text style={styles.desc}>{t(appLanguage, "filters.desc")}</Text>

        <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="filter" size={18} color={colors.mutedForeground} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t(appLanguage, "filters.placeholder")}
            placeholderTextColor={colors.mutedForeground}
            style={styles.input}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={onAdd}
          />
          <TouchableOpacity onPress={onAdd} disabled={!text.trim()} style={[styles.addBtn, { backgroundColor: text.trim() ? colors.primary : colors.secondary }]} activeOpacity={0.8}>
            <Text style={[styles.addBtnText, { color: text.trim() ? "#fff" : colors.mutedForeground }]}>{t(appLanguage, "common.add")}</Text>
          </TouchableOpacity>
        </View>

        {blockedWords.length > 0 && (
          <Text style={styles.count}>{t(appLanguage, "filters.count", { n: blockedWords.length })}</Text>
        )}

        {blockedWords.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="filter" size={28} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>{t(appLanguage, "filters.empty")}</Text>
          </View>
        ) : (
          <View style={styles.chips}>
            {blockedWords.map((w) => (
              <View key={w} style={[styles.chip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.chipText, { color: colors.foreground }]}>{w}</Text>
                <TouchableOpacity onPress={() => onRemove(w)} hitSlop={8}>
                  <Feather name="x" size={15} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </KeyboardAwareScrollViewCompat>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    desc: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 20, marginBottom: 16 },
    inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 },
    input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, paddingVertical: 8 },
    addBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
    addBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    count: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginTop: 18, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 20, paddingLeft: 14, paddingRight: 10, paddingVertical: 8 },
    chipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
    empty: { alignItems: "center", gap: 12, paddingVertical: 56 },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", maxWidth: 280, lineHeight: 20 },
  });
}
