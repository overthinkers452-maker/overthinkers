import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useSettings } from "@/context/SettingsContext";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, signInWithOtp, signInWithGoogle, signInAnonymously, bannedError } = useAuth();
  const { showToast } = useToast();
  const { recordLogin } = useSettings();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpMode, setOtpMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  useEffect(() => {
    if (bannedError) showToast(bannedError, { type: "error" });
  }, [bannedError]);

  const styles = makeStyles(colors);

  const handleLogin = async () => {
    if (!email.trim()) {
      showToast("Please enter your email.", { type: "error" });
      return;
    }
    if (!otpMode && !password.trim()) {
      showToast("Please enter your password.", { type: "error" });
      return;
    }

    setLoading(true);

    if (otpMode) {
      const { error } = await signInWithOtp(email.trim().toLowerCase());
      setLoading(false);
      if (error) {
        showToast(error.message || "Couldn't send code. Please try again.", { type: "error" });
      } else {
        router.push({ pathname: "/auth/otp-verify", params: { email: email.trim().toLowerCase() } });
      }
    } else {
      const { error } = await signIn(email.trim().toLowerCase(), password);
      setLoading(false);
      if (error) {
        recordLogin("failed");
        showToast(error.message || "Login failed. Please try again.", { type: "error" });
      } else {
        recordLogin("success");
        router.replace("/(tabs)");
      }
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) showToast(error.message || "Google sign-in failed.", { type: "error" });
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    const { error } = await signInAnonymously();
    setGuestLoading(false);
    if (error) {
      showToast(error.message || "Couldn't continue as guest.", { type: "error" });
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>overthinkers</Text>
          <Text style={styles.tagline}>Think in public.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />

          {!otpMode && (
            <>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
              />
              <Link href="/auth/forgot-password" asChild>
                <TouchableOpacity style={styles.forgotBtn}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </Link>
            </>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>
                  {otpMode ? "Send Code" : "Sign In"}
                </Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleOtpBtn}
            onPress={() => { setOtpMode(m => !m); setPassword(""); }}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleOtpText}>
              {otpMode ? "Sign in with password instead" : "Sign in with email code instead"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <View style={styles.altButtons}>
          <TouchableOpacity
            style={[styles.altBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={handleGoogle}
            disabled={googleLoading}
            activeOpacity={0.85}
          >
            {googleLoading
              ? <ActivityIndicator color={colors.foreground} size="small" />
              : <>
                  <Feather name="globe" size={16} color={colors.foreground} />
                  <Text style={[styles.altBtnText, { color: colors.foreground }]}>Continue with Google</Text>
                </>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.altBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={handleGuest}
            disabled={guestLoading}
            activeOpacity={0.85}
          >
            {guestLoading
              ? <ActivityIndicator color={colors.mutedForeground} size="small" />
              : <>
                  <Feather name="user" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.altBtnText, { color: colors.mutedForeground }]}>Continue as Guest</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/auth/signup" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, padding: 24, justifyContent: "center" },
    header: { alignItems: "center", marginBottom: 40 },
    logo: { fontSize: 32, fontFamily: "Inter_700Bold", color: colors.primary, letterSpacing: -1 },
    tagline: { fontSize: 16, color: colors.mutedForeground, marginTop: 8, fontFamily: "Inter_400Regular" },
    form: { gap: 8 },
    label: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground, marginBottom: 4, marginTop: 12 },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border, borderRadius: 12,
      paddingHorizontal: 16, paddingVertical: 14,
      fontSize: 16, color: colors.foreground, fontFamily: "Inter_400Regular",
    },
    forgotBtn: { alignSelf: "flex-end", marginTop: 8, marginBottom: 4 },
    forgotText: { color: colors.primary, fontSize: 14, fontFamily: "Inter_500Medium" },
    primaryBtn: {
      backgroundColor: colors.primary, borderRadius: 12,
      paddingVertical: 16, alignItems: "center", marginTop: 16,
    },
    btnDisabled: { opacity: 0.6 },
    primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
    toggleOtpBtn: { alignItems: "center", paddingVertical: 10 },
    toggleOtpText: { color: colors.primary, fontSize: 13, fontFamily: "Inter_500Medium" },
    dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 20 },
    dividerLine: { flex: 1, height: 1 },
    dividerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
    altButtons: { gap: 10 },
    altBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 14,
    },
    altBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
    footer: { flexDirection: "row", justifyContent: "center", marginTop: 28 },
    footerText: { color: colors.mutedForeground, fontSize: 15, fontFamily: "Inter_400Regular" },
    footerLink: { color: colors.primary, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  });
}
