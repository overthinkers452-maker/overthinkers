import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { useModal } from "@/context/ModalContext";
import { useFeedback } from "@/hooks/useFeedback";
import { t } from "@/utils/i18n";
import { generateTotpSecret, generateBackupCodes, formatSecretGroups, buildOtpAuthUri } from "@/utils/security";

export default function TwoFactorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentUser } = useApp();
  const { appLanguage, twoFactor, enableTwoFactor, disableTwoFactor } = useSettings();
  const { showToast } = useToast();
  const modal = useModal();
  const { tap } = useFeedback();
  const styles = makeStyles(colors);
  const bottomPad = Platform.OS === "web" ? 40 : insets.bottom + 24;

  // Generate a fresh secret + codes once for the setup flow.
  const [secret] = useState(() => generateTotpSecret());
  const [backupCodes] = useState(() => generateBackupCodes());

  const account = currentUser.username ? `@${currentUser.username}` : currentUser.displayName;
  const otpUri = buildOtpAuthUri(secret, account);

  const copy = async (value: string) => {
    await Clipboard.setStringAsync(value);
    tap();
    showToast(t(appLanguage, "toast.copied"), { type: "success" });
  };

  const onEnable = () => {
    enableTwoFactor(secret, backupCodes);
    tap();
    showToast(t(appLanguage, "toast.twofaEnabled"), { type: "success" });
    router.back();
  };

  const onDisable = () => {
    modal.confirm({
      title: t(appLanguage, "twofa.disable"),
      message: "Your account will no longer require a second factor at sign-in.",
      confirmText: t(appLanguage, "common.disable"),
      destructive: true,
      onConfirm: () => {
        disableTwoFactor();
        tap();
        showToast(t(appLanguage, "toast.twofaDisabled"), { type: "info" });
        router.back();
      },
    });
  };

  return (
    <>
      <Stack.Screen options={{
        title: t(appLanguage, "twofa.title"),
        headerStyle: { backgroundColor: colors.background } as any,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground } as any,
        headerTintColor: colors.primary,
      }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}>
        {twoFactor.enabled ? (
          <>
            <View style={[styles.enabledCard, { backgroundColor: colors.appreciate + "14", borderColor: colors.appreciate + "44" }]}>
              <Feather name="shield" size={22} color={colors.appreciate} />
              <Text style={[styles.enabledText, { color: colors.foreground }]}>{t(appLanguage, "twofa.enabledNote")}</Text>
            </View>

            <Text style={styles.sectionTitle}>{t(appLanguage, "twofa.backupTitle")}</Text>
            <View style={[styles.codeGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {twoFactor.backupCodes.map((c) => (
                <Text key={c} style={[styles.code, { color: colors.foreground }]}>{c}</Text>
              ))}
            </View>
            <TouchableOpacity onPress={() => copy(twoFactor.backupCodes.join("\n"))} style={[styles.secondaryBtn, { borderColor: colors.border }]} activeOpacity={0.8}>
              <Feather name="copy" size={15} color={colors.primary} />
              <Text style={[styles.secondaryText, { color: colors.primary }]}>{t(appLanguage, "twofa.copyCodes")}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onDisable} style={[styles.dangerBtn, { borderColor: colors.destructive }]} activeOpacity={0.85}>
              <Feather name="shield-off" size={16} color={colors.destructive} />
              <Text style={[styles.dangerText, { color: colors.destructive }]}>{t(appLanguage, "twofa.disable")}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.intro}>{t(appLanguage, "twofa.intro")}</Text>

            <View style={[styles.qrWrap, { backgroundColor: "#fff", borderColor: colors.border }]}>
              <QRCode value={otpUri} size={180} backgroundColor="#fff" color="#000" />
            </View>

            <Text style={styles.label}>{t(appLanguage, "twofa.key")}</Text>
            <View style={[styles.keyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.keyText, { color: colors.foreground }]} selectable>{formatSecretGroups(secret)}</Text>
            </View>
            <TouchableOpacity onPress={() => copy(secret)} style={[styles.secondaryBtn, { borderColor: colors.border }]} activeOpacity={0.8}>
              <Feather name="copy" size={15} color={colors.primary} />
              <Text style={[styles.secondaryText, { color: colors.primary }]}>{t(appLanguage, "twofa.copyKey")}</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>{t(appLanguage, "twofa.backupTitle")}</Text>
            <Text style={styles.backupDesc}>{t(appLanguage, "twofa.backupDesc")}</Text>
            <View style={[styles.codeGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {backupCodes.map((c) => (
                <Text key={c} style={[styles.code, { color: colors.foreground }]}>{c}</Text>
              ))}
            </View>
            <TouchableOpacity onPress={() => copy(backupCodes.join("\n"))} style={[styles.secondaryBtn, { borderColor: colors.border }]} activeOpacity={0.8}>
              <Feather name="copy" size={15} color={colors.primary} />
              <Text style={[styles.secondaryText, { color: colors.primary }]}>{t(appLanguage, "twofa.copyCodes")}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onEnable} style={[styles.primaryBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85}>
              <Feather name="check" size={16} color="#fff" />
              <Text style={styles.primaryText}>{t(appLanguage, "twofa.finish")}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    intro: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 20, marginBottom: 18 },
    qrWrap: { alignSelf: "center", padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 22 },
    label: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 7 },
    keyBox: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 10 },
    keyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, textAlign: "center" },
    sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginTop: 24, marginBottom: 6 },
    backupDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 19, marginBottom: 12 },
    codeGrid: { flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderRadius: 12, padding: 14, gap: 10, marginBottom: 10, justifyContent: "space-between" },
    code: { width: "47%", fontSize: 15, fontFamily: "Inter_500Medium", letterSpacing: 1, textAlign: "center", paddingVertical: 4 },
    secondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 11, marginBottom: 4 },
    secondaryText: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
    primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 15, marginTop: 22 },
    primaryText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
    dangerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 14, marginTop: 28 },
    dangerText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    enabledCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 16 },
    enabledText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  });
}
