import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { PostingMode } from "@/context/AppContext";
import { useFeedback } from "@/hooks/useFeedback";
import { useSettings } from "@/context/SettingsContext";
import { modeLabel, modeDesc, t } from "@/utils/i18n";

interface ModeSelectorProps {
  mode: PostingMode;
  onChange: (mode: PostingMode) => void;
}

const MODES: { mode: PostingMode; icon: keyof typeof Feather.glyphMap }[] = [
  { mode: "Public", icon: "globe" },
  { mode: "Pseudonymous", icon: "user" },
  { mode: "Anonymous", icon: "eye-off" },
];

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  const colors = useColors();
  const { select } = useFeedback();
  const { appLanguage } = useSettings();

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t(appLanguage, "mode.label")}</Text>
      <View style={styles.options}>
        {MODES.map(({ mode: m, icon }) => {
          const isActive = mode === m;
          const color =
            m === "Public" ? colors.publicMode
            : m === "Pseudonymous" ? colors.pseudonymousMode
            : colors.anonymousMode;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => {
                select();
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
              accessibilityRole="radio"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={modeLabel(appLanguage, m)}
            >
              <Feather name={icon} size={16} color={isActive ? color : colors.mutedForeground} />
              <View>
                <Text style={[styles.modeLabel, { color: isActive ? color : colors.foreground }]}>
                  {modeLabel(appLanguage, m)}
                </Text>
                <Text style={styles.modeDesc}>{modeDesc(appLanguage, m)}</Text>
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
