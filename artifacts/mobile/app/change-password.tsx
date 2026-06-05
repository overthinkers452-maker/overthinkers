import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { useFeedback } from "@/hooks/useFeedback";
import { t } from "@/utils/i18n";
import { passwordStrength } from "@/utils/security";

export default function ChangePasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { appLanguage, hasPassword, verifyPassword, setPassword } = useSettings();
  const { showToast } = useToast();
  const { tap } = useFeedback();
  const styles = makeStyles(colors);
  const bottomPad = Platform.OS === "web" ? 32 : insets.bottom + 16;

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  const strength = passwordStrength(next);
  const strengthColors = [colors.destructive, colors.destructive, "#F59E0B", colors.appreciate];

  const onSubmit = () => {
    setError(null);
    if (hasPassword) {
      if (!verifyPassword(current)) { setError(t(appLanguage, "password.err.current")); return; }
    }
    if (next.length < 8) { setError(t(appLanguage, "password.err.length")); return; }
    if (hasPassword && next === current) { setError(t(appLanguage, "password.err.same")); return; }
    if (next !== confirm) { setError(t(appLanguage, "password.err.match")); return; }

    setPassword(next);
    tap();
    showToast(t(appLanguage, hasPassword ? "toast.passwordChanged" : "toast.passwordSet"), { type: "success" });
    router.back();
  };

  const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        placeholderTextColor={colors.mutedForeground}
      />
    </View>
  );

  const canSubmit = next.length > 0 && confirm.length > 0 && (!hasPassword || current.length > 0);

  return (
    <>
      <Stack.Screen options={{
        title: t(appLanguage, "password.title"),
        headerStyle: { backgroundColor: colors.background } as any,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground } as any,
        headerTintColor: colors.primary,
      }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }} keyboardShouldPersistTaps="handled">
        {!hasPassword && (
          <View style={[styles.notice, { backgroundColor: colors.secondary }]}>
            <Feather name="info" size={15} color={colors.primary} />
            <Text style={[styles.noticeText, { color: colors.foreground }]}>{t(appLanguage, "password.setFirst")}</Text>
          </View>
        )}

        {hasPassword && <Field label={t(appLanguage, "password.current")} value={current} onChange={setCurrent} />}
        <Field label={t(appLanguage, "password.new")} value={next} onChange={setNext} />

        {next.length > 0 && (
          <View style={styles.strengthRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.strengthBar, { backgroundColor: i < strength.score ? strengthColors[strength.score] : colors.border }]} />
            ))}
            <Text style={[styles.strengthText, { color: strengthColors[strength.score] }]}>{t(appLanguage, strength.labelKey)}</Text>
          </View>
        )}

        <Field label={t(appLanguage, "password.confirm")} value={confirm} onChange={setConfirm} />

        <TouchableOpacity onPress={() => setShow((s) => !s)} style={styles.showRow} activeOpacity={0.7}>
          <Feather name={show ? "eye-off" : "eye"} size={15} color={colors.mutedForeground} />
          <Text style={[styles.showText, { color: colors.mutedForeground }]}>{show ? "Hide" : "Show"} passwords</Text>
        </TouchableOpacity>

        {error && (
          <View style={styles.errorRow}>
            <Feather name="alert-circle" size={15} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        )}

        <TouchableOpacity onPress={onSubmit} disabled={!canSubmit} style={[styles.submit, { backgroundColor: canSubmit ? colors.primary : colors.secondary }]} activeOpacity={0.85}>
          <Text style={[styles.submitText, { color: canSubmit ? "#fff" : colors.mutedForeground }]}>{t(appLanguage, "password.title")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    notice: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, padding: 12, marginBottom: 18 },
    noticeText: { flex: 1, fontSize: 13.5, fontFamily: "Inter_400Regular", lineHeight: 19 },
    field: { marginBottom: 16 },
    label: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 7 },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
    strengthRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -8, marginBottom: 16 },
    strengthBar: { flex: 1, height: 4, borderRadius: 2 },
    strengthText: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginLeft: 6, minWidth: 56 },
    showRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
    showText: { fontSize: 13, fontFamily: "Inter_400Regular" },
    errorRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 4 },
    errorText: { flex: 1, fontSize: 13.5, fontFamily: "Inter_500Medium" },
    submit: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 18 },
    submitText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  });
}
