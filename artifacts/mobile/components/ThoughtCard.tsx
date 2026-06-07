import React, { useCallback, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable, Modal,
  ActivityIndicator, ScrollView, Animated, Share,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { Thought, useApp } from "@/context/AppContext";
import { PollCard } from "@/components/PollCard";
import { formatCount, timeAgo, withinEditWindow } from "@/utils/format";
import { useFeedback } from "@/hooks/useFeedback";
import { useBounce } from "@/hooks/useBounce";
import { useSettings } from "@/context/SettingsContext";
import { useModal, type SheetAction } from "@/context/ModalContext";
import { useToast } from "@/context/ToastContext";
import { modeLabel, t } from "@/utils/i18n";
import { translateText } from "@/utils/translate";

interface Props { thought: Thought; showReason?: boolean; }

const AVATAR_COLORS = ["#E8D5FF","#D5E8FF","#D5FFE8","#FFE8D5","#FFD5E8","#D5F0FF","#F0FFD5","#FFD5F0"];
function getAvatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + h * 31;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const LANGUAGES: { code: string; label: string; roman?: boolean }[] = [
  { code: "hi", label: "Hindi" },
  { code: "hi", label: "Hinglish", roman: true },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "ko", label: "Korean" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
];

export function ThoughtCard({ thought, showReason = true }: Props) {
  const colors = useColors();
  const router = useRouter();
  const { toggleAppreciate, toggleDisagree, toggleSave, toggleRepost, reportThought, deleteThought, currentUser, translateLang, setTranslateLang, blockUser } = useApp();
  const { tap, select } = useFeedback();
  const { appLanguage, hideDisagreements } = useSettings();
  const modal = useModal();
  const { showToast } = useToast();
  const { scale: heartScale, bounce: heartBounce } = useBounce();
  const { scale: saveScale, bounce: saveBounce } = useBounce();

  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showQTooltip, setShowQTooltip] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOwnThought = thought.authorId === currentUser.id;
  const isAnon = thought.postingMode === "Anonymous";
  const isPseudo = thought.postingMode === "Pseudonymous";
  const authorDisplay = isAnon ? "Anonymous" : isPseudo ? (thought.alias || "Anonymous") : thought.authorName;
  const avatarBg = isAnon ? "#F0EEFF" : getAvatarColor(authorDisplay);
  const avatarTextColor = isAnon ? "#9088CC" : "#5B5BD6";
  const modeColor = thought.postingMode === "Public" ? colors.publicMode : thought.postingMode === "Pseudonymous" ? colors.pseudonymousMode : colors.anonymousMode;
  const modeIcon: keyof typeof Feather.glyphMap = thought.postingMode === "Public" ? "globe" : thought.postingMode === "Pseudonymous" ? "user" : "lock";

  // ─── Feature 1: Author tap → public profile ────────────────────────────────
  const onAuthorPress = useCallback(() => {
    if (isAnon) return; // anonymous → no profile
    if (thought.authorId === currentUser.id) {
      router.push("/(tabs)/profile");
    } else {
      router.push({ pathname: "/profile/[userId]", params: { userId: thought.authorId, name: authorDisplay } });
    }
  }, [isAnon, thought.authorId, currentUser.id, authorDisplay, router]);

  // ─── Feature 6: Translate ──────────────────────────────────────────────────
  const doTranslate = useCallback(async (lang: { code: string; label: string; roman?: boolean }) => {
    if (translatedText && showTranslation) { setShowTranslation(false); return; }
    if (translatedText) { setShowTranslation(true); return; }
    setTranslating(true);
    try {
      const result = await translateText(thought.content, lang);
      setTranslatedText(result);
      setShowTranslation(true);
    } finally {
      setTranslating(false);
    }
  }, [thought.content, translatedText, showTranslation]);

  const onTranslatePress = useCallback(() => {
    if (showTranslation) { setShowTranslation(false); return; }
    if (translateLang) {
      doTranslate(translateLang);
    } else {
      setShowLangPicker(true);
    }
  }, [showTranslation, translateLang, doTranslate]);

  const onSelectLang = useCallback((lang: { code: string; label: string }) => {
    setShowLangPicker(false);
    setTranslateLang(lang);
    doTranslate(lang);
  }, [setTranslateLang, doTranslate]);

  // ─── Feature 7: Q score long-press tooltip ────────────────────────────────
  const onQPressIn = useCallback(() => {
    tooltipTimer.current = setTimeout(() => setShowQTooltip(true), 400);
  }, []);
  const onQPressOut = useCallback(() => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setShowQTooltip(false);
  }, []);

  // ─── Engagement handlers ───────────────────────────────────────────────────
  const onAppreciate = useCallback(() => { tap(); heartBounce(); toggleAppreciate(thought.id); }, [thought.id, toggleAppreciate, tap, heartBounce]);
  const onDisagree   = useCallback(() => { tap(); toggleDisagree(thought.id); }, [thought.id, toggleDisagree, tap]);
  const onSave       = useCallback(() => { tap(); saveBounce(); toggleSave(thought.id); }, [thought.id, toggleSave, tap, saveBounce]);
  const onRepost     = useCallback(() => { tap(); toggleRepost(thought.id); }, [thought.id, toggleRepost, tap]);
  const onPress      = useCallback(() => router.push({ pathname: "/thought/[id]", params: { id: thought.id } }), [thought.id, router]);

  const onShare = useCallback(async () => {
    tap();
    try {
      await Share.share({
        message: thought.content,
        title: "A thought from overthinkers",
      });
    } catch {
      // user dismissed or not supported — silently ignore
    }
  }, [tap, thought.content]);

  const onMenuPress = useCallback(() => {
    select();
    if (isOwnThought) {
      const canEdit = withinEditWindow(thought.createdAt);
      modal.sheet({
        title: "Thought options",
        actions: [
          canEdit
            ? { label: "Edit thought", icon: "edit-2", onPress: () => router.push({ pathname: "/thought/[id]", params: { id: thought.id, edit: "1" } }) }
            : { label: "Edit window closed (30 min)", icon: "clock", disabled: true },
          {
            label: "Delete thought", icon: "trash-2", destructive: true,
            onPress: () => modal.confirm({
              title: "Delete thought",
              message: "This cannot be undone.",
              confirmText: "Delete",
              destructive: true,
              onConfirm: () => deleteThought(thought.id),
            }),
          },
        ],
      });
    } else {
      const actions: SheetAction[] = [];
      if (thought.hasReported) {
        actions.push({ label: "Already reported — under review", icon: "check", disabled: true });
      } else {
        actions.push({
          label: "Report thought", icon: "flag",
          onPress: () => modal.report({
            title: "Report this thought",
            onSubmit: (reason, description) => {
              const res = reportThought(thought.id, reason.label, description);
              modal.alert({ title: res.ok ? "Thanks for reporting" : "Couldn't report", message: res.message });
            },
          }),
        });
      }
      if (!isAnon) {
        actions.push({
          label: `Block ${authorDisplay}`, icon: "slash", destructive: true,
          onPress: () => modal.confirm({
            title: `Block ${authorDisplay}?`,
            message: "You won't see their thoughts in your feeds anymore. You can unblock them in Settings.",
            confirmText: "Block",
            destructive: true,
            onConfirm: () => {
              blockUser(thought.authorId, authorDisplay);
              showToast(t(appLanguage, "toast.userBlocked"), { type: "success" });
            },
          }),
        });
      }
      modal.sheet({ title: "Thought options", actions });
    }
  }, [isOwnThought, thought, isAnon, authorDisplay, router, reportThought, deleteThought, blockUser, showToast, appLanguage, modal, select]);

  const s = makeStyles(colors);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && s.cardPressed]}>
      {/* Repost attribution banner */}
      {thought.isRepost && (
        <View style={s.repostBanner}>
          <Feather name="repeat" size={11} color={colors.primary} />
          <Text style={[s.repostBannerText, { color: colors.primary }]}>
            Reshared from {thought.originalAuthorName}
          </Text>
        </View>
      )}

      {showReason && thought.feedReason && !thought.isRepost && (
        <View style={s.feedReasonRow}>
          <Feather name="zap" size={11} color={colors.mutedForeground} />
          <Text style={s.feedReason}>{thought.feedReason}</Text>
        </View>
      )}

      <View style={s.header}>
        {/* Feature 1: tappable author */}
        <TouchableOpacity onPress={onAuthorPress} activeOpacity={isAnon ? 1 : 0.7} style={s.authorRow}>
          <View style={[s.avatar, { backgroundColor: avatarBg }]}>
            <Text style={[s.avatarText, { color: avatarTextColor }]}>
              {isAnon ? "?" : authorDisplay.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={s.authorInfo}>
            <Text style={[s.authorName, !isAnon && { color: colors.primary }]}>{authorDisplay}</Text>
            <Text style={s.meta}>
              {thought.category} · {timeAgo(thought.createdAt)}
              {thought.isEdited && <Text style={s.editedMark}> · edited</Text>}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={s.headerRight}>
          <View style={[s.modeBadge, { backgroundColor: modeColor + "18", borderColor: modeColor + "30" }]}>
            <Feather name={modeIcon} size={11} color={modeColor} />
            <Text style={[s.modeText, { color: modeColor }]}>{modeLabel(appLanguage, thought.postingMode)}</Text>
          </View>
          <TouchableOpacity style={s.menuBtn} onPress={onMenuPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="more-horizontal" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={s.content}>{thought.content}</Text>

      {/* Feature 6: inline translation */}
      {showTranslation && translatedText && (
        <View style={[s.translationBox, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
          <Text style={[s.translationLabel, { color: colors.primary }]}>
            {translateLang?.label ?? "Translated"}
          </Text>
          <Text style={[s.translationText, { color: colors.foreground }]}>{translatedText}</Text>
        </View>
      )}

      {thought.type === "poll" && thought.poll && <PollCard thought={thought} />}

      <View style={s.actions}>
        <TouchableOpacity onPress={onAppreciate} style={s.actionBtn} activeOpacity={0.7}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Feather name="heart" size={16} color={thought.hasAppreciated ? colors.appreciate : colors.mutedForeground} />
          </Animated.View>
          <Text style={[s.actionCount, thought.hasAppreciated && { color: colors.appreciate }]}>{formatCount(thought.appreciations)}</Text>
        </TouchableOpacity>
        {!hideDisagreements && (
          <TouchableOpacity onPress={onDisagree} style={s.actionBtn} activeOpacity={0.7}>
            <Feather name="minus-circle" size={16} color={thought.hasDisagreed ? colors.disagree : colors.mutedForeground} />
            <Text style={[s.actionCount, thought.hasDisagreed && { color: colors.disagree }]}>{formatCount(thought.disagreements)}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onPress} style={s.actionBtn} activeOpacity={0.7}>
          <Feather name="message-circle" size={16} color={colors.mutedForeground} />
          <Text style={s.actionCount}>{formatCount(thought.comments)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRepost} style={s.actionBtn} activeOpacity={0.7}>
          <Feather name="repeat" size={16} color={thought.hasReposted ? colors.primary : colors.mutedForeground} />
          <Text style={[s.actionCount, thought.hasReposted && { color: colors.primary }]}>{formatCount(thought.reposts)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSave} style={s.actionBtn} activeOpacity={0.7}>
          <Animated.View style={{ transform: [{ scale: saveScale }] }}>
            <Feather name="bookmark" size={16} color={thought.hasSaved ? colors.gold : colors.mutedForeground} />
          </Animated.View>
          <Text style={[s.actionCount, thought.hasSaved && { color: colors.gold }]}>{formatCount(thought.saves)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onShare} style={s.actionBtn} activeOpacity={0.7}>
          <Feather name="share" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Feature 6: translate button + Feature 7: Q score with long-press tooltip */}
      <View style={s.bottomRow}>
        <TouchableOpacity onPress={onTranslatePress} style={[s.translateBtn, { borderColor: colors.border }]} activeOpacity={0.7}>
          {translating ? (
            <ActivityIndicator size={12} color={colors.mutedForeground} />
          ) : (
            <>
              <Feather name="globe" size={12} color={showTranslation ? colors.primary : colors.mutedForeground} />
              <Text style={[s.translateBtnText, { color: showTranslation ? colors.primary : colors.mutedForeground }]}>
                {showTranslation ? "Hide" : translateLang ? translateLang.label : "Translate"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {thought.qualityScore >= 50 && (
          <View>
            <Pressable
              onPressIn={onQPressIn}
              onPressOut={onQPressOut}
              style={s.qBadge}
            >
              <Text style={[s.qText, { color: colors.gold }]}>Q·{thought.qualityScore.toFixed(1)}</Text>
            </Pressable>
            {showQTooltip && (
              <View style={[s.tooltip, { backgroundColor: colors.foreground }]}>
                <Text style={[s.tooltipText, { color: colors.background }]}>
                  Quality Score: engagement ÷ time decay
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Language picker modal */}
      <Modal visible={showLangPicker} transparent animationType="slide" onRequestClose={() => setShowLangPicker(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowLangPicker(false)}>
          <View style={[s.langSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[s.langHandle, { backgroundColor: colors.border }]} />
            <Text style={[s.langTitle, { color: colors.foreground }]}>Choose translation language</Text>
            <Text style={[s.langSubtitle, { color: colors.mutedForeground }]}>Your choice is saved for future translations</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {LANGUAGES.map((lang, i) => (
                <TouchableOpacity key={i} onPress={() => onSelectLang(lang)} style={[s.langOption, { borderBottomColor: colors.border }]} activeOpacity={0.7}>
                  <Text style={[s.langOptionText, { color: colors.foreground }]}>{lang.label}</Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: { backgroundColor: colors.card, marginHorizontal: 12, marginVertical: 6, borderRadius: 14, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    cardPressed: { opacity: 0.88 },
    repostBanner: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
    repostBannerText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
    feedReasonRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
    feedReason: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    header: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
    authorRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
    avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    avatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
    authorInfo: { flex: 1 },
    authorName: { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 1 },
    meta: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    editedMark: { fontSize: 11, color: colors.mutedForeground, fontStyle: "italic" },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
    modeBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    modeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    menuBtn: { padding: 2 },
    content: { fontSize: 14, lineHeight: 21, color: colors.foreground, fontFamily: "Inter_400Regular", marginBottom: 10 },
    translationBox: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10 },
    translationLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
    translationText: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
    actions: { flexDirection: "row", alignItems: "center" },
    actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 6, flex: 1, justifyContent: "center" },
    actionCount: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
    translateBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
    translateBtnText: { fontSize: 11, fontFamily: "Inter_500Medium" },
    qBadge: { paddingVertical: 2, paddingHorizontal: 6 },
    qText: { fontSize: 11, fontFamily: "Inter_700Bold" },
    tooltip: { position: "absolute", bottom: 24, right: 0, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, width: 200, zIndex: 99 },
    tooltipText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
    modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
    langSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
    langHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
    langTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
    langSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12 },
    langOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1 },
    langOptionText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  });
}
