import React, { useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  FlatList, Platform, Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

export const ONBOARDING_KEY = "hasSeenOnboarding";

const SLIDES = [
  {
    icon: "feather" as const,
    title: "Think out loud.",
    body: "Share your thoughts, opinions, and feelings — publicly, pseudonymously, or anonymously. Your voice, your rules.",
    accent: "#7C3AED",
  },
  {
    icon: "users" as const,
    title: "Connect with thinkers.",
    body: "Appreciate ideas you love, disagree with ones you don't, and follow people whose minds you admire.",
    accent: "#8B5CF6",
  },
  {
    icon: "moon" as const,
    title: "The 4 AM feed.",
    body: "Late at night, a special feed opens — just for those quiet thoughts that only come when the world goes to sleep.",
    accent: "#3B82F6",
  },
  {
    icon: "lock" as const,
    title: "Your privacy, always.",
    body: "Post anonymously whenever you need to. No one can connect your identity to your anonymous thoughts.",
    accent: "#10B981",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    router.replace("/auth/login");
  };

  const onMomentumScrollEnd = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  };

  const isLast = currentIndex === SLIDES.length - 1;
  const s = makeStyles(colors, insets);

  return (
    <View style={s.container}>
      <Animated.FlatList
        ref={flatRef as any}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={s.slide}>
            <View style={[s.iconCircle, { backgroundColor: item.accent + "18" }]}>
              <Feather name={item.icon} size={48} color={item.accent} />
            </View>
            <Text style={s.slideTitle}>{item.title}</Text>
            <Text style={s.slideBody}>{item.body}</Text>
          </View>
        )}
      />

      <View style={s.footer}>
        <View style={s.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 22, 8],
              extrapolate: "clamp",
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: "clamp",
            });
            return (
              <Animated.View
                key={i}
                style={[s.dot, { width: dotWidth, opacity, backgroundColor: colors.primary }]}
              />
            );
          })}
        </View>

        {isLast ? (
          <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary }]} onPress={finish} activeOpacity={0.85}>
            <Text style={s.btnText}>Get Started</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.navRow}>
            <TouchableOpacity onPress={finish} activeOpacity={0.7}>
              <Text style={[s.skipText, { color: colors.mutedForeground }]}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary }]} onPress={goNext} activeOpacity={0.85}>
              <Text style={s.btnText}>Next</Text>
              <Feather name="arrow-right" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function makeStyles(colors: any, insets: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    slide: {
      width,
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
      paddingBottom: 80,
    },
    iconCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 36,
    },
    slideTitle: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      textAlign: "center",
      marginBottom: 16,
      letterSpacing: -0.5,
    },
    slideBody: {
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 24,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: Math.max(insets.bottom + 16, 32),
      paddingTop: 12,
      gap: 20,
    },
    dots: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    dot: {
      height: 8,
      borderRadius: 4,
    },
    navRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    skipText: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
    },
    btn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 14,
    },
    btnText: {
      color: "#fff",
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
  });
}
