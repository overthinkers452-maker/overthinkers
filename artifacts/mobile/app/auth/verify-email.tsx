import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function VerifyEmailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { resendVerification } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const styles = makeStyles(colors);

  const handleResend = async () => {
    if (!email) return;
    setLoading(true);
    const { error } = await resendVerification(email);
    setLoading(false);
    if (error) {
      showToast(error.message || "Could not resend. Try again shortly.", { type: "error" });
    } else {
      setResent(true);
      showToast("Verification email sent!", { type: "success" });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name="mail" size={36} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Check your email</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          We sent a verification link to{"\n"}
          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>{email ?? "your email"}</Text>
          {"\n\n"}Open the link in that email to activate your account. Once verified, come back here and sign in.
        </Text>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }, loading && styles.btnDisabled]}
          onPress={() => router.replace("/auth/login")}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Go to Sign In</Text>
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Text style={[styles.resendText, { color: colors.mutedForeground }]}>Didn't get it? </Text>
          {loading ? (
            <ActivityIndicator size={14} color={colors.primary} />
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={resent} activeOpacity={0.7}>
              <Text style={[styles.resendLink, { color: resent ? colors.mutedForeground : colors.primary }]}>
                {resent ? "Email sent ✓" : "Resend email"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1 },
    inner: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 0 },
    iconWrap: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 28 },
    title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 16, textAlign: "center" },
    body: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, textAlign: "center", marginBottom: 32 },
    primaryBtn: { width: "100%", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginBottom: 20 },
    btnDisabled: { opacity: 0.6 },
    primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
    resendRow: { flexDirection: "row", alignItems: "center" },
    resendText: { fontSize: 14, fontFamily: "Inter_400Regular" },
    resendLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  });
}
