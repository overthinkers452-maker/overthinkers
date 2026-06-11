import React from "react";
import { ScrollView, Text, View, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/context/SettingsContext";
import { t } from "@/utils/i18n";

const SECTIONS: { h: string; b: string }[] = [
  {
    h: "1. About overthinkers",
    b: "overthinkers is a space for sharing reflective, long-form thoughts. By creating an account or using the app you agree to these terms. If you do not agree, please do not use the app.",
  },
  {
    h: "2. Your account",
    b: "You are responsible for activity on your account and for keeping your credentials secure. You may post publicly, under a pseudonymous alias, or anonymously. Anonymous and pseudonymous posting does not exempt you from these terms.",
  },
  {
    h: "3. Content you post",
    b: "You keep ownership of the thoughts you write. By posting, you grant overthinkers a limited licence to display and distribute that content within the app. You are responsible for what you post, including reposts of others' thoughts.",
  },
  {
    h: "4. Community standards",
    b: "Do not post content that is hateful, harassing, threatening, illegal, or that violates someone else's privacy. We use a community reporting system and automatic quality scoring; thoughts that receive multiple reports may be hidden automatically pending review.",
  },
  {
    h: "5. Moderation & reporting",
    b: "You can report a thought or comment using the ⋯ menu and choosing a reason. Repeated abuse of the reporting system is itself a violation. We may remove content, hide it from feeds, or restrict accounts that break these terms.",
  },
  {
    h: "6. Blocking & filters",
    b: "You can block other users and add content filters to hide thoughts containing specific words. These controls shape your own feed and do not delete other people's content.",
  },
  {
    h: "7. 4 AM feed",
    b: "The 4 AM feed is open from 10 PM to 4 AM, when thoughts you share post live and instantly. You remain responsible for anything you post there; it is subject to the same standards as the rest of the app.",
  },
  {
    h: "8. Termination",
    b: "You can delete your account at any time from Settings. We may suspend or terminate accounts that repeatedly violate these terms. Deleting your account removes your thoughts from your profile.",
  },
  {
    h: "9. Disclaimer",
    b: "The app is provided 'as is'. Translation and quality-score features are best-effort and may be inaccurate. We are not liable for decisions you make based on content in the app.",
  },
  {
    h: "10. Changes to these terms",
    b: "We may update these terms as the app evolves. Continued use after an update means you accept the revised terms.",
  },
];

export default function TermsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { appLanguage } = useSettings();
  const styles = makeStyles(colors);
  const bottomPad = Platform.OS === "web" ? 40 : insets.bottom + 24;

  return (
    <>
      <Stack.Screen options={{
        title: t(appLanguage, "legal.terms.title"),
        headerStyle: { backgroundColor: colors.background } as any,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground } as any,
        headerTintColor: colors.primary,
      }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 20, paddingBottom: bottomPad }}>
        <Text style={styles.title}>{t(appLanguage, "legal.terms.title")}</Text>
        <Text style={styles.updated}>{t(appLanguage, "legal.lastUpdated")}: June 5, 2026</Text>
        {SECTIONS.map((s) => (
          <View key={s.h} style={styles.block}>
            <Text style={styles.h}>{s.h}</Text>
            <Text style={styles.b}>{s.b}</Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    title: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 4 },
    updated: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 20 },
    block: { marginBottom: 20 },
    h: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 6 },
    b: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 21 },
  });
}
