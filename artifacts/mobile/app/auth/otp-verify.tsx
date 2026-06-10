import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function OtpVerifyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp, signInWithOtp } = useAuth();
  const { showToast } = useToast();

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const styles = makeStyles(colors);

  const handleVerify = async () => {
    if (!token.trim() || token.length < 6) {
      showToast("Enter the 6-digit code from your email.", { type: "error" });
      return;
    }
    setLoading(true);
    const { error } = await verifyOtp(email!, token.trim());
    setLoading(false);
    if (error) {
      showToast(error.message || "Invalid or expired code. Try again.", { type: "error" });
    } else {
      router.replace("/(tabs)");
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    const { error } = await signInWithOtp(email);
    setResending(false);
    if (error) {
      showToast("Couldn't resend code. Try again.", { type: "error" });
    } else {
      showToast("New code sent to your email.", { type: "success" });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{"\n"}
          <Text style={[styles.subtitle, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
            {email}
          </Text>
        </Text>

        <TextInput
          style={[styles.codeInput, {
            backgroundColor: colors.surface,
            borderColor: colors.primary,
            color: colors.foreground,
          }]}
          value={token}
          onChangeText={t => setToken(t.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="number-pad"
          textAlign="center"
          autoFocus
          maxLength={6}
        />

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }, loading && styles.btnDisabled]}
          onPress={handleVerify}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Verify Code</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={handleResend}
          disabled={resending}
          activeOpacity={0.7}
        >
          <Text style={[styles.linkText, { color: colors.primary }]}>
            {resending ? "Resending…" : "Resend code"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={[styles.linkText, { color: colors.mutedForeground }]}>Back to login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, padding: 24, justifyContent: "center" },
    title: {
      fontSize: 28, fontFamily: "Inter_700Bold", color: colors.foreground,
      textAlign: "center", marginBottom: 12,
    },
    subtitle: {
      fontSize: 15, color: colors.mutedForeground, fontFamily: "Inter_400Regular",
      textAlign: "center", lineHeight: 22, marginBottom: 32,
    },
    codeInput: {
      borderWidth: 2, borderRadius: 16,
      paddingVertical: 18, fontSize: 28,
      fontFamily: "Inter_700Bold", letterSpacing: 10,
      marginBottom: 24,
    },
    btn: {
      borderRadius: 12, paddingVertical: 16,
      alignItems: "center", marginBottom: 16,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
    linkBtn: { alignItems: "center", paddingVertical: 10 },
    linkText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  });
}
