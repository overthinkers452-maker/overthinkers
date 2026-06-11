import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing,
  Pressable, TextInput, ScrollView, Platform, AccessibilityInfo,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

// ─── Public API types ──────────────────────────────────────────────────────────

export interface SheetAction {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  destructive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

interface AlertOpts {
  title: string;
  message?: string;
  confirmText?: string;
}

interface ConfirmOpts {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface SheetOpts {
  title?: string;
  message?: string;
  actions: SheetAction[];
}

export interface ReportReason { key: string; label: string; }

interface ReportOpts {
  title?: string;
  reasons?: ReportReason[];
  onSubmit: (reason: ReportReason, description: string) => void;
}

interface ModalContextType {
  alert: (opts: AlertOpts) => void;
  confirm: (opts: ConfirmOpts) => void;
  sheet: (opts: SheetOpts) => void;
  report: (opts: ReportOpts) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

const DEFAULT_REASONS: ReportReason[] = [
  { key: "spam", label: "Spam or misleading" },
  { key: "harassment", label: "Harassment or bullying" },
  { key: "hate", label: "Hate speech" },
  { key: "violence", label: "Violence or threats" },
  { key: "self_harm", label: "Self-harm" },
  { key: "misinformation", label: "Misinformation" },
  { key: "other", label: "Something else" },
];

type ModalKind =
  | { type: "alert"; opts: AlertOpts }
  | { type: "confirm"; opts: ConfirmOpts }
  | { type: "sheet"; opts: SheetOpts }
  | { type: "report"; opts: ReportOpts };

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [modal, setModal] = useState<ModalKind | null>(null);
  const [visible, setVisible] = useState(false);

  const translateY = useRef(new Animated.Value(600)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  // True only while a close is the latest intent. A chained open() (e.g. sheet
  // action -> confirm) flips this back to false so the interrupted close
  // animation's completion callback can't clear the freshly opened modal.
  const closingRef = useRef(false);

  // Report-flow local state
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");

  const open = useCallback((m: ModalKind) => {
    closingRef.current = false;
    setModal(m);
    setReason(null);
    setDescription("");
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(translateY, { toValue: 600, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      // A chained open() (sheet -> confirm/report) flips closingRef to false;
      // in that case keep the newly opened modal instead of clearing it.
      if (!closingRef.current) return;
      setVisible(false);
      setModal(null);
    });
  }, [translateY, backdrop]);

  useEffect(() => {
    if (visible) {
      translateY.setValue(600);
      backdrop.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, friction: 11, tension: 90, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      if (modal) {
        const announce =
          modal.type === "report" ? "Report dialog opened"
          : "title" in modal.opts && modal.opts.title ? modal.opts.title
          : "Dialog opened";
        AccessibilityInfo.announceForAccessibility?.(announce);
      }
    }
  }, [visible, modal, translateY, backdrop]);

  const alert = useCallback((opts: AlertOpts) => open({ type: "alert", opts }), [open]);
  const confirm = useCallback((opts: ConfirmOpts) => open({ type: "confirm", opts }), [open]);
  const sheet = useCallback((opts: SheetOpts) => open({ type: "sheet", opts }), [open]);
  const report = useCallback((opts: ReportOpts) => open({ type: "report", opts }), [open]);

  const s = makeStyles(colors);
  const bottomPad = (Platform.OS === "web" ? 24 : insets.bottom) + 20;

  const renderBody = () => {
    if (!modal) return null;

    if (modal.type === "alert") {
      const { title, message, confirmText } = modal.opts;
      return (
        <>
          <Text style={s.title} accessibilityRole="header">{title}</Text>
          {!!message && <Text style={s.message}>{message}</Text>}
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={close}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={[s.primaryBtnText, { color: colors.primaryForeground }]}>{confirmText || "OK"}</Text>
          </TouchableOpacity>
        </>
      );
    }

    if (modal.type === "confirm") {
      const { title, message, confirmText, cancelText, destructive, onConfirm, onCancel } = modal.opts;
      return (
        <>
          <Text style={s.title} accessibilityRole="header">{title}</Text>
          {!!message && <Text style={s.message}>{message}</Text>}
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: destructive ? colors.disagree : colors.primary }]}
            onPress={() => { close(); onConfirm(); }}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={[s.primaryBtnText, { color: "#fff" }]}>{confirmText || "Confirm"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => { close(); onCancel?.(); }}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={[s.secondaryBtnText, { color: colors.foreground }]}>{cancelText || "Cancel"}</Text>
          </TouchableOpacity>
        </>
      );
    }

