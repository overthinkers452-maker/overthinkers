import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { timeAgo } from "@/utils/format";
import * as svc from "@/lib/thoughtsService";
import type { ChatMessage } from "@/lib/thoughtsService";

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user, profile } = useAuth();
  const s = makeStyles(colors);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [otherName, setOtherName] = useState("Chat");
  const listRef = useRef<FlatList>(null);
  const channelRef = useRef<ReturnType<typeof svc.subscribeToMessages> | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const msgs = await svc.fetchMessages(conversationId);
      setMessages(msgs);
      scrollToBottom();
    } catch {}
    setLoading(false);
    if (user) await svc.markConversationRead(conversationId, user.id);
  }, [conversationId, user, scrollToBottom]);

  useEffect(() => {
    loadMessages();
    if (!conversationId) return;

    channelRef.current = svc.subscribeToMessages(conversationId, (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
    });

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [conversationId, loadMessages, scrollToBottom]);

  const sendMsg = useCallback(async () => {
    if (!text.trim() || !user || !conversationId) return;
    const content = text.trim();
    setText("");
    setSending(true);
    try {
      await svc.sendMessage(conversationId, user.id, content);
    } catch {
      setText(content);
    }
    setSending(false);
  }, [text, user, conversationId]);

  const renderMessage = useCallback(({ item, index }: { item: ChatMessage; index: number }) => {
    const isMe = item.senderId === user?.id;
    const prevMsg = messages[index - 1];
    const showTime = !prevMsg || new Date(item.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60 * 1000;

    return (
      <>
        {showTime && (
          <Text style={[s.timeLabel, { color: colors.mutedForeground }]}>
            {timeAgo(item.createdAt) + " ago"}
          </Text>
        )}
        <View style={[s.msgRow, isMe && s.msgRowMe]}>
          <View style={[
            s.bubble,
            isMe
              ? [s.bubbleMe, { backgroundColor: colors.primary }]
              : [s.bubbleThem, { backgroundColor: colors.card, borderColor: colors.border }],
          ]}>
            <Text style={[s.bubbleText, { color: isMe ? "#fff" : colors.foreground }]}>
              {item.content}
            </Text>
          </View>
        </View>
      </>
    );
  }, [user, messages, colors, s]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <Stack.Screen options={{
        title: otherName,
        headerStyle: { backgroundColor: colors.background } as any,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground } as any,
        headerTintColor: colors.primary,
      }} />

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[s.list, { paddingBottom: 16 }]}
          style={{ flex: 1 }}
          onLayout={scrollToBottom}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="message-circle" size={40} color={colors.mutedForeground} />
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>Send the first message</Text>
            </View>
          }
        />
      )}

      <View style={[s.inputBar, { borderTopColor: colors.border, paddingBottom: insets.bottom + 8, backgroundColor: colors.card }]}>
        <TextInput
          style={[s.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]}
          value={text}
          onChangeText={setText}
          placeholder="Message…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          returnKeyType="default"
          maxLength={2000}
        />
        <TouchableOpacity
          style={[s.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.secondary }]}
          onPress={sendMsg}
          disabled={!text.trim() || sending}
          activeOpacity={0.8}
        >
          {sending
            ? <ActivityIndicator size="small" color={text.trim() ? "#fff" : colors.mutedForeground} />
            : <Feather name="send" size={18} color={text.trim() ? "#fff" : colors.mutedForeground} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    list: { paddingHorizontal: 16, paddingTop: 12, gap: 4 },
    msgRow: { flexDirection: "row", justifyContent: "flex-start", marginVertical: 2 },
    msgRowMe: { justifyContent: "flex-end" },
    bubble: { maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
    bubbleMe: { borderBottomRightRadius: 4 },
    bubbleThem: { borderWidth: 1, borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 21 },
    timeLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginVertical: 8 },
    inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 14, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
    input: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular", maxHeight: 120 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12, marginTop: 80 },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
