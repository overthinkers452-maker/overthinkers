import React from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useTheme, ThemeMode } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useSettings, APP_LANGUAGES } from "@/context/SettingsContext";
import { useModal } from "@/context/ModalContext";
import { useToast } from "@/context/ToastContext";
import { t } from "@/utils/i18n";
import { exportData, type ExportPayload } from "@/utils/exportData";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { themeMode, setThemeMode } = useTheme();
  const { translateLang, setTranslateLang, currentUser, thoughts, blockedUsers, mutedUsers } = useApp();
  const {
    hapticsEnabled, setHapticsEnabled,
    soundEnabled, setSoundEnabled,
    appLanguage, setAppLanguage,
    notifications, setNotification,
    privateAccount, setPrivateAccount,
    hideDisagreements, setHideDisagreements,
    blockedWords,
    twoFactor,
    sessions, terminateOtherSessions,
  } = useSettings();
  const modal = useModal();
  const { showToast } = useToast();
  const { signOut, deleteAccount, profile, updateProfile } = useAuth();

  const tr = (key: string, vars?: Record<string, string | number>) => t(appLanguage, key, vars);

  const bottomPad = Platform.OS === "web" ? 32 : insets.bottom + 16;
  const styles = makeStyles(colors);

  const THEME_OPTIONS: { key: string; value: ThemeMode; icon: keyof typeof Feather.glyphMap }[] = [
    { key: "settings.theme.system", value: "auto",  icon: "monitor" },
    { key: "settings.theme.light",  value: "light", icon: "sun"     },
    { key: "settings.theme.dark",   value: "dark",  icon: "moon"    },
  ];

  const onChangeLanguage = () => {
    modal.sheet({
      title: tr("settings.appLanguage"),
      actions: APP_LANGUAGES.map((l) => ({
        label: l.label,
        icon: appLanguage === l.code ? "check" : "circle",
        onPress: () => {
          setAppLanguage(l.code);
          showToast(t(l.code, "toast.languageChanged"), { type: "success" });
        },
      })),
    });
  };

  const onExport = () => {
    const payload: ExportPayload = {
      profile: {
        displayName: currentUser.displayName,
        username: currentUser.username,
        bio: currentUser.bio,
      },
      thoughts: thoughts
        .filter((th) => th.authorId === currentUser.id)
        .map((th) => ({
          id: th.id,
          content: th.content,
          category: th.category,
          postingMode: th.postingMode,
          appreciations: th.appreciations,
          disagreements: th.disagreements,
          comments: th.comments,
          createdAt: th.createdAt,
        })),
      settings: {
        theme: themeMode,
        appLanguage,
        privateAccount,
        hideDisagreements,
        notifications,
        blockedWords,
        twoFactorEnabled: twoFactor.enabled,
      },
      exportedAt: new Date().toISOString(),
    };

    modal.sheet({
      title: tr("export.title"),
      message: tr("export.desc"),
      actions: [
        {
          label: tr("export.json"),
          icon: "code",
          onPress: async () => {
            await exportData(payload, "json");
            showToast(tr("toast.exported"), { type: "success" });
          },
        },
        {
          label: tr("export.csv"),
          icon: "grid",
          onPress: async () => {
            await exportData(payload, "csv");
            showToast(tr("toast.exported"), { type: "success" });
          },
        },
      ],
    });
  };

  const onLogoutOthers = () => {
    const others = sessions.filter((s) => !s.current).length;
    if (others === 0) {
      showToast(tr("toast.noOtherSessions"), { type: "info" });
      return;
    }
    modal.confirm({
      title: tr("settings.logoutOthers"),
      message: `${others} other device(s) will be signed out immediately.`,
      confirmText: tr("common.confirm"),
      destructive: true,
      onConfirm: () => {
        const n = terminateOtherSessions();
        showToast(tr("toast.sessionsTerminated", { n }), { type: "success" });
      },
    });
  };

  const onClearTranslation = () => {
    setTranslateLang(null);
    showToast(tr("toast.translationCleared"), { type: "info" });
  };

  const Row = ({ label, icon, onPress, value, isSwitch, danger, meta }: {
    label: string; icon: keyof typeof Feather.glyphMap;
    onPress?: () => void; value?: boolean;
    isSwitch?: boolean; danger?: boolean; meta?: string;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={isSwitch ? 1 : 0.7}
      style={[styles.row, { borderBottomColor: colors.border }]}
    >
      <Feather name={icon} size={18} color={danger ? colors.disagree : colors.mutedForeground} />
      <Text style={[styles.rowLabel, danger && { color: colors.disagree }]}>{label}</Text>
      {meta != null && !isSwitch && <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>{meta}</Text>}
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
        title: tr("settings.title"),
        headerStyle: { backgroundColor: colors.background } as any,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground } as any,
        headerTintColor: colors.primary,
      }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: bottomPad }}>

        {/* Appearance */}
        <Text style={styles.section}>{tr("settings.section.appearance")}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>{tr("settings.theme")}</Text>
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
                  {tr(opt.key)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Feedback & Sound */}
        <Text style={styles.section}>{tr("settings.section.feedback")}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label={tr("settings.haptics")} icon="zap" isSwitch value={hapticsEnabled} onPress={() => setHapticsEnabled(!hapticsEnabled)} />
          <Row label={tr("settings.sound")} icon="volume-2" isSwitch value={soundEnabled} onPress={() => setSoundEnabled(!soundEnabled)} />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>{tr("settings.feedbackHint")}</Text>
        </View>

        {/* Notifications */}
        <Text style={styles.section}>{tr("settings.section.notifications")}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label={tr("settings.notif.appreciations")} icon="heart" isSwitch value={notifications.appreciations} onPress={() => setNotification("appreciations", !notifications.appreciations)} />
          <Row label={tr("settings.notif.comments")} icon="message-circle" isSwitch value={notifications.comments} onPress={() => setNotification("comments", !notifications.comments)} />
          <Row label={tr("settings.notif.follows")} icon="user-plus" isSwitch value={notifications.follows} onPress={() => setNotification("follows", !notifications.follows)} />
          <Row label={tr("settings.notif.reposts")} icon="repeat" isSwitch value={notifications.reposts} onPress={() => setNotification("reposts", !notifications.reposts)} />
        </View>

        {/* Privacy */}
        <Text style={styles.section}>{tr("settings.section.privacy")}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row
            label="Private Account"
            icon="lock"
            isSwitch
            value={profile?.is_private ?? false}
            onPress={() => updateProfile({ is_private: !(profile?.is_private ?? false) }).catch(() => {})}
          />
          <Row
            label="Hide Appreciation Counts"
            icon="heart"
            isSwitch
            value={profile?.hide_appreciations ?? false}
            onPress={() => updateProfile({ hide_appreciations: !(profile?.hide_appreciations ?? false) }).catch(() => {})}
          />
          <Row
            label="Hide Repost Counts"
            icon="repeat"
            isSwitch
            value={profile?.hide_reposts ?? false}
            onPress={() => updateProfile({ hide_reposts: !(profile?.hide_reposts ?? false) }).catch(() => {})}
          />
          <Row label={tr("settings.hideDisagrees")} icon="eye-off" isSwitch value={hideDisagreements} onPress={() => setHideDisagreements(!hideDisagreements)} />
          <Row label={tr("settings.blockedUsers")} icon="slash" meta={blockedUsers.length ? String(blockedUsers.length) : undefined} onPress={() => router.push("/blocked")} />
          <Row label="Muted Accounts" icon="volume-x" meta={mutedUsers.length ? String(mutedUsers.length) : undefined} onPress={() => router.push("/muted")} />
          <Row label={tr("settings.contentFilters")} icon="filter" meta={blockedWords.length ? String(blockedWords.length) : undefined} onPress={() => router.push("/content-filters")} />
        </View>

        {/* Security */}
        <Text style={styles.section}>{tr("settings.section.security")}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label={tr("settings.twoFactor")} icon="shield" meta={twoFactor.enabled ? "On" : "Off"} onPress={() => router.push("/two-factor")} />
          <Row label={tr("settings.changePassword")} icon="key" onPress={() => router.push("/change-password")} />
          <Row label={tr("settings.activeSessions")} icon="smartphone" meta={String(sessions.length)} onPress={() => router.push("/sessions")} />
          <Row label={tr("settings.loginHistory")} icon="clock" onPress={() => router.push("/login-history")} />
        </View>

        {/* Language */}
        <Text style={styles.section}>{tr("settings.section.language")}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row
            label={tr("settings.appLanguage")}
            icon="globe"
            meta={APP_LANGUAGES.find(l => l.code === appLanguage)?.label ?? "English"}
            onPress={onChangeLanguage}
          />
          <Row
            label={tr("settings.translationLanguage")}
            icon="type"
            meta={translateLang?.label ?? tr("common.none")}
            onPress={() => modal.alert({ title: tr("settings.translationLanguage"), message: "Tap the Translate button on any thought card to set your preferred language." })}
          />
          {translateLang && (
            <TouchableOpacity onPress={onClearTranslation} style={[styles.row, { borderBottomColor: colors.border }]}>
              <Feather name="x-circle" size={18} color={colors.mutedForeground} />
              <Text style={styles.rowLabel}>{tr("settings.clearTranslation")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Account */}
        <Text style={styles.section}>{tr("settings.section.account")}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label={tr("settings.exportData")} icon="download" onPress={onExport} />
          <Row label={tr("settings.logoutOthers")} icon="log-out" onPress={onLogoutOthers} />
          <Row
            label="Sign Out"
            icon="log-out"
            danger
            onPress={() => modal.confirm({
              title: "Sign Out",
              message: "You'll be signed out of your account on this device.",
              confirmText: "Sign Out",
              destructive: true,
              onConfirm: async () => { await signOut(); },
            })}
          />
          <Row
            label={tr("settings.deleteAccount")}
            icon="trash-2"
            danger
            onPress={() => modal.confirm({
              title: tr("settings.deleteAccount"),
              message: "This will permanently delete all your thoughts, comments, and account data. This cannot be undone.",
              confirmText: tr("common.delete"),
              destructive: true,
              onConfirm: async () => {
                const { error } = await deleteAccount();
                if (error) {
                  modal.alert({ title: "Couldn't delete account", message: error.message });
                } else {
                  showToast("Account deleted.", { type: "success" });
                }
              },
            })}
          />
        </View>

        {/* About */}
        <Text style={styles.section}>{tr("settings.section.about")}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label={tr("settings.privacyPolicy")} icon="file-text" onPress={() => router.push("/legal/privacy")} />
          <Row label={tr("settings.terms")} icon="book" onPress={() => router.push("/legal/terms")} />
          <Row label={tr("settings.sendFeedback")} icon="mail" onPress={() => modal.alert({ title: tr("settings.sendFeedback"), message: "feedback@overthinkers.com" })} />
          <View style={[styles.row, { borderBottomColor: "transparent" }]}>
            <Feather name="info" size={18} color={colors.mutedForeground} />
            <Text style={styles.rowLabel}>{tr("settings.version")} 1.0.0</Text>
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