    if (modal.type === "sheet") {
      const { title, message, actions } = modal.opts;
      return (
        <>
          {!!title && <Text style={s.title} accessibilityRole="header">{title}</Text>}
          {!!message && <Text style={s.message}>{message}</Text>}
          <View style={{ gap: 8, marginTop: title || message ? 8 : 0 }}>
            {actions.map((a, i) => (
              <TouchableOpacity
                key={i}
                disabled={a.disabled}
                style={[
                  s.actionRow,
                  { borderColor: colors.border, backgroundColor: colors.secondary, opacity: a.disabled ? 0.5 : 1 },
                ]}
                onPress={() => { close(); a.onPress?.(); }}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                {a.icon && (
                  <Feather name={a.icon} size={18} color={a.destructive ? colors.disagree : colors.foreground} />
                )}
                <Text style={[s.actionText, { color: a.destructive ? colors.disagree : colors.foreground }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[s.secondaryBtn, { borderColor: colors.border, marginTop: 4 }]}
              onPress={close}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={[s.secondaryBtnText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    // report
    const { title, reasons, onSubmit } = modal.opts;
    const reasonList = reasons || DEFAULT_REASONS;
    return (
      <>
        <Text style={s.title} accessibilityRole="header">{title || "Report content"}</Text>
        <Text style={s.message}>Choose a reason. Reports are reviewed and the content is hidden from you immediately.</Text>
        <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 8 }}>
            {reasonList.map(r => {
              const active = reason?.key === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => setReason(r)}
                  style={[s.reasonRow, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + "15" : colors.secondary }]}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Feather name={active ? "check-circle" : "circle"} size={18} color={active ? colors.primary : colors.mutedForeground} />
                  <Text style={[s.reasonText, { color: active ? colors.primary : colors.foreground }]}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>Add details (optional)</Text>
          <TextInput
            style={[s.descInput, { borderColor: colors.border, backgroundColor: colors.secondary, color: colors.foreground }]}
            placeholder="Anything else the moderation team should know?"
            placeholderTextColor={colors.mutedForeground}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={300}
          />
        </ScrollView>
        <TouchableOpacity
          style={[s.primaryBtn, { backgroundColor: reason ? colors.disagree : colors.muted, marginTop: 12 }]}
          disabled={!reason}
          onPress={() => { if (reason) { const r = reason; const d = description; close(); onSubmit(r, d.trim()); } }}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={[s.primaryBtnText, { color: reason ? "#fff" : colors.mutedForeground }]}>Submit report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.secondaryBtn, { borderColor: colors.border }]} onPress={close} activeOpacity={0.7} accessibilityRole="button">
          <Text style={[s.secondaryBtnText, { color: colors.foreground }]}>Cancel</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <ModalContext.Provider value={{ alert, confirm, sheet, report }}>
      {children}
      {visible && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdrop }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Dismiss dialog">
              <BlurView intensity={Platform.OS === "android" ? 40 : 24} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.35)" }]} />
            </Pressable>
          </Animated.View>
          <Animated.View
            style={[s.sheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: bottomPad, transform: [{ translateY }] }]}
            accessibilityViewIsModal
          >
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            {renderBody()}
          </Animated.View>
        </View>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    sheet: {
      position: "absolute", left: 0, right: 0, bottom: 0,
      borderTopLeftRadius: 22, borderTopRightRadius: 22,
      borderWidth: 1, paddingHorizontal: 20, paddingTop: 12,
      shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 16,
    },
    handle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
    title: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 6 },
    message: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 20, marginBottom: 14 },
    primaryBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 4 },
    primaryBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
    secondaryBtn: { borderRadius: 14, paddingVertical: 13, alignItems: "center", borderWidth: 1, marginTop: 8 },
    secondaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    actionRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
    actionText: { fontSize: 15, fontFamily: "Inter_500Medium" },
    reasonRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
    reasonText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
    fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 16, marginBottom: 8 },
    descInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 70, textAlignVertical: "top" },
  });
}
