import React from "react";
import { ScrollView, Text, View, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/context/SettingsContext";
import { t } from "@/utils/i18n";

const SECTIONS: { h: string; b: string }[] = [
  {
    h: "1. Our approach",
    b: "overthinkers is built to be privacy-first. This app stores your thoughts, profile and settings locally on your device. We collect as little as possible and never sell your data.",
  },
  {
    h: "2. What is stored on your device",
    b: "Your profile (name, username, bio, avatar and banner), your thoughts and comments, your follows, blocks and content filters, and your app preferences (theme, language, notification and privacy toggles) are saved in local storage on your device.",
  },
  {
    h: "3. Posting modes & identity",
    b: "Each thought can be Public (your name is shown), Pseudonymous (shown under a partial alias), or Anonymous (identity hidden). Anonymous thoughts do not display your name to other readers.",
  },
  {
    h: "4. Translation",
    b: "When you tap Translate on a thought, that thought's text is sent to a third-party translation service (MyMemory) to produce the translation. Only the text you choose to translate is sent. Your account details are never included.",
  },
  {
    h: "5. Security data",
    b: "If you set a password or enable two-factor authentication, the related values are stored locally on your device. Passwords are stored as a hash, not in plain text. There is no central server holding your credentials.",
  },
  {
    h: "6. Sessions & login history",
    b: "The app keeps a local record of recent sessions and login activity so you can review them and sign out of other devices. This information lives on your device.",
  },
  {
    h: "7. Your controls",
    b: "You can make your account private, hide disagreement counts, block users, filter content, export your data, and delete your account — all from Settings. Exported data is generated on-device as a JSON or CSV file.",
  },
  {
    h: "8. Children",
    b: "overthinkers is not intended for children under 13. If you believe a child has provided information, please contact us so we can help.",
  },
  {
    h: "9. Changes",
    b: "We may update this policy as the app evolves. Material changes will be reflected here with an updated date.",
  },
  {
    h: "10. Contact",
    b: "Questions about privacy? Reach us at privacy@overthinkers.com.",
  },
];

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { appLanguage } = useSettings();
  const styles = makeStyles(colors);
  const bottomPad = Platform.OS === "web" ? 40 : insets.bottom + 24;

  return (
    <>
      <Stack.Screen options={{
        title: t(appLanguage, "legal.privacy.title"),
        headerStyle: { backgroundColor: colors.background } as any,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground } as any,
        headerTintColor: colors.primary,
      }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 20, paddingBottom: bottomPad }}>
        <Text style={styles.title}>{t(appLanguage, "legal.privacy.title")}</Text>
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
