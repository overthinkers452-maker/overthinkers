import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { PostingMode } from "@/context/AppContext";

interface ModeSelectorProps {
  mode: PostingMode;
  onChange: (mode: PostingMode) => void;
}

const MODES: { mode: PostingMode; icon: keyof typeof Feather.glyphMap; description: string }[] = [
  { mode: "Public", icon: "globe", description: "Your name is shown" },
  { mode: "Pseudonymous", icon: "user", description: "Shown as a partial alias" },
  { mode: "Anonymous", icon: "eye-off", description: "Identity fully hidden" },
];

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  const colors = useColors();

  const modeColor =
    mode === "Public" ? colors.publicMode
    : mode === "Pseudonymous" ? colors.pseudonymousMode
    : colors.anonymousMode;

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Posting mode</Text>
      <View style={styles.options}>
        {MODES.map(({ mode: m, icon, description }) => {
          const isActive = mode === m;
          const color =
            m === "Public" ? colors.publicMode
            : m === "Pseudonymous" ? colors.pseudonymousMode
            : colors.anonymousMode;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(m);
              }}
              style={[
                styles.option,
                {
                  borderColor: isActive ? color : colors.border,
                  backgroundColor: isActive ? color + "15" : colors.secondary,
                },
              ]}
              activeOpacity={0.8}
            >
              <Feather name={icon} size={16} color={isActive ? color : colors.mutedForeground} />
              <View>
                <Text style={[styles.modeLabel, { color: isActive ? color : colors.foreground }]}>
                  {m}
                </Text>
                <Text style={styles.modeDesc}>{description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      gap: 8,
    },
    label: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    options: {
      gap: 6,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    modeLabel: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      marginBottom: 1,
    },
    modeDesc: {
      fontSize: 12,
      color: "#7A7A90",
      fontFamily: "Inter_400Regular",
    },
  });
}
