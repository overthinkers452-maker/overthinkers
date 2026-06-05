import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useTheme, ThemeMode } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { useSettings, APP_LANGUAGES } from "@/context/SettingsContext";
import { useModal } from "@/context/ModalContext";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { themeMode, setThemeMode } = useTheme();
  const { translateLang, setTranslateLang } = useApp();
  const {
    hapticsEnabled, setHapticsEnabled,
    soundEnabled, setSoundEnabled,
    appLanguage, setAppLanguage,
  } = useSettings();
  const modal = useModal();

  // Local state for toggleable settings (no backend yet — persisted in future)
  const [notifAppreciations, setNotifAppreciations] = useState(true);
  const [notifComments, setNotifComments]   = useState(true);
  const [notifFollows, setNotifFollows]     = useState(true);
  const [notifReposts, setNotifReposts]     = useState(false);
  const [privateMode, setPrivateMode]       = useState(false);
  const [hideDisagrees, setHideDisagrees]   = useState(false);
  const [twoFactor, setTwoFactor]           = useState(false);

  const bottomPad = Platform.OS === "web" ? 32 : insets.bottom + 16;
  const styles = makeStyles(colors);

  const THEME_OPTIONS: { label: string; value: ThemeMode; icon: keyof typeof Feather.glyphMap }[] = [
    { label: "System", value: "auto",  icon: "monitor" },
    { label: "Light",  value: "light", icon: "sun"     },
    { label: "Dark",   value: "dark",  icon: "moon"    },
  ];

  const Row = ({ label, icon, onPress, value, isSwitch, danger }: {
    label: string; icon: keyof typeof Feather.glyphMap;
    onPress?: () => void; value?: boolean;
    isSwitch?: boolean; danger?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={isSwitch ? 1 : 0.7}
      style={[styles.row, { borderBottomColor: colors.border }]}
    >
      <Feather name={icon} size={18} color={danger ? colors.disagree : colors.mutedForeground} />
      <Text style={[styles.rowLabel, danger && { color: colors.disagree }]}>{label}</Text>
      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={onPress as any}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor="#fff"
        />
      ) : (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{
        title: "Settings",
        headerStyle: { backgroundColor: colors.background } as any,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground } as any,
        headerTintColor: colors.primary,
      }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: bottomPad }}>

        {/* Appearance */}
        <Text style={styles.section}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Theme</Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setThemeMode(opt.value)}
                style={[styles.themeBtn, {
                  backgroundColor: themeMode === opt.value ? colors.primary : colors.secondary,
                  borderColor: themeMode === opt.value ? colors.primary : colors.border,
                }]}
                activeOpacity={0.8}
              >
                <Feather name={opt.icon} size={16} color={themeMode === opt.value ? "#fff" : colors.mutedForeground} />
                <Text style={[styles.themeBtnText, { color: themeMode === opt.value ? "#fff" : colors.foreground }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Feedback & Sound */}
        <Text style={styles.section}>Feedback & Sound</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label="Haptic feedback" icon="zap" isSwitch value={hapticsEnabled} onPress={() => setHapticsEnabled(!hapticsEnabled)} />
          <Row label="Sound effects" icon="volume-2" isSwitch value={soundEnabled} onPress={() => setSoundEnabled(!soundEnabled)} />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Both are off by default. Likes and follows always show a subtle visual animation.
          </Text>
        </View>

        {/* Notifications */}
        <Text style={styles.section}>Notifications</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label="Appreciations" icon="heart" isSwitch value={notifAppreciations} onPress={() => setNotifAppreciations(v => !v)} />
          <Row label="Comments & replies" icon="message-circle" isSwitch value={notifComments} onPress={() => setNotifComments(v => !v)} />
          <Row label="New followers" icon="user-plus" isSwitch value={notifFollows} onPress={() => setNotifFollows(v => !v)} />
          <Row label="Reposts" icon="repeat" isSwitch value={notifReposts} onPress={() => setNotifReposts(v => !v)} />
        </View>

        {/* Privacy */}
        <Text style={styles.section}>Privacy</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label="Private account" icon="lock" isSwitch value={privateMode} onPress={() => setPrivateMode(v => !v)} />
          <Row label="Hide disagreement counts" icon="eye-off" isSwitch value={hideDisagrees} onPress={() => setHideDisagrees(v => !v)} />
          <Row label="Blocked users" icon="slash" onPress={() => modal.alert({ title: "Blocked users", message: "No blocked users yet." })} />
          <Row label="Content filters" icon="filter" onPress={() => modal.alert({ title: "Content filters", message: "Coming soon — filter categories from your feed." })} />
        </View>

        {/* Security */}
        <Text style={styles.section}>Security</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label="Two-factor authentication" icon="shield" isSwitch value={twoFactor} onPress={() => setTwoFactor(v => !v)} />
          <Row label="Change password" icon="key" onPress={() => modal.alert({ title: "Change password", message: "Password reset link sent to your email." })} />
          <Row label="Active sessions" icon="smartphone" onPress={() => modal.alert({ title: "Active sessions", message: "Only this device is currently active." })} />
          <Row label="Login history" icon="clock" onPress={() => modal.alert({ title: "Login history", message: "No suspicious activity detected." })} />
        </View>

        {/* Language */}
        <Text style={styles.section}>Language & Content</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row
            label={`App language: ${APP_LANGUAGES.find(l => l.code === appLanguage)?.label ?? "English"}`}
            icon="globe"
            onPress={() => modal.sheet({
              title: "App language",
              actions: APP_LANGUAGES.map(l => ({
                label: l.label,
                icon: appLanguage === l.code ? "check" : "circle",
                onPress: () => setAppLanguage(l.code),
              })),
            })}
          />
          <Row
            label={`Translation language: ${translateLang?.label ?? "None"}`}
            icon="type"
            onPress={() => modal.alert({ title: "Translation", message: "Tap the Translate button on any thought card to set your preferred language." })}
          />
          {translateLang && (
            <TouchableOpacity onPress={() => setTranslateLang(null)} style={[styles.row, { borderBottomColor: colors.border }]}>
              <Feather name="x-circle" size={18} color={colors.mutedForeground} />
              <Text style={styles.rowLabel}>Clear saved translation language</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Account */}
        <Text style={styles.section}>Account</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label="Export my data" icon="download" onPress={() => modal.alert({ title: "Export data", message: "A download link will be emailed to you within 24 hours." })} />
          <Row label="Log out of other devices" icon="log-out" onPress={() => modal.alert({ title: "Log out", message: "All other sessions have been terminated." })} />
          <Row label="Delete account" icon="trash-2" danger onPress={() => modal.confirm({ title: "Delete account", message: "This will permanently delete all your thoughts and data. This cannot be undone.", confirmText: "Delete", destructive: true, onConfirm: () => modal.alert({ title: "Account deletion", message: "Your account has been scheduled for deletion in 30 days." }) })} />
        </View>

        {/* About */}
        <Text style={styles.section}>About</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label="Privacy policy" icon="file-text" onPress={() => modal.alert({ title: "Privacy Policy", message: "overthinkers.com/privacy" })} />
          <Row label="Terms of service" icon="book" onPress={() => modal.alert({ title: "Terms", message: "overthinkers.com/terms" })} />
          <Row label="Send feedback" icon="mail" onPress={() => modal.alert({ title: "Feedback", message: "feedback@overthinkers.com" })} />
          <View style={[styles.row, { borderBottomColor: "transparent" }]}>
            <Feather name="info" size={18} color={colors.mutedForeground} />
            <Text style={styles.rowLabel}>Version 1.0.0</Text>
            <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>overthinkers</Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    section: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, letterSpacing: 0.8, textTransform: "uppercase", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6 },
    card: { marginHorizontal: 12, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
    cardLabel: { fontSize: 12, fontFamily: "Inter_500Medium", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
    themeRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
    themeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 10 },
    themeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
    rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground },
    rowMeta: { fontSize: 13, fontFamily: "Inter_400Regular" },
    hint: { fontSize: 12, fontFamily: "Inter_400Regular", paddingHorizontal: 16, paddingVertical: 12, lineHeight: 17 },
  });
}
